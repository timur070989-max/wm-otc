(() => {
  const base = new URL('.', document.currentScript.src).href;
  const sheets = new Map();
  function load(url) {
    if (!sheets.has(url)) sheets.set(url, new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img);
      img.onerror = () => { sheets.delete(url); reject(new Error('Не удалось загрузить кадры')); };
      img.src = url;
    }));
    return sheets.get(url);
  }
  // Clockwise from the top; timestamps calibrated against the supplied clip.
  const times = [1.5, 2.5, 3.15, 4, 4.6, 5.25, 6.15, 7.3, 8.2];
  function frameForAngle(angle) {
    const p = ((angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4);
    const i = Math.floor(p);
    return Math.round((times[i] + (times[i + 1] - times[i]) * (p - i)) * 12);
  }
  class MouseFollower extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({mode:'open'}).innerHTML = `<style>
        :host{display:block;width:var(--follower-width,280px);max-width:100%;aspect-ratio:9/16;background:transparent;position:relative;contain:layout paint;margin:0 auto;}
        canvas{display:block;width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;}
        p{position:absolute;inset:auto 12px 12px;margin:0;color:#46566a;font:12px/1.4 system-ui;text-align:center;pointer-events:none;}
        p[hidden]{display:none!important;}
      </style><canvas width="288" height="512" role="img" aria-label="Персонаж следит за указателем"></canvas><p role="status">Загрузка персонажа…</p>`;
      this.canvas = this.shadowRoot.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.message = this.shadowRoot.querySelector('p');
      this.angle = 0; this.target = 0; this.strength = 0; this.active = false;
    }
    async connectedCallback() {
      const token = this.token = {};
      this.abort = new AbortController();
      const options = {signal:this.abort.signal, passive:true};
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
      this.visible = true;
      this.observer = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        if (this.visible) this.wake();
      });
      this.observer.observe(this);
      window.addEventListener('pointermove', e => this.follow(e), options);
      window.addEventListener('pointerdown', e => this.follow(e), options);
      window.addEventListener('pointerup', e => { if(e.pointerType !== 'mouse') this.rest(); }, options);
      window.addEventListener('pointercancel', () => this.rest(), options);
      window.addEventListener('blur', () => this.rest(), options);
      document.documentElement.addEventListener('pointerleave', () => this.rest(), options);
      document.addEventListener('visibilitychange', () => { if(document.hidden) this.rest(); else this.wake(); }, options);
      this.reduced.addEventListener('change', () => {this.active=false; this.wake();}, {signal:this.abort.signal});
      try {
        const root = new URL(this.getAttribute('assets') || 'assets/', base);
        const urls = Array.from({length:6}, (_,i) => new URL(`sheet-${String(i+1).padStart(2,'0')}.jpg`, root).href);
        const first = await load(urls[0]);
        if (this.token !== token) return;
        this.images = [first]; this.paint(0); this.message.textContent = 'Загрузка движений…';
        const images = await Promise.all(urls.map(load));
        if (this.token !== token) return;
        this.images = images; this.ready = true; this.message.hidden = true; this.wake();
      } catch(error) { if(this.token === token) this.message.textContent = error.message; }
    }
    disconnectedCallback() {
      this.token = null; this.ready = false;
      this.abort.abort(); this.observer.disconnect(); cancelAnimationFrame(this.raf); this.raf = 0;
    }
    follow(e) {
      if (this.reduced.matches || !this.visible) return;
      const r = this.getBoundingClientRect();
      // Origin at the eyes, rather than at the middle of the body.
      const dx = e.clientX - (r.left + r.width * .5);
      const dy = e.clientY - (r.top + r.height * .26);
      this.active = Math.hypot(dx,dy) > Math.max(24,r.width * .12);
      this.target = Math.atan2(dx,-dy); this.wake();
    }
    rest() { this.active = false; this.wake(); }
    wake() {
      if(!this.raf && this.ready && this.visible && !document.hidden) {
        this.lastTime = performance.now(); this.raf = requestAnimationFrame(t => this.tick(t));
      }
    }
    paint(frame, alpha=1) {
      const img = this.images[Math.floor(frame / 20)];
      if(!img) return;
      const tile = frame % 20;
      this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(img, (tile%5)*288, Math.floor(tile/5)*512, 288,512,0,0,288,512);
      this.ctx.globalAlpha = 1;
    }
    tick(now) {
      this.raf = 0;
      if(!this.isConnected || !this.visible || document.hidden) return;
      const dt = Math.min((now-this.lastTime)/1000,.05); this.lastTime = now;
      const blend = 1-Math.exp(-dt*12);
      let delta = Math.atan2(Math.sin(this.target-this.angle), Math.cos(this.target-this.angle));
      this.angle += delta * blend;
      const desired = this.active && !this.reduced.matches ? 1 : 0;
      this.strength += (desired-this.strength)*blend;
      if(Math.abs(desired-this.strength)<.005) this.strength=desired;
      this.paint(0);
      if(this.strength > 0) this.paint(frameForAngle(this.angle), this.strength);
      if(Math.abs(delta)>.005 || this.strength!==desired) this.raf=requestAnimationFrame(t=>this.tick(t));
    }
  }
  if(!customElements.get('mouse-follower')) customElements.define('mouse-follower',MouseFollower);
})();
