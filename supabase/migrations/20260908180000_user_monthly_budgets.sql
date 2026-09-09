-- Migration: Create user_monthly_budgets for tracking monthly budget limits with effective date versioning

CREATE TABLE IF NOT EXISTS public.user_monthly_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    effective_month text NOT NULL CHECK (effective_month ~ '^[0-9]{4}-[0-9]{2}$'),
    budget_cents bigint NOT NULL CHECK (budget_cents >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_monthly_budgets_user_effective_month_key UNIQUE (user_id, effective_month)
);

CREATE INDEX IF NOT EXISTS user_monthly_budgets_user_effective_month_idx
    ON public.user_monthly_budgets (user_id, effective_month DESC);

ALTER TABLE public.user_monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_monthly_budgets_select_own
    ON public.user_monthly_budgets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY user_monthly_budgets_insert_own
    ON public.user_monthly_budgets
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_monthly_budgets_update_own
    ON public.user_monthly_budgets
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_monthly_budgets_delete_own
    ON public.user_monthly_budgets
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.user_monthly_budgets FROM PUBLIC;
REVOKE ALL ON TABLE public.user_monthly_budgets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_monthly_budgets TO authenticated;
