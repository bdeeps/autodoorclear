// Shared parts for AutoDoorClear: the sliding door and its header operator, a walking figure, the
// Doppler and motion maths, wave rings, chart boards and layout helpers. One unit is one metre.
// The door stands in the plane z = 0. Outside the building is +z, inside is −z, +x is to the right
// as you face the door from outside, +y is up.
//
// Sizes (a common two-leaf entrance, drawn generic, no maker's design):
//   clear opening 1.8 m wide and 2.1 m high; each leaf 0.95 m wide and travels 0.9 m.
//   A 10 mm toughened-glass leaf of 0.95 × 2.06 m weighs 0.95 × 2.06 × 0.010 × 2,500 kg/m³ ≈ 49 kg;
//   with rails, hanger and seals about 60 kg, the default leaf mass in this box.
//   The header is drawn 0.36 m tall so the parts can be seen; real ones are 0.10 to 0.20 m.
// Sources for the numbers used by the chapters are cited where they are used.
import { THREE, M, box, beam, canvasTexture, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const C = 299792458;                 // m/s, speed of light (exact, SI)
export const G = 9.81;                      // m/s²
export const W_OPEN = 1.8, LEAF_W = 0.95, LEAF_H = 2.06, TRAVEL = 0.9, SIDE_W = 1.0;
export const HEAD_Y = 2.12, HEAD_H = 0.36, HEAD_L = 3.9;
export const SENSOR = [0, 2.3, 0.16];       // the outside sensor on the header face
export const LEAF_KG = 60;

// ---------------------------------------------------------------- physics
// Doppler shift of an echo from a target closing at v (m/s) on a radar of frequency f0 (Hz):
//   Δf = 2 f0 v ÷ c   (the wave is squeezed once on the way in and once on the way back).
// Check: 24.125 GHz and 1.4 m/s give 225 Hz; 10.525 GHz gives 98 Hz. See DopplerClear, chapter 3.
export const dopplerShift = (f0, v) => (2 * f0 * v) / C;
// Kinetic energy of one sliding leaf.
export const kinetic = (m, v) => 0.5 * m * v * v;
// The speed a leaf may have for a given energy.
export const speedFor = (m, E) => Math.sqrt((2 * E) / m);
// Limits quoted in this box.
//  • ANSI/BHMA A156.10 (power operated pedestrian doors, USA): a sliding door "shall be adjusted so
//    that the closing speed is one foot per second maximum for doors weighing up to and including
//    160 lbs (71 kg) per leaf", and a stopped sliding door "shall not require more than 30 lbf (133 N),
//    measured at the leading edge, to prevent it from closing"; doors stay open at least 1.5 s after
//    the sensors lose the person. Read in a distributor's clause-by-clause summary of the standard
//    (autodoorandhardware.com), not in the paid standard itself.
//  • ANSI/BHMA A156.19 (low energy operators): kinetic energy of the moving door at most
//    1.25 lbf·ft (1.69 J). Same kind of source.
//  • EN 16005 (Europe): has clauses "Low energy movement" and "Limitation of impact forces" and a
//    normative Annex F of speed settings for low-energy doors (contents list of EN 16005:2023 and the
//    2015 corrigendum, read in the Slovak standards office's free preview). The corrigendum gives the
//    swing-door rule t = D √m ÷ 2.26 (t opening time in s, D leaf width in m, m leaf mass in kg).
//    The force and energy numbers in the body of EN 16005 are behind a paywall and are not quoted here.
export const FT = 0.3048, LBF = 4.448222;
export const V_A156 = 1 * FT;               // 0.305 m/s
export const M_A156 = 71;                   // kg per leaf
export const F_A156 = 30 * LBF;             // 133 N
export const E_LOW = 1.25 * LBF * FT;       // 1.69 J
export const HOLD_MIN = 1.5;                // s
export const lowEnergySwingTime = (D, m) => (D * Math.sqrt(m)) / 2.26;

// ---------------------------------------------------------------- formats
export const fmt0 = (v) => Math.round(v).toLocaleString('en-IN');
export const fmt1 = (v) => v.toFixed(1);
export const COL = { radar: '#6fb6ff', echo: '#ffb547', ir: '#ff5d6c', good: '#5ce1a9', bad: '#ff6b6b', text: '#e8eef8', soft: 'rgba(255,255,255,.62)', i: '#7fd0ff', q: '#ffb547', leafL: 0xff9d4d, leafR: 0x5fd6e8 };
export const hex = (c) => new THREE.Color(c).getHex();

// ---------------------------------------------------------------- small builders
const cylZ = (r, len, mat, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.rotation.x = Math.PI / 2; m.castShadow = true; return m; };
export const cylY = (r, len, mat, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); m.castShadow = true; return m; };
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const noShadow = (m) => { m.castShadow = false; m.receiveShadow = false; return m; };
export const glassMat = (o = 0.2) => M.clear(0xbfe4ff, o, { roughness: 0.35, envMapIntensity: 0.35 });

