// Chapter 5: when things go wrong. The same door, with four things you can do to it: cut the mains,
// sound the fire alarm, set a night lock of one of two kinds, and push the leaves out by hand.
// What the model does, in general terms only (the exact rules for a given building come from its fire
// engineer and the local code, in India the National Building Code 2016, Part 4):
//   • Mains fails, no lock: the controller runs on its battery, opens the door once and parks it open.
//   • Fire alarm: the alarm panel signals the controller; it withdraws the lock, opens and stays open.
//   • Night lock, fail-safe: the bolt is held thrown by power and springs back when power is lost.
//   • Night lock, fail-secure: the bolt stays thrown without power and needs power to withdraw. It is
//     only acceptable where people inside still have a way out that needs no power (see LockClear).
//   • Break-out: on escape routes the leaves are hung so that a firm push from inside swings them
//     outward like ordinary doors. It is purely mechanical and works in every state; a switch tells
//     the controller to stop driving. EN 16005 treats escape-route doors "with break-out function" and
//     "without" (clauses 5.9.2 to 5.9.4, read in the standard's contents list only); the second kind
//     must instead be able to open by stored energy or a duplicated drive.
// Energy for one battery opening (our arithmetic): each 60 kg leaf needs ½ m v² = ½ × 60 × 0.3² = 2.7 J
//   of motion plus friction of about 12.8 N over 0.9 m = 11.5 J; two leaves, 28 J; at an assumed 50 %
//   drive efficiency about 57 J from the battery. A small pack of 24 V and 1.2 Ah (an assumed, typical
//   size) holds 24 × 1.2 × 3,600 = 103,680 J: the motor is not what drains it. An assumed 5 W of
//   standby electronics would run it down in about 5.8 hours, which is why the door opens and parks.
import { THREE, M, box, clamp, approach, canvasTexture } from '../kit.js';
import { makeDoor, makeWalker, floorSlab, kinetic, G, TRAVEL, LEAF_W, LEAF_KG, HEAD_Y, HEAD_H, COL, fmt0, fitNarrow, inReel, isTall, altView , hideGrid , reelView } from '../door.js';

const V_BAT = 0.3, FRIC = 0.015 * LEAF_KG * G + 4;
const E_OPEN = (2 * (kinetic(LEAF_KG, V_BAT) + FRIC * TRAVEL)) / 0.5;      // J from the battery for one opening
const E_PACK = 24 * 1.2 * 3600, P_STANDBY = 5;

