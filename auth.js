// auth.js
// Todas las funciones de autenticación centralizadas aquí.
// Este archivo depende de supabase.js — inclúyelo DESPUÉS en el HTML.

// ─── REGISTRO ────────────────────────────────────────────────────────────────
async function registrarUsuario(email, password) {
  const { data, error } = await db.auth.signUp({
    email:    email.trim().toLowerCase(),
    password: password,
  });

  if (error) return { ok: false, mensaje: traducirError(error.message) };
  return { ok: true, usuario: data.user };
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function iniciarSesion(email, password) {
  const { data, error } = await db.auth.signInWithPassword({
    email:    email.trim().toLowerCase(),
    password: password,
  });

  if (error) return { ok: false, mensaje: traducirError(error.message) };
  return { ok: true, usuario: data.user, sesion: data.session };
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function cerrarSesion() {
  const { error } = await db.auth.signOut();
  if (error) return { ok: false };
  localStorage.removeItem('kaori_rol');
  return { ok: true };
}

// ─── SESIÓN ACTUAL ────────────────────────────────────────────────────────────
async function obtenerSesion() {
  const { data } = await db.auth.getSession();
  return data.session || null;
}

// ─── USUARIO ACTUAL ───────────────────────────────────────────────────────────
async function obtenerUsuario() {
  const { data } = await db.auth.getUser();
  return data.user || null;
}

// ─── ROL DEL USUARIO ─────────────────────────────────────────────────────────
// Siempre consulta la base de datos. Nunca confíes solo en localStorage.
async function obtenerRol() {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;

  const { data, error } = await db
    .from('profiles')
    .select('role')
    .eq('id', usuario.id)
    .single();

  if (error || !data) return null;

  // Guardamos en localStorage SOLO para caché de interfaz,
  // nunca para decisiones de seguridad real.
  localStorage.setItem('kaori_rol', data.role);
  return data.role;
}

// ─── PROTECCIÓN DE PÁGINA ─────────────────────────────────────────────────────
// Llama a esta función al inicio de cualquier página protegida.
// rolRequerido: 'admin' | 'client' | null (cualquier usuario logueado)
async function protegerPagina(rolRequerido = null) {
  const sesion = await obtenerSesion();

  // Si no hay sesión, manda al login
  if (!sesion) {
    window.location.href = '/login.html';
    return null;
  }

  const rol = await obtenerRol();

  // Si se requiere un rol específico y no coincide, acceso denegado
  if (rolRequerido && rol !== rolRequerido) {
    window.location.href = '/acceso-denegado.html';
    return null;
  }

  return rol;
}

// ─── ESCUCHAR CAMBIOS DE SESIÓN ───────────────────────────────────────────────
db.auth.onAuthStateChange(async (evento, sesion) => {
  if (evento === 'SIGNED_OUT') {
    localStorage.removeItem('kaori_rol');
  }
});

// ─── TRADUCCIÓN DE ERRORES ────────────────────────────────────────────────────
function traducirError(mensaje) {
  const errores = {
    'Invalid login credentials':    'Email o contraseña incorrectos.',
    'Email not confirmed':           'Confirma tu email antes de entrar.',
    'User already registered':       'Este email ya está registrado.',
    'Password should be at least 6': 'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email':      'El formato del email no es válido.',
    'Email rate limit exceeded':     'Demasiados intentos. Espera unos minutos.',
  };
  for (const [clave, traduccion] of Object.entries(errores)) {
    if (mensaje.includes(clave)) return traduccion;
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}
