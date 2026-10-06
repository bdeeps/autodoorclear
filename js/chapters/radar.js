// Chapter 2: the microwave motion sensor, a small continuous-wave Doppler radar above the door.
//   Δf = 2 f₀ v_r ÷ c, with v_r the walker's speed ALONG the line to the sensor (positive when closing).
//   Door sensors work in the K band around 24 GHz (the licence-free band is 24.05 to 24.25 GHz; common
//   door sensors state 24.125 or 24.150 GHz, e.g. the transmitter frequency on BEA's published data
//   sheets). Older units used the X band at 10.525 GHz. A 1.4 m/s walker heading straight at a
//   24.125 GHz sensor gives 2 × 24.125e9 × 1.4 ÷ 299,792,458 = 225 Hz, and 98 Hz at 10.525 GHz.
//   The sensor sits 2.3 m up and looks down and out, so the speed along the beam is the walking speed
//   times the cosine of the angle between the walk and the line to the sensor: it is computed here
//   from the geometry every frame, and it changes sign when a passer-by goes past the middle.
// Direction: the echo is mixed with the transmitted wave twice, in two mixers a quarter of a wavelength
//   apart. The two outputs (called I and Q) are the same beat tone a quarter-cycle apart, and which one
//   leads tells whether the target is closing or receding. A direction-sensing ("unidirectional")
//   sensor opens the door only for closing targets. Sensors ignore very slow drift: data sheets give
//   a minimum detection speed of about 5 cm/s, used as the threshold here.
// The detection zone drawn on the floor is 3.0 m wide and 2.3 m deep, starting 0.15 m from the door.
//   (A156.10, as summarised by a US distributor, asks for an activation zone at least 43 in (1.09 m)
//   deep; a UK technical article on EN 16005 gives 1.0 m, and 1.5 m on escape routes.)
// The door's own motion here is a plain ramp (0.7 m/s open, 0.35 m/s close, 1.5 s hold). Chapter 4
//   does the motion properly. Waves are drawn about a hundred million times slower than real.
import { THREE, M, clamp } from '../kit.js';
import { makeDoor, makeWalker, makeRings, floorZone, floorSlab, board, panelBg, text, dopplerShift, C, TAU, TRAVEL, SENSOR, HOLD_MIN, COL, fmt0, fitNarrow, placeBoard, inReel, isTall, altView , hideGrid , reelView } from '../door.js';

const ZC = 1.3, ZRX = 1.5, ZRZ = 1.15;        // the zone ellipse on the floor: centre z, half-width, half-depth
const VMIN = 0.05;                            // m/s, slowest closing speed that counts
const CW = 4, EMIT = 0.2;                     // drawn wave speed (m/s) and gap between drawn crests (s)
const zoneK = (x, z, side) => 1 - (x / ZRX) ** 2 - ((z * side - ZC) / ZRZ) ** 2;
// closing speed of a point P moving at (vx, vz) towards a sensor at height 2.3 m on side ±1
function closing(x, z, vx, vz, side) {
  const rx = x, ry = 1.1 - SENSOR[1], rz = z - side * SENSOR[2], r = Math.hypot(rx, ry, rz) || 1e-6;
  return -(rx * vx + rz * vz) / r;
}

