/* ===================== FIÈVRE 21 — INTERFACE v2 ===================== */
(function () {
'use strict';
const F = window.F21;
const $ = s => document.querySelector(s);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Stockage ---------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem('f21.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('f21.' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  del(k) { try { localStorage.removeItem('f21.' + k); } catch (e) { /* rien */ } },
};
const prog = Object.assign({ maxAnte: 0, wins: 0, stakeMax: 0, bestHand: 0, seen: {}, runs: 0 }, Store.get('prog', {}));
const saveProg = () => Store.set('prog', prog);
const opts = Object.assign({ speed: 1, sound: true, fps: false }, Store.get('opts', {}));
const saveOpts = () => Store.set('opts', opts);

/* ---------- Formatage ---------- */
const fmt = n => { n = Math.floor(n); if (Math.abs(n) >= 1e9) return n.toExponential(2).replace('.', ',').replace('e+', 'e'); return n.toLocaleString('fr-FR').replace(/ | /g, ' '); };
const fmtM = n => { const r = Math.round(n * 100) / 100; return Number.isInteger(r) ? fmt(r) : r.toLocaleString('fr-FR', { maximumFractionDigits: 2 }); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- Sprites pixel ---------- */
function sprite(rows, cls, color) {
  const h = rows.length, w = rows[0].length; let d = '';
  rows.forEach((r, y) => { let x = 0; while (x < w) { if (r[x] === '#') { const s = x; while (x < w && r[x] === '#') x++; d += `M${s} ${y}h${x - s}v1h-${x - s}z`; } else x++; } });
  return `<svg class="${cls || ''}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true"${color ? ` style="color:${color}"` : ''}><path d="${d}" fill="currentColor"/></svg>`;
}
const SP = {
  H: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  D: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  S: ['...#...', '..###..', '.#####.', '#######', '#######', '...#...', '..###..'],
  C: ['..###..', '..###..', '##.#.##', '#######', '##.#.##', '...#...', '..###..'],
  R: ['#..#..#', '##.#.##', '#######', '#######', '#.#.#.#', '#######'],
  Q: ['.#.#.#.', '#######', '.#####.', '.#.#.#.', '.#####.', '#######'],
  J: ['...##..', '..####.', '.##.#..', '.####..', '..##...', '.####..'],
  star: ['...##...', '...##...', '########', '.######.', '..####..', '.##..##.', '##....##', '........'],
  gem: ['.######.', '##.##.##', '########', '.######.', '..####..', '...##...', '........', '........'],
  ghost: ['..####..', '.######.', '##.##.##', '########', '########', '########', '#.#..#.#', '........'],
  moon: ['..####..', '.###....', '###.....', '###.....', '###.....', '.###....', '..####..', '........'],
  charm: ['.##..##.', '########', '########', '.######.', '..####..', '...##...', '...##...', '..####..'],
  cards: ['.####...', '.#..####', '.#..#..#', '.#..#..#', '.####..#', '....#..#', '....####', '........'],
};
const CHARM_ART = {
  pilepoil: ['#3ef08a', ['..####..', '.#....#.', '#..##..#', '#.#..#.#', '#.#..#.#', '#..##..#', '.#....#.', '..####..']],
  charlie: ['#5fd0ff', ['.####...', '.#..####', '.#..#..#', '.#..#..#', '.####..#', '....#..#', '....####', '........']],
  cassecou: ['#f6efff', ['..####..', '.######.', '##.##.##', '##.##.##', '.######.', '..#..#..', '..####..', '........']],
  prudence: ['#33c4ff', ['########', '#......#', '#..##..#', '#.####.#', '#..##..#', '.#....#.', '..#..#..', '...##...']],
  maudit: ['#ff3b6b', ['#......#', '##....##', '.######.', '##.##.##', '########', '#.####.#', '.#....#.', '..####..']],
  lynx: ['#ffd23f', ['........', '..####..', '.##..##.', '##.##.##', '##.##.##', '.##..##.', '..####..', '........']],
  boule: ['#b56cff', ['..####..', '.#..###.', '#..#####', '#.######', '.######.', '..####..', '.######.', '########']],
  chasseur: ['#ffd23f', ['...##...', '..####..', '.##..##.', '.##..##.', '.######.', '##....##', '##....##', '........']],
  sang: ['#ff3b6b', ['...#....', '...##...', '..####..', '.######.', '.##.###.', '.#.####.', '..####..', '........']],
  encre: ['#8f9bff', ['..####..', '...##...', '.######.', '#......#', '#.####.#', '#.####.#', '#......#', '.######.']],
  cour: ['#ffd23f', ['........', '#..##..#', '##.##.##', '########', '########', '#.#..#.#', '########', '........']],
  septieme: ['#5fd0ff', ['########', '########', '.....##.', '....##..', '...##...', '..##....', '..##....', '........']],
  calibre: ['#ff9f1a', ['...##...', '..####..', '..####..', '..####..', '.######.', '.#....#.', '.######.', '.######.']],
  elan: ['#ffd23f', ['....###.', '...###..', '..###...', '.######.', '...###..', '..###...', '.###....', '.#......']],
  tirelire: ['#ff8fc8', ['........', '..####.#', '.######.', '########', '#######.', '.######.', '.#.##.#.', '........']],
  poignee: ['#f2c49b', ['........', '##....##', '###..###', '.######.', '..####..', '.######.', '##....##', '........']],
  filet: ['#46f08c', ['#..#..#.', '.##.##.#', '.##.##.#', '#..#..#.', '.##.##.#', '.##.##.#', '#..#..#.', '........']],
  quitte: ['#ff3b6b', ['######..', '#....#..', '#.##.###', '#.##.#.#', '#....#.#', '######.#', '...#..##', '...#####']],
  mainpleine: ['#3ef08a', ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...']],
  ferrailleur: ['#a596c9', ['.###....', '#..##...', '#...##..', '.#..##..', '....##..', '.....##.', '......##', '.......#']],
  dividende: ['#ffd23f', ['...#....', '.#####..', '##.#....', '.####...', '...#.##.', '.#####..', '...#....', '........']],
  capitaliste: ['#3ef08a', ['..#..#..', '...##...', '..####..', '.######.', '###..###', '##.##.##', '.######.', '..####..']],
  artisan: ['#ff9f1a', ['.######.', '.######.', '.##.....', '...##...', '...##...', '...##...', '...##...', '...##...']],
  minimaliste: ['#f6efff', ['........', '........', '..####..', '..#..#..', '..#..#..', '..####..', '........', '........']],
  tetebrulee: ['#ff6a1a', ['...#....', '...##...', '..###.#.', '.#####..', '.##.###.', '##..####', '###.####', '.######.']],
  contre: ['#5fd0ff', ['.......#', '......##', '.....##.', '#...##..', '##.##...', '.###....', '..##....', '.#..#...']],
  banane: ['#ffd23f', ['......#.', '.....##.', '.....##.', '....###.', '...###..', '.####...', '###.....', '........']],
  bananebleue: ['#33c4ff', ['......#.', '.....##.', '.....##.', '....###.', '...###..', '.####...', '###.....', '........']],
  dragon: ['#ffd23f', ['#......#', '##.##.##', '.######.', '##.##.##', '########', '.#.##.#.', '..####..', '.##..##.']],
  phenix: ['#ff6a1a', ['#..##..#', '##.##.##', '.######.', '..####..', '.######.', '##.##.##', '#..##..#', '...##...']],
  sphinx: ['#ffd23f', ['..####..', '.######.', '##.##.##', '########', '.#.##.#.', '########', '########', '##....##']],
  chimere: ['#ff5ad9', ['##....##', '.##..##.', '..####..', '.##..##.', '########', '#.####.#', '..#..#..', '.##..##.']],
  kraken: ['#5ff0ff', ['..####..', '.######.', '##.##.##', '########', '#.#..#.#', '#.#..#.#', '.#.##.#.', '#..##..#']],
};
const PAL = ['#ff3b6b', '#33c4ff', '#ffd23f', '#3ef08a', '#b56cff', '#ff9f1a', '#5ff0ff', '#ff8fc8', '#f6efff', '#8f9bff', '#46f08c', '#ffb36b'];
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function procSprite(id) {
  let h = hash(id) || 1;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const rows = [];
  for (let y = 0; y < 8; y++) {
    let l = '';
    for (let x = 0; x < 4; x++) { const p = (y === 0 || y === 7) ? 0.32 : x === 3 ? 0.78 : x === 0 ? 0.38 : 0.55; l += rnd() < p ? '#' : '.'; }
    rows.push(l + l.split('').reverse().join(''));
  }
  return rows;
}
function charmArt(id) {
  if (CHARM_ART[id]) return CHARM_ART[id];
  const d = F.CHARMS[id];
  return [d && d.rarity === 'l' ? '#ffd23f' : PAL[hash(id) % PAL.length], procSprite(id)];
}
const charmIcon = id => { const a = charmArt(id); return sprite(a[1], 'ico', a[0]); };
function consIcon(c) {
  if (c.kind === 'etoile') return sprite(SP.star, 'ico');
  if (c.kind === 'spectre') return sprite(c.id === 'ame' ? SP.charm : c.id === 'trounoir' ? SP.moon : SP.ghost, 'ico');
  return sprite(procSprite('a' + c.id), 'ico');
}
const tagIcon = id => sprite(procSprite('t' + id), 'ico');
const RAR = { c: 'Commun', u: 'Peu commun', r: 'Rare', l: 'Légendaire' };
const PACK_COL = { arcane: ['#5b2aa8', '#8a4be6', SP.moon], etoile: ['#9c7400', '#e9a800', SP.star], cartes: ['#0a6b99', '#1f8fe0', SP.cards], charme: ['#99133a', '#e2234b', SP.charm], spectre: ['#0b5c66', '#17a9b8', SP.ghost] };
const packArt = (type, cls) => { const p = PACK_COL[type]; return `<div class="packart ${cls || ''}" style="--pa:${p[0]};--pb:${p[1]}">${sprite(p[2])}</div>`; };
const KIND_NAME = { arcane: 'Arcane', etoile: 'Étoile', spectre: 'Spectre' };

function cardHTML(c, extra) {
  const red = c.suit === 'H' || c.suit === 'D';
  const lab = F.RANKS[c.rank];
  const suitSvg = sprite(SP[c.suit]);
  const center = c.rank >= 11 ? sprite(SP[{ 11: 'J', 12: 'Q', 13: 'R' }[c.rank]], 'fig') + sprite(SP[c.suit], 'mini') : sprite(SP[c.suit]);
  const cls = ['card', red ? 'red' : '', c.rank === 1 ? 'ace' : '', c.rank >= 11 ? 'face' : '', c.enh ? 'e-' + c.enh : '', c.ed ? 'ed-' + c.ed : '', extra || ''].join(' ');
  const tag = c.enh ? `<span class="etag">${F.ENH[c.enh].tag}</span>` : '';
  const seal = c.seal ? `<span class="seal s-${c.seal}"></span>` : '';
  const bonus = c.bonus ? ` title="+${c.bonus} Jetons"` : '';
  return `<div class="${cls}" data-id="${c.id}"${bonus}><div class="cface"><span class="ci tl">${lab}${suitSvg}</span><span class="cc">${center}</span><span class="ci br">${lab}${suitSvg}</span>${tag}${seal}</div><div class="cback"></div></div>`;
}
function cardEl(c) { const t = document.createElement('div'); t.innerHTML = cardHTML(c); return t.firstChild; }
function cardName(c) { return `${F.RANKS[c.rank]} de ${{ H: 'Cœur', D: 'Carreau', S: 'Pique', C: 'Trèfle' }[c.suit]}`; }
function cardDesc(c) {
  const p = [];
  if (c.enh) p.push(`<b>${F.ENH[c.enh].name}</b> : ${F.ENH[c.enh].desc}`);
  if (c.ed) p.push(`<b>${F.EDITIONS[c.ed].name}</b> : ${F.EDITIONS[c.ed].desc}`);
  if (c.seal) p.push(`<b>${F.SEALS[c.seal].name}</b> : ${F.SEALS[c.seal].desc}`);
  if (c.bonus) p.push(`<b>Bonus permanent</b> : +${c.bonus} Jetons`);
  return p.join('<br>');
}

/* ---------- Son ---------- */
const Snd = {
  ctx: null,
  get on() { return opts.sound; },
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(f, dur, type, vol, slide, delay) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(vol || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol, hp) {
    if (!this.on || !this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 1500; s.buffer = b; g.gain.value = vol || .08;
    s.connect(f); f.connect(g); g.connect(this.ctx.destination); s.start();
  },
  deal() { this.noise(.06, .09, 2500); this.tone(900, .03, 'square', .02); },
  click() { this.tone(520, .04, 'square', .03); },
  flip() { this.noise(.05, .07, 1800); this.tone(600, .05, 'triangle', .04, 1.5); },
  chip(i) { const f = 262 * Math.pow(2, Math.min(i, 30) / 12); this.tone(f, .09, 'square', .045); this.tone(f * 2, .06, 'triangle', .02); },
  xmult(i) { const f = 262 * Math.pow(2, Math.min(i, 30) / 12); this.tone(f, .2, 'sawtooth', .055, 1.6); this.tone(f * 1.5, .15, 'square', .03, 1, .05); },
  coin() { this.tone(988, .06, 'square', .04); this.tone(1319, .12, 'square', .04, 1, .06); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .14, 'square', .045, 1, i * .08)); },
  big() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .18, 'square', .05, 1, i * .06)); this.noise(.3, .05, 800); },
  lose() { this.tone(330, .25, 'triangle', .06, .5); },
  bust() { this.tone(220, .45, 'sawtooth', .07, .25); this.noise(.25, .1, 300); },
  boss() { [196, 185, 175, 147].forEach((f, i) => this.tone(f, .22, 'sawtooth', .05, 1, i * .16)); },
  glass() { this.noise(.35, .12, 4000); [2093, 2637, 3136].forEach((f, i) => this.tone(f, .08, 'triangle', .03, 1, i * .04)); },
  pack() { this.noise(.4, .08, 600); [330, 440, 554, 659, 880].forEach((f, i) => this.tone(f, .1, 'triangle', .04, 1, .3 + i * .05)); },
  magic() { [880, 1175, 1568].forEach((f, i) => this.tone(f, .12, 'triangle', .04, 1.2, i * .06)); },
};

