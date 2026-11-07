create table if not exists public.lin_daily_quota (
  day date not null,
  bucket text not null,
  requests integer not null,
  primary key (day, bucket)
);

alter table public.lin_daily_quota enable row level security;
revoke all on public.lin_daily_quota from public, anon, authenticated;

create or replace function public.reserve_lin_request(learner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'UTC')::date;
  used integer;
begin
  delete from public.lin_daily_quota where day < today - 7;

  insert into public.lin_daily_quota as quota (day, bucket, requests)
  values (today, 'global', 1)
  on conflict (day, bucket) do update set requests = quota.requests + 1
  where quota.requests < 200
  returning requests into used;

  if used is null then
    raise exception 'Daily guide quota reached';
  end if;

  insert into public.lin_daily_quota as quota (day, bucket, requests)
  values (today, learner::text, 1)
  on conflict (day, bucket) do update set requests = quota.requests + 1
  where quota.requests < 8
  returning requests into used;

  if used is null then
    raise exception 'Daily guide quota reached';
  end if;
end;
$$;

revoke all on function public.reserve_lin_request(uuid) from public, anon, authenticated;
grant execute on function public.reserve_lin_request(uuid) to service_role;
