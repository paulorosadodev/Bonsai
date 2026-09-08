-- ═══════════════════════════════════════════════════════════════════
-- Migration: Dynamic categories & tags (enum → table)
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. CREATE NEW TABLES
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE public.user_categories (
    id          uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug        text NOT NULL,
    name        text NOT NULL,
    icon        text NOT NULL DEFAULT 'circle',
    color       text NOT NULL DEFAULT '#A78BFA',
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_categories_name_length CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 60),
    CONSTRAINT user_categories_slug_length CHECK (pg_catalog.char_length(slug) BETWEEN 1 AND 60),
    CONSTRAINT user_categories_icon_length CHECK (pg_catalog.char_length(icon) BETWEEN 1 AND 60),
    CONSTRAINT user_categories_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT user_categories_user_slug_key UNIQUE (user_id, slug)
);

CREATE TABLE public.user_general_tags (
    id          uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug        text NOT NULL,
    name        text NOT NULL,
    icon        text NOT NULL DEFAULT 'tag',
    color       text NOT NULL DEFAULT '#5EEAD4',
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at  timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_general_tags_name_length CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 60),
    CONSTRAINT user_general_tags_slug_length CHECK (pg_catalog.char_length(slug) BETWEEN 1 AND 60),
    CONSTRAINT user_general_tags_icon_length CHECK (pg_catalog.char_length(icon) BETWEEN 1 AND 60),
    CONSTRAINT user_general_tags_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT user_general_tags_user_slug_key UNIQUE (user_id, slug)
);

CREATE TABLE public.user_specific_tags (
    id            uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id   uuid NOT NULL REFERENCES public.user_categories(id) ON DELETE CASCADE,
    slug          text NOT NULL,
    name          text NOT NULL,
    icon          text NOT NULL DEFAULT 'tag',
    color         text,
    sort_order    integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT pg_catalog.now(),
    updated_at    timestamptz NOT NULL DEFAULT pg_catalog.now(),
    CONSTRAINT user_specific_tags_name_length CHECK (pg_catalog.char_length(name) BETWEEN 1 AND 60),
    CONSTRAINT user_specific_tags_slug_length CHECK (pg_catalog.char_length(slug) BETWEEN 1 AND 60),
    CONSTRAINT user_specific_tags_icon_length CHECK (pg_catalog.char_length(icon) BETWEEN 1 AND 60),
    CONSTRAINT user_specific_tags_color_hex CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT user_specific_tags_user_slug_key UNIQUE (user_id, slug)
);

CREATE INDEX user_categories_user_id_sort_idx ON public.user_categories (user_id, sort_order);
CREATE INDEX user_general_tags_user_id_sort_idx ON public.user_general_tags (user_id, sort_order);
CREATE INDEX user_specific_tags_user_id_category_idx ON public.user_specific_tags (user_id, category_id, sort_order);

-- RLS
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_general_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_specific_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_categories_select_own ON public.user_categories FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_categories_insert_own ON public.user_categories FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_categories_update_own ON public.user_categories FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_categories_delete_own ON public.user_categories FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_general_tags_select_own ON public.user_general_tags FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_general_tags_insert_own ON public.user_general_tags FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_general_tags_update_own ON public.user_general_tags FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_general_tags_delete_own ON public.user_general_tags FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_specific_tags_select_own ON public.user_specific_tags FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_specific_tags_insert_own ON public.user_specific_tags FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_specific_tags_update_own ON public.user_specific_tags FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY user_specific_tags_delete_own ON public.user_specific_tags FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Triggers
CREATE TRIGGER user_categories_set_updated_at BEFORE UPDATE ON public.user_categories FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER user_general_tags_set_updated_at BEFORE UPDATE ON public.user_general_tags FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER user_specific_tags_set_updated_at BEFORE UPDATE ON public.user_specific_tags FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Privileges
REVOKE ALL ON TABLE public.user_categories FROM PUBLIC;
REVOKE ALL ON TABLE public.user_categories FROM anon;
REVOKE ALL ON TABLE public.user_general_tags FROM PUBLIC;
REVOKE ALL ON TABLE public.user_general_tags FROM anon;
REVOKE ALL ON TABLE public.user_specific_tags FROM PUBLIC;
REVOKE ALL ON TABLE public.user_specific_tags FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_general_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_specific_tags TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 2. SEED DEFAULT CATEGORIES & TAGS FOR EXISTING USERS
-- ───────────────────────────────────────────────────────────────────

