const Stripe = require('stripe');
const { rpc, UUID_RE } = require('./_lib/supabase');
const { registrarPagoDeSesion } = require('./_lib/pagos');

// GET /api/order-status?order_id=...&session_id=...
// Lo usa gracias.html. Si viene de Stripe, confirma el pago consultando a
// Stripe directamente (por si el webhook aún no ha llegado) y devuelve un
// resumen del pedido SIN datos personales.
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const orderId   = String(req.query.order_id || '');
  const sessionId = String(req.query.session_id || '');
  if (!UUID_RE.test(orderId)) return res.status(400).json({ error: 'Pedido no válido' });

  if (/^cs_[A-Za-z0-9_]+$/.test(sessionId) && process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const session = await new Stripe(process.env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(sessionId);
      const sessionOrder = (session.metadata && session.metadata.order_id) || session.client_reference_id;
      if (sessionOrder === orderId) await registrarPagoDeSesion(session);
    } catch (e) {
      console.error('Confirmación de pago:', e.message);
    }
  }

  try {
    const resumen = await rpc('pedido_resumen', { p_id: orderId });
    if (!resumen) return res.status(404).json({ error: 'Pedido no encontrado' });
    return res.status(200).json(resumen);
  } catch (e) {
    console.error('pedido_resumen:', e.message);
    return res.status(500).json({ error: 'No se pudo cargar el pedido' });
  }
};
