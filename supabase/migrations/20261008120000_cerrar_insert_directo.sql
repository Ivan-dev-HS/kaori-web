-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ APLICAR SOLO DESPUÉS de desplegar en producción el checkout por servidor
-- (api/create-checkout.js que llama a crear_pedido). Si se aplica antes, el
-- checkout antiguo deja de poder crear pedidos.
--
-- Qué hace: elimina la posibilidad de insertar pedidos directamente desde el
-- navegador. A partir de aquí la única vía es public.crear_pedido(), que
-- calcula precios, envío y total en la base de datos.
-- También limpia permisos y policies duplicadas que se dejaron para no romper
-- el código antiguo.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists pedidos_insert on public.pedidos;
revoke insert on public.pedidos from anon, authenticated;
revoke select, update, delete on public.pedidos from anon;
revoke truncate, references, trigger on public.pedidos, public.productos, public.profiles from anon, authenticated;
revoke insert, update, delete on public.productos from anon;

-- profiles: solo columnas de datos personales editables (el rol nunca).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant insert (id, email, nombre, apellidos, telefono, ciudad, direccion, cp, provincia)
  on public.profiles to authenticated;
grant update (email, nombre, apellidos, telefono, ciudad, direccion, cp, provincia)
  on public.profiles to authenticated;

-- policies duplicadas (mismo efecto que la que se queda)
drop policy if exists "Allow public read"  on public.productos;
drop policy if exists "Usuario ve su perfil" on public.profiles;

-- funciones que no deben llamarse por /rpc
revoke execute on function public.handle_new_user()        from public, anon, authenticated;
revoke execute on function public.marcar_pedido_pagado(uuid, text, bigint) from public, anon, authenticated;
revoke execute on function public.descontar_stock_pedido() from public, anon, authenticated;
revoke execute on function public.profiles_proteger_rol()  from public, anon, authenticated;

-- newsletter / solicitudes: anon solo puede insertar
revoke select, update, delete, truncate, references, trigger on public.newsletter, public.solicitudes from anon;
