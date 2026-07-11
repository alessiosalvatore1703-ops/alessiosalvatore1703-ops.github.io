// Hero: the Creation of Adam, robotics edition. A robotic hand (Adam's drooping
// receiving pose, left) and a human hand (God's reaching pose, right, traced from
// the public-domain fresco) nearly touch; a small spark shimmers in the gap.
// The hands breathe so the gap pulses; a fine pointer near the gap draws them
// closer and brightens the spark. Hands draw themselves on load.
// Reduced motion: one static frame, no loop.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const INK = '18, 18, 18';
  const STROKE_ALPHA = 0.55;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // ---- Artwork, authored in a 1000x400 design space (traced from the
  //      PD Wikimedia crop of the fresco; robot hand original). ----

  const HUMAN_PATHS = new Path2D(
    // continuous silhouette: forearm top -> index -> middle finger -> thumb -> heel -> forearm underside
    'M 1000 131 C 920 146 840 160 760 172 C 730 177 700 181 672 185' +
    ' C 650 188 630 190 612 194 C 570 200 520 208 490 217 C 487 218 485 221 487 223' +
    ' C 505 222 528 220 548 220 C 562 220 576 222 584 224 C 587 225 588 226 588 227' +
    ' C 570 227 552 230 538 234 C 533 236 532 239 536 241 C 550 242 568 242 582 241' +
    ' C 590 241 594 243 592 247 C 586 253 578 261 571 267 C 567 271 567 274 572 275' +
    ' C 583 274 596 266 608 258 C 630 249 648 242 662 238 C 682 231 696 226 710 222' +
    ' C 780 213 880 208 1000 205' +
    ' M 604 234 C 610 240 610 248 604 254' +   // ring finger hint
    ' M 700 180 C 696 190 694 200 696 212' +   // wrist fold
    ' M 545 214 C 546 217 546 220 545 222'     // index knuckle crease
  );

  const ROBOT_LINES = new Path2D(
    'M 0 227 C 60 210 120 190 166 174' +       // forearm top
    ' M 0 295 C 65 282 128 254 180 212' +      // forearm underside
    ' M 90 216 L 102 244' +                    // fiducial tick
    ' M 204 174 L 280 178 L 322 190 L 330 210 L 314 228 L 240 226 L 208 204 Z' + // palm plate
    ' M 346 201 L 388 213 M 403 219 L 430 227 M 442 231 L 454 234' +  // index segments
    ' M 337 223 L 382 248 M 393 257 L 406 264' +                      // middle finger
    ' M 318 237 L 352 260' +                                          // ring finger
    ' M 269 239 L 284 258'                                            // thumb
  );

  // [cx, cy, r] joint circles
  const ROBOT_JOINTS = [
    [192, 184, 13],                            // wrist
    [338, 198, 8], [396, 216, 7], [436, 229, 6], [458, 235, 3],  // index chain + tip
    [332, 218, 7], [389, 252, 6], [411, 267, 4],                 // middle
    [314, 232, 6], [358, 264, 5],                                // ring
    [266, 234, 6], [288, 263, 5],                                // thumb
  ];

  // fingertip anchors for the spark, in design coords
  const TIP_ROBOT = { x: 462, y: 236 };
  const TIP_HUMAN = { x: 484, y: 221 };

  // dash length covering the longest subpath (design units), for the draw-on
  const DASH_L = 1700;

  // ---- State ----
  let width, height, dpr, s, ox, oy;   // scale + design-space offset
  let t = 0;
  let entrance = reducedMotion ? 1 : 0; // 0..1 draw-on progress
  let closeness = 0;                    // eased cursor-proximity factor 0..1
  let cursor = null;
  let arcOld = null, arcNew = null, arcAge = 0;
  const ARC_PERIOD = 0.4;               // seconds between regenerations

  // spark dots easing through the gap
  const DOTS = [];
  for (let i = 0; i < 4; i++) {
    DOTS.push({ t: i / 4, speed: 0.25 + 0.1 * ((i * 37) % 3), phase: i * 2.1 });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // scene band: lower part of the hero, full width
    const bandH = Math.min(height * 0.5, 340);
    s = Math.min((width * 0.92) / 1000, bandH / 400);
    ox = (width - 1000 * s) / 2;
    oy = height - 400 * s - 10;

    arcOld = arcNew = null;
    if (reducedMotion) renderStatic();
  }

  // design -> canvas
  function dx(x) { return ox + x * s; }
  function dy(y) { return oy + y * s; }

  // Current fingertip positions incl. breathing / cursor approach (canvas coords).
  // Hands slide along the gap chord; positive u moves them apart.
  function handShift() {
    const breathe = reducedMotion ? 0 : Math.sin((t * 2 * Math.PI) / 5) * 2;
    return breathe - closeness * 2;  // px, applied ± along the chord
  }

  function tips() {
    const u = handShift();
    const ax = dx(TIP_ROBOT.x), ay = dy(TIP_ROBOT.y);
    const bx = dx(TIP_HUMAN.x), by = dy(TIP_HUMAN.y);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (bx - ax) / len, ny = (by - ay) / len;
    return {
      a: { x: ax - nx * u, y: ay - ny * u },
      b: { x: bx + nx * u, y: by + ny * u },
      shift: u, nx: nx, ny: ny,
    };
  }

  // ---- Spark: midpoint-displacement micro-arc, slowly regenerated ----
  function makeArc(a, b) {
    let pts = [a, b];
    const gap = Math.hypot(b.x - a.x, b.y - a.y);
    let amp = Math.min(gap * 0.22, 3.2);
    for (let round = 0; round < 3; round++) {
      const next = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i];
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        // fraction along the whole chord, for the endpoint envelope
        const f = (next.length - 0.5) / (pts.length - 1);
        const env = Math.sin(Math.PI * Math.min(Math.max(f, 0), 1));
        const ang = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
        const d = (Math.random() * 2 - 1) * amp * env;
        next.push({ x: mx + Math.cos(ang) * d, y: my + Math.sin(ang) * d });
        next.push(q);
      }
      pts = next;
      amp /= 2;
    }
    return pts;
  }

  function drawArc(pts, alpha) {
    if (!pts || alpha <= 0.01) return;
    ctx.strokeStyle = 'rgba(' + INK + ', ' + alpha + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawSpark(dt) {
    const g = tips();
    // spark strength: base + brighter when hands are closer (breathing/cursor)
    const strength = 0.45 + 0.3 * Math.max(0, -g.shift / 4) + 0.35 * closeness;

    arcAge += dt;
    if (!arcNew || arcAge >= ARC_PERIOD) {
      arcOld = arcNew;
      arcNew = makeArc(g.a, g.b);
      arcAge = 0;
    }
    const f = arcAge / ARC_PERIOD; // cross-fade old -> new
    drawArc(arcOld, 0.55 * strength * (1 - f));
    drawArc(arcNew, 0.55 * strength * f);

    // endpoint dots at the two fingertips
    ctx.fillStyle = 'rgba(' + INK + ', ' + (0.7 * strength) + ')';
    for (const p of [g.a, g.b]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // dots easing through the gap with a lens envelope
    for (const d of DOTS) {
      d.t += dt * d.speed;
      const u = (Math.sin(d.t * Math.PI * 2 + d.phase) + 1) / 2; // ping-pong 0..1
      const lens = Math.sin(u * Math.PI);
      const px = g.a.x + (g.b.x - g.a.x) * u - g.ny * lens * 5 * Math.sin(d.phase + t);
      const py = g.a.y + (g.b.y - g.a.y) * u + g.nx * lens * 5 * Math.sin(d.phase + t);
      ctx.fillStyle = 'rgba(' + INK + ', ' + (0.5 * lens * strength) + ')';
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // ---- Hands ----
  function drawHands() {
    const g = tips();
    ctx.lineWidth = 1.75;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(' + INK + ', ' + STROKE_ALPHA + ')';

    // entrance draw-on via line dash (human first, robot trailing)
    const eHuman = reducedMotion ? 1 : Math.min(1, entrance / 0.8);
    const eRobot = reducedMotion ? 1 : Math.min(1, Math.max(0, (entrance - 0.2) / 0.8));

    // human hand: shifted toward the gap by -shift along the chord
    ctx.save();
    ctx.translate(g.nx * g.shift, g.ny * g.shift);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.lineWidth = 1.75 / s;
    if (eHuman < 1) ctx.setLineDash([DASH_L * ease(eHuman), DASH_L]);
    ctx.stroke(HUMAN_PATHS);
    ctx.restore();
    ctx.restore();

    // robot hand: shifted the opposite way
    ctx.save();
    ctx.translate(-g.nx * g.shift, -g.ny * g.shift);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.lineWidth = 1.75 / s;
    if (eRobot < 1) ctx.setLineDash([DASH_L * ease(eRobot), DASH_L]);
    ctx.stroke(ROBOT_LINES);
    ctx.setLineDash([]);
    // joint circles fade in near the end of the entrance
    ctx.globalAlpha = eRobot;
    for (const j of ROBOT_JOINTS) {
      ctx.beginPath();
      ctx.arc(j[0], j[1], j[2], 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();
  }

  function ease(u) { return 1 - Math.pow(1 - u, 3); }

  function renderStatic() {
    ctx.clearRect(0, 0, width, height);
    drawHands();
    const g = tips();
    // one calm static arc (no randomness jitter loop)
    drawArc(makeArc(g.a, g.b), 0.35);
  }

  let last = null;
  function tick(now) {
    if (last == null) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    if (entrance < 1) entrance = Math.min(1, entrance + dt / 1.5);

    // ease cursor proximity
    let target = 0;
    if (cursor) {
      const g = tips();
      const mx = (g.a.x + g.b.x) / 2, my = (g.a.y + g.b.y) / 2;
      const d = Math.hypot(cursor.x - mx, cursor.y - my);
      target = Math.max(0, 1 - d / 200);
    }
    closeness += (target - closeness) * 0.08;

    ctx.clearRect(0, 0, width, height);
    drawHands();
    if (entrance > 0.85) drawSpark(dt);
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