INSERT INTO public.user_categories (user_id, slug, name, icon, color, sort_order)
SELECT u.id, v.slug, v.name, v.icon, v.color, v.sort_order
FROM auth.users AS u
CROSS JOIN (VALUES
    ('fixed_expenses', 'Contas Fixas',  'ReceiptText', '#A78BFA', 0),
    ('hygiene',        'Higiene',       'Sparkles',    '#2DD4BF', 1),
    ('health',         'Saúde',         'HeartPulse',  '#FB7185', 2),
    ('food',           'Alimentação',   'Utensils',    '#F5C451', 3),
    ('transportation', 'Transporte',    'BusFront',    '#60A5FA', 4),
    ('leisure',        'Lazer',         'PartyPopper', '#D8B4FE', 5),
    ('clothing',       'Vestuário',     'Shirt',       '#F9A8D4', 6),
    ('personal',       'Pessoal',       'UserRound',   '#A3E635', 7),
    ('gift',           'Presente',      'Gift',        '#FDBA74', 8)
) AS v(slug, name, icon, color, sort_order)
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO public.user_general_tags (user_id, slug, name, icon, color, sort_order)
SELECT u.id, v.slug, v.name, v.icon, v.color, v.sort_order
FROM auth.users AS u
CROSS JOIN (VALUES
    ('reimbursement', 'Reembolso', 'HandCoins',  '#5EEAD4', 0),
    ('family',        'Família',   'UsersRound', '#F9A8D4', 1),
    ('friends',       'Amigos',    'Handshake',  '#7DD3FC', 2)
) AS v(slug, name, icon, color, sort_order)
ON CONFLICT (user_id, slug) DO NOTHING;

INSERT INTO public.user_specific_tags (user_id, category_id, slug, name, icon, color, sort_order)
SELECT uc.user_id, uc.id, v.slug, v.name, v.icon, v.color, v.sort_order
FROM public.user_categories AS uc
JOIN (VALUES
    ('fixed_expenses', 'mobile_phone',      'Celular',              'Smartphone',      '#A78BFA', 0),
    ('fixed_expenses', 'energy',            'Energia',              'Bolt',            '#A78BFA', 1),
    ('fixed_expenses', 'home',              'Casa',                 'House',           '#A78BFA', 2),
    ('health',         'medicine',          'Remédio',              'Pill',            '#FB7185', 3),
    ('health',         'doctor',            'Médico',               'Stethoscope',     '#FB7185', 4),
    ('health',         'gym',               'Academia',             'Dumbbell',        '#FB7185', 5),
    ('food',           'restaurant',        'Restaurante',          'Utensils',        '#F5C451', 6),
    ('food',           'bakery_or_grocery', 'Padaria/Supermercado', 'ShoppingBasket',  '#F5C451', 7),
    ('food',           'snack',             'Lanche',               'ShoppingBasket',  '#F5C451', 8),
    ('transportation', 'uber',              'Uber',                 'Car',             '#60A5FA', 9),
    ('transportation', 'travel',            'Viagem',               'Plane',           '#60A5FA', 10),
    ('leisure',        'subscription',      'Assinatura',           'Wifi',            '#D8B4FE', 11),
    ('leisure',        'tickets',           'Ingressos',            'Ticket',          '#D8B4FE', 12),
    ('leisure',        'other',             'Outro',                'CircleEllipsis',  '#D8B4FE', 13)
) AS v(cat_slug, slug, name, icon, color, sort_order)
ON uc.slug = v.cat_slug
ON CONFLICT (user_id, slug) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 3. ADD NEW COLUMNS TO transactions AND recurring_versions
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions
    ADD COLUMN category_id uuid REFERENCES public.user_categories(id),
    ADD COLUMN general_tag_ids uuid[] NOT NULL DEFAULT '{}',
    ADD COLUMN specific_tag_id uuid REFERENCES public.user_specific_tags(id);

ALTER TABLE public.recurring_versions
    ADD COLUMN category_id uuid REFERENCES public.user_categories(id),
    ADD COLUMN general_tag_ids uuid[] NOT NULL DEFAULT '{}',
    ADD COLUMN specific_tag_id uuid REFERENCES public.user_specific_tags(id);

