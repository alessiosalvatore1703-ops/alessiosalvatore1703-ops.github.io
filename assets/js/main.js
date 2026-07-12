// Site-wide behavior. The hero scene lives in assets/js/hero.js (three.js module).

// Footer year
(function () {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Scroll reveals: sections and cards fade-rise on first view. The attribute is
// added here (not in HTML) so content stays visible without JS.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('section article, .section-label');
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  let stagger = 0;
  targets.forEach(function (el) {
    el.setAttribute('data-reveal', '');
    // stagger siblings inside the same grid so card rows cascade
    const siblings = el.parentElement ? el.parentElement.children : [];
    let idx = 0;
    for (let i = 0; i < siblings.length; i++) if (siblings[i] === el) { idx = i; break; }
    el.style.transitionDelay = (Math.min(idx, 5) * 70) + 'ms';
    io.observe(el);
  });
})();

// Magnetic buttons: hero links and the nav CV chip lean toward a fine pointer.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const buttons = document.querySelectorAll('nav a[href$="cv.pdf"], section a.border');
  buttons.forEach(function (btn) {
    btn.classList.add('magnetic');
    btn.addEventListener('mousemove', function (e) {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.18 + 'px)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = '';
    });
  });
})();

// Lazy video autoplay: project videos (preload="none" + poster) play only near
// the viewport; reduced-motion users get a tappable player instead.
(function () {
  const videos = document.querySelectorAll('video[data-autoplay]');
  if (!videos.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)) {
    videos.forEach(function (video) {
      video.controls = true;
      video.preload = 'metadata';
    });
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.play().catch(function () {
          // Autoplay blocked (e.g. iOS Low Power Mode) — let the user tap.
          entry.target.controls = true;
        });
      } else {
        entry.target.pause();
      }
    }
  }, { rootMargin: '200px 0px' });

  videos.forEach(function (video) { io.observe(video); });
})();
