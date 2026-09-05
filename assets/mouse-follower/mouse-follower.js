(() => {
  function getAssetFolder(attr) {
    if (attr && (attr.startsWith('http://') || attr.startsWith('https://'))) {
      return attr.endsWith('/') ? attr : attr + '/';
    }

    try {
      if (document.currentScript && document.currentScript.src) {
        const scriptDir = new URL('.', document.currentScript.src).href;
        return new URL(attr || 'assets/', scriptDir).href;
      }
      const scripts = document.querySelectorAll('script[src*="mouse-follower"]');
      if (scripts.length > 0) {
        const lastScript = scripts[scripts.length - 1];
        const scriptDir = new URL('.', lastScript.src).href;
        return new URL(attr || 'assets/', scriptDir).href;
      }
    } catch (e) {
      console.warn('Script resolution fallback:', e);
    }

    try {
      let base = window.location.href.split('#')[0].split('?')[0];
      if (base.endsWith('.html') || base.endsWith('.htm')) {
        base = base.substring(0, base.lastIndexOf('/') + 1);
      } else if (!base.endsWith('/')) {
        base = base + '/';
      }
      return new URL(attr || 'assets/mouse-follower/assets/', base).href;
    } catch (e) {
      return 'assets/mouse-follower/assets/';
    }
  }

  const sheetCache = new Map();
  function loadSheet(url) {
    if (!sheetCache.has(url)) {
      sheetCache.set(
        url,
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = (err) => {
            sheetCache.delete(url);
            console.error('Failed loading sprite sheet:', url, err);
            reject(new Error('Не удалось загрузить кадры: ' + url));
          };
          img.src = url;
        })
      );
    }
    return sheetCache.get(url);
  }

  const times = [1.5, 2.5, 3.15, 4.0, 4.6, 5.25, 6.15, 7.3, 8.2];
  function frameForAngle(angle) {
    const p = ((angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4);
    const i = Math.floor(p);
    const t = times[i] + (times[i + 1] - times[i]) * (p - i);
    return Math.min(119, Math.max(0, Math.round(t * 12)));
  }

  class MouseFollower extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host {
          display: block;
          width: var(--follower-width, 275px);
          max-width: 100%;
          aspect-ratio: 9 / 16;
          position: relative;
          margin: 0 auto;
        }
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          mix-blend-mode: multiply;
          pointer-events: none;
        }
        .error-msg {
          position: absolute;
          inset: auto 12px 12px;
          margin: 0;
          color: #dc2626;
          font: 12px/1.4 system-ui;
          text-align: center;
          display: none;
          background: rgba(255, 255, 255, 0.85);
          padding: 4px 8px;
          border-radius: 6px;
        }
      </style>
      <canvas width="288" height="512" role="img" aria-label="World Medicine 3D Консультант"></canvas>
      <div class="error-msg" role="status"></div>`;

      this.canvas = this.shadowRoot.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.errorMsg = this.shadowRoot.querySelector('.error-msg');
      this.angle = 0;
      this.target = 0;
      this.strength = 0;
      this.active = false;
      this.ready = false;
      this.visible = true;
      this.images = [];
      this.raf = 0;
      this.lastTime = 0;
    }

    async connectedCallback() {
      const token = (this.token = {});
      this.abort = new AbortController();
      const options = { signal: this.abort.signal, passive: true };
      this.reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
      this.visible = true;

      if (window.IntersectionObserver) {
        this.observer = new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
          if (this.visible) this.wake();
        });
        this.observer.observe(this);
      }

      window.addEventListener('pointermove', (e) => this.follow(e), options);
      window.addEventListener('pointerdown', (e) => this.follow(e), options);
      window.addEventListener('pointerup', (e) => {
        if (e.pointerType !== 'mouse') this.rest();
      }, options);
      window.addEventListener('pointercancel', () => this.rest(), options);
      window.addEventListener('blur', () => this.rest(), options);
      document.documentElement.addEventListener('pointerleave', () => this.rest(), options);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.rest();
        else this.wake();
      }, options);

      try {
        const rootUrl = getAssetFolder(this.getAttribute('assets'));
        const urls = Array.from(
          { length: 6 },
          (_, i) => new URL(`sheet-${String(i + 1).padStart(2, '0')}.jpg`, rootUrl).href
        );

        const first = await loadSheet(urls[0]);
        if (this.token !== token) return;
        this.images = [first];
        this.ready = true;
        this.renderFrame();
        this.wake();

        const allSheets = await Promise.all(urls.map(loadSheet));
        if (this.token !== token) return;
        this.images = allSheets;
        this.renderFrame();
        this.wake();
      } catch (error) {
        console.error('MouseFollower loading error:', error);
        if (this.token === token && this.errorMsg) {
          this.errorMsg.style.display = 'block';
          this.errorMsg.textContent = error.message;
        }
      }
    }

    disconnectedCallback() {
      this.token = null;
      this.ready = false;
      if (this.abort) this.abort.abort();
      if (this.observer) this.observer.disconnect();
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    follow(e) {
      if (this.reduced && this.reduced.matches) return;
      if (!this.visible) return;
      const r = this.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width * 0.5);
      const dy = e.clientY - (r.top + r.height * 0.28);
      this.active = Math.hypot(dx, dy) > Math.max(24, r.width * 0.12);
      this.target = Math.atan2(dx, -dy);
      this.wake();
    }

    rest() {
      this.active = false;
      this.wake();
    }

    wake() {
      if (!this.raf && this.ready && this.visible && !document.hidden) {
        this.lastTime = performance.now();
        this.raf = requestAnimationFrame((t) => this.tick(t));
      }
    }

    renderFrame() {
      if (!this.images || !this.images.length || !this.ctx) return;
      
      this.ctx.clearRect(0, 0, 288, 512);

      const baseImg = this.images[0];
      if (baseImg) {
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(baseImg, 0, 0, 288, 512, 0, 0, 288, 512);
      }

      if (this.strength > 0.01 && this.images.length >= 6) {
        const frame = frameForAngle(this.angle);
        const sheetIdx = Math.floor(frame / 20);
        const img = this.images[sheetIdx];
        if (img) {
          const tile = frame % 20;
          this.ctx.globalAlpha = Math.min(1, Math.max(0, this.strength));
          this.ctx.drawImage(
            img,
            (tile % 5) * 288,
            Math.floor(tile / 5) * 512,
            288,
            512,
            0,
            0,
            288,
            512
          );
          this.ctx.globalAlpha = 1;
        }
      }
    }

    tick(now) {
      this.raf = 0;
      if (!this.isConnected || !this.visible || document.hidden) return;
      
      const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.05);
      this.lastTime = now;
      
      const blend = 1 - Math.exp(-dt * 12);
      let delta = Math.atan2(Math.sin(this.target - this.angle), Math.cos(this.target - this.angle));
      this.angle += delta * blend;

      const desired = this.active && !(this.reduced && this.reduced.matches) ? 1 : 0;
      this.strength += (desired - this.strength) * blend;
      if (Math.abs(desired - this.strength) < 0.005) this.strength = desired;

      this.renderFrame();

      if (Math.abs(delta) > 0.005 || Math.abs(this.strength - desired) > 0.005) {
        this.raf = requestAnimationFrame((t) => this.tick(t));
      }
    }
  }

  if (!customElements.get('mouse-follower')) {
    customElements.define('mouse-follower', MouseFollower);
  }
})();
