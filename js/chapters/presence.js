// Chapter 3: presence sensing. A motion radar cannot see a person who has stopped (chapter 2), so every
// automatic door also needs something that sees a body that is simply THERE.
//  • Active infrared curtain: the sensor throws rows of near-infrared spots on the floor right at the
//    threshold and watches each one. A spot that lands on a shoulder instead of the floor comes back
//    different (brighter or dimmer, and from a nearer point), so the spot is "covered". Here each spot
//    is a real ray from the sensor to the floor, tested against the walker's body (a cylinder 0.44 m
//    across and 1.7 m tall). Rows sit 0.15 m and 0.40 m either side of the door line; the US standard
//    A156.10 (distributor's summary) wants presence detection to within 5 in (125 mm) of the door face.
//  • Safety beams (photocells): a sender and a receiver across the opening. The same summary gives the
//    usual heights: a lower beam 6 to 28 in (150 to 710 mm) and an upper beam 45 to 55 in (1,145 to
//    1,400 mm) above the floor. Drawn here at 0.5 m and 1.2 m.
//  • Passive infrared (PIR): no beam at all. A pyroelectric detector behind a faceted lens watches
//    8 to 14 µm heat radiation (a body at skin temperature glows most strongly near 9.4 µm) and reacts
//    when a warm shape crosses from one facet's view to the next. Like radar it answers to change,
//    so it is used to open doors, not to guard the threshold. Described in the text, not modelled.
// The door logic is the standard one: anything seen keeps the door open; when nothing is seen for the
// hold-open time (1.5 s minimum in A156.10) it closes. With the curtain and beams switched off, the
// model shows what the radar alone would do to a person who stops in the doorway: the leaves close
// until they touch (only the force limit of chapter 4 then protects the person). That is why no
// standard allows a motion sensor alone.
import { THREE, M, clamp, approach } from '../kit.js';
import { makeDoor, makeWalker, floorZone, floorSlab, TRAVEL, SENSOR, HOLD_MIN, COL, fitNarrow, inReel, isTall, altView , hideGrid , reelView } from '../door.js';

const ROWS = [0.4, 0.15, -0.15, -0.4], NX = 17, DX = 0.1;
const BODY_R = 0.22, BODY_H = 1.7;
const ZC = 1.3, ZRX = 1.5, ZRZ = 1.15;
const BEAMS = [0.5, 1.2];

