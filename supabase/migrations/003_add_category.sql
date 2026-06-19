-- Add category column to products

alter table public.products
  add column if not exists category text not null default 'כללי';

-- Assign categories to sample products (safe to re-run)
update public.products set category = 'משקאות אלכוהוליים' where name = 'בירה קורונה';
update public.products set category = 'משקאות אלכוהוליים' where name = 'וויסקי ג׳ק דניאלס';
update public.products set category = 'משקאות' where name = 'מיץ לימון';
update public.products set category = 'מזון ושירות' where name = 'קרח';
update public.products set category = 'ציוד חד פעמי' where name = 'כוסות פלסטיק';

create index if not exists products_category_idx on public.products (category);
