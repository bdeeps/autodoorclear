// Chapter 4: the move. A small simulation of one leaf (the other mirrors it), stepped at 1 ms.
//   m dv/dt = F_motor − F_friction − F_contact
// Speed plan against position (what the controller aims for):
//   v_ref(x) = min( √(v₀² + 2 a x),  v_cruise,  √(v_creep² + 2 d (x_end − x)) )
//   a = 1.2 m/s² speeding up, d = 1.0 m/s² braking, v₀ = 0.08 m/s, creep 0.06 m/s over the last 5 cm.
// The motor force follows a simple speed loop, F = m × 25 s⁻¹ × (v_ref − v) + friction, and is capped.
//   Rolling friction is taken as 1.5 % of the leaf's weight plus 4 N of seal drag (assumed values).
// Limits shown (see js/door.js for where each was read):
//   • A156.10: closing speed at most 1 ft/s (0.305 m/s) for leaves up to 160 lb (71 kg); a stopped leaf
//     must be holdable with 30 lbf (133 N) at its leading edge. The closing push is capped at 133 N here.
//     A 71 kg leaf at 0.305 m/s carries ½ × 71 × 0.305² = 3.3 J: that product is our arithmetic, not a
//     number printed in the standard.
//   • Low-energy doors (A156.19; EN 16005 Annex F has an equivalent table): 1.25 lbf·ft = 1.69 J.
// Opening speeds: makers' data sheets for common operators give opening speeds adjustable up to about
//   0.7 to 0.8 m/s per leaf and closing speeds up to about 0.5 m/s (general knowledge of such sheets;
//   no single sheet is quoted).
// Obstruction test: with the presence sensors ignored, a firm bag 0.30 m wide is stood between the
//   leaves. It is modelled as a spring of 20 kN/m with some damping (an assumed stiffness, about that
//   of a packed suitcase). The leaf hits it, the encoder shows the speed collapsing while the motor
//   pushes at its cap, and after 0.12 s of that the controller reverses. The peak force on the bag is
//   read from the contact spring. For a stiff obstacle the first peak is about v √(k m): the reason
//   the standards limit speed and mass together, as kinetic energy.
// Encoder: 500 counts per metre of belt would be a coarse one; here the motor's encoder gives
//   100 pulses per turn through a 15:1 gearbox on a pulley of 0.283 m circumference (2π × 45 mm), so
//   100 × 15 ÷ 0.283 = 5,305 counts per metre, or 0.19 mm per count (illustrative gearing).
// Learn cycle: the door creeps open to the end stop and counts the travel, notes the force needed to
//   hold a steady creep (that is the friction), then pushes with a known 60 N and times the
//   acceleration: m = (60 N − friction) ÷ a. Both numbers shown are measured from this simulation.
import { THREE, clamp } from '../kit.js';
import { makeDoor, floorSlab, board, panelBg, axes, line, dot, text, kinetic, G, TRAVEL, TAU, V_A156, M_A156, F_A156, E_LOW, COL, fmt0, fitNarrow, placeBoard, inReel, isTall, altView , hideGrid , reelView } from '../door.js';
import { box, M } from '../kit.js';

const A_UP = 1.2, D_DN = 1.0, V0 = 0.08, V_CREEP = 0.06, X_CREEP = 0.05;
const KP = 25, F_OPEN_MAX = 300, F_BRAKE = 500;
const BAG_W = 0.30, K_BAG = 20000, C_BAG = 250;
const COUNTS_PER_M = (100 * 15) / (TAU * 0.045);
const E_A156 = kinetic(M_A156, V_A156);
const fric = (m) => 0.015 * m * G + 4;
const vref = (u, vc) => Math.min(Math.sqrt(V0 * V0 + 2 * A_UP * Math.max(0, u)), vc, Math.sqrt(V_CREEP * V_CREEP + 2 * D_DN * Math.max(0, TRAVEL - X_CREEP - u)));

