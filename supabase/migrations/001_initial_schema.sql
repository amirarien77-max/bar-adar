-- Bar Adar Inventory System - Initial Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- Products / inventory
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supplier text,
  quantity integer not null default 0,
  status text not null default 'יש' check (status in ('יש', 'מעט', 'אין בכלל', 'הוזמן')),
  arrival_status text,
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_status_update timestamptz not null default now()
);

-- Status change history for reports
create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  product_name text not null,
  quantity integer,
  status text not null check (status in ('יש', 'מעט', 'אין בכלל', 'הוזמן')),
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_name text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Log status changes
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reporter_name text;
begin
  if old.status is distinct from new.status or old.quantity is distinct from new.quantity then
    select full_name into reporter_name from public.profiles where id = new.reported_by;
    insert into public.status_history (product_id, product_name, quantity, status, changed_by, changed_by_name)
    values (new.id, new.name, new.quantity, new.status, new.reported_by, reporter_name);
    new.last_status_update := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_product_status_change on public.products;
create trigger on_product_status_change
  before update on public.products
  for each row execute function public.log_status_change();

-- Helper: check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.status_history enable row level security;

-- Profiles policies
drop policy if exists "Users can read all profiles" on public.profiles;
create policy "Users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Products policies
drop policy if exists "Authenticated users can read products" on public.products;
create policy "Authenticated users can read products"
  on public.products for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update any product" on public.products;
create policy "Admins can update any product"
  on public.products for update
  to authenticated
  using (public.is_admin());

drop policy if exists "Users can report low/out stock on unlocked products" on public.products;
create policy "Users can report low/out stock on unlocked products"
  on public.products for update
  to authenticated
  using (
    not public.is_admin()
    and status in ('יש', 'הוזמן')
  )
  with check (
    not public.is_admin()
    and status in ('מעט', 'אין בכלל')
    and quantity > 0
  );

-- Status history policies
drop policy if exists "Admins can read status history" on public.status_history;
create policy "Admins can read status history"
  on public.status_history for select
  to authenticated
  using (public.is_admin());

-- History rows are inserted by the security definer trigger (bypasses RLS)

-- Realtime (skip if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

-- Seed sample products (optional - remove in production)
insert into public.products (name, supplier, quantity, status) values
  ('בירה קורונה', 'משקאות בע״מ', 48, 'יש'),
  ('וויסקי ג׳ק דניאלס', 'יין ומשקאות', 6, 'יש'),
  ('מיץ לימון', 'סיטונאות מזון', 12, 'יש'),
  ('קרח', 'סיטונאות מזון', 0, 'יש'),
  ('כוסות פלסטיק', 'ציוד חד פעמי', 200, 'יש')
on conflict do nothing;

-- NOTE: Create your first admin user via Supabase Auth, then run:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
