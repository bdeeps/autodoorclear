// Chapter 6: four other automatic doors, each a small working model (metres).
//  • Swing operator: a motor in a box on the frame turns a spindle; a two-link arm (0.26 m and 0.24 m)
//    pushes the leaf. The elbow is solved from the two link lengths every frame. "Low-energy" operators
//    move slowly enough to need no safety sensors: EN 16005 Annex F (as corrected in 2015) sets the
//    shortest opening time t = D √m ÷ 2.26 seconds (D leaf width in m, m leaf mass in kg), and the US
//    A156.19 caps kinetic energy at 1.25 lbf·ft (1.69 J) and the stopping push at 15 lbf (67 N).
//  • Revolving door: four wings in a drum 2.3 m across. The two curved walls each cover more than a
//    quarter turn, so there is never an open path from outside to inside: an air lock that keeps
//    turning. Each quarter-turn can carry one compartment of air, π r² h ÷ 4, across. Theophilus Van
//    Kannel patented it in the USA in 1888 (US 387,571, "Storm-Door Structure"). A 2006 MIT student
//    study of one campus building found a swing door let through up to 8 times as much air (as
//    reported in later summaries of the study; we did not read the original report).
//  • Platform screen doors: the train stops, the signalling system confirms it is berthed in the right
//    place and tells both sets of doors to open; the train may not leave until the platform doors
//    are proved closed and locked. The platform doors here are 1.6 m wide against 1.3 m train doors,
//    so a stop that is a little off still lines up (model sizes, not a quoted specification).
//  • Lift doors: only the car has a door motor. A vane on the car door closes round rollers on the
//    landing door, which lifts that door's lock hook, and the car door then drags the landing door
//    with it. A light curtain (a grid of infrared beams) guards the entrance.
import { THREE, M, box, clamp, smooth, approach } from '../kit.js';
import { makeLeaf, makeWalker, floorSlab, glassMat, cylY, lowEnergySwingTime, E_LOW, LBF, TAU, COL, fmt0, fitNarrow, inReel, isTall, altView , hideGrid , reelView } from '../door.js';

