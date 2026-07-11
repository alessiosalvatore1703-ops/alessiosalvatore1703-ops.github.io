// Hero: a monochrome 3D point cloud cycling through real robot hardware —
// sparse cloud -> Unitree G1 humanoid -> sparse -> ETH ASL Firefly hexacopter
// -> sparse -> Unitree A2 quadruped -> ... Point data is sampled offline from
// the manufacturers' own meshes (see assets/js/hero-shapes.js for sources).
// The stage lives in a reserved band at the hero's bottom so it never overlaps
// text or the portrait. Hovering the cloud dissolves it locally; it re-forms
// when the cursor leaves. Reduced motion: one static humanoid frame.
// Uses the global THREE from the classic three.js build loaded in index.html.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined' || !window.HERO_SHAPES) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

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
    decode(window.HERO_SHAPES.humanoid),
    decode(window.HERO_SHAPES.drone),
    decode(window.HERO_SHAPES.dog),
  ];
  const N = SHAPES[0].length / 3;

  // deterministic PRNG so the cloud is identical every visit
  let seed = 1234567;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // fresh scattered shell around the stage (stage is roughly y 0..1.6)
  function makeSparse(out) {
    for (let i = 0; i < N; i++) {
      const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1);
      const rr = 1.3 + rnd() * 0.9;
      out[i * 3] = rr * Math.sin(ph) * Math.cos(th) * 1.4;
      out[i * 3 + 1] = 0.8 + rr * Math.cos(ph) * 0.6;
      out[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
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
  const dissolve = new Float32Array(N);    // per-point cursor-dissolve level
  const scatter = new Float32Array(N * 3); // per-point dissolve direction

  for (let i = 0; i < N; i++) {
    phasePt[i] = rnd() * Math.PI * 2;
    const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1);
    const m = 0.35 + rnd() * 0.45;
    scatter[i * 3] = Math.sin(ph) * Math.cos(th) * m;
    scatter[i * 3 + 1] = Math.cos(ph) * m;
    scatter[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * m;
  }

  const FORM_DUR = 2.0, HOLD_DUR = 6.0, DISPERSE_DUR = 1.4;
  let phase = 'form';       // form | hold | disperse
  let phaseT = 0;
  let shapeIdx = 0;

  makeSparse(fromBuf);
  toBuf.set(SHAPES[0]);
  core.set(fromBuf);
  pos.set(reducedMotion ? SHAPES[0] : fromBuf);

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
    if (next === 'disperse') {
      fromBuf.set(core);
      makeSparse(toBuf);
      setDelays('disperse');
    } else if (next === 'form') {
      fromBuf.set(core);
      shapeIdx = (shapeIdx + 1) % SHAPES.length;
      toBuf.set(SHAPES[shapeIdx]);
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
    opacity: 0.8,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // three-quarter view so each machine reads in profile
  const BASE_YAW = 0.5;
  group.rotation.y = BASE_YAW;

  // ---- Camera: map the stage (world y 0..STAGE_H) into a reserved band at
  //      the hero's bottom, so the cloud NEVER overlaps text or portrait ----
  const STAGE_H = 1.75;
  let width, height;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    const bandH = Math.min(height * 0.38, 280);      // px reserved at the bottom (< hero pb)
    const worldVisH = STAGE_H * (height / bandH);    // world height the canvas spans
    const dist = worldVisH / (2 * FOV_TAN);
    // place the stage's vertical center at the band's center: screen y grows
    // downward, world y grows up, so the look-at sits ABOVE the stage center
    const bandCenterPx = height - bandH / 2;
    const lookY = STAGE_H / 2 + (bandCenterPx - height / 2) * (worldVisH / height);
    camera.position.set(0.09 * dist, lookY + 0.12 * dist, dist);
    camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix();
    scene.fog.near = dist * 0.75;
    scene.fog.far = dist * 2.2;
    if (reducedMotion) renderer.render(scene, camera);
  }

  // ---- Interaction ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let pointerIn = false;
  const raycaster = new THREE.Raycaster();
  const inv = new THREE.Matrix4();
  const ro = new THREE.Vector3(), rd = new THREE.Vector3();

  let t = 0, last = null;

  function tick(now) {
    if (last == null) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;
    phaseT += dt;

    if (phase === 'form' && phaseT > FORM_DUR + 0.8) beginPhase('hold');
    else if (phase === 'hold' && phaseT > HOLD_DUR) beginPhase('disperse');
    else if (phase === 'disperse' && phaseT > DISPERSE_DUR + 0.5) beginPhase('form');

    // sway + cursor parallax
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    group.rotation.y = BASE_YAW + Math.sin(t * 0.12) * 0.25 + mouse.x * 0.15;

    // pointer ray in the group's local space
    let hover = false;
    if (pointerIn) {
      raycaster.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
      inv.copy(group.matrixWorld).invert();
      ro.copy(raycaster.ray.origin).applyMatrix4(inv);
      rd.copy(raycaster.ray.direction).transformDirection(inv);
      hover = true;
    }

    const dur = phase === 'disperse' ? DISPERSE_DUR : FORM_DUR;
    const morphing = phase !== 'hold';
    const ATTACK = 4.5 * dt, DECAY = 1.1 * dt;

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

      // cursor dissolve: points near the pointer ray melt outward along a
      // fixed per-point direction and heal when the cursor moves away
      let d = dissolve[i];
      if (hover) {
        const wx = x - ro.x, wy = y - ro.y, wz = z - ro.z;
        const dot = wx * rd.x + wy * rd.y + wz * rd.z;
        const px = wx - dot * rd.x, py = wy - dot * rd.y, pz = wz - dot * rd.z;
        const d2 = px * px + py * py + pz * pz;
        if (d2 < 0.16) d = Math.min(1, d + ATTACK * (1 - d2 / 0.16));
      }
      d = Math.max(0, d - DECAY);
      dissolve[i] = d;
      if (d > 0.001) {
        const e = d * d * (3 - 2 * d); // smoothstep
        x += scatter[i3] * e;
        y += scatter[i3 + 1] * e;
        z += scatter[i3 + 2] * e;
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
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();

  if (!reducedMotion) {
    if (finePointer) {
      const hero = canvas.parentElement;
      hero.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        pointerIn = true;
      });
      hero.addEventListener('mouseleave', function () {
        pointerIn = false;
        mouse.tx = 0; mouse.ty = 0;
      });
    }
    requestAnimationFrame(tick);
  }
})();
