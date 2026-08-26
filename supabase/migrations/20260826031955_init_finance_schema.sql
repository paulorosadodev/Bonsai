CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO postgres;

CREATE TYPE public.payment_method AS ENUM ('pix', 'credit');
CREATE TYPE public.category AS ENUM (
    'fixed_expenses',
    'hygiene',
    'health',
    'food',
    'transportation',
    'leisure',
    'clothing',
    'personal',
    'gift'
);
CREATE TYPE public.general_tag AS ENUM ('reimbursement', 'family', 'friends');
CREATE TYPE public.specific_tag AS ENUM (
    'mobile_phone',
    'energy',
    'home',
    'medicine',
    'doctor',
    'restaurant',
    'bakery_or_grocery',
    'snack',
    'uber',
    'travel',
    'subscription',
    'tickets',
    'other'
);

GRANT USAGE ON TYPE public.payment_method TO authenticated;
GRANT USAGE ON TYPE public.category TO authenticated;
GRANT USAGE ON TYPE public.general_tag TO authenticated;
GRANT USAGE ON TYPE public.specific_tag TO authenticated;

CREATE FUNCTION private.specific_tag_matches_category(p_category public.category, p_tag public.specific_tag)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT CASE p_category
        WHEN 'fixed_expenses'::public.category THEN p_tag IN ('mobile_phone'::public.specific_tag, 'energy'::public.specific_tag, 'home'::public.specific_tag)
        WHEN 'health'::public.category THEN p_tag IN ('medicine'::public.specific_tag, 'doctor'::public.specific_tag)
        WHEN 'food'::public.category THEN p_tag IN ('restaurant'::public.specific_tag, 'bakery_or_grocery'::public.specific_tag, 'snack'::public.specific_tag)
        WHEN 'transportation'::public.category THEN p_tag IN ('uber'::public.specific_tag, 'travel'::public.specific_tag)
        WHEN 'leisure'::public.category THEN p_tag IN ('subscription'::public.specific_tag, 'tickets'::public.specific_tag, 'other'::public.specific_tag)
        ELSE false
    END;
$$;

