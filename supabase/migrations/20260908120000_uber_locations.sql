-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add user_locations table, FK on transactions, and migrate existing Uber transactions
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. CREATE user_locations TABLE
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE public.user_locations (
    id          uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_locations_name_length CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT user_locations_user_name_key UNIQUE (user_id, name)
);

CREATE INDEX user_locations_user_id_name_idx ON public.user_locations (user_id, name);

-- RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_locations_select_own ON public.user_locations FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_locations_insert_own ON public.user_locations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_locations_update_own ON public.user_locations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_locations_delete_own ON public.user_locations FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Triggers
CREATE TRIGGER user_locations_set_updated_at BEFORE UPDATE ON public.user_locations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Privileges
REVOKE ALL ON TABLE public.user_locations FROM PUBLIC;
REVOKE ALL ON TABLE public.user_locations FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_locations TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 2. ADD location_id COLUMN TO transactions TABLE
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions
    ADD COLUMN location_id uuid REFERENCES public.user_locations(id) ON DELETE RESTRICT;

CREATE INDEX transactions_user_id_location_idx ON public.transactions (user_id, location_id);

-- ───────────────────────────────────────────────────────────────────
-- 3. MIGRATE EXISTING UBER TRANSACTIONS
-- ───────────────────────────────────────────────────────────────────

-- Pre-populate user_locations from existing "Uber - <Local>" transactions
INSERT INTO public.user_locations (user_id, name)
SELECT DISTINCT
    t.user_id,
    pg_catalog.btrim(pg_catalog.regexp_replace(t.name, '^Uber\s*-\s*', '', 'i')) AS name
FROM public.transactions t
WHERE t.name ~* '^Uber\s*-\s*'
  AND pg_catalog.btrim(pg_catalog.regexp_replace(t.name, '^Uber\s*-\s*', '', 'i')) <> ''
ON CONFLICT (user_id, name) DO NOTHING;

-- Link transactions to newly created locations and rename to 'Uber'
UPDATE public.transactions t
SET
    location_id = l.id,
    name = 'Uber'
FROM public.user_locations l
WHERE t.user_id = l.user_id
  AND t.name ~* '^Uber\s*-\s*'
  AND l.name = pg_catalog.btrim(pg_catalog.regexp_replace(t.name, '^Uber\s*-\s*', '', 'i'));

-- ───────────────────────────────────────────────────────────────────
-- 4. UPDATE persist_transaction RPC TO SUPPORT location_id
-- ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.persist_transaction(uuid, jsonb, jsonb);

