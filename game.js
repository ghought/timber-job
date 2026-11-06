(() => {
'use strict';
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };

const PX = 3;       // trunk texture pixels per world unit
const CUT = -26;    // height of the felling cut (world y is negative going up)
const SKIES = {
  dawn:  ['#2b4a6f', '#e88f6a', '#ffd9a0', '#ffe9b8'],
  noon:  ['#3a9ad9', '#8fd3ee', '#e6f6e8', '#fff8d8'],
  gold:  ['#3f4e86', '#e0795a', '#ffc46b', '#fff0b0'],
  storm: ['#232c3d', '#46566b', '#8b9aa3', '#c9d3cf'],
};

// Each job adds one real hazard from the trade.
const LEVELS = [
  { name: 'First Pine', client: 'Open field, nothing to hit.', brief: 'Tap the left or right side of the trunk to swing. Keep going until it drops.', kind: 'pine', sky: 'noon', h: 200, r: 18, tools: ['axe'], par: 16, obs: [], fell: 0 },
  { name: 'The Bungalow', client: 'The owner wants this pine gone, and the house kept.', brief: 'A tree falls toward its notch. Cut the LEFT side first, about a third of the way in, then cut the right side.', kind: 'pine', sky: 'noon', h: 220, r: 20, tools: ['axe'], par: 16, fell: -1, tw: 60, obs: [{ t: 'house', x: 135, w: 120, hgt: 95 }] },
  { name: 'Fence Line', client: 'The neighbor just painted that fence.', brief: 'Notch too deep and the butt skids forward. Keep the notch inside the gold band on the gauge.', kind: 'pine', sky: 'gold', h: 230, r: 21, tools: ['axe'], par: 16, fell: 1, tw: 34, obs: [{ t: 'fence', x: 262, w: 60, hgt: 34 }, { t: 'shed', x: -125, w: 80, hgt: 64 }] },
  { name: 'New Saw', client: 'Thick birch by the garage.', brief: 'You have a chainsaw now. Hold on one side of the trunk and drag inward. Axe the notch, saw the back cut, or use the saw for both.', kind: 'birch', sky: 'dawn', h: 240, r: 25, tools: ['axe', 'saw'], par: 20, fell: -1, tw: 50, obs: [{ t: 'garage', x: 130, w: 110, hgt: 80 }] },
  { name: 'The Leaner', client: 'This oak leans right at the house.', brief: 'Notch the LEFT side. The back cut will pinch shut, so drive wedges into it to lift the tree off its lean.', kind: 'oak', sky: 'noon', h: 220, r: 26, tools: ['axe', 'saw', 'wedge'], par: 22, fell: -1, tw: 55, lean: .07, wedge: true, obs: [{ t: 'house', x: 140, w: 120, hgt: 95 }] },
  { name: 'Windy Ridge', client: 'Gusts all afternoon, and a greenhouse downwind.', brief: 'Watch the wind arrow. Finish the back cut while the wind is calm or at your back. A strong gust against the fall throws the tree backward.', kind: 'pine', sky: 'gold', h: 240, r: 22, tools: ['axe', 'saw'], par: 20, fell: -1, tw: 55, wind: 1, obs: [{ t: 'greenhouse', x: 140, w: 130, hgt: 70 }] },
  { name: 'Barber Chair', client: 'Ash under heavy forward lean.', brief: 'Saw the back cut too fast and the trunk splits up the middle. Watch the tension bar and ease off when it climbs.', kind: 'birch', sky: 'dawn', h: 240, r: 25, tools: ['axe', 'saw'], par: 24, fell: 1, tw: 50, lean: .06, tension: 1, obs: [{ t: 'shed', x: -125, w: 80, hgt: 64 }] },
  { name: 'Punky Elm', client: 'Dead elm, rotten through the middle.', brief: 'Rotten wood holds less. The tree goes much sooner, and a deep notch breaks the hinge. Keep the notch shallow.', kind: 'dead', sky: 'storm', h: 220, r: 25, tools: ['axe', 'saw'], par: 12, fell: 1, tw: 40, rot: true, obs: [{ t: 'fence', x: 245, w: 60, hgt: 34 }, { t: 'house', x: -140, w: 120, hgt: 95 }] },
  { name: 'Tight Lot', client: 'No room to fell. Houses on both sides.', brief: 'Take it down in pieces. Drag across the trunk to cut a section. The crane swings it out, so tap to drop it over the gold zone.', kind: 'pine', sky: 'noon', h: 250, r: 20, tools: ['saw'], top: 3, zone: [24, 74], obs: [{ t: 'house', x: -135, w: 120, hgt: 95 }, { t: 'house', x: 175, w: 120, hgt: 95 }] },
  { name: 'Live Wires', client: 'The power company wants this done carefully.', brief: 'The line is just past the drop zone. Wind and a sloppy notch will both put you into it.', kind: 'pine', sky: 'gold', h: 240, r: 23, tools: ['axe', 'saw'], par: 20, fell: 1, tw: 30, wind: .8, obs: [{ t: 'wires', x: 262, w: 30, hgt: 120 }, { t: 'house', x: -140, w: 120, hgt: 95 }] },
  { name: 'Storm Oak', client: 'Storm-damaged, leaning, and rotten at the core.', brief: 'Everything at once: rot, lean, wedges and gusts. Shallow notch, wedges in, and wait for calm.', kind: 'oak', sky: 'storm', h: 230, r: 28, tools: ['axe', 'saw', 'wedge'], par: 22, fell: -1, tw: 42, lean: .07, wedge: true, rot: true, wind: .9, obs: [{ t: 'house', x: 145, w: 120, hgt: 95 }] },
  { name: 'Courthouse Giant', client: 'The town square. Everyone is watching.', brief: 'Five sections, a narrow zone, and wind pushing the crane line around. Take your time on each release.', kind: 'oak', sky: 'dawn', h: 290, r: 26, tools: ['saw'], top: 5, zone: [30, 66], wind: .6, obs: [{ t: 'house', x: -140, w: 120, hgt: 110 }, { t: 'garage', x: 170, w: 110, hgt: 80 }] },
];

// ---------- persistence ----------
let save = { stars: [], cash: 0 };
try { save = Object.assign(save, JSON.parse(localStorage.getItem('timberjob') || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem('timberjob', JSON.stringify(save)); } catch (e) {} };

// ---------- audio ----------
let AC, master, noiseBuf, saw;
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  AC = new Ctor(); master = AC.createGain(); master.gain.value = .8; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 80; o2.frequency.value = 121;
  f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .8; g.gain.value = 0;
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(master); o1.start(); o2.start();
  saw = { o1, o2, f, g };
}
function noise(dur, freq, vol, type = 'bandpass', q = 1) {
  if (!AC) return;
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur);
}
function tone(f0, f1, dur, vol, type = 'sine') {
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
}
const sfx = {
  thunk() { tone(190, 70, .13, .7); noise(.07, 1900, .5); noise(.16, 500, .3); },
  clank() { tone(1500, 900, .12, .25, 'triangle'); noise(.05, 3500, .3); },
  crack() { for (let i = 0; i < 6; i++) setTimeout(() => noise(.07, rnd(700, 2400), .55), i * rnd(40, 90)); tone(120, 50, .5, .4, 'sawtooth'); },
  boom() { tone(95, 28, .8, 1); noise(.7, 240, .9, 'lowpass'); },
  smash() { noise(.5, 2600, .7); tone(300, 60, .4, .5, 'square'); },
  ding() { tone(660, 660, .12, .25); setTimeout(() => tone(990, 990, .22, .25), 110); },
};
function sawLoad(on, load) {
  if (!saw) return;
  const t = AC.currentTime;
  saw.g.gain.setTargetAtTime(on ? .16 + load * .1 : 0, t, .03);
  saw.o1.frequency.setTargetAtTime(on ? 110 - load * 38 : 70, t, .05);
  saw.o2.frequency.setTargetAtTime(on ? 166 - load * 56 : 105, t, .05);
  saw.f.frequency.setTargetAtTime(on ? 1500 - load * 600 : 500, t, .05);
}
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

