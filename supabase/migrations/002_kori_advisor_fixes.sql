REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id);