const DEG = Math.PI / 180;
const VIEWS = {
  swing: { pos: [1.9, 2.9, 3.7], target: [0.1, 2.0, 0.3] },
  revolve: { pos: [2.6, 4.9, 4.4], target: [0, 1.9, 0] },
  psd: { pos: [5.2, 4.6, 8.4], target: [0, 2.3, -0.6] },
  lift: { pos: [2.0, 2.6, 3.9], target: [0, 2.0, -0.3] },
};
const WIDE = {
  swing: { pos: [2.3, 2.4, 4.2], target: [0.1, 1.25, 0.3] },
  revolve: { pos: [2.9, 4.0, 4.5], target: [0, 1.0, 0] },
  psd: { pos: [5.0, 3.6, 8.0], target: [0, 1.2, -0.6] },
  lift: { pos: [2.3, 2.2, 4.2], target: [0, 1.3, -0.3] },
};
const TALL = {
  swing: { pos: [1.06, 1.89, 2.14], target: [0.1, 1.25, 0.3] },
  revolve: { pos: [1.08, 3.2, 2.3], target: [0, 1.15, 0] },
  psd: { pos: [3.95, 2.6, 3.6], target: [2.0, 1.25, -0.3] },
  lift: { pos: [0.9, 1.75, 1.55], target: [0, 1.25, -0.3] },
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const ghost = (m) => { m.castShadow = false; return m; };
const R_REV = 1.15, H_REV = 2.3;
const V_COMP = (Math.PI * R_REV * R_REV * H_REV) / 4;

export default {
  id: 'others',
  short: 'Other doors',
  title: 'Four other automatic doors',
  subtitle: 'A swing door, a revolving door, a metro platform door and a lift door, each built around one idea.',
  view: VIEWS.swing,
  learn: `<p>Sliding doors are only one family. The same ideas, a motor, a sensor and a careful controller, turn up in other shapes.</p>
    <p>A <b>swing-door operator</b> is a box above an ordinary hinged door with a folding arm. Press the wheelchair button at a hospital or bank and it sweeps the door open slowly. Most are <b>low-energy</b>: so slow and gentle, under about 1.7 joules in the American standard, that the door can be stopped with one hand. That makes them a cheap way to make an old doorway <b>accessible</b>. India's National Building Code 2016 has a whole annex on accessible buildings: BIS's guide to it asks for entrance doors at least 900 mm wide, and for lifts whose automatic sliding doors open at least 900 mm and have touch-free sensors so they never close on someone.</p>
    <p>A <b>revolving door</b> is a moving <b>air lock</b>. Its wings always seal against the curved walls, so there is never a straight path for air between street and lobby. In a tall air-conditioned building that matters a lot: the height makes warm air rise and pull a draught through every open door, called the <b>stack effect</b>. A revolving door passes people and almost no wind. An <b>air curtain</b> tries the same job with no door at all: a fan blows a flat sheet of air down across an open doorway.</p>
    <p><b>Platform screen doors</b> stand between you and the track on the Delhi Airport Express, on Delhi's Magenta and Pink lines, in Chennai's underground stations and on Kolkata's Green Line. They do not sense you at all. They obey the <b>train</b>. Only when the signalling system knows the train has stopped in exactly the right place do both sets of doors open together. And the train cannot leave until every platform door reports closed and locked.</p>
    <p><b>Lift doors</b> come in pairs: one on the car, one on every floor. Only the car door has a motor. When the car arrives, a <b>vane</b> on its door grips rollers on the landing door, unhooks its lock, and drags it along. So a landing door cannot open unless a car is really there. A <b>light curtain</b> of dozens of infrared beams guards the gap.</p>
    <p>Every automatic door also leaks <b>energy</b> each time it opens, as cooled or warmed air spills out. That is why good doors open quickly, close as soon as it is safe, and ignore people who are only walking past.</p>
    <p class="tip"><b>Try it:</b> pick each door and scrub it through its cycle by hand. In the lift, watch the vane grip before anything moves. On the platform, watch which opens first.</p>`,
  terms: [
    { t: 'Swing-door operator', d: 'A motor unit with an arm that opens and closes a hinged door.' },
    { t: 'Low-energy operator', d: 'An operator slow and gentle enough that the moving door carries very little kinetic energy.' },
    { t: 'Air lock', d: 'A space with two barriers, of which at least one is always closed, so air cannot flow straight through.' },
    { t: 'Stack effect', d: 'The draught through a tall building caused by warm air rising inside it.' },
    { t: 'Platform screen door', d: 'A door at the platform edge that opens only when a train is stopped behind it.' },
    { t: 'Interlock', d: 'A link between two systems so that one cannot act until the other is in a safe state.' },
    { t: 'Light curtain', d: 'A grid of light beams across an opening. Breaking any beam stops or re-opens the door.' },
  ],
  defaults: { kind: 'swing', work: 0, play: true, mass: 60 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Which door', options: [{ v: 'swing', label: 'Swing' }, { v: 'revolve', label: 'Revolving' }, { v: 'psd', label: 'Metro platform' }, { v: 'lift', label: 'Lift' }] },
    { key: 'play', type: 'toggle', label: 'Run by itself' },
    { key: 'work', type: 'range', label: 'Step through the cycle', min: 0, max: 1, step: 0.002, ends: ['start', 'end'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'mass', type: 'range', label: 'Swing door: mass of the leaf', min: 20, max: 120, step: 1, fmt: (v) => v + ' kg' },
  ],
  quiz: [
    { q: 'Why does a revolving door save energy in a tall building?', options: ['It turns a generator', 'It is always closed to air: there is never a straight path from outside to inside', 'It is made of thicker glass', 'It moves faster than a sliding door'], answer: 1, why: 'Its wings always seal against the curved walls, so the draught of the stack effect cannot blow through.' },
    { q: 'What tells a metro platform screen door to open?', options: ['A motion sensor watching passengers', 'The station master\'s button', 'The weight of people on the platform', 'The signalling system, once the train has stopped in the right place'], answer: 3, why: 'Platform doors are interlocked with the train. They ignore the passengers.' },
    { q: 'In a lift, what moves the landing door on each floor?', options: ['The car door, through a vane that grips the landing door\'s rollers', 'Its own motor on every floor', 'A counterweight', 'The passengers push it'], answer: 0, why: 'Only the car has a door motor. So a landing door can open only when the car is there.' },
  ],
  reel: [
    { ms: 5000, caption: 'A revolving door is an air lock that never stops: there is no straight path for a draught.', set: { kind: 'revolve', play: false }, anim: { work: [0.05, 0.85] }, spin: 0 },
    { ms: 5500, caption: 'Metro platform doors ignore you and obey the train: both sets open only when it stops in the right place.', set: { kind: 'psd', play: false }, anim: { work: [0.05, 0.62] }, spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const root = new THREE.Group(); stage.root.add(root);
    const alu = M.metal(0x8f97a6, { roughness: 0.45 }), darkM = M.matte(0x1c2029);

    // ================================================================ swing operator
    const gS = new THREE.Group(); root.add(gS);
    gS.add(floorSlab(4.6, 4.6, 0x12151b));
    for (const sx of [-1, 1]) { gS.add(ghost(at(box(1.2, 2.6, 0.1, M.clear(0x9fb0c8, 0.1)), sx * 1.1, 1.3, 0))); gS.add(at(box(0.06, 2.16, 0.12, alu), sx * 0.5, 1.08, 0)); }
    gS.add(at(box(1.06, 0.06, 0.12, alu), 0, 2.16, 0)); gS.add(ghost(at(box(3.4, 0.42, 0.1, M.clear(0x9fb0c8, 0.1)), 0, 2.4, 0)));
    const sLeaf = new THREE.Group(); sLeaf.position.set(-0.45, 0, 0.0); gS.add(sLeaf);
    const sPanel = box(0.9, 2.1, 0.045, M.plastic(0xa9764a, { roughness: 0.6 })); sPanel.position.set(0.45, 1.06, 0); sLeaf.add(sPanel);
    sLeaf.add(at(box(0.03, 0.14, 0.07, M.metal(0xd8dde6)), 0.82, 1.05, 0.03));
    sLeaf.add(at(box(0.1, 0.03, 0.05, darkM), 0.45, 2.125, 0.03));                           // bracket on the leaf
    const opBox = at(box(0.72, 0.13, 0.12, M.metal(0x4f6fa8, { roughness: 0.5 })), -0.1, 2.26, 0.12); gS.add(opBox);
    const S = [-0.15, 0.14], L1 = 0.26, L2 = 0.24;
    gS.add(at(cylY(0.02, 0.1, M.metal(0xd8dde6)), S[0], 2.17, S[1]));
    const link = (col) => { const m = box(1, 0.022, 0.035, M.metal(col, { roughness: 0.35 })); gS.add(m); return m; };
    const linkA = link(0xffb547), linkB = link(0xd8dde6);
    const elbow = cylY(0.022, 0.05, M.metal(0xd8dde6)); gS.add(elbow);
    const setLink = (m, ax, az, bx, bz, y) => { const dx = bx - ax, dz = bz - az; m.scale.x = Math.hypot(dx, dz); m.position.set((ax + bx) / 2, y, (az + bz) / 2); m.rotation.y = -Math.atan2(dz, dx); };
    const button = at(box(0.12, 0.12, 0.03, M.plastic(0x2f6fd6)), 1.2, 1.0, 0.07); gS.add(button);
    const sLab = [
      stage.label('Operator: motor, gears and spring', [0, 0.2, 0], opBox, 'hot'),
      stage.label('Folding arm', [0, 0.12, 0], elbow),
      stage.label('Push button', [0, 0.16, 0], button),
    ];

    // ================================================================ revolving door
    const gR = new THREE.Group(); root.add(gR);
    gR.add(floorSlab(6, 6.4, 0x12151b));
    for (const mid of [Math.PI / 2, (3 * Math.PI) / 2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(R_REV + 0.02, R_REV + 0.02, H_REV, 40, 1, true, mid - 50 * DEG, 100 * DEG), glassMat(0.22)); w.position.y = H_REV / 2; gR.add(w);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) gR.add(at(box(1.6, 2.5, 0.1, M.matte(0x2a2f3a)), sx * (R_REV * Math.sin(40 * DEG) + 0.82), 1.25, sz * 0.0));
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(R_REV + 0.06, R_REV + 0.06, 0.12, 48), M.clear(0x8f97a6, 0.25)); canopy.position.y = H_REV + 0.06; canopy.castShadow = false; gR.add(canopy);
    const rot = new THREE.Group(); gR.add(rot);
    rot.add(at(cylY(0.05, H_REV, alu), 0, H_REV / 2, 0));
    for (const ry of [0, Math.PI / 2]) { const wing = ghost(box(2 * R_REV - 0.04, H_REV - 0.1, 0.02, glassMat(0.3))); wing.position.y = H_REV / 2; wing.rotation.y = ry; rot.add(wing); const rail = box(2 * R_REV - 0.04, 0.05, 0.035, alu); rail.position.y = 1.0; rail.rotation.y = ry; rot.add(rail); }
    const wedges = [0, 1, 2, 3].map((k) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
      const m = new THREE.Mesh(new THREE.CircleGeometry(R_REV - 0.03, 20, (k * Math.PI) / 2, Math.PI / 2), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.012; rot.add(m);
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      return { mat, beta: Math.atan2(Math.cos(a), -Math.sin(a)), mix: 0.5 };
    });
    const rWalker = makeWalker({ shirt: 0xffb547 }); gR.add(rWalker);
    const rLab = [
      stage.label('Outside air', [-1.7, 0.05, 1.7], gR), stage.label('Inside air', [-1.7, 0.05, -1.9], gR),
      stage.label('Curved wall: wider than one compartment', [R_REV + 0.1, 2.5, 0], gR, 'hot'),
    ];
    const cOut = new THREE.Color(0x6fb6ff), cIn = new THREE.Color(0xffa24d);

    // ================================================================ platform screen doors
    const gP = new THREE.Group(); root.add(gP);
    const plat = floorSlab(12, 3.6, 0x2a2f3a); plat.position.z = 1.7; gP.add(plat);
    gP.add(at(box(12, 0.02, 0.5, M.matte(0xe6b93a)), 0, 0.011, 0.45));                       // the tactile warning strip
    const DOORX = [-2.4, 2.4], PW = 1.6, TW = 1.3;
    gP.add(at(box(11.6, 0.24, 0.16, alu), 0, 2.32, 0));
    const fixed = [[-5.8, -3.2], [-1.6, 1.6], [3.2, 5.8]];
    fixed.forEach(([a, b]) => { gP.add(ghost(at(box(b - a, 2.2, 0.014, glassMat(0.16)), (a + b) / 2, 1.1, 0.03))); gP.add(at(box(0.05, 2.2, 0.08, alu), a, 1.1, 0), at(box(0.05, 2.2, 0.08, alu), b, 1.1, 0)); });
    const pLeaves = DOORX.map((x) => { const a = makeLeaf(PW / 2, 2.15, 0xb8c0cc), b = makeLeaf(PW / 2, 2.15, 0xb8c0cc); gP.add(a, b); const lamp = at(box(0.3, 0.06, 0.05, M.glow(0xff4040)), x, 2.32, 0.1); gP.add(lamp); return { x, a, b, lamp }; });
    const train = new THREE.Group(); gP.add(train);
    const bodyM = M.metal(0xc9ced8, { roughness: 0.4 }), stripe = M.plastic(0x3d7bd9);
    [[-6.2, -3.05], [-1.75, 1.75], [3.05, 6.2]].forEach(([a, b]) => {
      train.add(at(box(b - a, 2.5, 2.6, bodyM), (a + b) / 2, 1.25, -1.62));
      train.add(at(box(b - a - 0.5, 0.75, 0.02, M.plastic(0x1a2333, { roughness: 0.2 })), (a + b) / 2, 1.55, -0.31));
      train.add(at(box(b - a, 0.12, 0.02, stripe), (a + b) / 2, 0.85, -0.31));
    });
    train.add(at(box(12.4, 0.3, 2.6, bodyM), 0, 2.45, -1.62));
    const tLeaves = DOORX.map((x) => { const mk = () => { const g = new THREE.Group(); g.add(box(TW / 2, 2.1, 0.03, M.metal(0x9aa3b2, { roughness: 0.35 }))); g.add(at(box(TW / 2 - 0.16, 0.7, 0.035, M.plastic(0x1a2333, { roughness: 0.2 })), 0, 0.45, 0)); train.add(g); return g; }; return { x, a: mk(), b: mk() }; });
    const inside = at(box(12.2, 2.1, 0.02, M.glow(0x2b3040)), 0, 1.15, -0.5); train.add(inside);
    const pWalkers = [makeWalker({ shirt: 0x7fd0ff }), makeWalker({ shirt: 0xff9d4d }), makeWalker({ shirt: 0x5ce1a9 })];
    pWalkers.forEach((p) => gP.add(p));
    const pLab = [
      stage.label('Platform screen doors', [0, 2.7, 0], gP, 'hot'),
      stage.label('Train doors', [2.4, 2.25, -0.3], train),
      stage.label('Platform', [-4.4, 0.05, 2.4], gP),
    ];

    // ================================================================ lift doors
    const gL = new THREE.Group(); root.add(gL);
    const lFloor = floorSlab(3.4, 2.4, 0x1a1e27); lFloor.position.z = 1.2; gL.add(lFloor);
    const wallM = M.clear(0x9fb0c8, 0.12);
    gL.add(ghost(at(box(1.0, 2.7, 0.08, wallM), -0.95, 1.35, 0)), ghost(at(box(1.0, 2.7, 0.08, wallM), 0.95, 1.35, 0)), ghost(at(box(0.9, 0.6, 0.08, wallM), 0, 2.4, 0)));
    gL.add(at(box(0.05, 2.1, 0.1, alu), -0.475, 1.05, 0), at(box(0.05, 2.1, 0.1, alu), 0.475, 1.05, 0), at(box(1.0, 0.05, 0.1, alu), 0, 2.125, 0));
    const landM = M.metal(0xb9bec8, { roughness: 0.4, transparent: true, opacity: 0.55 });
    const land = [-1, 1].map((sx) => { const g = new THREE.Group(); g.add(at(box(0.45, 2.1, 0.03, landM), 0, 1.05, 0)); g.add(at(box(0.3, 0.1, 0.02, M.metal(0xd8dde6)), 0, 2.2, 0)); gL.add(g); return g; });
    const rollers = [-0.035, 0.035].map((dx) => { const r = cylY(0.018, 0.03, M.plastic(0xffb547)); r.rotation.x = Math.PI / 2; r.position.set(dx, 2.2, -0.03); land[0].add(r); return r; });
    const hook = at(box(0.14, 0.03, 0.02, M.plastic(0xc8434f)), 0.12, 2.26, -0.02); land[0].add(hook);
    gL.add(at(box(1.9, 0.03, 0.04, M.metal(0xd8dde6)), 0, 2.27, -0.02));                    // landing door track
    const car = new THREE.Group(); gL.add(car);
    const carM = M.metal(0x7b8494, { roughness: 0.5 });
    car.add(at(box(1.5, 0.08, 1.4, carM), 0, -0.04, -0.85), at(box(1.5, 0.08, 1.4, carM), 0, 2.36, -0.85), at(box(1.5, 2.4, 0.05, carM), 0, 1.16, -1.55));
    car.add(ghost(at(box(0.04, 2.4, 1.4, M.clear(0x9fb0c8, 0.14)), -0.75, 1.16, -0.85)), ghost(at(box(0.04, 2.4, 1.4, M.clear(0x9fb0c8, 0.14)), 0.75, 1.16, -0.85)));
    const cdoor = [-1, 1].map((sx) => { const g = new THREE.Group(); g.add(at(box(0.45, 2.1, 0.03, M.metal(0x4f6fa8, { roughness: 0.45 })), 0, 1.05, 0)); car.add(g); return g; });
    const vanes = [-1, 1].map((sx) => { const v = at(box(0.012, 0.3, 0.07, M.plastic(0x5ce1a9)), 0, 2.2, 0.06); cdoor[0].add(v); return v; });
    const opM = at(box(0.3, 0.14, 0.16, M.metal(0x3c5f9e, { roughness: 0.4 })), -0.5, 2.48, -0.3); car.add(opM);
    car.add(at(box(1.3, 0.02, 0.03, darkM), 0.1, 2.46, -0.3));
    const passenger = makeWalker({ shirt: 0x7fd0ff }); passenger.position.set(0.15, 0, -0.9); car.add(passenger);
    const curtain = new THREE.Group(); car.add(curtain);
    for (let i = 0; i < 16; i++) curtain.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.44, 0.12 + i * 0.115, -0.07), new THREE.Vector3(0.44, 0.12 + i * 0.115, -0.07)]), new THREE.LineBasicMaterial({ color: 0xff5d6c, transparent: true, opacity: 0.75 })));
    const lLab = [
      stage.label('Vane on the car door', [0, 0.26, 0.05], vanes[1], 'hot'),
      stage.label('Landing door (no motor)', [0.2, 0.5, 0.1], land[1]),
      stage.label('Door motor on the car', [0, 0.2, 0], opM),
      stage.label('Light curtain', [-0.75, 1.5, 0], car),
    ];

    const st = { w: 0, kind: '', stage: '', th: 0, lock: true, gap: 0 };
    return {
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [], -0.12);
        const k = s.kind;
        if (k !== st.kind) { st.kind = k; s.work = 0; }
        if (!reelView(stage, k, WIDE[k], TALL[k])) altView(stage, k + (narrow ? 'n' : 'w'), VIEWS[k]);
        if (s.play && !inReel()) s.work = (s.work + dt / (k === 'psd' ? 16 : k === 'lift' ? 12 : 10)) % 1;
        const w = st.w = clamp(s.work, 0, 1);
        gS.visible = k === 'swing'; gR.visible = k === 'revolve'; gP.visible = k === 'psd'; gL.visible = k === 'lift';
        sLab.forEach((l, i) => { l.visible = k === 'swing' && !inReel() && (!narrow || i === 0); });
        rLab.forEach((l, i) => { l.visible = k === 'revolve' && !inReel() && (!narrow || i === 2); });
        pLab.forEach((l, i) => { l.visible = k === 'psd' && !inReel() && (!narrow || i === 0); });
        lLab.forEach((l, i) => { l.visible = k === 'lift' && !inReel() && (!narrow || i === 0); });
        if (k === 'swing') {
          // open over the first 40 %, hold, close over the last 40 %
          const th = st.th = 90 * DEG * (smooth(w / 0.4) - smooth((w - 0.6) / 0.4));
          sLeaf.rotation.y = -th;
          const bx = -0.45 + 0.45 * Math.cos(th), bz = 0.45 * Math.sin(th) + 0.03;
          const dx = bx - S[0], dz = bz - S[1], d = Math.min(L1 + L2 - 1e-4, Math.hypot(dx, dz));
          const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
          // pick the elbow that sits further out from the wall
          const e1 = [S[0] + (a * dx) / d + (h * dz) / d, S[1] + (a * dz) / d - (h * dx) / d], e2 = [S[0] + (a * dx) / d - (h * dz) / d, S[1] + (a * dz) / d + (h * dx) / d];
          const e = e1[1] > e2[1] ? e1 : e2;
          setLink(linkA, S[0], S[1], e[0], e[1], 2.15); setLink(linkB, e[0], e[1], bx, bz, 2.13);
          elbow.position.set(e[0], 2.14, e[1]);
          st.stage = w < 0.4 ? 'Opening slowly' : w < 0.6 ? 'Held open' : w < 0.999 ? 'Closing slowly' : 'Closed';
        } else if (k === 'revolve') {
          rot.rotation.y = TAU * (w - 0.2) + Math.PI / 4;
          wedges.forEach((wd) => {
            const c = Math.cos(wd.beta + rot.rotation.y);
            if (c > 0.72) wd.mix = approach(wd.mix, 0, 6, dt || 0.016); else if (c < -0.72) wd.mix = approach(wd.mix, 1, 6, dt || 0.016);
            wd.mat.color.copy(cOut).lerp(cIn, wd.mix);
          });
          const r = 0.62;
          if (w < 0.2) { rWalker.position.set(0, 0, 2.9 - (2.9 - r) * (w / 0.2)); rWalker.rotation.y = Math.PI; }
          else if (w < 0.7) { const b = TAU * (w - 0.2); rWalker.position.set(r * Math.sin(b), 0, r * Math.cos(b)); rWalker.rotation.y = b + Math.PI / 2; }
          else { rWalker.position.set(0, 0, -r - (2.9 - r) * ((w - 0.7) / 0.3)); rWalker.rotation.y = Math.PI; }
          rWalker.walk(w * 60, 1);
          st.stage = w < 0.2 ? 'Walking in from outside' : w < 0.7 ? 'Inside a sealed compartment' : 'Out into the lobby';
        } else if (k === 'psd') {
          const arr = clamp(w / 0.3, 0, 1), dep = clamp((w - 0.9) / 0.1, 0, 1);
          train.position.x = -15 * (1 - arr) ** 2 + 15 * dep * dep;
          const pOpen = smooth((w - 0.36) / 0.1) - smooth((w - 0.72) / 0.1), tOpen = smooth((w - 0.38) / 0.1) - smooth((w - 0.7) / 0.1);
          pLeaves.forEach((p) => { p.a.position.set(p.x - PW / 4 - pOpen * PW / 2, 0.01, 0.0); p.b.position.set(p.x + PW / 4 + pOpen * PW / 2, 0.01, 0.0); p.lamp.material.color.setHex(pOpen > 0.02 ? 0x5ce1a9 : 0xff4040); });
          tLeaves.forEach((t) => { t.a.position.set(t.x - TW / 4 - tOpen * TW / 2, 1.1, -0.29); t.b.position.set(t.x + TW / 4 + tOpen * TW / 2, 1.1, -0.29); });
          const board = smooth((w - 0.5) / 0.18);
          pWalkers.forEach((p, i) => { const x0 = [-2.6, -2.1, 2.5][i], z0 = [1.5, 2.2, 1.7][i]; p.position.set(x0 + (DOORX[i < 2 ? 0 : 1] - x0) * board, 0, z0 + (-1.2 - z0) * smooth((w - 0.5 - i * 0.03) / 0.18) + (w < 0.5 ? 0 : 0)); p.rotation.y = Math.PI; p.walk(w * 90, board > 0.02 && board < 0.98 ? 1 : 0); p.visible = w < 0.9; if (w >= 0.72) p.position.x += train.position.x; });
          st.gap = pOpen;
          st.stage = w < 0.3 ? 'Train arriving' : w < 0.36 ? 'Stopped: checking the position' : w < 0.47 ? 'Both sets of doors opening' : w < 0.72 ? 'Doors open' : w < 0.83 ? 'Doors closing' : w < 0.9 ? 'Platform doors proved locked' : 'Train departs';
        } else {
          const rise = smooth(w / 0.3);
          car.position.y = -1.7 * (1 - rise);
          const grip = smooth((w - 0.3) / 0.08) - smooth((w - 0.95) / 0.05);
          const op = smooth((w - 0.4) / 0.22) - smooth((w - 0.74) / 0.2);
          const tr = op * 0.45;
          cdoor[0].position.set(-0.225 - tr, 0, -0.1); cdoor[1].position.set(0.225 + tr, 0, -0.1);
          land[0].position.set(-0.225 - tr, 0, -0.03); land[1].position.set(0.225 + tr, 0, -0.03);
          // the vane blades close on the rollers (which sit at ±35 mm on the landing door, and the vane
          // is carried by the car door, so it is offset to meet them)
          vanes.forEach((v, i) => { v.position.x = (i ? 1 : -1) * (0.075 - 0.022 * grip); });
          hook.rotation.z = grip * 0.5; st.lock = grip < 0.5;
          curtain.visible = op > 0.03;
          st.gap = op;
          st.stage = w < 0.3 ? 'Car arriving' : w < 0.4 ? 'Vane grips the rollers: lock released' : w < 0.62 ? 'Car door drags the landing door open' : w < 0.74 ? 'Open: light curtain on guard' : w < 0.95 ? 'Closing together' : 'Vane lets go: landing door locked';
        }
      },
      readout: (s) => {
        if (s.kind === 'swing') {
          const t = lowEnergySwingTime(0.9, s.mass);
          return `<div class="big">${st.stage}</div>
            <div class="row"><span>Door angle</span><b>${Math.round(st.th / DEG)}°</b></div>
            <div class="row"><span>Leaf</span><b>0.9 m wide, ${s.mass} kg</b></div>
            <div class="row"><span>Shortest low-energy opening time</span><b>${t.toFixed(1)} s</b></div>
            <div class="row"><span>Energy allowed in the moving leaf</span><b>${E_LOW.toFixed(2)} J</b></div>
            <small>t = D × √m ÷ 2.26 (EN 16005, Annex F). A heavier leaf must open more slowly. A push of ${fmt0(15 * LBF)} N must be able to stop it (A156.19).</small>`;
        }
        if (s.kind === 'revolve') {
          return `<div class="big">${st.stage}</div>
            <div class="row"><span>Straight path for air</span><b>never</b></div>
            <div class="row"><span>Air one compartment holds</span><b>${V_COMP.toFixed(1)} m³</b></div>
            <div class="row"><span>Drum</span><b>${(2 * R_REV).toFixed(1)} m across, 4 wings</b></div>
            <small>Blue floor: a compartment last open to the street. Orange: last open to the lobby. A 2006 MIT student study found a swing door let through up to 8 times as much air.</small>`;
        }
        if (s.kind === 'psd') {
          const w = st.w, berthed = w >= 0.3 && w < 0.9, locked = st.gap < 0.02;
          return `<div class="big">${st.stage}</div>
            <div class="row"><span>Train stopped at the mark</span><b>${berthed ? 'yes' : 'no'}</b></div>
            <div class="row"><span>Platform doors</span><b>${locked ? 'closed and locked' : 'open'}</b></div>
            <div class="row"><span>Train may leave</span><b class="${berthed && locked && w > 0.83 ? 'ok' : ''}">${locked && (w > 0.83 || w < 0.3) ? 'yes' : 'no'}</b></div>
            <small>Platform doors here are 1.6 m wide, train doors 1.3 m, so a stop that is slightly off still lines up.</small>`;
        }
        return `<div class="big">${st.stage}</div>
          <div class="row"><span>Landing door lock</span><b>${st.lock ? 'hooked' : 'released by the vane'}</b></div>
          <div class="row"><span>Doors open</span><b>${Math.round(st.gap * 90)} cm</b></div>
          <div class="row"><span>Light curtain</span><b>${st.gap > 0.03 ? '16 beams watching' : 'off: doors shut'}</b></div>
          <small>The landing door has no motor. It can move only when a car is behind it and the vane has gripped.</small>`;
      },
    };
  },
};
