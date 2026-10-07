/* ==========================================================================
   GARRITAS DE HUMO · Interacciones y animaciones
   Vanilla JS, sin dependencias obligatorias. Lenis (scroll suave) se carga
   de forma opcional: si el CDN falla, la página sigue con scroll nativo.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const WA_NUMBER = '523326287517';

  let lenis = null;
  const readyCallbacks = [];
  const onReady = (fn) => readyCallbacks.push(fn);

  /* Ejecuta cada módulo aislado: si uno falla, el resto (y el loader) siguen. */
  const safe = (fn) => {
    try { fn(); } catch (err) { console.error('[GH]', err); }
  };

  /* ========================================================================
     LOADER · simula la carga y "enciende" el orbe del logo
     ======================================================================== */
  function initLoader() {
    const loader = $('#loader');
    let done = false;

    const ready = () => {
      if (done) return;
      done = true;
      if (loader) loader.classList.add('is-done');
      root.classList.remove('is-loading');
      setTimeout(() => {
        root.classList.add('is-ready');
        if (lenis) lenis.start();
        readyCallbacks.forEach((fn) => safe(fn));
      }, reduced ? 0 : 380);
      if (loader) setTimeout(() => loader.remove(), 1600);
    };

    if (!loader) { ready(); return; }

    const num = $('#loader-num');
    const arc = $('#loader-arc');
    const status = $('#loader-status');
    const msgs = ['Encendiendo lámpara UV', 'Preparando soft gel', 'Mezclando pigmentos', 'Puliendo los detalles', 'Lista para ti'];

    let visited = false;
    try {
      visited = sessionStorage.getItem('gh-visited') === '1';
      sessionStorage.setItem('gh-visited', '1');
    } catch (e) { /* almacenamiento bloqueado: se usa la duración completa */ }

    const minTime = reduced ? 250 : visited ? 900 : 2100;
    const start = performance.now();
    let loaded = document.readyState === 'complete';
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    let shown = 0;
    let msgIdx = -1;

    const tick = (now) => {
      const elapsed = now - start;
      let target = Math.min(elapsed / minTime, 1) * 100;
      // Si la página aún no termina de cargar, se detiene en 92% (máx. 5 s).
      if (!loaded && elapsed < 5000) target = Math.min(target, 92);
      shown += (target - shown) * 0.14;
      if (target >= 100 && shown > 99.4) shown = 100;

      const v = Math.round(shown);
      num.textContent = String(v).padStart(3, '0');
      arc.style.strokeDashoffset = String(100 - shown);
      const idx = v >= 100 ? msgs.length - 1 : Math.min(msgs.length - 2, Math.floor(v / 23));
      if (idx !== msgIdx) { msgIdx = idx; status.textContent = msgs[idx]; }

      if (v >= 100) { setTimeout(ready, 260); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Red de seguridad: nunca dejar al usuario atrapado en el loader.
    setTimeout(ready, 7000);
  }

  /* ========================================================================
     LENIS · scroll suave "motion slow"
     ======================================================================== */
  function initLenis() {
    if (reduced) return;
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lenis@1.1.20/dist/lenis.min.js';
    s.async = true;
    s.onload = () => {
      if (!window.Lenis) return;
      lenis = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      if (root.classList.contains('is-loading') || root.classList.contains('menu-open')) lenis.stop();
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    };
    document.head.appendChild(s);
  }

  function scrollToTarget(target) {
    const offset = target.id === 'inicio' ? 0 : -84;
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.5 });
    } else {
      const y = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  /* ========================================================================
     HEADER · menú, ocultar al bajar, enlace activo, progreso
     ======================================================================== */
  const header = $('#header');
  const burger = $('#burger');
  const menu = $('#menu');

  function openMenu() {
    menu.classList.add('is-open');
    menu.inert = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    root.classList.add('menu-open');
    header.classList.remove('is-hidden');
    if (lenis) lenis.stop();
  }

  function closeMenu(returnFocus) {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.inert = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    root.classList.remove('menu-open');
    if (lenis) lenis.start();
    if (returnFocus) burger.focus();
  }

  function initNav() {
    burger.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu(true);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu();
    });

    // Enlaces internos con scroll suave
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ========================================================================
     TEXTO DIVIDIDO EN PALABRAS
     ======================================================================== */
  function splitWords(el, wordClass, wrapInner) {
    let i = 0;
    const walk = (node, inEm) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = wordClass;
            if (wrapInner) {
              const inner = document.createElement('span');
              inner.textContent = part;
              inner.style.setProperty('--i', i);
              if (inEm) inner.classList.add('g');
              w.appendChild(inner);
            } else {
              w.textContent = part;
              if (inEm) w.classList.add('g');
            }
            i += 1;
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          walk(n, inEm || n.tagName === 'EM');
        }
      });
    };
    walk(el, false);
    el.classList.add('is-split');
  }

  /* ========================================================================
     REVEAL AL HACER SCROLL
     ======================================================================== */
  function initReveal() {
    $$('[data-split]').forEach((el) => splitWords(el, 'w', true));

    const targets = $$('[data-reveal], [data-split]');
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  /* ========================================================================
     HERO · palabra rotativa
     ======================================================================== */
  function initCycle() {
    const wrap = $('[data-cycle]');
    if (!wrap || reduced) return;
    const words = wrap.dataset.cycle.split('|');
    const el = $('.hero__cycle-word', wrap);
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      el.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('is-out');
        el.classList.add('is-in');
        void el.offsetWidth; // fuerza reflow para reiniciar la transición
        el.classList.remove('is-in');
      }, 560);
    }, 2900);
  }

  /* ========================================================================
     HERO · canvas: ondas del logo + humo + partículas
     ======================================================================== */
  const heroState = { scroll: 0, ox: 0, oy: 0, tox: 0, toy: 0 };

  function initHeroCanvas() {
    const hero = $('.hero');
    const canvas = $('#hero-canvas');
    const orb = $('.hero__orb');
    if (!hero || !canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, mobile = false;
    let lines = [], particles = [], puffs = [];
    let running = false, inView = true, last = performance.now();
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    const sprite = (r, rgb) => {
      const c = document.createElement('canvas');
      c.width = c.height = r * 2;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, `rgba(${rgb},0.55)`);
      grad.addColorStop(0.5, `rgba(${rgb},0.18)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
      return c;
    };
    const puffCream = sprite(128, '238,231,208');
    const puffGreen = sprite(128, '92,255,63');

    const orbCenter = () => (mobile ? { x: w * 0.5, y: h * 0.54 } : { x: w * 0.72, y: h * 0.5 });

    const newPuff = (initial) => {
      const c = orbCenter();
      return {
        x: c.x + (Math.random() - 0.5) * w * (mobile ? 0.5 : 0.25),
        y: c.y + (initial ? (Math.random() - 0.5) * h * 0.6 : h * 0.18),
        r: (mobile ? 90 : 140) + Math.random() * (mobile ? 120 : 200),
        vy: -(0.12 + Math.random() * 0.22),
        drift: Math.random() * Math.PI * 2,
        life: initial ? Math.random() : 0,
        speed: 0.0009 + Math.random() * 0.0012,
        green: Math.random() < 0.4,
      };
    };

    const newParticle = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.5 + Math.random() * 1.8,
      vy: -(0.15 + Math.random() * 0.5),
      seed: Math.random() * 100,
      a: 0.25 + Math.random() * 0.6,
      green: Math.random() < 0.45,
    });

    function build() {
      const rect = hero.getBoundingClientRect();
      w = rect.width; h = rect.height;
      mobile = w < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dos haces diagonales de líneas, como en el logotipo
      const n = mobile ? 9 : 14;
      const slope = clamp((h / w) * 0.62, 0.38, 1.25);
      const gap = mobile ? 15 : 22;
      lines = [];
      for (let b = 0; b < 2; b += 1) {
        for (let i = 0; i < n; i += 1) {
          const x0 = b === 0
            ? w * (mobile ? 0.36 : 0.47) + i * gap
            : w * (mobile ? 0.5 : 0.36) - i * gap - h / slope;
          lines.push({
            x0, slope, i, n,
            amp: (mobile ? 8 : 12) + Math.random() * (mobile ? 10 : 16),
            f: 0.0035 + Math.random() * 0.004,
            sp: 0.25 + Math.random() * 0.35,
            ph: i * 0.38 + b * 2,
            glint: Math.random(),
          });
        }
      }
      if (!particles.length) {
        particles = Array.from({ length: mobile ? 34 : 70 }, () => newParticle(true));
        puffs = Array.from({ length: mobile ? 4 : 7 }, () => newPuff(true));
      }
    }

    function drawLines(T) {
      const R = mobile ? 120 : 220;
      const R2 = R * R;
      ctx.lineWidth = 1;
      for (let k = 0; k < lines.length; k += 1) {
        const L = lines[k];
        const inner = 1 - L.i / L.n; // líneas más cercanas al orbe = más brillantes
        const xa = Math.max(-20, L.x0 - 80 / L.slope);
        const xb = Math.min(w + 20, L.x0 + (h + 80) / L.slope);
        if (xb <= xa) continue;

        // Pulso de luz que viaja por cada línea
        const spot = ((T * 0.06 + L.glint) % 1.4) - 0.2;
        const base = `rgba(142,125,109,${(0.14 + inner * 0.34).toFixed(3)})`;
        const grad = ctx.createLinearGradient(xa, 0, xb, 0);
        grad.addColorStop(0, base);
        if (spot > 0.06 && spot < 0.94) {
          grad.addColorStop(spot - 0.06, base);
          grad.addColorStop(spot, `rgba(166,255,148,${(0.35 + inner * 0.5).toFixed(3)})`);
          grad.addColorStop(spot + 0.06, base);
        }
        grad.addColorStop(1, base);
        ctx.strokeStyle = grad;

        ctx.beginPath();
        let first = true;
        const step = mobile ? 12 : 10;
        for (let x = xa; x <= xb; x += step) {
          let y = L.slope * (x - L.x0)
            + L.amp * Math.sin(x * L.f + T * L.sp + L.ph)
            + L.amp * 0.5 * Math.sin(x * L.f * 2.1 - T * L.sp * 1.3 + L.ph * 1.7);
          const dx = x - mouse.x, dy = y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            const force = 1 - d / R;
            y += (dy / d) * force * force * (mobile ? 30 : 60);
          }
          if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function drawPuffs(dt) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < puffs.length; i += 1) {
        const p = puffs[i];
        p.life += p.speed * dt;
        p.y += p.vy * dt;
        p.drift += 0.004 * dt;
        const x = p.x + Math.sin(p.drift) * 30;
        const alpha = Math.sin(Math.min(p.life, 1) * Math.PI) * (mobile ? 0.1 : 0.13);
        if (p.life >= 1) { puffs[i] = newPuff(false); continue; }
        ctx.globalAlpha = alpha;
        const r = p.r * (1 + p.life * 0.6);
        ctx.drawImage(p.green ? puffGreen : puffCream, x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }

    function drawParticles(T, dt) {
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.y += p.vy * dt;
        p.x += Math.sin(T * 0.6 + p.seed) * 0.18 * dt;
        if (p.y < -10) { particles[i] = newParticle(false); continue; }
        const tw = 0.55 + 0.45 * Math.sin(T * 2 + p.seed);
        ctx.fillStyle = p.green
          ? `rgba(140,255,110,${(p.a * tw).toFixed(3)})`
          : `rgba(238,231,208,${(p.a * tw * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function render(now) {
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;
      const T = now * 0.001;

      if (mouse.tx > -1000) {
        if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
        mouse.x = lerp(mouse.x, mouse.tx, 0.08);
        mouse.y = lerp(mouse.y, mouse.ty, 0.08);
      } else {
        mouse.x = mouse.y = -9999;
      }

      ctx.clearRect(0, 0, w, h);
      drawPuffs(dt);
      drawLines(T);
      drawParticles(T, dt);

      // Orbe: parallax con el puntero + reacción al scroll
      heroState.ox = lerp(heroState.ox, heroState.tox, 0.05);
      heroState.oy = lerp(heroState.oy, heroState.toy, 0.05);
      if (orb) {
        orb.style.setProperty('--ox', `${heroState.ox.toFixed(2)}px`);
        orb.style.setProperty('--oy', `${(heroState.oy + heroState.scroll * 120).toFixed(2)}px`);
        orb.style.setProperty('--os', (1 + heroState.scroll * 0.35).toFixed(3));
        orb.style.setProperty('--oo', (1 - heroState.scroll * 0.75).toFixed(3));
      }
    }

    const loop = (now) => {
      if (!running) return;
      render(now);
      requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || !inView || document.hidden || reduced) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    };
    const stop = () => { running = false; };

    build();
    render(performance.now()); // primer cuadro estático (también para movimiento reducido)

    let lastW = w, lastH = h, resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const r = hero.getBoundingClientRect();
        // En móvil la barra de URL cambia la altura: solo reconstruir si el cambio es real.
        if (Math.abs(r.width - lastW) > 2 || Math.abs(r.height - lastH) > 140) {
          lastW = r.width; lastH = r.height;
          build();
          if (!running) render(performance.now());
        }
      }, 160);
    });

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mouse.tx = e.clientX - r.left;
        mouse.ty = e.clientY - r.top;
        heroState.tox = (e.clientX / window.innerWidth - 0.5) * 50;
        heroState.toy = (e.clientY / window.innerHeight - 0.5) * 36;
      });
      hero.addEventListener('pointerleave', () => {
        mouse.tx = mouse.ty = -9999;
        heroState.tox = heroState.toy = 0;
      });
    }

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    onReady(start);
  }

  /* Pila de tarjetas del hero: inclinación 3D con el puntero */
  function initStackTilt() {
    const hero = $('.hero');
    const stack = $('#hero-stack');
    if (!hero || !stack || !finePointer || reduced) return;
    hero.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      stack.style.setProperty('--ry', `${(nx * 16).toFixed(2)}deg`);
      stack.style.setProperty('--rx', `${(-ny * 12).toFixed(2)}deg`);
    });
    hero.addEventListener('pointerleave', () => {
      stack.style.setProperty('--ry', '0deg');
      stack.style.setProperty('--rx', '0deg');
    });
  }

  /* ========================================================================
     SCROLL · un solo bucle para todo lo que depende de la posición
     ======================================================================== */
  function initScrollScenes() {
    const progress = $('#progress');
    const heroInner = $('.hero__inner');
    const navLinks = $$('.nav__link');
    const sections = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

    // Manifiesto: palabras que se iluminan
    const mText = $('[data-scrub-words]');
    let mWords = [];
    let lit = -1;
    if (mText) {
      splitWords(mText, 'sw', false);
      mWords = $$('.sw', mText);
    }

    // Timeline del proceso
    const timeline = $('#timeline');
    const steps = timeline ? $$('.timeline__step', timeline) : [];

    // Showcase horizontal
    const sc = $('.showcase');
    const track = $('#showcase-track');
    const viewport = $('.showcase__viewport');
    const numEl = $('#showcase-num');
    const bar = $('#showcase-bar');
    const total = track ? $$('.shot:not(.shot--cta)', track).length : 0;
    const mqPin = window.matchMedia('(min-width: 1024px)');
    let pinned = false;
    let dist = 0;

    const setCounter = (p) => {
      if (!numEl) return;
      const idx = Math.min(total, Math.floor(p * (total + 0.6)) + 1);
      numEl.textContent = String(idx).padStart(2, '0');
      bar.style.setProperty('--p', Math.max(0.08, p).toFixed(3));
    };

    function setupShowcase() {
      if (!sc || !track) return;
      pinned = mqPin.matches && !reduced;
      sc.classList.toggle('is-pinned', pinned);
      track.style.transform = '';
      if (pinned) {
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        sc.style.height = `${dist + window.innerHeight}px`;
      } else {
        sc.style.height = '';
      }
      update();
    }

    if (viewport) {
      viewport.addEventListener('scroll', () => {
        if (pinned) return;
        const max = viewport.scrollWidth - viewport.clientWidth;
        setCounter(max > 0 ? viewport.scrollLeft / max : 0);
      }, { passive: true });
    }

    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;

      // Barra de progreso
      const max = document.documentElement.scrollHeight - vh;
      if (progress) progress.style.setProperty('--p', (max > 0 ? y / max : 0).toFixed(4));

      // Header: compacto al hacer scroll, se oculta al bajar y vuelve al subir
      header.classList.toggle('is-scrolled', y > 24);
      if (!root.classList.contains('menu-open')) {
        if (y > lastY + 4 && y > 240) header.classList.add('is-hidden');
        else if (y < lastY - 4 || y < 240) header.classList.remove('is-hidden');
      }
      lastY = y;

      // Hero: parallax de salida
      if (y < vh * 1.3) {
        const p = clamp(y / vh, 0, 1);
        heroState.scroll = p;
        // Solo en desktop: en móvil el hero es más alto que la pantalla y el fade oscurecería las fotos.
        if (heroInner && !reduced && mqPin.matches) {
          heroInner.style.transform = `translate3d(0, ${(y * 0.2).toFixed(1)}px, 0)`;
          heroInner.style.opacity = (1 - p * 0.85).toFixed(3);
        } else if (heroInner && heroInner.style.opacity) {
          heroInner.style.transform = '';
          heroInner.style.opacity = '';
        }
      }

      // Manifiesto
      if (mText) {
        const r = mText.getBoundingClientRect();
        if (r.bottom > -50 && r.top < vh + 50) {
          const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
          const n = Math.round(p * mWords.length);
          if (n !== lit) {
            lit = n;
            mWords.forEach((wd, i) => wd.classList.toggle('is-lit', i < n));
          }
        }
      }

      // Timeline
      if (timeline) {
        const r = timeline.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          const line = vh * 0.6;
          timeline.style.setProperty('--p', clamp((line - r.top) / r.height, 0, 1).toFixed(4));
          steps.forEach((s) => {
            const nr = s.firstElementChild.getBoundingClientRect();
            s.classList.toggle('is-active', nr.top + nr.height / 2 < line);
          });
        }
      }

      // Showcase fijado
      if (pinned && dist > 0) {
        const r = sc.getBoundingClientRect();
        const p = clamp(-r.top / dist, 0, 1);
        track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
        setCounter(p);
      }

      // Enlace activo del menú
      let current = null;
      sections.forEach((s) => { if (s.getBoundingClientRect().top < vh * 0.4) current = s; });
      navLinks.forEach((a) => a.classList.toggle('is-active', !!current && a.getAttribute('href') === `#${current.id}`));
    }

    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setupShowcase, 180);
    });
    mqPin.addEventListener('change', setupShowcase);
    window.addEventListener('load', setupShowcase);

    setupShowcase();
  }

  /* ========================================================================
     MICRO-INTERACCIONES · spotlight, tilt, magnético, cursor
     ======================================================================== */
  function initPointerFx() {
    if (!finePointer) return;

    $$('[data-spotlight]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });

    if (reduced) return;

    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--try', `${(x * 10).toFixed(2)}deg`);
        el.style.setProperty('--trx', `${(-y * 10).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--try', '0deg');
        el.style.setProperty('--trx', '0deg');
      });
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(x * 0.2).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    // Cursor: punto + anillo con inercia
    const cursor = $('.cursor');
    if (!cursor) return;
    root.classList.add('has-cursor');
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label, [data-tilt]'));
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    const loop = () => {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ========================================================================
     CONTADORES
     ======================================================================== */
  function initCounters() {
    const els = $$('[data-count]');
    const fmt = (el, n) => `${el.dataset.prefix || ''}${n.toLocaleString('es-MX')}${el.dataset.suffix || ''}`;
    if (reduced || !('IntersectionObserver' in window)) return; // el HTML ya trae el valor final

    els.forEach((el) => { el.textContent = fmt(el, 0); });
    const run = (el) => {
      const end = Number(el.dataset.count);
      const t0 = performance.now();
      const dur = 2000;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        el.textContent = fmt(el, Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ========================================================================
     VIDEOS · reproducir solo cuando están en pantalla
     ======================================================================== */
  function initVideos() {
    const vids = $$('video[data-inview-play]');
    if (reduced) { vids.forEach((v) => { v.controls = true; }); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          const p = v.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    vids.forEach((v) => io.observe(v));
  }

  /* ========================================================================
     OPINIONES · marquee infinito sin huecos
     ======================================================================== */
  function initReviews() {
    const track = $('.reviews__track');
    if (!track || reduced) return;
    const originals = Array.from(track.children);
    const setWidth = track.scrollWidth;
    const reps = Math.max(1, Math.ceil(window.innerWidth / setWidth));
    const cloneSet = () => originals.map((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      return c;
    });
    for (let r = 1; r < reps; r += 1) track.append(...cloneSet());
    const fullSet = Array.from(track.children);
    track.append(...fullSet.map((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      return c;
    }));
    track.style.animationDuration = `${Math.round((setWidth * reps) / 45)}s`;
  }

  /* ========================================================================
     FAQ · acordeón con <details> animado
     ======================================================================== */
  function initFaq() {
    const items = $$('.qa');
    const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

    const open = (d) => {
      const a = $('.qa__a', d);
      d.open = true;
      if (reduced) return;
      a.animate([{ height: '0px', opacity: 0 }, { height: `${a.scrollHeight}px`, opacity: 1 }], { duration: 520, easing: ease });
    };
    const close = (d) => {
      const a = $('.qa__a', d);
      if (reduced) { d.open = false; return; }
      const anim = a.animate([{ height: `${a.scrollHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
      anim.onfinish = () => { d.open = false; anim.cancel(); };
    };

    items.forEach((d) => {
      d.removeAttribute('name'); // el acordeón exclusivo lo maneja JS (con animación)
      $('summary', d).addEventListener('click', (e) => {
        e.preventDefault();
        if (d.open) { close(d); return; }
        items.forEach((o) => { if (o !== d && o.open) close(o); });
        open(d);
      });
    });
  }

  /* ========================================================================
     FORMULARIO → WHATSAPP
     ======================================================================== */
  function initForm() {
    const form = $('#contact-form');
    if (!form) return;
    const nameEl = form.elements.namedItem('name');
    const phoneEl = form.elements.namedItem('phone');
    const dateEl = form.elements.namedItem('date');
    const notesEl = form.elements.namedItem('notes');
    const formErr = $('#form-err');
    const done = $('#form-done');
    const fallback = $('#form-fallback');

    const setError = (input, msg) => {
      const err = document.getElementById(`${input.id}-err`);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    };

    const normalizePhone = (raw) => {
      let d = raw.replace(/\D/g, '');
      if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
      else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
      return d;
    };

    const validate = () => {
      let firstBad = null;
      const name = nameEl.value.trim();
      if (name.length < 2) { setError(nameEl, 'Escribe tu nombre para saber cómo llamarte.'); firstBad = firstBad || nameEl; }
      else setError(nameEl, '');

      const phone = normalizePhone(phoneEl.value);
      if (phone.length !== 10) { setError(phoneEl, 'Escribe un número de WhatsApp de 10 dígitos.'); firstBad = firstBad || phoneEl; }
      else setError(phoneEl, '');
      return firstBad;
    };

    [nameEl, phoneEl].forEach((el) => {
      el.addEventListener('input', () => {
        if (el.getAttribute('aria-invalid') === 'true') validate();
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formErr.hidden = true;
      done.hidden = true;

      const bad = validate();
      if (bad) {
        formErr.textContent = 'Revisa los campos marcados para poder enviarte a WhatsApp.';
        formErr.hidden = false;
        bad.focus();
        return;
      }

      const service = (form.querySelector('input[name="service"]:checked') || {}).value || 'Aún no sé, quiero asesoría';
      const phone = normalizePhone(phoneEl.value);
      const lines = [
        'Hola Garritas de Humo 💅 Quiero agendar una cita.',
        '',
        `• Nombre: ${nameEl.value.trim()}`,
        `• WhatsApp: ${phone}`,
        `• Técnica: ${service}`,
      ];
      if (dateEl.value.trim()) lines.push(`• Día preferido: ${dateEl.value.trim()}`);
      if (notesEl.value.trim()) lines.push(`• Mi idea: ${notesEl.value.trim()}`);
      lines.push('', '¿Qué disponibilidad tienes?');

      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
      fallback.href = url;
      window.open(url, '_blank', 'noopener');
      done.hidden = false;
    });
  }

  /* ========================================================================
     BOTÓN FLOTANTE · burbuja de ayuda una vez por sesión
     ======================================================================== */
  function initFab() {
    const fab = $('#fab');
    if (!fab) return;
    let seen = false;
    try { seen = sessionStorage.getItem('gh-tip') === '1'; } catch (e) { /* sin almacenamiento */ }
    if (seen) return;
    onReady(() => {
      setTimeout(() => {
        fab.classList.add('is-tip');
        try { sessionStorage.setItem('gh-tip', '1'); } catch (e) { /* sin almacenamiento */ }
        setTimeout(() => fab.classList.remove('is-tip'), 6000);
      }, 5000);
    });
  }

  /* ========================================================================
     ARRANQUE
     ======================================================================== */
  safe(initLoader);
  safe(initLenis);
  safe(initNav);
  safe(initReveal);
  safe(initHeroCanvas);
  safe(initStackTilt);
  safe(initScrollScenes);
  safe(initPointerFx);
  safe(initCounters);
  safe(initVideos);
  safe(initReviews);
  safe(initFaq);
  safe(initForm);
  safe(initFab);
  onReady(initCycle);

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
