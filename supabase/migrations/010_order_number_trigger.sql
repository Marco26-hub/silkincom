-- Migration 010: Auto-generate orders.order_number on INSERT
-- Applied 2026-05-09 via Supabase MCP after E2E test discovered NOT NULL violation.
--
-- Format: SK-YYYYMMDD-NNNN (zero-padded counter from sequence)
-- Critical: production checkout would fail without this — orders.order_number
-- has NOT NULL constraint with no default, and create-payment-intent route does
-- not supply it.

create sequence if not exists orders_seq start 1;

create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
declare
  next_num bigint;
  date_part text;
begin
  if NEW.order_number is null or NEW.order_number = '' then
    next_num := nextval('orders_seq');
    date_part := to_char(coalesce(NEW.created_at, now()), 'YYYYMMDD');
    NEW.order_number := 'SK-' || date_part || '-' || lpad(next_num::text, 4, '0');
  end if;
  return NEW;
end;
$$;

drop trigger if exists orders_set_number on public.orders;
create trigger orders_set_number
  before insert on public.orders
  for each row
  execute function public.generate_order_number();

comment on function public.generate_order_number is 'Auto-generates order_number SK-YYYYMMDD-NNNN if not provided. Critical for /api/stripe/create-payment-intent flow.';