/* ---------- Fond animé ---------- */
const BG = {
  modes: {
    normal: [[20, 6, 52], [62, 22, 140], [36, 70, 190], [150, 60, 230], [255, 90, 217]],
    boss: [[30, 2, 8], [110, 8, 30], [190, 20, 45], [255, 70, 60], [255, 180, 60]],
    bust: [[40, 0, 0], [140, 0, 20], [230, 20, 40], [255, 90, 90], [255, 220, 120]],
    shop: [[2, 22, 14], [8, 70, 50], [20, 140, 90], [60, 220, 140], [200, 255, 120]],
    win: [[30, 20, 2], [110, 70, 10], [200, 140, 20], [255, 210, 63], [255, 255, 200]],
    pack: [[10, 4, 30], [40, 10, 90], [90, 30, 160], [200, 80, 255], [120, 240, 255]],
  },
  cur: null, target: 'normal', t: 0, last: 0,
  init() {
    this.cv = $('#bg'); this.cx = this.cv.getContext('2d', { alpha: false });
    const w = this.w = this.cv.width, h = this.h = this.cv.height, n = w * h;
    this.img = this.cx.createImageData(w, h); this.px = new Uint32Array(this.img.data.buffer);
    // géométrie fixe précalculée une fois : rayon, angle, dither, vignette
    this.A3 = new Float32Array(n); this.R16 = new Float32Array(n); this.R09 = new Float32Array(n); this.A2 = new Float32Array(n);
    this.XY = new Float32Array(n); this.DI = new Float32Array(n); this.FD = new Float32Array(n);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], cx = w / 2, cy = h * .45;
    for (let y = 0, o = 0; y < h; y++) for (let x = 0; x < w; x++, o++) {
      const dx = x - cx, dy = (y - cy) * .8, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      this.A3[o] = a * 3 + r * .16; this.R09[o] = r * .09; this.A2[o] = a * 2; this.XY[o] = (x + y) * .05;
      this.DI[o] = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5) * .9 + 2.15 / 4.3 * 4;
      this.FD[o] = Math.max(.35, 1 - r / (w * 1.1));
    }
    // table de sinus (4096 pas) pour éviter Math.sin par pixel
    const S = 4096; this.SIN = new Float32Array(S); for (let k = 0; k < S; k++) this.SIN[k] = Math.sin(k / S * Math.PI * 2);
    this.sk = S / (Math.PI * 2);
    // vignette quantifiée en 16 niveaux × 5 couleurs, recalculée seulement quand la palette bouge
    this.FQ = new Uint8Array(n); for (let o = 0; o < n; o++) this.FQ[o] = Math.round((this.FD[o] - .35) / .65 * 15);
    this.LUT = new Uint32Array(80);
    this.cur = this.modes.normal.map(c => c.slice()); this.buildLut();
    const loop = now => {
      requestAnimationFrame(loop);
      const dt = this.last ? Math.min(50, now - this.last) : 16; this.last = now;
      this.t += RM ? dt / 12000 : dt / 1000;
      this.draw();
    };
    requestAnimationFrame(loop);
  },
  set(m) { this.target = m; },
  buildLut() {
    const P = this.cur, L = this.LUT;
    for (let q = 0; q < 16; q++) { const f = .35 + q / 15 * .65; for (let i = 0; i < 5; i++) { const c = P[i]; L[q * 5 + i] = 0xff000000 | ((c[2] * f) << 16) | ((c[1] * f) << 8) | (c[0] * f); } }
  },
  draw() {
    const tgt = this.modes[this.target] || this.modes.normal; let moved = false;
    for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { const d = tgt[i][k] - this.cur[i][k]; if (d > .5 || d < -.5) { this.cur[i][k] += d * .028; moved = true; } }
    if (moved) this.buildLut();
    const t = this.t, n = this.w * this.h, SIN = this.SIN, sk = this.sk, M = 4095, px = this.px, L = this.LUT;
    const { A3, R09, A2, XY, DI, FQ } = this;
    const t1 = t * 1.6, t2 = t * .9, t3 = t * .3, t4 = t * .7, K = 4 / 4.3;
    for (let o = 0; o < n; o++) {
      const s2 = SIN[((A2[o] + t3) * sk) & M] * 1.5;
      const v = SIN[((A3[o] - t1) * sk + 409600) & M] + SIN[((R09[o] - t2 + s2) * sk + 409600) & M] * .8 + SIN[((XY[o] + t4) * sk) & M] * .35;
      let idx = (v * K + DI[o]) | 0; if (idx < 0) idx = 0; else if (idx > 4) idx = 4;
      px[o] = L[FQ[o] * 5 + idx];
    }
    this.cx.putImageData(this.img, 0, 0);
  },
};

/* ---------- État ---------- */
const ui = { run: null, busy: false, dealerShown: null, dealerRevealed: false, dealLimit: null, scoringHand: -1, fast: false, revealFd: false, setup: { deck: 0, stake: 0 } };
const sleep = ms => new Promise(r => setTimeout(r, (ui.fast ? Math.min(ms, 40) : ms) / opts.speed));
function applySpeed() { document.documentElement.style.setProperty('--sp', String(opts.speed)); }
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function discover(id) { if (id && !prog.seen[id]) { prog.seen[id] = 1; saveProg(); } }
function persist() {
  const run = ui.run; if (!run) return;
  if (['select', 'shop', 'ready'].includes(run.phase) && !run.pack) Store.set('run', F.save(run));
}

/* ---------- Toasts ---------- */
function toast(msg, kind) {
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
  const box = $('#toasts'); box.appendChild(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.remove(), 2500);
}
function drainLog() { if (!ui.run) return; F.drain(ui.run).forEach(l => toast(l.msg, l.kind)); }

/* ---------- Cartes : rangées ---------- */
function fitCards() {
  const z1 = $('#dealerZone'), z2 = $('#playerZone');
  const W = (z2 && z2.clientWidth) || Math.min(window.innerWidth, 480) - 32;
  let cw = Math.min(W * .17, W > 600 ? 120 : W > 440 ? 96 : 74);
  if ($('#game').classList.contains('on') && z1 && z2) {
    const zh = Math.min(z1.clientHeight, z2.clientHeight);
    if (zh > 0) cw = Math.min(cw, (zh - 36) / 1.42);
  }
  cw = Math.max(34, cw);
  document.documentElement.style.setProperty('--cwb', cw.toFixed(1) + 'px');
  document.querySelectorAll('.row').forEach(layoutRow);
}
function layoutRow(row) {
  const cards = [...row.children].filter(e => !e.classList.contains('leaving'));
  const n = cards.length; if (!n) return;
  const cw = cards[0].offsetWidth || 50;
  const W = row.clientWidth - 6;
  let ov = 6;
  if (n > 1 && n * cw + (n - 1) * 6 > W) ov = (W - n * cw) / (n - 1);
  row.style.setProperty('--ov', ov.toFixed(1) + 'px');
  const mid = (n - 1) / 2, step = Math.min(5, 20 / n);
  cards.forEach((el, i) => { el.style.setProperty('--rot', ((i - mid) * step).toFixed(1) + 'deg'); el.style.setProperty('--ty', (Math.pow(Math.abs(i - mid), 1.6) * 1.8).toFixed(1) + 'px'); });
}
function syncRow(row, list) {
  const existing = new Map();
  [...row.children].forEach(e => { if (!e.classList.contains('leaving')) existing.set(e.dataset.id, e); });
  const keep = new Set(list.map(x => x.card.id));
  for (const [id, el] of existing) if (!keep.has(id)) { el.classList.add('leaving'); setTimeout(() => el.remove(), 320); }
  list.forEach((x, i) => {
    let el = existing.get(x.card.id);
    if (el && el.dataset.sig !== sig(x.card)) { const nel = cardEl(x.card); nel.className = el.className; el.replaceWith(nel); el = nel; el.classList.remove('e-' + 'x'); syncClasses(el, x.card); }
    if (!el) {
      el = cardEl(x.card);
      if (!RM) { el.classList.add('dealing'); setTimeout(() => el.classList.remove('dealing'), 420 / opts.speed); }
      if (x.hidden) el.classList.add('hidden');
      row.appendChild(el);
    } else if (el.classList.contains('hidden') && !x.hidden) {
      el.classList.remove('hidden'); el.classList.add('flipping'); setTimeout(() => el.classList.remove('flipping'), 420 / opts.speed);
    } else if (x.hidden) el.classList.add('hidden');
    el.dataset.sig = sig(x.card);
    el.style.setProperty('--i', i);
    el.classList.toggle('dim', !!x.dim);
    el.classList.toggle('fd', !!x.fd);
    el.classList.toggle('debuffed', !!x.debuffed);
  });
  layoutRow(row);
}
const sig = c => `${c.rank}${c.suit}${c.enh || ''}${c.ed || ''}${c.seal || ''}`;
function syncClasses(el, c) {
  const base = ['card', c.suit === 'H' || c.suit === 'D' ? 'red' : '', c.rank === 1 ? 'ace' : '', c.rank >= 11 ? 'face' : '', c.enh ? 'e-' + c.enh : '', c.ed ? 'ed-' + c.ed : ''];
  el.className = base.join(' ');
}

/* ---------- Porte-bonheur et consommables ---------- */
function slotHTML(inst, i, opts2) {
  const d = F.CHARMS[inst.id];
  const hide = opts2 && opts2.hide;
  const st = inst.stk || {};
  const stk = (st.e ? '<span class="stk e">É</span>' : '') + (st.p != null ? `<span class="stk p">${st.p}</span>` : '') + (st.r ? '<span class="stk r">$</span>' : '');
  return `<button class="slot full tilt r-${d.rarity} ${inst.ed ? 'ed-' + inst.ed : ''} ${inst.off ? 'off' : ''} ${inst.dead ? 'dead' : ''} ${hide ? 'hiddenc' : ''}" data-i="${i}" data-uid="${inst.uid}" style="--i:${i}" aria-label="${esc(d.name)}">${charmIcon(inst.id)}${stk}${opts2 && opts2.prices ? `<span class="price">$${F.sellValue(ui.run, inst)}</span>` : ''}</button>`;
}
function renderSlots(container, o) {
  const run = ui.run, n = Math.max(F.maxSlots(run), run.charms.length);
  container.style.setProperty('--n', n);
  const hide = o && o.game && F.bossActive(run, 'bonneteau') && run.phase !== 'select' && run.phase !== 'shop';
  let h = '';
  for (let i = 0; i < n; i++) { const inst = run.charms[i]; h += inst ? slotHTML(inst, i, { prices: o && o.prices, hide }) : '<div class="slot" aria-hidden="true"></div>'; }
  container.innerHTML = h;
  container.querySelectorAll('.slot.full').forEach(b => b.addEventListener('click', () => { if (!ui.busy) openCharmSheet(+b.dataset.i); }));
}
function renderCons(container) {
  const run = ui.run, n = F.consSlots(run);
  let h = '';
  for (let i = 0; i < Math.max(n, run.consumables.length); i++) {
    const c = run.consumables[i];
    h += c ? `<button class="cslot full tilt k-${c.kind}" data-i="${i}" aria-label="${esc(F.consName(c))}">${consIcon(c)}</button>` : '<div class="cslot"></div>';
  }
  container.innerHTML = h;
  container.querySelectorAll('.cslot.full').forEach(b => b.addEventListener('click', () => { if (!ui.busy) openConsSheet(+b.dataset.i); }));
}

