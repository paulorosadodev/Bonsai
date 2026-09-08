-- Update persist_recurrence to allow updating ends_before when updating a recurring version
CREATE OR REPLACE FUNCTION public.persist_recurrence(p_payload jsonb, p_entries jsonb DEFAULT '[]'::jsonb)
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
    v_category_id uuid;
    v_general_tag_ids uuid[];
    v_specific_tag_id uuid;
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
    v_category_id := (p_payload ->> 'category_id')::uuid;
    v_general_tag_ids := COALESCE(
        ARRAY(
            SELECT (tag_id)::uuid
            FROM pg_catalog.jsonb_array_elements_text(COALESCE(p_payload -> 'general_tag_ids', '[]'::jsonb)) AS tag_id
        ),
        '{}'::uuid[]
    );
    v_specific_tag_id := NULLIF(p_payload ->> 'specific_tag_id', '')::uuid;
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
            series_id, user_id, effective_from, monthly_day,
            name, description, amount_cents, payment_method, installment_count,
            category_id, general_tag_ids, specific_tag_id
        )
        VALUES (
            v_series_id, v_user_id, v_effective_from, v_monthly_day,
            v_name, v_description, v_amount_cents, v_payment_method, 1,
            v_category_id, v_general_tag_ids, v_specific_tag_id
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

        IF p_payload ? 'ends_before' THEN
            UPDATE public.recurring_series
            SET ends_before = v_ends_before
            WHERE id = v_series_id;
        END IF;

        DELETE FROM public.recurring_versions
        WHERE series_id = v_series_id
            AND user_id = v_user_id
            AND effective_from > v_today;

        INSERT INTO public.recurring_versions (
            series_id, user_id, effective_from, monthly_day,
            name, description, amount_cents, payment_method, installment_count,
            category_id, general_tag_ids, specific_tag_id
        )
        VALUES (
            v_series_id, v_user_id, v_effective_from, v_monthly_day,
            v_name, v_description, v_amount_cents, v_payment_method, 1,
            v_category_id, v_general_tag_ids, v_specific_tag_id
        )
        ON CONFLICT (series_id, effective_from) DO UPDATE
        SET
            monthly_day = EXCLUDED.monthly_day,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            amount_cents = EXCLUDED.amount_cents,
            payment_method = EXCLUDED.payment_method,
            category_id = EXCLUDED.category_id,
            general_tag_ids = EXCLUDED.general_tag_ids,
            specific_tag_id = EXCLUDED.specific_tag_id;

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
            user_id, name, description, amount_cents, purchase_date,
            payment_method, installment_count, category_id, general_tag_ids, specific_tag_id
        )
        VALUES (
            v_user_id, v_name, v_description, v_amount_cents,
            (p_payload ->> 'purchase_date')::date,
            v_payment_method, v_installment_count,
            v_category_id, v_general_tag_ids, v_specific_tag_id
        )
        RETURNING id INTO v_transaction_id;

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

        RETURN v_series_id;
    END IF;

    RAISE EXCEPTION 'invalid recurrence payload' USING ERRCODE = '22023';
END;
$fn$;
