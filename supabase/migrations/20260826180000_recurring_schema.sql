CREATE TABLE public.recurring_series (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    starts_on date NOT NULL,
    ends_before date,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT recurring_series_ends_before_check CHECK (ends_before IS NULL OR ends_before >= starts_on)
);

CREATE TABLE public.recurring_versions (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    series_id uuid NOT NULL REFERENCES public.recurring_series (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    effective_from date NOT NULL,
    monthly_day integer NOT NULL,
    name text NOT NULL,
    description text,
    amount_cents integer NOT NULL,
    payment_method public.payment_method NOT NULL,
    installment_count integer NOT NULL DEFAULT 1,
    category public.category NOT NULL,
    general_tags public.general_tag[] NOT NULL DEFAULT '{}'::public.general_tag[],
    specific_tag public.specific_tag,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT recurring_versions_series_effective_from_key UNIQUE (series_id, effective_from),
    CONSTRAINT recurring_versions_monthly_day_check CHECK (monthly_day BETWEEN 1 AND 31),
    CONSTRAINT recurring_versions_name_length_check CHECK (char_length(name) BETWEEN 1 AND 120),
    CONSTRAINT recurring_versions_description_length_check CHECK (description IS NULL OR char_length(description) BETWEEN 1 AND 500),
    CONSTRAINT recurring_versions_amount_cents_check CHECK (amount_cents > 0),
    CONSTRAINT recurring_versions_single_installment_check CHECK (installment_count = 1),
    CONSTRAINT recurring_versions_general_tags_check CHECK (private.general_tags_are_valid(general_tags)),
    CONSTRAINT recurring_versions_specific_tag_category_check CHECK (
        specific_tag IS NULL OR private.specific_tag_matches_category(category, specific_tag)
    )
);

CREATE TABLE public.user_settings_history (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    effective_from timestamptz NOT NULL,
    closing_day integer NOT NULL,
    due_day integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_settings_history_user_effective_from_key UNIQUE (user_id, effective_from),
    CONSTRAINT user_settings_history_closing_day_check CHECK (closing_day BETWEEN 1 AND 28),
    CONSTRAINT user_settings_history_due_day_check CHECK (due_day BETWEEN 1 AND 28)
);

CREATE INDEX recurring_series_user_id_starts_on_idx ON public.recurring_series (user_id, starts_on);
CREATE INDEX recurring_versions_user_id_series_id_idx ON public.recurring_versions (user_id, series_id, effective_from);
CREATE INDEX user_settings_history_user_id_effective_from_idx ON public.user_settings_history (user_id, effective_from);

ALTER TABLE public.recurring_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_series_select_own
    ON public.recurring_series
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_series_insert_own
    ON public.recurring_series
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_series_update_own
    ON public.recurring_series
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_series_delete_own
    ON public.recurring_series
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_versions_select_own
    ON public.recurring_versions
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_versions_insert_own
    ON public.recurring_versions
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_versions_update_own
    ON public.recurring_versions
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY recurring_versions_delete_own
    ON public.recurring_versions
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_history_select_own
    ON public.user_settings_history
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_history_insert_own
    ON public.user_settings_history
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_history_update_own
    ON public.user_settings_history
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_history_delete_own
    ON public.user_settings_history
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER recurring_series_set_updated_at
    BEFORE UPDATE ON public.recurring_series
    FOR EACH ROW
    EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER recurring_versions_set_updated_at
    BEFORE UPDATE ON public.recurring_versions
    FOR EACH ROW
    EXECUTE FUNCTION private.set_updated_at();

CREATE FUNCTION private.assert_recurring_version_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.recurring_series AS series
        WHERE series.id = NEW.series_id
            AND series.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'recurring version owner mismatch' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$fn$;

CREATE TRIGGER recurring_versions_owner_match
    BEFORE INSERT OR UPDATE OF series_id, user_id ON public.recurring_versions
    FOR EACH ROW
    EXECUTE FUNCTION private.assert_recurring_version_owner();

CREATE FUNCTION private.record_user_settings_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
    IF TG_OP = 'INSERT'
        OR NEW.closing_day IS DISTINCT FROM OLD.closing_day
        OR NEW.due_day IS DISTINCT FROM OLD.due_day
    THEN
        INSERT INTO public.user_settings_history (user_id, effective_from, closing_day, due_day)
        VALUES (NEW.user_id, pg_catalog.clock_timestamp(), NEW.closing_day, NEW.due_day);
    END IF;

    RETURN NEW;
END;
$fn$;

CREATE TRIGGER user_settings_record_history
    AFTER INSERT OR UPDATE OF closing_day, due_day ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION private.record_user_settings_history();

INSERT INTO public.user_settings_history (user_id, effective_from, closing_day, due_day)
SELECT user_id, created_at, closing_day, due_day
FROM public.user_settings
ON CONFLICT (user_id, effective_from) DO NOTHING;

CREATE FUNCTION public.persist_recurrence(p_payload jsonb, p_entries jsonb DEFAULT '[]'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid := auth.uid();
    v_kind text;
    v_series_id uuid;
    v_target_id uuid;
    v_transaction_id uuid;
    v_starts_on date;
    v_ends_before date;
    v_effective_from date;
    v_monthly_day integer;
    v_name text;
    v_description text;
    v_amount_cents integer;
    v_payment_method public.payment_method;
    v_category public.category;
    v_general_tags public.general_tag[];
    v_specific_tag public.specific_tag;
    v_today date;
    v_entry_count integer;
    v_entry_sum bigint;
    v_distinct_installments integer;
    v_entries_valid boolean;
    v_installment_count integer;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF pg_catalog.jsonb_typeof(p_payload) <> 'object'
        OR pg_catalog.jsonb_typeof(p_entries) <> 'array'
    THEN
        RAISE EXCEPTION 'invalid recurrence payload' USING ERRCODE = '22023';
    END IF;

    v_kind := p_payload ->> 'kind';
    v_today := (p_payload ->> 'today')::date;

    IF v_today IS NULL THEN
        RAISE EXCEPTION 'invalid recurrence payload' USING ERRCODE = '22023';
    END IF;

    IF v_kind = 'end' THEN
        v_target_id := (p_payload ->> 'series_id')::uuid;
        v_ends_before := (p_payload ->> 'ends_before')::date;

        UPDATE public.recurring_series
        SET ends_before = v_ends_before
        WHERE id = v_target_id
            AND user_id = v_user_id
            AND (ends_before IS NULL OR v_ends_before <= ends_before)
        RETURNING id INTO v_series_id;

        IF v_series_id IS NULL THEN
            RAISE EXCEPTION 'recurring series not found' USING ERRCODE = 'P0002';
        END IF;

        RETURN v_series_id;
    END IF;

    v_name := pg_catalog.btrim(p_payload ->> 'name');
    v_description := NULLIF(pg_catalog.btrim(COALESCE(p_payload ->> 'description', '')), '');
    v_amount_cents := (p_payload ->> 'amount_cents')::integer;
    v_payment_method := (p_payload ->> 'payment_method')::public.payment_method;
    v_category := (p_payload ->> 'category')::public.category;
    v_general_tags := COALESCE(
        ARRAY(
            SELECT tag::public.general_tag
            FROM pg_catalog.jsonb_array_elements_text(COALESCE(p_payload -> 'general_tags', '[]'::jsonb)) AS tag
        ),
        '{}'::public.general_tag[]
    );
    v_specific_tag := NULLIF(p_payload ->> 'specific_tag', '')::public.specific_tag;
    v_monthly_day := (p_payload ->> 'monthly_day')::integer;
    v_effective_from := (p_payload ->> 'effective_from')::date;
    v_starts_on := (p_payload ->> 'starts_on')::date;
    v_ends_before := NULLIF(p_payload ->> 'ends_before', '')::date;

    IF v_kind IN ('create', 'convert_future', 'convert_past') THEN
        IF v_name IS NULL
            OR v_amount_cents IS NULL
            OR v_starts_on IS NULL
            OR v_effective_from IS NULL
            OR v_monthly_day IS NULL
        THEN
            RAISE EXCEPTION 'invalid recurrence payload' USING ERRCODE = '22023';
        END IF;

        IF v_kind = 'convert_future' THEN
            v_target_id := (p_payload ->> 'transaction_id')::uuid;

            DELETE FROM public.transactions
            WHERE id = v_target_id
                AND user_id = v_user_id
            RETURNING id INTO v_transaction_id;

            IF v_transaction_id IS NULL THEN
                RAISE EXCEPTION 'transaction not found' USING ERRCODE = 'P0002';
            END IF;
        END IF;

        INSERT INTO public.recurring_series (user_id, starts_on, ends_before)
        VALUES (v_user_id, v_starts_on, v_ends_before)
        RETURNING id INTO v_series_id;

        INSERT INTO public.recurring_versions (
            series_id,
            user_id,
            effective_from,
            monthly_day,
            name,
            description,
            amount_cents,
            payment_method,
            installment_count,
            category,
            general_tags,
            specific_tag
        )
        VALUES (
            v_series_id,
            v_user_id,
            v_effective_from,
            v_monthly_day,
            v_name,
            v_description,
            v_amount_cents,
            v_payment_method,
            1,
            v_category,
            v_general_tags,
            v_specific_tag
        );

        RETURN v_series_id;
    END IF;

    IF v_kind = 'version' THEN
        v_target_id := (p_payload ->> 'series_id')::uuid;

        SELECT id
        INTO v_series_id
        FROM public.recurring_series
        WHERE id = v_target_id
            AND user_id = v_user_id
        FOR UPDATE;

        IF v_series_id IS NULL THEN
            RAISE EXCEPTION 'recurring series not found' USING ERRCODE = 'P0002';
        END IF;

        DELETE FROM public.recurring_versions
        WHERE series_id = v_series_id
            AND user_id = v_user_id
            AND effective_from > v_today;

        INSERT INTO public.recurring_versions (
            series_id,
            user_id,
            effective_from,
            monthly_day,
            name,
            description,
            amount_cents,
            payment_method,
            installment_count,
            category,
            general_tags,
            specific_tag
        )
        VALUES (
            v_series_id,
            v_user_id,
            v_effective_from,
            v_monthly_day,
            v_name,
            v_description,
            v_amount_cents,
            v_payment_method,
            1,
            v_category,
            v_general_tags,
            v_specific_tag
        )
        ON CONFLICT (series_id, effective_from) DO UPDATE
        SET
            monthly_day = EXCLUDED.monthly_day,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            amount_cents = EXCLUDED.amount_cents,
            payment_method = EXCLUDED.payment_method,
            category = EXCLUDED.category,
            general_tags = EXCLUDED.general_tags,
            specific_tag = EXCLUDED.specific_tag;

        RETURN v_series_id;
    END IF;

    IF v_kind = 'detach' THEN
        v_target_id := (p_payload ->> 'series_id')::uuid;
        v_ends_before := (p_payload ->> 'ends_before')::date;
        v_installment_count := COALESCE((p_payload ->> 'installment_count')::integer, 1);
        v_amount_cents := (p_payload ->> 'amount_cents')::integer;
        v_payment_method := (p_payload ->> 'payment_method')::public.payment_method;

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

        UPDATE public.recurring_series
        SET ends_before = v_ends_before
        WHERE id = v_target_id
            AND user_id = v_user_id
            AND (ends_before IS NULL OR v_ends_before <= ends_before)
        RETURNING id INTO v_series_id;

        IF v_series_id IS NULL THEN
            RAISE EXCEPTION 'recurring series not found' USING ERRCODE = 'P0002';
        END IF;

        INSERT INTO public.transactions (
            user_id,
            name,
            description,
            amount_cents,
            purchase_date,
            payment_method,
            installment_count,
            category,
            general_tags,
            specific_tag
        )
        VALUES (
            v_user_id,
            v_name,
            v_description,
            v_amount_cents,
            (p_payload ->> 'purchase_date')::date,
            v_payment_method,
            v_installment_count,
            v_category,
            v_general_tags,
            v_specific_tag
        )
        RETURNING id INTO v_transaction_id;

        INSERT INTO public.transaction_entries (
            transaction_id,
            user_id,
            installment_number,
            installment_count,
            amount_cents,
            competence_date,
            invoice_due_date
        )
        SELECT
            v_transaction_id,
            v_user_id,
            entry.installment_number,
            entry.installment_count,
            entry.amount_cents,
            entry.competence_date,
            entry.invoice_due_date
        FROM pg_catalog.jsonb_to_recordset(p_entries) AS entry(
            installment_number integer,
            installment_count integer,
            amount_cents integer,
            competence_date date,
            invoice_due_date date
        );

        RETURN v_series_id;
    END IF;

    RAISE EXCEPTION 'invalid recurrence payload' USING ERRCODE = '22023';
END;
$fn$;

REVOKE ALL ON FUNCTION private.assert_recurring_version_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_user_settings_history() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_recurrence(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_recurrence(jsonb, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION public.persist_recurrence(jsonb, jsonb) TO authenticated;

REVOKE ALL ON TABLE public.recurring_series FROM PUBLIC;
REVOKE ALL ON TABLE public.recurring_series FROM anon;
REVOKE ALL ON TABLE public.recurring_versions FROM PUBLIC;
REVOKE ALL ON TABLE public.recurring_versions FROM anon;
REVOKE ALL ON TABLE public.user_settings_history FROM PUBLIC;
REVOKE ALL ON TABLE public.user_settings_history FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_series TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings_history TO authenticated;
