-- Private itineraries. A saved draft is neither a booking nor a purchase.
begin;
create table public.experience_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and payload ?& array['version','ids','lake'] and payload->>'version' = '1'
    and jsonb_typeof(payload->'ids') = 'array'
    and jsonb_array_length(payload->'ids') <= 30
    and payload->>'lake' in ('Da scegliere insieme', 'Lago di Como', 'Lago Maggiore', 'Entrambi i laghi')
    and pg_column_size(payload) <= 32768
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experience_trips_owner_updated on public.experience_trips(user_id, updated_at desc);
alter table public.experience_trips enable row level security;
revoke all on public.experience_trips from anon;
grant select, insert, update, delete on public.experience_trips to authenticated;
grant all on public.experience_trips to service_role;
create policy experience_trips_owner_select on public.experience_trips for select to authenticated using ((select auth.uid()) = user_id);
create policy experience_trips_owner_insert on public.experience_trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy experience_trips_owner_update on public.experience_trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy experience_trips_owner_delete on public.experience_trips for delete to authenticated using ((select auth.uid()) = user_id);
create function public.set_experience_trip_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_experience_trip_updated_at() from public;
create trigger experience_trips_timestamp before update on public.experience_trips for each row execute function public.set_experience_trip_updated_at();

-- Customer-readable only after publication by the business. The customer may
-- never set or amend their own prices. service_role is the only writer.
create table public.experience_quotes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.experience_trips(id) on delete cascade,
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  inclusions text[] not null default '{}',
  exclusions text[] not null default '{}',
  conditions text not null check (char_length(conditions) between 1 and 4000),
  valid_until timestamptz,
  published_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','sent')),
  trip_updated_at timestamptz not null
);
create index experience_quotes_trip on public.experience_quotes(trip_id, published_at desc);
alter table public.experience_quotes enable row level security;
revoke all on public.experience_quotes from anon, authenticated;
grant select on public.experience_quotes to authenticated;
grant all on public.experience_quotes to service_role;
create policy experience_quotes_owner_select on public.experience_quotes for select to authenticated using (
  status = 'sent' and exists (select 1 from public.experience_trips t where t.id = trip_id and t.user_id = (select auth.uid()))
);
commit;
