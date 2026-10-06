// Chapter 1: the header operator of a two-leaf sliding door, opened up.
// One toothed belt runs round a driven pulley and an idler. The left leaf's hanger is clamped to the
// lower run and the right leaf's hanger to the upper run. The two runs always move in opposite
// directions, so one motor moves both leaves apart or together by the same distance.
// Sizes and layout are in js/door.js. The belt speed equals the leaf speed; pulley turns = travel ÷ (2π r),
// with r = 45 mm here, so 0.9 m of travel is 3.2 turns of the pulley.
import { exploder, approach, clamp } from '../kit.js';
import { makeDoor, TRAVEL, HEAD_Y, HEAD_H, W_OPEN, TAU, fitNarrow, inReel, isTall , hideGrid, floorSlab , reelView } from '../door.js';

export default {
  id: 'anatomy',
  short: 'Inside the header',
  title: 'The box above the door',
  subtitle: 'One motor, one belt, and two leaves clamped to opposite sides of it.',
  view: { pos: [0.7, 2.6, 3.9], target: [0, 2.0, 0] },
  learn: `<p>Walk up to a mall, a hospital, an airport terminal or a metro station and the glass slides apart for you. Everything that does it sits in the long box over your head, called the <b>header</b>. The whole machine in there is the <b>operator</b>.</p>
    <p>Each glass <b>leaf</b> hangs from a <b>carriage</b> with small wheels that roll along a <b>track</b>. A little guide on the floor only stops the leaf swinging. The weight is all carried from the top.</p>
    <p>A small <b>brushless DC motor</b> turns a <b>gearbox</b>, and the gearbox turns a pulley. Round that pulley and an <b>idler</b> pulley at the far end runs a <b>toothed belt</b>, like a long flat rubber chain.</p>
    <p>Here is the neat trick. The top of a belt loop always moves the opposite way to the bottom. So the left leaf is clamped to the <b>lower run</b> and the right leaf to the <b>upper run</b>. Turn the motor one way and the leaves fly apart. Turn it the other way and they meet in the middle. One motor, two leaves, always in step. A bicycle chain does the same thing: see <a href="https://glassbox.how/cycleclear/" target="_blank" rel="noopener">CycleClear</a>.</p>
    <p>Also in the header: the <b>controller</b> (a small computer), a <b>power supply</b>, a <b>battery</b> for power cuts, an electric <b>lock</b>, and an <b>encoder</b> on the motor that counts turns so the controller always knows where the leaves are. On the outside sit the <b>sensors</b>, which the next two chapters are about.</p>
    <p class="tip"><b>Try it:</b> slide the door open and watch the orange clamp and the blue clamp. They ride the same belt and go opposite ways. Then pull the header apart.</p>`,
  terms: [
    { t: 'Operator', d: 'The complete drive unit of an automatic door: motor, gearbox, belt, controller and the rest.' },
    { t: 'Header', d: 'The long box above the door that hides the operator and carries the track.' },
    { t: 'Leaf', d: 'One moving panel of a door.' },
    { t: 'Carriage (hanger)', d: 'The wheeled bracket a leaf hangs from. It rolls along the track.' },
    { t: 'Toothed belt', d: 'A belt with teeth that mesh with the pulleys, so it cannot slip and the leaves keep their positions.' },
    { t: 'Encoder', d: 'A sensor on the motor that sends pulses as it turns. Counting them gives the position of the door.' },
  ],
  defaults: { open: 0, explode: 0, cover: false },
  controls: [
    { key: 'open', type: 'range', label: 'Slide the door', min: 0, max: 1, step: 0.005, ends: ['closed', 'open'], fmt: (v) => Math.round(v * W_OPEN * 100) + ' cm gap' },
    { key: 'explode', type: 'range', label: 'Take the header apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'cover', type: 'toggle', label: 'Put the cover on' },
  ],
  quiz: [
    { q: 'How does one motor move the two leaves in opposite directions?', options: ['It has two shafts that spin opposite ways', 'Each leaf is clamped to a different run of one belt loop, and the two runs move opposite ways', 'A spring pushes one leaf while the motor pulls the other', 'The leaves are geared to each other along the floor'], answer: 1, why: 'The upper and lower runs of a belt loop always travel in opposite directions, at the same speed.' },
    { q: 'What carries the weight of a sliding leaf?', options: ['The floor guide', 'The belt', 'The glass side panels', 'The carriage wheels on the track in the header'], answer: 3, why: 'The leaf hangs from the top. The floor guide only keeps it from swinging.' },
    { q: 'Why is the belt toothed instead of smooth?', options: ['So it cannot slip, and the controller can trust the position it has counted', 'To make it quieter', 'To grip the glass', 'So it can carry electricity'], answer: 0, why: 'Teeth lock the belt to the pulley. A slipping belt would let the leaves drift away from the counted position.' },
  ],
  reel: [
    { ms: 5000, caption: 'An automatic door hides its whole machine in the box above your head.', set: { open: 0, explode: 0, cover: true }, anim: { open: [0, 1] }, spin: 0.4 },
    { ms: 6000, caption: 'One belt, two leaves: one clamps to the top run, the other to the bottom, so they always move opposite ways.', set: { explode: 0, cover: false }, anim: { open: [1, 0.1] }, spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const slab = floorSlab(6.4, 5, 0x12151b); slab.position.z = 0.6; stage.root.add(slab);
    const door = makeDoor({ cover: 'solid' });
    stage.root.add(door);
    const ex = exploder([
      { obj: door.belt, off: [0, 0, 0.32] }, { obj: door.drive, off: [0, 0, 0.32] }, { obj: door.idler, off: [0, 0, 0.32] },
      { obj: door.motor, off: [-0.45, 0.12, 0.1] },
      { obj: door.ctrl, off: [0, 0.28, 0] }, { obj: door.psu, off: [0, 0.28, 0] }, { obj: door.battery, off: [0, 0.28, 0] }, { obj: door.lock, off: [0.25, 0.28, 0] },
      { obj: door.sens, off: [0, 0, 0] },
    ]);
    const yT = HEAD_Y + HEAD_H;
    const L = {
      motor: stage.label('Motor and gearbox', [-1.5, door.yPul + 0.22, 0], door.motor, 'hot'),
      drive: stage.label('Drive pulley', [0, -0.16, 0.05], door.drive),
      idler: stage.label('Idler pulley', [0, -0.16, 0.05], door.idler),
      belt: stage.label('Toothed belt', [1.15, door.yUp + 0.1, 0.1], door.belt, 'hot'),
      ctrl: stage.label('Controller', [-0.85, yT + 0.08, 0], door.ctrl),
      psu: stage.label('Power supply', [0, 0.26, 0], door.psu),
      bat: stage.label('Battery', [0.2, yT + 0.08, 0], door.battery),
      lock: stage.label('Lock', [0.75, yT + 0.08, 0], door.lock),
      cL: stage.label('Clamped to the lower run', [0, -0.16, 0.2], door.carL, 'hot'),
      cR: stage.label('Clamped to the upper run', [0, -0.42, 0.2], door.carR, 'hot'),
      track: stage.label('Track', [1.75, HEAD_Y + 0.0, 0.1], door.head),
      sens: stage.label('Sensor', [0, -0.14, 0.1], door.sensOut),
      leaf: stage.label('Leaf', [0, 1.0, 0.05], door.leafL),
      guide: stage.label('Floor guide', [-W_OPEN / 2 - 0.05, 0.16, 0.1], door),
    };
    L.cL.element.style.setProperty('--c', '#ff9d4d'); L.cR.element.style.setProperty('--c', '#5fd6e8');
    let k = 0, cov = 1, x = 0;
    return {
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [L.psu, L.idler, L.track, L.guide, L.ctrl, L.bat, L.lock, L.drive, L.sens], -0.1);
        if (s.cover) reelView(stage, 'anat-a', { pos: [1.4, 2.0, 6.2], target: [0, 1.3, 0] }, { pos: [1.9, 1.76, 1.23], target: [0, 1.3, 0] });
        else reelView(stage, 'anat-b', { pos: [0.3, 2.45, 2.7], target: [0, 2.15, 0] }, { pos: [-1.5, 2.5, 0.62], target: [-0.55, 2.24, 0] });
        k = approach(k, s.explode, 8, dt);
        cov = approach(cov, s.cover ? 0 : 1, 7, dt);
        ex(k);
        // the cover fades away so the works can be seen
        door.coverMat.opacity = 1 - cov; door.cover.visible = cov < 0.97; door.cover.position.z = 0.125 + 0.25 * cov;
        x = approach(x, s.open * TRAVEL, 10, dt);
        door.setOpen(x);
        const inside = cov > 0.3 && !inReel();
        ['motor', 'belt', 'cL', 'cR'].forEach((n) => { L[n].visible = inside; });
        if (!narrow) ['drive', 'idler', 'ctrl', 'psu', 'bat', 'lock', 'track'].forEach((n) => { L[n].visible = inside; });
        if (narrow) { L.cL.visible = L.cR.visible = inside && s.explode < 0.3; L.leaf.visible = false; }
      },
      readout: (s) => {
        const tr = s.open * TRAVEL, turns = tr / (TAU * door.rPul);
        return `<div class="big">${s.open < 0.02 ? 'Closed' : s.open > 0.98 ? 'Fully open' : 'Sliding'}</div>
          <div class="row"><span>Each leaf has moved</span><b>${Math.round(tr * 100)} cm</b></div>
          <div class="row"><span>Gap between the leaves</span><b>${Math.round(tr * 200)} cm</b></div>
          <div class="row"><span>Drive pulley has turned</span><b>${turns.toFixed(1)} times</b></div>
          <small>Left leaf on the lower run, right leaf on the upper run: same belt, opposite ways.</small>`;
      },
    };
  },
};
