-- Execute once in the Supabase SQL editor.
create table if not exists public.hanzi_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  document jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.hanzi_vaults enable row level security;
revoke all on public.hanzi_vaults from anon, authenticated;
grant select on public.hanzi_vaults to authenticated;
drop policy if exists own_vault on public.hanzi_vaults;
create policy own_vault on public.hanzi_vaults for select to authenticated
  using ((select auth.uid()) = user_id);

-- A revision check and row lock prevent one device overwriting another.
create or replace function public.save_hanzi_vault(expected_revision bigint, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(payload->'words') is distinct from 'array'
     or jsonb_typeof(payload->'grammar') is distinct from 'array'
     or jsonb_typeof(payload->'categories') is distinct from 'array'
     or octet_length(payload::text) > 10000000 then
    raise exception 'Invalid document';
  end if;
  insert into public.hanzi_vaults(user_id) values (owner_id) on conflict do nothing;
  select revision into current_revision from public.hanzi_vaults
    where user_id = owner_id for update;
  if current_revision <> expected_revision then
    return jsonb_build_object('conflict', true);
  end if;
  update public.hanzi_vaults set document = payload, revision = revision + 1, updated_at = now()
    where user_id = owner_id;
  return jsonb_build_object('revision', current_revision + 1);
end;
$$;
revoke all on function public.save_hanzi_vault(bigint,jsonb) from public, anon;
grant execute on function public.save_hanzi_vault(bigint,jsonb) to authenticated;
