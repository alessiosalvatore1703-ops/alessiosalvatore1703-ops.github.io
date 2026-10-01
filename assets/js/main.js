// Site-wide behavior.

// Footer year
(function () {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Video autoplay: project videos (preload="none" + poster) loop while near the
// viewport and pause off-screen; reduced-motion users get a tappable player instead.
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
