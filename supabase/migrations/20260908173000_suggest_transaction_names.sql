-- ═══════════════════════════════════════════════════════════════════
-- Migration: Transaction name suggestions RPC
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.suggest_transaction_names(
    p_query text,
    p_limit int DEFAULT 5
)
RETURNS TABLE (
    name text,
    category_id uuid,
    category_name text,
    category_color text,
    category_icon text,
    specific_tag_id uuid,
    general_tag_ids uuid[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $fn$
DECLARE
    v_user_id uuid := auth.uid();
    v_clean_query text := trim(p_query);
    v_limit int := GREATEST(1, LEAST(COALESCE(p_limit, 5), 20));
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;

    IF v_clean_query IS NULL OR char_length(v_clean_query) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH matched_tx AS (
        SELECT
            t.name,
            t.category_id,
            t.specific_tag_id,
            t.general_tag_ids
        FROM public.transactions t
        WHERE t.user_id = v_user_id
          AND LOWER(TRIM(t.name)) <> 'uber'
          AND extensions.unaccent(t.name) ILIKE '%' || extensions.unaccent(v_clean_query) || '%'
    ),
    name_totals AS (
        SELECT
            m.name,
            COUNT(*) AS total_count
        FROM matched_tx m
        GROUP BY m.name
    ),
    composition_counts AS (
        SELECT
            m.name,
            m.category_id,
            m.specific_tag_id,
            m.general_tag_ids,
            COUNT(*) AS comp_count,
            (CASE WHEN m.specific_tag_id IS NOT NULL THEN 1 ELSE 0 END + COALESCE(pg_catalog.cardinality(m.general_tag_ids), 0)) AS tag_count
        FROM matched_tx m
        GROUP BY m.name, m.category_id, m.specific_tag_id, m.general_tag_ids
    ),
    ranked_compositions AS (
        SELECT
            cc.name,
            cc.category_id,
            cc.specific_tag_id,
            cc.general_tag_ids,
            ROW_NUMBER() OVER (
                PARTITION BY cc.name
                ORDER BY cc.comp_count DESC, cc.tag_count ASC, cc.category_id ASC
            ) AS rn
        FROM composition_counts cc
    )
    SELECT
        rc.name,
        rc.category_id,
        uc.name AS category_name,
        uc.color AS category_color,
        uc.icon AS category_icon,
        ust.id AS specific_tag_id,
        COALESCE(
            (
                SELECT pg_catalog.array_agg(ugt.id ORDER BY ugt.sort_order)
                FROM public.user_general_tags ugt
                WHERE ugt.id = ANY(rc.general_tag_ids)
                  AND ugt.user_id = v_user_id
            ),
            '{}'::uuid[]
        ) AS general_tag_ids
    FROM ranked_compositions rc
    JOIN name_totals nt ON nt.name = rc.name
    JOIN public.user_categories uc ON uc.id = rc.category_id AND uc.user_id = v_user_id
    LEFT JOIN public.user_specific_tags ust ON ust.id = rc.specific_tag_id
                                           AND ust.category_id = rc.category_id
                                           AND ust.user_id = v_user_id
    WHERE rc.rn = 1
    ORDER BY nt.total_count DESC, rc.name ASC
    LIMIT v_limit;
END;
$fn$;

REVOKE ALL ON FUNCTION public.suggest_transaction_names(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.suggest_transaction_names(text, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.suggest_transaction_names(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_transaction_names(text, int) TO service_role;
