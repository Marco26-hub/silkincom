begin;
alter table public.contacts add column experience_payload jsonb
  check (experience_payload is null or pg_column_size(experience_payload)<=32768);

alter table public.experience_trips alter column user_id drop not null;
do $$
declare contact_id_type text;
begin
  select pg_catalog.format_type(atttypid, atttypmod) into strict contact_id_type from pg_catalog.pg_attribute
    where attrelid='public.contacts'::regclass and attname='id' and not attisdropped;
  execute format('alter table public.experience_trips add column guest_contact_id %s unique references public.contacts(id)',contact_id_type);
end;
$$;
alter table public.experience_trips add constraint experience_trip_identity
  check ((user_id is null) <> (guest_contact_id is null));

create table public.experience_bookings (
  quote_id uuid primary key references public.experience_quotes(id) on delete cascade,
  trip_id uuid not null references public.experience_trips(id) on delete cascade,
  token_hash text not null unique,
  accepted_at timestamptz,
  deposit_at timestamptz,
  balance_at timestamptz,
  deposit_session text,
  balance_session text,
  deposit_reference text,
  balance_reference text
);
create unique index experience_one_accepted_per_trip
  on public.experience_bookings(trip_id) where accepted_at is not null;
alter table public.experience_bookings enable row level security;
revoke all on public.experience_bookings from public, anon, authenticated;
grant all on public.experience_bookings to service_role;

create function public.experience_booking_transition(
  p_quote uuid, p_action text, p_token text, p_reference text, p_amount integer
) returns boolean language plpgsql set search_path = '' as $$
declare
  q public.experience_quotes%rowtype;
  b public.experience_bookings%rowtype;
  trip_version timestamptz;
  expected integer;
begin
  select * into q from public.experience_quotes where id=p_quote and status='sent';
  if not found then return false; end if;
  select updated_at into trip_version from public.experience_trips where id=q.trip_id for update;
  select * into b from public.experience_bookings where quote_id=p_quote for update;
  if not found then return false; end if;
  if p_action='accept' then
    if b.token_hash is distinct from p_token then return false; end if;
    if b.accepted_at is not null then return true; end if;
    if q.valid_until is null or q.valid_until<=now() or q.trip_updated_at<>trip_version
      or exists(select 1 from public.experience_bookings where trip_id=q.trip_id and accepted_at is not null)
      or exists(select 1 from public.experience_quotes where trip_id=q.trip_id and status='sent'
        and (published_at,id)>(q.published_at,q.id)) then return false; end if;
    update public.experience_bookings set accepted_at=now() where quote_id=p_quote;
    return true;
  end if;
  if b.accepted_at is null or p_reference is null or length(trim(p_reference)) not between 1 and 160 then return false; end if;
  expected := (q.total_cents+1)/2;
  if p_action='deposit' and p_amount=expected then
    if p_reference like 'bonifico:%' and b.deposit_session is not null then return false; end if;
    if b.deposit_at is not null then return b.deposit_reference=p_reference; end if;
    update public.experience_bookings set deposit_at=now(),deposit_reference=p_reference where quote_id=p_quote;
    return true;
  end if;
  if p_action='balance' and b.deposit_at is not null and p_amount=q.total_cents-expected then
    if p_reference like 'bonifico:%' and b.balance_session is not null then return false; end if;
    if b.balance_at is not null then return b.balance_reference=p_reference; end if;
    update public.experience_bookings set balance_at=now(),balance_reference=p_reference where quote_id=p_quote;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.experience_booking_transition(uuid,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.experience_booking_transition(uuid,text,text,text,integer) to service_role;
commit;
