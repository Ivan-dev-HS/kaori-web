// auth.js
// ─────────────────────────────────────────────────────────────────────────────

// ─── REGISTRO ────────────────────────────────────────────────────────────────
async function registrarUsuario(email, password) {
  try {
    const { data, error } = await db.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        emailRedirectTo: 'https://kaori.es/login.html'
      }
    });

    if (error) {
      return { ok: false, mensaje: traducirError(error.message) };
    }

    return { ok: true, usuario: data.user };
  } catch (e) {
    return { ok: false, mensaje: 'Error de conexión con Supabase.' };
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function iniciarSesion(email, password) {
  try {
    const { data, error } = await db.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password: password,
    });
    if (error) return { ok: false, mensaje: traducirError(error.message) };
    return { ok: true, usuario: data.user, sesion: data.session };
  } catch(e) {
    return { ok: false, mensaje: 'Error de conexión con Supabase.' };
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function cerrarSesion() {
  try {
    await db.auth.signOut();
    localStorage.removeItem('kaori_rol');
    return { ok: true };
  } catch(e) {
    return { ok: false };
  }
}

// ─── SESIÓN ACTUAL ────────────────────────────────────────────────────────────
async function obtenerSesion() {
  try {
    const { data } = await db.auth.getSession();
    return data.session || null;
  } catch(e) {
    return null;
  }
}

// ─── USUARIO ACTUAL ───────────────────────────────────────────────────────────
async function obtenerUsuario() {
  try {
    const { data } = await db.auth.getUser();
    return data.user || null;
  } catch(e) {
    return null;
  }
}

// ─── ROL DEL USUARIO ─────────────────────────────────────────────────────────
async function obtenerRol() {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return null;

    const { data, error } = await db
      .from('profiles')
      .select('role')
      .eq('id', usuario.id)
      .single();

    if (error || !data) return null;

    localStorage.setItem('kaori_rol', data.role);
    return data.role;
  } catch(e) {
    return null;
  }
}

// ─── PROTECCIÓN DE PÁGINA ─────────────────────────────────────────────────────
// FIX: añadido timeout de 5 segundos para evitar carga infinita
async function protegerPagina(rolRequerido = null) {
  try {
    // Timeout de 5 segundos — si Supabase no responde, redirige al login
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );

    const sesionPromise = obtenerSesion();
    const sesion = await Promise.race([sesionPromise, timeoutPromise]);

    // Sin sesión → login
    if (!sesion) {
      window.location.href = 'login.html';
      return null;
    }

    // Con sesión → obtener rol
    const rol = await obtenerRol();

    // Si se requiere rol específico y no coincide → acceso denegado
    if (rolRequerido && rol !== rolRequerido) {
      window.location.href = 'acceso-denegado.html';
      return null;
    }

    return rol;

  } catch(e) {
    // Timeout u otro error → redirigir al login
    console.warn('protegerPagina error:', e.message);
    window.location.href = 'login.html';
    return null;
  }
}

// ─── ESCUCHAR CAMBIOS DE SESIÓN ───────────────────────────────────────────────
try {
  db.auth.onAuthStateChange(async (evento, sesion) => {
    if (evento === 'SIGNED_OUT') {
      localStorage.removeItem('kaori_rol');
    }
  });
} catch(e) {
  console.warn('onAuthStateChange no disponible:', e.message);
}

// ─── TRADUCCIÓN DE ERRORES ────────────────────────────────────────────────────
function traducirError(mensaje) {
  const errores = {
    'Invalid login credentials':     'Email o contraseña incorrectos.',
    'Email not confirmed':            'Confirma tu email antes de entrar.',
    'User already registered':        'Este email ya está registrado.',
    'Password should be at least 6':  'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email':       'El formato del email no es válido.',
    'Email rate limit exceeded':      'Demasiados intentos. Espera unos minutos.',
    'Invalid email':                  'El email no es válido.',
  };
  for (const [clave, traduccion] of Object.entries(errores)) {
    if (mensaje.includes(clave)) return traduccion;
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}