-- ───────────────────────────────────────────────────────────────────
-- 4. BACKFILL UUID COLUMNS FROM ENUM VALUES
-- ───────────────────────────────────────────────────────────────────

UPDATE public.transactions AS t
SET category_id = uc.id
FROM public.user_categories AS uc
WHERE uc.user_id = t.user_id AND uc.slug = t.category::text;

UPDATE public.transactions AS t
SET specific_tag_id = ust.id
FROM public.user_specific_tags AS ust
WHERE ust.user_id = t.user_id AND ust.slug = t.specific_tag::text AND t.specific_tag IS NOT NULL;

UPDATE public.transactions AS t
SET general_tag_ids = COALESCE(
    (SELECT pg_catalog.array_agg(ugt.id ORDER BY ugt.sort_order)
     FROM pg_catalog.unnest(t.general_tags) AS tag_val
     JOIN public.user_general_tags AS ugt ON ugt.user_id = t.user_id AND ugt.slug = tag_val::text),
    '{}'::uuid[]
)
WHERE pg_catalog.array_length(t.general_tags, 1) > 0;

UPDATE public.recurring_versions AS rv
SET category_id = uc.id
FROM public.user_categories AS uc
WHERE uc.user_id = rv.user_id AND uc.slug = rv.category::text;

UPDATE public.recurring_versions AS rv
SET specific_tag_id = ust.id
FROM public.user_specific_tags AS ust
WHERE ust.user_id = rv.user_id AND ust.slug = rv.specific_tag::text AND rv.specific_tag IS NOT NULL;

UPDATE public.recurring_versions AS rv
SET general_tag_ids = COALESCE(
    (SELECT pg_catalog.array_agg(ugt.id ORDER BY ugt.sort_order)
     FROM pg_catalog.unnest(rv.general_tags) AS tag_val
     JOIN public.user_general_tags AS ugt ON ugt.user_id = rv.user_id AND ugt.slug = tag_val::text),
    '{}'::uuid[]
)
WHERE pg_catalog.array_length(rv.general_tags, 1) > 0;

-- ───────────────────────────────────────────────────────────────────
-- 5. MAKE category_id NOT NULL, DROP OLD COLUMNS & CONSTRAINTS
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.transactions ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE public.recurring_versions ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_general_tags_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_specific_tag_category_check;
ALTER TABLE public.recurring_versions DROP CONSTRAINT IF EXISTS recurring_versions_general_tags_check;
ALTER TABLE public.recurring_versions DROP CONSTRAINT IF EXISTS recurring_versions_specific_tag_category_check;

ALTER TABLE public.transactions
    DROP COLUMN category,
    DROP COLUMN general_tags,
    DROP COLUMN specific_tag;

ALTER TABLE public.recurring_versions
    DROP COLUMN category,
    DROP COLUMN general_tags,
    DROP COLUMN specific_tag;

CREATE INDEX transactions_user_id_category_id_idx ON public.transactions (user_id, category_id);
CREATE INDEX recurring_versions_category_id_idx ON public.recurring_versions (category_id);
DROP INDEX IF EXISTS public.transactions_user_id_category_idx;

-- ───────────────────────────────────────────────────────────────────
-- 6. DROP OLD HELPER FUNCTIONS THAT USE ENUMS
-- ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS private.specific_tag_matches_category(public.category, public.specific_tag);
DROP FUNCTION IF EXISTS private.general_tags_are_valid(public.general_tag[]);

-- ───────────────────────────────────────────────────────────────────
-- 7. DROP OLD STANDALONE FUNCTIONS
-- ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.create_transaction(text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag);
DROP FUNCTION IF EXISTS public.update_transaction(uuid, text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag);
DROP FUNCTION IF EXISTS public.delete_transaction(uuid);
DROP FUNCTION IF EXISTS public.upsert_user_settings(integer, integer);

-- ───────────────────────────────────────────────────────────────────
-- 8. DROP ENUM TYPES
-- ───────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.category;
DROP TYPE IF EXISTS public.general_tag;
DROP TYPE IF EXISTS public.specific_tag;

