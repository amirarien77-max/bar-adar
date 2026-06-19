-- Low stock email notifications
-- Requires: pg_net extension + Edge Function deployed + app_config populated

create extension if not exists pg_net with schema extensions;

-- Notification log (admins can view sent emails)
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  status text not null,
  quantity integer,
  recipients_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.notification_log enable row level security;

create policy "Admins can read notification log"
  on public.notification_log for select
  to authenticated
  using (public.is_admin());

-- Server-side trigger config (set once after deploy)
create table if not exists public.app_config (
  key text primary key,
  value text not null
);

alter table public.app_config enable row level security;

create policy "Admins can manage app config"
  on public.app_config for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- AFTER UPDATE trigger: call Edge Function via pg_net when stock becomes low
create or replace function public.queue_low_stock_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_url text;
  webhook_secret text;
  reporter_name text;
  payload jsonb;
begin
  if new.status not in ('מעט', 'אין בכלל') then
    return new;
  end if;

  if old.status in ('מעט', 'אין בכלל') then
    return new;
  end if;

  select value into webhook_url from public.app_config where key = 'notify_low_stock_url';
  select value into webhook_secret from public.app_config where key = 'notify_low_stock_secret';

  if webhook_url is null or webhook_secret is null then
    return new;
  end if;

  select coalesce(full_name, email) into reporter_name
  from public.profiles where id = new.reported_by;

  payload := jsonb_build_object(
    'product_id', new.id,
    'product_name', new.name,
    'status', new.status,
    'quantity', new.quantity,
    'supplier', new.supplier,
    'reported_by_name', reporter_name
  );

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := payload
  );

  return new;
exception
  when others then
    raise warning 'low stock notification failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_low_stock_notify on public.products;
create trigger on_low_stock_notify
  after update on public.products
  for each row execute function public.queue_low_stock_notification();

-- One-time setup (replace with your project values):
-- insert into public.app_config (key, value) values
--   ('notify_low_stock_url', 'https://YOUR_PROJECT.supabase.co/functions/v1/notify-low-stock'),
--   ('notify_low_stock_secret', 'YOUR_SERVICE_ROLE_KEY')
-- on conflict (key) do update set value = excluded.value;
