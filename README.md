# Kaori — tienda online

Web estática (HTML + JS) desplegada en **Vercel**, con **Supabase** (auth, base de datos, imágenes) y **Stripe** (pagos con tarjeta).

```
*.html           páginas (cada una con su CSS/JS inline)
utils.js         esc() para escapar HTML, precio(), urlSegura()
supabase.js      cliente de Supabase (anon key pública)
auth.js          sesión, rol, botón "Mi cuenta", redirecciones seguras
cart.js          carrito (localStorage) + widget desplegable
api/             funciones serverless de Vercel
  create-checkout.js   crea el pedido (precios calculados en BD) y la sesión de Stripe
  stripe-webhook.js    marca pedidos como pagados (verifica la firma de Stripe)
  order-status.js      resumen del pedido para gracias.html (+ confirma el pago)
  sitemap.js           /sitemap.xml con todos los productos activos
  _lib/                helpers compartidos (no son endpoints)
supabase/migrations/   SQL aplicado en la base de datos, en orden
```

## Seguridad: reglas que no hay que romper

- **Nunca** pintar datos con `innerHTML` sin pasarlos por `esc()` (o `urlSegura()` para `src`/`href`).
- El precio de un pedido **siempre** lo calcula la función SQL `crear_pedido`; el navegador solo envía id de producto, aroma y cantidad.
- Lo que hace `auth.js` (redirigir si no eres admin…) es solo interfaz. La seguridad real son las políticas RLS de Supabase.
- La `SUPABASE_SERVICE_ROLE_KEY` solo puede vivir en variables de entorno de Vercel, nunca en el código del navegador.

## Variables de entorno en Vercel

| Variable | Para qué | Dónde se obtiene |
|---|---|---|
| `STRIPE_SECRET_KEY` | crear pagos | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | verificar el webhook | Stripe → Developers → Webhooks → (tu endpoint) → Signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | marcar pedidos como pagados | Supabase → Project Settings → API → `service_role` |
| `SITE_URL` (opcional) | URLs de vuelta de Stripe | por defecto `https://kaori.es` |

Webhook de Stripe: URL `https://kaori.es/api/stripe-webhook`, eventos
`checkout.session.completed` y `checkout.session.async_payment_succeeded`.

## Migraciones

1. `20261008100000_seguridad_rls.sql` — aplicada.
2. `20261008110000_checkout_servidor.sql` — aplicada.
3. `20261008120000_cerrar_insert_directo.sql` — **aplicar solo después** de desplegar en producción el nuevo `api/create-checkout.js` (cierra la creación de pedidos desde el navegador).

## Probar en local

`npx vercel dev` (necesita las variables de entorno de arriba en `.env.local`).
