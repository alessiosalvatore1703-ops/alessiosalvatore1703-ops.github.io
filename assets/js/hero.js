// Hero: a monochrome 3D point cloud that cycles through robot forms —
// sparse cloud -> humanoid -> sparse -> drone -> sparse -> robot dog -> ...
// Slow sway, per-point breathing noise, cursor parallax, and points scatter
// off the pointer ray. Reduced motion: one static humanoid frame.
// Uses the global THREE from the classic three.js build loaded in index.html.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

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
  scene.fog = new THREE.Fog(0xFCFCFB, 2.2, 4.6); // depth fade into the paper

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);

  const N = 15000;

  // deterministic PRNG so the cloud is identical every visit
  let seed = 1234567;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // ---- Shape primitives ----
  // capsule: [x0,y0,z0, x1,y1,z1, r]   torus: {torus:[cx,cy,cz, R, tube]} (horizontal)
  function capsuleArea(c) {
    const len = Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
    return 2 * Math.PI * c[6] * (len + 2 * c[6]);
  }

  function sampleCapsule(c, out, i3) {
    const len = Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
    let ax = 0, ay = 1, az = 0;
    if (len > 1e-6) { ax = (c[3] - c[0]) / len; ay = (c[4] - c[1]) / len; az = (c[5] - c[2]) / len; }
    const ref = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = ay * ref[2] - az * ref[1], uy = az * ref[0] - ax * ref[2], uz = ax * ref[1] - ay * ref[0];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;

    const r = c[6];
    const sideArea = 2 * Math.PI * r * len;
    const capArea = 4 * Math.PI * r * r;
    const th = rnd() * 2 * Math.PI;
    if (rnd() * (sideArea + capArea) < sideArea) {
      const t = rnd();
      const bx = c[0] + (c[3] - c[0]) * t, by = c[1] + (c[4] - c[1]) * t, bz = c[2] + (c[5] - c[2]) * t;
      out[i3] = bx + (ux * Math.cos(th) + vx * Math.sin(th)) * r;
      out[i3 + 1] = by + (uy * Math.cos(th) + vy * Math.sin(th)) * r;
      out[i3 + 2] = bz + (uz * Math.cos(th) + vz * Math.sin(th)) * r;
    } else {
      const top = rnd() < 0.5;
      const cxp = top ? c[3] : c[0], cyp = top ? c[4] : c[1], czp = top ? c[5] : c[2];
      const sgn = top ? 1 : -1;
      const phi = Math.acos(rnd());
      const sp = Math.sin(phi), cp = Math.cos(phi);
      out[i3] = cxp + (ux * Math.cos(th) * sp + vx * Math.sin(th) * sp + ax * cp * sgn) * r;
      out[i3 + 1] = cyp + (uy * Math.cos(th) * sp + vy * Math.sin(th) * sp + ay * cp * sgn) * r;
      out[i3 + 2] = czp + (uz * Math.cos(th) * sp + vz * Math.sin(th) * sp + az * cp * sgn) * r;
    }
  }

  function sampleTorus(t, out, i3) {
    const a = rnd() * 2 * Math.PI;  // around the ring
    const b = rnd() * 2 * Math.PI;  // around the tube
    const rr = t[3] + t[4] * Math.cos(b);
    out[i3] = t[0] + rr * Math.cos(a);
    out[i3 + 1] = t[1] + t[4] * Math.sin(b);
    out[i3 + 2] = t[2] + rr * Math.sin(a);
  }

  // Build one shape: area-weighted sampling over its primitives.
  function buildShape(capsules, tori) {
    const out = new Float32Array(N * 3);
    const prims = [];
    for (const c of capsules) prims.push({ cap: c, area: capsuleArea(c) });
    for (const t of tori || []) prims.push({ tor: t, area: 4 * Math.PI * Math.PI * t[3] * t[4] * 3 }); // x3: rings deserve density
    const total = prims.reduce(function (s, p) { return s + p.area; }, 0);
    for (let i = 0; i < N; i++) {
      let pick = rnd() * total, pi = 0;
      while (pick > prims[pi].area && pi < prims.length - 1) { pick -= prims[pi].area; pi++; }
      if (prims[pi].cap) sampleCapsule(prims[pi].cap, out, i * 3);
      else sampleTorus(prims[pi].tor, out, i * 3);
    }
    return out;
  }

  // ---- The three robot forms (units ~meters, y up, shared stage) ----

  // humanoid, left arm reaching forward
  const HUMANOID = buildShape([
    [0, 1.62, 0.02, 0, 1.62, 0.02, 0.11],
    [0, 1.50, 0.01, 0, 1.56, 0.02, 0.05],
    [0, 1.14, 0, 0, 1.42, 0, 0.155],
    [0, 0.96, 0, 0, 1.04, 0, 0.135],
    [-0.21, 1.44, 0, 0.21, 1.44, 0, 0.06],
    [0.23, 1.43, 0, 0.30, 1.30, 0.17, 0.055],
    [0.30, 1.30, 0.17, 0.35, 1.28, 0.47, 0.045],
    [0.35, 1.28, 0.47, 0.37, 1.29, 0.58, 0.05],
    [-0.23, 1.43, 0, -0.28, 1.16, 0.02, 0.055],
    [-0.28, 1.16, 0.02, -0.30, 0.95, 0.06, 0.045],
    [-0.30, 0.95, 0.06, -0.31, 0.86, 0.08, 0.05],
    [0.10, 0.96, 0, 0.13, 0.52, 0.02, 0.075],
    [0.13, 0.52, 0.02, 0.14, 0.10, 0.00, 0.055],
    [0.14, 0.07, 0.02, 0.14, 0.06, 0.17, 0.05],
    [-0.10, 0.96, 0, -0.13, 0.52, -0.02, 0.075],
    [-0.13, 0.52, -0.02, -0.14, 0.10, -0.04, 0.055],
    [-0.14, 0.07, -0.04, -0.14, 0.06, 0.11, 0.05],
  ]);

  // quadrotor drone hovering below headline height: X arms + four rotor rings
  const DRONE = buildShape(
    [
      [0, 0.54, 0, 0, 0.66, 0, 0.115],                // body
      [0, 0.45, 0, 0, 0.52, 0, 0.05],                 // gimbal
      [0.07, 0.61, 0.07, 0.30, 0.64, 0.30, 0.026],    // arms
      [-0.07, 0.61, 0.07, -0.30, 0.64, 0.30, 0.026],
      [0.07, 0.61, -0.07, 0.30, 0.64, -0.30, 0.026],
      [-0.07, 0.61, -0.07, -0.30, 0.64, -0.30, 0.026],
      [0.34, 0.64, 0.34, 0.34, 0.67, 0.34, 0.028],    // rotor hubs
      [-0.34, 0.64, 0.34, -0.34, 0.67, 0.34, 0.028],
      [0.34, 0.64, -0.34, 0.34, 0.67, -0.34, 0.028],
      [-0.34, 0.64, -0.34, -0.34, 0.67, -0.34, 0.028],
    ],
    [
      [0.34, 0.685, 0.34, 0.13, 0.012],               // rotor rings
      [-0.34, 0.685, 0.34, 0.13, 0.012],
      [0.34, 0.685, -0.34, 0.13, 0.012],
      [-0.34, 0.685, -0.34, 0.13, 0.012],
    ]
  );

  // quadruped robot dog on the ground, head toward +x
  const DOG = (function () {
    const caps = [
      [-0.38, 0.54, 0, 0.30, 0.54, 0, 0.13],          // torso
      [0.36, 0.60, 0, 0.50, 0.58, 0, 0.065],          // head
      [0.50, 0.55, 0, 0.54, 0.54, 0, 0.03],           // muzzle/sensor
    ];
    // legs: > shaped, hips at torso corners
    const hips = [[0.26, 0.12], [0.26, -0.12], [-0.30, 0.12], [-0.30, -0.12]];
    for (const h of hips) {
      caps.push([h[0], 0.48, h[1], h[0] - 0.10, 0.24, h[1], 0.045]);  // thigh back-down
      caps.push([h[0] - 0.10, 0.24, h[1], h[0] + 0.02, -0.01, h[1], 0.032]); // shin forward-down
      caps.push([h[0] + 0.02, -0.02, h[1], h[0] + 0.02, -0.03, h[1], 0.035]); // foot
    }
    return buildShape(caps);
  })();

  const SHAPES = [HUMANOID, DRONE, DOG];

  // fresh scattered shell around the stage
  function makeSparse(out) {
    for (let i = 0; i < N; i++) {
      const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1);
      const rr = 1.7 + rnd() * 1.1;
      out[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      out[i * 3 + 1] = 1.05 + rr * Math.cos(ph) * 0.75;
      out[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    }
    return out;
  }

  // ---- Morph state ----
  const fromBuf = new Float32Array(N * 3);
  const toBuf = new Float32Array(N * 3);
  const core = new Float32Array(N * 3);   // morph result, pre-noise
  const pos = new Float32Array(N * 3);    // final render buffer
  const phasePt = new Float32Array(N);    // per-point noise phase
  const delayPt = new Float32Array(N);    // per-point transition delay

  for (let i = 0; i < N; i++) phasePt[i] = rnd() * Math.PI * 2;

  const FORM_DUR = 2.0, HOLD_DUR = 5.5, DISPERSE_DUR = 1.4;
  let phase = 'form';       // form | hold | disperse
  let phaseT = 0;
  let shapeIdx = 0;

  makeSparse(fromBuf);
  toBuf.set(SHAPES[0]);
  core.set(fromBuf);
  pos.set(reducedMotion ? SHAPES[0] : fromBuf);

  function setDelays(mode) {
    for (let i = 0; i < N; i++) {
      // forming: build bottom-up; dispersing: uniform random
      delayPt[i] = mode === 'form'
        ? (toBuf[i * 3 + 1]) * 0.3 + rnd() * 0.35
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
    size: 0.0115,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // base yaw: three-quarter view so each form reads in profile
  const BASE_YAW = 0.5;
  group.rotation.y = BASE_YAW;

  // ---- Camera framing ----
  let width, height;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (camera.aspect < 0.85) {
      // phones: shrink the stage into the empty band at the hero's bottom
      group.scale.setScalar(0.45);
      group.position.y = -0.58;
      scene.fog.near = 3.8; scene.fog.far = 7.5;
      camera.position.set(0, 1.0, 4.8);
      camera.lookAt(0, 0.95, 0);
    } else {
      // desktop: stage in the gap between the text and the portrait —
      // must NOT sit behind the portrait photo (user request)
      group.scale.setScalar(0.94);
      group.position.y = 0.04;
      scene.fog.near = 2.2; scene.fog.far = 4.6;
      camera.position.set(0.5, 1.42, 3.05);
      camera.lookAt(-0.24, 1.05, 0.05);
    }
    camera.updateProjectionMatrix();
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

    // state machine
    if (phase === 'form' && phaseT > FORM_DUR + 0.8) beginPhase('hold');
    else if (phase === 'hold' && phaseT > HOLD_DUR) beginPhase('disperse');
    else if (phase === 'disperse' && phaseT > DISPERSE_DUR + 0.5) beginPhase('form');

    // sway + cursor parallax
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    group.rotation.y = BASE_YAW + Math.sin(t * 0.12) * 0.25 + mouse.x * 0.22;
    group.rotation.x = mouse.y * 0.06;

    // pointer ray in the group's local space
    let repel = false;
    if (pointerIn) {
      raycaster.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
      inv.copy(group.matrixWorld).invert();
      ro.copy(raycaster.ray.origin).applyMatrix4(inv);
      rd.copy(raycaster.ray.direction).transformDirection(inv);
      repel = true;
    }

    const dur = phase === 'disperse' ? DISPERSE_DUR : FORM_DUR;
    const morphing = phase !== 'hold';

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let x, y, z;
      if (morphing) {
        const u = Math.min(Math.max((phaseT - delayPt[i]) / dur, 0), 1);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; // easeInOutCubic
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
      // scatter off the pointer ray
      if (repel) {
        const wx = x - ro.x, wy = y - ro.y, wz = z - ro.z;
        const dot = wx * rd.x + wy * rd.y + wz * rd.z;
        const px = wx - dot * rd.x, py = wy - dot * rd.y, pz = wz - dot * rd.z;
        const d2 = px * px + py * py + pz * pz;
        if (d2 < 0.09 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 0.3) * 0.07;
          x += (px / d) * f; y += (py / d) * f; z += (pz / d) * f;
        }
      }
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