export default {
  id: 'move',
  short: 'The move',
  title: 'Fast in the middle, gentle at the ends',
  subtitle: 'How the controller steers 60 kg of glass, and what happens when something is in the way.',
  view: { pos: [3.0, 3.7, 8.9], target: [2.95, 3.55, 0] },
  learn: `<p>A glass leaf with its frame weighs about <b>60 kg</b>, as much as a person. The controller must move it quickly, stop it softly, and never let it hit anyone hard.</p>
    <p>So it follows a <b>speed profile</b>: speed up briskly, <b>cruise</b>, brake, then <b>creep</b> the last few centimetres and close with a gentle touch. Opening is fast, because people are waiting. Closing is slower, because closing is when someone could be caught.</p>
    <p>It knows where the leaves are because an <b>encoder</b> on the motor sends a pulse for every tiny bit of a turn. Count the pulses and you have the position to a fraction of a millimetre.</p>
    <p>The first time it is switched on, the door runs a <b>learn cycle</b>. It creeps all the way open and shut to count how wide the opening is. It pushes with a known force and times how quickly the leaves pick up speed, which tells it how <b>heavy</b> they are. Then it sets its own profile to suit.</p>
    <p>How hard a moving leaf hits depends on its <b>kinetic energy</b>, <b>½ × mass × speed²</b>. Double the speed and the energy is four times as big. That is why safety standards limit closing speed and force. The American standard ANSI/BHMA A156.10 says a leaf of up to 71 kg may close at no more than about 0.3 m/s, and it must be possible to hold a stopped leaf with a push of 133 N, about the weight of 13.5 kg. Europe's EN 16005 limits impact forces and has a gentler <b>low-energy</b> mode too. (These standards are sold, not free. The American figures here come from a published summary of the standard, and for EN 16005 we could read only its contents list, so we quote no numbers from it.)</p>
    <p>And if the sensors miss something? The controller is watching the encoder. If the leaf slows down when it should not, something is in the way. The motor <b>reverses</b> at once. This is <b>obstruction reversal</b>, and it is the last line of defence.</p>
    <p class="tip"><b>Try it:</b> stand the bag in the doorway and watch the force trace jump and the door bounce back. Then raise the closing speed and the leaf mass and see how the hit grows. Press "Learn" to watch the door weigh itself.</p>`,
  terms: [
    { t: 'Speed profile', d: 'The planned speed of the door at each point of its travel: accelerate, cruise, brake, creep.' },
    { t: 'Kinetic energy', d: 'The energy of motion, ½ × mass × speed². It is what has to go somewhere when a moving leaf is stopped.' },
    { t: 'Creep', d: 'The slow final few centimetres of travel, so the leaves meet or park gently.' },
    { t: 'Learn cycle', d: 'A slow first run in which the controller measures the opening width, the friction and the mass of the leaves.' },
    { t: 'Obstruction reversal', d: 'Re-opening at once when the leaf is slowed or stopped by something in its path.' },
    { t: 'Low-energy door', d: 'A door set so slow and gentle that its kinetic energy stays under a small limit, about 1.7 joules.' },
  ],
  defaults: { mass: 60, vclose: 0.3, vopen: 0.6, bag: false, run: true },
  controls: [
    { key: 'mass', type: 'range', label: 'Mass of each leaf', min: 30, max: 150, step: 1, ends: ['light', 'heavy'], fmt: (v) => v + ' kg' },
    { key: 'vclose', type: 'range', label: 'Closing speed', min: 0.1, max: 0.8, step: 0.01, fmt: (v) => v.toFixed(2) + ' m/s' },
    { key: 'vopen', type: 'range', label: 'Opening speed', min: 0.2, max: 0.9, step: 0.01, fmt: (v) => v.toFixed(2) + ' m/s' },
    { key: 'bag', type: 'toggle', label: 'Stand a bag in the doorway', hint: 'Sensors are ignored for this test, so the leaves really meet it.' },
    { type: 'buttons', label: 'First power-up', items: [{ label: 'Learn', act: (s, inst) => inst.learn() }] },
  ],
  quiz: [
    { q: 'A leaf closes at 0.3 m/s. If it closed at 0.6 m/s instead, its kinetic energy would be:', options: ['The same', 'Twice as big', 'Four times as big', 'Half as big'], answer: 2, why: 'Kinetic energy goes with the square of speed. Twice the speed is 2 × 2 = 4 times the energy.' },
    { q: 'How does the controller know exactly where the leaves are?', options: ['It counts pulses from an encoder on the motor', 'A camera watches the door', 'It times how long the motor has run and guesses', 'The glass has a position sensor inside it'], answer: 0, why: 'Each pulse is a fixed tiny movement of the belt, so the count is the position.' },
    { q: 'The sensors miss a bag and a closing leaf touches it. What should happen?', options: ['The motor pushes harder to finish closing', 'The door stops forever', 'The fuse blows', 'The controller sees the leaf slow down and reverses to open'], answer: 3, why: 'This is obstruction reversal: an unexpected slowdown means something is in the way.' },
  ],
  reel: [
    { ms: 5500, caption: 'The controller speeds up, cruises, brakes and creeps, counting encoder pulses to know where the glass is.', set: { mass: 60, vclose: 0.3, vopen: 0.6, bag: false, run: true }, spin: 0 },
    { ms: 5500, caption: 'If a leaf slows when it should not, something is in the way, and the motor reverses at once.', set: { bag: true, vclose: 0.3, mass: 60, run: true }, act: (s, inst) => inst.restart('close'), spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const root = new THREE.Group(); stage.root.add(root);
    const door = makeDoor({ cover: 'clear' }); root.add(door);
    const slab = floorSlab(10.4, 3, 0x12151b); slab.position.x = 2.95; root.add(slab);
    const bag = new THREE.Group(); root.add(bag);
    const bagBody = box(BAG_W, 0.62, 0.22, M.plastic(0x8a4bd6, { roughness: 0.7 })); bagBody.position.set(0, 0.33, -0.035);
    const bagHandle = box(0.16, 0.2, 0.02, M.matte(0x22252d)); bagHandle.position.set(0, 0.74, -0.035);
    bag.add(bagBody, bagHandle);

    const st = { x: 0, v: 0, phase: 'wait', t: 0, tp: 0, F: 0, Fc: 0, peak: 0, lastPeak: 0, slowT: 0, reversed: 0, hist: [], learn: null, learned: null, Ehit: 0, vhit: 0 };
    const sim = (dt, s) => {
      const m = s.mass, ff = fric(m);
      let n = Math.max(1, Math.ceil(dt / 0.001)); const h = dt / n;
      for (let i = 0; i < n; i++) {
        st.tp += h;
        let ref = 0, cap = F_OPEN_MAX, F = 0;
        if (st.phase === 'open' || st.phase === 'reopen') ref = st.x >= TRAVEL - 1e-4 ? 0 : vref(st.x, s.vopen);
        else if (st.phase === 'close') { ref = st.x <= 1e-4 ? 0 : -vref(TRAVEL - st.x, s.vclose); cap = F_A156; }
        else if (st.phase === 'learnOpen') ref = st.x >= TRAVEL - 1e-4 ? 0 : 0.15;
        if (st.phase === 'learnPush') F = -60;
        else {
          F = m * KP * (ref - st.v) + (Math.abs(ref) > 0 ? Math.sign(ref) * ff : 0);
          // driving is capped (133 N when closing); braking may use more
          const driving = F * ref > 0;
          F = clamp(F, -(driving && ref < 0 ? cap : F_BRAKE), driving && ref > 0 ? cap : F_BRAKE);
        }
        // contact with the bag (each leaf's edge is at ±x; the bag's faces at ±BAG_W/2)
        let Fc = 0;
        const pen = BAG_W / 2 - st.x;
        if (st.bagIn && pen > 0) Fc = Math.max(0, K_BAG * pen - C_BAG * st.v);
        const fr = Math.abs(st.v) > 1e-4 ? -Math.sign(st.v) * ff : -clamp(F + Fc, -ff, ff);
        st.v += ((F + Fc + fr) / m) * h; st.x += st.v * h;
        if (st.x < 0) { st.x = 0; st.v = Math.max(0, st.v); } if (st.x > TRAVEL) { st.x = TRAVEL; st.v = Math.min(0, st.v); }
        st.F = F; st.Fc = Fc; if (Fc > st.peak) st.peak = Fc;
        if (Fc > 0 && st.vhit === 0) { st.vhit = Math.abs(st.v); }
        // ---- phase logic
        if (st.phase === 'wait' && st.tp > 0.9) { st.phase = s.run ? 'open' : 'wait'; st.tp = 0; }
        else if ((st.phase === 'open' || st.phase === 'reopen') && st.x >= TRAVEL - 1e-4) { st.phase = 'hold'; st.tp = 0; }
        else if (st.phase === 'hold' && st.tp > 1.5) { st.phase = 'close'; st.tp = 0; st.peak = 0; st.vhit = 0; st.slowT = 0; }
        else if (st.phase === 'close') {
          if (st.x <= 1e-4) { st.phase = 'wait'; st.tp = 0; }
          // obstruction: the encoder shows the leaf far slower than planned, well before the end
          if (st.x > 0.03 && -st.v < 0.5 * Math.abs(ref)) st.slowT += h; else st.slowT = 0;
          if (st.slowT > 0.12) { st.phase = 'reopen'; st.tp = 0; st.reversed++; st.lastPeak = st.peak; st.slowT = 0; }
        } else if (st.phase === 'learnOpen') {
          if (st.x > 0.3 && st.x < 0.6) st.learn.fSum += F, st.learn.fN++;
          if (st.x >= TRAVEL - 1e-4) { st.learn.travel = Math.round(st.x * COUNTS_PER_M); st.learn.ff = st.learn.fSum / Math.max(1, st.learn.fN); st.phase = 'learnPush'; st.tp = 0; st.learn.v0 = st.v; }
        } else if (st.phase === 'learnPush' && st.tp >= 0.5) {
          const a = Math.abs(st.v - st.learn.v0) / st.tp;
          st.learned = { counts: st.learn.travel, mm: (st.learn.travel / COUNTS_PER_M) * 1000, ff: st.learn.ff, kg: (60 - st.learn.ff) / a, forMass: m };
          st.phase = 'close'; st.tp = 0; st.peak = 0; st.vhit = 0;
        }
      }
    };

    const bd = board(root, 5.6, 3.88, 1040, 720, (g, w, h) => {
      panelBg(g, w, h);
      const s = st.s; if (!s) return;
      text(g, 'Speed plan', 22, 44, COL.text, 'bold 36px sans-serif'); text(g, 'leaf speed against how far it has opened', 236, 44, COL.soft, '26px sans-serif');
      const ax = axes(g, { x0: 92, x1: w - 30, y0: 300, y1: 70, xMin: 0, xMax: 0.9, yMin: 0, yMax: 0.9, xTicks: [0, 0.3, 0.6, 0.9], yTicks: [0, 0.3, 0.6, 0.9], xFmt: (v) => Math.round(v * 100) + ' cm', yFmt: (v) => v.toFixed(1), yLabel: 'm/s', fs: 26 });
      const po = [], pc = [];
      for (let i = 0; i <= 90; i++) { const x = (i / 90) * TRAVEL; po.push([x, vref(x, s.vopen)]); pc.push([x, vref(TRAVEL - x, s.vclose)]); }
      line(g, [[0, V_A156], [0.9, V_A156]], ax.X, ax.Y, 'rgba(255,107,107,.85)', 3, [10, 8]);
      line(g, po, ax.X, ax.Y, COL.good, 6); line(g, pc, ax.X, ax.Y, COL.echo, 6);
      text(g, 'opening', ax.X(0.36), ax.Y(Math.min(0.9, s.vopen)) - 12, COL.good, '27px sans-serif'); text(g, 'closing', ax.X(0.05), ax.Y(s.vclose) + (s.vclose > 0.2 ? 34 : -12), COL.echo, '27px sans-serif');
      text(g, 'A156.10 closing limit', ax.X(0.52), ax.Y(V_A156) + (s.vclose > V_A156 ? 32 : -10), 'rgba(255,140,140,.95)', '25px sans-serif');
      dot(g, ax.X(st.x), ax.Y(clamp(Math.abs(st.v), 0, 0.9)), st.v >= 0 ? COL.good : COL.echo, 13);
      // force strip
      text(g, 'Force', 22, 400, COL.text, 'bold 36px sans-serif'); text(g, 'motor push (blue), push on the bag (red)', 130, 400, COL.soft, '26px sans-serif');
      const fMax = Math.max(400, Math.ceil(Math.max(...st.hist.map((p) => p[2]), 0) / 200) * 200);
      const ay = axes(g, { x0: 92, x1: w - 30, y0: 664, y1: 424, xMin: -8, xMax: 0, yMin: -fMax / 2, yMax: fMax, xTicks: [-8, -6, -4, -2, 0], yTicks: [0, fMax], xFmt: (v) => (v ? v + ' s' : 'now'), yFmt: (v) => Math.round(v) + ' N', fs: 26 });
      line(g, [[-8, F_A156], [0, F_A156]], ay.X, ay.Y, 'rgba(255,107,107,.8)', 3, [10, 8]);
      text(g, '133 N', ay.X(-7.9), ay.Y(F_A156) - 8, 'rgba(255,140,140,.95)', '24px sans-serif');
      line(g, st.hist.map((p) => [p[0] - st.t, clamp(p[1], -fMax / 2, fMax)]), ay.X, ay.Y, COL.radar, 4);
      line(g, st.hist.map((p) => [p[0] - st.t, p[2]]), ay.X, ay.Y, COL.bad, 4);
    }, [5.05, 1.95, 0]);

    const L = {
      enc: stage.label('Encoder', [-1.35, door.yPul + 0.22, 0], door.motor, 'hot'),
      bag: stage.label('Bag', [0, 1.0, 0.1], bag),
    };
    let tH = 0;
    return {
      learn() { st.phase = 'learnOpen'; st.tp = 0; st.learn = { fSum: 0, fN: 0 }; st.learned = null; },
      restart(ph) { st.x = ph === 'close' ? TRAVEL : 0; st.v = 0; st.phase = ph === 'close' ? 'hold' : 'wait'; st.tp = 1.0; st.hist = []; },
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt); st.s = s;
        const narrow = fitNarrow(stage, [L.enc], -0.12);
        const tall = inReel() && isTall(stage);
        placeBoard(bd, [5.05, 1.95, 0, 1], [0, 4.0, 0, 0.7], stage);
        if (reelView(stage, 'move', { pos: [3.0, 2.3, 7.2], target: [2.95, 1.95, 0] }, { pos: [0.5, 3.0, 4.6], target: [0, 2.7, 0] })) { /* recording */ }
        else if (narrow) altView(stage, 'move-phone', { pos: [0.5, 2.5, 3.9], target: [0, 2.25, 0] });
        if (!s.bag) st.bagIn = false; else if (st.x > BAG_W / 2 + 0.02) st.bagIn = true;
        if (dt > 0) sim(dt, s);
        st.t += dt;
        door.setOpen(st.x);
        bag.visible = !!st.bagIn;
        tH += dt;
        if (tH > 0.03) { tH = 0; st.hist.push([st.t, st.F * (st.phase === 'close' || st.phase === 'learnPush' ? -1 : 1), st.Fc]); while (st.hist.length && st.hist[0][0] < st.t - 8) st.hist.shift(); bd.redraw(); }
        L.bag.visible = !!st.bagIn && !inReel(); L.enc.visible = !inReel() && !narrow;
      },
      readout: (s) => {
        const Ec = kinetic(s.mass, s.vclose), Eo = kinetic(s.mass, s.vopen);
        const over = s.vclose > V_A156 + 1e-9 && s.mass <= M_A156;
        const names = { wait: 'Closed', open: 'Opening', reopen: 'Obstruction: reversing', hold: 'Open, waiting', close: st.Fc > 0 ? 'Touching the bag' : 'Closing', learnOpen: 'Learning: counting the travel', learnPush: 'Learning: weighing the leaves' };
        const lr = st.learned;
        return `<div class="big ${st.phase === 'reopen' ? 'no' : ''}">${names[st.phase]}</div>
          <div class="row"><span>Leaf speed now</span><b>${Math.abs(st.v).toFixed(2)} m/s</b></div>
          <div class="row"><span>Encoder count</span><b>${fmt0(st.x * COUNTS_PER_M)}</b></div>
          <div class="row"><span>Energy of a closing leaf, ½mv²</span><b class="${Ec > E_A156 + 0.01 ? 'no' : ''}">${Ec.toFixed(1)} J</b></div>
          <div class="row"><span>Energy of an opening leaf</span><b>${Eo.toFixed(1)} J</b></div>
          <div class="row"><span>Hardest push on the bag</span><b>${st.peak > 1 ? fmt0(st.peak) + ' N' : st.lastPeak ? fmt0(st.lastPeak) + ' N' : '…'}</b></div>
          <small>${lr ? `Learned: travel ${fmt0(lr.counts)} counts = ${Math.round(lr.mm)} mm, friction ${lr.ff.toFixed(0)} N, leaf about ${lr.kg.toFixed(0)} kg.` : over ? 'Faster than the 0.305 m/s that A156.10 allows a leaf of this mass.' : `For scale: 71 kg at 0.305 m/s is ${E_A156.toFixed(1)} J. A low-energy door stays under ${E_LOW.toFixed(2)} J.`}</small>`;
      },
    };
  },
};
