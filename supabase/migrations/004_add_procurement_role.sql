-- Add procurement role (איש רכש) with inventory permissions like admin

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'procurement', 'user'));

-- Staff = admin or procurement (inventory management)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'procurement')
  );
$$;

-- Products: staff can manage inventory
drop policy if exists "Admins can insert products" on public.products;
create policy "Staff can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists "Admins can delete products" on public.products;
create policy "Staff can delete products"
  on public.products for delete
  to authenticated
  using (public.is_staff());

drop policy if exists "Admins can update any product" on public.products;
create policy "Staff can update any product"
  on public.products for update
  to authenticated
  using (public.is_staff());

-- Regular users: report low stock only when not staff
drop policy if exists "Users can report low/out stock on unlocked products" on public.products;
create policy "Users can report low/out stock on unlocked products"
  on public.products for update
  to authenticated
  using (
    not public.is_staff()
    and status in ('יש', 'הוזמן')
  )
  with check (
    not public.is_staff()
    and status in ('מעט', 'אין בכלל')
    and quantity > 0
  );

-- Assign procurement role example:
-- UPDATE public.profiles SET role = 'procurement' WHERE email = 'buyer@example.com';
