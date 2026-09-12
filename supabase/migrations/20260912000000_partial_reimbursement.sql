-- ═══════════════════════════════════════════════════════════════════
-- Migration: Add partial reimbursement support to transactions and entries
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS reimbursed_amount_cents integer DEFAULT NULL;

ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_reimbursed_amount_check;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_reimbursed_amount_check
    CHECK (
        reimbursed_amount_cents IS NULL OR (
            reimbursed_amount_cents > 0
            AND reimbursed_amount_cents < amount_cents
            AND installment_count = 1
        )
    );

ALTER TABLE public.transaction_entries
    ADD COLUMN IF NOT EXISTS reimbursed_amount_cents integer DEFAULT NULL;

ALTER TABLE public.transaction_entries
    DROP CONSTRAINT IF EXISTS transaction_entries_reimbursed_amount_check;

ALTER TABLE public.transaction_entries
    ADD CONSTRAINT transaction_entries_reimbursed_amount_check
    CHECK (
        reimbursed_amount_cents IS NULL OR (
            reimbursed_amount_cents > 0
            AND reimbursed_amount_cents < amount_cents
            AND installment_count = 1
        )
    );

CREATE OR REPLACE FUNCTION public.persist_transaction(
    p_transaction_id uuid DEFAULT NULL,
    p_transaction jsonb DEFAULT NULL,
    p_entries jsonb DEFAULT '[]'::jsonb
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
    v_reimbursed_amount_cents integer;
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
    v_closing_day integer;
    v_due_day integer;
    v_owned_count integer;
    v_updated_count integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.jsonb_typeof(p_transaction) <> 'object'
        OR pg_catalog.jsonb_typeof(p_entries) <> 'array'
    THEN
        RAISE EXCEPTION 'invalid persistence payload' USING ERRCODE = '22023';
    END IF;

    IF p_transaction ->> 'kind' = 'settings' THEN
        IF p_transaction_id IS NOT NULL THEN
            RAISE EXCEPTION 'invalid settings payload' USING ERRCODE = '22023';
        END IF;

        v_closing_day := (p_transaction ->> 'closing_day')::integer;
        v_due_day := (p_transaction ->> 'due_day')::integer;

        SELECT
            pg_catalog.count(*)::integer,
            pg_catalog.count(DISTINCT replacement.id)::integer,
            pg_catalog.bool_and(
                replacement.competence_date = pg_catalog.date_trunc('month', replacement.competence_date)::date
                AND replacement.invoice_due_date IS NOT NULL
            )
        INTO v_entry_count, v_distinct_installments, v_entries_valid
        FROM pg_catalog.jsonb_to_recordset(p_entries) AS replacement(
            id uuid,
            competence_date date,
            invoice_due_date date
        );

        IF v_closing_day NOT BETWEEN 1 AND 28
            OR v_due_day NOT BETWEEN 1 AND 28
            OR v_entry_count <> v_distinct_installments
            OR (v_entry_count > 0 AND NOT COALESCE(v_entries_valid, false))
        THEN
            RAISE EXCEPTION 'invalid settings persistence structure' USING ERRCODE = '23514';
        END IF;

        SELECT pg_catalog.count(*)::integer
        INTO v_owned_count
        FROM public.transaction_entries AS entry
        JOIN public.transactions AS transaction ON transaction.id = entry.transaction_id
        WHERE entry.user_id = v_user_id
            AND transaction.user_id = v_user_id
            AND transaction.payment_method = 'credit'::public.payment_method
            AND entry.id IN (
                SELECT replacement.id
                FROM pg_catalog.jsonb_to_recordset(p_entries) AS replacement(
                    id uuid,
                    competence_date date,
                    invoice_due_date date
                )
            );

        IF v_owned_count <> v_entry_count THEN
            RAISE EXCEPTION 'settings entries not found' USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.user_settings (user_id, closing_day, due_day)
        VALUES (v_user_id, v_closing_day, v_due_day)
        ON CONFLICT (user_id) DO UPDATE
        SET
            closing_day = EXCLUDED.closing_day,
            due_day = EXCLUDED.due_day;

        UPDATE public.transaction_entries AS entry
        SET
            competence_date = replacement.competence_date,
            invoice_due_date = replacement.invoice_due_date
        FROM pg_catalog.jsonb_to_recordset(p_entries) AS replacement(
            id uuid,
            competence_date date,
            invoice_due_date date
        )
        WHERE entry.id = replacement.id
            AND entry.user_id = v_user_id;

        GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        IF v_updated_count <> v_entry_count THEN
            RAISE EXCEPTION 'settings entries changed during persistence' USING ERRCODE = '40001';
        END IF;

        RETURN v_user_id;
    END IF;

    IF p_transaction ->> 'kind' <> 'transaction' THEN
        RAISE EXCEPTION 'invalid transaction payload' USING ERRCODE = '22023';
    END IF;

    v_name := pg_catalog.btrim(p_transaction ->> 'name');
    v_description := NULLIF(pg_catalog.btrim(COALESCE(p_transaction ->> 'description', '')), '');
    v_amount_cents := (p_transaction ->> 'amount_cents')::integer;
    v_reimbursed_amount_cents := NULLIF(p_transaction ->> 'reimbursed_amount_cents', '')::integer;
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

    IF v_reimbursed_amount_cents IS NOT NULL AND (
        v_reimbursed_amount_cents <= 0
        OR v_reimbursed_amount_cents >= v_amount_cents
        OR v_installment_count <> 1
    ) THEN
        RAISE EXCEPTION 'invalid reimbursed_amount_cents' USING ERRCODE = '23514';
    END IF;

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
            user_id, name, description, amount_cents, reimbursed_amount_cents, purchase_date,
            payment_method, installment_count, category_id, general_tag_ids, specific_tag_id, location_id
        )
        VALUES (
            v_user_id, v_name, v_description, v_amount_cents, v_reimbursed_amount_cents, v_purchase_date,
            v_payment_method, v_installment_count, v_category_id, v_general_tag_ids, v_specific_tag_id, v_location_id
        )
        RETURNING id INTO v_transaction_id;
    ELSE
        UPDATE public.transactions
        SET
            name = v_name,
            description = v_description,
            amount_cents = v_amount_cents,
            reimbursed_amount_cents = v_reimbursed_amount_cents,
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
        amount_cents, reimbursed_amount_cents, competence_date, invoice_due_date
    )
    SELECT
        v_transaction_id, v_user_id,
        entry.installment_number, entry.installment_count,
        entry.amount_cents,
        CASE WHEN entry.installment_count = 1 THEN v_reimbursed_amount_cents ELSE NULL END,
        entry.competence_date, entry.invoice_due_date
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
