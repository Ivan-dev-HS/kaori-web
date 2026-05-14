const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  // ── DIAGNÓSTICO TEMPORAL ──
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(500).json({
      error: 'Variable STRIPE_SECRET_KEY no encontrada',
      env_keys: Object.keys(process.env).filter(k => k.includes('STRIPE'))
    });
  }
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://kaori.es');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const stripe = new Stripe(key);
    const { items, customerEmail, customerName, shippingCost, orderId } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name:   item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (shippingCost && shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: '🚚 Envío a domicilio' },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           lineItems,
      mode:                 'payment',
      customer_email:       customerEmail || undefined,
      success_url:          `https://kaori.es/gracias.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId || ''}`,
      cancel_url:           `https://kaori.es/checkout.html`,
      locale:               'es',
      metadata: {
        customer_name: customerName || '',
        order_id:      orderId      || '',
      },
    });

    return res.status(200).json({ url: session.url });

  } catch(e) {
    console.error('Stripe error:', e);
    return res.status(500).json({ error: e.message });
  }
};