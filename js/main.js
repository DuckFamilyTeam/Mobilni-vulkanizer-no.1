// Mobilni vulkanizer No1 — glavna skripta sajta
// Bez biblioteka: hamburger meni, senka zaglavlja pri skrolu, postepeno
// pojavljivanje sadrzaja pri skrolu (progresivno poboljsanje, vidi nize)
// i validacija kontakt forme. Obelezavanje trenutne stranice za tastaturu/
// citac ekrana je vec resen u HTML-u (aria-current).
(function () {
  'use strict';

  // --- 0. Glatko skrolovanje (Lenis) -----------------------------------
  // Zamenjuje oslanjanje na "scroll-behavior: smooth" (koje kod brzih
  // uzastopnih "klikova" tocka miša daje skokove umesto klizanja — vidi
  // napomenu u style.css). Lenis izgladjuje ulaz iz tocka/touchpad-a kroz
  // requestAnimationFrame, pa je pokret kontinuiran bez obzira na uredjaj.
  // Iskljuceno za prefers-reduced-motion i ako biblioteka iz nekog razloga
  // ne ucita se (npr. blokiran fajl) — tada ostaje obican, ispravan
  // podrazumevani skrol brausera, nikad slomljen.
  var reducedMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof window.Lenis === 'function' && !(reducedMotionQuery && reducedMotionQuery.matches)) {
    var lenis = new window.Lenis({
      duration: 1.0,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // --- 1. Mobilni meni ------------------------------------------------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('is-open');
    });

    // Esc zatvara meni i vraca fokus na dugme
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // --- 2. Senka zaglavlja pri skrolovanju ------------------------------
  var header = document.querySelector('.site-header');
  if (header) {
    var headerScrolled = false;
    var updateHeaderShadow = function () {
      var scrolled = window.scrollY > 8;
      if (scrolled !== headerScrolled) {
        header.classList.toggle('is-scrolled', scrolled);
        headerScrolled = scrolled;
      }
    };
    updateHeaderShadow();
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
  }

  // --- 3. Postepeno pojavljivanje elemenata pri skrolovanju ------------
  // Elementi su vidljivi po difoltu (vidi CSS); ovde ih tek privremeno
  // sakrivamo pre nego sto ih pratimo, tako da bez JS-a ili bez podrske
  // za IntersectionObserver ništa ne ostane trajno nevidljivo.
  var revealEls = document.querySelectorAll('.reveal');
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (revealEls.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    Array.prototype.forEach.call(revealEls, function (el) {
      el.classList.add('reveal-pending');
    });
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    Array.prototype.forEach.call(revealEls, function (el) {
      revealObserver.observe(el);
    });
  }

  // --- 4. Brojac koji se "penje" pri ulasku brojke u prikaz ------------
  // Ako nesto krene po zlu (nema IS podrske i sl.), tekst ostaje na
  // originalnoj, vec ispravnoj vrednosti iz HTML-a (npr. "~30 min").
  var countEls = document.querySelectorAll('[data-count]');
  if (countEls.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
    var countObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        observer.unobserve(entry.target);
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10);
        if (isNaN(target)) { return; }
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 1200;
        var startTime = null;
        function tick(ts) {
          if (startTime === null) { startTime = ts; }
          var progress = Math.min((ts - startTime) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = prefix + Math.round(eased * target) + suffix;
          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            el.textContent = prefix + target + suffix;
          }
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(countEls, function (el) { countObserver.observe(el); });
  }

  // --- 5. Vreme ucitavanja forme, za jednostavnu zastitu od botova ----
  var form = document.querySelector('.contact-form');
  if (!form) { return; }

  var loadedAt = Date.now();

  function setError(field, message) {
    var wrap = field.closest('.field');
    if (!wrap) { return; }
    var errorEl = wrap.querySelector('.error-text');
    wrap.classList.add('has-error');
    if (errorEl) { errorEl.textContent = message; }
    field.setAttribute('aria-invalid', 'true');
  }

  function clearError(field) {
    var wrap = field.closest('.field');
    if (!wrap) { return; }
    wrap.classList.remove('has-error');
    field.removeAttribute('aria-invalid');
  }

  function validateField(field) {
    if (!field.hasAttribute('required')) { return true; }
    var value = field.value.trim();
    if (!value) {
      setError(field, 'Ovo polje je obavezno.');
      return false;
    }
    if (field.type === 'tel') {
      var digits = value.replace(/[^0-9]/g, '');
      if (digits.length < 8) {
        setError(field, 'Unesite ispravan broj telefona.');
        return false;
      }
    }
    clearError(field);
    return true;
  }

  // Validacija na blur, ne dok korisnik kuca — manje laznih gresaka.
  Array.prototype.forEach.call(form.querySelectorAll('input[required], textarea[required]'), function (field) {
    field.addEventListener('blur', function () { validateField(field); });
  });

  form.addEventListener('submit', function (e) {
    var fields = form.querySelectorAll('input[required], textarea[required]');
    var valid = true;
    var firstInvalid = null;

    Array.prototype.forEach.call(fields, function (field) {
      if (!validateField(field)) {
        valid = false;
        if (!firstInvalid) { firstInvalid = field; }
      }
    });

    // Honeypot: polje koje ljudi ne vide, botovi cesto popune.
    var honeypot = form.querySelector('input[name="web"]');
    if (honeypot && honeypot.value) {
      e.preventDefault();
      return;
    }

    // Minimalno vreme popunjavanja — bot koji salje odmah se odbacuje.
    var elapsed = Date.now() - loadedAt;
    if (elapsed < 3000) {
      e.preventDefault();
      showStatus('error', 'Forma je poslata prebrzo. Sacekajte trenutak i pokusajte ponovo.');
      return;
    }

    if (!valid) {
      e.preventDefault();
      if (firstInvalid) { firstInvalid.focus(); }
      showStatus('error', 'Proverite obelezena polja pre slanja.');
    }
    // Ako je sve ispravno, forma se salje ka action atributu (spoljni servis).
  });

  function showStatus(type, message) {
    var status = form.querySelector('.form-status');
    if (!status) { return; }
    status.textContent = message;
    status.classList.remove('is-success', 'is-error');
    status.classList.add('is-visible', type === 'success' ? 'is-success' : 'is-error');
    status.setAttribute('role', 'alert');
  }
})();