CREATE FUNCTION public.persist_transaction(
    p_transaction_id uuid,
    p_transaction jsonb,
    p_entries jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid := auth.uid();
    v_transaction_id uuid;
    v_name text;
    v_description text;
    v_amount_cents integer;
    v_purchase_date date;
    v_payment_method public.payment_method;
    v_installment_count integer;
    v_category_id uuid;
    v_general_tag_ids uuid[];
    v_specific_tag_id uuid;
    v_location_id uuid;
    v_entry_count integer;
    v_entry_sum bigint;
    v_distinct_installments integer;
    v_entries_valid boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.jsonb_typeof(p_transaction) <> 'object'
        OR pg_catalog.jsonb_typeof(p_entries) <> 'array'
    THEN
        RAISE EXCEPTION 'invalid persistence payload' USING ERRCODE = '22023';
    END IF;

    v_name := pg_catalog.btrim(p_transaction ->> 'name');
    v_description := NULLIF(pg_catalog.btrim(COALESCE(p_transaction ->> 'description', '')), '');
    v_amount_cents := (p_transaction ->> 'amount_cents')::integer;
    v_purchase_date := (p_transaction ->> 'purchase_date')::date;
    v_payment_method := (p_transaction ->> 'payment_method')::public.payment_method;
    v_installment_count := (p_transaction ->> 'installment_count')::integer;
    v_category_id := (p_transaction ->> 'category_id')::uuid;
    v_general_tag_ids := COALESCE(
        ARRAY(
            SELECT (tag_id)::uuid
            FROM pg_catalog.jsonb_array_elements_text(COALESCE(p_transaction -> 'general_tag_ids', '[]'::jsonb)) AS tag_id
        ),
        '{}'::uuid[]
    );
    v_specific_tag_id := NULLIF(p_transaction ->> 'specific_tag_id', '')::uuid;
    v_location_id := NULLIF(p_transaction ->> 'location_id', '')::uuid;

    SELECT
        pg_catalog.count(*)::integer,
        COALESCE(pg_catalog.sum(entry.amount_cents), 0),
        pg_catalog.count(DISTINCT entry.installment_number)::integer,
        pg_catalog.bool_and(
            entry.installment_number BETWEEN 1 AND v_installment_count
            AND entry.installment_count = v_installment_count
            AND entry.amount_cents > 0
            AND entry.competence_date = pg_catalog.date_trunc('month', entry.competence_date)::date
            AND (
                (v_payment_method = 'pix'::public.payment_method AND entry.invoice_due_date IS NULL)
                OR (v_payment_method = 'credit'::public.payment_method AND entry.invoice_due_date IS NOT NULL)
            )
        )
    INTO v_entry_count, v_entry_sum, v_distinct_installments, v_entries_valid
    FROM pg_catalog.jsonb_to_recordset(p_entries) AS entry(
        installment_number integer,
        installment_count integer,
        amount_cents integer,
        competence_date date,
        invoice_due_date date
    );

    IF v_name IS NULL
        OR v_entry_count <> v_installment_count
        OR v_entry_sum <> v_amount_cents
        OR v_distinct_installments <> v_installment_count
        OR NOT COALESCE(v_entries_valid, false)
    THEN
        RAISE EXCEPTION 'transaction entries do not match transaction structure' USING ERRCODE = '23514';
    END IF;

    IF p_transaction_id IS NULL THEN
        INSERT INTO public.transactions (
            user_id, name, description, amount_cents, purchase_date,
            payment_method, installment_count, category_id, general_tag_ids, specific_tag_id, location_id
        )
        VALUES (
            v_user_id, v_name, v_description, v_amount_cents, v_purchase_date,
            v_payment_method, v_installment_count, v_category_id, v_general_tag_ids, v_specific_tag_id, v_location_id
        )
        RETURNING id INTO v_transaction_id;
    ELSE
        UPDATE public.transactions
        SET
            name = v_name,
            description = v_description,
            amount_cents = v_amount_cents,
            purchase_date = v_purchase_date,
            payment_method = v_payment_method,
            installment_count = v_installment_count,
            category_id = v_category_id,
            general_tag_ids = v_general_tag_ids,
            specific_tag_id = v_specific_tag_id,
            location_id = v_location_id
        WHERE id = p_transaction_id
            AND user_id = v_user_id
        RETURNING id INTO v_transaction_id;

        IF v_transaction_id IS NULL THEN
            RAISE EXCEPTION 'transaction not found' USING ERRCODE = 'P0002';
        END IF;

        DELETE FROM public.transaction_entries
        WHERE transaction_id = v_transaction_id
            AND user_id = v_user_id;
    END IF;

    INSERT INTO public.transaction_entries (
        transaction_id, user_id, installment_number, installment_count,
        amount_cents, competence_date, invoice_due_date
    )
    SELECT
        v_transaction_id, v_user_id,
        entry.installment_number, entry.installment_count,
        entry.amount_cents, entry.competence_date, entry.invoice_due_date
    FROM pg_catalog.jsonb_to_recordset(p_entries) AS entry(
        installment_number integer,
        installment_count integer,
        amount_cents integer,
        competence_date date,
        invoice_due_date date
    );

    RETURN v_transaction_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.persist_transaction(uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_transaction(uuid, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.persist_transaction(uuid, jsonb, jsonb) TO authenticated;
