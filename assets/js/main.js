// Hero: a hairline 3-link robot arm solves inverse kinematics toward the
// cursor (FABRIK). Idles on a slow patrol path when the pointer is away;
// draws a single static pose when reduced motion is set.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const STROKE = 'rgba(18, 18, 18, 0.16)';
  const STROKE_SOFT = 'rgba(18, 18, 18, 0.07)';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  let width, height, dpr;
  let base, lengths, joints;
  let target = null;   // eased end-effector goal
  let cursor = null;   // live pointer position, null while idle
  let t = 0;           // idle-patrol clock

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    base = { x: width * 0.58, y: height + 6 };
    const scale = Math.min(width, 1100) / 1100;
    lengths = [260 * scale, 200 * scale, 130 * scale];
    joints = [
      { x: base.x, y: base.y },
      { x: base.x - lengths[0] * 0.5, y: base.y - lengths[0] * 0.85 },
      { x: base.x - lengths[0] * 0.5 - lengths[1] * 0.9, y: base.y - lengths[0] * 0.85 - lengths[1] * 0.3 },
      { x: base.x - lengths[0] * 0.5 - lengths[1] * 0.9 - lengths[2], y: base.y - lengths[0] * 0.85 - lengths[1] * 0.3 - lengths[2] * 0.2 },
    ];
    target = { x: joints[3].x, y: joints[3].y };
    if (reducedMotion) { solve(target); render(); }
  }

  function idleTarget() {
    // slow figure-of-eight patrol in the arm's comfortable workspace
    const cx = base.x - lengths[0] * 0.9;
    const cy = base.y - lengths[0] * 1.05;
    return {
      x: cx + Math.sin(t * 0.35) * width * 0.16,
      y: cy + Math.sin(t * 0.7) * height * 0.12,
    };
  }

  function solve(goal) {
    // clamp goal into reach
    const reach = lengths[0] + lengths[1] + lengths[2] - 4;
    const dx = goal.x - base.x, dy = goal.y - base.y;
    const d = Math.hypot(dx, dy);
    const g = d > reach ? { x: base.x + (dx / d) * reach, y: base.y + (dy / d) * reach } : goal;

    // FABRIK, a few passes
    for (let iter = 0; iter < 6; iter++) {
      // backward
      joints[3] = { x: g.x, y: g.y };
      for (let i = 2; i >= 0; i--) {
        const r = Math.hypot(joints[i].x - joints[i + 1].x, joints[i].y - joints[i + 1].y) || 1;
        const l = lengths[i] / r;
        joints[i] = {
          x: joints[i + 1].x + (joints[i].x - joints[i + 1].x) * l,
          y: joints[i + 1].y + (joints[i].y - joints[i + 1].y) * l,
        };
      }
      // forward
      joints[0] = { x: base.x, y: base.y };
      for (let i = 0; i < 3; i++) {
        const r = Math.hypot(joints[i + 1].x - joints[i].x, joints[i + 1].y - joints[i].y) || 1;
        const l = lengths[i] / r;
        joints[i + 1] = {
          x: joints[i].x + (joints[i + 1].x - joints[i].x) * l,
          y: joints[i].y + (joints[i + 1].y - joints[i].y) * l,
        };
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.5;

    // reach envelope
    ctx.strokeStyle = STROKE_SOFT;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(base.x, base.y, lengths[0] + lengths[1] + lengths[2], Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = STROKE;

    // base plate
    ctx.beginPath();
    ctx.moveTo(base.x - 34, base.y);
    ctx.lineTo(base.x + 34, base.y);
    ctx.moveTo(base.x - 22, base.y);
    ctx.lineTo(base.x - 14, base.y - 14);
    ctx.lineTo(base.x + 14, base.y - 14);
    ctx.lineTo(base.x + 22, base.y);
    ctx.stroke();

    // links
    ctx.beginPath();
    ctx.moveTo(joints[0].x, joints[0].y - 14);
    for (let i = 1; i < 4; i++) ctx.lineTo(joints[i].x, joints[i].y);
    ctx.stroke();

    // joints
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(joints[i].x, joints[i].y, 7, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // gripper: two prongs continuing the last link's direction
    const a = Math.atan2(joints[3].y - joints[2].y, joints[3].x - joints[2].x);
    const spread = 0.5;
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(joints[3].x, joints[3].y);
      ctx.lineTo(
        joints[3].x + Math.cos(a + s * spread) * 18,
        joints[3].y + Math.sin(a + s * spread) * 18
      );
    }
    ctx.stroke();
  }

  function tick() {
    t += 1 / 60;
    const goal = cursor || idleTarget();
    // ease toward the goal so the arm moves like a servo, not a laser pointer
    target.x += (goal.x - target.x) * 0.06;
    target.y += (goal.y - target.y) * 0.06;
    solve(target);
    render();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();

  if (!reducedMotion) {
    if (finePointer) {
      const hero = canvas.parentElement;
      hero.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      });
      hero.addEventListener('mouseleave', function () { cursor = null; });
    }
    requestAnimationFrame(tick);
  }
})();

// Agibot X2 card: the stereo-camera pupils track the cursor — it's a
// person-follower. Pupils stay inside their housings (max 12 SVG units).
(function () {
  const card = document.getElementById('card-agibot');
  if (!card) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pupils = card.querySelectorAll('.egg-pupil');
  const svg = card.querySelector('svg');
  if (!svg || !pupils.length) return;

  card.addEventListener('mousemove', function (e) {
    const rect = svg.getBoundingClientRect();
    // pointer in SVG user units (viewBox is 800x500)
    const px = ((e.clientX - rect.left) / rect.width) * 800;
    const py = ((e.clientY - rect.top) / rect.height) * 500;
    pupils.forEach(function (p) {
      const cx = +p.getAttribute('cx');
      const cy = +p.getAttribute('cy');
      const dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy) || 1;
      const r = Math.min(d, 12);
      p.style.transform = 'translate(' + (dx / d) * r + 'px,' + (dy / d) * r + 'px)';
    });
  });
  card.addEventListener('mouseleave', function () {
    pupils.forEach(function (p) { p.style.transform = ''; });
  });
})();

// Footer year
(function () {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();