// ---------- game state ----------
let W = 390, H = 800, DPR = 1, bg = null, vign = null;
const G = { state: 'menu', i: 0, t: 0, lvl: LEVELS[0], cam: { x: 0, y: -200, s: .8 }, p: [], pops: [], shake: 0, stop: 0, time: 0, tufts: [] };

function wind() { return (Math.sin(G.time * .8) + .55 * Math.sin(G.time * 2.1 + 1)) / 1.55; }
const fingerWorld = e => ({ x: G.cam.x + (e.clientX - W / 2) / G.cam.s, y: G.cam.y + (e.clientY - H / 2) / G.cam.s });

// ---------- art: background ----------
function buildBg() {
  const c = mk((W + 80) * DPR, H * DPR), g = c.getContext('2d'), s = SKIES[G.lvl.sky];
  g.scale(DPR, DPR);
  const w = W + 80, gr = g.createLinearGradient(0, 0, 0, H * .8);
  gr.addColorStop(0, s[0]); gr.addColorStop(.55, s[1]); gr.addColorStop(1, s[2]);
  g.fillStyle = gr; g.fillRect(0, 0, w, H);
  const sx = w * .72, sy = H * .3, sun = g.createRadialGradient(sx, sy, 8, sx, sy, W * .75);
  sun.addColorStop(0, s[3]); sun.addColorStop(.12, s[3] + 'aa'); sun.addColorStop(1, s[3] + '00');
  g.fillStyle = sun; g.fillRect(0, 0, w, H);
  g.fillStyle = s[3] + '55';
  for (let i = 0; i < 6; i++) {
    const x = rnd(w), y = rnd(H * .08, H * .4);
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + k * 16 - 40, y + rnd(-5, 5), rnd(18, 34), rnd(6, 12), 0, 0, 7); g.fill(); }
  }
  const dark = G.lvl.sky === 'storm';
  const hills = dark ? ['#46566b', '#36465a', '#27362f'] : ['#7fa8a0', '#52836f', '#2f5d48'];
  hills.forEach((col, i) => {
    const base = H * (.56 + i * .07), ph = rnd(7);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= w; x += 6) {
      let y = base + Math.sin(x * .011 + ph) * 22 + Math.sin(x * .031 + ph * 2) * 9;
      if (i > 0) y -= Math.abs(Math.sin(x * .19 + ph)) * (7 + i * 5);
      g.lineTo(x, y);
    }
    g.lineTo(w, H); g.fill();
  });
  bg = c;
  const v = mk(W * DPR, H * DPR), q = v.getContext('2d');
  const vg = q.createRadialGradient(W * DPR / 2, H * DPR * .45, H * DPR * .35, W * DPR / 2, H * DPR * .45, H * DPR * .8);
  vg.addColorStop(0, 'rgba(10,20,20,0)'); vg.addColorStop(1, 'rgba(10,20,20,.5)');
  q.fillStyle = vg; q.fillRect(0, 0, v.width, v.height);
  vign = v;
}

