(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ========================================================================
     LOADER
     ======================================================================== */
  const loader = document.getElementById('loader');
  const loaderNum = document.getElementById('loader-num');

  function runLoader() {
    if (!loader) return;
    if (prefersReduced) {
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 50);
      return;
    }
    let pct = 0;
    const duration = 1100;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      pct = Math.min(100, Math.round((elapsed / duration) * 100));
      if (loaderNum) loaderNum.textContent = pct;
      const arc = loader.querySelector('.loader__arc');
      if (arc) arc.style.strokeDashoffset = String(100 - pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        loader.classList.add('is-done');
        startHeroEntrance();
        setTimeout(() => loader.remove(), 650);
      }
    }
    requestAnimationFrame(tick);
  }

  /* ========================================================================
     SPLIT TEXT (titulares con revelado por palabra)
     ======================================================================== */
  function splitWords(el) {
    if (!el || el.dataset.splitDone) return;
    const text = el.textContent.trim();
    el.innerHTML = '';
    const words = text.split(/\s+/);
    words.forEach((w, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word__inner';
      inner.style.setProperty('--i', i);
      inner.textContent = w;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.splitDone = 'true';
  }

  function splitAccentAware(el) {
    // Preserva <span class="accent">palabra</span> dentro del titular al dividir por palabras.
    if (!el || el.dataset.splitDone) return;
    const accent = el.querySelector('.accent');
    if (!accent) return splitWords(el);
    const accentText = accent.textContent;
    const before = [];
    const after = [];
    let seenAccent = false;
    el.childNodes.forEach((node) => {
      if (node === accent) { seenAccent = true; return; }
      (seenAccent ? after : before).push(node.textContent || '');
    });
    const beforeWords = before.join('').trim().split(/\s+/).filter(Boolean);
    const afterWords = after.join('').trim().split(/\s+/).filter(Boolean);
    el.innerHTML = '';
    let i = 0;
    const appendWord = (word, isAccent) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word__inner';
      inner.style.setProperty('--i', i++);
      if (isAccent) inner.classList.add('accent');
      inner.textContent = word;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(' '));
    };
    const accentWords = accentText.trim().split(/\s+/).filter(Boolean);
    beforeWords.forEach((w) => appendWord(w, false));
    accentWords.forEach((w) => appendWord(w, true));
    afterWords.forEach((w) => appendWord(w, false));
    el.dataset.splitDone = 'true';
  }

  const heroTitle = document.querySelector('[data-hero-split]');
  if (heroTitle) splitAccentAware(heroTitle);
  document.querySelectorAll('[data-split]').forEach(splitWords);

  function startHeroEntrance() {
    if (!heroTitle) return;
    heroTitle.classList.add('is-split');
    const lead = document.querySelector('.hero__lead');
    const cta = document.querySelector('.hero__cta');
    if (lead) lead.classList.add('is-visible');
    if (cta) cta.classList.add('is-visible');
  }

  /* ========================================================================
     REVEAL ON SCROLL (IntersectionObserver, sin listeners de scroll)
     ======================================================================== */
  const revealEls = document.querySelectorAll('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible', 'is-split');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible', 'is-split'));
  }

  /* ========================================================================
     HEADER: estado "scrolled" vía sentinel (sin scroll listener)
     ======================================================================== */
  const header = document.getElementById('site-header');
  const sentinel = document.getElementById('inicio');
  if (header && sentinel && 'IntersectionObserver' in window) {
    const headerObserver = new IntersectionObserver(
      ([entry]) => header.classList.toggle('is-scrolled', entry.intersectionRatio < 0.9),
      { threshold: [0, 0.9] }
    );
    headerObserver.observe(sentinel);
  }

  /* ========================================================================
     SCROLLSPY DE NAV (IntersectionObserver)
     ======================================================================== */
  const navLinks = Array.from(document.querySelectorAll('.nav__list a'));
  const navSections = navLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (navSections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navLinks.find((a) => a.getAttribute('href') === `#${entry.target.id}`);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navSections.forEach((s) => spy.observe(s));
  }

  /* ========================================================================
     MENÚ MÓVIL
     ======================================================================== */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobile-menu');

  function closeMobileMenu() {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('inert', '');
    document.documentElement.style.overflow = '';
  }
  function openMobileMenu() {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('is-open');
    mobileMenu.removeAttribute('inert');
    document.documentElement.style.overflow = 'hidden';
  }
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = burger.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMobileMenu() : openMobileMenu();
    });
    mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  /* ========================================================================
     BOTONES MAGNÉTICOS
     ======================================================================== */
  if (!prefersReduced && !isCoarsePointer) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      let raf = null;
      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        });
      });
      btn.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        btn.style.transform = '';
      });
    });
  }

  /* ========================================================================
     SPOTLIGHT / TILT EN TARJETAS DE SERVICIOS
     ======================================================================== */
  if (!prefersReduced && !isCoarsePointer) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--mx', `${mx}%`);
        card.style.setProperty('--my', `${my}%`);
        const rx = ((my - 50) / 50) * -4;
        const ry = ((mx - 50) / 50) * 4;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ========================================================================
     CANVAS DEL HERO: humo ambiental
     ======================================================================== */
  const canvas = document.getElementById('hero-canvas');
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext('2d');
    let w, h, particles, dpr, rafId;
    const COLORS = ['94,234,160', '201,166,107', '243,241,234'];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle() {
      return {
        x: Math.random() * w,
        y: h + Math.random() * 120,
        r: 40 + Math.random() * 90,
        speed: 0.12 + Math.random() * 0.22,
        drift: (Math.random() - 0.5) * 0.25,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.03 + Math.random() * 0.05,
      };
    }

    function init() {
      resize();
      const count = w < 768 ? 10 : 18;
      particles = Array.from({ length: count }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -p.r) Object.assign(p, makeParticle(), { y: h + p.r });
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(${p.color},${p.alpha})`);
        grad.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    }

    init();
    draw();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        draw();
      }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(init, 200);
    });
  }

  /* ========================================================================
     ACORDEÓN DE PREGUNTAS FRECUENTES
     ======================================================================== */
  document.querySelectorAll('.faq-item__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      item.classList.toggle('is-open', !isOpen);
    });
  });

  /* ========================================================================
     CARRUSEL DE TESTIMONIOS
     ======================================================================== */
  const track = document.getElementById('testi-track');
  const prevBtn = document.getElementById('testi-prev');
  const nextBtn = document.getElementById('testi-next');
  if (track && prevBtn && nextBtn) {
    const scrollByCard = (dir) => {
      const card = track.querySelector('.testi');
      if (!card) return;
      const amount = card.getBoundingClientRect().width + 20;
      track.scrollBy({ left: dir * amount, behavior: prefersReduced ? 'auto' : 'smooth' });
    };
    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));
  }

  /* ========================================================================
     FORMULARIO DE CONTACTO → WHATSAPP
     ======================================================================== */
  const WHATSAPP_NUMBER = '523326287517';
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const nameInput = document.getElementById('f-name');
    const phoneInput = document.getElementById('f-phone');
    const serviceInput = document.getElementById('f-service');
    const notesInput = document.getElementById('f-notes');
    const nameErr = document.getElementById('f-name-err');
    const phoneErr = document.getElementById('f-phone-err');
    const formErr = document.getElementById('contact-err');
    const doneBox = document.getElementById('contact-done');
    const fallbackLink = document.getElementById('contact-fallback');

    function setError(field, errEl, msg) {
      field.closest('.field').classList.toggle('has-error', Boolean(msg));
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
    }

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      if (!nameInput.value.trim()) {
        setError(nameInput, nameErr, 'Cuéntanos cómo te llamas.');
        valid = false;
      } else {
        setError(nameInput, nameErr, '');
      }

      const digits = phoneInput.value.replace(/\D/g, '');
      if (digits.length < 10) {
        setError(phoneInput, phoneErr, 'Agrega un WhatsApp a 10 dígitos.');
        valid = false;
      } else {
        setError(phoneInput, phoneErr, '');
      }

      if (!valid) {
        formErr.textContent = 'Revisa los campos marcados antes de continuar.';
        formErr.hidden = false;
        return;
      }
      formErr.hidden = true;

      const lines = [
        `Hola, soy ${nameInput.value.trim()}.`,
        `Quiero agendar una cita en Garritas de Humo.`,
        `Servicio de interés: ${serviceInput.value}.`,
        `Mi WhatsApp: ${phoneInput.value.trim()}.`,
      ];
      if (notesInput.value.trim()) lines.push(`Idea: ${notesInput.value.trim()}.`);

      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join(' '))}`;
      fallbackLink.href = url;
      window.open(url, '_blank', 'noopener,noreferrer');

      doneBox.hidden = false;
      contactForm.querySelector('button[type="submit"]').hidden = true;
    });
  }

  /* ========================================================================
     AÑO EN EL FOOTER
     ======================================================================== */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ========================================================================
     ARRANQUE
     ======================================================================== */
  if (document.readyState === 'complete') {
    runLoader();
  } else {
    window.addEventListener('load', runLoader);
  }
})();