export default {
  id: 'radar',
  short: 'Seeing you coming',
  title: 'A tiny radar that hears you walk',
  subtitle: 'The sensor sends microwaves at the floor and listens for an echo whose pitch has changed.',
  view: { pos: [2.4, 4.9, 8.0], target: [1.75, 2.5, 0.8] },
  learn: `<p>The little black box above the door is usually a <b>microwave motion sensor</b>. It is a real <b>radar</b>, about the size of a matchbox. It sends out a steady radio wave at about <b>24 billion</b> vibrations a second (24.125 GHz, the K band). Older ones used 10.525 GHz.</p>
    <p>The wave bounces off the floor, the walls and you, and comes back. The sensor mixes the echo with the wave it is sending. If nothing moves, the two match exactly and the mix is silent.</p>
    <p>If you walk <b>towards</b> the sensor, you run into the waves and squeeze the echo, so it comes back at a slightly <b>higher</b> frequency. That change is the <b>Doppler shift</b>: <b>Δf = 2 × f × v ÷ c</b>. At a normal walk of 1.4 m/s the echo is shifted by about <b>225 Hz</b>. That is 225 parts in 24 billion, yet the mixer turns it into a low hum that is easy to detect. A cricket speed gun does exactly this: see the Glassbox box on <a href="https://glassbox.how/dopplerclear/" target="_blank" rel="noopener">the Doppler effect</a>.</p>
    <p>The sensor only measures speed <b>along its beam</b>. Stand still and the shift is zero: to a motion sensor you have vanished. Walk <b>across</b> in front of the door and the shift is small, and it flips sign as you pass the middle.</p>
    <p>Better sensors can also tell <b>coming</b> from <b>going</b>. They mix the echo twice, a quarter of a wave apart, and get two copies of the hum called <b>I</b> and <b>Q</b>. If you are coming, one copy leads. If you are leaving, the other does. A <b>direction-sensing</b> door opens only for people coming, so it shuts sooner behind you and wastes less cooled air.</p>
    <p class="tip"><b>Try it:</b> walk towards the door, then away, then across, then stand still. Watch the orange echo crests bunch up or spread, and the two traces on the board swap who leads. Then switch direction sensing off and see how much longer the door stays open.</p>`,
  terms: [
    { t: 'Microwave motion sensor', d: 'A small radar that sends a steady microwave and detects movement from the Doppler shift of the echo.' },
    { t: 'Doppler shift', d: 'The change in the frequency of a wave when the thing that reflects it is moving towards or away from you.' },
    { t: 'K band', d: 'Microwaves of roughly 18 to 27 GHz. Door sensors use a licence-free slot near 24 GHz.' },
    { t: 'Detection zone', d: 'The patch of floor the sensor watches. Its size is set by the sensor\'s antenna and its tilt.' },
    { t: 'I and Q', d: 'Two copies of the mixed signal taken a quarter of a wave apart. Which one leads shows the direction of motion.' },
    { t: 'Direction sensing', d: 'A sensor setting that opens the door only for people approaching, not for people leaving.' },
  ],
  defaults: { walk: 'to', speed: 1.4, band: 24.125, uni: true },
  controls: [
    { key: 'walk', type: 'seg', label: 'The walker', options: [{ v: 'to', label: 'Towards' }, { v: 'away', label: 'Away' }, { v: 'across', label: 'Across' }, { v: 'still', label: 'Still' }] },
    { key: 'speed', type: 'range', label: 'Walking speed', min: 0.3, max: 2.5, step: 0.05, ends: ['slow', 'jogging'], fmt: (v) => v.toFixed(2) + ' m/s' },
    { key: 'band', type: 'seg', label: 'Radar frequency', options: [{ v: 24.125, label: '24.125 GHz' }, { v: 10.525, label: '10.525 GHz' }] },
    { key: 'uni', type: 'toggle', label: 'Direction sensing', hint: 'On: only people coming towards the door open it.' },
  ],
  quiz: [
    { q: 'A person walks at 1.4 m/s straight towards a 24.125 GHz door sensor. About how big is the Doppler shift?', options: ['2 Hz', '225 Hz', '24,000 Hz', '24 billion Hz'], answer: 1, why: 'Δf = 2 × 24.125 billion × 1.4 ÷ 300 million ≈ 225 Hz.' },
    { q: 'Why does a microwave motion sensor not see a person standing still?', options: ['Microwaves pass straight through people', 'The person is too warm', 'With no motion along the beam the echo has no Doppler shift, so there is nothing to detect', 'The sensor switches off to save power'], answer: 2, why: 'The sensor detects the change in frequency. A still target returns exactly the frequency that was sent.' },
    { q: 'How does a direction-sensing sensor tell coming from going?', options: ['It mixes the echo twice, a quarter-wave apart, and sees which of the two signals leads', 'It measures how loud the echo is', 'It has a camera', 'It weighs the person'], answer: 0, why: 'The two outputs, I and Q, swap their order when the motion reverses.' },
  ],
  reel: [
    { ms: 6000, caption: 'The black box above the door is a tiny radar. Walk towards it and your echo comes back about 225 Hz higher.', set: { walk: 'to', speed: 1.4, band: 24.125, uni: true }, spin: 0 },
    { ms: 5000, caption: 'Walk away and the echo drops instead, so a smart sensor does not hold the door open for you.', set: { walk: 'away', speed: 1.4, uni: true }, spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const root = new THREE.Group(); stage.root.add(root);
    const door = makeDoor({ cover: 'solid' }); root.add(door);
    const slab = floorSlab(8.6, 8.4, 0x12151b); slab.position.set(0.6, 0.001, 1.3); root.add(slab);
    const zoneOut = floorZone(ZRX, ZRZ, 0x6fb6ff, 0.14), zoneIn = floorZone(ZRX, ZRZ, 0x6fb6ff, 0.07);
    zoneOut.position.set(0, 0.012, ZC); zoneIn.position.set(0, 0.012, -ZC); root.add(zoneOut, zoneIn);
    // the beam: a faint cone from the sensor to the edge of the zone
    const cone = (() => {
      const pts = [], N = 48;
      for (let i = 0; i < N; i++) { const a = (i / N) * TAU, b = ((i + 1) / N) * TAU; pts.push(...SENSOR, Math.cos(a) * ZRX, 0.02, ZC + Math.sin(a) * ZRZ, Math.cos(b) * ZRX, 0.02, ZC + Math.sin(b) * ZRZ); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      return new THREE.Mesh(geo, M.ghost(0x6fb6ff, 0.06));
    })();
    root.add(cone);
    const rings = makeRings(26, { color: hex(COL.radar), width: 0.04 }), echoes = makeRings(26, { color: hex(COL.echo), width: 0.05 });
    root.add(rings, echoes);
    const walker = makeWalker({ shirt: 0xffb547 }); root.add(walker);
    const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...SENSOR), new THREE.Vector3(0, 1.1, 2)]), new THREE.LineBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.8 }));
    ray.frustumCulled = false; root.add(ray);

    const st = { mode: '', x: 0, z: 5, vx: 0, vz: 0, open: 0, hold: 0, t: 0, lastEmit: 0, vr: 0, df: 0, k: 0, det: false, detIn: false, phase: 0, gait: 0, why: '', openT: 0, lastOpenT: 0, wasOpen: false, band: 24.125 };
    const reset = (mode) => {
      st.mode = mode; rings.clear(); echoes.clear(); st.open = 0; st.hold = 0; st.openT = 0;
      if (mode === 'to') { st.x = 0.25; st.z = 4.9; } else if (mode === 'away') { st.x = -0.25; st.z = -3.4; } else if (mode === 'across') { st.x = -3.6; st.z = 1.5; } else { st.x = 0.35; st.z = 1.25; }
    };
    const bd = board(root, 3.7, 1.85, 1040, 520, (g, w, h) => {
      panelBg(g, w, h);
      text(g, 'The hum the sensor hears', 24, 50, COL.text, 'bold 38px sans-serif');
      const x0 = 28, x1 = w - 330, ym = 300, A = 150 * clamp(st.k * 1.6, 0, 1) * (Math.abs(st.vr) > 0.005 ? 1 : 0);
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, ym); g.lineTo(x1, ym); g.stroke();
      const sign = Math.sign(st.df) || 1, f = Math.abs(st.df);
      for (const [col, off] of [[COL.i, 0], [COL.q, -sign * Math.PI / 2]]) {
        g.strokeStyle = col; g.lineWidth = 6; g.beginPath();
        for (let px = x0; px <= x1; px += 3) { const tt = ((px - x0) / (x1 - x0)) * 0.04, y = ym - A * Math.cos(TAU * f * tt + st.phase + off); px === x0 ? g.moveTo(px, y) : g.lineTo(px, y); }
        g.stroke();
      }
      text(g, '40 thousandths of a second', x0, h - 22, COL.soft, '27px sans-serif');
      text(g, 'I', x0 + 4, 110, COL.i, 'bold 40px sans-serif'); text(g, 'Q', x0 + 34, 110, COL.q, 'bold 40px sans-serif');
      text(g, A < 1 ? 'silent: nothing moves' : st.df > 0 ? 'I leads: coming' : 'Q leads: going', x0 + 84, 108, A < 1 ? COL.soft : st.df > 0 ? COL.good : COL.bad, '32px sans-serif');
      const cx = w - 300;
      text(g, 'Doppler shift', cx, 150, COL.soft, '30px sans-serif');
      text(g, st.k > 0 ? (st.df > 0.5 ? '+' : st.df < -0.5 ? '−' : '') + fmt0(Math.abs(st.df)) + ' Hz' : 'no echo', cx, 232, st.k > 0 ? COL.text : COL.soft, 'bold ' + (st.k > 0 ? 72 : 54) + 'px sans-serif');
      text(g, 'on ' + st.band.toFixed(3) + ' GHz', cx, 286, COL.radar, '30px sans-serif');
      text(g, st.det ? 'OPEN' : 'ignore', cx, 400, st.det ? COL.good : COL.soft, 'bold 60px sans-serif');
    }, [3.95, 1.4, 0.2]);

    const L = {
      sens: stage.label('Microwave sensor', [0, 0.16, 0], door.sensOut, 'hot'),
      zone: stage.label('Detection zone', [-ZRX + 0.1, 0.05, ZC + 0.9], root),
      out: stage.label('Outside', [-2.6, 0.05, 4.4], root),
    };
    let tDraw = 0;
    return {
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [L.out, L.zone], -0.16);
        placeBoard(bd, [3.95, 1.4, 0.2, 1, 0], [0, 3.55, -0.3, 1.05, 0], stage);
        if (reelView(stage, 'radar', { pos: [2.6, 3.9, 8.6], target: [1.75, 1.45, 0.8] }, { pos: [0.4, 4.0, 4.65], target: [0, 1.7, 1.3] })) { /* recording */ }
        else if (narrow) altView(stage, 'radar-phone', { pos: [2.0, 3.6, 5.3], target: [0, 1.9, 1.0] });
        if (s.walk !== st.mode) reset(s.walk);
        st.band = s.band; st.t += dt;
        // ---- the walker
        const v = s.speed; let vx = 0, vz = 0;
        const gap = 2 * st.open;
        if (st.mode === 'to') { vz = -v; if (st.z < 0.55 && st.z > 0.3 && gap < 0.75) vz = 0; if (st.z < -3.6) reset('to'); }
        else if (st.mode === 'away') { vz = v; if (st.z > -0.55 && st.z < -0.3 && gap < 0.75) vz = 0; if (st.z > 5.0) reset('away'); }
        else if (st.mode === 'across') { vx = v; if (st.x > 3.6) { st.x = -3.6; } }
        st.x += vx * dt; st.z += vz * dt; st.vx = vx; st.vz = vz;
        walker.position.set(st.x, 0, st.z);
        if (vx || vz) walker.rotation.y = Math.atan2(vx, vz); else if (st.mode === 'still') walker.rotation.y = Math.PI;
        st.gait += Math.hypot(vx, vz) * dt * 4.2; walker.walk(st.gait, vx || vz ? 1 : 0);
        // ---- what each sensor measures
        st.k = Math.max(0, zoneK(st.x, st.z, 1));
        st.vr = closing(st.x, st.z, vx, vz, 1);
        st.df = dopplerShift(s.band * 1e9, st.vr);
        const hear = (vr, k) => k > 0 && (s.uni ? vr > VMIN : Math.abs(vr) > VMIN);
        st.det = hear(st.vr, st.k);
        st.detIn = hear(closing(st.x, st.z, vx, vz, -1), Math.max(0, zoneK(st.x, st.z, -1)));
        const inDoorway = Math.abs(st.z) < 0.45 && Math.abs(st.x) < 0.9;        // the presence sensor of chapter 3
        st.why = st.k <= 0 ? 'out' : Math.abs(st.vr) <= VMIN ? 'still' : st.vr < 0 ? 'going' : 'coming';
        // ---- the door (a plain ramp; chapter 4 does it properly)
        if (st.det || st.detIn || inDoorway) st.hold = HOLD_MIN; else st.hold = Math.max(0, st.hold - dt);
        const want = st.hold > 0 ? TRAVEL : 0;
        st.open = clamp(st.open + clamp(want - st.open, -0.35 * dt, 0.7 * dt), 0, TRAVEL);
        door.setOpen(st.open);
        if (st.open > 0.01) { st.openT += dt; st.wasOpen = true; } else if (st.wasOpen) { st.lastOpenT = st.openT; st.openT = 0; st.wasOpen = false; }
        // ---- waves
        if (st.t - st.lastEmit >= EMIT) { st.lastEmit = st.t; rings.emit(0, SENSOR[2], st.t, { a0: 0.3, a1: Math.PI - 0.3, k: 0.75 }); }
        const d = Math.hypot(st.x, st.z - SENSOR[2]), ang = Math.atan2(st.z - SENSOR[2], st.x);
        for (const r of rings.rings) {
          if (!r.live || r.hit) continue;
          if ((st.t - r.t) * CW >= d && st.z > 0.2 && d < 4.6 && ang > 0.3 && ang < Math.PI - 0.3) { r.hit = true; echoes.emit(st.x, st.z, st.t, { k: 0.35 + 0.65 * clamp(st.k * 1.5, 0, 1) }); }
        }
        rings.update(st.t, CW, 5.2); echoes.update(st.t, CW, 2.6);
        // ---- the line of sight and the board
        const p = ray.geometry.attributes.position; p.setXYZ(1, st.x, 1.1, st.z); p.needsUpdate = true;
        ray.visible = st.k > 0; ray.material.color.set(st.det ? COL.good : st.why === 'going' ? COL.bad : '#8a93a6');
        zoneOut.fill.material.opacity = st.det ? 0.3 : 0.14; zoneOut.fill.material.color.set(st.det ? COL.good : COL.radar);
        st.phase += dt * Math.sign(st.df) * Math.min(6, Math.abs(st.df) / 30);
        tDraw += dt; if (tDraw > 0.05) { tDraw = 0; bd.redraw(); }
        L.sens.visible = !inReel();
      },
      readout: (s) => {
        const head = { out: 'No one in the zone', still: 'In the zone, but not moving', going: s.uni ? 'Walking away: ignored' : 'Walking away: opens anyway', coming: 'Someone is coming: open' }[st.why];
        const cls = st.det ? 'ok' : st.why === 'going' ? 'no' : '';
        const lam = (C / (s.band * 1e9)) * 1000;
        return `<div class="big ${cls}">${head}</div>
          <div class="row"><span>Speed along the beam</span><b>${st.k > 0 ? (st.vr >= 0 ? '' : '−') + Math.abs(st.vr).toFixed(2) + ' m/s' : '…'}</b></div>
          <div class="row"><span>Doppler shift</span><b>${st.k > 0 ? (st.df > 0.5 ? '+' : st.df < -0.5 ? '−' : '') + fmt0(Math.abs(st.df)) + ' Hz' : '…'}</b></div>
          <div class="row"><span>Straight at the sensor it would be</span><b>${fmt0(dopplerShift(s.band * 1e9, s.speed))} Hz</b></div>
          <div class="row"><span>Door stayed open last time</span><b>${st.lastOpenT ? st.lastOpenT.toFixed(1) + ' s' : '…'}</b></div>
          <small>Δf = 2 × f × v ÷ c. The wavelength is ${lam.toFixed(1)} mm. The sensor is 2.3 m up, so it sees only part of your walking speed.</small>`;
      },
    };
  },
};
const hex = (c) => new THREE.Color(c).getHex();
