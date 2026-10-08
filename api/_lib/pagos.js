const { rpc, UUID_RE } = require('./supabase');

// Marca el pedido como pagado a partir de una Checkout Session de Stripe ya
// verificada (venga del webhook o de stripe.checkout.sessions.retrieve).
// La función SQL comprueba además que el importe cobrado = total del pedido.
async function registrarPagoDeSesion(session) {
  const orderId = (session.metadata && session.metadata.order_id) || session.client_reference_id;
  if (!orderId || !UUID_RE.test(orderId)) return { ok: false, motivo: 'sin_order_id' };
  if (session.payment_status !== 'paid') return { ok: false, motivo: 'no_pagado' };

  const r = await rpc('marcar_pedido_pagado', {
    p_id:          orderId,
    p_session_id:  session.id,
    p_importe_cts: session.amount_total,
  }, { service: true });

  if (!r || !r.ok) console.error('marcar_pedido_pagado rechazado', orderId, r);
  return r;
}

module.exports = { registrarPagoDeSesion };