/* ---------- Rendu du jeu ---------- */
function renderHeader() {
  const run = ui.run, hdr = $('#hdr');
  const b = run.blind;
  if (b.boss) {
    const B = F.BOSSES[b.boss];
    hdr.classList.add('boss');
    $('#tName').textContent = `${B.name}${F.bossActive(run, b.boss) ? '' : ' (désactivé)'}`;
    $('#tRule').textContent = B.rule; $('#tRule').hidden = false;
  } else {
    hdr.classList.remove('boss');
    $('#tName').textContent = b.idx === 0 ? 'Petite table' : 'Grande table';
    $('#tRule').hidden = true;
  }
  $('#tGoal').innerHTML = `<small>Objectif</small>${fmt(run.target)}`;
  $('#tBar').style.width = Math.min(100, 100 * run.score / run.target) + '%';
}
function setStat(id, v, bump) {
  const el = $(id), sp = el.querySelector('span');
  if (sp.textContent !== String(v)) { sp.textContent = v; if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } }
}
function renderStats(bump) {
  const run = ui.run;
  setStat('#sScore', fmt(run.score), bump);
  setStat('#sHands', run.handsLeft, bump);
  setStat('#sJets', run.jets, bump);
  setStat('#sMoney', (run.money < 0 ? '-$' : '$') + Math.abs(run.money), bump);
  setStat('#sAnte', `${run.ante}/8`, false);
}
function dealerVisible(run) {
  const lynx = F.has(run, 'lynx'), brume = F.bossActive(run, 'brume');
  return run.dealer.cards.map((c, i) => ({ card: c, hidden: !ui.dealerRevealed && !lynx && (i === 1 || (i === 0 && brume)) }));
}
function renderDealer() {
  const run = ui.run, row = $('#dRow'), tot = $('#dTot');
  if (!run.dealer) { syncRow(row, []); tot.textContent = ''; return; }
  let list = dealerVisible(run);
  if (ui.dealerShown != null) list = list.slice(0, ui.dealerShown);
  if (ui.dealLimit) list = list.slice(0, ui.dealLimit.d);
  syncRow(row, list);
  const vis = list.filter(x => !x.hidden).map(x => x.card), anyHidden = list.some(x => x.hidden);
  tot.className = 'tot';
  if (!vis.length) tot.textContent = list.length ? '?' : '';
  else {
    const v = F.handValue(run, vis, false);
    tot.textContent = anyHidden ? `${v.total} + ?` : String(v.total);
    if (!anyHidden && v.total > 21) tot.classList.add('bust');
    if (!anyHidden && vis.length === 2 && v.total === 21) tot.classList.add('bj');
  }
}
function renderPlayer() {
  const run = ui.run, wrap = $('#hands');
  const hands = run.hands || [];
  wrap.classList.toggle('split', hands.length > 1);
  wrap.classList.toggle('split3', hands.length > 2);
  while (wrap.children.length > hands.length) wrap.lastChild.remove();
  while (wrap.children.length < hands.length) {
    const d = document.createElement('div'); d.className = 'hand';
    d.innerHTML = '<div class="row"></div><div class="htot zlabel" style="justify-content:center"><span class="tot"></span></div><div class="htype"></div>';
    wrap.appendChild(d);
  }
  const ready = ['ready', 'tableWon', 'gameOver'].includes(run.phase);
  const playing = run.phase === 'player' || run.phase === 'bustChoice';
  hands.forEach((h, hi) => {
    const el = wrap.children[hi];
    el.dataset.h = hi;
    el.classList.toggle('active', playing && hi === run.cur);
    el.classList.toggle('scoring', hi === ui.scoringHand);
    let cards = h.cards;
    if (ui.dealLimit) cards = cards.slice(0, ui.dealLimit.p);
    const fdSet = ui.revealFd ? [] : (h.fd || []);
    syncRow(el.querySelector('.row'), cards.map(c => ({ card: c, dim: ready, fd: fdSet.includes(c.id), debuffed: F.isDebuffed(run, c) })));
    const tot = el.querySelector('.tot'), ty = el.querySelector('.htype');
    const hasFd = cards.some(c => fdSet.includes(c.id));
    if (!cards.length) { tot.textContent = ''; ty.textContent = ''; return; }
    const sub = Object.assign({}, h, { cards });
    const v = F.handValue(run, cards, true);
    if (hasFd) { tot.textContent = '?'; tot.className = 'tot'; ty.textContent = ''; return; }
    if (v.total > 21) { tot.textContent = `${v.total} BUST`; tot.className = 'tot bust'; }
    else if (F.isBlackjack(run, sub)) { tot.textContent = 'BLACKJACK'; tot.className = 'tot bj'; }
    else { tot.textContent = v.soft ? `${v.hard}/${v.total}` : String(v.total); tot.className = 'tot ' + (v.total === 21 ? 'bj' : ''); }
    const t = F.handTypeOf(run, sub, F.analyze(run, sub));
    ty.textContent = t !== 'simple' ? F.HAND_TYPES[t].name + ` · niv.${run.levels[t]}` : '';
  });
  const peek = $('#peek');
  const n = F.hasV(run, 'oeilcristal') ? 3 : (F.has(run, 'boule') || F.hasV(run, 'oeilverre')) ? 1 : 0;
  if (n && run.drawPile && run.drawPile.length && ['player', 'ready', 'bustChoice'].includes(run.phase)) {
    peek.hidden = false;
    peek.innerHTML = 'Pioche ' + run.drawPile.slice(-n).reverse().map(c => cardHTML(c)).join('');
  } else peek.hidden = true;
}
function setBox(chips, mult, type, big) {
  const c = $('#sbChips'), m = $('#sbMult');
  const cs = fmt(chips), ms = fmtM(mult);
  if (c.textContent !== cs) { c.textContent = cs; if (!RM) { c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse'); } }
  if (m.textContent !== ms) { m.textContent = ms; if (!RM) { m.classList.remove('pulse', 'big'); void m.offsetWidth; m.classList.add(big ? 'big' : 'pulse'); } }
  if (type != null) $('#sbType').textContent = type;
}
function setMsg(text, cls, big) { const m = $('#sbMsg'); m.textContent = text; m.className = cls || 'info'; if (big) { void m.offsetWidth; m.classList.add('big'); } }
function renderActions() {
  const run = ui.run, A = $('#actions');
  const b = (id, cls, label, sub, ok) => `<button class="btn ${cls} ${ok === 'ghost' ? 'ghost' : ''}" data-a="${id}" ${ok === true ? '' : 'disabled'} ${ok === 'ghost' ? 'tabindex="-1" aria-hidden="true"' : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
  const dis = ui.busy;
  let h = '';
  if (run.phase === 'bustChoice') {
    h = `<div class="arow">${b('jetBust', 'b-red', 'Jeter la carte', `${run.jets} jet${run.jets > 1 ? 's' : ''} restant${run.jets > 1 ? 's' : ''}`, !dis)}${b('acceptBust', 'b-grey', 'Accepter le bust', '', !dis)}</div><div class="arow small">${b('x', '', '-', '', 'ghost')}</div>`;
  } else if (run.phase === 'player' || (dis && run.hands && run.hands.length && run.phase !== 'ready')) {
    const can = a => !dis && F.can(run, a);
    const opt = (a, cls, label) => b(a, cls, label, '', F.can(run, a) ? can(a) : 'ghost');
    h = `<div class="arow">${b('hit', 'b-blue', 'Tirer', '', can('hit'))}${b('stand', 'b-gold', 'Rester', F.bossActive(run, 'ivrogne') && F.curHand(run) && F.curHand(run).cards.length === 2 ? 'tire d\'abord' : '', can('stand'))}</div>
      <div class="arow small">${opt('double', 'b-green', 'Doubler')}${opt('split', 'b-purple', 'Séparer')}${opt('jet', 'b-red', `Jeter (${run.jets})`)}</div>`;
  } else {
    const label = run.handsLeft === run.handsMax ? 'Distribuer' : 'Main suivante';
    h = `<div class="arow">${b('deal', 'b-gold', label, `Main ${run.handsMax - run.handsLeft + 1} sur ${run.handsMax}`, !dis && run.phase === 'ready')}</div><div class="arow small">${b('x', '', '-', '', 'ghost')}</div>`;
  }
  A.innerHTML = h;
  A.querySelectorAll('button[data-a]').forEach(btn => btn.addEventListener('click', () => onAction(btn.dataset.a)));
}
function renderGame(bump) {
  renderHeader(); renderStats(bump); renderSlots($('#slots'), { game: true }); renderCons($('#consSlots')); renderDealer(); renderPlayer(); renderActions();
}

/* ---------- Effets ---------- */
function popup(el, text, cls) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const p = document.createElement('div');
  p.className = 'pop ' + cls; p.textContent = text;
  p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + 4) + 'px';
  $('#fx').appendChild(p); setTimeout(() => p.remove(), 950 / opts.speed + 50);
}
function sparks(x, y, n, color) {
  if (RM) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div'); s.className = 'spark';
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
    s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.background = color || (i % 2 ? '#ffd23f' : '#ff5ad9');
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    $('#fx').appendChild(s); setTimeout(() => s.remove(), 750);
  }
}
function bigScore(text) {
  const b = document.createElement('div'); b.className = 'bigscore'; b.textContent = text;
  $('#fx').appendChild(b); setTimeout(() => b.remove(), 1150 / opts.speed + 50);
  sparks(window.innerWidth / 2, window.innerHeight * .45, 26);
}
function shakeScreen() { if (RM) return; const a = $('#app'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }
function flash() { if (RM) return; const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function trig(el) { if (!el || RM) return; el.classList.remove('trig'); void el.offsetWidth; el.classList.add('trig'); }
function lit(el) { if (!el || RM) return; el.classList.remove('lit'); void el.offsetWidth; el.classList.add('lit'); }
const charmSlot = i => document.querySelector(`#slots .slot[data-i="${i}"]`);
const charmByUid = uid => document.querySelector(`.slot[data-uid="${uid}"]`);
const consSlot = i => document.querySelector(`#consSlots .cslot[data-i="${i}"]`);
const cardInHand = (hi, id) => document.querySelector(`#hands .hand[data-h="${hi}"] .card[data-id="${id}"]`);
function tween(el, from, to, ms, fmtFn) {
  const t0 = performance.now(); ms = ms / opts.speed;
  const step = now => { const k = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmtFn(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
// inclinaison 3D au toucher / survol
let tiltEv = null;
document.addEventListener('pointermove', e => {
  if (RM) return;
  if (!tiltEv) requestAnimationFrame(() => {
    const ev = tiltEv; tiltEv = null;
    const el = ev.target.closest && ev.target.closest('.tilt'); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', (((ev.clientX - r.left) / r.width - .5) * 22).toFixed(1) + 'deg');
    el.style.setProperty('--rx', (-((ev.clientY - r.top) / r.height - .5) * 22).toFixed(1) + 'deg');
  });
  tiltEv = e;
}, { passive: true });
document.addEventListener('pointerout', e => { const el = e.target.closest && e.target.closest('.tilt'); if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); } });

/* ---------- Déroulé d'une main ---------- */
async function dealFlow() {
  const run = ui.run;
  ui.busy = true; ui.fast = false; ui.scoringHand = -1; ui.revealFd = false;
  ui.dealerRevealed = false; ui.dealerShown = null;
  $('#scorebox').classList.remove('fire');
  setBox(0, 0, ''); setMsg('');
  const ev = F.dealHand(run);
  ui.dealLimit = { p: 0, d: 0 };
  renderGame();
  for (const [who, n] of [['p', 1], ['d', 1], ['p', 2], ['d', 2]]) { ui.dealLimit[who] = n; renderDealer(); renderPlayer(); Snd.deal(); await sleep(160); }
  ui.dealLimit = null;
  renderGame();
  for (const e of ev) {
    if (e.type === 'pourpre') { const el = charmByUid(e.uid); popup(el, 'Désactivé', 'debuff'); trig(el); await sleep(500); }
    if (e.type === 'contre') { const i = ui.run.charms.findIndex(x => x.id === 'contre'); trig(charmSlot(i)); popup(charmSlot(i), 'Contre-Attaque !', 'info'); setMsg('Blackjack du croupier annulé !', 'good', true); Snd.coin(); await sleep(700); }
    if (e.type === 'dealerBJ') { ui.dealerRevealed = true; renderDealer(); Snd.flip(); setMsg('Blackjack du croupier…', 'bad', true); await sleep(900); return resolveFlow(); }
    if (e.type === 'playerBJ') { setMsg('BLACKJACK !', 'gold', true); Snd.big(); sparks(window.innerWidth / 2, window.innerHeight * .7, 18); await sleep(800); return resolveFlow(); }
  }
  setMsg('Tirer ou rester ?', 'info');
  ui.busy = false;
  renderActions(); renderPlayer();
}
async function bustFx() {
  shakeScreen(); Snd.bust(); BG.set('bust'); setMsg('BUST !', 'bad', true);
  await sleep(650);
  BG.set(ui.run.blind.boss ? 'boss' : 'normal');
}
async function onAction(a) {
  const run = ui.run;
  Snd.init();
  if (a === 'deal') { if (ui.busy || run.phase !== 'ready') return; Snd.click(); return dealFlow(); }
  if (ui.busy) return;
  const res = F.act(run, a);
  if (!res.ok) return;
  if (a === 'jet' || a === 'jetBust') { Snd.flip(); setMsg('Carte jetée', 'info'); } else if (res.card) Snd.deal(); else Snd.click();
  renderGame();
  drainLog();
  if (a === 'split') setMsg('Main de gauche d\'abord', 'info');
  if (a === 'double') setMsg('Double !', 'good', true);
  if (res.result === 'souffle') { setMsg('Second Souffle : bust annulé !', 'good', true); Snd.magic(); }
  if (run.phase === 'bustChoice') { shakeScreen(); Snd.lose(); setMsg('Ça dépasse 21 ! Jeter la carte ?', 'bad', true); }
  else if (res.result === 'bust' || a === 'acceptBust') { ui.busy = true; renderActions(); await bustFx(); ui.busy = false; }
  else if (res.result === 'twentyone') { setMsg('21 !', 'gold', true); Snd.coin(); }
  if (run.phase === 'player' && run.hands.length > 1 && (a === 'stand' || res.result)) setMsg(`Main ${run.cur + 1} sur ${run.hands.length}`, 'info');
  if (run.phase === 'resolve') { await sleep(250); return resolveFlow(); }
  renderActions();
}
const OUT_TXT = { win: 'GAGNÉ', push: 'ÉGALITÉ', lose: 'PERDU', bust: 'BUST' };
async function resolveFlow() {
  const run = ui.run;
  ui.busy = true; renderActions();
  const before = run.dealer.cards.length;
  const R = F.resolve(run);
  ui.dealerShown = before;
  if (run.hands.some(h => h.fd && h.fd.length)) { ui.revealFd = true; renderPlayer(); Snd.flip(); await sleep(400); }
  if (!ui.dealerRevealed) { await sleep(200); ui.dealerRevealed = true; renderDealer(); Snd.flip(); await sleep(480); }
  for (let i = before; i < run.dealer.cards.length; i++) { ui.dealerShown = i + 1; renderDealer(); Snd.deal(); await sleep(420); }
  ui.dealerShown = null; renderDealer();
  if (R.dealerTotal > 21) { setMsg('Le croupier dépasse 21 !', 'good', true); Snd.coin(); await sleep(600); }
  for (let hi = 0; hi < R.results.length; hi++) {
    ui.scoringHand = run.hands.length > 1 ? hi : -1; renderPlayer();
    const r = R.results[hi];
    await animateResult(r, hi, R.dealerTotal);
    const before2 = run.score;
    F.applyResult(run, r);
    if (run.score !== before2) tween($('#sScore span'), before2, run.score, 500, fmt);
    renderHeader(); renderStats(true);
    if (r.money) { popup($('#sMoney'), `+$${r.money}`, 'money'); Snd.coin(); }
    for (const e of r.after) {
      const el = e.uid ? charmByUid(e.uid) : null;
      if (e.money) { trig(el); popup(el || $('#sMoney'), `+$${e.money}`, 'money'); Snd.coin(); await sleep(260); }
      if (e.msg) { toast(e.msg, 'charm'); if (el) { trig(el); popup(el, e.msg, 'msg'); } await sleep(260); }
    }
    for (const g of r.broken) { const el = cardInHand(hi, g.id); if (el) { el.classList.add('shatter'); popup(el, 'Brisée !', 'info'); } Snd.glass(); await sleep(450); }
    drainLog();
    renderSlots($('#slots'), { game: true }); renderCons($('#consSlots')); renderStats();
    await sleep(250);
  }
  ui.scoringHand = -1;
  const e = F.endHand(run);
  renderGame();
  drainLog();
  if (e === 'won') { await sleep(400); return tableWonFlow(); }
  if (e === 'lost') { await sleep(700); return gameOverFlow(); }
  ui.busy = false; ui.fast = false;
  persist();
  renderActions();
}
async function animateResult(r, hi, dealerTotal) {
  const run = ui.run, h = run.hands[hi];
  const tag = run.hands.length > 1 ? `Main ${hi + 1} : ` : '';
  if (r.outcome === 'bust') setMsg(tag + 'BUST', 'bad', true);
  else if (run.dealerBJ && r.outcome === 'lose') setMsg(tag + 'PERDU contre Blackjack', 'bad', true);
  else setMsg(`${tag}${OUT_TXT[r.outcome]} ${r.playerTotal} contre ${dealerTotal}`, r.outcome === 'win' ? 'good' : r.outcome === 'push' ? 'gold' : 'bad', true);
  if (r.blocked) { await sleep(500); setMsg(r.blocked, 'bad', true); Snd.lose(); await sleep(900); return; }
  if (r.factor === 0) { setBox(0, 0, ''); if (r.outcome !== 'bust') Snd.lose(); await sleep(850); return; }
  for (const m of r.events) toast(m, 'charm');
  await sleep(420);
  const base = r.steps[0];
  setBox(base.chips, base.mult, base.text); Snd.chip(0);
  await sleep(380);
  const remaining = run.target - run.score;
  const box = $('#scorebox');
  let k = 1;
  for (const s of r.steps.slice(1)) {
    let el = null;
    if (s.src === 'card') { el = cardInHand(hi, h.cards[s.ci].id); lit(el); }
    else if (s.src === 'charmCard') { el = charmSlot(s.idx); trig(el); lit(cardInHand(hi, h.cards[s.ci].id)); }
    else if (s.src === 'charm') { el = charmSlot(s.idx); trig(el); }
    else if (s.src === 'cons') { el = consSlot(s.idx); trig(el); }
    else if (s.src === 'double' || s.src === 'plasma') el = $('#sbMult');
    let text = '';
    switch (s.kind) {
      case 'chips': text = `+${fmt(s.val)} Jetons`; break;
      case 'mult': text = `+${fmtM(s.val)} Mult`; break;
      case 'xmult': text = `×${fmtM(s.val)} Mult`; break;
      case 'money': text = `+$${s.val}`; break;
      case 'msg': text = s.val; break;
      case 'debuff': text = 'Désactivée'; break;
      case 'off': text = 'Désactivé'; break;
      case 'retrig': text = 'Encore !'; break;
      case 'plasma': text = 'Équilibre !'; break;
    }
    popup(el, s.src === 'double' ? `${text} (double)` : text, s.kind === 'retrig' || s.kind === 'off' || s.kind === 'plasma' ? 'info' : s.kind);
    setBox(s.chips, s.mult, null, s.kind === 'xmult');
    if (s.kind === 'xmult') { Snd.xmult(k); flash(); } else if (s.kind === 'money') Snd.coin(); else if (s.kind === 'debuff' || s.kind === 'off') Snd.lose(); else Snd.chip(k);
    if (s.chips * s.mult * r.factor >= remaining && remaining > 0) box.classList.add('fire');
    k++;
    await sleep(Math.max(110, 380 - k * 22));
  }
  await sleep(220);
  let txt = `${fmt(r.chips)} × ${fmtM(r.mult)} = ${fmt(r.raw)}`;
  if (r.factor !== 1) txt += `  · ${r.factor * 100} %`;
  setMsg(txt, 'gold', true);
  await sleep(480);
  box.classList.remove('burst'); void box.offsetWidth; box.classList.add('burst');
  bigScore('+' + fmt(r.score));
  if (r.score >= run.target * .5 || r.score >= 1000) Snd.big(); else Snd.win();
  await sleep(850);
  box.classList.remove('fire');
}

/* ---------- Fin de table ---------- */
function modal(html, setup) { $('#modal').innerHTML = html; $('#modalWrap').classList.add('on'); $('#modal').scrollTop = 0; if (setup) setup($('#modal')); }
function closeModal() { $('#modalWrap').classList.remove('on'); }
function noteProgress() {
  const run = ui.run;
  prog.maxAnte = Math.max(prog.maxAnte, run.ante);
  prog.bestHand = Math.max(prog.bestHand, run.stats.bestHand);
  saveProg();
}
async function tableWonFlow() {
  const run = ui.run;
  BG.set('win'); Snd.win();
  setMsg(run.blind.boss ? 'BOSS VAINCU !' : 'TABLE BATTUE !', 'gold', true);
  sparks(window.innerWidth / 2, window.innerHeight * .2, 30);
  await sleep(900);
  ui.busy = false;
  const co = F.finishTable(run);
  noteProgress();
  co.events.forEach(m => toast(m, 'charm'));
  const rows = co.lines.map((l, i) => `<span class="row-in" style="animation-delay:${i * .12}s">${esc(l.label)}</span><span class="row-in ${l.val < 0 ? 'neg' : ''}" style="animation-delay:${i * .12}s">${l.val < 0 ? '-' : '+'}$${Math.abs(l.val)}</span>`).join('');
  modal(`<h2 class="win">${run.blind.boss ? 'Boss vaincu' : run.blind.idx === 1 ? 'Grande table battue' : 'Petite table battue'}</h2>
    <p>Score ${fmt(run.score)} sur ${fmt(run.target)}</p>
    <div class="kv">${rows}<span class="tot">Total</span><span class="tot">${co.total < 0 ? '-' : '+'}$${Math.abs(co.total)}</span></div>
    <button class="btn b-green" id="mCash">Encaisser $${co.total}</button>`,
    m => {
      co.lines.forEach((l, i) => setTimeout(() => Snd.coin(), 120 * i + 100));
      m.querySelector('#mCash').onclick = () => {
        Snd.click(); closeModal();
        const old = run.money;
        F.collectEarnings(run); drainLog();
        void old;
        if (run.justWon) { run.justWon = false; return victoryFlow(); }
        showShop();
      };
    });
}
function victoryFlow() {
  const run = ui.run;
  prog.wins++; prog.stakeMax = Math.max(prog.stakeMax, Math.min(7, run.stake + 1)); noteProgress();
  BG.set('win'); Snd.big();
  modal(`<h2 class="gold">LA BANQUE A SAUTÉ !</h2>
    <p>Tu as battu les 8 antes avec le ${esc(F.DECKS[run.deckId].name)} en ${esc(F.STAKES[run.stake].name)}.</p>
    <div class="kv"><span>Meilleure main</span><span>${fmt(run.stats.bestHand)}</span><span>Mains gagnées</span><span>${run.stats.handsWon}</span><span>Blackjacks</span><span>${run.stats.blackjacks}</span></div>
    ${run.stake < 7 ? `<p style="color:var(--gold)">${esc(F.STAKES[run.stake + 1].name)} débloquée !</p>` : ''}
    <p>Le mode infini continue : les objectifs explosent.</p>
    <div class="btnrow"><button class="btn b-grey" id="mMenu">Menu</button><button class="btn b-gold" id="mGo">Mode infini</button></div>`,
    m => { m.querySelector('#mMenu').onclick = () => { closeModal(); Store.del('run'); toTitle(); }; m.querySelector('#mGo').onclick = () => { closeModal(); showShop(); }; });
}
function gameOverFlow() {
  const run = ui.run;
  ui.busy = false;
  BG.set('bust'); Snd.boss();
  noteProgress();
  prog.runs++; saveProg();
  Store.del('run');
  modal(`<h2 class="bad">PARTIE PERDUE</h2>
    <p>${run.blind.boss ? esc(F.BOSSES[run.blind.boss].name) + ' t\'a eu.' : 'Plus de mains.'} Score ${fmt(run.score)} sur ${fmt(run.target)}.</p>
    <div class="kv">
      <span>Ante atteinte</span><span>${run.ante}</span>
      <span>Meilleure main</span><span>${fmt(run.stats.bestHand)}</span>
      <span>Type le plus joué</span><span style="font-family:var(--f-text);font-size:14px">${F.mostPlayed(run) ? esc(F.HAND_TYPES[F.mostPlayed(run)].name) : '-'}</span>
      <span>Mains gagnées</span><span>${run.stats.handsWon}</span>
      <span>Record d'ante</span><span>${prog.maxAnte}</span>
    </div>
    <div class="btnrow"><button class="btn b-grey" id="mMenu">Menu</button><button class="btn b-gold" id="mAgain">Rejouer</button></div>`,
    m => { m.querySelector('#mMenu').onclick = () => { closeModal(); toTitle(); }; m.querySelector('#mAgain').onclick = () => { closeModal(); showSetup(); }; });
}

/* ---------- Sélection de la table ---------- */
function showSelect() {
  const run = ui.run;
  run.phase = 'select';
  BG.set('normal');
  show('select');
  renderSelect();
  persist();
  if (run.pendingPacks.length) setTimeout(openPendingPacks, 300);
}
function renderSelect() {
  const run = ui.run;
  const B = F.blinds(run);
  const chipCol = ['#1f8fe0', '#e9a800', '#e2234b'];
  const blinds = B.map((b, i) => {
    const boss = b.boss ? F.BOSSES[b.boss] : null;
    const cur = b.state === 'current';
    let act = '';
    if (cur) {
      act = `<button class="btn ${boss ? 'b-red' : 'b-gold'}" data-play="1">Jouer</button>`;
      if (i < 2) act += `<button class="btn b-cyan mini" data-skip="1">Passer<small>${esc(F.TAGS[b.tag].name)}</small></button>`;
    }
    if (boss && run.blindIdx <= 2 && F.canRerollBoss(run)) act += `<button class="btn b-grey mini" data-reroll="1">Changer $10</button>`;
    const state = b.state === 'done' ? 'Battue' : b.state === 'skipped' ? 'Passée' : '';
    return `<div class="blind px ${b.state} ${boss ? 'boss' : ''}" style="--i:${i}">
      <div class="chip" style="--cc:${boss ? (boss.final ? '#ffd23f' : chipCol[2]) : chipCol[i]}">${boss ? boss.name.split(' ').pop()[0] : i === 0 ? 'P' : 'G'}</div>
      <div><div class="bname">${esc(b.name)} ${state ? `<small style="color:var(--dim)">· ${state}</small>` : ''}</div>
        ${boss ? `<div class="brule">${esc(boss.rule)}</div>` : ''}
        <div class="binfo">Objectif <b>${fmt(b.target)}</b> · Gain <b>$${b.reward}</b></div>
        ${b.tag ? `<button class="tagpill" data-tag="${b.tag}" style="background:none;border:0;padding:0"><span class="tagicon">${tagIcon(b.tag)}</span>${esc(F.TAGS[b.tag].name)}</button>` : ''}
      </div>
      <div class="bact">${act}</div></div>`;
  }).join('');
  const tags = run.tags.length ? `<div class="owned-tags">${run.tags.map(t => `<button class="tagicon" data-tag="${t}" style="padding:0">${tagIcon(t)}</button>`).join('')}</div>` : '';
  $('#select').innerHTML = `
    <div class="selhead px"><div><h2>Ante ${run.ante} / 8</h2><small style="color:var(--dim)">${esc(F.DECKS[run.deckId].name)} · ${esc(F.STAKES[run.stake].name)}</small></div><span class="money">$${run.money}</span></div>
    <div class="sec px"><h3><span>Tes porte-bonheur ${run.charms.length}/${F.maxSlots(run)}</span><span>${tags ? 'Badges' : ''}</span></h3><div class="slots" id="selSlots" style="height:50px"></div>${tags}<div class="cons" id="selCons"></div></div>
    <div class="blinds">${blinds}</div>
    <div class="btnrow"><button class="btn b-purple mini" id="sDeck2">Paquet</button><button class="btn b-grey mini" id="sMenu2">Menu</button></div>`;
  renderSlots($('#selSlots'), { prices: true });
  renderCons($('#selCons'));
  const sel = $('#select');
  sel.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => openTagSheet(b.dataset.tag)));
  const play = sel.querySelector('[data-play]'); if (play) play.onclick = () => { Snd.init(); Snd.click(); startTableUI(); };
  const skip = sel.querySelector('[data-skip]'); if (skip) skip.onclick = () => { Snd.init(); Snd.magic(); F.skipBlind(run); drainLog(); renderSelect(); persist(); openPendingPacks(); };
  const rr = sel.querySelector('[data-reroll]'); if (rr) rr.onclick = () => { if (F.rerollBoss(run)) { Snd.boss(); renderSelect(); persist(); } };
  $('#sDeck2').onclick = () => openDeck('deck');
  $('#sMenu2').onclick = () => openOptions(true);
}
function openPendingPacks(done) {
  const run = ui.run;
  if (!run.pendingPacks.length) { if (done) done(); return; }
  F.openPack(run, run.pendingPacks.shift());
  openPackUI(() => { if ($('#select').classList.contains('on')) renderSelect(); else if ($('#shop').classList.contains('on')) renderShop(); persist(); openPendingPacks(done); });
}

/* ---------- Démarrer une table ---------- */
function startTableUI() {
  const run = ui.run;
  const ev = F.startTable(run);
  BG.set(run.blind.boss ? 'boss' : 'normal');
  if (run.blind.boss) Snd.boss();
  show('game');
  ui.dealerRevealed = false; ui.revealFd = false;
  $('#dRow').innerHTML = ''; $('#hands').innerHTML = '';
  setBox(0, 0, ''); setMsg(run.blind.boss ? F.BOSSES[run.blind.boss].rule : 'Bonne chance', run.blind.boss ? 'bad' : 'info');
  renderGame();
  requestAnimationFrame(fitCards);
  drainLog();
  ev.forEach(e => { const el = charmByUid(e.uid); trig(el); popup(el, e.msg.split(':')[0], 'msg'); });
  persist();
  setTimeout(() => { if (run.phase === 'ready' && !ui.busy) dealFlow(); }, 450 / opts.speed);
}

/* ---------- Feuilles de détail ---------- */
function sheet(html, setup) { $('#sheet').innerHTML = html; $('#sheetWrap').classList.add('on'); if (setup) setup($('#sheet')); }
function closeSheet() { $('#sheetWrap').classList.remove('on'); }
$('#sheetWrap').addEventListener('click', e => { if (e.target.id === 'sheetWrap') closeSheet(); });
function charmHead(inst, sub) {
  const d = F.CHARMS[inst.id];
  return `<div class="sh-head r-${d.rarity}"><div class="sh-icon ${inst.ed ? 'ed-' + inst.ed : ''}">${charmIcon(inst.id)}</div><div><div class="sh-name">${esc(d.name)}</div><div class="sh-rar">${RAR[d.rarity]}${inst.ed ? ' · ' + F.EDITIONS[inst.ed].name : ''}${sub ? ' · ' + sub : ''}</div></div></div>`;
}
function charmExtra(inst) {
  const p = [];
  if (inst.ed) p.push(`<b>${F.EDITIONS[inst.ed].name}</b> : ${F.EDITIONS[inst.ed].desc}`);
  if (inst.stk.e) p.push('<b>Éternel</b> : ne peut être ni vendu ni détruit');
  if (inst.stk.p != null) p.push(`<b>Périssable</b> : désactivé dans ${inst.stk.p} table(s)`);
  if (inst.stk.r) p.push('<b>Location</b> : coûte $3 à chaque fin de table');
  if (inst.dead) p.push('<b>Péri</b> : ce porte-bonheur ne fait plus rien');
  if (inst.off) p.push('<b>Désactivé</b> pour cette main');
  return p.length ? `<div class="sh-extra">${p.join('<br>')}</div>` : '';
}
function openCharmSheet(i) {
  const run = ui.run, inst = run.charms[i]; if (!inst) return;
  Snd.click();
  const hidden = F.bossActive(run, 'bonneteau') && ['ready', 'player', 'bustChoice'].includes(run.phase);
  const canSell = !inst.stk.e && !['player', 'bustChoice', 'resolve'].includes(run.phase);
  sheet(`${hidden ? '<div class="sh-name">Porte-bonheur retourné</div><div class="sh-desc">Le Bonneteau cache tes porte-bonheur.</div>' : charmHead(inst, 'emplacement ' + (i + 1)) + `<div class="sh-desc">${esc(F.charmDesc(run, inst))}</div>${charmExtra(inst)}`}
    <p style="margin:0;font-size:12px;color:var(--dim)">Les porte-bonheur se déclenchent de gauche à droite : place les +Mult avant les ×Mult.</p>
    <div class="btnrow">
      <button class="btn b-grey" id="shL" ${i === 0 || hidden ? 'disabled' : ''} aria-label="Déplacer à gauche">←</button>
      <button class="btn b-grey" id="shR" ${i >= run.charms.length - 1 || hidden ? 'disabled' : ''} aria-label="Déplacer à droite">→</button>
      <button class="btn b-red" id="shSell" ${canSell ? '' : 'disabled'}>Vendre $${F.sellValue(run, inst)}</button>
    </div>
    <button class="btn b-purple" id="shClose">Fermer</button>`,
    s => {
      s.querySelector('#shL').onclick = () => { F.moveCharm(run, i, -1); afterChange(); openCharmSheet(i - 1); };
      s.querySelector('#shR').onclick = () => { F.moveCharm(run, i, 1); afterChange(); openCharmSheet(i + 1); };
      s.querySelector('#shSell').onclick = () => { const r = F.sellCharm(run, i); if (r) { Snd.coin(); if (r.msg) toast(r.msg, 'charm'); } closeSheet(); afterChange(); };
      s.querySelector('#shClose').onclick = closeSheet;
    });
}
function afterChange() {
  drainLog();
  if ($('#shop').classList.contains('on')) renderShop();
  else if ($('#select').classList.contains('on')) renderSelect();
  else if ($('#game').classList.contains('on')) renderGame();
  persist();
}
function consCanUseNow() { const p = ui.run.phase; return !ui.busy && ['ready', 'select', 'shop'].includes(p); }
const TIRAGE_SPECTRES = ['ombre', 'rite', 'incant', 'sigil', 'planchette', 'bucher'];
function needsTirage(c) { return F.consNeeds(c) > 0 || (c.kind === 'spectre' && TIRAGE_SPECTRES.includes(c.id)); }
function openConsSheet(i) {
  const run = ui.run, c = run.consumables[i]; if (!c) return;
  const d = F.consDef(c);
  Snd.click();
  sheet(`<div class="sh-head"><div class="sh-icon k-${c.kind}" style="color:${c.kind === 'etoile' ? 'var(--gold)' : c.kind === 'spectre' ? 'var(--cyan)' : '#d6a8ff'}">${consIcon(c)}</div><div><div class="sh-name">${esc(d.name)}</div><div class="sh-rar">${KIND_NAME[c.kind]}</div></div></div>
    <div class="sh-desc">${esc(d.desc)}</div>
    ${c.kind === 'etoile' ? `<div class="sh-extra">${levelLine(run, d.type)}</div>` : ''}
    ${consCanUseNow() ? '' : '<div class="sh-note">Utilisable entre deux mains, en boutique ou avant une table.</div>'}
    <div class="btnrow"><button class="btn b-red" id="shSell">Vendre $${F.sellValue(run, c)}</button><button class="btn b-green" id="shUse" ${consCanUseNow() ? '' : 'disabled'}>Utiliser</button></div>
    <button class="btn b-purple" id="shClose">Fermer</button>`,
    s => {
      s.querySelector('#shClose').onclick = closeSheet;
      s.querySelector('#shSell').onclick = () => { F.sellCons(run, i); Snd.coin(); closeSheet(); afterChange(); };
      s.querySelector('#shUse').onclick = () => { closeSheet(); useConsUI(c); };
    });
}
function levelLine(run, t) {
  const st = F.handTypeStats(run, t), T = F.HAND_TYPES[t];
  return `<b>${T.name}</b> niv.${st.level} : ${st.chips} Jetons × ${st.mult} Mult → niv.${st.level + 1} : ${st.chips + T.lc} × ${st.mult + T.lm}`;
}
function useConsUI(c, buyItemIdx) {
  const run = ui.run;
  const run2 = () => {
    if (buyItemIdx != null) return F.shopBuy(run, 'useItem', buyItemIdx, []);
    return F.useCons(run, run.consumables.indexOf(c), [], null);
  };
  if (!needsTirage(c)) {
    const r = run2();
    if (r && r.ok) { Snd.magic(); toast(r.msg || 'Utilisé', c.kind === 'etoile' ? 'level' : 'create'); } else if (r) toast(r.msg || 'Impossible', 'charm');
    afterChange(); return;
  }
  openTirage(c, buyItemIdx);
}
function openTagSheet(t) {
  const T = F.TAGS[t];
  sheet(`<div class="sh-head"><div class="sh-icon" style="border-color:var(--cyan);color:var(--cyan)">${tagIcon(t)}</div><div><div class="sh-name">${esc(T.name)}</div><div class="sh-rar" style="color:var(--cyan)">Badge</div></div></div>
    <div class="sh-desc">${esc(T.desc)}</div><div class="sh-extra">Tu obtiens un badge en passant une petite ou une grande table : pas de gains ni de boutique pour cette table.</div>
    <button class="btn b-purple" id="shClose">Fermer</button>`, s => { s.querySelector('#shClose').onclick = closeSheet; });
}

/* ---------- Paquets et tirage ---------- */
function choiceHTML(ch, i) {
  if (!ch) return '';
  if (ch.kind === 'charm') { const d = F.CHARMS[ch.inst.id]; return `<button class="choice tilt r-${d.rarity} ${ch.inst.ed ? 'ed-' + ch.inst.ed : ''}" data-c="${i}" style="--i:${i}">${charmIcon(ch.inst.id)}<span class="iname">${esc(d.name)}</span></button>`; }
  if (ch.kind === 'carte') return `<button class="choice tilt" data-c="${i}" style="--i:${i}">${cardHTML(ch.card)}<span class="iname">${esc(cardName(ch.card))}</span></button>`;
  return `<button class="choice tilt k-${ch.cons.kind}" data-c="${i}" style="--i:${i}">${consIcon(ch.cons)}<span class="iname">${esc(F.consName(ch.cons))}</span></button>`;
}
function choiceDesc(ch) {
  const run = ui.run;
  if (ch.kind === 'charm') return `<b>${esc(F.CHARMS[ch.inst.id].name)}</b> (${RAR[F.CHARMS[ch.inst.id].rarity]}) : ${esc(F.charmDesc(run, ch.inst))}${ch.inst.ed ? ` · ${F.EDITIONS[ch.inst.ed].name} : ${F.EDITIONS[ch.inst.ed].desc}` : ''}`;
  if (ch.kind === 'carte') return `<b>${esc(cardName(ch.card))}</b>${ch.card.enh || ch.card.ed || ch.card.seal ? '<br>' + cardDesc(ch.card) : ' : s\'ajoute à ton paquet'}`;
  const d = F.consDef(ch.cons);
  return `<b>${esc(d.name)}</b> : ${esc(d.desc)}${ch.cons.kind === 'etoile' ? '<br><small>' + levelLine(run, d.type) + '</small>' : ''}`;
}
function openPackUI(onClose) {
  const run = ui.run, pk = run.pack; if (!pk) { if (onClose) onClose(); return; }
  BG.set('pack'); Snd.pack();
  const wrap = $('#packWrap');
  wrap.classList.add('on');
  let sel = -1;
  const picked = new Set();
  const render = (first) => {
    const p = run.pack;
    if (!p) { wrap.classList.remove('on'); BG.set($('#shop').classList.contains('on') ? 'shop' : 'normal'); if (onClose) onClose(); return; }
    const ch = sel >= 0 ? p.choices[sel] : null;
    const tir = p.tirage && (!ch || (ch.cons && needsTirage(ch.cons)));
    const need = ch && ch.cons ? F.consNeeds(ch.cons) : 0;
    $('#pack').innerHTML = `
      ${first ? packArt(p.type, 'opening') : ''}
      <h2>${esc(p.name)}</h2>
      <div class="sub">Choisis ${p.picks} carte${p.picks > 1 ? 's' : ''} · $${run.money} · porte-bonheur ${run.charms.filter(x => x.ed !== 'negatif').length}/${F.baseSlots(run)} · consommables ${run.consumables.length}/${F.consSlots(run)}</div>
      <div class="choices">${p.choices.map((c, i) => choiceHTML(c, i)).join('')}</div>
      <div class="chdesc">${ch ? choiceDesc(ch) : 'Touche une carte pour la voir.'}</div>
      ${tir ? `<div class="sub">${need ? `Ton tirage : choisis jusqu'à ${need} carte${need > 1 ? 's' : ''}` : 'Ton tirage (8 cartes de ton paquet)'}</div><div class="tirage">${p.tirage.map(c => cardHTML(c, picked.has(c.id) ? 'picked' : '')).join('')}</div>` : ''}
      <div class="btnrow"><button class="btn b-grey" id="pSkip">Passer</button><button class="btn b-green" id="pTake" ${ch ? '' : 'disabled'}>${ch && ch.cons ? 'Utiliser' : 'Prendre'}</button></div>`;
    const root = $('#pack');
    if (first) { const art = root.querySelector('.packart'); setTimeout(() => art && art.remove(), 620); sparks(window.innerWidth / 2, window.innerHeight * .3, 24, '#5ff0ff'); }
    if (sel >= 0) { const sb = root.querySelector(`.choice[data-c="${sel}"]`); if (sb) sb.classList.add('sel'); }
    root.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => { Snd.click(); sel = +b.dataset.c; picked.clear(); render(); }));
    root.querySelectorAll('.tirage .card').forEach(el => el.addEventListener('click', () => {
      if (!need) return;
      const id = el.dataset.id;
      if (picked.has(id)) picked.delete(id); else { if (picked.size >= need) picked.delete(picked.values().next().value); picked.add(id); }
      Snd.click(); render();
    }));
    root.querySelector('#pSkip').onclick = () => { Snd.click(); F.packSkip(run); drainLog(); render(); };
    root.querySelector('#pTake').onclick = () => {
      const r = F.packPick(run, sel, [...picked]);
      if (!r.ok) { toast(r.msg || 'Impossible', 'charm'); Snd.lose(); return; }
      Snd.magic(); if (r.msg) toast(r.msg, 'create');
      if (ch && ch.kind === 'charm') discover(ch.inst.id);
      drainLog(); sel = -1; picked.clear(); render();
    };
  };
  render(true);
  pk.choices.forEach(c => { if (c && c.kind === 'charm') discover(c.inst.id); });
}
function openTirage(c, buyItemIdx) {
  const run = ui.run;
  const tir = F.drawTirage(run, 8);
  const need = F.consNeeds(c), d = F.consDef(c);
  const picked = new Set();
  const wrap = $('#packWrap'); wrap.classList.add('on');
  const render = () => {
    $('#pack').innerHTML = `<h2>${esc(d.name)}</h2><div class="chdesc">${esc(d.desc)}</div>
      <div class="sub">${need ? `Choisis jusqu'à ${need} carte${need > 1 ? 's' : ''} dans ce tirage de ton paquet` : 'Ce tirage de ton paquet sera affecté'}</div>
      <div class="tirage">${tir.map(k => cardHTML(k, picked.has(k.id) ? 'picked' : '')).join('')}</div>
      <div class="btnrow"><button class="btn b-grey" id="pSkip">Annuler</button><button class="btn b-green" id="pTake" ${need && !picked.size ? 'disabled' : ''}>Utiliser</button></div>`;
    const root = $('#pack');
    root.querySelectorAll('.tirage .card').forEach(el => el.addEventListener('click', () => {
      if (!need) return; const id = el.dataset.id;
      if (picked.has(id)) picked.delete(id); else { if (picked.size >= need) picked.delete(picked.values().next().value); picked.add(id); }
      Snd.click(); render();
    }));
    root.querySelector('#pSkip').onclick = () => { wrap.classList.remove('on'); };
    root.querySelector('#pTake').onclick = () => {
      const r = buyItemIdx != null ? F.shopBuy(run, 'useItem', buyItemIdx, [...picked]) : F.useCons(run, run.consumables.indexOf(c), [...picked], tir);
      if (!r || !r.ok) { toast((r && r.msg) || 'Impossible', 'charm'); Snd.lose(); return; }
      Snd.magic(); toast(r.msg || 'Utilisé', 'create');
      wrap.classList.remove('on'); afterChange();
    };
  };
  render();
}

/* ---------- Paquet du joueur ---------- */
function deckRows(cards, o) {
  const order = { S: 0, H: 1, C: 2, D: 3 };
  const sorted = cards.slice().sort((a, b) => order[a.suit] - order[b.suit] || a.rank - b.rank);
  const by = { S: [], H: [], C: [], D: [] };
  sorted.forEach(c => by[c.suit].push(c));
  return Object.values(by).filter(l => l.length).map(l => `<div class="deckrow">${l.map(c => cardHTML(c, (o.used && o.used.has(c.id) ? 'used ' : '') + (o.pick ? 'pickable' : ''))).join('')}</div>`).join('');
}
function openDeck(tab) {
  const run = ui.run; Snd.click();
  tab = tab || 'deck';
  const inTable = $('#game').classList.contains('on') && run.drawPile;
  let body = '';
  if (tab === 'deck') {
    const s = F.deckSummary(run);
    body = `${inTable ? `<p>Pioche : <b style="color:var(--ink)">${s.total}</b> cartes restantes. Les cartes grisées sont déjà sorties. Touche une carte pour la détailler.</p>` : `<p>${run.deck.length} cartes dans ton paquet. Touche une carte pour la détailler.</p>`}
      <div class="dsum"><div><b>${s.aces}</b>As</div><div><b>${s.tens}</b>10 et figures</div><div><b>${s.small}</b>2 à 6</div><div><b>${s.mid}</b>7 à 9</div></div>
      <div class="deckgrid">${deckRows(run.deck, { used: inTable ? run.usedIds : null })}</div>`;
  } else if (tab === 'mains') {
    body = `<p>Base de chaque type de main. Les Étoiles les font monter de niveau.</p><div class="lvl"><span></span><span style="font-size:11px;color:var(--chips)">Jetons</span><span style="font-size:11px;color:var(--mult)">Mult</span><span style="font-size:11px">Joués</span>${
      F.HAND_TYPE_IDS.map(id => { const st = F.handTypeStats(run, id); return `<span>${esc(F.HAND_TYPES[id].name)} <small style="color:var(--dim)">niv.${st.level}</small><br><small style="color:var(--dim)">${esc(F.HAND_TYPES[id].desc)}</small></span><span class="c">${st.chips}</span><span class="m">×${st.mult}</span><span class="n">${run.handPlays[id] || 0}</span>`; }).join('')}</div>`;
  } else {
    body = `<h2 style="font-size:18px">Talismans</h2><div class="chiplist">${run.vouchers.length ? run.vouchers.map(v => `<span>${esc(F.VOUCHERS[v].name)} : ${esc(F.VOUCHERS[v].desc)}</span>`).join('') : '<p>Aucun.</p>'}</div>
      <h2 style="font-size:18px">Badges en attente</h2><div class="chiplist">${run.tags.length ? run.tags.map(t => `<span style="border-color:var(--cyan);color:var(--cyan)">${esc(F.TAGS[t].name)} : ${esc(F.TAGS[t].desc)}</span>`).join('') : '<p>Aucun.</p>'}</div>
      <h2 style="font-size:18px">Partie</h2><div class="kv"><span>Paquet</span><span style="font-family:var(--f-text);font-size:14px">${esc(F.DECKS[run.deckId].name)}</span><span>Mise</span><span style="font-family:var(--f-text);font-size:14px">${esc(F.STAKES[run.stake].name)}</span><span>Mains jouées</span><span>${run.stats.handsPlayed}</span><span>Blackjacks</span><span>${run.stats.blackjacks}</span><span>Tables passées</span><span>${run.stats.skips}</span></div>`;
  }
  modal(`<h2>Ton paquet</h2>
    <div class="tabs"><button class="btn ${tab === 'deck' ? 'b-purple' : 'b-grey'}" data-t="deck">Cartes</button><button class="btn ${tab === 'mains' ? 'b-purple' : 'b-grey'}" data-t="mains">Mains</button><button class="btn ${tab === 'info' ? 'b-purple' : 'b-grey'}" data-t="info">Bonus</button></div>
    ${body}<button class="btn b-grey" id="mClose">Fermer</button>`,
    m => {
      m.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => openDeck(b.dataset.t); });
      m.querySelector('#mClose').onclick = closeModal;
      m.querySelectorAll('.deckrow .card').forEach(el => el.addEventListener('click', () => {
        const c = run.deck.find(k => k.id === el.dataset.id); if (!c) return;
        sheet(`<div class="sh-head"><div class="sh-icon">${cardHTML(c)}</div><div><div class="sh-name">${esc(cardName(c))}</div><div class="sh-rar">${F.cardChips(run, c) + (c.bonus || 0)} Jetons</div></div></div><div class="sh-extra">${cardDesc(c) || 'Carte standard.'}</div><button class="btn b-purple" id="shClose">Fermer</button>`, s => { s.querySelector('#shClose').onclick = closeSheet; });
      }));
    });
}
function pickCard(title, sub, onPick) {
  const run = ui.run;
  modal(`<h2>${esc(title)}</h2><p>${esc(sub)}</p><div class="deckgrid">${deckRows(run.deck, { pick: true })}</div><button class="btn b-grey" id="mClose">Annuler</button>`,
    m => { m.querySelectorAll('.card.pickable').forEach(el => el.addEventListener('click', () => { closeModal(); onPick(el.dataset.id); })); m.querySelector('#mClose').onclick = closeModal; });
}

/* ---------- Boutique ---------- */
function showShop() {
  BG.set('shop');
  ui.run.phase = 'shop';
  show('shop');
  renderShop();
  $('#shop').scrollTop = 0;
  persist();
  if (ui.run.pendingPacks.length) setTimeout(openPendingPacks, 300);
}
function itemHTML(it, i) {
  const run = ui.run;
  if (!it) return '<div class="item sold"><div class="iname">Vendu</div></div>';
  const p = F.itemPrice(run, it);
  const price = `<span class="iprice ${p === 0 ? 'free' : ''}">${p === 0 ? 'Gratuit' : '$' + p}</span>`;
  if (it.kind === 'charm') { const d = F.CHARMS[it.inst.id]; discover(it.inst.id); return `<button class="item tilt r-${d.rarity} ${it.inst.ed ? 'ed-' + it.inst.ed : ''}" data-k="item" data-i="${i}" style="--i:${i}">${charmIcon(it.inst.id)}<span class="iname">${esc(d.name)}</span>${price}</button>`; }
  if (it.kind === 'carte') return `<button class="item tilt" data-k="item" data-i="${i}" style="--i:${i}">${cardHTML(it.card)}<span class="iname">${esc(cardName(it.card))}</span>${price}</button>`;
  return `<button class="item tilt k-${it.kind}" data-k="item" data-i="${i}" style="--i:${i}">${consIcon(it.cons)}<span class="iname">${esc(F.consName(it.cons))}</span>${price}</button>`;
}
function renderShop() {
  const run = ui.run, s = run.shop;
  const items = s.items.map(itemHTML).join('');
  const packs = s.packs.map((pk, i) => {
    if (!pk) return '<div class="item sold"><div class="iname">Ouvert</div></div>';
    const P = F.PACKS[pk.type], S = F.PACK_SIZES[pk.size], p = F.packPrice(run, pk);
    return `<button class="item tilt" data-k="pack" data-i="${i}" style="--i:${i + 3}">${packArt(pk.type)}<span class="iname">${({ arcane: 'Arcanes', etoile: 'Étoiles', cartes: 'Cartes', charme: 'Porte-bonheur', spectre: 'Spectral' })[pk.type]}${S.name ? ' ' + S.name : ''}</span><span class="iprice ${p === 0 ? 'free' : ''}">${p === 0 ? 'Gratuit' : '$' + p}</span></button>`;
  }).join('');
  const vouchers = s.vouchers.map((v, i) => v ? `<button class="item tilt k-voucher" data-k="voucher" data-i="${i}" style="--i:${i + 5}">${sprite(SP.gem, 'ico')}<span class="iname">${esc(F.VOUCHERS[v].name)}</span><span class="iprice">$${F.voucherPrice(run)}</span></button>` : '').join('');
  const burnOk = run.deck.length > 20 && F.canAfford(run, run.burnCost);
  const rr = F.rerollCost(run);
  const B = F.blinds(run)[run.blindIdx];
  $('#shop').innerHTML = `
    <div class="shopL">
    <div class="shophead px"><h2>Boutique</h2><span class="money">${run.money < 0 ? '-' : ''}$${Math.abs(run.money)}</span></div>
    <div class="sec px"><h3><span>Tes porte-bonheur ${run.charms.filter(x => x.ed !== 'negatif').length}/${F.baseSlots(run)}</span><span>consommables ${run.consumables.length}/${F.consSlots(run)}</span></h3>
      <div class="slots" id="shopSlots"></div><div class="cons" id="shopCons"></div></div>
    <div class="sec px serv"><h3><span>Services</span><span>${run.deck.length} cartes</span></h3><div class="services">
      <button class="btn b-red mini" id="sBurn" ${burnOk ? '' : 'disabled'}>Brûler une carte · $${run.burnCost}${run.deck.length <= 20 ? ' (min 20)' : ''}</button>
      <button class="btn b-grey mini" id="sDeck">Mon paquet</button>
    </div></div>
    </div>
    <div class="shopR">
    <div class="sec px"><h3><span>Articles</span><span>${s.freeRerolls ? s.freeRerolls + ' relance gratuite' : ''}</span></h3><div class="items" style="--n:${Math.min(4, s.items.length)}">${items}</div>
      <button class="btn b-purple mini" id="sRoll" ${F.canAfford(run, rr) ? '' : 'disabled'}>Relancer les articles · ${rr === 0 ? 'gratuit' : '$' + rr}</button></div>
    <div class="sec px"><h3><span>Paquets</span><span>${vouchers ? 'Talisman' : ''}</span></h3><div class="items" style="--n:${s.packs.length + s.vouchers.filter(Boolean).length}">${packs}${vouchers}</div></div>
    </div>
    <div class="shopfoot"><button class="btn ${B.boss ? 'b-red' : 'b-gold'}" id="sNext">Table suivante<small>${esc(B.name)} · objectif ${fmt(B.target)}</small></button></div>`;
  renderSlots($('#shopSlots'), { prices: true });
  renderCons($('#shopCons'));
  const root = $('#shop');
  root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => openShopItem(b.dataset.k, +b.dataset.i)));
  $('#sBurn').onclick = () => pickCard('Brûler une carte', `Retire définitivement une carte de ton paquet ($${run.burnCost}).`, id => { if (F.shopBuy(run, 'burn', 0, id)) { Snd.glass(); afterChange(); } });
  $('#sRoll').onclick = () => { if (F.shopBuy(run, 'reroll')) { Snd.deal(); Snd.coin(); afterChange(); } };
  $('#sDeck').onclick = () => openDeck('deck');
  $('#sNext').onclick = () => { Snd.click(); F.leaveShop(run); showSelect(); };
}
function openShopItem(kind, i) {
  const run = ui.run, s = run.shop;
  Snd.click();
  let head = '', desc = '', price = 0, note = '', buyLabel = 'Acheter', canUse = false, extra = '';
  if (kind === 'item') {
    const it = s.items[i]; price = F.itemPrice(run, it);
    if (it.kind === 'charm') {
      head = charmHead(it.inst, 'porte-bonheur'); desc = F.charmDesc(run, it.inst); extra = charmExtra(it.inst);
      if (!F.charmRoom(run, it.inst)) note = 'Tous tes emplacements sont pleins : vends un porte-bonheur d\'abord.';
    } else if (it.kind === 'carte') {
      head = `<div class="sh-head"><div class="sh-icon">${cardHTML(it.card)}</div><div><div class="sh-name">${esc(cardName(it.card))}</div><div class="sh-rar">Carte à jouer</div></div></div>`;
      desc = 'S\'ajoute à ton paquet.'; extra = `<div class="sh-extra">${cardDesc(it.card)}</div>`;
    } else {
      const d = F.consDef(it.cons);
      head = `<div class="sh-head"><div class="sh-icon" style="color:${it.kind === 'etoile' ? 'var(--gold)' : it.kind === 'spectre' ? 'var(--cyan)' : '#d6a8ff'}">${consIcon(it.cons)}</div><div><div class="sh-name">${esc(d.name)}</div><div class="sh-rar">${KIND_NAME[it.kind]}</div></div></div>`;
      desc = d.desc; if (it.kind === 'etoile') extra = `<div class="sh-extra">${levelLine(run, d.type)}</div>`;
      canUse = true;
      if (!F.consRoom(run)) note = 'Plus de place pour les consommables : utilise-le directement.';
    }
  } else if (kind === 'pack') {
    const pk = s.packs[i], P = F.PACKS[pk.type], S = F.PACK_SIZES[pk.size];
    price = F.packPrice(run, pk);
    head = `<div class="sh-head"><div class="sh-icon">${packArt(pk.type)}</div><div><div class="sh-name">${esc(P.name)}${S.name ? ' ' + S.name : ''}</div><div class="sh-rar">Paquet</div></div></div>`;
    desc = `Ouvre-le pour choisir ${S.pick} carte${S.pick > 1 ? 's' : ''} parmi ${S.n[P.kind]}.`; buyLabel = 'Ouvrir';
  } else {
    const v = s.vouchers[i], V = F.VOUCHERS[v]; price = F.voucherPrice(run);
    head = `<div class="sh-head"><div class="sh-icon" style="color:#ff9f1a">${sprite(SP.gem)}</div><div><div class="sh-name">${esc(V.name)}</div><div class="sh-rar" style="color:#ff9f1a">Talisman · permanent</div></div></div>`;
    desc = V.desc + '.'; if (V.req) extra = `<div class="sh-extra">Amélioration de ${esc(F.VOUCHERS[V.req].name)}.</div>`;
  }
  const afford = F.canAfford(run, price);
  if (!afford) note = `Il te manque $${price - run.money}.`;
  sheet(`${head}<div class="sh-desc">${esc(desc)}</div>${extra}${note ? `<div class="sh-note">${esc(note)}</div>` : ''}
    <div class="btnrow"><button class="btn b-grey" id="shClose">Fermer</button>
    ${canUse ? `<button class="btn b-cyan" id="shUse" ${afford ? '' : 'disabled'}>Utiliser $${price}</button>` : ''}
    <button class="btn b-green" id="shBuy" ${note ? 'disabled' : ''}>${buyLabel} ${price ? '$' + price : ''}</button></div>`,
    sh => {
      sh.querySelector('#shClose').onclick = closeSheet;
      const use = sh.querySelector('#shUse');
      if (use) use.onclick = () => { closeSheet(); useConsUI(s.items[i].cons, i); };
      sh.querySelector('#shBuy').onclick = () => {
        if (!F.shopBuy(run, kind, i)) { toast('Achat impossible', 'charm'); return; }
        Snd.coin(); closeSheet();
        if (kind === 'pack') { openPackUI(() => { renderShop(); persist(); }); return; }
        afterChange();
      };
    });
}

/* ---------- Écrans de départ ---------- */
const DECK_IDS = Object.keys(F.DECKS);
const DECK_COL = { rouge: ['#99133a', '#e2234b'], bleu: ['#0a6b99', '#1f8fe0'], jaune: ['#9c7400', '#e9a800'], vert: ['#138a46', '#1fbf63'], noir: ['#141020', '#3a3352'], magique: ['#5b2aa8', '#8a4be6'],
  nebuleuse: ['#20104a', '#5ff0ff'], fantome: ['#0b5c66', '#bfa6ff'], abandonne: ['#3f3a4d', '#8b8496'], damier: ['#e2234b', '#141020'], zodiaque: ['#9c7400', '#5b2aa8'], peint: ['#ff8fc8', '#33c4ff'],
  anaglyphe: ['#ff3b6b', '#33c4ff'], plasma: ['#5b2aa8', '#ff5ad9'], erratique: ['#3ef08a', '#ff9f1a'] };
function deckUnlocked(id) { const u = F.DECKS[id].unlock; if (!u) return true; if (u.win) return prog.wins > 0; return prog.maxAnte >= u.ante; }
function deckLockText(id) { const u = F.DECKS[id].unlock; return u.win ? 'Gagne une partie pour le débloquer' : `Atteins l'ante ${u.ante} pour le débloquer`; }
function showSetup() {
  show('setup'); BG.set('normal');
  const st = ui.setup;
  st.stake = Math.min(st.stake, prog.stakeMax);
  const render = () => {
    const id = DECK_IDS[st.deck], D = F.DECKS[id], ok = deckUnlocked(id), col = DECK_COL[id];
    const S = F.STAKES[st.stake];
    $('#setup').innerHTML = `<h2>Nouvelle partie</h2>
      <div class="deckpick px"><button class="btn b-grey" id="dPrev" aria-label="Paquet précédent">←</button>
        <div class="deckcard"><div class="deckart ${ok ? '' : 'locked'}" style="--a:${col[0]};--b:${col[1]}"></div><div class="deckname">${esc(D.name)}</div><div class="deckdesc">${ok ? esc(D.desc) : esc(deckLockText(id))}</div><small style="color:var(--dim)">${st.deck + 1} / ${DECK_IDS.length}</small></div>
        <button class="btn b-grey" id="dNext" aria-label="Paquet suivant">→</button></div>
      <div class="px" style="padding:12px;display:grid;gap:8px"><div style="text-align:center;font-weight:700">Mise</div>
        <div class="stakes">${F.STAKES.map((s, i) => `<button class="stake ${i === st.stake ? 'sel' : ''}" data-s="${i}" style="--sc:${s.color}" ${i > prog.stakeMax ? 'disabled' : ''} aria-label="${esc(s.name)}"></button>`).join('')}</div>
        <div class="stakeinfo"><b style="color:${S.color}">${esc(S.name)}</b><br>${st.stake === 0 ? esc(S.desc) : 'Cumule : ' + F.STAKES.slice(1, st.stake + 1).map(x => esc(x.desc)).join(' · ')}</div></div>
      <div class="btnrow"><button class="btn b-grey" id="sBack">Retour</button><button class="btn b-gold" id="sGo" ${ok ? '' : 'disabled'}>Commencer</button></div>`;
    $('#dPrev').onclick = () => { st.deck = (st.deck + DECK_IDS.length - 1) % DECK_IDS.length; Snd.click(); render(); };
    $('#dNext').onclick = () => { st.deck = (st.deck + 1) % DECK_IDS.length; Snd.click(); render(); };
    document.querySelectorAll('.stake').forEach(b => { b.onclick = () => { st.stake = +b.dataset.s; Snd.click(); render(); }; });
    $('#sBack').onclick = () => toTitle();
    $('#sGo').onclick = () => { Snd.init(); Snd.big(); newGame(id, st.stake); };
  };
  render();
}
function newGame(deck, stake) {
  ui.run = F.newRun({ deck, stake });
  Store.del('run');
  showSelect();
}
/* ---------- Compteur d'images par seconde ---------- */
// Mesure en continu (une seule requête d'image par frame, coût négligeable).
// stats() est aussi utilisé par les tests automatiques.
const FPS = {
  el: null, frames: 0, t0: 0, last: 0, worst: 0, now: 0, low: 0, hist: [],
  start() {
    const tick = t => {
      if (this.last) { const dt = t - this.last; this.worst = Math.max(this.worst, dt); this.hist.push(dt); if (this.hist.length > 600) this.hist.shift(); }
      this.last = t; this.frames++;
      if (!this.t0) this.t0 = t;
      if (t - this.t0 >= 500) {
        this.now = this.frames * 1000 / (t - this.t0); this.low = 1000 / Math.max(this.worst, 1);
        if (this.el) { this.el.textContent = `${Math.round(this.now)} FPS · min ${Math.round(this.low)}`; this.el.className = this.now >= 55 ? 'ok' : this.now >= 40 ? 'mid' : 'bad'; }
        this.frames = 0; this.t0 = t; this.worst = 0;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    this.show(opts.fps);
  },
  show(on) {
    if (on && !this.el) { this.el = document.createElement('div'); this.el.id = 'fpsMeter'; this.el.textContent = '-- FPS'; document.body.appendChild(this.el); }
    if (!on && this.el) { this.el.remove(); this.el = null; }
  },
  reset() { this.hist = []; },
  stats() {
    const h = this.hist.slice().sort((a, b) => a - b), n = h.length;
    if (!n) return { frames: 0 };
    const avg = h.reduce((a, b) => a + b, 0) / n;
    return { frames: n, fps: +(1000 / avg).toFixed(1), p1Low: +(1000 / h[Math.min(n - 1, Math.floor(n * .99))]).toFixed(1), worstMs: +h[n - 1].toFixed(1), over20ms: h.filter(x => x > 20).length };
  },
};
function fpsLabel() { return opts.fps ? 'Compteur FPS : affiché' : 'Compteur FPS : masqué'; }
function soundLabel() { return opts.sound ? 'Son : activé' : 'Son : coupé'; }
function openOptions(inRun) {
  Snd.click();
  modal(`<h2>Options</h2>
    <div style="display:grid;gap:8px;text-align:left"><b>Vitesse des animations</b>
      <div class="btnrow">${[1, 2, 3, 4].map(v => `<button class="btn ${opts.speed === v ? 'b-purple' : 'b-grey'} mini" data-sp="${v}">×${v}</button>`).join('')}</div></div>
    <button class="btn b-grey" id="oSound">${soundLabel()}</button>
    <button class="btn b-grey" id="oFps">${fpsLabel()}</button>
    ${inRun ? '<button class="btn b-purple" id="oHow">Comment jouer</button><button class="btn b-red" id="oQuit">Abandonner la partie</button><button class="btn b-grey" id="oTitle">Sauvegarder et quitter</button>' : ''}
    <button class="btn b-gold" id="mClose">Fermer</button>`,
    m => {
      m.querySelectorAll('[data-sp]').forEach(b => { b.onclick = () => { opts.speed = +b.dataset.sp; saveOpts(); applySpeed(); openOptions(inRun); }; });
      m.querySelector('#oSound').onclick = () => { opts.sound = !opts.sound; saveOpts(); Snd.init(); Snd.click(); openOptions(inRun); };
      m.querySelector('#oFps').onclick = () => { opts.fps = !opts.fps; saveOpts(); FPS.show(opts.fps); Snd.click(); openOptions(inRun); };
      m.querySelector('#mClose').onclick = closeModal;
      if (inRun) {
        m.querySelector('#oHow').onclick = howTo;
        m.querySelector('#oTitle').onclick = () => { persist(); closeModal(); toTitle(); };
        m.querySelector('#oQuit').onclick = () => {
          modal(`<h2 class="bad">Abandonner ?</h2><p>La partie en cours sera perdue.</p><div class="btnrow"><button class="btn b-grey" id="nNo">Non</button><button class="btn b-red" id="nYes">Abandonner</button></div>`,
            mm => { mm.querySelector('#nNo').onclick = () => openOptions(true); mm.querySelector('#nYes').onclick = () => { Store.del('run'); closeModal(); ui.busy = false; toTitle(); }; });
        };
      }
    });
}
function toTitle() {
  show('title'); BG.set('normal');
  $('#bContinue').hidden = !Store.get('run', null);
  $('#record').textContent = prog.maxAnte ? `Record : ante ${prog.maxAnte} · meilleure main ${fmt(prog.bestHand)}${prog.wins ? ' · ' + prog.wins + ' victoire' + (prog.wins > 1 ? 's' : '') : ''}` : '';
  $('#titleCards').innerHTML = [{ id: 't1', rank: 1, suit: 'S', ed: 'prisme' }, { id: 't2', rank: 13, suit: 'H', enh: 'or', seal: 'rouge' }, { id: 't3', rank: 7, suit: 'D', enh: 'feu' }]
    .map((c, i) => cardHTML(c).replace('class="card', `style="--i:${i}" class="card`)).join('');
}
function continueGame() {
  const s = Store.get('run', null); if (!s) return;
  const run = F.load(s); if (!run) { Store.del('run'); toTitle(); return; }
  ui.run = run;
  if (run.phase === 'shop' && run.shop) return showShop();
  if (run.phase === 'ready' && run.blind) {
    show('game'); BG.set(run.blind.boss ? 'boss' : 'normal');
    run.hands = []; run.dealer = null;
    $('#dRow').innerHTML = ''; $('#hands').innerHTML = '';
    setBox(0, 0, ''); setMsg('Partie reprise', 'info');
    renderGame(); requestAnimationFrame(fitCards); return;
  }
  run.phase = 'select'; showSelect();
}
function howTo() {
  Snd.click();
  modal(`<h2>Comment jouer</h2>
    <div class="howto">
      <p>Bats le croupier au blackjack pour atteindre l'<b>objectif</b> de chaque table avant d'être à court de mains. Chaque ante a 3 tables : petite, grande, puis un boss. Bats les 8 antes pour gagner.</p>
      <h3>Score d'une main</h3>
      <p><span class="c">Jetons</span> × <span class="m">Mult</span>. Ta main a un <b>type</b> (Paire, Couleur, Suite, 21, Charlie, Brelan, Blackjack, Couleur 21, Triple Sept…) qui donne la base, puis chaque carte ajoute sa valeur en jetons. Victoire : 100 %, égalité : 50 %, défaite ou bust : 0.</p>
      <h3>Actions</h3>
      <p><b>Tirer</b>, <b>Rester</b>, <b>Doubler</b> (une carte, ×2 Mult), <b>Séparer</b> une paire. Le croupier tire jusqu'à 17. <b>Jeter</b> retire ta dernière carte (2 jets par table) et te sauve d'un bust.</p>
      <h3>Passer une table</h3>
      <p>Tu peux passer la petite ou la grande table pour gagner un <b>badge</b> (argent, paquet gratuit, porte-bonheur rare…). Mais tu rates les gains et la boutique.</p>
      <h3>Boutique</h3>
      <p><b>Porte-bonheur</b> : se déclenchent de gauche à droite. <b>Arcanes</b> : modifient les cartes de ton paquet. <b>Étoiles</b> : montent un type de main. <b>Spectres</b> : puissants mais risqués. <b>Paquets</b> : choisis parmi plusieurs cartes. <b>Talismans</b> : bonus permanents.</p>
      <h3>Cartes spéciales</h3>
      <p>Améliorations (Bonus, Feu, Verre, Or, Fantôme, Pierre, Chance, Caméléon, Élastique), éditions (Brillant, Holographique, Prismatique, Négatif) et sceaux (rouge, doré, bleu, violet).</p>
      <h3>Argent</h3>
      <p>Gain de la table, $1 par main non utilisée, et $1 d'intérêts par tranche de $5 (max $5).</p>
      <h3>Astuces</h3>
      <p>Le type de ta main s'affiche sous ton total : vise les Couleurs et les Suites. Le bouton Paquet montre ce qu'il reste dans ta pioche. Touche l'écran pendant le calcul pour accélérer.</p>
    </div>
    <button class="btn b-gold" id="mClose">Compris</button>`, m => { m.querySelector('#mClose').onclick = closeModal; });
}
function openCollection(tab) {
  Snd.click();
  tab = tab || 'charms';
  const tabs = [['charms', 'Porte-bonheur'], ['cons', 'Cartes'], ['boss', 'Boss'], ['tags', 'Badges'], ['vouch', 'Talismans']];
  let body = '';
  const fake = { stake: 0, deckId: 'rouge', charms: [], deck: [], money: 0, tf: {}, stats: {}, handPlays: {} };
  if (tab === 'charms') {
    const ids = F.CHARM_IDS.slice().sort((a, b) => 'curl'.indexOf(F.CHARMS[a].rarity) - 'curl'.indexOf(F.CHARMS[b].rarity));
    const seen = ids.filter(id => prog.seen[id]).length;
    body = `<p>${seen} / ${ids.length} découverts</p><div class="colgrid">${ids.map(id => { const d = F.CHARMS[id], s = prog.seen[id]; return `<button class="colitem r-${d.rarity} ${s ? '' : 'unseen'}" data-id="${id}">${charmIcon(id)}<span>${s ? esc(d.name) : '???'}</span></button>`; }).join('')}</div>`;
  } else if (tab === 'cons') {
    const g = (kind, src) => Object.keys(src).map(id => `<button class="colitem" data-cons="${kind}:${id}" style="--rc:${kind === 'etoile' ? 'var(--gold)' : kind === 'spectre' ? 'var(--cyan)' : 'var(--purple)'}"><span style="color:${kind === 'etoile' ? 'var(--gold)' : kind === 'spectre' ? 'var(--cyan)' : '#d6a8ff'};display:contents">${consIcon({ kind, id })}</span><span>${esc(src[id].name)}</span></button>`).join('');
    body = `<h3 style="margin:0;color:#d6a8ff">Arcanes</h3><div class="colgrid">${g('arcane', F.ARCANES)}</div><h3 style="margin:0;color:var(--gold)">Étoiles</h3><div class="colgrid">${g('etoile', F.ETOILES)}</div><h3 style="margin:0;color:var(--cyan)">Spectres</h3><div class="colgrid">${g('spectre', F.SPECTRES)}</div>`;
  } else if (tab === 'boss') {
    body = `<div class="kv">${Object.values(F.BOSSES).map(b => `<span style="color:${b.final ? 'var(--gold)' : '#ff8095'}">${esc(b.name)}${b.final ? ' (final)' : ''}</span><span style="font-family:var(--f-text);font-size:13px;color:var(--dim);text-align:right">${esc(b.rule)}</span>`).join('')}</div>`;
  } else if (tab === 'tags') {
    body = `<div class="kv">${Object.values(F.TAGS).map(t => `<span style="color:var(--cyan)">${esc(t.name)}</span><span style="font-family:var(--f-text);font-size:13px;color:var(--dim);text-align:right">${esc(t.desc)}</span>`).join('')}</div>`;
  } else {
    body = `<div class="kv">${Object.values(F.VOUCHERS).map(v => `<span style="color:#ff9f1a">${esc(v.name)}</span><span style="font-family:var(--f-text);font-size:13px;color:var(--dim);text-align:right">${esc(v.desc)}</span>`).join('')}</div>
      <h3 style="margin:8px 0 0">Paquets de départ</h3><div class="kv">${Object.keys(F.DECKS).map(id => `<span>${esc(F.DECKS[id].name)}${deckUnlocked(id) ? '' : ' (verrouillé)'}</span><span style="font-family:var(--f-text);font-size:13px;color:var(--dim);text-align:right">${esc(F.DECKS[id].desc)}</span>`).join('')}</div>`;
  }
  modal(`<h2>Collection</h2><div class="tabs">${tabs.map(([k, n]) => `<button class="btn ${tab === k ? 'b-purple' : 'b-grey'}" data-t="${k}">${n}</button>`).join('')}</div>${body}<button class="btn b-gold" id="mClose">Fermer</button>`,
    m => {
      m.querySelectorAll('[data-t]').forEach(b => { b.onclick = () => openCollection(b.dataset.t); });
      m.querySelector('#mClose').onclick = closeModal;
      m.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id, d = F.CHARMS[id];
        if (!prog.seen[id]) { sheet(`<div class="sh-name">???</div><div class="sh-desc">Trouve ce porte-bonheur en partie pour le découvrir.</div><button class="btn b-purple" id="shClose">Fermer</button>`, s => { s.querySelector('#shClose').onclick = closeSheet; }); return; }
        sheet(`<div class="sh-head r-${d.rarity}"><div class="sh-icon">${charmIcon(id)}</div><div><div class="sh-name">${esc(d.name)}</div><div class="sh-rar">${RAR[d.rarity]} · $${d.price}</div></div></div><div class="sh-desc">${esc(d.desc)}</div><button class="btn b-purple" id="shClose">Fermer</button>`, s => { s.querySelector('#shClose').onclick = closeSheet; });
      }));
      m.querySelectorAll('[data-cons]').forEach(b => b.addEventListener('click', () => {
        const [kind, id] = b.dataset.cons.split(':'); const d = F.consDef({ kind, id });
        sheet(`<div class="sh-name">${esc(d.name)}</div><div class="sh-rar">${KIND_NAME[kind]}</div><div class="sh-desc">${esc(d.desc)}</div><button class="btn b-purple" id="shClose">Fermer</button>`, s => { s.querySelector('#shClose').onclick = closeSheet; });
      }));
      void fake;
    });
}

/* ---------- Démarrage ---------- */
function boot() {
  applySpeed();
  BG.init();
  $('#bPlay').onclick = () => { Snd.init(); Snd.click(); showSetup(); };
  $('#bContinue').onclick = () => { Snd.init(); Snd.click(); continueGame(); };
  $('#bHow').onclick = () => { Snd.init(); howTo(); };
  $('#bCollection').onclick = () => { Snd.init(); openCollection(); };
  $('#bOptionsT').onclick = () => { Snd.init(); openOptions(false); };
  $('#bDeck').onclick = () => { if (ui.busy || $('#modalWrap').classList.contains('on')) return; openDeck('deck'); };
  $('#bOptions').onclick = () => { if (ui.busy) return; openOptions(true); };
  $('#game').addEventListener('pointerdown', e => { if (ui.busy && !e.target.closest('button')) ui.fast = true; });
  window.addEventListener('resize', fitCards);
  FPS.start();
  toTitle();
}
boot();
window.__f21 = { FPS, BG, ui, F, showShop, showSelect, renderGame, openDeck, dealFlow, toTitle, startTableUI, openPackUI, prog };
})();
