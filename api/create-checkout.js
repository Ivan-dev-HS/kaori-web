const Stripe = require('stripe');
const { rpc, jwtDeRequest, SITE_URL } = require('./_lib/supabase');

// Crea el pedido y, si se paga con tarjeta, la sesión de Stripe.
//
// El navegador SOLO envía: id de producto, aroma y cantidad + datos de envío.
// Precios, gastos de envío y total se calculan en la base de datos
// (función crear_pedido), así que no se pueden manipular desde el cliente.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const body    = req.body && typeof req.body === 'object' ? req.body : {};
  const pago    = body.pago === 'transfer' ? 'transfer' : 'stripe';
  const envio   = body.envio === 'pickup' ? 'pickup' : 'standard';
  const cliente = body.cliente && typeof body.cliente === 'object' ? body.cliente : {};
  const items   = Array.isArray(body.items) ? body.items.slice(0, 50).map(i => ({
    product_id: String((i && i.product_id) || ''),
    variante:   i && i.variante ? String(i.variante).slice(0, 120) : null,
    quantity:   Number.parseInt(i && i.quantity, 10),
  })) : [];

  if (!items.length) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (pago === 'stripe' && !stripeKey) {
    console.error('STRIPE_SECRET_KEY no configurada');
    return res.status(503).json({ error: 'El pago con tarjeta no está disponible ahora mismo. Prueba con transferencia o inténtalo más tarde.' });
  }

  // 1 — Crear el pedido (precios calculados en servidor)
  const args = {
    p_items:   items,
    p_cliente: {
      nombre:    cliente.nombre,
      email:     cliente.email,
      telefono:  cliente.telefono,
      direccion: cliente.direccion,
      ciudad:    cliente.ciudad,
      cp:        cliente.cp,
      notas:     cliente.notas,
    },
    p_envio: envio,
    p_pago:  pago,
  };

  let pedido;
  try {
    const jwt = jwtDeRequest(req);
    try {
      pedido = await rpc('crear_pedido', args, { jwt });
    } catch (e) {
      // Sesión caducada/no válida: se crea el pedido como invitado en vez de fallar.
      if (jwt && e.status === 401) pedido = await rpc('crear_pedido', args);
      else throw e;
    }
  } catch (e) {
    if (e.publico) return res.status(400).json({ error: e.message });
    console.error('crear_pedido:', e.status, e.code, e.message);
    return res.status(500).json({ error: 'No se pudo registrar el pedido. Inténtalo de nuevo.' });
  }

  // 2 — Transferencia: listo
  if (pago === 'transfer') {
    return res.status(200).json({ orderId: pedido.id, total: pedido.total });
  }

  // 3 — Tarjeta: sesión de Stripe con los importes del pedido guardado
  try {
    const stripe = new Stripe(stripeKey);

    const lineItems = pedido.items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name:   item.product_name,
          images: item.image && /^https:\/\//.test(item.image) ? [item.image] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    if (Number(pedido.shipping_cost) > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Envío a domicilio' },
          unit_amount: Math.round(Number(pedido.shipping_cost) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items:           lineItems,
      customer_email:       pedido.email,
      client_reference_id:  pedido.id,
      locale:               'es',
      success_url:          `${SITE_URL}/gracias.html?order_id=${pedido.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${SITE_URL}/checkout.html?cancelado=1`,
      metadata:             { order_id: pedido.id },
      payment_intent_data:  { metadata: { order_id: pedido.id } },
    }, { idempotencyKey: `checkout-${pedido.id}` });

    return res.status(200).json({ url: session.url, orderId: pedido.id });
  } catch (e) {
    console.error('Stripe error:', e.type, e.code, e.message);
    return res.status(502).json({ error: 'No se pudo conectar con la pasarela de pago. Inténtalo de nuevo en unos minutos.' });
  }
};