-- ───────────────────────────────────────────────────────────────────
-- 9. RECREATE persist_transaction WITH UUID COLUMNS
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
            payment_method, installment_count, category_id, general_tag_ids, specific_tag_id
        )
        VALUES (
            v_user_id, v_name, v_description, v_amount_cents, v_purchase_date,
            v_payment_method, v_installment_count, v_category_id, v_general_tag_ids, v_specific_tag_id
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
            specific_tag_id = v_specific_tag_id
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

-- ───────────────────────────────────────────────────────────────────
-- 10. RECREATE persist_recurrence WITH UUID COLUMNS
-- ───────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.persist_recurrence(jsonb, jsonb);

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

REVOKE ALL ON FUNCTION public.persist_recurrence(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_recurrence(jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.persist_recurrence(jsonb, jsonb) TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 11. UPDATE handle_new_user TO SEED CATEGORIES/TAGS
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_categories (user_id, slug, name, icon, color, sort_order)
    VALUES
        (NEW.id, 'fixed_expenses', 'Contas Fixas',  'ReceiptText', '#A78BFA', 0),
        (NEW.id, 'hygiene',        'Higiene',       'Sparkles',    '#2DD4BF', 1),
        (NEW.id, 'health',         'Saúde',         'HeartPulse',  '#FB7185', 2),
        (NEW.id, 'food',           'Alimentação',   'Utensils',    '#F5C451', 3),
        (NEW.id, 'transportation', 'Transporte',    'BusFront',    '#60A5FA', 4),
        (NEW.id, 'leisure',        'Lazer',         'PartyPopper', '#D8B4FE', 5),
        (NEW.id, 'clothing',       'Vestuário',     'Shirt',       '#F9A8D4', 6),
        (NEW.id, 'personal',       'Pessoal',       'UserRound',   '#A3E635', 7),
        (NEW.id, 'gift',           'Presente',      'Gift',        '#FDBA74', 8)
    ON CONFLICT (user_id, slug) DO NOTHING;

    INSERT INTO public.user_general_tags (user_id, slug, name, icon, color, sort_order)
    VALUES
        (NEW.id, 'reimbursement', 'Reembolso', 'HandCoins',  '#5EEAD4', 0),
        (NEW.id, 'family',        'Família',   'UsersRound', '#F9A8D4', 1),
        (NEW.id, 'friends',       'Amigos',    'Handshake',  '#7DD3FC', 2)
    ON CONFLICT (user_id, slug) DO NOTHING;

    INSERT INTO public.user_specific_tags (user_id, category_id, slug, name, icon, color, sort_order)
    SELECT NEW.id, uc.id, v.slug, v.name, v.icon, v.color, v.sort_order
    FROM public.user_categories AS uc
    JOIN (VALUES
        ('fixed_expenses', 'mobile_phone',      'Celular',              'Smartphone',      '#A78BFA', 0),
        ('fixed_expenses', 'energy',            'Energia',              'Bolt',            '#A78BFA', 1),
        ('fixed_expenses', 'home',              'Casa',                 'House',           '#A78BFA', 2),
        ('health',         'medicine',          'Remédio',              'Pill',            '#FB7185', 3),
        ('health',         'doctor',            'Médico',               'Stethoscope',     '#FB7185', 4),
        ('health',         'gym',               'Academia',             'Dumbbell',        '#FB7185', 5),
        ('food',           'restaurant',        'Restaurante',          'Utensils',        '#F5C451', 6),
        ('food',           'bakery_or_grocery', 'Padaria/Supermercado', 'ShoppingBasket',  '#F5C451', 7),
        ('food',           'snack',             'Lanche',               'ShoppingBasket',  '#F5C451', 8),
        ('transportation', 'uber',              'Uber',                 'Car',             '#60A5FA', 9),
        ('transportation', 'travel',            'Viagem',               'Plane',           '#60A5FA', 10),
        ('leisure',        'subscription',      'Assinatura',           'Wifi',            '#D8B4FE', 11),
        ('leisure',        'tickets',           'Ingressos',            'Ticket',          '#D8B4FE', 12),
        ('leisure',        'other',             'Outro',                'CircleEllipsis',  '#D8B4FE', 13)
    ) AS v(cat_slug, slug, name, icon, color, sort_order)
    ON uc.slug = v.cat_slug AND uc.user_id = NEW.id
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN NEW;
END;
$fn$;