// One glass leaf with a slim frame. Its origin is the bottom centre.
export function makeLeaf(w = LEAF_W, h = LEAF_H, tint = 0x9aa3b2) {
  const g = new THREE.Group(), fr = M.metal(tint, { roughness: 0.4 });
  g.add(noShadow(at(box(w - 0.06, h - 0.1, 0.012, glassMat(0.2)), 0, h / 2, 0)));
  g.add(at(box(0.035, h, 0.04, fr), -w / 2 + 0.0175, h / 2, 0), at(box(0.035, h, 0.04, fr), w / 2 - 0.0175, h / 2, 0));
  g.add(at(box(w, 0.06, 0.04, fr), 0, 0.03, 0), at(box(w, 0.05, 0.04, fr), 0, h - 0.025, 0));
  return g;
}

// The whole entrance. Returns a group with parts and setOpen(x), x = travel of each leaf in metres.
export function makeDoor({ cover = 'solid', sensors = true } = {}) {
  const g = new THREE.Group();
  const alu = M.metal(0x8f97a6, { roughness: 0.45 }), dark = M.matte(0x1c2029);
  const half = W_OPEN / 2, out = half + SIDE_W;
  // posts, sidelights, threshold
  for (const sx of [-1, 1]) {
    g.add(at(box(0.07, HEAD_Y, 0.12, alu), sx * (out + 0.035), HEAD_Y / 2, 0));
    g.add(noShadow(at(box(SIDE_W, HEAD_Y - 0.08, 0.012, glassMat(0.14)), sx * (half + SIDE_W / 2), HEAD_Y / 2, 0.04)));
    g.add(at(box(0.04, HEAD_Y, 0.05, alu), sx * (half + 0.02), HEAD_Y / 2, 0.04));
    g.add(at(box(SIDE_W, 0.07, 0.05, alu), sx * (half + SIDE_W / 2), 0.035, 0.04));
    g.add(at(box(0.08, 0.03, 0.05, dark), sx * (half + 0.03), 0.015, -0.035));        // floor guide
  }
  g.add(at(box(2 * out, 0.008, 0.14, M.metal(0x6c7380, { roughness: 0.6 })), 0, 0.004, 0));
  // leaves
  const leafL = makeLeaf(), leafR = makeLeaf();
  leafL.position.set(-LEAF_W / 2, 0.02, -0.035); leafR.position.set(LEAF_W / 2, 0.02, -0.035);
  g.add(leafL, leafR);

  // ---- header operator
  const head = new THREE.Group(); g.add(head);
  const yT = HEAD_Y + HEAD_H;
  const back = at(box(HEAD_L, HEAD_H, 0.014, M.metal(0x59606d, { roughness: 0.6 })), 0, HEAD_Y + HEAD_H / 2, -0.12);
  const top = at(box(HEAD_L, 0.014, 0.25, M.metal(0x59606d, { roughness: 0.6 })), 0, yT, 0);
  const coverMat = cover === 'solid' ? M.metal(0x9aa3b2, { roughness: 0.4, transparent: true }) : M.clear(0xb9c6da, cover === 'clear' ? 0.16 : 0.0);
  const coverM = at(box(HEAD_L, HEAD_H + 0.014, 0.014, coverMat), 0, HEAD_Y + HEAD_H / 2 + 0.007, 0.125);
  if (cover !== 'solid') noShadow(coverM);
  for (const sx of [-1, 1]) head.add(at(box(0.014, HEAD_H, 0.25, M.metal(0x59606d, { roughness: 0.6 })), sx * HEAD_L / 2, HEAD_Y + HEAD_H / 2, 0));
  head.add(back, top, coverM);
  // track and carriages
  const track = at(box(HEAD_L - 0.1, 0.02, 0.05, M.metal(0xd8dde6, { roughness: 0.3 })), 0, HEAD_Y + 0.05, -0.035);
  head.add(track);
  const carriage = (color) => {
    const c = new THREE.Group(), steel = M.metal(0xc9ced8, { roughness: 0.35 });
    c.add(at(box(0.6, 0.07, 0.014, steel), 0, 0.105, 0));
    for (const dx of [-0.22, 0.22]) {
      c.add(at(cylZ(0.035, 0.03, M.plastic(0x23262e, { roughness: 0.6 })), dx, 0.095, 0.022));
      c.add(at(box(0.025, 0.1, 0.014, steel), dx, 0.02, 0));                             // hanger bolt down to the leaf
    }
    c.clampMat = M.plastic(color, { roughness: 0.4, emissive: new THREE.Color(color), emissiveIntensity: 0.25 });
    return c;
  };
  const yPul = HEAD_Y + 0.185, rPul = 0.045, zBelt = 0.05, aBelt = 1.7;
  const yLow = yPul - rPul, yUp = yPul + rPul;
  const carL = carriage(COL.leafL), carR = carriage(COL.leafR);
  // The left leaf is clamped to the LOWER run of the belt and the right leaf to the UPPER run.
  const clampL = new THREE.Group(), clampR = new THREE.Group();
  // (carriage-local heights: plate top 0.14, lower run 0.16, upper run 0.25; the belt is 0.085 in front)
  const lyLow = yLow - HEAD_Y + 0.02, lyUp = yUp - HEAD_Y + 0.02;
  clampL.add(at(box(0.03, lyLow - 0.13, 0.02, carL.clampMat), 0, (lyLow + 0.13) / 2, 0.03), at(box(0.09, 0.035, 0.08, carL.clampMat), 0, lyLow, 0.062));
  clampR.add(at(box(0.03, lyUp - 0.13, 0.02, carR.clampMat), 0, (lyUp + 0.13) / 2, 0.03), at(box(0.09, 0.035, 0.08, carR.clampMat), 0, lyUp, 0.062));
  carL.add(clampL); carR.add(clampR);
  carL.position.set(-LEAF_W / 2, HEAD_Y - 0.02, -0.035); carR.position.set(LEAF_W / 2, HEAD_Y - 0.02, -0.035);
  head.add(carL, carR);
  // belt: two straight runs, two half-turns, and teeth that travel
  const beltMat = M.matte(0x16181d);
  const belt = new THREE.Group(); head.add(belt);
  belt.add(at(box(2 * aBelt, 0.008, 0.03, beltMat), 0, yLow, zBelt), at(box(2 * aBelt, 0.008, 0.03, beltMat), 0, yUp, zBelt));
  const NT = 150, teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.012, 0.03), M.matte(0x3a3f4b), NT);
  teeth.instanceMatrix.setUsage(THREE.DynamicDrawUsage); teeth.frustumCulled = false; belt.add(teeth);
  const loopLen = 4 * aBelt + TAU * rPul, o3 = new THREE.Object3D();
  const placeTeeth = (shift) => {
    for (let i = 0; i < NT; i++) {
      let u = (((i / NT) * loopLen + shift) % loopLen + loopLen) % loopLen, x, y, a = 0;
      if (u < 2 * aBelt) { x = -aBelt + u; y = yUp - 0.008; }
      else if (u < 2 * aBelt + Math.PI * rPul) { a = (u - 2 * aBelt) / rPul; x = aBelt + Math.sin(a) * (rPul - 0.008); y = yPul + Math.cos(a) * (rPul - 0.008); }
      else if (u < 4 * aBelt + Math.PI * rPul) { x = aBelt - (u - 2 * aBelt - Math.PI * rPul); y = yLow + 0.008; a = Math.PI; }
      else { a = Math.PI + (u - 4 * aBelt - Math.PI * rPul) / rPul; x = -aBelt + Math.sin(a) * (rPul - 0.008); y = yPul + Math.cos(a) * (rPul - 0.008); }
      o3.position.set(x, y, zBelt); o3.rotation.set(0, 0, -a); o3.updateMatrix(); teeth.setMatrixAt(i, o3.matrix);
    }
    teeth.instanceMatrix.needsUpdate = true;
  };
  const pulley = (x, color) => {
    const p = new THREE.Group();
    p.add(cylZ(rPul - 0.004, 0.034, M.metal(color, { roughness: 0.35 })));
    p.add(at(box(0.012, rPul * 1.5, 0.036, M.matte(0x20232b)), 0, 0, 0.002), at(box(rPul * 1.5, 0.012, 0.036, M.matte(0x20232b)), 0, 0, 0.002));
    p.position.set(x, yPul, zBelt); head.add(p); return p;
  };
  const drive = pulley(-aBelt, 0xffb547), idler = pulley(aBelt, 0xc9ced8);
  // motor, gearbox, encoder
  const motor = new THREE.Group(); head.add(motor);
  motor.add(at(box(0.13, 0.15, 0.1, M.metal(0x4f6fa8, { roughness: 0.5 })), -aBelt, yPul + 0.02, -0.04));              // gearbox behind the pulley
  const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 28), M.metal(0x3c5f9e, { roughness: 0.4 }));
  mBody.rotation.z = Math.PI / 2; mBody.position.set(-aBelt + 0.2, yPul + 0.05, -0.04); mBody.castShadow = true; motor.add(mBody);
  const enc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 24), M.plastic(0x5ce1a9));
  enc.rotation.z = Math.PI / 2; enc.position.set(-aBelt + 0.35, yPul + 0.05, -0.04); motor.add(enc);
  // electronics row
  const yRow = yT - 0.07;
  const ctrl = new THREE.Group(); head.add(ctrl);
  ctrl.add(at(box(0.5, 0.085, 0.07, M.plastic(0x1f7a4d, { roughness: 0.6 })), -0.85, yRow, -0.05));
  for (let i = 0; i < 5; i++) ctrl.add(at(box(0.04, 0.03, 0.02, M.matte(0x101216)), -1.03 + i * 0.09, yRow, -0.008));
  const led = at(box(0.02, 0.02, 0.012, M.glow(0x5ce1a9)), -0.63, yRow + 0.02, -0.01); ctrl.add(led);
  const psu = at(box(0.36, 0.085, 0.07, M.metal(0x7b8494, { roughness: 0.55 })), -0.3, yRow, -0.05); head.add(psu);
  const battery = new THREE.Group(); head.add(battery);
  battery.add(at(box(0.34, 0.08, 0.07, M.plastic(0xe6b93a, { roughness: 0.5 })), 0.2, yRow, -0.05));
  battery.add(at(box(0.02, 0.03, 0.03, M.metal(0xd8dde6)), 0.385, yRow, -0.05));
  const lock = new THREE.Group(); head.add(lock);
  lock.add(at(box(0.16, 0.085, 0.06, M.plastic(0xc8434f, { roughness: 0.5 })), 0.75, yRow, -0.05));
  const bolt = at(box(0.026, 0.2, 0.026, M.metal(0xe8ecf2, { roughness: 0.25 })), 0.75, yRow - 0.1, -0.035); lock.add(bolt);
  // sensors: one outside, one inside, and two pairs of safety beams in the opening
  const sens = new THREE.Group(); g.add(sens);
  const sensorBox = (z) => {
    const s = new THREE.Group();
    s.add(box(0.26, 0.075, 0.06, M.plastic(0x15171c, { roughness: 0.35 })));
    s.add(at(box(0.2, 0.03, 0.012, M.plastic(0x4b1d24, { roughness: 0.15 })), 0, -0.012, Math.sign(z) * 0.031));
    s.position.set(0, SENSOR[1], z); s.rotation.x = Math.sign(z) * 0.25; return s;
  };
  const sensOut = sensorBox(SENSOR[2]), sensIn = sensorBox(-SENSOR[2]);
  sens.add(sensOut, sensIn); sens.visible = sensors;
  const cells = [0.5, 1.2].map((y) => {
    const a = at(box(0.03, 0.05, 0.03, M.plastic(0x15171c)), -half + 0.005, y, -0.085), b = at(box(0.03, 0.05, 0.03, M.plastic(0x15171c)), half - 0.005, y, -0.085);
    sens.add(a, b); return y;
  });

  let cur = 0;
  g.setOpen = (x) => {
    cur = clamp(x, 0, TRAVEL);
    leafL.position.x = -LEAF_W / 2 - cur; leafR.position.x = LEAF_W / 2 + cur;
    carL.position.x = leafL.position.x; carR.position.x = leafR.position.x;
    drive.rotation.z = idler.rotation.z = -cur / rPul;
    placeTeeth(cur);
  };
  g.setLock = (k) => { bolt.position.y = yRow - 0.1 + (1 - clamp(k, 0, 1)) * 0.07; };   // k = 1 thrown, 0 withdrawn
  g.setOpen(0); g.setLock(0);
  Object.assign(g, { leafL, leafR, head, cover: coverM, coverMat, back, top, track, carL, carR, clampL, clampR, belt, drive, idler, motor, enc, ctrl, led, psu, battery, lock, bolt, sens, sensOut, sensIn, cells, yPul, yLow, yUp, yRow, aBelt, rPul, zBelt });
  return g;
}

