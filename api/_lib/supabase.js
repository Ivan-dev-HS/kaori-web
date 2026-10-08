// Helpers de servidor para hablar con Supabase por REST (sin dependencias).
// Los archivos de api/_lib no se publican como endpoints (prefijo "_").

// URL y anon key son públicas (las mismas que usa el navegador en supabase.js).
const SUPABASE_URL  = process.env.SUPABASE_URL || 'https://zlebihuuhgyebnauyyug.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZWJpaHV1aGd5ZWJuYXV5eXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjU1NDgsImV4cCI6MjA5MjMwMTU0OH0.k9HDP5e5rdQN7KP9bRPgiZZIzwsKRwtSeZE_qMpyl3I';

const SITE_URL = (process.env.SITE_URL || 'https://kaori.es').replace(/\/$/, '');

class RpcError extends Error {
  constructor(message, { status, code, publico } = {}) {
    super(message);
    this.status  = status;
    this.code    = code;
    // true cuando el mensaje lo escribimos nosotros en la función SQL y se
    // puede enseñar al cliente tal cual.
    this.publico = publico;
  }
}

// Llama a una función RPC.
//  - jwt: token del usuario (para que auth.uid() funcione) o null para anónimo.
//  - service: true para usar la service role key (solo funciones de servidor).
async function rpc(nombre, args, { jwt = null, service = false } = {}) {
  let apiKey = SUPABASE_ANON;
  let bearer = jwt || SUPABASE_ANON;
  if (service) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new RpcError('SUPABASE_SERVICE_ROLE_KEY no configurada', { status: 500 });
    apiKey = key;
    bearer = key;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      apikey:          apiKey,
      Authorization:   `Bearer ${bearer}`,
    },
    body: JSON.stringify(args),
  });

  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }

  if (!res.ok) {
    // P0001 = "raise exception" de nuestras funciones → mensaje pensado para el cliente.
    const code = datos && datos.code;
    throw new RpcError((datos && datos.message) || `Error ${res.status}`, {
      status:  res.status,
      code,
      publico: code === 'P0001',
    });
  }
  return datos;
}

// Extrae el JWT del usuario de la cabecera Authorization (si viene).
function jwtDeRequest(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(h);
  return m ? m[1] : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = { rpc, jwtDeRequest, RpcError, SITE_URL, SUPABASE_URL, SUPABASE_ANON, UUID_RE };
