// Hero: a hairline humanoid kneels and reaches toward a very small cluster of
// dots — physical AI handling the small and delicate. One dot slowly commutes
// between the cluster and the fingertip; a fine pointer perturbs the cluster.
// Draws a single static pose when reduced motion is set.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const INK = '18, 18, 18';
  const FRONT = 'rgba(' + INK + ', 0.16)';
  const BACK = 'rgba(' + INK + ', 0.09)';
  const SOFT = 'rgba(' + INK + ', 0.07)';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // Kneeling pose, normalized: x relative to figure anchor (negative = the
  // direction it faces), y relative to the ground line (negative = up),
  // both in units of figure height. Limb lengths are kept anatomically
  // consistent (thigh ~0.31, shin ~0.24, upper arm ~0.26, forearm ~0.24).
  const POSE = {
    pelvis:    [ 0.06, -0.34],
    chest:     [-0.05, -0.74],
    neck:      [-0.10, -0.82],
    head:      [-0.14, -0.90],   // center; radius below
    kneeR:     [ 0.16, -0.04],   // back leg, knee on the ground
    ankleR:    [ 0.40, -0.03],
    toeR:      [ 0.48, -0.01],
    kneeL:     [-0.24, -0.28],   // front leg, foot planted
    ankleL:    [-0.20, -0.04],
    toeL:      [-0.32, -0.01],
    shoulderR: [-0.01, -0.76],   // back arm, resting on the thigh
    elbowR:    [ 0.10, -0.54],
    wristR:    [ 0.08, -0.28],
    shoulderL: [-0.09, -0.78],   // front arm, reaching
    elbowL:    [-0.28, -0.60],
    wristL:    [-0.44, -0.42],
    finger:    [-0.51, -0.33],
    dots:      [-0.58, -0.24],   // cluster center the finger reaches toward
  };
  const HEAD_R = 0.075;
  // Upper-body points sway with a slow breathing motion; weights taper to 0
  // at the legs so the figure stays planted.
  const BREATHE = {
    chest: 1, neck: 1, head: 1,
    shoulderR: 1, elbowR: 0.7, wristR: 0.5,
    shoulderL: 1, elbowL: 1.1, wristL: 1.2, finger: 1.3,
    pelvis: 0.3,
  };

  const DOT_COUNT = 16;
  const dots = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    const a = (i / DOT_COUNT) * 2 * Math.PI;
    dots.push({
      r: 0.25 + 0.75 * ((i * 7919) % 100) / 100,  // deterministic spread
      a: a + ((i * 104729) % 100) / 100,
      w: 0.4 + ((i * 1299709) % 100) / 200,       // drift frequency
      p: ((i * 15485863) % 628) / 100,            // drift phase
    });
  }

  let width, height, dpr;
  let scale, anchorX, groundY;
  let cursor = null;
  let t = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    scale = Math.min(height * 0.62, width * 0.26);
    groundY = height * 0.97;
    // keep the trailing foot inside the right edge
    anchorX = Math.min(width * 0.68, width - 24 - 0.48 * scale);
    if (reducedMotion) render();
  }

  function pt(name, time) {
    const p = POSE[name];
    let x = anchorX + p[0] * scale;
    let y = groundY + p[1] * scale;
    if (time !== undefined && BREATHE[name]) {
      y += Math.sin(time * 1.6) * 2 * BREATHE[name];
      x += Math.sin(time * 0.8) * 1.5 * (BREATHE[name] - 0.9 > 0 ? BREATHE[name] - 0.9 : 0);
    }
    return { x: x, y: y };
  }

  function stroke(points, style) {
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  function joint(p, style) {
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }

  function render(time) {
    time = time || 0;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1.5;

    // ground line under the figure
    ctx.strokeStyle = SOFT;
    ctx.beginPath();
    ctx.moveTo(anchorX - 0.85 * scale, groundY);
    ctx.lineTo(anchorX + 0.6 * scale, groundY);
    ctx.stroke();

    const pelvis = pt('pelvis', time);
    const chest = pt('chest', time);
    const neck = pt('neck', time);
    const head = pt('head', time);
    const finger = pt('finger', time);
    const cluster = pt('dots');

    // back limbs first, fainter
    stroke([pt('shoulderR', time), pt('elbowR', time), pt('wristR', time)], BACK);
    stroke([pelvis, pt('kneeR'), pt('ankleR'), pt('toeR')], BACK);
    joint(pt('elbowR', time), BACK);
    joint(pt('kneeR'), BACK);

    // front leg, spine, front arm
    stroke([pelvis, pt('kneeL'), pt('ankleL'), pt('toeL')], FRONT);
    stroke([pelvis, chest, neck], FRONT);
    stroke([pt('shoulderL', time), pt('elbowL', time), pt('wristL', time), finger], FRONT);
    joint(pt('kneeL'), FRONT);
    joint(pt('elbowL', time), FRONT);
    joint(pelvis, FRONT);

    // head
    ctx.strokeStyle = FRONT;
    ctx.beginPath();
    ctx.arc(head.x, head.y, HEAD_R * scale, 0, 2 * Math.PI);
    ctx.stroke();

    // focus ring around the tiny object
    ctx.strokeStyle = SOFT;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(cluster.x, cluster.y, 0.075 * scale, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // the dots: a loose point cloud, drifting; the cursor pulls nearby dots
    const clusterR = 0.045 * scale;
    ctx.fillStyle = 'rgba(' + INK + ', 0.35)';
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      let x = cluster.x + Math.cos(d.a) * d.r * clusterR + Math.sin(time * d.w + d.p) * 1.8;
      let y = cluster.y + Math.sin(d.a) * d.r * clusterR + Math.cos(time * d.w * 0.8 + d.p) * 1.8;
      if (cursor) {
        const dx = cursor.x - x, dy = cursor.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 140 && dist > 1) {
          const k = (1 - dist / 140) * 12;
          x += (dx / dist) * k;
          y += (dy / dist) * k;
        }
      }
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // one dot commutes between the cluster and the fingertip
    const u = (1 - Math.cos(2 * Math.PI * ((time % 8) / 8))) / 2;
    const nx = -(finger.y - cluster.y), ny = finger.x - cluster.x;
    const nl = Math.hypot(nx, ny) || 1;
    const cx = cluster.x + (finger.x - cluster.x) * u + (nx / nl) * Math.sin(u * Math.PI) * 8;
    const cy = cluster.y + (finger.y - cluster.y) * u + (ny / nl) * Math.sin(u * Math.PI) * 8;
    ctx.fillStyle = 'rgba(' + INK + ', 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  function tick() {
    t += 1 / 60;
    render(t);
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
