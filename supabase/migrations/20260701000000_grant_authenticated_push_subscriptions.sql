-- The previous migration granted service_role access but assumed the
-- project's default grants already covered authenticated/anon for this
-- table. They don't: authenticated had no SELECT/INSERT/UPDATE/DELETE on
-- push_subscriptions, which silently broke client-side subscription
-- persistence (RLS never even ran, the grant check failed first).
grant select, insert, update, delete on public.push_subscriptions to authenticated;
