-- The role helper is called by the authenticated profile SELECT policy.
-- Keep that policy access while preventing anonymous RPC calls.
revoke execute on function public.riskscape_has_role(text) from anon;

