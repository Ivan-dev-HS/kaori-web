const { SUPABASE_URL, SUPABASE_ANON, SITE_URL } = require('./_lib/supabase');

// /sitemap.xml (reescrito a /api/sitemap en vercel.json).
// Incluye las páginas estáticas y TODAS las fichas de producto activas, para
// que Google descubra los productos aunque se carguen con JavaScript.
const PAGINAS = [
  { loc: '/',             priority: '1.0', changefreq: 'weekly'  },
  { loc: '/shop.html',    priority: '0.9', changefreq: 'daily'   },
  { loc: '/eventos.html', priority: '0.8', changefreq: 'monthly' },
  { loc: '/about.html',   priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact.html', priority: '0.5', changefreq: 'monthly' },
];

const xmlEsc = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  let productos = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=id,updated_at&active=is.true&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (r.ok) productos = await r.json();
  } catch (e) {
    console.error('sitemap productos:', e.message);
  }

  const urls = [
    ...PAGINAS.map(p => `  <url><loc>${SITE_URL}${p.loc}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`),
    ...productos.map(p => `  <url><loc>${SITE_URL}/product.html?id=${xmlEsc(p.id)}</loc>${p.updated_at ? `<lastmod>${xmlEsc(String(p.updated_at).slice(0, 10))}</lastmod>` : ''}<priority>0.8</priority></url>`),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
};
