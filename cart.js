// cart.js
// Carrito desplegable tipo burbuja — se inyecta automáticamente en cualquier página

(function() {

  // ─── INYECTAR HTML DEL CARRITO ──────────────────────────────────────────────
  const cartHTML = `
    <!-- OVERLAY -->
    <div id="cartOverlay" onclick="CartWidget.close()" style="
      display:none; position:fixed; inset:0; z-index:98;
      background:transparent;
    "></div>

    <!-- CARRITO BURBUJA -->
    <div id="cartWidget" style="
      display:none;
      position:fixed;
      top:80px;
      right:1.5rem;
      width:min(380px, calc(100vw - 2rem));
      background:white;
      border-radius:1.25rem;
      box-shadow:0 20px 60px rgba(76,29,149,0.18), 0 4px 20px rgba(0,0,0,0.08);
      border:1px solid #f3e8ff;
      z-index:99;
      overflow:hidden;
      transform:translateY(-8px) scale(0.97);
      opacity:0;
      transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
      pointer-events:none;
      font-family:'Nunito',sans-serif;
    ">
      <!-- HEADER -->
      <div style="
        padding:1.2rem 1.5rem;
        border-bottom:1px solid #f3e8ff;
        display:flex;
        justify-content:space-between;
        align-items:center;
        background:linear-gradient(135deg,#faf5ff,white);
      ">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span style="font-size:1.2rem">🛍️</span>
          <h3 style="
            font-family:'Cormorant Garamond',serif;
            font-size:1.2rem;
            color:#4c1d95;
            font-weight:400;
          ">Tu Carrito</h3>
          <span id="cw-count" style="
            background:#7c3aed;
            color:white;
            font-size:0.7rem;
            font-weight:700;
            padding:2px 8px;
            border-radius:9999px;
          ">0</span>
        </div>
        <button onclick="CartWidget.close()" style="
          background:none;border:none;cursor:pointer;
          color:#9ca3af;font-size:1.2rem;
          width:32px;height:32px;
          border-radius:50%;
          transition:background 0.15s;
          display:flex;align-items:center;justify-content:center;
        " onmouseover="this.style.background='#f3e8ff'"
           onmouseout="this.style.background='none'">✕</button>
      </div>

      <!-- ITEMS -->
      <div id="cw-items" style="
        max-height:320px;
        overflow-y:auto;
        padding:1rem 1.5rem;
        scrollbar-width:thin;
        scrollbar-color:#e9d5ff transparent;
      "></div>

      <!-- FOOTER -->
      <div id="cw-footer" style="display:none">
        <!-- BARRA ENVÍO GRATIS -->
        <div id="cw-free-bar" style="padding:0 1.5rem 0.75rem">
          <div style="
            display:flex;justify-content:space-between;
            font-size:0.75rem;color:#6b7280;margin-bottom:0.4rem;
          ">
            <span id="cw-free-txt">—</span>
            <span id="cw-free-pct">—</span>
          </div>
          <div style="background:#f3e8ff;border-radius:9999px;height:6px;overflow:hidden">
            <div id="cw-free-fill" style="
              height:100%;background:linear-gradient(90deg,#a855f7,#7c3aed);
              border-radius:9999px;transition:width 0.4s ease;width:0%;
            "></div>
          </div>
        </div>

        <!-- TOTALES -->
        <div style="padding:0.75rem 1.5rem;border-top:1px solid #f3e8ff;background:#faf5ff">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#6b7280;margin-bottom:0.4rem">
            <span>Subtotal</span>
            <span id="cw-subtotal">—</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#6b7280;margin-bottom:0.75rem">
            <span>Envío</span>
            <span id="cw-shipping" style="color:#16a34a">—</span>
          </div>
          <div style="
            display:flex;justify-content:space-between;
            font-weight:700;font-size:1.05rem;color:#4c1d95;
            border-top:1px solid #f3e8ff;padding-top:0.75rem;margin-bottom:1rem;
          ">
            <span>Total</span>
            <span id="cw-total">—</span>
          </div>
          <a href="checkout.html" style="
            display:block;text-align:center;
            background:linear-gradient(135deg,#7c3aed,#6d28d9);
            color:white;border-radius:9999px;
            padding:0.9rem;font-weight:700;
            font-size:0.95rem;text-decoration:none;
            transition:all 0.2s;
            box-shadow:0 4px 14px rgba(124,58,237,0.3);
          "
          onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 20px rgba(124,58,237,0.4)'"
          onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(124,58,237,0.3)'">
            Finalizar Compra →
          </a>
          <button onclick="CartWidget.close();window.location.href='shop.html'" style="
            display:block;width:100%;text-align:center;
            background:none;border:none;cursor:pointer;
            color:#7c3aed;font-size:0.82rem;
            font-family:'Nunito',sans-serif;
            font-weight:600;margin-top:0.75rem;
            padding:0.4rem;
          ">← Seguir comprando</button>
        </div>
      </div>
    </div>
  `;

  // Inyectar en el body
  document.body.insertAdjacentHTML('beforeend', cartHTML);

  // ─── WIDGET OBJECT ────────────────────────────────────────────────────────
  window.CartWidget = {

    open() {
      this.render();
      const widget  = document.getElementById('cartWidget');
      const overlay = document.getElementById('cartOverlay');
      overlay.style.display = 'block';
      widget.style.display  = 'block';
      // Trigger animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          widget.style.opacity   = '1';
          widget.style.transform = 'translateY(0) scale(1)';
          widget.style.pointerEvents = 'all';
        });
      });
    },

    close() {
      const widget  = document.getElementById('cartWidget');
      const overlay = document.getElementById('cartOverlay');
      widget.style.opacity       = '0';
      widget.style.transform     = 'translateY(-8px) scale(0.97)';
      widget.style.pointerEvents = 'none';
      overlay.style.display      = 'none';
      setTimeout(() => { widget.style.display = 'none'; }, 250);
    },

    toggle() {
      const widget = document.getElementById('cartWidget');
      if (widget.style.display === 'none' || !widget.style.display) {
        this.open();
      } else {
        this.close();
      }
    },

    getCart() {
      try { return JSON.parse(localStorage.getItem('kaori_cart') || '[]'); }
      catch { return []; }
    },

    saveCart(cart) {
      localStorage.setItem('kaori_cart', JSON.stringify(cart));
      this.updateBadge();
    },

    updateBadge() {
      const total  = this.getCart().reduce((s,i) => s + i.quantity, 0);
      // Actualizar todos los badges de la página
      document.querySelectorAll('.cart-count-badge').forEach(el => {
        el.textContent   = total;
        el.style.display = total > 0 ? 'flex' : 'none';
      });
      document.querySelectorAll('.cart-count-text').forEach(el => {
        el.textContent = total;
      });
    },

    updateQty(id, delta) {
      const cart = this.getCart();
      const item = cart.find(i => i.id === id);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeItem(id);
        return;
      }
      this.saveCart(cart);
      this.render();
    },

    removeItem(id) {
      const cart = this.getCart().filter(i => i.id !== id);
      this.saveCart(cart);
      this.render();
    },

    render() {
      const cart      = this.getCart();
      const itemsEl   = document.getElementById('cw-items');
      const footerEl  = document.getElementById('cw-footer');
      const countEl   = document.getElementById('cw-count');

      const totalItems = cart.reduce((s,i) => s + i.quantity, 0);
      if (countEl) countEl.textContent = totalItems;

      if (!cart.length) {
        itemsEl.innerHTML = `
          <div style="text-align:center;padding:2.5rem 1rem">
            <p style="font-size:2.5rem;margin-bottom:0.75rem">🛒</p>
            <p style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:#4c1d95;margin-bottom:0.4rem">
              Tu carrito está vacío
            </p>
            <p style="color:#9ca3af;font-size:0.82rem;margin-bottom:1.25rem">
              Explora nuestra tienda y añade productos
            </p>
            <a href="shop.html" style="
              display:inline-block;background:#7c3aed;color:white;
              border-radius:9999px;padding:0.65rem 1.5rem;
              font-weight:700;font-size:0.85rem;text-decoration:none;
            ">Ver productos →</a>
          </div>`;
        if (footerEl) footerEl.style.display = 'none';
        return;
      }

      itemsEl.innerHTML = cart.map(item => `
        <div style="
          display:flex;gap:0.9rem;padding:0.85rem 0;
          border-bottom:1px solid #faf5ff;
          align-items:center;
        ">
          <img src="${item.image}" alt="${item.name}"
               onerror="this.src='https://images.unsplash.com/photo-1602178478026-72d94a3e8e3f?w=200&q=60'"
               style="
                 width:60px;height:60px;object-fit:cover;
                 border-radius:0.6rem;flex-shrink:0;
                 border:1px solid #f3e8ff;
               " />
          <div style="flex:1;min-width:0">
            <p style="
              font-weight:600;color:#4c1d95;font-size:0.82rem;
              margin-bottom:0.2rem;
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            ">${item.name}</p>
            <p style="color:#7c3aed;font-size:0.78rem;font-weight:700;margin-bottom:0.5rem">
              ${Number(item.price).toFixed(2)} €
            </p>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="
                display:flex;align-items:center;
                background:#f3e8ff;border-radius:9999px;
                padding:0.15rem;
              ">
                <button onclick="CartWidget.updateQty('${item.id}',-1)" style="
                  width:26px;height:26px;border:none;background:white;
                  border-radius:50%;cursor:pointer;font-size:0.9rem;
                  color:#7c3aed;font-weight:700;
                  display:flex;align-items:center;justify-content:center;
                  transition:background 0.15s;
                ">−</button>
                <span style="
                  width:28px;text-align:center;font-size:0.82rem;
                  font-weight:700;color:#2d1b69;
                ">${item.quantity}</span>
                <button onclick="CartWidget.updateQty('${item.id}',1)" style="
                  width:26px;height:26px;border:none;background:white;
                  border-radius:50%;cursor:pointer;font-size:0.9rem;
                  color:#7c3aed;font-weight:700;
                  display:flex;align-items:center;justify-content:center;
                  transition:background 0.15s;
                ">+</button>
              </div>
              <span style="font-size:0.82rem;font-weight:700;color:#4c1d95">
                ${(item.price * item.quantity).toFixed(2)} €
              </span>
            </div>
          </div>
          <button onclick="CartWidget.removeItem('${item.id}')" style="
            background:none;border:none;cursor:pointer;
            color:#d1d5db;font-size:1rem;padding:0.25rem;
            border-radius:50%;transition:all 0.15s;
            flex-shrink:0;
          "
          onmouseover="this.style.color='#ef4444';this.style.background='#fee2e2'"
          onmouseout="this.style.color='#d1d5db';this.style.background='none'">🗑️</button>
        </div>`).join('');

      // Totales
      const subtotal = cart.reduce((s,i) => s + i.price * i.quantity, 0);
      const shipping  = subtotal >= 50 ? 0 : 4.95;
      const total     = subtotal + shipping;
      const pct       = Math.min(100, Math.round((subtotal / 50) * 100));

      document.getElementById('cw-subtotal').textContent = subtotal.toFixed(2) + ' €';
      const shipEl = document.getElementById('cw-shipping');
      shipEl.textContent  = shipping === 0 ? '🎉 Gratis' : shipping.toFixed(2) + ' €';
      shipEl.style.color  = shipping === 0 ? '#16a34a' : '#6b7280';
      document.getElementById('cw-total').textContent = total.toFixed(2) + ' €';

      // Barra envío gratis
      document.getElementById('cw-free-fill').style.width = pct + '%';
      if (subtotal < 50) {
        document.getElementById('cw-free-txt').textContent =
          `¡Te faltan ${(50 - subtotal).toFixed(2)} € para envío gratis!`;
        document.getElementById('cw-free-pct').textContent = pct + '%';
      } else {
        document.getElementById('cw-free-txt').textContent = '🎉 ¡Envío gratis conseguido!';
        document.getElementById('cw-free-pct').textContent = '';
      }

      if (footerEl) footerEl.style.display = '';
    },
  };

  // ─── INIT ────────────────────────────────────────────────────────────────
  // Actualizar badges al cargar
  window.addEventListener('DOMContentLoaded', () => {
    CartWidget.updateBadge();
  });

  // Cerrar con ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') CartWidget.close();
  });

})();
