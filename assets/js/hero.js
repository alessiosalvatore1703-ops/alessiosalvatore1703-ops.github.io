// Hero: a monochrome 3D point cloud forms a humanoid robot reaching toward a
// tiny orb of drifting points — physical AI handling the small and delicate.
// The cloud assembles on load, breathes with per-point noise, slowly sways,
// parallaxes with the cursor, and points scatter off the pointer ray.
// Reduced motion: one static assembled frame. No WebGL: canvas stays empty.
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

  // ---- Build the figure as capsules and sample its surface into points ----
  // [x0,y0,z0, x1,y1,z1, radius] — a standing humanoid, left arm reaching
  // forward-up toward the orb. Units ~meters, y up, origin at the feet.
  const CAPSULES = [
    [0, 1.62, 0.02, 0, 1.62, 0.02, 0.11],          // head
    [0, 1.50, 0.01, 0, 1.56, 0.02, 0.05],          // neck
    [0, 1.14, 0, 0, 1.42, 0, 0.155],               // chest
    [0, 0.96, 0, 0, 1.04, 0, 0.135],               // pelvis
    [-0.21, 1.44, 0, 0.21, 1.44, 0, 0.06],         // shoulder girdle
    [0.23, 1.43, 0, 0.30, 1.30, 0.17, 0.055],      // L upper arm (reaching)
    [0.30, 1.30, 0.17, 0.35, 1.28, 0.47, 0.045],   // L forearm
    [0.35, 1.28, 0.47, 0.37, 1.29, 0.58, 0.05],    // L hand
    [-0.23, 1.43, 0, -0.28, 1.16, 0.02, 0.055],    // R upper arm (down)
    [-0.28, 1.16, 0.02, -0.30, 0.95, 0.06, 0.045], // R forearm
    [-0.30, 0.95, 0.06, -0.31, 0.86, 0.08, 0.05],  // R hand
    [0.10, 0.96, 0, 0.13, 0.52, 0.02, 0.075],      // L thigh
    [0.13, 0.52, 0.02, 0.14, 0.10, 0.00, 0.055],   // L shin
    [0.14, 0.07, 0.02, 0.14, 0.06, 0.17, 0.05],    // L foot
    [-0.10, 0.96, 0, -0.13, 0.52, -0.02, 0.075],   // R thigh
    [-0.13, 0.52, -0.02, -0.14, 0.10, -0.04, 0.055],// R shin
    [-0.14, 0.07, -0.04, -0.14, 0.06, 0.11, 0.05], // R foot
  ];
  const ORB = { x: 0.40, y: 1.31, z: 0.78, r: 0.035 };

  const N_BODY = 15000;
  const N_ORB = 300;
  const N = N_BODY + N_ORB;

  // deterministic PRNG so the cloud is identical every visit
  let seed = 1234567;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // surface area per capsule, for area-weighted sampling
  const areas = CAPSULES.map(function (c) {
    const len = Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
    return 2 * Math.PI * c[6] * (len + 2 * c[6]);
  });
  const totalArea = areas.reduce(function (a, b) { return a + b; }, 0);

  function sampleCapsule(c, out, i3) {
    const len = Math.hypot(c[3] - c[0], c[4] - c[1], c[5] - c[2]);
    // frame along the axis
    let ax = 0, ay = 1, az = 0;
    if (len > 1e-6) { ax = (c[3] - c[0]) / len; ay = (c[4] - c[1]) / len; az = (c[5] - c[2]) / len; }
    // orthonormal basis (u,v) perpendicular to axis
    const ref = Math.abs(ay) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ux = ay * ref[2] - az * ref[1], uy = az * ref[0] - ax * ref[2], uz = ax * ref[1] - ay * ref[0];
    const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;

    const r = c[6];
    const sideArea = 2 * Math.PI * r * len;
    const capArea = 4 * Math.PI * r * r;
    const th = rnd() * 2 * Math.PI;
    if (rnd() * (sideArea + capArea) < sideArea) {
      // cylinder side
      const t = rnd();
      const bx = c[0] + (c[3] - c[0]) * t, by = c[1] + (c[4] - c[1]) * t, bz = c[2] + (c[5] - c[2]) * t;
      out[i3] = bx + (ux * Math.cos(th) + vx * Math.sin(th)) * r;
      out[i3 + 1] = by + (uy * Math.cos(th) + vy * Math.sin(th)) * r;
      out[i3 + 2] = bz + (uz * Math.cos(th) + vz * Math.sin(th)) * r;
    } else {
      // hemispherical cap
      const top = rnd() < 0.5;
      const cxp = top ? c[3] : c[0], cyp = top ? c[4] : c[1], czp = top ? c[5] : c[2];
      const sgn = top ? 1 : -1;
      const phi = Math.acos(rnd()); // 0..pi/2, biased toward pole
      const sp = Math.sin(phi), cp = Math.cos(phi);
      out[i3] = cxp + (ux * Math.cos(th) * sp + vx * Math.sin(th) * sp + ax * cp * sgn) * r;
      out[i3 + 1] = cyp + (uy * Math.cos(th) * sp + vy * Math.sin(th) * sp + ay * cp * sgn) * r;
      out[i3 + 2] = czp + (uz * Math.cos(th) * sp + vz * Math.sin(th) * sp + az * cp * sgn) * r;
    }
  }

  const base = new Float32Array(N * 3);     // assembled positions
  const start = new Float32Array(N * 3);    // scattered start positions
  const pos = new Float32Array(N * 3);      // live buffer
  const phase = new Float32Array(N);        // per-point noise phase
  const delay = new Float32Array(N);        // per-point assembly delay

  for (let i = 0; i < N_BODY; i++) {
    // pick a capsule weighted by area
    let pick = rnd() * totalArea, ci = 0;
    while (pick > areas[ci] && ci < areas.length - 1) { pick -= areas[ci]; ci++; }
    sampleCapsule(CAPSULES[ci], base, i * 3);
  }
  for (let i = N_BODY; i < N; i++) {
    // orb: small gaussian-ish ball
    const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1);
    const rr = ORB.r * Math.cbrt(rnd());
    base[i * 3] = ORB.x + rr * Math.sin(ph) * Math.cos(th);
    base[i * 3 + 1] = ORB.y + rr * Math.cos(ph);
    base[i * 3 + 2] = ORB.z + rr * Math.sin(ph) * Math.sin(th);
  }
  for (let i = 0; i < N; i++) {
    // start scattered on a big shell around the figure
    const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1);
    const rr = 2.0 + rnd() * 1.2;
    start[i * 3] = rr * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = 1.1 + rr * Math.cos(ph);
    start[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    phase[i] = rnd() * Math.PI * 2;
    delay[i] = base[i * 3 + 1] * 0.35 + rnd() * 0.5; // assemble feet-up, softly randomized
  }
  pos.set(reducedMotion ? base : start);

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

  // base yaw: turn the figure so the reaching arm + orb read in profile,
  // presenting toward the hero text
  const BASE_YAW = 0.65;
  group.rotation.y = BASE_YAW;

  // ---- Camera framing: figure right-of-center on wide screens ----
  let width, height;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (camera.aspect < 0.85) {
      // phones: shrink the figure into the empty band at the hero's bottom
      group.scale.setScalar(0.45);
      group.position.y = -0.58;
      scene.fog.near = 3.8; scene.fog.far = 7.5;
      camera.position.set(0, 1.0, 4.8);
      camera.lookAt(0, 0.95, 0);
    } else {
      group.scale.setScalar(1);
      group.position.y = 0;
      scene.fog.near = 2.2; scene.fog.far = 4.6;
      camera.position.set(0.5, 1.42, 3.05);
      camera.lookAt(-0.68, 1.05, 0.05);
    }
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  }

  // ---- Interaction state ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };   // eased NDC pointer
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

    // sway + cursor parallax
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    group.rotation.y = BASE_YAW + Math.sin(t * 0.12) * 0.28 + mouse.x * 0.22;
    group.rotation.x = mouse.y * 0.06;

    // pointer ray in the group's local space
    let repel = false;
    if (pointerIn && t > 3) {
      raycaster.setFromCamera({ x: mouse.x, y: mouse.y }, camera);
      inv.copy(group.matrixWorld).invert();
      ro.copy(raycaster.ray.origin).applyMatrix4(inv);
      rd.copy(raycaster.ray.direction).transformDirection(inv);
      repel = true;
    }

    const assembleT = t / 2.4; // ~2.4 s assembly
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      let x, y, z;
      const u = Math.min(Math.max((assembleT - delay[i]) * 1.6, 0), 1);
      if (u >= 1) { x = base[i3]; y = base[i3 + 1]; z = base[i3 + 2]; }
      else {
        const e = 1 - Math.pow(1 - u, 3);
        x = start[i3] + (base[i3] - start[i3]) * e;
        y = start[i3 + 1] + (base[i3 + 1] - start[i3 + 1]) * e;
        z = start[i3 + 2] + (base[i3 + 2] - start[i3 + 2]) * e;
      }
      // per-point breathing noise
      const p = phase[i];
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
