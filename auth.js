// auth.js — sesión, rol y utilidades de autenticación.
// Ojo: lo que se comprueba aquí es solo para la interfaz (redirecciones, menús).
// La seguridad real la imponen las políticas RLS de Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// ─── REGISTRO ────────────────────────────────────────────────────────────────
async function registrarUsuario(email, password) {
  try {
    const { data, error } = await db.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: location.origin + '/login.html' },
    });
    if (error) return { ok: false, mensaje: traducirError(error.message) };
    return { ok: true, usuario: data.user };
  } catch (e) {
    return { ok: false, mensaje: 'Error de conexión. Inténtalo de nuevo.' };
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function iniciarSesion(email, password) {
  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, mensaje: traducirError(error.message) };
    return { ok: true, usuario: data.user, sesion: data.session };
  } catch (e) {
    return { ok: false, mensaje: 'Error de conexión. Inténtalo de nuevo.' };
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
async function cerrarSesion() {
  try {
    await db.auth.signOut();
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

// ─── SESIÓN / USUARIO ─────────────────────────────────────────────────────────
// getSession lee la sesión guardada (sin red); getUser la valida con Supabase.
async function obtenerSesion() {
  try {
    const { data } = await db.auth.getSession();
    return data.session || null;
  } catch (e) {
    return null;
  }
}

async function obtenerUsuario() {
  try {
    const { data } = await db.auth.getUser();
    return data.user || null;
  } catch (e) {
    return null;
  }
}

// ─── ROL DEL USUARIO ─────────────────────────────────────────────────────────
async function obtenerRol(sesion = null) {
  try {
    const s = sesion || await obtenerSesion();
    if (!s) return null;
    const { data, error } = await db
      .from('profiles')
      .select('role')
      .eq('id', s.user.id)
      .single();
    if (error || !data) return null;
    return data.role;
  } catch (e) {
    return null;
  }
}

// ─── PROTECCIÓN DE PÁGINA ─────────────────────────────────────────────────────
// Con timeout de 5 s para no dejar la página cargando si Supabase no responde.
async function protegerPagina(rolRequerido = null) {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    const usuario = await Promise.race([obtenerUsuario(), timeout]);

    if (!usuario) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname);
      return null;
    }

    const rol = await obtenerRol();
    if (rolRequerido && rol !== rolRequerido) {
      window.location.href = 'acceso-denegado.html';
      return null;
    }
    return rol;
  } catch (e) {
    window.location.href = 'login.html';
    return null;
  }
}

// ─── BOTÓN "MI CUENTA" DEL MENÚ ───────────────────────────────────────────────
// Cambia el enlace a "Panel Admin" o "Mi cuenta" según la sesión.
async function actualizarBotonCuenta() {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return null;
    const rol  = await obtenerRol(sesion);
    const href = rol === 'admin' ? 'admin.html' : 'mi-cuenta.html';
    const txt  = rol === 'admin' ? '👑 Panel Admin' : 'Mi cuenta';
    ['btnCuenta', 'mobileLoginBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.href = href; el.textContent = txt; }
    });
    return rol;
  } catch (e) {
    return null;
  }
}

// ─── REDIRECCIÓN SEGURA ───────────────────────────────────────────────────────
// Solo permite volver a páginas de esta misma web (evita "open redirect":
// login.html?redirect=https://web-falsa.com).
function rutaInternaSegura(destino) {
  if (!destino) return null;
  try {
    const url = new URL(destino, location.origin);
    if (url.origin !== location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch (e) {
    return null;
  }
}

// ─── TRADUCCIÓN DE ERRORES ────────────────────────────────────────────────────
function traducirError(mensaje) {
  const errores = {
    'Invalid login credentials':    'Email o contraseña incorrectos.',
    'Email not confirmed':          'Confirma tu email antes de entrar.',
    'User already registered':      'Ya existe una cuenta con ese email.',
    'Password should be at least':  'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email':     'El formato del email no es válido.',
    'rate limit':                   'Demasiados intentos. Espera unos minutos.',
    'Invalid email':                'El email no es válido.',
    'should be different':          'La nueva contraseña debe ser distinta de la anterior.',
    'weak':                         'La contraseña es demasiado débil. Usa una más larga.',
    'pwned':                        'Esa contraseña aparece en filtraciones públicas. Elige otra.',
  };
  for (const [clave, traduccion] of Object.entries(errores)) {
    if (String(mensaje).toLowerCase().includes(clave.toLowerCase())) return traduccion;
  }
  return 'Ha ocurrido un error. Inténtalo de nuevo.';
}
