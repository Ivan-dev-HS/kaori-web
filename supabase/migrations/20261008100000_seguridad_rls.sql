-- ════════════════════════════════════════════════════════════════════════════
-- Endurecimiento de seguridad (auditoría 2026-10-08) — YA APLICADA en producción
--
-- Compatible con el código que hay ahora en producción: no rompe el checkout,
-- el panel admin ni "Mi cuenta". Se usa ALTER POLICY en vez de DROP+CREATE
-- para no borrar nada. La retirada del INSERT directo en `pedidos` va en
-- 20261008120000, que se aplica DESPUÉS de desplegar el checkout por servidor.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. PROFILES: impedir que un cliente se haga admin ──────────────────────
-- Antes: policy UPDATE "auth.uid() = id" + GRANT UPDATE en todas las columnas
-- ⇒ cualquier cliente podía hacer `update profiles set role='admin'` sobre su
-- propia fila desde la consola del navegador (verificado y revertido).
create or replace function public.profiles_proteger_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role is distinct from 'client' then
      raise exception 'No autorizado a asignar el rol';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'No autorizado a cambiar el rol';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_proteger_rol
  before insert or update on public.profiles
  for each row execute function public.profiles_proteger_rol();

alter policy "Usuario ve su perfil" on public.profiles
  to authenticated using (id = (select auth.uid()));
alter policy profiles_select on public.profiles
  to authenticated using (id = (select auth.uid()) or (select public.get_my_role()) = 'admin');
alter policy "Usuario inserta su perfil" on public.profiles
  to authenticated with check (id = (select auth.uid()) and role = 'client');
alter policy "Usuario actualiza su perfil" on public.profiles
  to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ─── 2. PRODUCTOS: ocultos solo visibles para admin; escritura solo admin ───
alter policy "Allow public read" on public.productos
  to anon, authenticated using (active is not false or (select public.get_my_role()) = 'admin');
alter policy productos_select on public.productos
  to anon, authenticated using (active is not false or (select public.get_my_role()) = 'admin');
alter policy productos_insert on public.productos
  to authenticated with check ((select public.get_my_role()) = 'admin');
alter policy productos_update on public.productos
  to authenticated using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');
alter policy productos_delete on public.productos
  to authenticated using ((select public.get_my_role()) = 'admin');

alter table public.productos
  add constraint productos_compare_price_check check (compare_price is null or compare_price > 0);

-- ─── 3. PEDIDOS ─────────────────────────────────────────────────────────────
-- Estado del pago separado del estado de preparación: paid_at no nulo = cobrado.
alter table public.pedidos add column if not exists stripe_session_id text;
alter table public.pedidos add column if not exists paid_at timestamptz;

alter policy pedidos_select on public.pedidos
  to authenticated using (user_id = (select auth.uid()) or (select public.get_my_role()) = 'admin');
alter policy pedidos_update on public.pedidos
  to authenticated using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');
alter policy pedidos_delete on public.pedidos
  to authenticated using ((select public.get_my_role()) = 'admin');

-- TEMPORAL hasta desplegar el checkout por servidor: se mantiene el INSERT
-- directo que usa el código antiguo, pero ya no se puede crear un pedido
-- marcado como pagado, a nombre de otro usuario ni con HTML (vector de XSS
-- almacenado contra el panel admin).
alter policy pedidos_insert on public.pedidos to anon, authenticated with check (
  status = 'pending'
  and (user_id is null or user_id = (select auth.uid()))
  and stripe_session_id is null and paid_at is null
  and concat_ws(' ', customer_name, customer_email, customer_phone, shipping_address,
                shipping_city, shipping_postal_code, notes, items::text) !~ '[<>]'
);

alter table public.pedidos
  add constraint pedidos_importes_check check (subtotal >= 0 and shipping_cost >= 0 and total >= 0);

create index if not exists pedidos_user_id_idx       on public.pedidos (user_id);
create index if not exists pedidos_created_at_idx    on public.pedidos (created_at desc);
create index if not exists pedidos_email_created_idx on public.pedidos (customer_email, created_at desc);

-- ─── 4. STORAGE: solo admin puede subir / borrar imágenes ───────────────────
-- Antes cualquier usuario registrado podía subir o BORRAR fotos de productos.
alter policy storage_insert on storage.objects
  to authenticated with check (bucket_id = 'productos' and (select public.get_my_role()) = 'admin');
alter policy storage_delete on storage.objects
  to authenticated using (bucket_id = 'productos' and (select public.get_my_role()) = 'admin');

-- ─── 5. FUNCIONES ───────────────────────────────────────────────────────────
alter function public.handle_updated_at() set search_path = '';