// A simple walking figure, 1.7 m tall, facing +z. walk(phase) swings the legs and arms.
export function makeWalker({ shirt = 0xffb547, skin = 0xc68b64, trousers = 0x2b3242 } = {}) {
  const g = new THREE.Group();
  const limb = (len, w, col, y) => { const p = new THREE.Group(); p.position.y = y; p.add(at(box(w, len, w, M.matte(col)), 0, -len / 2, 0)); g.add(p); return p; };
  const legL = limb(0.86, 0.13, trousers, 0.86), legR = limb(0.86, 0.13, trousers, 0.86);
  legL.position.x = -0.09; legR.position.x = 0.09;
  g.add(at(box(0.38, 0.56, 0.21, M.plastic(shirt, { roughness: 0.6 })), 0, 1.14, 0));
  const armL = limb(0.56, 0.09, shirt, 1.4), armR = limb(0.56, 0.09, shirt, 1.4);
  armL.position.x = -0.24; armR.position.x = 0.24;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), M.plastic(skin, { roughness: 0.7 })); head.position.y = 1.58; head.castShadow = true; g.add(head);
  g.walk = (phase, amt = 1) => {
    const a = Math.sin(phase) * 0.55 * amt;
    legL.rotation.x = a; legR.rotation.x = -a; armL.rotation.x = -a * 0.7; armR.rotation.x = a * 0.7;
  };
  g.walk(0, 0);
  return g;
}

