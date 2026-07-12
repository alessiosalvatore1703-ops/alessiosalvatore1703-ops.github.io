// Hero: a monochrome 3D point cloud cycling through the robots Alessio has
// actually worked with — Agibot X2 humanoid -> SO-101 arm -> Unitree A2
// quadruped -> ASL Firefly hexacopter (stand-in for the OMAV) -> repeat.
// A small mono caption (#hero-shape-label) names each robot while it holds.
// Point data is sampled offline from the manufacturers' own meshes (see
// assets/js/hero-shapes.js for sources). The stage is centered and scaled
// large to sit as a background behind the name and portrait. No pointer
// interaction — just slow sway + breathing.
// Reduced motion: one static X2 frame with its caption.
// Uses the global THREE from the classic three.js build loaded in index.html.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined' || !window.HERO_SHAPES) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // no WebGL: leave the paper background
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xFCFCFB, 2.5, 6.5); // depth fade into the paper

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  const FOV_TAN = Math.tan((38 / 2) * Math.PI / 180);

  // ---- Decode the sampled hardware point clouds (int16 mm -> float m) ----
  function decode(b64) {
    const bin = atob(b64);
    const n = bin.length / 2;
    const f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      if (v >= 32768) v -= 65536;
      f[i] = v / 1000;
    }
    return f;
  }

  const SHAPES = [
    { pts: decode(window.HERO_SHAPES.x2), label: 'Agibot X2 · person following — RoboHack 2026' },
    { pts: decode(window.HERO_SHAPES.arm), label: 'SO-101 · VLA pick-and-place — Robot Learning' },
    { pts: decode(window.HERO_SHAPES.dog), label: 'Unitree A2 · autonomous exploration — RSS 2026' },
    { pts: decode(window.HERO_SHAPES.drone), label: 'RotorS Firefly · aerial robot control — ASL' },
  ];
  const N = SHAPES[0].pts.length / 3;

  const label = document.getElementById('hero-shape-label');
  function setLabel(i) {
    if (label) label.textContent = SHAPES[i].label;
  }

  // deterministic PRNG so the cloud is identical every visit
  let seed = 1234567;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // scattered targets fill the WHOLE visible hero (user request: dispersed
  // dots roam everywhere; only the formed shapes must respect the text).
  // Bounds are updated by resize() from the camera mapping.
  const sparse = { cx: 0, cy: 0.9, hw: 2.2, hh: 1.4 };
  function makeSparse(out) {
    for (let i = 0; i < N; i++) {
      out[i * 3] = sparse.cx + (rnd() * 2 - 1) * sparse.hw;
      out[i * 3 + 1] = sparse.cy + (rnd() * 2 - 1) * sparse.hh;
      out[i * 3 + 2] = (rnd() * 2 - 1) * 0.6;
    }
    return out;
  }

  // ---- Morph state ----
  const fromBuf = new Float32Array(N * 3);
  const toBuf = new Float32Array(N * 3);
  const core = new Float32Array(N * 3);    // morph result, pre-noise
  const pos = new Float32Array(N * 3);     // final render buffer
  const phasePt = new Float32Array(N);     // per-point noise phase
  const delayPt = new Float32Array(N);     // per-point transition delay

  for (let i = 0; i < N; i++) {
    phasePt[i] = rnd() * Math.PI * 2;
  }

  const FORM_DUR = 2.0, HOLD_DUR = 6.0, DISPERSE_DUR = 1.4;
  let phase = 'form';       // form | hold | disperse
  let phaseT = 0;
  let shapeIdx = 0;

  makeSparse(fromBuf);
  toBuf.set(SHAPES[0].pts);
  core.set(fromBuf);
  pos.set(reducedMotion ? SHAPES[0].pts : fromBuf);
  setLabel(0);
  if (reducedMotion && label) label.classList.add('is-visible');

  function setDelays(mode) {
    for (let i = 0; i < N; i++) {
      delayPt[i] = mode === 'form'
        ? (toBuf[i * 3 + 1]) * 0.35 + rnd() * 0.35
        : rnd() * 0.4;
    }
  }
  setDelays('form');

  function beginPhase(next) {
    phase = next;
    phaseT = 0;
    if (next === 'hold') {
      if (label) label.classList.add('is-visible');
    } else if (next === 'disperse') {
      if (label) label.classList.remove('is-visible');
      fromBuf.set(core);
      makeSparse(toBuf);
      setDelays('disperse');
    } else if (next === 'form') {
      fromBuf.set(core);
      shapeIdx = (shapeIdx + 1) % SHAPES.length;
      toBuf.set(SHAPES[shapeIdx].pts);
      setLabel(shapeIdx);
      setDelays('form');
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x121212,
    size: 0.0105,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // three-quarter view so each machine reads in profile
  const BASE_YAW = 0.5;
  group.rotation.y = BASE_YAW;

  // ---- Camera: the stage is a large background centered in the hero, sitting
  // behind the name and portrait. Scale to fill most of the hero height while
  // keeping the widest shape (A2 length) clear of the horizontal edges.
  const STAGE_H = 1.75;      // world height of the tallest shape + margin
  const STAGE_W = 1.22;      // world width of the widest shape (A2 length)
  let width, height;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    const cxPx = width / 2;
    const cyPx = height / 2;
    const S = Math.min(height * 0.92 / STAGE_H, width * 0.88 / STAGE_W);

    const worldVisH = height / S;
    const dist = worldVisH / (2 * FOV_TAN);
    // look-at point that maps the stage center (0, STAGE_H/2, 0) to (cxPx, cyPx)
    const lookX = -(cxPx - width / 2) / S;
    const lookY = STAGE_H / 2 - (height / 2 - cyPx) / S;
    camera.position.set(lookX, lookY + 0.12 * dist, dist);
    camera.lookAt(lookX, lookY, 0);
    camera.updateProjectionMatrix();
    scene.fog.near = dist * 0.75;
    scene.fog.far = dist * 2.2;
    // dispersed dots roam the full visible hero
    sparse.cx = lookX;
    sparse.cy = lookY;
    sparse.hw = (width / (2 * S)) * 0.96;
    sparse.hh = (height / (2 * S)) * 0.92;
    if (reducedMotion) renderer.render(scene, camera);
  }

  let t = 0, last = null;

  // pause the loop while the hero is off-screen (saves CPU/battery on scroll)
  let running = false, rafId = 0;
  function start() {
    if (running) return;
    running = true;
    last = null; // first dt after resume is 0, not the pause duration
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function tick(now) {
    if (last == null) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    phaseT += dt;

    if (phase === 'form' && phaseT > FORM_DUR + 0.8) beginPhase('hold');
    else if (phase === 'hold' && phaseT > HOLD_DUR) beginPhase('disperse');
    else if (phase === 'disperse' && phaseT > DISPERSE_DUR + 0.5) beginPhase('form');

    // slow sway
    group.rotation.y = BASE_YAW + Math.sin(t * 0.12) * 0.25;

    const dur = phase === 'disperse' ? DISPERSE_DUR : FORM_DUR;
    const morphing = phase !== 'hold';

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let x, y, z;
      if (morphing) {
        const u = Math.min(Math.max((phaseT - delayPt[i]) / dur, 0), 1);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        x = fromBuf[i3] + (toBuf[i3] - fromBuf[i3]) * e;
        y = fromBuf[i3 + 1] + (toBuf[i3 + 1] - fromBuf[i3 + 1]) * e;
        z = fromBuf[i3 + 2] + (toBuf[i3 + 2] - fromBuf[i3 + 2]) * e;
        core[i3] = x; core[i3 + 1] = y; core[i3 + 2] = z;
      } else {
        x = core[i3]; y = core[i3 + 1]; z = core[i3 + 2];
      }

      // per-point breathing noise
      const p = phasePt[i];
      x += Math.sin(t * 0.9 + p) * 0.004;
      y += Math.sin(t * 0.7 + p * 1.7) * 0.004;
      z += Math.cos(t * 0.8 + p) * 0.004;

      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (running) rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();

  // the initial scatter was built before resize() knew the hero bounds
  if (!reducedMotion) {
    makeSparse(fromBuf);
    core.set(fromBuf);
    pos.set(fromBuf);
  }

  if (!reducedMotion) {
    if ('IntersectionObserver' in window) {
      // only animate while the hero is actually visible; the phase state
      // machine freezes in place since phaseT only advances in tick
      const io = new IntersectionObserver(function (entries) {
        entries[entries.length - 1].isIntersecting ? start() : stop();
      }, { threshold: 0 });
      io.observe(canvas);
    } else {
      start();
    }
  }
})();
