-- ════════════════════════════════════════════════════════════════════════════
-- Checkout calculado en servidor, confirmación de pago, stock, newsletter y
-- solicitudes de contacto/eventos. Solo añade objetos: no cambia nada que use
-- el código actual.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── crear_pedido ───────────────────────────────────────────────────────────
-- Única forma (tras la migración 20261008120000) de crear un pedido. El precio,
-- el envío y el total se calculan aquí a partir de `productos`; del navegador
-- solo se aceptan: id de producto, aroma (variante) y cantidad.
create or replace function public.crear_pedido(
  p_items   jsonb,
  p_cliente jsonb,
  p_envio   text,
  p_pago    text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_envio_estandar   constant numeric := 4.95;
  c_envio_gratis_min constant numeric := 50;

  v_nombre text := btrim(coalesce(p_cliente->>'nombre', ''));
  v_email  text := lower(btrim(coalesce(p_cliente->>'email', '')));
  v_tel    text := btrim(coalesce(p_cliente->>'telefono', ''));
  v_dir    text := btrim(coalesce(p_cliente->>'direccion', ''));
  v_ciudad text := btrim(coalesce(p_cliente->>'ciudad', ''));
  v_cp     text := btrim(coalesce(p_cliente->>'cp', ''));
  v_notas  text := btrim(coalesce(p_cliente->>'notas', ''));

  v_item     jsonb;
  v_pid      text;
  v_qty_txt  text;
  v_qty      int;
  v_variante text;
  v_prod     record;
  v_var      jsonb;
  v_stock    numeric;
  v_precio   numeric;
  v_nombre_l text;
  v_imagen   text;
  v_lineas   jsonb   := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_envio    numeric;
  v_total    numeric;
  v_id       uuid;
begin
  if p_envio is null or p_envio not in ('standard', 'pickup') then
    raise exception 'Método de envío no válido';
  end if;
  if p_pago is null or p_pago not in ('stripe', 'transfer') then
    raise exception 'Método de pago no válido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Demasiados productos en el carrito';
  end if;

  if char_length(v_nombre) < 2 or char_length(v_nombre) > 120 then
    raise exception 'Introduce tu nombre completo';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$' then
    raise exception 'El email no es válido';
  end if;
  if char_length(v_tel) < 6 or char_length(v_tel) > 30 or v_tel !~ '^[0-9+()\s.-]+$' then
    raise exception 'El teléfono no es válido';
  end if;
  if p_envio = 'standard' and (v_dir = '' or v_ciudad = '' or v_cp = '') then
    raise exception 'Completa la dirección de envío';
  end if;
  if char_length(v_dir) > 300 or char_length(v_ciudad) > 120 or char_length(v_cp) > 12
     or char_length(v_notas) > 1000
     or concat_ws(' ', v_nombre, v_dir, v_ciudad, v_cp, v_notas) ~ '[<>]' then
    raise exception 'Hay datos de envío no válidos';
  end if;

  -- Freno básico anti-spam: máx. 5 pedidos por email cada 10 minutos.
  if (select count(*) from public.pedidos
      where customer_email = v_email and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Has hecho varios pedidos seguidos. Espera unos minutos e inténtalo de nuevo.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_pid      := v_item->>'product_id';
    v_qty_txt  := v_item->>'quantity';
    v_variante := nullif(btrim(coalesce(v_item->>'variante', '')), '');

    if v_pid is null or v_pid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Hay un producto no válido en el carrito';
    end if;
    if v_qty_txt is null or v_qty_txt !~ '^[0-9]{1,3}$' then
      raise exception 'Cantidad no válida';
    end if;
    v_qty := v_qty_txt::int;
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Cantidad no válida';
    end if;

    select id, name, price, image, variantes, active
      into v_prod
      from public.productos
     where id = v_pid::uuid;
    if not found or v_prod.active is false then
      raise exception 'Un producto de tu carrito ya no está disponible. Revisa el carrito.';
    end if;

    v_precio   := v_prod.price;
    v_nombre_l := v_prod.name;
    v_imagen   := v_prod.image;

    if exists (select 1 from jsonb_array_elements(coalesce(v_prod.variantes, '[]'::jsonb)) e
               where coalesce(e->>'nombre', '') <> '') then
      if v_variante is null then
        raise exception 'Elige un aroma para "%"', v_prod.name;
      end if;
      select e into v_var
        from jsonb_array_elements(v_prod.variantes) e
       where e->>'nombre' = v_variante
       limit 1;
      if v_var is null then
        raise exception 'El aroma "%" de "%" ya no está disponible', v_variante, v_prod.name;
      end if;
      if coalesce(v_var->>'precio', '') ~ '^[0-9]+(\.[0-9]+)?$' and (v_var->>'precio')::numeric > 0 then
        v_precio := (v_var->>'precio')::numeric;
      end if;
      if coalesce(v_var->>'stock', '') ~ '^-?[0-9]+$' then
        v_stock := (v_var->>'stock')::numeric;
        if v_stock < v_qty then
          raise exception 'No queda stock suficiente de "% – %"', v_prod.name, v_variante;
        end if;
      end if;
      v_nombre_l := v_prod.name || ' – ' || v_variante;
      if coalesce(v_var->>'imagen', '') <> '' then
        v_imagen := v_var->>'imagen';
      end if;
    else
      v_variante := null;
    end if;

    v_lineas := v_lineas || jsonb_build_object(
      'product_id',   v_prod.id,
      'variante',     v_variante,
      'product_name', v_nombre_l,
      'quantity',     v_qty,
      'price',        v_precio,
      'image',        v_imagen
    );
    v_subtotal := v_subtotal + v_precio * v_qty;
  end loop;

  v_envio := case
    when p_envio = 'pickup'               then 0
    when v_subtotal >= c_envio_gratis_min then 0
    else c_envio_estandar
  end;
  v_total := v_subtotal + v_envio;

  insert into public.pedidos (
    customer_name, customer_email, customer_phone,
    shipping_address, shipping_city, shipping_postal_code, notes,
    items, subtotal, shipping_cost, total,
    shipping_type, payment_method, status, user_id
  ) values (
    v_nombre, v_email, v_tel,
    nullif(v_dir, ''), nullif(v_ciudad, ''), nullif(v_cp, ''), v_notas,
    v_lineas, v_subtotal, v_envio, v_total,
    p_envio, p_pago, 'pending', auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object(
    'id',            v_id,
    'items',         v_lineas,
    'subtotal',      v_subtotal,
    'shipping_cost', v_envio,
    'total',         v_total,
    'email',         v_email,
    'nombre',        v_nombre
  );
end;
$$;

grant execute on function public.crear_pedido(jsonb, jsonb, text, text) to anon, authenticated;

-- ─── pedido_resumen ─────────────────────────────────────────────────────────
-- Resumen SIN datos personales para la página de "gracias". El id (UUID v4) no
-- se puede adivinar, funciona como enlace de recibo.
create or replace function public.pedido_resumen(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',             p.id,
    'created_at',     p.created_at,
    'status',         p.status,
    'pagado',         p.paid_at is not null,
    'payment_method', p.payment_method,
    'shipping_type',  p.shipping_type,
    'subtotal',       p.subtotal,
    'shipping_cost',  p.shipping_cost,
    'total',          p.total,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_name', i->>'product_name',
               'quantity',     i->'quantity',
               'price',        i->'price',
               'image',        i->>'image'))
        from jsonb_array_elements(p.items) i), '[]'::jsonb)
  )
  from public.pedidos p
  where p.id = p_id;
