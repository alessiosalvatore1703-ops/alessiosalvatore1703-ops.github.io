// Site-wide behavior. The hero scene lives in assets/js/hero.js.

// Footer year
(function () {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