CREATE FUNCTION private.general_tags_are_valid(p_tags public.general_tag[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT p_tags IS NOT NULL
        AND (
            SELECT pg_catalog.count(*) = pg_catalog.count(DISTINCT t.tag)
            FROM pg_catalog.unnest(p_tags) AS t(tag)
        );
$$;

CREATE FUNCTION private.invoice_due_date(p_purchase_date date, p_closing_day integer, p_due_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT pg_catalog.make_date(
        ((pg_catalog.date_part('year', p_purchase_date)::integer * 12
            + pg_catalog.date_part('month', p_purchase_date)::integer
            - 1
            + CASE WHEN pg_catalog.date_part('day', p_purchase_date) >= p_closing_day THEN 1 ELSE 0 END
            + CASE WHEN p_due_day <= p_closing_day THEN 1 ELSE 0 END) / 12),
        (((pg_catalog.date_part('year', p_purchase_date)::integer * 12
            + pg_catalog.date_part('month', p_purchase_date)::integer
            - 1
            + CASE WHEN pg_catalog.date_part('day', p_purchase_date) >= p_closing_day THEN 1 ELSE 0 END
            + CASE WHEN p_due_day <= p_closing_day THEN 1 ELSE 0 END) % 12) + 1),
        p_due_day
    );
$$;

CREATE FUNCTION private.shift_due_date(p_first_due date, p_offset integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT pg_catalog.make_date(
        ((pg_catalog.date_part('year', p_first_due)::integer * 12 + pg_catalog.date_part('month', p_first_due)::integer - 1 + p_offset) / 12),
        (((pg_catalog.date_part('year', p_first_due)::integer * 12 + pg_catalog.date_part('month', p_first_due)::integer - 1 + p_offset) % 12) + 1),
        pg_catalog.date_part('day', p_first_due)::integer
    );
$$;

CREATE FUNCTION private.split_cents(p_amount integer, p_count integer)
RETURNS integer[]
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT pg_catalog.array_agg(part.amount ORDER BY part.i)
    FROM (
        SELECT
            g.i,
            (p_amount / p_count) + CASE WHEN g.i <= (p_amount % p_count) THEN 1 ELSE 0 END AS amount
        FROM pg_catalog.generate_series(1, p_count) AS g(i)
    ) AS part;
$$;

CREATE FUNCTION private.current_competence_month()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
    SELECT pg_catalog.date_trunc(
        'month',
        (pg_catalog.timezone('America/Sao_Paulo', pg_catalog.now()))::date
    )::date;
$$;

CREATE TABLE public.user_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    closing_day integer NOT NULL DEFAULT 14,
    due_day integer NOT NULL DEFAULT 20,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_settings_closing_day_check CHECK (closing_day BETWEEN 1 AND 28),
    CONSTRAINT user_settings_due_day_check CHECK (due_day BETWEEN 1 AND 28)
);

CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    amount_cents integer NOT NULL,
    purchase_date date NOT NULL,
    payment_method public.payment_method NOT NULL,
    installment_count integer NOT NULL,
    category public.category NOT NULL,
    general_tags public.general_tag[] NOT NULL DEFAULT '{}'::public.general_tag[],
    specific_tag public.specific_tag,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT transactions_name_length_check CHECK (char_length(name) BETWEEN 1 AND 120),
    CONSTRAINT transactions_description_length_check CHECK (description IS NULL OR char_length(description) BETWEEN 1 AND 500),
    CONSTRAINT transactions_amount_cents_check CHECK (amount_cents > 0),
    CONSTRAINT transactions_installment_count_check CHECK (installment_count BETWEEN 1 AND 60),
    CONSTRAINT transactions_pix_single_installment_check CHECK (
        (payment_method = 'pix'::public.payment_method AND installment_count = 1)
        OR payment_method = 'credit'::public.payment_method
    ),
    CONSTRAINT transactions_general_tags_check CHECK (private.general_tags_are_valid(general_tags)),
    CONSTRAINT transactions_specific_tag_category_check CHECK (
        specific_tag IS NULL OR private.specific_tag_matches_category(category, specific_tag)
    )
);

CREATE TABLE public.transaction_entries (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    installment_number integer NOT NULL,
    installment_count integer NOT NULL,
    amount_cents integer NOT NULL,
    competence_date date NOT NULL,
    invoice_due_date date,
    created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT transaction_entries_installment_number_check CHECK (installment_number >= 1),
    CONSTRAINT transaction_entries_installment_count_check CHECK (installment_count BETWEEN 1 AND 60),
    CONSTRAINT transaction_entries_installment_pair_check CHECK (installment_number <= installment_count),
    CONSTRAINT transaction_entries_amount_cents_check CHECK (amount_cents > 0),
    CONSTRAINT transaction_entries_competence_month_check CHECK (competence_date = pg_catalog.date_trunc('month', competence_date)::date),
    CONSTRAINT transaction_entries_transaction_id_installment_number_key UNIQUE (transaction_id, installment_number)
);

CREATE INDEX transactions_user_id_purchase_date_idx ON public.transactions (user_id, purchase_date DESC);
CREATE INDEX transactions_user_id_category_idx ON public.transactions (user_id, category);
CREATE INDEX transaction_entries_user_id_competence_date_idx ON public.transaction_entries (user_id, competence_date);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select_own
    ON public.user_settings
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_insert_own
    ON public.user_settings
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_update_own
    ON public.user_settings
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_delete_own
    ON public.user_settings
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY transactions_select_own
    ON public.transactions
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY transactions_insert_own
    ON public.transactions
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY transactions_update_own
    ON public.transactions
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY transactions_delete_own
    ON public.transactions
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY transaction_entries_select_own
    ON public.transaction_entries
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY transaction_entries_insert_own
    ON public.transaction_entries
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY transaction_entries_update_own
    ON public.transaction_entries
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY transaction_entries_delete_own
    ON public.transaction_entries
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER user_settings_set_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER transactions_set_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER transaction_entries_set_updated_at
    BEFORE UPDATE ON public.transaction_entries
    FOR EACH ROW
    EXECUTE FUNCTION private.set_updated_at();

CREATE FUNCTION private.rebuild_transaction_entries(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_tx public.transactions;
    v_settings public.user_settings;
    v_amounts integer[];
    v_first_due date;
    v_due date;
    v_i integer;
BEGIN
    SELECT * INTO STRICT v_tx
    FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    SELECT * INTO STRICT v_settings
    FROM public.user_settings
    WHERE user_id = v_tx.user_id
    FOR UPDATE;

    DELETE FROM public.transaction_entries
    WHERE transaction_id = p_transaction_id;

    v_amounts := private.split_cents(v_tx.amount_cents, v_tx.installment_count);

    IF v_tx.payment_method = 'pix'::public.payment_method THEN
        INSERT INTO public.transaction_entries (
            transaction_id,
            user_id,
            installment_number,
            installment_count,
            amount_cents,
            competence_date,
            invoice_due_date
        )
        VALUES (
            v_tx.id,
            v_tx.user_id,
            1,
            1,
            v_amounts[1],
            pg_catalog.date_trunc('month', v_tx.purchase_date)::date,
            NULL
        );
        RETURN;
    END IF;

    v_first_due := private.invoice_due_date(v_tx.purchase_date, v_settings.closing_day, v_settings.due_day);

    FOR v_i IN 1..v_tx.installment_count LOOP
        v_due := private.shift_due_date(v_first_due, v_i - 1);
        INSERT INTO public.transaction_entries (
            transaction_id,
            user_id,
            installment_number,
            installment_count,
            amount_cents,
            competence_date,
            invoice_due_date
        )
        VALUES (
            v_tx.id,
            v_tx.user_id,
            v_i,
            v_tx.installment_count,
            v_amounts[v_i],
            pg_catalog.date_trunc('month', v_due)::date,
            v_due
        );
    END LOOP;
END;
$fn$;

CREATE FUNCTION private.recalculate_current_and_future_entries(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_settings public.user_settings;
    v_current_month date;
BEGIN
    SELECT * INTO STRICT v_settings
    FROM public.user_settings
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_current_month := private.current_competence_month();

    UPDATE public.transaction_entries AS e
    SET
        invoice_due_date = s.due,
        competence_date = pg_catalog.date_trunc('month', s.due)::date,
        updated_at = pg_catalog.now()
    FROM public.transactions AS t
    CROSS JOIN LATERAL (
        SELECT private.shift_due_date(
            private.invoice_due_date(t.purchase_date, v_settings.closing_day, v_settings.due_day),
            e.installment_number - 1
        ) AS due
    ) AS s
    WHERE e.transaction_id = t.id
        AND t.user_id = p_user_id
        AND t.payment_method = 'credit'::public.payment_method
        AND e.competence_date >= v_current_month;
END;
$fn$;

CREATE FUNCTION private.assert_transaction_entry_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_transaction_id uuid;
    v_amount integer;
    v_expected_count integer;
    v_payment_method public.payment_method;
    v_sum integer;
    v_count integer;
BEGIN
    IF TG_TABLE_NAME = 'transactions' THEN
        v_transaction_id := COALESCE(NEW.id, OLD.id);
    ELSE
        v_transaction_id := COALESCE(NEW.transaction_id, OLD.transaction_id);
    END IF;

    SELECT t.amount_cents, t.installment_count, t.payment_method
    INTO v_amount, v_expected_count, v_payment_method
    FROM public.transactions AS t
    WHERE t.id = v_transaction_id;

    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COALESCE(pg_catalog.sum(e.amount_cents), 0)::integer, pg_catalog.count(*)::integer
    INTO v_sum, v_count
    FROM public.transaction_entries AS e
    WHERE e.transaction_id = v_transaction_id;

    IF v_count <> v_expected_count OR v_sum <> v_amount THEN
        RAISE EXCEPTION 'transaction entries must match amount and installment count'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.transaction_entries AS e
        WHERE e.transaction_id = v_transaction_id
            AND (
                (v_payment_method = 'pix'::public.payment_method AND (e.invoice_due_date IS NOT NULL OR e.installment_number <> 1 OR e.installment_count <> 1))
                OR (v_payment_method = 'credit'::public.payment_method AND e.invoice_due_date IS NULL)
            )
    ) THEN
        RAISE EXCEPTION 'transaction entries must match payment method rules'
            USING ERRCODE = '23514';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$fn$;

CREATE CONSTRAINT TRIGGER transactions_entries_consistency
    AFTER INSERT OR UPDATE OF amount_cents, installment_count ON public.transactions
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION private.assert_transaction_entry_totals();

CREATE CONSTRAINT TRIGGER transaction_entries_sum_consistency
    AFTER INSERT OR UPDATE OR DELETE ON public.transaction_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION private.assert_transaction_entry_totals();

CREATE FUNCTION public.create_transaction(
    p_name text,
    p_amount_cents integer,
    p_purchase_date date,
    p_payment_method public.payment_method,
    p_installment_count integer,
    p_category public.category,
    p_description text DEFAULT NULL,
    p_general_tags public.general_tag[] DEFAULT '{}'::public.general_tag[],
    p_specific_tag public.specific_tag DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid;
    v_tx public.transactions;
    v_name text;
    v_description text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    v_name := pg_catalog.btrim(p_name);
    v_description := NULLIF(pg_catalog.btrim(COALESCE(p_description, '')), '');

    INSERT INTO public.user_settings (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    PERFORM 1
    FROM public.user_settings
    WHERE user_id = v_user_id
    FOR UPDATE;

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
        p_amount_cents,
        p_purchase_date,
        p_payment_method,
        p_installment_count,
        p_category,
        COALESCE(p_general_tags, '{}'::public.general_tag[]),
        p_specific_tag
    )
    RETURNING * INTO v_tx;

    PERFORM private.rebuild_transaction_entries(v_tx.id);

    RETURN v_tx;
END;
$fn$;

CREATE FUNCTION public.update_transaction(
    p_transaction_id uuid,
    p_name text,
    p_amount_cents integer,
    p_purchase_date date,
    p_payment_method public.payment_method,
    p_installment_count integer,
    p_category public.category,
    p_description text DEFAULT NULL,
    p_general_tags public.general_tag[] DEFAULT '{}'::public.general_tag[],
    p_specific_tag public.specific_tag DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid;
    v_tx public.transactions;
    v_name text;
    v_description text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    v_name := pg_catalog.btrim(p_name);
    v_description := NULLIF(pg_catalog.btrim(COALESCE(p_description, '')), '');

    PERFORM 1
    FROM public.user_settings
    WHERE user_id = v_user_id
    FOR UPDATE;

    UPDATE public.transactions
    SET
        name = v_name,
        description = v_description,
        amount_cents = p_amount_cents,
        purchase_date = p_purchase_date,
        payment_method = p_payment_method,
        installment_count = p_installment_count,
        category = p_category,
        general_tags = COALESCE(p_general_tags, '{}'::public.general_tag[]),
        specific_tag = p_specific_tag
    WHERE id = p_transaction_id
        AND user_id = v_user_id
    RETURNING * INTO v_tx;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'transaction not found' USING ERRCODE = 'P0002';
    END IF;

    PERFORM private.rebuild_transaction_entries(v_tx.id);

    RETURN v_tx;
END;
$fn$;

CREATE FUNCTION public.delete_transaction(p_transaction_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid;
    v_deleted_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.transactions
    WHERE id = p_transaction_id
        AND user_id = v_user_id
    RETURNING id INTO v_deleted_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'transaction not found' USING ERRCODE = 'P0002';
    END IF;

    RETURN v_deleted_id;
END;
$fn$;

CREATE FUNCTION public.upsert_user_settings(p_closing_day integer, p_due_day integer)
RETURNS public.user_settings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
    v_user_id uuid;
    v_settings public.user_settings;
    v_changed boolean := false;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF p_closing_day < 1 OR p_closing_day > 28 OR p_due_day < 1 OR p_due_day > 28 THEN
        RAISE EXCEPTION 'cycle days must be between 1 and 28' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.user_settings (user_id, closing_day, due_day)
    VALUES (v_user_id, p_closing_day, p_due_day)
    ON CONFLICT (user_id) DO UPDATE
        SET
            closing_day = EXCLUDED.closing_day,
            due_day = EXCLUDED.due_day
        WHERE public.user_settings.closing_day IS DISTINCT FROM EXCLUDED.closing_day
            OR public.user_settings.due_day IS DISTINCT FROM EXCLUDED.due_day
    RETURNING * INTO v_settings;

    IF FOUND THEN
        v_changed := true;
    ELSE
        SELECT * INTO STRICT v_settings
        FROM public.user_settings
        WHERE user_id = v_user_id;
    END IF;

    IF v_changed THEN
        PERFORM private.recalculate_current_and_future_entries(v_user_id);
    END IF;

    RETURN v_settings;
END;
$fn$;

CREATE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION private.handle_new_user();

INSERT INTO public.user_settings (user_id)
SELECT id
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

REVOKE ALL ON FUNCTION private.specific_tag_matches_category(public.category, public.specific_tag) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.general_tags_are_valid(public.general_tag[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.invoice_due_date(date, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.shift_due_date(date, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.split_cents(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_competence_month() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.rebuild_transaction_entries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.recalculate_current_and_future_entries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.assert_transaction_entry_totals() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transaction(text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_transaction(uuid, text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transaction(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_user_settings(integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.specific_tag_matches_category(public.category, public.specific_tag) TO authenticated;
GRANT EXECUTE ON FUNCTION private.general_tags_are_valid(public.general_tag[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.invoice_due_date(date, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.shift_due_date(date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.split_cents(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_competence_month() TO authenticated;
GRANT EXECUTE ON FUNCTION private.rebuild_transaction_entries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.recalculate_current_and_future_entries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction(uuid, text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_settings(integer, integer) TO authenticated;

REVOKE ALL ON TABLE public.user_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.user_settings FROM anon;
REVOKE ALL ON TABLE public.transactions FROM PUBLIC;
REVOKE ALL ON TABLE public.transactions FROM anon;
REVOKE ALL ON TABLE public.transaction_entries FROM PUBLIC;
REVOKE ALL ON TABLE public.transaction_entries FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_entries TO authenticated;
