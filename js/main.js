// Guerra Impianti – script della pagina
(function () {
  const header = document.querySelector('.header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  const toTop = document.querySelector('.to-top');

  // Anno nel footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Menu mobile
  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri menu');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // "Torna su" e logo: l'header è sticky, quindi un link a #top non fa scorrere.
  // Scorriamo noi fino all'inizio della pagina.
  document.querySelectorAll('a[href="#top"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    closeMenu();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  }));

  // Header e pulsante "torna su" allo scroll
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    toTop.classList.toggle('is-visible', y > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Voce di menu attiva in base alla sezione visibile
  const links = [...nav.querySelectorAll('a[href^="#"]:not(.btn)')];
  const sections = links.map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const link = links.find(l => l.getAttribute('href') === '#' + entry.target.id);
      if (entry.isIntersecting) links.forEach(l => l.classList.toggle('is-active', l === link));
      else link.classList.remove('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));

  // Contatori animati
  const animateCount = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1600;
    const start = performance.now();
    const fmt = n => n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // Animazioni all'ingresso nella viewport
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealObs = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('[data-count]').forEach(el => {
        reduceMotion ? (el.textContent = parseFloat(el.dataset.count).toLocaleString('it-IT')) : animateCount(el);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 80 + 'ms';
    revealObs.observe(el);
  });

  // Slider hero
  const slider = document.querySelector('.slider');
  if (slider) {
    const slides = [...slider.querySelectorAll('.slide')];
    const dotsWrap = slider.querySelector('.slider__dots');
    const INTERVAL = 7000; // millisecondi tra una slide e l'altra
    let current = 0;
    let timer = null;

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.className = 'slider__dot';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Vai alla slide ' + (i + 1));
      b.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });

    const go = i => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, j) => {
        const active = j === current;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', String(!active));
        s.querySelectorAll('a, button').forEach(el => (el.tabIndex = active ? 0 : -1));
        dots[j].setAttribute('aria-selected', String(active));
      });
      slider.classList.toggle('is-dark', slides[current].classList.contains('slide--dark'));
      slides[current].querySelectorAll('[data-count]').forEach(el => {
        reduceMotion ? (el.textContent = parseFloat(el.dataset.count).toLocaleString('it-IT')) : animateCount(el);
      });
    };

    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => { if (!reduceMotion && !timer) timer = setInterval(() => go(current + 1), INTERVAL); };
    const restart = () => { stop(); start(); };

    slider.querySelectorAll('.slider__arrow').forEach(btn =>
      btn.addEventListener('click', () => { go(current + Number(btn.dataset.dir)); restart(); })
    );

    // Pausa al passaggio del mouse o quando un elemento ha il focus
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', start);

    // Swipe su touch
    let startX = null;
    slider.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { go(current + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    // Frecce da tastiera quando il focus è nello slider
    slider.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { go(current + 1); restart(); }
      if (e.key === 'ArrowLeft') { go(current - 1); restart(); }
    });

    go(0);
    start();
  }

  // Pulsante "Condividi" nativo (telefoni e browser che lo supportano)
  const shareBtn = document.querySelector('.share-btn--native');
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', () => {
      const canonical = document.querySelector('link[rel="canonical"]');
      navigator.share({
        title: document.title,
        text: 'Guerra Impianti – fotovoltaico, pompe di calore, domotica e allarmi a Reggio Emilia',
        url: canonical ? canonical.href : location.href
      }).catch(() => {}); // l'utente ha annullato
    });
  }

  // Modulo contatti (modalità demo: nessun invio reale)
  const form = document.querySelector('.form');
  const status = form.querySelector('.form__status');
  form.addEventListener('submit', e => {
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      const ok = field.type === 'checkbox' ? field.checked : field.checkValidity();
      field.classList.toggle('is-invalid', !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      e.preventDefault();
      status.className = 'form__status err';
      status.textContent = 'Controlla i campi evidenziati.';
      return;
    }
    if (form.hasAttribute('data-demo')) {
      e.preventDefault();
      status.className = 'form__status ok';
      status.textContent = 'Grazie! Ti ricontatteremo al più presto.';
      form.reset();
    }
  });
  form.addEventListener('input', e => e.target.classList.remove('is-invalid'));
})();