// ---------------------------------------------------------------- wave rings on the floor
// A pool of flat arcs. Each remembers where and when it was born, and grows at the drawn wave speed.
// Echo arcs are born at the walker when an outgoing arc reaches them, so their spacing comes from the
// walker's motion, not from a drawing trick. (Same method as DopplerClear.)
export function makeRings(n, { color = 0x6fb6ff, width = 0.045, seg = 64, y = 0.03, opacity = 0.9 } = {}) {
  const g = new THREE.Group(), rings = [], idx = [];
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  for (let i = 0; i < n; i++) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array((seg + 1) * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    mesh.frustumCulled = false; mesh.visible = false; g.add(mesh);
    rings.push({ mesh, pos, live: false, x: 0, z: 0, t: 0, R: 0, a0: 0, a1: TAU, hit: false, k: 1 });
  }
  let next = 0;
  g.rings = rings;
  g.emit = (x, z, t, o = {}) => { const r = rings[next]; next = (next + 1) % n; Object.assign(r, { x, z, t, live: true, R: 0, a0: o.a0 ?? 0, a1: o.a1 ?? TAU, hit: false, k: o.k ?? 1 }); return r; };
  g.clear = () => rings.forEach((r) => { r.live = false; r.mesh.visible = false; });
  g.update = (now, speed, maxR) => {
    for (const r of rings) {
      if (!r.live) continue;
      r.R = (now - r.t) * speed;
      if (r.R > maxR || r.R < 0) { r.live = false; r.mesh.visible = false; continue; }
      r.mesh.visible = r.R > 0.03;
      const p = r.pos, ri = Math.max(0, r.R - width / 2), ro = r.R + width / 2;
      for (let i = 0; i <= seg; i++) {
        const a = r.a0 + ((r.a1 - r.a0) * i) / seg, c = Math.cos(a), s = Math.sin(a), k = i * 6;
        p[k] = r.x + c * ri; p[k + 1] = y; p[k + 2] = r.z + s * ri; p[k + 3] = r.x + c * ro; p[k + 4] = y; p[k + 5] = r.z + s * ro;
      }
      r.mesh.geometry.attributes.position.needsUpdate = true;
      r.mesh.material.opacity = opacity * r.k * Math.pow(clamp(1 - r.R / maxR, 0, 1), 0.6);
    }
  };
  return g;
}

