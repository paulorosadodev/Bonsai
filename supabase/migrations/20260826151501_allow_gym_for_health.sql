CREATE OR REPLACE FUNCTION private.specific_tag_matches_category(p_category public.category, p_tag public.specific_tag)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT CASE p_category
        WHEN 'fixed_expenses'::public.category THEN p_tag IN ('mobile_phone'::public.specific_tag, 'energy'::public.specific_tag, 'home'::public.specific_tag)
        WHEN 'health'::public.category THEN p_tag IN ('medicine'::public.specific_tag, 'doctor'::public.specific_tag, 'gym'::public.specific_tag)
        WHEN 'food'::public.category THEN p_tag IN ('restaurant'::public.specific_tag, 'bakery_or_grocery'::public.specific_tag, 'snack'::public.specific_tag)
        WHEN 'transportation'::public.category THEN p_tag IN ('uber'::public.specific_tag, 'travel'::public.specific_tag)
        WHEN 'leisure'::public.category THEN p_tag IN ('subscription'::public.specific_tag, 'tickets'::public.specific_tag, 'other'::public.specific_tag)
        ELSE false
    END;
$$;