export default {
  id: 'presence',
  short: 'Seeing you standing',
  title: 'Why the door does not shut on you',
  subtitle: 'A curtain of invisible light on the floor notices a person who is not moving at all.',
  view: { pos: [3.3, 3.5, 5.5], target: [0, 2.05, 0.2] },
  learn: `<p>The radar has a blind spot: <b>stillness</b>. An old man pausing in the doorway, a child tying a shoelace, a wheelchair waiting for the lift: no motion, no Doppler shift. A door that trusted radar alone would close on them.</p>
    <p>So doors carry a second kind of sensor, for <b>presence</b>. The usual one is an <b>active infrared</b> sensor. It shines rows of <b>near-infrared</b> spots onto the floor right where the leaves travel. You cannot see them, but a phone camera sometimes can. It is the same invisible light a TV remote uses: see <a href="https://glassbox.how/remoteclear/" target="_blank" rel="noopener">RemoteClear</a>. The sensor remembers how each spot looks on the empty floor. Stand on a spot and it lands on your shoulder instead. It comes back changed, and the sensor knows something is there, moving or not.</p>
    <p>Many doors add <b>safety beams</b> too: a thin infrared beam straight across the opening, at about shin height and waist height. Break a beam and the door will not close.</p>
    <p>There is a third kind, the <b>passive infrared</b> sensor (PIR), like the one in a corridor light. It sends nothing. It watches for the <b>heat glow</b> of a warm body moving across a cooler background. It is cheap and uses little power, but like radar it only notices <b>change</b>, so it is used for opening, not for guarding the doorway.</p>
    <p>The rule the controller follows is simple. <b>Anything seen by any sensor keeps the door open.</b> Only when everything has been clear for a second or two does it close. And if a safety sensor ever stops answering, a properly built door treats that as "someone is there". Europe's safety standard for these doors, EN 16005, has a whole section on such <b>protective devices</b> and how they must be tested.</p>
    <p class="tip"><b>Try it:</b> walk the person into the doorway and stop. The red spots under them light up and the door waits. Now switch to "radar only" and stop again. Watch what the door does after 1.5 seconds.</p>`,
  terms: [
    { t: 'Presence sensor', d: 'A sensor that detects a person or thing that is there, even if it is not moving.' },
    { t: 'Active infrared', d: 'A sensor that sends out its own infrared light and watches how it comes back.' },
    { t: 'Passive infrared (PIR)', d: 'A sensor that sends nothing and detects the moving heat glow of a warm body.' },
    { t: 'Safety beam', d: 'A light beam across the doorway. The door will not close while it is broken.' },
    { t: 'Threshold', d: 'The strip of floor in the doorway where the leaves travel.' },
    { t: 'Hold-open time', d: 'How long the door waits, after everything is clear, before it starts to close.' },
  ],
  defaults: { pos: 0, sensors: 'all' },
  controls: [
    { key: 'pos', type: 'range', label: 'Walk the person', min: 0, max: 1, step: 0.002, ends: ['outside', 'inside'], hint: 'Drag to walk. Let go and they stand still.', fmt: (v) => { const z = 3.4 - 6.8 * v; return Math.abs(z) < 0.3 ? 'in the doorway' : Math.abs(z).toFixed(1) + ' m ' + (z > 0 ? 'outside' : 'inside'); } },
    { key: 'sensors', type: 'seg', label: 'Sensors fitted', options: [{ v: 'all', label: 'Radar + curtain + beams' }, { v: 'radar', label: 'Radar only' }] },
    { type: 'buttons', label: 'Or let them walk by themselves', items: [
      { label: 'Walk through', act: (s, inst) => inst.script('through') },
      { label: 'Stop in the doorway', act: (s, inst) => inst.script('stop') },
    ] },
  ],
  quiz: [
    { q: 'Why can a door not rely on a microwave motion sensor alone?', options: ['Microwaves are too weak to reach the floor', 'It cannot see someone who has stopped moving in the doorway', 'It only works at night', 'It is too expensive'], answer: 1, why: 'No motion means no Doppler shift. A presence sensor is needed for a person who is standing still.' },
    { q: 'How does an active infrared sensor notice a person standing still?', options: ['It feels their weight on the floor', 'It hears them breathing', 'It measures their body heat', 'Spots of infrared light it throws on the floor come back changed when a body is in the way'], answer: 3, why: 'The sensor compares each spot with how it looked on the empty floor.' },
    { q: 'A safety sensor stops answering. What should a well-designed door do?', options: ['Behave as if someone is in the doorway', 'Carry on as normal', 'Close and lock', 'Speed up to finish quickly'], answer: 0, why: 'A fault must fail towards safety: no answer is treated like a detection.' },
  ],
  reel: [
    { ms: 5500, caption: 'Radar cannot see a person standing still, so a curtain of infrared spots on the floor watches the doorway.', set: { sensors: 'all' }, anim: { pos: [0.1, 0.5] }, spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const root = new THREE.Group(); stage.root.add(root);
    const door = makeDoor({ cover: 'solid' }); root.add(door);
    root.add(floorSlab(6.4, 7, 0x12151b));
    const zoneOut = floorZone(ZRX, ZRZ, 0x6fb6ff, 0.08), zoneIn = floorZone(ZRX, ZRZ, 0x6fb6ff, 0.08);
    zoneOut.position.set(0, 0.01, ZC); zoneIn.position.set(0, 0.01, -ZC); root.add(zoneOut, zoneIn);
    // the infrared spots and their rays
    const spots = [];
    const spotGeo = new THREE.CircleGeometry(0.036, 16);
    const curtain = new THREE.Group(); root.add(curtain);
    for (const z of ROWS) for (let i = 0; i < NX; i++) {
      const x = (i - (NX - 1) / 2) * DX;
      const mat = new THREE.MeshBasicMaterial({ color: 0xff5d6c, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false });
      const m = new THREE.Mesh(spotGeo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.016, z); curtain.add(m);
      const from = new THREE.Vector3(x * 0.12, SENSOR[1] - 0.03, Math.sign(z) * SENSOR[2]);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, new THREE.Vector3(x, 0.016, z)]), new THREE.LineBasicMaterial({ color: 0xff5d6c, transparent: true, opacity: 0.55 }));
      line.frustumCulled = false; line.visible = false; curtain.add(line);
      spots.push({ x, z, m, mat, line, from, hit: false });
    }
    // safety beams across the opening
    const beamMat = [0, 1].map(() => new THREE.LineBasicMaterial({ color: 0xff5d6c, transparent: true, opacity: 0.9 }));
    const beamG = new THREE.Group(); root.add(beamG);
    BEAMS.forEach((y, i) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.88, y, -0.085), new THREE.Vector3(0.88, y, -0.085)]), beamMat[i]); beamG.add(l); });
    const walker = makeWalker({ shirt: 0x7fd0ff }); root.add(walker);
    const L = {
      cur: stage.label('Infrared spots on the floor', [1.25, 0.05, 0.75], root, 'hot'),
      beam: stage.label('Safety beams', [-1.35, 1.2, 0.1], root),
      sens: stage.label('Radar + infrared sensor', [0, 0.17, 0], door.sensOut),
      zone: stage.label('Radar zone', [-1.5, 0.05, 1.5], root),
    };
    const st = { z: 3.4, v: 0, open: 0, hold: 0, covered: 0, broken: 0, radar: false, contact: false, state: 'closed', gait: 0, script: null, sp: 0, lastPos: 0, still: 0 };
    let ctlS = null;
    return {
      script(kind) { st.script = kind; st.sp = st.z; if (kind === 'through' && st.z < -3) st.z = 3.4; if (kind === 'stop' && st.z < 0.05) st.z = 3.4; },
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt); ctlS = s;
        const narrow = fitNarrow(stage, [L.zone, L.sens, L.beam], -0.14);
        if (reelView(stage, 'pres', { pos: [3.6, 2.9, 5.9], target: [0, 1.2, 0.3] }, { pos: [2.03, 2.4, 1.8], target: [0, 1.1, 0.2] })) { /* recording */ }
        else if (narrow) altView(stage, 'pres-phone', { pos: [2.0, 2.7, 3.7], target: [0, 1.75, 0.3] });
        // ---- where the person is: the slider, or a script that moves the slider
        if (st.script) {
          const goal = st.script === 'through' ? -3.4 : 0.02;
          let v = 1.2;
          if (st.z > 0.5 && st.z < 0.75 && 2 * st.open < 0.7) v = 0;      // waits for the gap, like anyone would
          st.z = Math.max(goal, st.z - v * dt);
          s.pos = clamp((3.4 - st.z) / 6.8, 0, 1);
          if (st.z <= goal + 1e-4) st.script = null;
        }
        const zNew = 3.4 - 6.8 * s.pos;
        st.zPrev = st.zPrev === undefined ? zNew : st.zPrev;
        st.v = approach(st.v, dt > 0 ? (zNew - st.zPrev) / dt : 0, 12, dt);
        st.zPrev = zNew; st.z = zNew;
        const moving = Math.abs(st.v) > 0.05;
        st.still = moving ? 0 : st.still + dt;
        walker.position.set(0.05, 0, st.z); walker.rotation.y = st.v > 0.05 ? 0 : Math.PI;
        st.gait += Math.abs(st.v) * dt * 4.2; walker.walk(st.gait, moving ? 1 : 0);
        // ---- radar (motion, approaching either sensor, inside either zone)
        const side = st.z >= 0 ? 1 : -1;
        const inZone = 1 - ((Math.abs(st.z) - ZC) / ZRZ) ** 2 > 0;
        st.radar = inZone && moving && -st.v * side > 0.05;
        // ---- the curtain: a spot is covered when its ray meets the body before the floor
        const all = s.sensors === 'all';
        let covered = 0;
        for (const sp of spots) {
          let hit = false, hy = 0;
          for (let k = 1; k <= 14 && !hit; k++) {
            const t = k / 14, px = sp.from.x + (sp.x - sp.from.x) * t, py = sp.from.y + (0.016 - sp.from.y) * t, pz = sp.from.z + (sp.z - sp.from.z) * t;
            if (py < BODY_H && Math.hypot(px - 0.05, pz - st.z) < BODY_R) { hit = true; hy = t; }
          }
          sp.hit = hit && all; if (sp.hit) covered++;
          sp.mat.opacity = all ? (sp.hit ? 1 : 0.4) : 0.06; sp.mat.color.setHex(sp.hit ? 0xffe14d : 0xff5d6c);
          sp.line.visible = sp.hit;
          if (sp.hit) { const p = sp.line.geometry.attributes.position; p.setXYZ(1, sp.from.x + (sp.x - sp.from.x) * hy, sp.from.y + (0.016 - sp.from.y) * hy, sp.from.z + (sp.z - sp.from.z) * hy); p.needsUpdate = true; }
        }
        st.covered = covered;
        const inBeam = Math.abs(st.z + 0.085) < BODY_R;
        st.broken = all && inBeam ? 2 : 0;
        beamMat.forEach((m) => { m.opacity = all ? 0.9 : 0.08; m.color.setHex(st.broken ? 0xffe14d : 0xff5d6c); });
        // ---- the controller
        const seen = st.radar || covered > 0 || st.broken > 0;
        if (seen) st.hold = HOLD_MIN; else st.hold = Math.max(0, st.hold - dt);
        let want = st.hold > 0 ? TRAVEL : 0;
        // closing leaves meet a body in the doorway when the gap shrinks to its width
        const inWay = Math.abs(st.z + 0.035) < BODY_R + 0.03;
        if (want === 0 && inWay && 2 * st.open <= 2 * BODY_R + 0.02) { st.contact = true; st.hold = 2.2; want = TRAVEL; }
        if (!inWay || all) st.contact = false;
        st.open = clamp(st.open + clamp(want - st.open, -0.3 * dt, 0.7 * dt), 0, TRAVEL);
        door.setOpen(st.open);
        st.state = st.open < 0.005 ? 'closed' : want > st.open + 1e-4 ? 'opening' : want < st.open - 1e-4 ? 'closing' : 'open';
        zoneOut.fill.material.opacity = st.radar && side > 0 ? 0.26 : 0.08; zoneIn.fill.material.opacity = st.radar && side < 0 ? 0.26 : 0.08;
        L.cur.visible = all && !inReel(); L.beam.visible = all && !narrow && !inReel();
      },
      readout: (s) => {
        const all = s.sensors === 'all';
        const head = st.contact ? 'The door closed on a person' : st.state === 'closing' && Math.abs(st.z) < 0.3 ? 'Closing on a person!' : st.covered || st.broken ? 'Held open: someone is there' : st.radar ? 'Opening: motion seen' : st.state === 'open' ? `Clear. Closing in ${st.hold.toFixed(1)} s` : st.state === 'closing' ? 'Closing' : st.state === 'opening' ? 'Opening' : 'Closed and waiting';
        const cls = st.contact || (st.state === 'closing' && Math.abs(st.z) < 0.3) ? 'no' : st.covered || st.broken ? 'ok' : '';
        return `<div class="big ${cls}">${head}</div>
          <div class="row"><span>Radar (motion)</span><b>${st.radar ? 'sees someone coming' : Math.abs(st.v) > 0.05 ? 'moving away or out of zone' : 'sees nothing moving'}</b></div>
          <div class="row"><span>Infrared spots covered</span><b>${all ? st.covered + ' of ' + ROWS.length * NX : 'not fitted'}</b></div>
          <div class="row"><span>Safety beams broken</span><b>${all ? st.broken + ' of 2' : 'not fitted'}</b></div>
          <div class="row"><span>Gap between the leaves</span><b>${Math.round(st.open * 200)} cm</b></div>
          <small>${st.contact ? 'With no presence sensor, only the force limit in the motor control stops the squeeze. No standard allows a door like this.' : all ? 'Anything seen by any sensor keeps the door open. It closes 1.5 s after everything is clear.' : 'Radar only: stop in the doorway and see what happens.'}</small>`;
      },
    };
  },
};
