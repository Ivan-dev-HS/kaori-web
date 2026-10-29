-- Tabla de categorías de productos, para poder activarlas/desactivarlas
-- como pestañas de filtro desde el panel admin sin tocar código.
-- (Ya aplicada en producción directamente; este archivo deja constancia
-- en el repo siguiendo la convención de supabase/migrations/.)

create table public.categorias (
  slug      text primary key check (slug ~ '^[a-z0-9_-]+$'),
  nombre    text not null check (char_length(nombre) between 1 and 60),
  emoji     text not null default '',
  activa    boolean not null default true,
  orden     int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;

create policy categorias_select on public.categorias
  for select to anon, authenticated
  using (activa is true or get_my_role() = 'admin');

create policy categorias_insert on public.categorias
  for insert to authenticated
  with check (get_my_role() = 'admin');

create policy categorias_update on public.categorias
  for update to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create policy categorias_delete on public.categorias
  for delete to authenticated
  using (get_my_role() = 'admin');

insert into public.categorias (slug, nombre, emoji, orden) values
  ('velas',        'Velas',        '🕯️', 1),
  ('minerales',    'Minerales',    '💎', 2),
  ('joyeria',      'Joyería',      '📿', 3),
  ('ambientacion', 'Ambientación', '🌸', 4),
  ('corporal',     'Corporal',     '🧴', 5),
  ('quemadores',   'Quemadores',   '🔥', 6);