// A flat ellipse on the floor (a detection zone), with an outline.
export function floorZone(rx, rz, color, opacity = 0.16) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false }));
  fill.rotation.x = -Math.PI / 2; fill.scale.set(rx, rz, 1);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  edge.rotation.x = -Math.PI / 2; edge.scale.set(rx, rz, 1); edge.position.y = 0.002;
  g.add(fill, edge); g.fill = fill; g.edge = edge;
  return g;
}
export function floorSlab(w, d, color = 0x151920, y = 0.001) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.matte(color)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.93)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const tex = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); m.renderOrder = 5; root.add(m);
  return Object.assign(tex, { mesh: m });
}
export function axes(g, { x0, x1, y0, y1, xMin = 0, xMax, yMin = 0, yMax, xTicks = [], yTicks = [], xFmt = String, yFmt = String, xLabel = '', yLabel = '', fs = 19 }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0), Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.7)'; g.font = fs + 'px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, Math.min(x1 - g.measureText(s).width, X(t) - g.measureText(s).width / 2), y0 + fs + 6); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 8 - g.measureText(s).width, Y(t) + fs / 3); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = (fs - 1) + 'px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 46);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 8);
  return { X, Y, x0, x1, y0, y1 };
}
export function line(g, pts, X, Y, col, wdt = 4, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 9) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function text(g, s, x, y, col = COL.text, font = '18px sans-serif') { g.fillStyle = col; g.font = font; g.fillText(s, x, y); }