$$;

grant execute on function public.pedido_resumen(uuid) to anon, authenticated;

-- ─── marcar_pedido_pagado ───────────────────────────────────────────────────
-- Solo la usa el servidor (webhook de Stripe / confirmación) con la service
-- role key. Comprueba que el importe cobrado coincide con el total del pedido.
create or replace function public.marcar_pedido_pagado(
  p_id          uuid,
  p_session_id  text,
  p_importe_cts bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'No autorizado';
  end if;

  select * into v_pedido from public.pedidos where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'pedido_no_encontrado');
  end if;
  if v_pedido.paid_at is not null then
    return jsonb_build_object('ok', true, 'ya_pagado', true);
  end if;
  if round(v_pedido.total * 100) <> p_importe_cts then
    return jsonb_build_object('ok', false, 'motivo', 'importe_no_coincide');
  end if;

  update public.pedidos
     set paid_at = now(),
         stripe_session_id = p_session_id
   where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Stock: se descuenta cuando el pedido pasa a pagado ─────────────────────
-- Funciona igual si lo marca Stripe o si la admin marca una transferencia como
-- cobrada. Solo afecta a aromas/variantes con stock numérico.
create or replace function public.descontar_stock_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
begin
  if old.paid_at is null and new.paid_at is not null then
    for v_item in select value from jsonb_array_elements(new.items) loop
      if coalesce(v_item->>'variante', '') <> ''
         and coalesce(v_item->>'product_id', '') ~* '^[0-9a-f-]{36}$' then
        update public.productos p
           set variantes = (
             select jsonb_agg(
                      case
                        when e->>'nombre' = v_item->>'variante'
                             and coalesce(e->>'stock', '') ~ '^-?[0-9]+$'
                        then jsonb_set(e, '{stock}',
                               to_jsonb(greatest(0, (e->>'stock')::int - (v_item->>'quantity')::int)))
                        else e
                      end
                      order by ord)
               from jsonb_array_elements(p.variantes) with ordinality as t(e, ord)
           )
         where p.id = (v_item->>'product_id')::uuid
           and jsonb_typeof(p.variantes) = 'array'
           and jsonb_array_length(p.variantes) > 0;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger pedidos_descontar_stock
  after update of paid_at on public.pedidos
  for each row execute function public.descontar_stock_pedido();

