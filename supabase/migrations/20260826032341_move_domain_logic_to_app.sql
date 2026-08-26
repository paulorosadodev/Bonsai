DROP TRIGGER IF EXISTS transactions_entries_consistency ON public.transactions;
DROP TRIGGER IF EXISTS transaction_entries_sum_consistency ON public.transaction_entries;

DROP FUNCTION IF EXISTS public.create_transaction(text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag);
DROP FUNCTION IF EXISTS public.update_transaction(uuid, text, integer, date, public.payment_method, integer, public.category, text, public.general_tag[], public.specific_tag);
DROP FUNCTION IF EXISTS public.delete_transaction(uuid);
DROP FUNCTION IF EXISTS public.upsert_user_settings(integer, integer);
DROP FUNCTION IF EXISTS private.rebuild_transaction_entries(uuid);
DROP FUNCTION IF EXISTS private.recalculate_current_and_future_entries(uuid);
DROP FUNCTION IF EXISTS private.assert_transaction_entry_totals();
DROP FUNCTION IF EXISTS private.invoice_due_date(date, integer, integer);
DROP FUNCTION IF EXISTS private.shift_due_date(date, integer);
DROP FUNCTION IF EXISTS private.split_cents(integer, integer);
DROP FUNCTION IF EXISTS private.current_competence_month();