// ---------------------------------------------------------------- layout
// The stage's floor grid, seen through several panes of glass, sorts unevenly and reads as stripes on
// the glass. These scenes lay their own floor, so the grid is switched off while a chapter is open.
export function hideGrid(stage) {
  const grid = stage.floor.children.find((c) => c.isLineSegments || c.type === 'GridHelper');
  if (!grid) return () => {};
  grid.visible = false;
  return () => { grid.visible = true; };
}
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], drop = -0.14) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? drop : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model on a wide screen. In the tall video they move; on a phone they hide,
// because the readout would cover them.
export function placeBoard(b, wide, tall, stage) {
  const reel = inReel();
  b.mesh.visible = reel || stage.host.clientWidth >= 560;
  const p = reel && stage.host.clientWidth < stage.host.clientHeight ? tall : wide;
  b.mesh.position.set(p[0], p[1], p[2]); b.mesh.scale.setScalar(p[3] ?? 1); b.mesh.rotation.y = p[4] ?? 0;
}
// Each scene can ask for its own camera in the tall video or on a phone.
export function altView(stage, key, v) {
  if (stage.altKey === key) return;
  stage.altKey = key; stage.setView(v.pos, v.target, 0.6);
}
export const isTall = (stage) => stage.host.clientWidth < stage.host.clientHeight;
// In the recorded video there is no readout, so each scene gets a centred view: one for the wide
// video and one for the tall one. (The stage backs the camera off by up to 2.5 times on a tall
// frame, so the tall views are given close in.) Returns true while recording.
export function reelView(stage, key, wide, tall) {
  if (!inReel()) return false;
  const t = isTall(stage);
  altView(stage, key + (t ? ':tall' : ':wide'), t ? tall : wide);
  return true;
}
export { beam };
