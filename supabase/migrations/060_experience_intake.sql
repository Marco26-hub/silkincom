begin;
alter table public.contacts add column experience_request_key uuid unique;
alter table public.contacts add column experience_trip_id uuid references public.experience_trips(id) on delete set null;

create function public.guard_experience_contact_link()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon','authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    if new.experience_payload is null and new.experience_request_key is null and new.experience_trip_id is null then return new; end if;
  elsif new.experience_payload is not distinct from old.experience_payload
    and new.experience_request_key is not distinct from old.experience_request_key
    and new.experience_trip_id is not distinct from old.experience_trip_id then
    return new;
  end if;
  raise exception 'experience_link_server_only' using errcode='42501';
end;
$$;
create trigger guard_experience_contact_link before insert or update on public.contacts
  for each row execute function public.guard_experience_contact_link();

create function public.intake_experience_request(
  p_key uuid, p_trip uuid, p_version timestamptz, p_user uuid,
  p_name text, p_surname text, p_email text, p_phone text,
  p_message text, p_payload jsonb
) returns boolean language plpgsql set search_path = '' as $$
declare
  contact public.contacts.id%type;
  trip uuid := p_trip;
begin
  if trip is not null then
    perform 1 from public.experience_trips where id=trip and user_id=p_user and updated_at=p_version for update;
    if not found then raise exception 'experience_trip_changed' using errcode='40001'; end if;
  end if;
  insert into public.contacts(nome,cognome,email,telefono,messaggio,experience_payload,experience_request_key,experience_trip_id)
    values(p_name,p_surname,p_email,p_phone,p_message,p_payload,p_key,trip)
    on conflict (experience_request_key) do nothing returning id into contact;
  if contact is null then return false; end if;
  if trip is null then
    insert into public.experience_trips(guest_contact_id,title,payload)
      values(contact,'Richiesta ospite n. ' || contact,p_payload) returning id into trip;
    update public.contacts set experience_trip_id=trip where id=contact;
  end if;
  return true;
end;
$$;
revoke all on function public.intake_experience_request(uuid,uuid,timestamptz,uuid,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.intake_experience_request(uuid,uuid,timestamptz,uuid,text,text,text,text,text,jsonb) to service_role;
commit;