-- ─── Newsletter ─────────────────────────────────────────────────────────────
create table if not exists public.newsletter (
  id         bigint generated always as identity primary key,
  email      text not null,
  origen     text,
  created_at timestamptz not null default now(),
  constraint newsletter_email_check
    check (char_length(email) <= 254 and email ~* '^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$'),
  constraint newsletter_origen_check check (origen is null or char_length(origen) <= 40)
);
create unique index if not exists newsletter_email_unq on public.newsletter (lower(email));
alter table public.newsletter enable row level security;

create policy newsletter_insert on public.newsletter
  for insert to anon, authenticated with check (true);
create policy newsletter_admin_select on public.newsletter
  for select to authenticated using ((select public.get_my_role()) = 'admin');
create policy newsletter_admin_delete on public.newsletter
  for delete to authenticated using ((select public.get_my_role()) = 'admin');

-- ─── Solicitudes (contacto y bodas/eventos) ────────────────────────────────
create table if not exists public.solicitudes (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo       text not null check (tipo in ('contacto', 'evento')),
  nombre     text not null check (char_length(nombre) between 2 and 120),
  email      text not null check (char_length(email) <= 254 and email ~* '^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$'),
  telefono   text check (telefono is null or char_length(telefono) <= 40),
  asunto     text check (asunto is null or char_length(asunto) <= 160),
  mensaje    text not null check (char_length(mensaje) between 1 and 5000),
  datos      jsonb not null default '{}'::jsonb check (pg_column_size(datos) < 4000),
  estado     text not null default 'nueva' check (estado in ('nueva', 'respondida', 'archivada'))
);
create index if not exists solicitudes_created_at_idx on public.solicitudes (created_at desc);
alter table public.solicitudes enable row level security;

-- Cuenta solicitudes recientes de un email (security definer: anon no puede
-- leer la tabla, así que una subconsulta normal en la policy siempre daría 0).
create or replace function public.solicitudes_recientes(p_email text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.solicitudes
   where lower(email) = lower(p_email) and created_at > now() - interval '10 minutes';
$$;

create policy solicitudes_insert on public.solicitudes
  for insert to anon, authenticated
  with check (
    estado = 'nueva'
    and public.solicitudes_recientes(email) < 3   -- máx. 3 cada 10 min por email
  );
create policy solicitudes_admin_select on public.solicitudes
  for select to authenticated using ((select public.get_my_role()) = 'admin');
create policy solicitudes_admin_update on public.solicitudes
  for update to authenticated
  using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');
create policy solicitudes_admin_delete on public.solicitudes
  for delete to authenticated using ((select public.get_my_role()) = 'admin');

-- ─── Realtime para el panel admin ───────────────────────────────────────────
-- El panel ya se suscribía a cambios en pedidos/productos, pero las tablas no
-- estaban publicadas, así que nunca llegaba ningún aviso. Realtime respeta RLS:
-- solo la admin (o el propio cliente) recibe cada fila.
alter publication supabase_realtime add table public.pedidos, public.productos;