export default {
  id: 'fail',
  short: 'When things go wrong',
  title: 'Power cut, fire alarm, panic',
  subtitle: 'An automatic door must never become a wall. Here is how it avoids that.',
  view: { pos: [3.9, 3.3, 6.9], target: [0.5, 2.3, 0] },
  learn: `<p>A door that needs electricity has an awkward question to answer: what happens when the electricity <b>stops</b>? In a crowded mall, cinema or hospital, the entrance is also the <b>way out</b>.</p>
    <p><b>Power cut.</b> The header holds a small <b>battery</b>. When the mains fails, the controller uses it to open the door one last time and <b>park</b> it open, or it keeps working for a while and then parks open. Some doors use a stretched <b>elastic cord or spring</b> instead: it pulls the leaves apart the moment the motor lets go.</p>
    <p><b>Fire alarm.</b> The building's fire alarm panel is wired to the door. When the alarm sounds, the door opens and stays open, whatever the sensors say.</p>
    <p><b>Break-out.</b> On escape routes the leaves are hung on special pivots. Push hard on them from inside and they <b>swing outward</b> like ordinary doors. No power, no sensor, no computer: just a crowd's push. A small switch tells the controller to stop the motor while they are swung.</p>
    <p><b>The lock.</b> At night the door is locked with an electric bolt. There are two kinds. A <b>fail-safe</b> lock needs power to stay locked, so it <b>releases</b> when power is lost. A <b>fail-secure</b> lock stays locked without power. Fail-safe protects people. Fail-secure protects property, and it is only allowed where people inside can still get out another way. Mechanical locks are in <a href="https://glassbox.how/lockclear/" target="_blank" rel="noopener">LockClear</a>, and the card readers that tell these locks to open are in <a href="https://glassbox.how/accesscardclear/" target="_blank" rel="noopener">AccessCardClear</a>.</p>
    <p>The idea behind all of this has a name: <b>fail-safe design</b>. You cannot stop things failing. You can choose <i>which way</i> they fail.</p>
    <p class="tip"><b>Try it:</b> switch the mains off and watch the battery open the door. Set each night lock and cut the power again. Then sound the alarm, and push the leaves out by hand.</p>`,
  terms: [
    { t: 'Fail-safe', d: 'Designed so that a failure leaves things in the safe state. A fail-safe lock unlocks when power is lost.' },
    { t: 'Fail-secure', d: 'Designed to stay locked when power is lost. Used to protect property, where there is another way out.' },
    { t: 'Break-out', d: 'Sliding leaves that can be pushed to swing outward by hand in an emergency.' },
    { t: 'Escape route', d: 'A path people must be able to use to leave a building in an emergency.' },
    { t: 'Battery backup', d: 'A small battery in the header that can open the door when the mains supply fails.' },
    { t: 'Fire alarm input', d: 'A connection from the fire alarm panel that tells the door to open and stay open.' },
  ],
  defaults: { power: true, alarm: false, lock: 'off', push: 0 },
  controls: [
    { key: 'power', type: 'toggle', label: 'Mains power' },
    { key: 'alarm', type: 'toggle', label: 'Fire alarm' },
    { key: 'lock', type: 'seg', label: 'Night lock', options: [{ v: 'off', label: 'Off (daytime)' }, { v: 'safe', label: 'Fail-safe' }, { v: 'secure', label: 'Fail-secure' }] },
    { key: 'push', type: 'range', label: 'Push the leaves out by hand', min: 0, max: 1, step: 0.01, ends: ['shut', 'swung out'], fmt: (v) => Math.round(v * 85) + '°' },
  ],
  quiz: [
    { q: 'The mains fails at a mall entrance in the daytime. What does a typical automatic door do?', options: ['Locks shut until power returns', 'Stays wherever it happened to be', 'Uses its battery to open and park open', 'Opens and closes faster'], answer: 2, why: 'An entrance is also an exit. The battery opens it and leaves it open so nobody is trapped.' },
    { q: 'What is a fail-safe lock?', options: ['One that unlocks when power is lost', 'One that can never be broken', 'One that stays locked when power is lost', 'One with two keys'], answer: 0, why: 'It needs power to stay locked, so losing power releases it. A fail-secure lock is the opposite.' },
    { q: 'What makes break-out leaves work in an emergency?', options: ['The battery', 'The fire alarm panel', 'The microwave sensor', 'Only a push: they swing out on mechanical pivots'], answer: 3, why: 'Break-out needs no electricity at all, which is the point of it.' },
  ],
  reel: [
    { ms: 5500, caption: 'Cut the power and a battery in the header opens the door and parks it, so the way out stays clear.', set: { power: true, alarm: false, lock: 'off', push: 0 }, anim: { power: [true, false] }, spin: 0 },
  ],

  build({ stage }) {
    const showGrid = hideGrid(stage);
    const root = new THREE.Group(); stage.root.add(root);
    const door = makeDoor({ cover: 'clear' }); root.add(door);
    const slab = floorSlab(8, 7.4, 0x12151b); slab.position.x = 0.5; root.add(slab);
    // a stub of wall for the alarm sounder and the supply
    const wall = box(1.5, 2.9, 0.12, M.matte(0x2a2f3a)); wall.position.set(2.76, 1.45, 0); root.add(wall);
    const sounder = box(0.26, 0.26, 0.08, M.plastic(0xc8434f)); sounder.position.set(2.5, 2.1, 0.1); root.add(sounder);
    const strobe = box(0.12, 0.08, 0.06, M.glow(0x3a1014)); strobe.position.set(2.5, 2.3, 0.1); root.add(strobe);
    const supply = box(0.3, 0.4, 0.1, M.plastic(0x9aa3b2)); supply.position.set(3.05, 1.5, 0.1); root.add(supply);
    const mainsLed = box(0.05, 0.05, 0.02, M.glow(0x5ce1a9)); mainsLed.position.set(3.05, 1.62, 0.16); root.add(mainsLed);
    // a generic exit sign over the door, on the inside face (seen through the glass from here)
    const sign = canvasTexture(256, 96, (g, w, h) => { g.fillStyle = '#0f8a4b'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 58px sans-serif'; g.fillText('EXIT', 58, 68); });
    const signM = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.27), new THREE.MeshBasicMaterial({ map: sign.tex, toneMapped: false })); signM.position.set(-1.2, HEAD_Y + HEAD_H + 0.2, 0.02); root.add(signM);
    const batGlow = box(0.3, 0.02, 0.075, M.glow(0x5ce1a9)); batGlow.position.set(0.2, door.yRow + 0.05, -0.05); door.head.add(batGlow);
    const people = [makeWalker({ shirt: 0x7fd0ff }), makeWalker({ shirt: 0xff9d4d })];
    people.forEach((p, i) => { root.add(p); p.userData = { z: -1.6 - i * 1.1, x: -0.3 + i * 0.6, gait: i }; });
    const L = {
      bat: stage.label('Battery', [0.2, door.yRow + 0.2, 0], door.head, 'hot'),
      lock: stage.label('Electric lock', [0.95, door.yRow + 0.34, 0], door.head),
      alarm: stage.label('Fire alarm', [2.5, 2.52, 0.1], root),
      mains: stage.label('Mains supply', [3.05, 1.18, 0.1], root),
      out: stage.label('Outside', [-2.3, 0.05, 2.6], root),
    };
    const st = { open: 0, th: 0, lockK: 0, state: '', source: 'mains', used: 0, onBat: 0, prevPower: true, parked: false, cycleT: 0, blink: 0, wantOpen: false };
    return {
      dispose() { showGrid(); stage.altKey = null; },
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = fitNarrow(stage, [L.mains, L.out, L.lock, L.alarm], -0.14);
        if (reelView(stage, 'fail', { pos: [4.2, 2.8, 7.4], target: [0.5, 1.3, 0] }, { pos: [2.7, 2.26, 2.0], target: [0.4, 1.3, 0] })) { /* recording */ }
        else if (narrow) altView(stage, 'fail-phone', { pos: [2.3, 2.7, 4.3], target: [0.4, 2.0, 0] });
        const power = !!s.power, alarm = !!s.alarm, night = s.lock !== 'off';
        const broke = s.push > 0.03;
        st.source = power ? 'mains' : 'battery';
        if (!power) st.onBat += dt; else st.onBat = 0;
        // ---- the lock: fail-safe needs power to stay thrown; fail-secure needs power to withdraw
        let thrown = false;
        if (night && !alarm) thrown = s.lock === 'safe' ? power : true;
        st.lockK = approach(st.lockK, thrown ? 1 : 0, 10, dt);
        door.setLock(st.lockK);
        // ---- what the controller wants
        let want = false, why = '';
        if (alarm) { want = true; why = 'alarm'; }
        else if (!power) { want = !thrown; why = thrown ? 'secure' : 'battery'; }
        else if (night) { want = false; why = 'night'; }
        else { // ordinary day: a visitor comes and goes
          st.cycleT += dt; const c = st.cycleT % 9; want = c > 1.2 && c < 5.6; why = 'day';
        }
        if (thrown && st.lockK > 0.5) want = false;
        if (broke) want = st.wantOpen && st.open > 0.2;                    // drive is cut while the leaves are swung
        const speed = power ? 0.55 : V_BAT;
        const target = want ? TRAVEL : 0;
        if (!broke) {
          const before = st.open;
          st.open = clamp(st.open + clamp(target - st.open, -0.3 * dt, speed * dt), 0, TRAVEL);
          if (!power && want && before < 0.02 && st.open >= 0.02) st.used++;
        }
        st.wantOpen = want;
        door.setOpen(st.open);
        // ---- break-out: each leaf swings outward about its outer edge
        st.th = approach(st.th, s.push * 85 * Math.PI / 180, 10, dt);
        const c = Math.cos(st.th), sn = Math.sin(st.th), h = LEAF_W / 2;
        const pL = door.leafL.position.x - h, pR = door.leafR.position.x + h;
        door.leafL.rotation.y = -st.th; door.leafL.position.set(pL + h * c, 0.02, -0.035 + h * sn);
        door.leafR.rotation.y = st.th; door.leafR.position.set(pR - h * c, 0.02, -0.035 + h * sn);
        // ---- people: by day one visitor walks through; otherwise the two inside leave when they can
        const pathFree = 2 * st.open > 0.7 || s.push > 0.75;
        people.forEach((p, i) => {
          const u = p.userData; let v = 0;
          if (why === 'day' && !broke) {
            if (i === 0) { const cc = st.cycleT % 9; u.z = 3.6 - cc * 0.9; u.x = -0.25; v = -0.9; p.rotation.y = Math.PI; }
            else { u.z = approach(u.z, -2.7, 2, dt); u.x = 0.9; p.rotation.y = 0; }
          } else {
            const wantsOut = alarm || !power || broke;
            if (wantsOut && u.z < 3.4 + i * 0.7) { v = 1.1; if (u.z > -1.0 - i * 0.5 && u.z < -0.5 && !pathFree) v = 0; }
            u.x = approach(u.x, i === 0 ? -0.3 : 0.3, 3, dt);
            u.z += v * dt; p.rotation.y = 0;
          }
          u.gait += Math.abs(v) * dt * 4.2; p.walk(u.gait, v ? 1 : 0);
          p.position.set(u.x, 0, u.z);
        });
        if (why === 'day' && st.prevWhy !== 'day') { st.cycleT = 0; people[1].userData.z = -2.7; }
        st.prevWhy = why;
        // ---- lamps
        st.blink += dt;
        strobe.material.color.setHex(alarm && st.blink % 0.6 < 0.3 ? 0xff4040 : 0x3a1014);
        mainsLed.material.color.setHex(power ? 0x5ce1a9 : 0x26302c);
        door.led.material.color.setHex(power ? 0x5ce1a9 : 0xffb547);
        batGlow.material.color.setHex(power ? 0x2c3a33 : 0xffb547);
        st.state = broke ? 'broke' : why;
        st.thrown = thrown;
        L.bat.visible = !inReel(); L.lock.visible = !inReel() && !narrow;
      },
      readout: (s) => {
        const moving = st.wantOpen ? st.open < TRAVEL - 0.01 : st.open > 0.01;
        const head = { broke: 'Leaves pushed out by hand', alarm: 'Fire alarm: open and staying open', battery: st.open > TRAVEL - 0.01 ? 'On battery: parked open' : 'On battery: opening', secure: 'No power: still locked', night: 'Locked for the night', day: st.wantOpen ? 'Working normally' : 'Working normally' }[st.state] || '';
        const cls = st.state === 'secure' ? 'no' : st.state === 'alarm' || st.state === 'battery' || st.state === 'broke' ? 'ok' : '';
        const lockTxt = s.lock === 'off' ? 'not in use' : st.thrown ? (s.lock === 'safe' ? 'locked, held by power' : 'locked, held by a spring') : s.lock === 'safe' && !s.power ? 'released: no power to hold it' : 'withdrawn by the controller';
        const note = { broke: 'Break-out needs no power. A switch stops the motor while the leaves are swung.', alarm: 'The alarm overrides the sensors and the night lock.', battery: `One opening takes about ${fmt0(E_OPEN)} J. This ${fmt0(E_PACK / 1000)} kJ pack would run the electronics for about ${(E_PACK / P_STANDBY / 3600).toFixed(1)} hours.`, secure: 'A fail-secure lock keeps the building shut. People inside must have another way out, such as break-out leaves.', night: s.lock === 'safe' ? 'Fail-safe: cut the power and this bolt lets go.' : 'Fail-secure: cut the power and this bolt stays put.', day: 'Mains on, no alarm: the sensors are in charge.' }[st.state];
        return `<div class="big ${cls}">${head}</div>
          <div class="row"><span>Running on</span><b>${s.power ? 'mains' : 'battery'}</b></div>
          <div class="row"><span>Lock</span><b>${lockTxt}</b></div>
          <div class="row"><span>Door</span><b>${s.push > 0.03 ? 'swung ' + Math.round(s.push * 85) + '° outward' : moving ? (st.wantOpen ? 'opening' : 'closing') : st.open > 0.5 ? 'open' : 'closed'}</b></div>
          <div class="row"><span>Openings on battery</span><b>${st.used}</b></div>
          <small>${note}</small>`;
      },
    };
  },
};
