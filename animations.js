// animations.js
// Animaciones de scroll con Intersection Observer
// Añade clase "animate" a cualquier elemento con data-animate
// y gestiona fade in/out, slide up, zoom in, etc.

(function() {

  // ─── ESTILOS BASE ─────────────────────────────────────────────────────────
  const styles = `
    /* Estados iniciales — elementos invisibles antes de animar */
    [data-animate] {
      opacity: 0;
      transition-property: opacity, transform;
      transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      transition-duration: 0.7s;
      will-change: opacity, transform;
    }

    /* fade-up — sube desde abajo (default) */
    [data-animate="fade-up"] {
      transform: translateY(32px);
    }

    /* fade-down — baja desde arriba */
    [data-animate="fade-down"] {
      transform: translateY(-32px);
    }

    /* fade-left — entra desde la derecha */
    [data-animate="fade-left"] {
      transform: translateX(32px);
    }

    /* fade-right — entra desde la izquierda */
    [data-animate="fade-right"] {
      transform: translateX(-32px);
    }

    /* zoom-in — aparece creciendo */
    [data-animate="zoom-in"] {
      transform: scale(0.92);
    }

    /* fade — solo opacidad */
    [data-animate="fade"] {
      transform: none;
    }

    /* Estado visible — clase que añade el observer */
    [data-animate].is-visible {
      opacity: 1;
      transform: none;
    }

    /* Delays opcionales via data-delay */
    [data-delay="100"] { transition-delay: 0.1s; }
    [data-delay="200"] { transition-delay: 0.2s; }
    [data-delay="300"] { transition-delay: 0.3s; }
    [data-delay="400"] { transition-delay: 0.4s; }
    [data-delay="500"] { transition-delay: 0.5s; }
    [data-delay="600"] { transition-delay: 0.6s; }
    [data-delay="700"] { transition-delay: 0.7s; }
    [data-delay="800"] { transition-delay: 0.8s; }

    /* Duraciones opcionales via data-duration */
    [data-duration="fast"]   { transition-duration: 0.4s; }
    [data-duration="normal"] { transition-duration: 0.7s; }
    [data-duration="slow"]   { transition-duration: 1.1s; }
    [data-duration="slower"] { transition-duration: 1.5s; }

    /* Navbar scroll effect */
    .nav-scrolled {
      box-shadow: 0 2px 20px rgba(76,29,149,0.1) !important;
      background: rgba(250,248,245,0.99) !important;
    }

    /* Smooth scroll global */
    html { scroll-behavior: smooth; }
  `;

  // Inyectar estilos
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ─── INTERSECTION OBSERVER ─────────────────────────────────────────────────
  function initAnimations() {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // No desanimar al salir — más natural
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold:  0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    elements.forEach(el => observer.observe(el));
  }

  // ─── NAVBAR SCROLL EFFECT ──────────────────────────────────────────────────
  function initNavbarScroll() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 20) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Check on load
  }

  // ─── STAGGER — anima hijos en secuencia ───────────────────────────────────
  // Uso: <div data-stagger data-stagger-delay="100">
  //        <div>item 1</div>
  //        <div>item 2</div>
  //      </div>
  function initStagger() {
    document.querySelectorAll('[data-stagger]').forEach(container => {
      const delay     = parseInt(container.dataset.staggerDelay || '100');
      const animation = container.dataset.staggerAnimate || 'fade-up';
      const children  = Array.from(container.children);

      children.forEach((child, i) => {
        child.setAttribute('data-animate', animation);
        child.setAttribute('data-delay', String(i * delay));
      });
    });
  }

  // ─── PARALLAX SUAVE ───────────────────────────────────────────────────────
  // Uso: <div data-parallax data-parallax-speed="0.3">
  function initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      elements.forEach(el => {
        const speed  = parseFloat(el.dataset.parallaxSpeed || '0.2');
        const offset = scrollY * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
    }, { passive: true });
  }

  // ─── CONTADOR ANIMADO ─────────────────────────────────────────────────────
  // Uso: <span data-counter data-target="150" data-suffix="€">0</span>
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el      = entry.target;
        const target  = parseInt(el.dataset.target || '0');
        const suffix  = el.dataset.suffix || '';
        const duration = 1500;
        const start    = performance.now();

        const update = (now) => {
          const elapsed  = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Easing
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target) + suffix;
          if (progress < 1) requestAnimationFrame(update);
        };

        requestAnimationFrame(update);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => counterObserver.observe(el));
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initStagger();
      initAnimations();
      initNavbarScroll();
      initParallax();
      initCounters();
    });
  } else {
    initStagger();
    initAnimations();
    initNavbarScroll();
    initParallax();
    initCounters();
  }

})();