// ---------- art: tree ----------
function buildTree() {
  const L = G.lvl, r = L.r, h = L.h, tw = (2 * r + 8) * PX, th = h * PX;
  const t = mk(tw, th), g = t.getContext('2d');
  const birch = L.kind === 'birch', dead = L.kind === 'dead';
  const X = x => (x + r + 4) * PX;
  g.beginPath(); g.moveTo(X(-r), th); g.lineTo(X(-r * .42), 0); g.lineTo(X(r * .42), 0); g.lineTo(X(r), th); g.closePath(); g.clip();
  const gr = g.createLinearGradient(X(-r), 0, X(r), 0);
  const cols = birch ? ['#b9b3a3', '#f4efe2', '#8e8775'] : dead ? ['#4d4438', '#8a7a64', '#332b22'] : ['#3a2416', '#8a5a36', '#2a180e'];
  gr.addColorStop(0, cols[0]); gr.addColorStop(.38, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fillRect(0, 0, tw, th);
  for (let i = 0; i < 240; i++) {
    const x = rnd(tw), y = rnd(th), len = birch ? rnd(4, 12) * PX : rnd(14, 46) * PX;
    g.strokeStyle = birch ? 'rgba(40,34,28,.75)' : `rgba(${rnd() < .6 ? '20,10,5' : '190,140,95'},${rnd(.12, .4)})`;
    g.lineWidth = rnd(1, 3.6); g.beginPath(); g.moveTo(x, y);
    birch ? g.lineTo(x + len, y + rnd(-2, 2)) : g.bezierCurveTo(x + rnd(-6, 6), y + len * .3, x + rnd(-6, 6), y + len * .6, x + rnd(-4, 4), y + len);
    g.stroke();
  }
  G.trunk = t; G.tc = g;
  g.restore?.();
  G.crown = buildCrown();
}
function buildCrown() {
  const L = G.lvl, h = L.h, CP = 2, w = L.kind === 'oak' ? h * .95 : L.kind === 'pine' ? h * .62 : h * .7, ch = h * (L.kind === 'pine' ? .66 : .6);
  const c = mk(w * CP, (ch + 12) * CP), g = c.getContext('2d');
  g.scale(CP, CP);
  if (L.kind === 'pine') {
    const tiers = 7;
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1), y0 = ch - f * ch * .84, hw = (1 - f * .82) * w / 2, top = y0 - ch * .32;
      const gr = g.createLinearGradient(w / 2 - hw, 0, w / 2 + hw, 0);
      gr.addColorStop(0, '#2f7a4a'); gr.addColorStop(.45, '#1f5c3a'); gr.addColorStop(1, '#0f3a2a');
      g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, Math.max(top, 2));
      g.lineTo(w / 2 + hw, y0);
      for (let k = 8; k >= 0; k--) g.lineTo(w / 2 - hw + 2 * hw * k / 8, y0 + (k % 2 ? 7 : -1));
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160,220,140,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, Math.max(top, 2) + 6); g.lineTo(w / 2 - hw * .85, y0 - 4); g.stroke();
    }
  } else if (L.kind === 'dead') {
    g.lineCap = 'round';
    const br = (x, y, a, len, wd) => {
      if (wd < 1) return;
      const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
      g.strokeStyle = '#3d352b'; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      br(x2, y2, a + rnd(.2, .6), len * .72, wd * .68); br(x2, y2, a - rnd(.2, .6), len * .72, wd * .68);
    };
    br(w / 2, ch, 0, ch * .3, 12);
  } else {
    const birch = L.kind === 'birch', base = birch ? ['#3d7a3a', '#5fa04a', '#9cc95f'] : ['#1f5a33', '#37813f', '#7cb84e'];
    base.forEach((col, layer) => {
      g.fillStyle = col;
      for (let i = 0; i < 46 - layer * 10; i++) {
        const a = rnd(6.28), d = Math.sqrt(rnd()) * .5, off = layer * .08;
        const x = w / 2 + Math.cos(a) * d * w * .86 - off * w, y = ch * .52 + Math.sin(a) * d * ch * .9 - off * ch;
        g.beginPath(); g.arc(x, y, rnd(10, 22) * (1 - layer * .16), 0, 7); g.fill();
      }
    });
  }
  return { c, w, h: ch + 12, x: -w / 2, y: -h - (L.kind === 'pine' ? 8 : ch * .28) };
}
function carveNotch(side, d, cy = CUT) {
  const L = G.lvl, r = L.r, g = G.tc, X = x => (x + r + 4) * PX, Y = y => (L.h + y) * PX;
  const ax = side * (r - d * 2 * r), open = 3 + d * 2 * r * .8, ex = side * (r + 5);
  const pts = [[ex, cy - open]], n = 6;
  for (let i = 1; i < n; i++) { const f = i / n; pts.push([lerp(ex, ax, f) + rnd(-1, 1), lerp(cy - open, cy, f) + rnd(-1.2, 1.2)]); }
  pts.push([ax, cy]);
  for (let i = 1; i < n; i++) { const f = i / n; pts.push([lerp(ax, ex, f) + rnd(-1, 1), cy + rnd(-.6, 1.2) + f * open * .22]); }
  pts.push([ex, cy + open * .22]);
  const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); };
  g.save();
  g.globalCompositeOperation = 'destination-out'; path(); g.fill();
  g.globalCompositeOperation = 'source-atop'; g.lineJoin = 'round';
  path(); g.strokeStyle = L.rot ? '#6b5a3a' : '#f6e2b8'; g.lineWidth = 8 * PX; g.stroke();
  path(); g.strokeStyle = L.rot ? '#4e4029' : '#e0ae6c'; g.lineWidth = 4 * PX; g.stroke();
  path(); g.strokeStyle = L.rot ? '#2c2316' : '#a8703f'; g.lineWidth = 1.4 * PX; g.stroke();
  g.restore();
}
function carveKerf(side, d, cy = CUT) {
  const L = G.lvl, r = L.r, g = G.tc, x0 = (side > 0 ? r + 5 : -r - 5), x1 = side * (r - d * 2 * r);
  const a = (Math.min(x0, x1) + r + 4) * PX, b = (Math.max(x0, x1) + r + 4) * PX, y = (L.h + cy) * PX;
  g.save();
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = L.rot ? '#6b5a3a' : '#f1d7a4'; g.fillRect(a, y - 2.2 * PX, b - a, 4.4 * PX);
  g.globalCompositeOperation = 'destination-out'; g.fillRect(a, y - .9 * PX, b - a, 1.8 * PX);
  g.restore();
}

// ---------- particles ----------
function chip(x, y, side, n, big) {
  const L = G.lvl, pale = L.rot ? ['#7a684a', '#54462f'] : ['#f1d7a4', '#e0b878', '#c79a5e'];
  for (let i = 0; i < n && G.p.length < 420; i++) G.p.push({ k: 'chip', x, y: y + rnd(-5, 5), vx: side * -rnd(40, 230), vy: rnd(-260, -40), r: rnd(6.28), vr: rnd(-16, 16), s: rnd(1.2, 3.6), c: pale[i % pale.length], life: rnd(2.5, 5) });
  if (big) G.p.push({ k: 'chunk', x, y, vx: side * -rnd(130, 240), vy: rnd(-300, -190), r: 0, vr: side * -rnd(9, 15), s: rnd(6, 9), c: pale[0], b: L.kind === 'birch' ? '#e8e2d2' : '#4a2f1f', life: 6 });
}
function dust(x, y, n, col = 'rgba(214,190,150,.5)', sz = 10) { for (let i = 0; i < n && G.p.length < 420; i++) G.p.push({ k: 'dust', x: x + rnd(-14, 14), y, vx: rnd(-45, 45), vy: rnd(-55, -8), s: rnd(sz * .5, sz), c: col, life: rnd(.6, 1.4), t: 0 }); }
function leaves(x, y, n) { const c = ['#2f7a4a', '#5fa04a', '#9cc95f']; for (let i = 0; i < n && G.p.length < 420; i++) G.p.push({ k: 'leaf', x: x + rnd(-40, 40), y: y + rnd(-30, 20), vx: rnd(-70, 70), vy: rnd(-150, -10), r: rnd(6), vr: rnd(-6, 6), s: rnd(1.6, 3), c: c[i % 3], life: rnd(1.5, 3) }); }
function pop(text, col = '#fff6e6', big) { G.pops.push({ text, col, t: 0, big }); }
function stepParticles(dt) {
  for (const p of G.p) {
    p.life -= dt;
    if (p.k === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt; continue; }
    const leaf = p.k === 'leaf';
    p.vy += (leaf ? 130 : 760) * dt; if (leaf) p.vx *= .98;
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    if (p.y > -1) { p.y = -1; p.vy *= -.28; p.vx *= .55; p.vr *= .5; if (Math.abs(p.vy) < 26) { p.vy = 0; p.vx = 0; p.vr = 0; } }
  }
  G.p = G.p.filter(p => p.life > 0);
  for (const q of G.pops) q.t += dt;
  G.pops = G.pops.filter(q => q.t < 1.5);
}

