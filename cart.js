// cart.js
// Carrito desplegable tipo burbuja — se inyecta automáticamente en cualquier página.
// Necesita utils.js cargado antes (esc, precio, urlSegura).

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

    // Envío: misma regla que calcula el servidor (función crear_pedido).
    ENVIO_ESTANDAR:   4.95,
    ENVIO_GRATIS_MIN: 50,

    getCart() {
      try {
        const cart = JSON.parse(localStorage.getItem('kaori_cart') || '[]');
        return Array.isArray(cart) ? cart.filter(i => i && i.id && i.quantity > 0) : [];
      } catch { return []; }
    },

    saveCart(cart) {
      try { localStorage.setItem('kaori_cart', JSON.stringify(cart)); } catch {}
      this.updateBadge();
    },

    // Añade un producto. El precio guardado solo sirve para mostrarlo: el
    // importe real lo calcula el servidor al crear el pedido.
    add({ productId, variante = null, name, price, image, quantity = 1 }) {
      const id   = variante ? productId + '-' + variante : productId;
      const cart = this.getCart();
      const ex   = cart.find(i => i.id === id);
      if (ex) ex.quantity = Math.min(99, ex.quantity + quantity);
      else cart.push({ id, productId, variante, name, price: Number(price), image, quantity: Math.min(99, quantity) });
      this.saveCart(cart);
      this.render();
    },

    // Para el checkout: {product_id, variante, quantity}. Soporta carritos
    // antiguos donde solo se guardaba id = "<uuid>" o "<uuid>-<aroma>".
    itemsParaPedido() {
      return this.getCart().map(i => ({
        product_id: i.productId || String(i.id).slice(0, 36),
        variante:   i.productId ? (i.variante || null) : (String(i.id).length > 37 ? String(i.id).slice(37) : null),
        quantity:   i.quantity,
      }));
    },

    clear() {
      try { localStorage.removeItem('kaori_cart'); } catch {}
      this.updateBadge();
    },

    totales(envio = 'standard') {
      const subtotal = this.getCart().reduce((s, i) => s + Number(i.price) * i.quantity, 0);
      const shipping = envio === 'pickup' || subtotal >= this.ENVIO_GRATIS_MIN ? 0 : this.ENVIO_ESTANDAR;
      return { subtotal, shipping, total: subtotal + shipping };
    },

    updateBadge() {
      const total = this.getCart().reduce((s,i) => s + i.quantity, 0);
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
      item.quantity = Math.min(99, item.quantity + delta);
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
          <img src="${urlSegura(item.image) || IMG_FALLBACK}" alt="${esc(item.name)}"
               onerror="this.onerror=null;this.src=IMG_FALLBACK"
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
            ">${esc(item.name)}</p>
            <p style="color:#7c3aed;font-size:0.78rem;font-weight:700;margin-bottom:0.5rem">
              ${precio(item.price)}
            </p>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="
                display:flex;align-items:center;
                background:#f3e8ff;border-radius:9999px;
                padding:0.15rem;
              ">
                <button data-id="${esc(item.id)}" onclick="CartWidget.updateQty(this.dataset.id,-1)" aria-label="Quitar uno" style="
                  width:26px;height:26px;border:none;background:white;
                  border-radius:50%;cursor:pointer;font-size:0.9rem;
                  color:#7c3aed;font-weight:700;
                  display:flex;align-items:center;justify-content:center;
                  transition:background 0.15s;
                ">−</button>
                <span style="
                  width:28px;text-align:center;font-size:0.82rem;
                  font-weight:700;color:#2d1b69;
                ">${Number(item.quantity)}</span>
                <button data-id="${esc(item.id)}" onclick="CartWidget.updateQty(this.dataset.id,1)" aria-label="Añadir uno" style="
                  width:26px;height:26px;border:none;background:white;
                  border-radius:50%;cursor:pointer;font-size:0.9rem;
                  color:#7c3aed;font-weight:700;
                  display:flex;align-items:center;justify-content:center;
                  transition:background 0.15s;
                ">+</button>
              </div>
              <span style="font-size:0.82rem;font-weight:700;color:#4c1d95">
                ${precio(item.price * item.quantity)}
              </span>
            </div>
          </div>
          <button data-id="${esc(item.id)}" onclick="CartWidget.removeItem(this.dataset.id)" aria-label="Eliminar del carrito" style="
            background:none;border:none;cursor:pointer;
            color:#d1d5db;font-size:1rem;padding:0.25rem;
            border-radius:50%;transition:all 0.15s;
            flex-shrink:0;
          "
          onmouseover="this.style.color='#ef4444';this.style.background='#fee2e2'"
          onmouseout="this.style.color='#d1d5db';this.style.background='none'">🗑️</button>
        </div>`).join('');

      // Totales (estimación con envío a domicilio; el importe final lo calcula el servidor)
      const { subtotal, shipping, total } = this.totales('standard');
      const pct = Math.min(100, Math.round((subtotal / this.ENVIO_GRATIS_MIN) * 100));

      document.getElementById('cw-subtotal').textContent = precio(subtotal);
      const shipEl = document.getElementById('cw-shipping');
      shipEl.textContent  = shipping === 0 ? '🎉 Gratis' : precio(shipping);
      shipEl.style.color  = shipping === 0 ? '#16a34a' : '#6b7280';
      document.getElementById('cw-total').textContent = precio(total);

      // Barra envío gratis
      document.getElementById('cw-free-fill').style.width = pct + '%';
      if (subtotal < this.ENVIO_GRATIS_MIN) {
        document.getElementById('cw-free-txt').textContent =
          `¡Te faltan ${precio(this.ENVIO_GRATIS_MIN - subtotal)} para envío gratis!`;
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
