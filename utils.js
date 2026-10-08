// utils.js — utilidades compartidas por todas las páginas.

// Escapa texto para meterlo en HTML (contenido o atributos). Cualquier dato que
// venga de la base de datos, del carrito o de la URL debe pasar por aquí antes
// de ir a innerHTML: evita que un nombre como <img onerror=...> ejecute código.
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"'`]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;',
  }[c]));
}

// Solo deja pasar URLs http(s) o rutas relativas (para src/href dinámicos).
function urlSegura(url) {
  const u = String(url ?? '').trim();
  return /^(https?:\/\/|\/(?!\/)|[\w.-]+\.html)/i.test(u) ? esc(u) : '';
}

function precio(n) {
  return Number(n || 0).toFixed(2).replace('.', ',') + ' €';
}

const IMG_FALLBACK = 'https://images.unsplash.com/photo-1602178478026-72d94a3e8e3f?w=400&q=70';
