-- Internal operations: accessible only through authenticated admin APIs.
begin;
create table public.experience_suppliers (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 160),
 lake text not null check (lake in ('Como','Maggiore','Entrambi','Milano','Da definire')),
 contact_name text not null default '',
 email text not null default '', phone text not null default '', website text not null default '',
 status text not null default 'prospect' check(status in ('prospect','contacted','confirmed','inactive')),
 notes text not null default '' check(char_length(notes)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.experience_services (
 id uuid primary key default gen_random_uuid(),
 experience_id text not null,
 title text not null check(char_length(title) between 1 and 160),
 supplier_id uuid references public.experience_suppliers(id) on delete restrict,
 lake text not null check(lake in ('Como','Maggiore','Entrambi','Milano','Da definire')),
 unit text not null check(unit in ('persona','gruppo','barca','ora','giorno','servizio')),
 cost_cents integer check(cost_cents>=0), price_cents integer check(price_cents>=0),
 notes text not null default '' check(char_length(notes)<=4000),
 active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.experience_quote_details (
 quote_id uuid primary key references public.experience_quotes(id) on delete cascade,
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 30 and pg_column_size(items)<=65536),
 internal_notes text not null default '' check(char_length(internal_notes)<=4000)
);
alter table public.experience_quotes add column updated_at timestamptz not null default now();
create trigger experience_quotes_timestamp before update on public.experience_quotes for each row execute function public.set_experience_trip_updated_at();
create trigger experience_suppliers_timestamp before update on public.experience_suppliers for each row execute function public.set_experience_trip_updated_at();
create trigger experience_services_timestamp before update on public.experience_services for each row execute function public.set_experience_trip_updated_at();
alter table public.experience_suppliers enable row level security;
alter table public.experience_services enable row level security;
alter table public.experience_quote_details enable row level security;
revoke all on public.experience_suppliers, public.experience_services, public.experience_quote_details from public, anon, authenticated;
grant all on public.experience_suppliers, public.experience_services, public.experience_quote_details to service_role;
create index experience_services_supplier on public.experience_services(supplier_id);

-- One transaction locks the trip version and saves both public and private data.
create function public.admin_save_experience_quote(
 p_id uuid, p_trip_id uuid, p_trip_version timestamptz, p_quote_version timestamptz,
 p_items jsonb, p_inclusions text[], p_exclusions text[], p_conditions text,
 p_valid_until timestamptz, p_internal_notes text, p_publish boolean
) returns uuid language plpgsql security invoker set search_path='' as $$
declare t public.experience_trips; q public.experience_quotes; result_id uuid; total numeric;
begin
 select * into t from public.experience_trips where id=p_trip_id for update;
 if not found then raise exception 'trip_not_found' using errcode='P0002'; end if;
 if t.updated_at is distinct from p_trip_version then raise exception 'trip_changed' using errcode='40001'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'invalid_items' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) i where
   (i->>'quantity')::numeric not between 1 and 1000 or (i->>'quantity')::numeric<>trunc((i->>'quantity')::numeric)
   or (i->>'price_cents')::numeric<0 or (i->>'price_cents')::numeric<>trunc((i->>'price_cents')::numeric)
   or (i->>'cost_cents')::numeric<0 or (i->>'cost_cents')::numeric<>trunc((i->>'cost_cents')::numeric)
   or jsonb_typeof(i->'quantity') is distinct from 'number'
   or jsonb_typeof(i->'price_cents') is distinct from 'number'
   or jsonb_typeof(i->'cost_cents') not in ('number','null')
   or jsonb_typeof(i->'label') is distinct from 'string' or length(trim(i->>'label')) not between 1 and 200
   or not (i ?& array['quantity','price_cents','cost_cents','label'])
 ) then raise exception 'invalid_item_values' using errcode='22023'; end if;
 select sum((i->>'quantity')::numeric*(i->>'price_cents')::numeric) into total from jsonb_array_elements(p_items) i;
 if total is null or total not between 1 and 100000000 then raise exception 'invalid_total' using errcode='22023'; end if;
 if p_publish and (p_valid_until is null or p_valid_until<=now()) then raise exception 'invalid_validity' using errcode='22023'; end if;
 if p_id is not null then
   select * into q from public.experience_quotes where id=p_id and trip_id=p_trip_id for update;
   if not found then raise exception 'quote_not_found' using errcode='P0002'; end if;
   if q.status<>'draft' then raise exception 'published_quote_immutable' using errcode='40001'; end if;
   if q.updated_at is distinct from p_quote_version then raise exception 'quote_changed' using errcode='40001'; end if;
   update public.experience_quotes set total_cents=total::integer,inclusions=p_inclusions,exclusions=p_exclusions,
     conditions=p_conditions,valid_until=p_valid_until,status=case when p_publish then 'sent' else 'draft' end,
     published_at=now(),trip_updated_at=t.updated_at where id=p_id returning id into result_id;
 else
   insert into public.experience_quotes(trip_id,total_cents,inclusions,exclusions,conditions,valid_until,status,trip_updated_at)
   values(p_trip_id,total::integer,p_inclusions,p_exclusions,p_conditions,p_valid_until,case when p_publish then 'sent' else 'draft' end,t.updated_at)
   returning id into result_id;
 end if;
 insert into public.experience_quote_details(quote_id,items,internal_notes) values(result_id,p_items,p_internal_notes)
 on conflict(quote_id) do update set items=excluded.items,internal_notes=excluded.internal_notes;
 return result_id;
end;
$$;
revoke all on function public.admin_save_experience_quote(uuid,uuid,timestamptz,timestamptz,jsonb,text[],text[],text,timestamptz,text,boolean) from public, anon, authenticated;
grant execute on function public.admin_save_experience_quote(uuid,uuid,timestamptz,timestamptz,jsonb,text[],text[],text,timestamptz,text,boolean) to service_role;
commit;
