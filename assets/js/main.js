// Hero voxel grid: resolution refines near the pointer — a nod to task-aware
// adaptive-resolution 3D mapping. Static fallback when reduced motion is set
// or no fine pointer is available.
(function () {
  const canvas = document.getElementById('voxel-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const INK = '14, 27, 44';      // #0E1B2C
  const ACCENT = '234, 90, 11';  // #EA5A0B
  const BASE = 56;               // coarse cell size in px

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  let width, height, dpr;
  // Static focus point (used until the pointer moves, and always in fallback mode)
  let focus = { x: 0, y: 0 };
  let raf = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focus = { x: width * 0.72, y: height * 0.45 };
    draw();
  }

  // Deterministic per-cell hash so the pattern is stable across redraws
  function hash(i, j) {
    let h = (i * 374761393 + j * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  function drawCell(x, y, size, alpha, accent) {
    ctx.strokeStyle = `rgba(${accent ? ACCENT : INK}, ${alpha})`;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    const cols = Math.ceil(width / BASE);
    const rows = Math.ceil(height / BASE);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * BASE;
        const y = j * BASE;
        const cx = x + BASE / 2;
        const cy = y + BASE / 2;
        const d = Math.hypot(cx - focus.x, cy - focus.y);
        const r = hash(i, j);

        if (d < 130) {
          // fine resolution: 4x4 subdivision
          const s = BASE / 4;
          for (let a = 0; a < 4; a++) {
            for (let b = 0; b < 4; b++) {
              const rr = hash(i * 4 + a, j * 4 + b);
              if (rr < 0.55) {
                drawCell(x + a * s, y + b * s, s, 0.10, rr > 0.51);
              }
            }
          }
        } else if (d < 260) {
          // mid resolution: 2x2 subdivision
          const s = BASE / 2;
          for (let a = 0; a < 2; a++) {
            for (let b = 0; b < 2; b++) {
              if (hash(i * 2 + a, j * 2 + b) < 0.45) {
                drawCell(x + a * s, y + b * s, s, 0.07, false);
              }
            }
          }
        } else if (r < 0.30) {
          drawCell(x, y, BASE, 0.05, false);
        }
      }
    }
  }

  window.addEventListener('resize', resize);

  if (!reducedMotion && finePointer) {
    const hero = canvas.parentElement;
    hero.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      focus.x = e.clientX - rect.left;
      focus.y = e.clientY - rect.top;
      if (!raf) {
        raf = requestAnimationFrame(function () {
          raf = null;
          draw();
        });
      }
    });
  }

  resize();
})();

// Footer year
(function () {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
