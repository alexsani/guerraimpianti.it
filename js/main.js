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

  // Link all'indirizzo: su iPhone/iPad apre Mappe di Apple, su Android il link geo:
  // fa scegliere l'app di navigazione installata (Google Maps, Waze…).
  // Su computer resta Google Maps in una nuova scheda.
  const mapLink = document.querySelector('.js-map-link');
  if (mapLink) {
    const address = 'Via Tedeschi 1, 42124 Reggio Emilia RE';
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    if (isIOS || isAndroid) {
      mapLink.href = isIOS
        ? 'https://maps.apple.com/?q=' + encodeURIComponent(address)
        : 'geo:0,0?q=' + encodeURIComponent(address);
      mapLink.removeAttribute('target');
      mapLink.setAttribute('aria-label', 'Via Tedeschi, 1 - 42124 Reggio Emilia (RE): apri nelle mappe');
    }
  }

  // Indirizzo sempre allineato alla sezione visibile: quando lo scroll si ferma
  // aggiorniamo l'#ancora (senza aggiungere voci alla cronologia), così ricaricando
  // la pagina si resta dove si era. Sopra la prima sezione l'ancora viene tolta.
  const hashSections = [...document.querySelectorAll('main section[id]')];
  let hashTimer;
  const syncHash = () => {
    const offset = header.offsetHeight + 80;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = null;
    if (atBottom) current = hashSections[hashSections.length - 1];
    else hashSections.forEach(s => { if (s.getBoundingClientRect().top <= offset) current = s; });
    const hash = current ? '#' + current.id : '';
    if (hash !== location.hash) history.replaceState(null, '', location.pathname + location.search + hash);
  };
  window.addEventListener('scroll', () => {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(syncHash, 200);
  }, { passive: true });

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
  // Regole: nome e cognome, almeno un recapito (telefono o email), messaggio,
  // risposta alla verifica anti-spam e consenso privacy obbligatori.
  // Gli errori compaiono sotto i campi solo dopo il tentativo di invio
  // e spariscono appena il campo viene corretto.
  const form = document.querySelector('.form');
  if (form) {
    const status = form.querySelector('.form__status');
    const f = name => form.elements[name];
    const err = id => form.querySelector('#err-' + id);
    const captchaQ = form.querySelector('.captcha__q');
    const MIN_SECONDS = 3;          // un umano impiega più di 3 secondi a compilare
    let captchaAnswer = 7;
    let openedAt = Date.now();
    let submitted = false;          // dopo il primo tentativo la validazione diventa "dal vivo"

    const newCaptcha = () => {
      const a = 1 + Math.floor(Math.random() * 9);
      const b = 1 + Math.floor(Math.random() * 9);
      captchaAnswer = a + b;
      captchaQ.textContent = `${a} + ${b}`;
      f('verifica').value = '';
    };
    newCaptcha();

    const phoneOk = v => /^\+?[\d\s./-]{6,20}$/.test(v) && v.replace(/\D/g, '').length >= 6;

    // mostra/nasconde il messaggio sotto un campo e lo evidenzia in rosso
    const setError = (fieldName, errId, message) => {
      const field = f(fieldName), box = err(errId);
      const bad = !!message;
      field.classList.toggle('is-invalid', bad);
      field.setAttribute('aria-invalid', String(bad));
      if (box) { box.hidden = !bad; if (bad) box.textContent = message; }
      return !bad;
    };

    // ogni regola restituisce il messaggio d'errore oppure '' se il campo è valido
    const checks = {
      nome: () => setError('nome', 'nome', f('nome').value.trim().length >= 2 ? '' : 'Obbligatorio'),
      recapito: () => {
        const tel = f('telefono').value.trim(), email = f('email').value.trim();
        const groupBox = err('recapito');
        if (!tel && !email) {
          setError('telefono', 'telefono', ''); setError('email', 'email', '');
          f('telefono').classList.add('is-invalid'); f('email').classList.add('is-invalid');
          f('telefono').setAttribute('aria-invalid', 'true'); f('email').setAttribute('aria-invalid', 'true');
          groupBox.hidden = false;
          return false;
        }
        groupBox.hidden = true;
        const okTel = setError('telefono', 'telefono', !tel || phoneOk(tel) ? '' : 'Numero di telefono non valido');
        const okEmail = setError('email', 'email', !email || f('email').checkValidity() ? '' : 'Indirizzo email non valido');
        return okTel && okEmail;
      },
      messaggio: () => setError('messaggio', 'messaggio', f('messaggio').value.trim().length >= 5 ? '' : 'Obbligatorio'),
      verifica: () => {
        const v = f('verifica').value.trim();
        return setError('verifica', 'verifica', !v ? 'Obbligatorio' : (Number(v) === captchaAnswer ? '' : 'Risposta non corretta'));
      },
      privacy: () => setError('privacy', 'privacy', f('privacy').checked ? '' : 'Obbligatorio'),
    };
    const fieldToCheck = { nome: 'nome', telefono: 'recapito', email: 'recapito', messaggio: 'messaggio', verifica: 'verifica', privacy: 'privacy' };

    const clearAll = () => {
      form.querySelectorAll('.is-invalid').forEach(x => { x.classList.remove('is-invalid'); x.removeAttribute('aria-invalid'); });
      form.querySelectorAll('.field-error').forEach(x => { x.hidden = true; });
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitted = true;
      const results = Object.values(checks).map(fn => fn());
      if (results.includes(false)) {
        status.className = 'form__status err';
        status.textContent = 'Controlla i campi segnalati.';
        form.querySelector('.is-invalid')?.focus();
        return;
      }

      // Anti-spam silenzioso: campo trappola compilato o invio troppo rapido = bot
      if (f('_gotcha').value || (Date.now() - openedAt) / 1000 < MIN_SECONDS) {
        status.className = 'form__status err';
        status.textContent = 'Invio non riuscito, attendi qualche secondo e riprova.';
        return;
      }

      if (form.hasAttribute('data-demo')) {
        showSuccess();
      } else {
        // invio reale al servizio indicato in action (es. Formspree), senza lasciare la pagina
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        status.className = 'form__status'; status.textContent = 'Invio in corso…';
        fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(res => { if (!res.ok) throw new Error(res.status); showSuccess(); })
          .catch(() => {
            status.className = 'form__status err';
            status.textContent = 'Invio non riuscito. Riprova o contattaci per telefono o email.';
          })
          .finally(() => { btn.disabled = false; });
      }
    });

    // Conferma: il modulo lascia il posto a un riquadro "Grazie per averci contattato!"
    const success = form.querySelector('.form__success');
    function showSuccess() {
      form.reset();
      clearAll();
      status.textContent = ''; status.className = 'form__status';
      form.classList.add('is-sent');
      success.hidden = false;
      success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      success.querySelector('h3').focus({ preventScroll: true });
    }
    form.querySelector('.form__again').addEventListener('click', () => {
      success.hidden = true;
      form.classList.remove('is-sent');
      newCaptcha();
      submitted = false;
      openedAt = Date.now();
      f('nome').focus();
    });

    // dopo il primo tentativo, ricontrollo il campo mentre l'utente lo corregge
    const live = e => {
      if (!submitted) return;
      const check = fieldToCheck[e.target.name];
      if (check) checks[check]();
      if (!form.querySelector('.is-invalid')) { status.textContent = ''; status.className = 'form__status'; }
    };
    form.addEventListener('input', live);
    form.addEventListener('change', live);
  }
})();
