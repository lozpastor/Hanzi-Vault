-- Publish inserts/updates; existing RLS restricts events to each account.
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='hanzi_vaults') then
    alter publication supabase_realtime add table public.hanzi_vaults;
  end if;
end $$;
