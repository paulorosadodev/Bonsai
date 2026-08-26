REVOKE ALL ON TABLE public.user_settings FROM authenticated;
REVOKE ALL ON TABLE public.transactions FROM authenticated;
REVOKE ALL ON TABLE public.transaction_entries FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transaction_entries TO authenticated;

DO $do$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
            AND p.proname = 'rls_auto_enable'
            AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    ) THEN
        EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
        EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon';
        EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated';
    END IF;
END;
$do$;
