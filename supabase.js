// supabase.js
// ─────────────────────────────────────────────────────────────────────────────
// La anon key es PÚBLICA y puede estar en el frontend.
// NUNCA pongas aquí la service_role key. Esa solo va en servidores.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = 'https://zlebihuuhgyebnauyyug.supabase.co'; // ← pon la tuya
const SUPABASE_ANON = 'sb_publishable_bfFW9zgf0b3_BlOOUZJ2Ng_sU5ZbitM';                      // ← pon la tuya

const { createClient } = supabase;

const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:   true,  // guarda sesión en localStorage
    autoRefreshToken: true,  // refresca el token solo, sin que el usuario lo note
  }
});