// ---------- job flow ----------
function startJob(i) {
  audio();
  const L = LEVELS[i];
  G.i = i; G.lvl = L;
  const len = L.h + CUT;
  Object.assign(G, {
    state: 'intro', t: 0, d: { '-1': 0, '1': 0 }, notch: 0, swings: 0, tool: L.tools[0], a: L.lean || 0, av: 0, px: 0, dir: 0, skid: 0, skidT: 0,
    leanRem: L.wedge ? 3 : 0, wedges: 0, tension: 0, axe: null, sawing: false, sawSide: 0, finger: null, fail: '', p: [], pops: [], piece: null, logs: [], sec: 0, misses: 0, cutProg: 0, lastX: null, split: false, flipped: false, done: false,
    obs: L.obs.map(o => ({ ...o, hit: false })),
    target: L.top ? L.zone : L.fell ? (L.fell > 0 ? [len - L.tw, len + L.tw] : [-len - L.tw, -len + L.tw]) : null,
  });
  if (L.top) { G.secH = (L.h - 50) / L.top; G.topY = -L.h; G.cutY = -L.h + G.secH; }
  G.tufts = Array.from({ length: 150 }, () => ({ x: rnd(-520, 520), h: rnd(3, 8), c: rnd() < .5 ? '#4f8a3f' : '#2f6b36' }));
  buildBg(); buildTree();
  $('card').hidden = true; $('hud').hidden = false;
  $('jobName').textContent = `Job ${i + 1}: ${L.name}`;
  $('cash').textContent = `$${save.cash}`;
  setTools();
  hint(L.top ? 'Check the drop zone' : 'Survey the site');
}
function hint(s) { $('hint').textContent = s; }
function setTools() {
  const box = $('tools'), L = G.lvl;
  box.innerHTML = '';
  box.hidden = L.tools.length < 2;
  L.tools.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tool' + (G.tool === t ? ' on' : ''); b.textContent = { axe: 'Axe', saw: 'Chainsaw', wedge: 'Wedge' }[t];
    b.onclick = () => { audio(); G.tool = t; setTools(); };
    box.appendChild(b);
  });
}
function chopHint() {
  const L = G.lvl, side = L.fell < 0 ? 'LEFT' : 'RIGHT', back = L.fell < 0 ? 'right' : 'left';
  if (L.top) return hint('Drag across the trunk to cut');
  if (!L.fell) return hint('Tap the trunk to chop');
  hint(G.notch ? `Now the back cut on the ${back}` : `Fell it ${side}: notch the ${side} side`);
}
const thr = () => G.lvl.rot ? .62 : .86;
const pinched = side => G.lvl.wedge && G.notch && side !== G.notch && G.d[side] >= .4 && G.leanRem > 0 && Math.sign(G.lvl.lean) !== G.notch;
function addDepth(side, amt) {
  if (!G.notch) { G.notch = side; chopHint(); }
  const cap = pinched(side) ? G.d[side] : .96;
  G.d[side] = Math.min(cap, G.d[side] + amt);
  if (G.d[-1] + G.d[1] >= thr()) startCrack();
}
function strike(side) {
  const L = G.lvl;
  if (pinched(side)) { sfx.clank(); hint('Pinched! Drive wedges into the back cut'); G.shake = 3; return; }
  G.swings++;
  const before = G.d[side];
  addDepth(side, .085 * 20 / L.r + .02);
  carveNotch(side, G.d[side]);
  chip(side * (L.r - before * 2 * L.r), CUT, side, 16, true);
  G.shake = 6; G.stop = .05; sfx.thunk(); buzz(18);
  if (side === G.notch) {
    const nd = G.d[side];
    if (nd >= .25 && nd <= .4 && before < .25) pop('Good notch depth', '#f2b441');
  }
}
function driveWedge() {
  const s = -G.notch;
  if (!G.lvl.wedge || !G.notch || G.d[s] < .25) { hint('Start the back cut before wedging'); return; }
  if (G.leanRem <= 0) return;
  G.leanRem--; G.wedges++; G.shake = 5; G.stop = .04; sfx.clank(); sfx.thunk(); buzz(22);
  G.a -= Math.sign(G.lvl.lean) * .022;
  pop(G.leanRem ? `Wedge ${G.wedges} of 3` : 'Lean lifted. Finish the cut', '#f2b441');
  if (!G.leanRem) { G.tool = G.lvl.tools[1]; setTools(); }
}
function startCrack() {
  if (G.state !== 'chop') return;
  const L = G.lvl, nd = G.d[G.notch];
  G.dir = nd >= .18 ? G.notch : (L.lean ? Math.sign(L.lean) : G.notch);
  if (L.wind && G.dir * wind() * L.wind < -.62) { G.dir = -G.dir; G.flipped = true; }
  G.skid = (nd > .5 ? (nd - .5) * 240 : nd < .2 ? 26 : 0) + (L.rot && nd > .36 ? 55 : 0);
  G.px = G.dir * L.r * .55 * (1 - 2 * Math.min(nd, .5));
  stopSaw(); G.state = 'crack'; G.t = 0; sfx.crack(); buzz(60);
  pop('TIMBER!', '#fff6e6', true); hint(G.flipped ? 'A gust caught it!' : '');
  $('tools').hidden = true;
}
function barberChair() {
  const L = G.lvl;
  G.split = true; G.dir = Math.sign(L.lean) || G.notch || 1; G.px = G.dir * L.r * .3; G.fail = 'Barber chair. You cut too fast and the trunk split up the middle.';
  stopSaw(); G.state = 'crack'; G.t = 0; sfx.crack(); sfx.smash(); G.shake = 14; buzz(120);
  pop('CRACK!', '#d9482f', true); $('tools').hidden = true;
}
function stopSaw() { G.sawing = false; sawLoad(false, 0); }
function finish() {
  if (G.done) return; G.done = true;
  const L = G.lvl, hit = G.obs.filter(o => o.hit);
  let ok = !G.fail && !hit.length, msg = G.fail, stars = 0;
  if (!G.fail && hit.length) msg = `The tree hit the ${{ house: 'house', fence: 'fence', shed: 'shed', garage: 'garage', greenhouse: 'greenhouse', wires: 'power line' }[hit[0].t]}.`;
  if (L.top) { stars = ok ? clamp(3 - G.misses, 1, 3) : 0; }
  else if (ok) {
    const tip = G.px + G.dir * (L.h + CUT) + G.dir * G.skid;
    if (G.target && (tip < G.target[0] || tip > G.target[1])) { ok = false; msg = 'It landed outside the drop zone.'; }
    else {
      const nd = G.d[G.notch];
      stars = 1 + (nd >= .22 && nd <= .42 ? 1 : 0) + (G.swings <= L.par ? 1 : 0);
    }
  }
  if (ok) {
    const pay = 40 * (G.i + 1) * stars;
    if ((save.stars[G.i] || 0) < stars) { save.cash += pay; save.stars[G.i] = stars; persist(); }
    sfx.ding();
    card(`<div class="stars">${'\u2605'.repeat(stars)}${'\u2606'.repeat(3 - stars)}</div><h2>Clean job</h2><p>${L.top ? `${L.top} sections down, ${G.misses} off target.` : `Notch ${Math.round(G.d[G.notch] * 100)}% of the trunk, ${G.swings} cuts.`} Paid $${pay}.</p>
      ${G.i + 1 < LEVELS.length ? `<button class="btn" id="next">Next job</button>` : `<p>That was the last job. You run the best tree crew in town.</p>`}<button class="btn alt" id="share">Share</button><button class="btn alt" id="again">Redo for more stars</button><button class="btn alt" id="menu">All jobs</button>`,
      `I got ${stars} of 3 stars on ${L.name} in Timber Job. Can you beat it?`);
  } else {
    card(`<h2>Job failed</h2><p>${msg}</p><button class="btn" id="again">Try again</button><button class="btn alt" id="menu">All jobs</button>`);
  }
}
async function share(text, btn) {
  const url = location.href.split(/[?#]/)[0];
  if (navigator.share) {
    try { await navigator.share({ title: 'Timber Job', text, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); btn.textContent = 'Link copied'; }
  catch (e) { btn.textContent = url; }
}
function card(html, shareText) {
  $('cardIn').innerHTML = html; $('card').hidden = false; $('tools').hidden = true; $('hud').hidden = true;
  const on = (id, f) => { const b = $(id); if (b) b.onclick = () => { audio(); f(); }; };
  on('next', () => brief(G.i + 1)); on('again', () => brief(G.i)); on('menu', menu);
  const sb = $('share'); if (sb) sb.onclick = () => share(shareText, sb);
}
function brief(i) {
  const L = LEVELS[i];
  G.state = 'menu'; G.lvl = L; buildBg();
  card(`<h2>Job ${i + 1}: ${L.name}</h2><p><b>${L.client}</b></p><p>${L.brief}</p><button class="btn" id="go">Start job</button><button class="btn alt" id="menu">All jobs</button>`);
  $('go').onclick = () => startJob(i);
}
function menu() {
  G.state = 'menu'; G.lvl = LEVELS[0]; buildBg();
  const open = save.stars.filter(Boolean).length;
  card(`<h1>Timber Job</h1><p>Twelve jobs, each harder than the last. Land every tree where it belongs.</p><div id="jobs">${LEVELS.map((l, i) => `<button class="job" data-i="${i}" ${i > open ? 'disabled' : ''}>${i + 1}<small>${'\u2605'.repeat(save.stars[i] || 0) || '&nbsp;'}</small></button>`).join('')}</div><button class="btn alt" id="share">Share this game</button>`, 'Timber Job: twelve tree jobs, and you have to miss the house.');
  document.querySelectorAll('.job').forEach(b => { b.onclick = () => { audio(); brief(+b.dataset.i); }; });
}

// ---------- input ----------
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  const f = fingerWorld(e);
  if (G.state === 'intro') { if (G.t > .4) { G.t = 99; } return; }
  if (G.state === 'top') { G.finger = f; G.lastX = f.x; return; }
  if (G.state === 'swing') { releasePiece(); return; }
  if (G.state !== 'chop') return;
  const side = f.x < 0 ? -1 : 1;
  if (G.tool === 'axe') { if (!G.axe) G.axe = { t: 0, side, hit: false }; }
  else if (G.tool === 'saw') { G.sawing = true; G.sawSide = side; G.finger = f; }
  else driveWedge();
});
cv.addEventListener('pointermove', e => { if (G.sawing || G.state === 'top') G.finger = fingerWorld(e); });
const up = () => { if (G.sawing) stopSaw(); G.finger = null; G.lastX = null; sawLoad(false, 0); };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
document.addEventListener('gesturestart', e => e.preventDefault());

// ---------- update ----------
function camTarget() {
  const L = G.lvl;
  const span = Math.max(L.h, ...(G.target || []).map(Math.abs), ...G.obs.map(o => Math.abs(o.x) + o.w / 2)) + 26;
  const wideS = Math.min(W / (2 * span), H / (L.h * 1.5));
  if (G.state === 'chop' || G.state === 'crack') {
    const s = W / (2 * L.r * 3.3);
    return { x: 0, y: -(H * .22) / s + CUT * .4, s };
  }
  if (G.state === 'top') { const s = W / (2 * L.r * 4); return { x: 0, y: G.cutY, s }; }
  return { x: 0, y: -(H * .3) / wideS, s: wideS };
}
function updateSaw(dt) {
  const L = G.lvl, s = G.sawSide;
  if (pinched(s)) { hint('Saw pinched! Switch to wedges'); sawLoad(true, 1); G.shake = Math.max(G.shake, 1.5); return; }
  const target = G.finger ? clamp((L.r - s * G.finger.x) / (2 * L.r), 0, .96) : 0;
  const want = Math.max(target - G.d[s], 0), rate = want > .01 ? clamp(want * 2.4, .1, .46) : .1, before = G.d[s];
  const back = G.notch && s !== G.notch;
  addDepth(s, rate * dt);
  if (G.state !== 'chop') return;
  if (s === G.notch) { if (G.d[s] - (G.sawDrawn || 0) > .02 || G.d[s] < (G.sawDrawn || 0)) { carveNotch(s, G.d[s]); G.sawDrawn = G.d[s]; } }
  else carveKerf(s, G.d[s]);
  if (Math.random() < .9) chip(s * (L.r - before * 2 * L.r), CUT, s, 2);
  G.shake = Math.max(G.shake, 1.4); G.swingT = (G.swingT || 0) + dt;
  if (G.swingT > .22) { G.swings++; G.swingT = 0; buzz(6); }
  sawLoad(true, clamp(rate * 2.2, 0, 1));
  if (L.tension && back) { G.tension += rate * rate * 13 * dt; if (G.tension >= 1) barberChair(); }
}
function detachPiece() {
  const L = G.lvl, y0 = G.topY, y1 = G.cutY;
  const ay = -L.h - 60;
  G.piece = { y0, y1, crown: G.sec === 0, th: 0, t: 0, ax: 0, ay, len0: y1 - ay, len1: -ay - 92, len: y1 - ay, falling: false, x: 0, y: y1, vy: 0 };
  G.topY = y1; G.cutY = y1 + G.secH; G.sec++; G.state = 'swing'; G.t = 0;
  sfx.crack(); stopSaw(); sawLoad(false, 0); hint('Tap to drop it over the zone');
}
function releasePiece() {
  const p = G.piece; if (!p || p.falling) return;
  p.falling = true; p.vy = 40; G.state = 'drop'; hint('');
}
function landPiece() {
  const p = G.piece, L = G.lvl;
  G.logs.push({ x: p.x, h: p.y1 - p.y0, y0: p.y0, rot: rnd(-.1, .1) + Math.PI / 2 });
  G.shake = 10; sfx.boom(); dust(p.x, -2, 18); buzz(40);
  if (p.crown) leaves(p.x, -12, 50);
  for (const o of G.obs) if (Math.abs(p.x - o.x) < o.w / 2 + 6) smash(o);
  const inZone = p.x >= G.target[0] && p.x <= G.target[1];
  if (!inZone && !G.obs.some(o => o.hit)) { G.misses++; pop('Off target', '#d9482f'); } else if (inZone) pop('On target', '#f2b441');
  G.piece = null;
  if (G.obs.some(o => o.hit)) { G.state = 'landed'; G.t = 0; return; }
  if (G.sec >= L.top) { G.state = 'landed'; G.t = 0; pop('Tree down', '#fff6e6', true); return; }
  G.state = 'top'; G.cutProg = 0; hint('Drag across the trunk to cut');
}
function smash(o) {
  if (o.hit) return;
  o.hit = true; G.shake = 16; sfx.smash(); buzz(90);
  for (let i = 0; i < 30 && G.p.length < 420; i++) G.p.push({ k: 'chip', x: o.x + rnd(-o.w / 2, o.w / 2), y: -rnd(o.hgt), vx: rnd(-170, 170), vy: rnd(-280, -30), r: rnd(6), vr: rnd(-12, 12), s: rnd(2, 5), c: ['#b5533c', '#e8dcc4', '#6b4a30'][i % 3], life: 4 });
  dust(o.x, -6, 16, 'rgba(160,150,140,.6)', 18);
  pop('Damage!', '#d9482f');
}
function update(dt) {
  G.time += dt; G.t += dt;
  stepParticles(dt);
  G.shake *= Math.pow(.0015, dt);
  const T = camTarget(), k = 1 - Math.pow(.02, dt);
  G.cam.x = lerp(G.cam.x, T.x, k); G.cam.y = lerp(G.cam.y, T.y, k); G.cam.s = lerp(G.cam.s, T.s, k);
  const L = G.lvl;
  if (G.state === 'intro' && G.t > 2.2) { G.state = L.top ? 'top' : 'chop'; G.t = 0; chopHint(); }
  if (G.state === 'chop') {
    if (G.axe) {
      G.axe.t += dt;
      if (!G.axe.hit && G.axe.t >= .085) { G.axe.hit = true; strike(G.axe.side); }
      if (G.axe && G.axe.t >= .2) G.axe = null;
    }
    G.tension = Math.max(0, G.tension - .3 * dt);
    if (G.sawing) updateSaw(dt);
  } else if (G.state === 'top') {
    if (G.finger && G.lastX !== null) {
      const dx = Math.abs(G.finger.x - G.lastX); G.lastX = G.finger.x;
      if (dx > 0) { G.cutProg += dx / (2 * L.r * 3.2); chip(G.finger.x, G.cutY, G.finger.x < 0 ? -1 : 1, 2); sawLoad(true, .7); G.shake = Math.max(G.shake, 1.2); }
      if (G.cutProg >= 1) detachPiece();
    } else sawLoad(false, 0);
  } else if (G.state === 'swing') {
    const p = G.piece, w = 1.7 + G.sec * .14, e = clamp(p.t / .8, 0, 1);
    p.t += dt; p.len = lerp(p.len0, p.len1, e * e * (3 - 2 * e));
    p.th = e * (115 / p.len1) * (Math.sin(p.t * w) + (L.wind ? wind() * L.wind * .3 : 0));
    p.x = p.ax + Math.sin(p.th) * p.len; p.y = p.ay + Math.cos(p.th) * p.len;
  } else if (G.state === 'drop') {
    const p = G.piece; p.vy += 520 * dt; p.y += p.vy * dt;
    if (p.y >= -8) landPiece();
  } else if (G.state === 'crack') {
    G.a += G.dir * .05 * dt; G.shake = Math.max(G.shake, 2.5);
    if (Math.random() < .3) chip(G.px, CUT, -G.dir, 3);
    if (G.t > .55) { G.state = 'fall'; G.t = 0; G.av = G.dir * .18; }
  } else if (G.state === 'fall') {
    G.av += G.dir * (.75 + 3.4 * Math.abs(Math.sin(G.a))) * dt;
    G.a += G.av * dt;
    const len = L.h + CUT, tipY = CUT - Math.cos(G.a) * len;
    for (const o of G.obs) {
      if (o.hit) continue;
      const tan = Math.tan(Math.abs(G.a)), dx = (o.x - G.px) * G.dir, reach = Math.sin(Math.abs(G.a)) * len;
      const near = dx - o.w / 2, far = dx + o.w / 2;
      if (far < 0 || near > reach + 8) continue;
      const hx = clamp(reach, Math.max(near, 0), far);
      if (CUT - hx / Math.max(tan, .01) > -o.hgt) smash(o);
    }
    if (Math.abs(G.a) > .25 && Math.random() < .3) leaves(G.px + Math.sin(G.a) * len, tipY, 2);
    if (tipY >= -9) {
      G.state = 'landed'; G.t = 0; G.av = 0; G.shake = 22; G.stop = .09; sfx.boom(); buzz(120);
      for (let i = 0; i < 26; i++) dust(G.px + G.dir * len * i / 25, -2, 2, undefined, 16);
      leaves(G.px + G.dir * len, -10, 60); G.aRest = G.a;
    }
  } else if (G.state === 'landed') {
    if (G.aRest !== undefined && !L.top) {
      G.a = G.aRest - G.dir * Math.abs(Math.sin(G.t * 9)) * .05 * Math.exp(-G.t * 5);
      G.skidT = clamp(G.t / .35, 0, 1);
    }
    if (G.t > 1.6) finish();
  }
  if (G.state === 'chop' && L.tools.includes('wedge') && G.tool === 'wedge' && !G.leanRem) { G.tool = L.tools[1]; setTools(); }
}

// ---------- draw ----------
function drawBuilding(o) {
  const x = o.x - o.w / 2, w = o.w, h = o.hgt, c = ctx;
  c.save();
  if (o.hit) { c.translate(o.x, 0); c.rotate(.06); c.translate(-o.x, 8); }
  if (o.t === 'fence') {
    c.fillStyle = '#e8dcc4';
    for (let i = 0; i < 7; i++) { c.fillRect(x + i * w / 7, -h + (o.hit && i % 2 ? 14 : 0), w / 7 - 3, h); }
    c.fillRect(x, -h * .7, w, 4); c.fillRect(x, -h * .3, w, 4);
  } else if (o.t === 'wires') {
    c.fillStyle = '#4a3524'; c.fillRect(o.x - 3, -h - 12, 6, h + 12); c.fillRect(o.x - 18, -h - 8, 36, 4);
    c.strokeStyle = o.hit ? '#f2b441' : '#20262a'; c.lineWidth = 1.2;
    for (const dx of [-14, 14]) { c.beginPath(); c.moveTo(o.x + dx, -h - 8); c.quadraticCurveTo(o.x + dx + 140, -h + 18, o.x + dx + 400, -h - 8); c.moveTo(o.x + dx, -h - 8); c.quadraticCurveTo(o.x + dx - 140, -h + 18, o.x + dx - 400, -h - 8); c.stroke(); }
  } else if (o.t === 'greenhouse') {
    c.fillStyle = 'rgba(190,235,225,.55)'; c.fillRect(x, -h * .62, w, h * .62);
    c.beginPath(); c.moveTo(x, -h * .62); c.lineTo(o.x, -h); c.lineTo(x + w, -h * .62); c.closePath(); c.fill();
    c.strokeStyle = '#e8f4ee'; c.lineWidth = 2; c.strokeRect(x, -h * .62, w, h * .62);
    for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + i * w / 5, 0); c.lineTo(x + i * w / 5, -h * .62); c.stroke(); }
  } else {
    const wall = o.t === 'house' ? '#e8d6b4' : o.t === 'garage' ? '#c9c2b2' : '#a8703f', roof = o.t === 'shed' ? '#5a3d28' : '#b5533c';
    const wh = h * .6;
    c.fillStyle = wall; c.fillRect(x, -wh, w, wh);
    c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x + w * .55, -wh, w * .45, wh);
    c.fillStyle = roof; c.beginPath(); c.moveTo(x - 8, -wh); c.lineTo(o.hit ? o.x + 12 : o.x, o.hit ? -wh - 8 : -h); c.lineTo(x + w + 8, -wh); c.closePath(); c.fill();
    c.fillStyle = o.t === 'garage' ? '#8d8676' : '#6b4a30'; c.fillRect(o.x - w * .13, -wh * .62, w * .26, wh * .62);
    if (o.t === 'house') { c.fillStyle = '#ffe9a8'; c.fillRect(x + w * .1, -wh * .75, w * .2, wh * .36); c.fillRect(x + w * .7, -wh * .75, w * .2, wh * .36); }
  }
  c.restore();
}
function drawTrunkPart(y0, y1, dx = 0, dy = 0) {
  const L = G.lvl, r = L.r, sy = (L.h + y0) * PX, sh = (y1 - y0) * PX;
  if (sh <= 0) return;
  ctx.drawImage(G.trunk, 0, sy, G.trunk.width, sh, -r - 4 + dx, y0 + dy, 2 * r + 8, y1 - y0);
}
function drawCrown() { const c = G.crown; ctx.drawImage(c.c, c.x, c.y, c.w, c.h); }
function drawTree() {
  const L = G.lvl;
  if (L.top) {
    drawTrunkPart(G.topY, 0);
    if (G.sec === 0) drawCrown();
    if (G.state === 'top') {
      ctx.strokeStyle = '#f2b441'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-L.r - 6, G.cutY); ctx.lineTo(L.r + 6, G.cutY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f1d7a4'; ctx.fillRect(-L.r, G.cutY - 1, 2 * L.r * clamp(G.cutProg, 0, 1), 2);
    }
    return;
  }
  drawTrunkPart(CUT, 0);
  const fallen = G.state === 'fall' || G.state === 'landed';
  if (fallen) { ctx.fillStyle = '#e9c58f'; ctx.beginPath(); ctx.ellipse(0, CUT, L.r, 3, 0, 0, 7); ctx.fill(); }
  const sway = (G.state === 'chop' && L.wind ? wind() * L.wind * .012 : 0) + (G.state === 'chop' ? Math.sin(G.time * 1.3) * .002 : 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(-3000, -3000, 6000, 3002); ctx.clip();
  ctx.translate(G.px + (G.dir * G.skid * G.skidT), CUT); ctx.rotate(G.a + sway); ctx.translate(-G.px, -CUT);
  drawTrunkPart(-L.h, CUT);
  drawCrown();
  if (G.split) { ctx.strokeStyle = '#1a0f08'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, CUT); ctx.lineTo(3, CUT - 40); ctx.lineTo(-2, CUT - 90); ctx.lineTo(2, CUT - 130); ctx.stroke(); }
  ctx.restore();
}
function drawPiece(p) {
  const L = G.lvl;
  if (!p.falling) { ctx.strokeStyle = '#e8dcc4'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(p.ax, p.ay); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  ctx.save();
  ctx.beginPath(); ctx.rect(-3000, -3000, 6000, 3002); ctx.clip();
  ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 2 + (p.falling ? 0 : -p.th * .4));
  ctx.translate(0, -(p.y0 + p.y1) / 2);
  drawTrunkPart(p.y0, p.y1);
  if (p.crown) drawCrown();
  ctx.restore();
}
function drawAxe() {
  const L = G.lvl, a = G.axe, side = a ? a.side : 1;
  const t = a ? a.t : .2, e = t < .085 ? t / .085 : 1 - (t - .085) / .115;
  const lift = (1 - clamp(e, 0, 1)) * 1.25, inset = G.d[side] * 2 * L.r;
  ctx.save();
  ctx.translate(side * (L.r + 44 - inset), CUT + 12); ctx.scale(-side, 1); ctx.rotate(-lift);
  ctx.fillStyle = '#8a5a36'; ctx.fillRect(-4, -2, 46, 4);
  ctx.fillStyle = '#c9d3d6'; ctx.beginPath(); ctx.moveTo(34, -8); ctx.lineTo(46, -13); ctx.lineTo(50, 0); ctx.lineTo(46, 13); ctx.lineTo(34, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eef4f5'; ctx.fillRect(46, -12, 2, 24);
  ctx.restore();
}
function drawSaw() {
  const L = G.lvl, s = G.sawSide, tipX = s * (L.r - G.d[s] * 2 * L.r);
  ctx.save();
  ctx.translate(tipX + rnd(-.5, .5), CUT + rnd(-.5, .5)); ctx.scale(-s, 1);
  ctx.fillStyle = '#c9d3d6'; ctx.fillRect(-46, -2.4, 46, 4.8);
  ctx.fillStyle = '#20262a'; for (let i = 0; i < 12; i++) ctx.fillRect(-46 + ((i * 4 + G.time * 220) % 46), -3.4, 2, 1);
  ctx.fillStyle = '#e8772e'; ctx.fillRect(-72, -9, 28, 18);
  ctx.fillStyle = '#20262a'; ctx.fillRect(-76, -6, 8, 12);
  ctx.restore();
}
function drawGauge() {
  const L = G.lvl, y = H - 104, w = Math.min(W - 60, 260), x = (W - w) / 2, c = ctx;
  if (L.top || (G.state !== 'chop' && G.state !== 'crack')) return;
  c.fillStyle = 'rgba(16,30,26,.78)'; c.beginPath(); c.roundRect ? c.roundRect(x - 8, y - 22, w + 16, 46, 10) : c.rect(x - 8, y - 22, w + 16, 46); c.fill();
  c.fillStyle = '#e9c58f'; c.fillRect(x, y, w, 12);
  c.fillStyle = '#4a2f1f';
  c.fillRect(x, y, w * G.d[-1], 12); c.fillRect(x + w - w * G.d[1], y, w * G.d[1], 12);
  const ns = G.notch || L.fell || 0;
  if (ns) { c.fillStyle = 'rgba(242,180,65,.75)'; const a = .25 * w, b = .4 * w; c.fillRect(ns < 0 ? x + a : x + w - b, y - 4, b - a, 3); }
  c.fillStyle = '#fff6e6'; c.font = '800 12px Nunito, system-ui'; c.textAlign = 'center';
  c.fillText('Hinge', W / 2, y - 8);
  if (L.tension) {
    c.fillStyle = '#2a3b36'; c.fillRect(x, y + 16, w, 5);
    c.fillStyle = G.tension > .7 ? '#d9482f' : '#f2b441'; c.fillRect(x, y + 16, w * clamp(G.tension, 0, 1), 5);
  }
}
function drawWind() {
  const L = G.lvl; if (!L.wind || G.state === 'menu') return;
  const w = wind() * L.wind, cx = W / 2, y = 84, c = ctx, len = w * 60;
  c.strokeStyle = Math.abs(w) > .6 ? '#d9482f' : '#fff6e6'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(cx, y); c.lineTo(cx + len, y);
  c.moveTo(cx + len, y); c.lineTo(cx + len - Math.sign(len) * 8, y - 6); c.moveTo(cx + len, y); c.lineTo(cx + len - Math.sign(len) * 8, y + 6); c.stroke();
  c.fillStyle = '#fff6e6'; c.font = '800 12px Nunito, system-ui'; c.textAlign = 'center'; c.fillText('Wind', cx, y + 22);
}
function draw() {
  const c = ctx, s = G.cam.s;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (bg) c.drawImage(bg, -40 - G.cam.x * .04, 0, W + 80, H);
  if (G.state === 'menu' || !G.trunk) { if (vign) c.drawImage(vign, 0, 0, W, H); return; }
  const sh = G.shake;
  c.setTransform(DPR * s, 0, 0, DPR * s, DPR * (W / 2 - G.cam.x * s + rnd(-sh, sh)), DPR * (H / 2 - G.cam.y * s + rnd(-sh, sh)));
  const gg = c.createLinearGradient(0, 0, 0, 200); gg.addColorStop(0, '#4f8a3f'); gg.addColorStop(1, '#1f4a2c');
  c.fillStyle = gg; c.fillRect(-1600, 0, 3200, 1400);
  if (G.target) {
    const [a, b] = G.target;
    c.fillStyle = 'rgba(242,180,65,.4)'; c.fillRect(a, -3, b - a, 8);
    c.fillStyle = '#f2b441';
    for (const x of [a, b]) { c.fillRect(x - 1, -30, 2, 30); c.beginPath(); c.moveTo(x, -30); c.lineTo(x + 12, -25); c.lineTo(x, -20); c.fill(); }
  }
  G.obs.forEach(drawBuilding);
  for (const l of G.logs) { c.save(); c.translate(l.x, -G.lvl.r * .6); c.rotate(l.rot); c.translate(0, -(l.y0 + l.y0 + l.h) / 2); drawTrunkPart(l.y0, l.y0 + l.h); c.restore(); }
  drawTree();
  if (G.piece) drawPiece(G.piece);
  for (const p of G.p) {
    c.globalAlpha = clamp(p.life, 0, 1);
    if (p.k === 'dust') { c.globalAlpha = clamp(p.life, 0, 1) * .55; c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.s * (1 + p.t), 0, 7); c.fill(); continue; }
    c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c;
    if (p.k === 'chunk') { c.beginPath(); c.moveTo(-p.s, -p.s * .6); c.lineTo(p.s, -p.s * .25); c.lineTo(p.s * .5, p.s * .6); c.lineTo(-p.s * .8, p.s * .4); c.closePath(); c.fill(); c.fillStyle = p.b; c.fillRect(-p.s, -p.s * .6, p.s * .45, p.s); }
    else c.fillRect(-p.s, -p.s * .5, p.s * 2, p.s);
    c.restore();
  }
  c.globalAlpha = 1;
  if (G.state === 'chop') { if (G.tool === 'axe') drawAxe(); else if (G.sawing) drawSaw(); }
  for (const t of G.tufts) { c.fillStyle = t.c; c.beginPath(); c.moveTo(t.x - 2, 2); c.lineTo(t.x, -t.h); c.lineTo(t.x + 2, 2); c.fill(); }
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.drawImage(vign, 0, 0, W, H);
  drawGauge(); drawWind();
  c.textAlign = 'center';
  for (const q of G.pops) {
    const k = q.t / 1.5; c.globalAlpha = 1 - k * k;
    c.font = `400 ${q.big ? 58 : 26}px "Lilita One", "Arial Black", sans-serif`;
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillText(q.text, W / 2 + 2, H * .3 - k * 30 + 3);
    c.fillStyle = q.col; c.fillText(q.text, W / 2, H * .3 - k * 30);
  }
  c.globalAlpha = 1;
}

// ---------- boot ----------
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2.5);
  cv.width = W * DPR; cv.height = H * DPR; buildBg();
}
addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  let dt = Math.min((now - last) / 1000, .05); last = now;
  if (G.stop > 0) { G.stop -= dt; dt *= .05; }
  if (G.state !== 'menu') update(dt);
  draw();
  requestAnimationFrame(frame);
}
resize(); menu(); requestAnimationFrame(frame);
if (location.hostname === 'localhost') {
  window.__G = G; window.__start = startJob;
  window.__step = sec => { for (let i = 0; i < sec * 60; i++) if (G.state !== 'menu') update(1 / 60); draw(); };
}
})();
