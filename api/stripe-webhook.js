const Stripe = require('stripe');
const { registrarPagoDeSesion } = require('./_lib/pagos');

// Webhook de Stripe: es la fuente de verdad de que un pedido se ha cobrado.
// Configurar en Stripe → Developers → Webhooks:
//   URL:     https://kaori.es/api/stripe-webhook
//   Eventos: checkout.session.completed, checkout.session.async_payment_succeeded
// y guardar el "Signing secret" en Vercel como STRIPE_WEBHOOK_SECRET.

// Hace falta el cuerpo tal cual llega para verificar la firma, así que se lee
// el stream sin tocar req.body (Vercel lo parsea de forma perezosa).
async function leerCuerpo(req) {
  const trozos = [];
  for await (const t of req) trozos.push(typeof t === 'string' ? Buffer.from(t) : t);
  return Buffer.concat(trozos);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const key    = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    console.error('Faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET');
    return res.status(500).end();
  }

  let event;
  try {
    const raw = await leerCuerpo(req);
    event = new Stripe(key).webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
  } catch (e) {
    console.warn('Webhook con firma no válida:', e.message);
    return res.status(400).send('Firma no válida');
  }

  try {
    if (event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded') {
      await registrarPagoDeSesion(event.data.object);
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    // 500 → Stripe reintenta automáticamente.
    console.error('Error procesando webhook:', e.message);
    return res.status(500).end();
  }
};
