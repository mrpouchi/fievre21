/* ===================== FIÈVRE 21 — MOTEUR v2 ===================== */
(function (root) {
'use strict';
const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.F21D;
const { HAND_TYPES, HAND_TYPE_IDS, TWENTYONE_TYPES, ETOILES, ENH, ENH_IDS, EDITIONS, SEALS, CHARMS, CHARM_IDS, ARCANES, SPECTRES, BOSSES, TAGS, VOUCHERS, PACKS, PACK_SIZES } = D;

const SUITS = ['H', 'D', 'S', 'C'];
const SUIT_SYM = { H: '♥', D: '♦', S: '♠', C: '♣' };
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];

const CONFIG = {
  anteBase: [20, 60, 160, 350, 750, 1400, 2500, 4300],
  endlessGrowth: 1.9,
  blindMult: [1, 1.5, 2],
  hands: 4, jets: 2, startMoney: 4,
  rewards: [3, 4, 5], finalReward: 8,
  interestCap: 5, reroll: 3, burn: 3,
  shopSlots: 2, consSlots: 2, charmSlots: 5,
  rarityW: { c: 70, u: 25, r: 5 },
  shopW: { charm: 20, arcane: 4, etoile: 4, carte: 4, spectre: 2 },
  ed: { brillant: 0.02, holo: 0.014, prisme: 0.003, negatif: 0.003 },
  winAnte: 8,
};

/* ---------- Hasard sérialisable ---------- */
function attachRng(run) {
  Object.defineProperty(run, 'rng', {
    configurable: true, enumerable: false,
    value: function () {
      let a = run.rs | 0; a = (a + 0x6D2B79F5) | 0; run.rs = a;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  });
}
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function wpick(entries, rng) {
  const tot = entries.reduce((s, e) => s + e[1], 0); let x = rng() * tot;
  for (const e of entries) { x -= e[1]; if (x <= 0) return e[0]; }
  return entries[entries.length - 1][0];
}
const r2 = x => Math.round(x * 100) / 100;

/* ---------- Petits utilitaires ---------- */
const hasV = (run, id) => run.vouchers.includes(id);
function has(run, id) { return run.charms.some(i => i.id === id && !i.off && !i.dead); }
function countCharm(run, id) { return run.charms.filter(i => i.id === id && !i.off && !i.dead).length; }
function bossActive(run, id) { return !!(run.blind && run.blind.boss === id && !run.tf.bossOff && !has(run, 'kraken')); }
function activeBoss(run) { return run.blind && run.blind.boss && !run.tf.bossOff && !has(run, 'kraken') ? run.blind.boss : null; }
function probMult(run) { return Math.pow(2, countCharm(run, 'depipe')); }
function debtLimit(run) { return has(run, 'credit') ? -20 : 0; }
function canAfford(run, p) { return p <= 0 || run.money - p >= debtLimit(run); }

function isSuit(run, c, s) {
  if (!s || c.enh === 'pierre') return false;
  if (c.enh === 'cameleon') return true;
  if (has(run, 'barbouille')) { const red = s === 'H' || s === 'D'; return red === (c.suit === 'H' || c.suit === 'D'); }
  return c.suit === s;
}
const isFace = (run, c) => c.enh !== 'pierre' && (c.rank >= 11 || has(run, 'pareidolie'));
const rankIs = (run, c, r) => c.enh !== 'pierre' && c.rank === r;
function isDebuffed(run, c) {
  const b = activeBoss(run); if (!b || run.phase === 'shop' || run.phase === 'select') return false;
  if (b === 'gel') return !run.tf.gelBroken;
  const s = BOSSES[b].debuff;
  return s ? (c.enh !== 'pierre' && c.enh !== 'cameleon' && c.suit === s) : false;
}

function baseSlots(run) {
  return CONFIG.charmSlots + (run.deckId === 'noir' ? 1 : 0) - (run.deckId === 'peint' ? 1 : 0) + (hasV(run, 'doublefond') ? 1 : 0);
}
function maxSlots(run) { return baseSlots(run) + run.charms.filter(i => i.ed === 'negatif').length; }
function charmRoom(run, inst) { return inst && inst.ed === 'negatif' ? true : run.charms.filter(i => i.ed !== 'negatif').length < baseSlots(run); }
function consSlots(run) { return CONFIG.consSlots + (hasV(run, 'ceinture') ? 1 : 0) - (run.deckId === 'nebuleuse' ? 1 : 0); }
function consRoom(run) { return run.consumables.length < consSlots(run); }

function charmPrice(run, inst) {
  if (inst.stk && inst.stk.r) return 1;
  return CHARMS[inst.id].price + (inst.ed ? EDITIONS[inst.ed].price : 0);
}
function sellValue(run, inst) {
  if (inst.kind) return 1 + (inst.sell || 0);
  return Math.max(1, Math.floor(charmPrice(run, inst) / 2)) + (inst.sell || 0);
}
function mostPlayed(run) {
  let best = null, n = 0;
  for (const t of HAND_TYPE_IDS) if ((run.handPlays[t] || 0) > n) { n = run.handPlays[t]; best = t; }
  return best;
}
function log(run, msg, kind) { run.log.push({ msg, kind: kind || 'info' }); }

/* ---------- Cartes ---------- */
function newCard(run, rank, suit, enh, ed, seal) { return { id: 'c' + (run.nextId++), rank, suit, enh: enh || null, ed: ed || null, seal: seal || null, bonus: 0 }; }
function addCard(run, card) {
  run.deck.push(card);
  run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.onCardAdded && !i.dead) d.onCardAdded(run, i, 1); });
  if (run.drawPile && run.phase !== 'shop' && run.phase !== 'select') run.drawPile.splice(Math.floor(run.rng() * (run.drawPile.length + 1)), 0, card);
}
function removeCards(run, cards) {
  const ids = new Set(cards.map(c => c.id));
  run.deck = run.deck.filter(c => !ids.has(c.id));
  if (run.drawPile) run.drawPile = run.drawPile.filter(c => !ids.has(c.id));
  run.stats.removed += cards.length;
  cards.forEach(card => run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.onCardRemoved && !i.dead) d.onCardRemoved(run, i, card); }));
}
function randomEnhanced(run, ranks) { return newCard(run, pick(ranks, run.rng), pick(SUITS, run.rng), pick(ENH_IDS, run.rng)); }

/* ---------- Porte-bonheur ---------- */
function newCharm(run, id, opts) {
  const inst = { uid: 'h' + (run.nextId++), id, ed: null, stk: {}, st: {}, sell: 0 };
  if (opts && opts.ed) inst.ed = opts.ed;
  return inst;
}
function rollEdition(run, allowNeg) {
  const m = hasV(run, 'eclat') ? 4 : hasV(run, 'polissage') ? 2 : 1;
  const x = run.rng();
  let acc = 0;
  if (allowNeg) { acc += CONFIG.ed.negatif * (hasV(run, 'poche') ? 3 : 1); if (x < acc) return 'negatif'; }
  acc += CONFIG.ed.prisme * m; if (x < acc) return 'prisme';
  acc += CONFIG.ed.holo * m; if (x < acc) return 'holo';
  acc += CONFIG.ed.brillant * m; if (x < acc) return 'brillant';
  return null;
}
function charmPool(run, rarity, exclude) {
  const dup = has(run, 'saltimbanque');
  return CHARM_IDS.filter(id => {
    const d = CHARMS[id];
    if (d.rarity !== rarity) return false;
    if (d.pool && !d.pool(run)) return false;
    if (id === 'banane' && run.flags.bananeGone) return false;
    if (!dup && run.charms.some(i => i.id === id)) return false;
    if (exclude && exclude.includes(id)) return false;
    return true;
  });
}
function rollCharmId(run, rarity, exclude) {
  const r = rarity || wpick(Object.entries(CONFIG.rarityW), run.rng);
  let pool = charmPool(run, r, exclude);
  if (!pool.length) pool = charmPool(run, 'c', exclude);
  if (!pool.length) pool = ['ficelle'];
  return pick(pool, run.rng);
}
function rollShopCharm(run, rarity, exclude) {
  const inst = newCharm(run, rollCharmId(run, rarity, exclude));
  inst.ed = rollEdition(run, true);
  const x = run.rng();
  if (run.stake >= 3 && x < 0.3) inst.stk.e = true;
  else if (run.stake >= 6 && x < 0.6) inst.stk.p = 5;
  if (run.stake >= 7 && run.rng() < 0.3) inst.stk.r = true;
  return inst;
}
function addCharm(run, inst) { if (!charmRoom(run, inst)) return false; run.charms.push(inst); return true; }
function destroyCharm(run, inst) {
  if (inst.stk && inst.stk.e) return false;
  const k = run.charms.indexOf(inst); if (k < 0) return false;
  run.charms.splice(k, 1); return true;
}
function createCharm(run, rarity) {
  const inst = newCharm(run, rollCharmId(run, rarity));
  if (!addCharm(run, inst)) return null;
  return inst;
}

/* ---------- Consommables ---------- */
function newCons(run, kind, id) { return { uid: 'k' + (run.nextId++), kind, id, sell: 0 }; }
const consSrc = kind => kind === 'arcane' ? ARCANES : kind === 'etoile' ? ETOILES : SPECTRES;
function rollCons(run, kind) {
  const dup = has(run, 'saltimbanque');
  const src = consSrc(kind);
  const pool = Object.keys(src).filter(id => (kind !== 'spectre' || !src[id].rare) && (dup || !run.consumables.some(c => c.kind === kind && c.id === id)));
  return pick(pool.length ? pool : Object.keys(src).filter(id => !src[id].rare), run.rng);
}
function create(run, kind, id) {
  if (!consRoom(run)) return null;
  const c = newCons(run, kind, id || rollCons(run, kind));
  run.consumables.push(c);
  log(run, `${consName(c)} créé`, 'create');
  return c;
}
function consDef(c) { return consSrc(c.kind)[c.id]; }
function consName(c) { return consDef(c).name; }
function consPrice(c) { return c.kind === 'spectre' ? 4 : 3; }

/* ---------- Badges ---------- */
function addTag(run, id) {
  if (id !== 'double') {
    const doubles = run.tags.filter(t => t === 'double').length;
    run.tags = run.tags.filter(t => t !== 'double');
    for (let k = 0; k <= doubles; k++) run.tags.push(id);
    if (doubles) log(run, `Badge Double : ${TAGS[id].name} ×${doubles + 1}`, 'tag');
  } else run.tags.push('double');
  processTags(run, 'now');
}
function processTags(run, when) {
  const keep = [];
  for (const t of run.tags) {
    if (TAGS[t].when !== when) { keep.push(t); continue; }
    switch (t) {
      case 'economie': { const g = Math.min(40, Math.max(0, run.money)); run.money += g; log(run, `Badge Économie : +$${g}`, 'money'); break; }
      case 'main': run.money += run.stats.handsPlayed; log(run, `Badge Main : +$${run.stats.handsPlayed}`, 'money'); break;
      case 'gaspi': run.money += run.stats.jetsUnusedTotal; log(run, `Badge Gaspillage : +$${run.stats.jetsUnusedTotal}`, 'money'); break;
      case 'vitesse': run.money += 5 * run.stats.skips; log(run, `Badge Vitesse : +$${5 * run.stats.skips}`, 'money'); break;
      case 'orbital': { const ty = pick(HAND_TYPE_IDS, run.rng); run.levels[ty] += 3; log(run, `Badge Orbital : ${HAND_TYPES[ty].name} +3 niveaux`, 'level'); break; }
      case 'recharge': { let n = 0; for (let k = 0; k < 2; k++) if (createCharm(run, 'c')) n++; log(run, `Badge Recharge : ${n} porte-bonheur créé(s)`, 'create'); break; }
      case 'boss': run.boss = pickBoss(run, run.ante); log(run, `Badge Boss : nouveau boss, ${BOSSES[run.boss].name}`, 'tag'); break;
      case 'cartes': run.pendingPacks.push({ type: 'cartes', size: 'mega', free: true }); break;
      case 'arcanes': run.pendingPacks.push({ type: 'arcane', size: 'mega', free: true }); break;
      case 'etoiles': run.pendingPacks.push({ type: 'etoile', size: 'mega', free: true }); break;
      case 'charmes': run.pendingPacks.push({ type: 'charme', size: 'mega', free: true }); break;
      case 'spectral': run.pendingPacks.push({ type: 'spectre', size: 'normal', free: true }); break;
      default: keep.push(t); continue;
    }
  }
  run.tags = keep;
}
function consumeTag(run, id) { const k = run.tags.indexOf(id); if (k < 0) return false; run.tags.splice(k, 1); return true; }

/* ---------- Partie ---------- */
function newRun(opts) {
  opts = opts || {};
  const seed = opts.seed != null ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967296);
  const run = {
    v: 2, seed, rs: seed, deckId: opts.deck || 'rouge', stake: opts.stake || 0,
    ante: 1, blindIdx: 0, money: CONFIG.startMoney, deck: [], charms: [], consumables: [], vouchers: [], tags: [],
    levels: {}, handPlays: {}, streak: 0, nextId: 1, burnCost: CONFIG.burn, jetsMod: 0,
    flags: {}, tf: {}, log: [], pendingPacks: [], bossesSeen: {}, skipped: [],
    stats: { bestHand: 0, bestType: '', handsWon: 0, handsPlayed: 0, arcanes: 0, etoiles: 0, etoilesSeen: {}, blackjacks: 0, skips: 0, removed: 0, jetsUnusedTotal: 0, tables: 0, sold: 0, maxAnte: 1 },
    lastCons: null, phase: 'select', won: false, firstShop: true,
  };
  attachRng(run);
  HAND_TYPE_IDS.forEach(t => { run.levels[t] = 1; run.handPlays[t] = 0; });
  const dk = run.deckId;
  for (const s of SUITS) for (let r = 1; r <= 13; r++) {
    if (dk === 'abandonne' && r >= 11) continue;
    if (dk === 'erratique') { run.deck.push(newCard(run, 1 + Math.floor(run.rng() * 13), pick(SUITS, run.rng))); continue; }
    run.deck.push(newCard(run, r, dk === 'damier' ? ((s === 'H' || s === 'D') ? 'H' : 'S') : s));
  }
  if (dk === 'jaune') run.money += 10;
  if (dk === 'magique') { run.vouchers.push('ceinture'); run.consumables.push(newCons(run, 'arcane', 'echo'), newCons(run, 'arcane', 'echo')); }
  if (dk === 'nebuleuse') run.vouchers.push('telescope');
  if (dk === 'zodiaque') run.vouchers.push('cartomancie', 'astrologie', 'vitrine');
  if (dk === 'fantome') run.consumables.push(newCons(run, 'spectre', 'malediction'));
  newAnte(run);
  return run;
}
function pickBoss(run, ante) {
  const final = ante > 0 && ante % CONFIG.winAnte === 0;
  let pool = Object.keys(BOSSES).filter(id => final ? BOSSES[id].final : (!BOSSES[id].final && (BOSSES[id].min || 1) <= Math.max(1, ante)));
  const minSeen = Math.min(...pool.map(id => run.bossesSeen[id] || 0));
  let p2 = pool.filter(id => (run.bossesSeen[id] || 0) === minSeen && id !== run.boss);
  if (!p2.length) p2 = pool.filter(id => id !== run.boss);
  const b = pick(p2.length ? p2 : pool, run.rng);
  run.bossesSeen[b] = (run.bossesSeen[b] || 0) + 1;
  return b;
}
function pickTag(run) { return pick(Object.keys(TAGS).filter(id => (TAGS[id].min || 1) <= run.ante), run.rng); }
function pickVoucher(run, exclude) {
  const pool = Object.keys(VOUCHERS).filter(id => !hasV(run, id) && (!VOUCHERS[id].req || hasV(run, VOUCHERS[id].req)) && !(exclude || []).includes(id));
  return pool.length ? pick(pool, run.rng) : null;
}
function newAnte(run) {
  run.boss = pickBoss(run, run.ante);
  run.anteTags = [pickTag(run), pickTag(run)];
  run.anteVoucher = pickVoucher(run);
  run.bossRerolls = 0;
  run.skipped = [];
  run.stats.maxAnte = Math.max(run.stats.maxAnte, run.ante);
}
function canRerollBoss(run) {
  if (hasV(run, 'remontage')) return canAfford(run, 10);
  if (hasV(run, 'montage')) return run.bossRerolls < 1 && canAfford(run, 10);
  return false;
}
function rerollBoss(run) { if (!canRerollBoss(run)) return false; run.money -= 10; run.bossRerolls++; run.boss = pickBoss(run, run.ante); return true; }

function anteBase(run, a) {
  const B = CONFIG.anteBase;
  let v = a < 1 ? B[0] * 0.6 : a <= B.length ? B[a - 1] : B[B.length - 1] * Math.pow(CONFIG.endlessGrowth + 0.05 * (a - B.length), a - B.length);
  if (run.stake >= 5) v *= 1 + 0.3 * Math.max(0, a - 1);
  else if (run.stake >= 2) v *= 1 + 0.15 * Math.max(0, a - 1);
  return v;
}
function niceRound(v) { if (v < 100) return Math.round(v / 5) * 5; const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1); return Math.round(v / mag) * mag; }
function blindTarget(run, idx, bossId) {
  let t = anteBase(run, run.ante) * CONFIG.blindMult[idx];
  if (idx === 2) { const b = BOSSES[bossId || run.boss]; if (b.mult && !has(run, 'kraken')) t *= b.mult; }
  if (run.deckId === 'plasma') t *= 2;
  return niceRound(t);
}
function blindReward(run, idx) {
  if (idx === 0) return run.stake >= 1 ? 0 : CONFIG.rewards[0];
  if (idx === 2 && BOSSES[run.boss].final) return CONFIG.finalReward;
  return CONFIG.rewards[idx];
}
function blinds(run) {
  return [0, 1, 2].map(i => ({
    idx: i, kind: ['small', 'big', 'boss'][i], name: i === 0 ? 'Petite table' : i === 1 ? 'Grande table' : BOSSES[run.boss].name,
    target: blindTarget(run, i), reward: blindReward(run, i), tag: i < 2 ? run.anteTags[i] : null, boss: i === 2 ? run.boss : null,
    state: i < run.blindIdx ? (run.skipped.includes(i) ? 'skipped' : 'done') : i === run.blindIdx ? 'current' : 'upcoming',
  }));
}
function skipBlind(run) {
  if (run.blindIdx > 1) return false;
  const tag = run.anteTags[run.blindIdx];
  run.skipped.push(run.blindIdx);
  run.stats.skips++;
  run.blindIdx++;
  log(run, `${TAGS[tag].name} obtenu`, 'tag');
  addTag(run, tag);
  return tag;
}

/* ---------- Table ---------- */
function startTable(run) {
  const idx = run.blindIdx;
  run.blind = { idx, kind: ['small', 'big', 'boss'][idx], boss: idx === 2 ? run.boss : null, target: blindTarget(run, idx), reward: blindReward(run, idx) };
  run.target = run.blind.target;
  run.score = 0;
  const live = run.deck.filter(k => k.enh !== 'pierre');
  const ik = live.length ? pick(live, run.rng) : null;
  run.tf = { types: {}, wins: 0, cards: 0, jetsUsed: 0, firstBust: true, bossOff: false, gelBroken: false, mouth: null, hand: 0,
    todo: pick(HAND_TYPE_IDS.filter(t => t !== 'septs' && t !== 'couleur21'), run.rng), relique: pick(SUITS, run.rng), chateau: pick(SUITS, run.rng),
    idole: ik ? { rank: ik.rank, suit: ik.suit } : null };
  let hands = CONFIG.hands + (run.deckId === 'bleu' ? 1 : 0) - (run.deckId === 'noir' ? 1 : 0) + (hasV(run, 'endurance') ? 1 : 0) + (hasV(run, 'marathon') ? 1 : 0) - (hasV(run, 'sablier') ? 1 : 0)
    + countCharm(run, 'mainpleine') + 2 * countCharm(run, 'cambrioleur');
  let jets = CONFIG.jets + (run.deckId === 'rouge' ? 1 : 0) + (run.deckId === 'peint' ? 2 : 0) + (hasV(run, 'ferraille') ? 1 : 0) + (hasV(run, 'recyclerie') ? 1 : 0) - (hasV(run, 'clepsydre') ? 1 : 0)
    + 2 * countCharm(run, 'ferrailleur') + countCharm(run, 'pilier') - countCharm(run, 'cascadeur') - (run.stake >= 4 ? 1 : 0) + run.jetsMod;
  if (consumeTag(run, 'jongleur')) { jets += 3; log(run, 'Badge Jongleur : +3 jets', 'tag'); }
  if (has(run, 'cambrioleur')) jets = 0;
  if (bossActive(run, 'avare')) hands -= 1;
  if (bossActive(run, 'aiguille')) hands = 1;
  if (bossActive(run, 'sec')) jets = 0;
  run.handsMax = run.handsLeft = Math.max(1, hands);
  run.jetsMax = run.jets = Math.max(0, jets);
  run.drawPile = shuffle(run.deck.slice(), run.rng);
  run.usedIds = new Set();
  run.hands = []; run.dealer = null;
  run.charms.forEach(i => { i.off = false; });
  if (bossActive(run, 'bonneteau')) shuffle(run.charms, run.rng);
  run.phase = 'ready';
  const events = [];
  for (const i of run.charms.slice()) {
    const d = CHARMS[i.id]; if (!d.tableStart || i.dead || !run.charms.includes(i)) continue;
    const e = d.tableStart(run, i, H); if (e && e.msg) { log(run, e.msg, 'charm'); events.push({ uid: i.uid, msg: e.msg }); }
  }
  return events;
}
function drawPlayer(run) {
  if (!run.drawPile.length) {
    const onTable = new Set((run.hands || []).flatMap(h => h.cards.map(c => c.id)));
    run.drawPile = shuffle(run.deck.filter(c => !onTable.has(c.id)), run.rng);
    run.usedIds = new Set(onTable);
    if (!run.drawPile.length) run.drawPile = [newCard(run, 1 + Math.floor(run.rng() * 13), pick(SUITS, run.rng))];
  }
  const c = run.drawPile.pop();
  run.usedIds.add(c.id);
  return c;
}
let dealerCounter = 0;
function dealerCard(run, rank) { return { id: 'd' + (++dealerCounter), rank: rank || (1 + Math.floor(run.rng() * 13)), suit: pick(SUITS, run.rng), enh: null }; }

function handValue(run, cards, forPlayer) {
  let sum = 0; const opts = [];
  for (const c of cards) {
    if (forPlayer && c.enh === 'fantome') continue;
    const v = c.enh === 'pierre' ? 10 : c.rank >= 10 ? 10 : c.rank;
    if (c.rank === 1 && c.enh !== 'pierre' && !(forPlayer && bossActive(run, 'puriste'))) { sum += 1; opts.push(10); }
    else if (forPlayer && c.enh === 'elastique' && v > 1) { sum += 1; opts.push(v - 1); }
    else sum += v;
  }
  const hard = sum;
  opts.sort((a, b) => b - a);
  for (const o of opts) if (sum + o <= 21) sum += o;
  return { total: sum, soft: sum !== hard, hard };
}
function isBlackjack(run, h) { return h.cards.length === 2 && !h.fromSplit && handValue(run, h.cards, true).total === 21; }
function dealerIsBJ(run) { return run.dealer.cards.length === 2 && handValue(run, run.dealer.cards, false).total === 21; }
function dealerStand(run) { return bossActive(run, 'miroir') ? 18 : has(run, 'croupierlas') ? 16 : 17; }
function newHand(cards, fromSplit) { return { cards, fromSplit: !!fromSplit, doubled: false, done: false, busted: false, hitHigh: false, fd: [] }; }
function maybeFaceDown(run, h, c) { if (bossActive(run, 'roue') && run.rng() < 0.2) h.fd.push(c.id); }

function dealHand(run) {
  const events = [];
  run.tf.hand++;
  const h = newHand([]);
  run.hands = [h];
  for (let k = 0; k < 2; k++) { const c = drawPlayer(run); h.cards.push(c); maybeFaceDown(run, h, c); }
  const up = bossActive(run, 'banque') ? dealerCard(run, 1) : dealerCard(run);
  run.dealer = { cards: [up, dealerCard(run)], revealed: false };
  run.cur = 0; run.dealerBJ = false;
  run.charms.forEach(i => { i.off = false; });
  if (bossActive(run, 'pourpre') && run.charms.length) { const v = pick(run.charms, run.rng); v.off = true; events.push({ type: 'pourpre', uid: v.uid }); }
  if (dealerIsBJ(run)) {
    if (has(run, 'contre')) {
      while (dealerIsBJ(run)) run.dealer.cards[1] = dealerCard(run);
      events.push({ type: 'contre' });
    } else {
      run.dealerBJ = true; run.dealer.revealed = true; h.done = true; run.phase = 'resolve';
      events.push({ type: 'dealerBJ' }); return events;
    }
  }
  if (isBlackjack(run, h)) { h.done = true; run.phase = 'resolve'; events.push({ type: 'playerBJ' }); return events; }
  run.phase = 'player';
  return events;
}
const curHand = run => run.hands[run.cur];
function maxSplitHands(run) { return hasV(run, 'doublefente') ? 4 : hasV(run, 'fente') ? 3 : 2; }
function can(run, a) {
  if (a === 'acceptBust' || a === 'jetBust') return run.phase === 'bustChoice';
  if (run.phase !== 'player') return false;
  const h = curHand(run);
  const sec = bossActive(run, 'sec');
  switch (a) {
    case 'hit': return true;
    case 'stand': return !(bossActive(run, 'ivrogne') && h.cards.length === 2);
    case 'double': return !sec && (h.cards.length === 2 || (has(run, 'doubleur') && h.cards.length === 3));
    case 'split': {
      if (sec || h.cards.length !== 2 || run.hands.length >= maxSplitHands(run)) return false;
      const v = c => (c.enh === 'pierre' ? 10 : Math.min(10, c.rank));
      return has(run, 'fendeur') || v(h.cards[0]) === v(h.cards[1]);
    }
    case 'jet': return h.cards.length >= 3 && run.jets > 0;
  }
  return false;
}
function advance(run) {
  const i = run.hands.findIndex(h => !h.done);
  if (i === -1) { run.phase = 'resolve'; return; }
  run.cur = i; run.phase = 'player';
}
function payDime(run) { if (bossActive(run, 'dime')) { run.money = Math.max(debtLimit(run), run.money - 1); log(run, 'La Dîme : −$1', 'money'); } }
function afterDraw(run, h) {
  const v = handValue(run, h.cards, true);
  if (v.total > 21) {
    if (has(run, 'souffle') && run.tf.firstBust) {
      run.tf.firstBust = false; const c = h.cards.pop(); jetSideEffects(run, c, true);
      log(run, 'Second Souffle : bust annulé', 'charm');
      if (h.doubled) { h.done = true; advance(run); }
      return 'souffle';
    }
    if (run.jets > 0 && !bossActive(run, 'sec')) { run.phase = 'bustChoice'; return 'bustChoice'; }
    h.busted = true; h.done = true; advance(run); return 'bust';
  }
  if (v.total === 21 || h.doubled) { h.done = true; advance(run); return v.total === 21 ? 'twentyone' : 'stand'; }
  return 'ok';
}
function jetSideEffects(run, card, free) {
  if (!free) { run.jets--; run.tf.jetsUsed++; }
  if (card.seal === 'violet' && create(run, 'arcane')) log(run, 'Sceau violet : Arcane créé', 'create');
  for (const i of run.charms.slice()) {
    const d = CHARMS[i.id]; if (!d.onJet || i.dead || i.off) continue;
    const e = d.onJet(run, i, card, H);
    if (e && e.money) { run.money += e.money; log(run, `${d.name} : +$${e.money}`, 'money'); }
    if (e && e.destroy) { destroyCharm(run, i); log(run, e.msg, 'charm'); }
  }
}
function act(run, a) {
  if (!can(run, a)) return { ok: false };
  const h = curHand(run);
  switch (a) {
    case 'hit': case 'double': {
      if (a === 'double') h.doubled = true;
      if (handValue(run, h.cards, true).total >= 17) h.hitHigh = true;
      const c = drawPlayer(run); h.cards.push(c); maybeFaceDown(run, h, c); payDime(run);
      return { ok: true, card: c, result: afterDraw(run, h) };
    }
    case 'stand': h.done = true; advance(run); return { ok: true };
    case 'split': {
      const [x, y] = h.cards;
      const a1 = newHand([x], true), a2 = newHand([y], true);
      for (const nh of [a1, a2]) { const c = drawPlayer(run); nh.cards.push(c); maybeFaceDown(run, nh, c); if (handValue(run, nh.cards, true).total === 21) nh.done = true; }
      run.hands.splice(run.cur, 1, a1, a2);
      advance(run);
      return { ok: true };
    }
    case 'jet': { const c = h.cards.pop(); jetSideEffects(run, c); return { ok: true, card: c }; }
    case 'jetBust': {
      const c = h.cards.pop(); jetSideEffects(run, c);
      if (h.doubled) { h.done = true; advance(run); } else run.phase = 'player';
      return { ok: true, card: c };
    }
    case 'acceptBust': h.busted = true; h.done = true; advance(run); return { ok: true };
  }
  return { ok: false };
}

/* ---------- Analyse d'une main ---------- */
function analyze(run, h) {
  const cards = h.cards;
  const n = cards.length;
  const ranked = cards.filter(c => c.enh !== 'pierre');
  const cnt = {}; let maxSame = 0;
  ranked.forEach(c => { cnt[c.rank] = (cnt[c.rank] || 0) + 1; maxSame = Math.max(maxSame, cnt[c.rank]); });
  const agile = has(run, 'doigts');
  const minFS = agile ? 2 : 3;
  const couleur = n >= minFS && SUITS.some(s => cards.every(c => isSuit(run, c, s)));
  let suite = false;
  if (n >= minFS && ranked.length === n && Object.keys(cnt).length === n) {
    const gap = has(run, 'raccourci') ? 2 : 1;
    const check = rs => { rs.sort((a, b) => a - b); for (let k = 1; k < rs.length; k++) { const d = rs[k] - rs[k - 1]; if (d < 1 || d > gap) return false; } return true; };
    const rs = ranked.map(c => c.rank);
    suite = check(rs.slice()) || (rs.includes(1) && check(rs.map(r => r === 1 ? 14 : r)));
  }
  const v = handValue(run, cards, true);
  return {
    n, total: v.total, soft: v.soft, pair: maxSame >= 2, brelan: maxSame >= 3, carre: maxSame >= 4,
    couleur, suite, vingtun: v.total === 21, charlie: n >= (agile ? 4 : 5) && v.total <= 21,
    blackjack: isBlackjack(run, h), septs: n === 3 && ranked.length === 3 && cards.every(c => c.rank === 7),
  };
}
function handTypeOf(run, h, f) {
  const bust = f.total > 21 || h.busted;
  const g = bossActive(run, 'gourmand');
  const ok = t => !(g && TWENTYONE_TYPES.includes(t));
  const order = [
    ['septs', f.septs && !bust], ['couleur21', f.couleur && f.vingtun], ['brelan', f.brelan], ['blackjack', f.blackjack],
    ['suite', f.suite], ['charlie', f.charlie && !bust], ['couleur', f.couleur], ['vingtun', f.vingtun], ['paire', f.pair],
  ];
  for (const [t, c] of order) if (c && ok(t)) return t;
  return 'simple';
}
function handTypeStats(run, t) {
  const T = HAND_TYPES[t], lv = run.levels[t];
  return { chips: T.chips + T.lc * (lv - 1), mult: T.mult + T.lm * (lv - 1), level: lv };
}

/* ---------- Résolution ---------- */
function dealerPlay(run) {
  run.dealer.revealed = true;
  const alive = run.hands.some(h => !h.busted);
  const onlyBJ = run.hands.length === 1 && isBlackjack(run, run.hands[0]);
  if (!alive || run.dealerBJ || onlyBJ) return;
  const stand = dealerStand(run);
  while (handValue(run, run.dealer.cards, false).total < stand) run.dealer.cards.push(dealerCard(run));
}
function outcomeOf(run, h) {
  if (h.busted) return 'bust';
  const pBJ = isBlackjack(run, h);
  if (run.dealerBJ) return pBJ ? 'push' : 'lose';
  if (pBJ) return 'win';
  const p = handValue(run, h.cards, true).total, d = handValue(run, run.dealer.cards, false).total;
  if (d > 21 || p > d) return 'win';
  if (p === d) return bossActive(run, 'tricheur') ? 'lose' : 'push';
  return 'lose';
}
function outcomeFactor(run, o) {
  if (o === 'win') return 1;
  if (o === 'push') return has(run, 'poignee') ? 1 : 0.5;
  if (o === 'bust') return has(run, 'filet') ? 0.5 : 0;
  return 0;
}
function resolveCopy(run, k, depth) {
  const inst = run.charms[k]; if (!inst || inst.off || inst.dead) return null;
  const d = CHARMS[inst.id];
  if (!d.copy) return inst;
  if ((depth || 0) > 4) return null;
  const tk = d.copy === 'right' ? k + 1 : 0;
  if (tk === k) return null;
  return resolveCopy(run, tk, (depth || 0) + 1);
}
function cardChips(run, c) {
  if (c.enh === 'pierre') return 50;
  if (c.rank >= 11) return bossActive(run, 'muet') ? 0 : 10;
  if (c.rank === 1) return 11;
  return c.rank;
}

function scoreHand(run, h, hi, outcome) {
  const factor = outcomeFactor(run, outcome);
  const f = analyze(run, h);
  const type = handTypeOf(run, h, f);
  const dTot = handValue(run, run.dealer.cards, false).total;
  const ctx = {
    run, H, hand: h, cards: h.cards, f, type, total: f.total, soft: f.soft, n: f.n, outcome, win: outcome === 'win',
    dealerBust: dTot > 21, dealerTotal: dTot, dealerUp: run.dealer.cards[0], dealerN: run.dealer.cards.length,
    busted: h.busted || f.total > 21, last: run.handsLeft === 1, first: run.tf.hand === 1, doubled: h.doubled, split: h.fromSplit,
    margin: f.total - (dTot > 21 ? 0 : dTot), firstOfDeal: hi === 0, retrig: false,
  };
  const res = { type, ctx, steps: [], chips: 0, mult: 0, raw: 0, factor, score: 0, money: 0, glass: [], gold: 0, outcome, blocked: null, events: [], leech: [] };
  if (bossActive(run, 'exigeant') && f.n < 3) res.blocked = 'Moins de 3 cartes : ne marque pas';
  else if (bossActive(run, 'oeil') && run.tf.types[type]) res.blocked = 'Type déjà joué : ne marque pas';
  else if (bossActive(run, 'bouche') && run.tf.mouth && run.tf.mouth !== type) res.blocked = `Seul ${HAND_TYPES[run.tf.mouth].name} marque`;
  if (factor === 0 || res.blocked) { res.factor = res.blocked ? 0 : factor; return res; }
  if (bossActive(run, 'bras') && run.levels[type] > 1) { run.levels[type]--; res.events.push(`Le Bras : ${HAND_TYPES[type].name} perd 1 niveau`); }
  const base = handTypeStats(run, type);
  let chips = base.chips, mult = base.mult;
  if (bossActive(run, 'silex')) { chips = Math.ceil(chips / 2); mult = Math.max(1, Math.ceil(mult / 2)); }
  const steps = res.steps;
  steps.push({ src: 'base', type, chips, mult, text: HAND_TYPES[type].name + (base.level > 1 ? ' niv.' + base.level : '') });
  const apply = (eff, src, idx, ci) => {
    if (!eff) return;
    if (eff.chips) { chips += eff.chips; steps.push({ src, idx, ci, kind: 'chips', val: eff.chips, chips, mult }); }
    if (eff.mult) { mult = r2(mult + eff.mult); steps.push({ src, idx, ci, kind: 'mult', val: eff.mult, chips, mult }); }
    if (eff.xmult != null && eff.xmult !== 1) { mult = r2(mult * eff.xmult); steps.push({ src, idx, ci, kind: 'xmult', val: eff.xmult, chips, mult }); }
    if (eff.money) { res.money += eff.money; steps.push({ src, idx, ci, kind: 'money', val: eff.money, chips, mult }); }
    if (eff.msg) steps.push({ src, idx, ci, kind: 'msg', val: eff.msg, chips, mult });
  };
  run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.pre && !i.off && !i.dead) d.pre(ctx, i); });
  h.cards.forEach((card, ci) => {
    if (isDebuffed(run, card)) { steps.push({ src: 'card', ci, kind: 'debuff', chips, mult }); return; }
    let trig = 1 + (card.seal === 'rouge' ? 1 : 0);
    run.charms.forEach((i, k) => { const t = resolveCopy(run, k); if (!t) return; const d = CHARMS[t.id]; if (d.retrig) trig += d.retrig(ctx, card, t) || 0; });
    for (let t = 0; t < trig; t++) {
      ctx.retrig = t > 0;
      if (t > 0) steps.push({ src: 'card', ci, kind: 'retrig', chips, mult });
      apply({ chips: cardChips(run, card) + (card.bonus || 0) }, 'card', -1, ci);
      if (card.enh === 'bonus') apply({ chips: 30 }, 'card', -1, ci);
      if (card.enh === 'feu') apply({ mult: 4 }, 'card', -1, ci);
      if (card.enh === 'verre') { apply({ xmult: 2 }, 'card', -1, ci); if (!res.glass.includes(card)) res.glass.push(card); }
      if (card.enh === 'or' && t === 0) res.gold++;
      if (card.enh === 'chance') {
        let hit = false;
        if (H.chance(run, 5)) { apply({ mult: 20 }, 'card', -1, ci); hit = true; }
        if (H.chance(run, 15)) { apply({ money: 20 }, 'card', -1, ci); hit = true; }
        if (hit) run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.onLucky && !i.dead) d.onLucky(run, i); });
      }
      if (card.ed === 'brillant') apply({ chips: 50 }, 'card', -1, ci);
      if (card.ed === 'holo') apply({ mult: 10 }, 'card', -1, ci);
      if (card.ed === 'prisme') apply({ xmult: 1.5 }, 'card', -1, ci);
      if (card.seal === 'or') apply({ money: 3 }, 'card', -1, ci);
      run.charms.forEach((i, k) => {
        const tgt = resolveCopy(run, k); if (!tgt) return;
        const d = CHARMS[tgt.id];
        if (d.onCard) apply(d.onCard(ctx, card, tgt), 'charmCard', k, ci);
      });
    }
    if (bossActive(run, 'sangsue') && card.enh) res.leech.push(card);
  });
  ctx.retrig = false;
  run.charms.forEach((inst, k) => {
    if (inst.off || inst.dead) { if (inst.off) steps.push({ src: 'charm', idx: k, kind: 'off', chips, mult }); return; }
    if (inst.ed === 'brillant') apply({ chips: 50 }, 'charm', k);
    if (inst.ed === 'holo') apply({ mult: 10 }, 'charm', k);
    const tgt = resolveCopy(run, k);
    if (tgt) { const d = CHARMS[tgt.id]; if (d.onHand) apply(d.onHand(ctx, tgt), 'charm', k); }
    if (inst.ed === 'prisme') apply({ xmult: 1.5 }, 'charm', k);
  });
  if (hasV(run, 'observatoire')) run.consumables.forEach((c, k) => { if (c.kind === 'etoile' && ETOILES[c.id].type === type) apply({ xmult: 1.5 }, 'cons', k); });
  if (h.doubled) apply({ xmult: has(run, 'quitte') ? 4 : (hasV(run, 'doublefente') && h.fromSplit ? 3 : 2) }, 'double', -1);
  if (run.deckId === 'plasma') { const s = r2((chips + mult) / 2); chips = Math.floor(s); mult = s; steps.push({ src: 'plasma', kind: 'plasma', chips, mult }); }
  res.chips = chips; res.mult = mult;
  res.raw = Math.floor(chips * mult);
  res.score = Math.floor(res.raw * factor);
  return res;
}

function resolve(run) {
  const before = run.dealer.cards.length;
  dealerPlay(run);
  const results = run.hands.map((h, hi) => {
    const outcome = outcomeOf(run, h);
    const r = scoreHand(run, h, hi, outcome);
    if (outcome === 'win') r.money += 3 * r.gold;
    r.broken = [];
    if (r.factor > 0) for (const g of r.glass) if (H.chance(run, 4)) r.broken.push(g);
    r.playerTotal = handValue(run, h.cards, true).total;
    return r;
  });
  return { results, dealerNew: run.dealer.cards.slice(before), dealerTotal: handValue(run, run.dealer.cards, false).total };
}
function applyResult(run, r) {
  const c = r.ctx;
  run.score += r.score;
  run.money += r.money;
  run.stats.handsPlayed++;
  run.handPlays[r.type] = (run.handPlays[r.type] || 0) + 1;
  run.tf.types[r.type] = (run.tf.types[r.type] || 0) + 1;
  if (!run.tf.mouth && !r.blocked && r.factor > 0) run.tf.mouth = r.type;
  run.tf.cards += c.n;
  if (r.type === 'blackjack' && r.outcome === 'win') run.stats.blackjacks++;
  if (r.outcome === 'win') { run.streak++; run.stats.handsWon++; run.tf.wins++; }
  else if (r.outcome === 'lose' || r.outcome === 'bust') run.streak = 0;
  if (r.score > run.stats.bestHand) { run.stats.bestHand = r.score; run.stats.bestType = HAND_TYPES[r.type].name; }
  const ev = r.events.map(m => ({ msg: m }));
  if (r.outcome === 'win') c.cards.forEach(k => { if (k.seal === 'bleu' && !isDebuffed(run, k) && create(run, 'etoile', HAND_TYPES[r.type].star)) ev.push({ msg: 'Sceau bleu : Étoile créée' }); });
  for (const i of run.charms.slice()) {
    const d = CHARMS[i.id]; if (!d.after || i.off || i.dead) continue;
    const e = d.after(c, i);
    if (!e) continue;
    if (e.money) { run.money += e.money; ev.push({ uid: i.uid, money: e.money }); }
    if (e.msg) ev.push({ uid: i.uid, msg: e.msg });
    if (e.destroy) destroyCharm(run, i);
  }
  r.leech.forEach(k => { k.enh = null; });
  if (r.broken.length) {
    removeCards(run, r.broken);
    r.broken.forEach(() => run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.onGlass && !i.dead) d.onGlass(run, i); }));
  }
  r.after = ev;
  return ev;
}
function endHand(run) {
  run.handsLeft--;
  run.charms.forEach(i => { i.off = false; });
  if (run.score >= run.target) { run.phase = 'tableWon'; return 'won'; }
  if (run.handsLeft <= 0) {
    const sq = run.charms.find(i => i.id === 'squelette' && !i.dead);
    if (sq && run.score >= run.target * 0.25) { destroyCharm(run, sq); log(run, 'Le Squelette te sauve !', 'charm'); run.phase = 'tableWon'; return 'won'; }
    run.phase = 'gameOver'; return 'lost';
  }
  run.phase = 'ready';
  return 'continue';
}

/* ---------- Fin de table ---------- */
function interestCap(run) { return (hasV(run, 'coffre') ? 20 : hasV(run, 'baslaine') ? 10 : CONFIG.interestCap) + 3 * countCharm(run, 'tirelire'); }
function finishTable(run) {
  const lines = [];
  const events = [];
  run.stats.tables++;
  run.stats.jetsUnusedTotal += run.jets;
  for (const i of run.charms.slice()) {
    const d = CHARMS[i.id]; if (!d.tableEnd || i.dead) continue;
    const e = d.tableEnd(run, i, H);
    if (e && e.money) lines.push({ label: d.name, val: e.money });
    if (e && e.msg) events.push(e.msg);
    if (e && e.destroy) destroyCharm(run, i);
  }
  for (const i of run.charms) {
    if (i.stk.p != null && !i.dead) { i.stk.p--; if (i.stk.p <= 0) { i.dead = true; events.push(`${CHARMS[i.id].name} a péri`); } }
    if (i.stk.r) lines.push({ label: `Location : ${CHARMS[i.id].name}`, val: -3 });
  }
  lines.unshift({ label: run.blind.idx === 2 ? 'Boss vaincu' : run.blind.idx === 1 ? 'Grande table' : 'Petite table', val: run.blind.reward });
  if (run.deckId === 'vert') {
    if (run.handsLeft) lines.push({ label: `Mains restantes ×${run.handsLeft} ($2)`, val: 2 * run.handsLeft });
    if (run.jets) lines.push({ label: `Jets restants ×${run.jets} ($1)`, val: run.jets });
  } else {
    if (run.handsLeft) lines.push({ label: `Mains restantes ×${run.handsLeft}`, val: run.handsLeft });
    const cap = interestCap(run);
    const it = Math.max(0, Math.min(Math.floor(run.money / 5), cap));
    if (it) lines.push({ label: `Intérêts ($1 par $5, max $${cap})`, val: it });
    const nl = countCharm(run, 'lune');
    if (nl && it) lines.push({ label: 'Vers la Lune', val: it * nl });
  }
  run.cashout = { lines, total: lines.reduce((s, l) => s + l.val, 0), events };
  return run.cashout;
}
function collectEarnings(run) {
  const co = run.cashout || finishTable(run);
  run.money += co.total;
  run.cashout = null;
  if (run.blind.idx === 2) {
    run.charms.forEach(i => { const d = CHARMS[i.id]; if (d.onBoss && !i.dead) d.onBoss(run, i); });
    while (consumeTag(run, 'invest')) { run.money += 20; log(run, 'Badge Investissement : +$20', 'money'); }
    if (run.deckId === 'anaglyphe') { run.tags.push('double'); log(run, 'Paquet Anaglyphe : Badge Double', 'tag'); }
    if (run.ante >= CONFIG.winAnte && !run.won) { run.won = true; run.justWon = true; }
    run.ante++;
    run.blindIdx = 0;
    newAnte(run);
  } else run.blindIdx++;
  makeShop(run);
  run.phase = 'shop';
  return co;
}

/* ---------- Boutique ---------- */
function discount(run, p) {
  let v = p;
  if (hasV(run, 'liquidation')) v = Math.round(v * 0.5); else if (hasV(run, 'surplus')) v = Math.round(v * 0.75);
  v -= countCharm(run, 'marchenoir');
  return Math.max(0, v);
}
function itemPrice(run, it) {
  if (it.free) return 0;
  if (it.kind === 'etoile' && has(run, 'astronome')) return 0;
  return discount(run, it.base);
}
function rollItem(run, exclude) {
  const W = CONFIG.shopW;
  const ent = [['charm', W.charm],
    ['arcane', W.arcane * (hasV(run, 'grandcarto') ? 4 : hasV(run, 'cartomancie') ? 2 : 1)],
    ['etoile', W.etoile * (hasV(run, 'grandastro') ? 4 : hasV(run, 'astrologie') ? 2 : 1)]];
  if (hasV(run, 'magie')) ent.push(['carte', W.carte]);
  if (run.deckId === 'fantome') ent.push(['spectre', W.spectre]);
  const kind = wpick(ent, run.rng);
  if (kind === 'charm') { const inst = rollShopCharm(run, null, exclude); return { kind, inst, base: charmPrice(run, inst) }; }
  if (kind === 'carte') { const card = rollPackCard(run, hasV(run, 'illusion')); return { kind, card, base: 1 + (card.enh ? 1 : 0) + (card.ed ? 2 : 0) + (card.seal ? 2 : 0) }; }
  const c = newCons(run, kind, rollCons(run, kind));
  return { kind, cons: c, base: consPrice(c) };
}
function fillItems(run) {
  const s = run.shop;
  const n = CONFIG.shopSlots + (hasV(run, 'vitrine') ? 1 : 0) + (hasV(run, 'galerie') ? 1 : 0);
  s.items = [];
  const ex = [];
  for (let k = 0; k < n; k++) { const it = rollItem(run, ex); if (it.inst) ex.push(it.inst.id); s.items.push(it); }
}
function rollPack(run) {
  const type = wpick(Object.keys(PACKS).map(k => [k, PACKS[k].w]), run.rng);
  const size = wpick(Object.keys(PACK_SIZES).map(k => [k, PACK_SIZES[k].w]), run.rng);
  return { type, size, base: PACK_SIZES[size].price };
}
function makeShop(run) {
  run.shop = { items: [], packs: [], vouchers: run.anteVoucher ? [run.anteVoucher] : [], rerolls: 0, freeRerolls: countCharm(run, 'bonimenteur'), rerollBase: Math.max(0, CONFIG.reroll - (hasV(run, 'ristourne') ? 1 : 0) - (hasV(run, 'rabais') ? 1 : 0)) };
  fillItems(run);
  run.shop.packs = run.firstShop ? [{ type: 'charme', size: 'normal', base: 4 }, rollPack(run)] : [rollPack(run), rollPack(run)];
  run.firstShop = false;
  const s = run.shop;
  const keep = [];
  for (const t of run.tags) {
    if (TAGS[t].when !== 'shop') { keep.push(t); continue; }
    if (t === 'rare' || t === 'peucommun') { const inst = newCharm(run, rollCharmId(run, t === 'rare' ? 'r' : 'u')); s.items.unshift({ kind: 'charm', inst, base: charmPrice(run, inst), free: true, tag: t }); }
    else if (['brillant', 'holo', 'prisme', 'negatif'].includes(t)) {
      let it = s.items.find(x => x.kind === 'charm' && !x.inst.ed);
      if (!it) { const inst = newCharm(run, rollCharmId(run)); it = { kind: 'charm', inst, base: 0 }; s.items.unshift(it); }
      it.inst.ed = t; it.free = true; it.base = charmPrice(run, it.inst); it.tag = t;
    }
    else if (t === 'bon') { const v = pickVoucher(run, s.vouchers); if (v) s.vouchers.push(v); }
    else if (t === 'coupon') { s.items.forEach(x => { x.free = true; }); s.packs.forEach(p => { p.free = true; }); }
    else if (t === 'de') { s.rerollBase = 0; }
    log(run, `${TAGS[t].name} utilisé`, 'tag');
  }
  run.tags = keep;
}
function rerollCost(run) { const s = run.shop; return s.freeRerolls > 0 ? 0 : s.rerollBase + s.rerolls; }
function packPrice(run, p) { if (p.free) return 0; if (p.type === 'etoile' && has(run, 'astronome')) return 0; return discount(run, p.base); }
function voucherPrice(run) { return discount(run, 10); }
function applyVoucher(run, id) {
  run.vouchers.push(id);
  if ((id === 'vitrine' || id === 'galerie') && run.shop) run.shop.items.push(rollItem(run, []));
  if (id === 'sablier' || id === 'clepsydre') run.ante = Math.max(0, run.ante - 1);
}
function shopBuy(run, kind, i, arg) {
  const s = run.shop; if (!s) return false;
  const pay = p => { if (!canAfford(run, p)) return false; run.money -= p; return true; };
  switch (kind) {
    case 'item': {
      const it = s.items[i]; if (!it) return false;
      if (it.kind === 'charm' && !charmRoom(run, it.inst)) return false;
      if (it.cons && !consRoom(run)) return false;
      if (!pay(itemPrice(run, it))) return false;
      if (it.kind === 'charm') run.charms.push(it.inst);
      else if (it.kind === 'carte') addCard(run, it.card);
      else run.consumables.push(it.cons);
      s.items[i] = null; return true;
    }
    case 'useItem': {
      const it = s.items[i]; if (!it || !it.cons) return { ok: false };
      const p = itemPrice(run, it); if (!canAfford(run, p)) return { ok: false, msg: 'Pas assez d\'argent' };
      const r = applyConsumable(run, it.cons, arg || [], null);
      if (!r.ok) return r;
      run.money -= p; s.items[i] = null; return r;
    }
    case 'pack': {
      const pk = s.packs[i]; if (!pk) return false;
      if (!pay(packPrice(run, pk))) return false;
      s.packs[i] = null; openPack(run, pk); return true;
    }
    case 'voucher': {
      const id = s.vouchers[i]; if (!id) return false;
      if (!pay(voucherPrice(run))) return false;
      s.vouchers[i] = null;
      if (id === run.anteVoucher) run.anteVoucher = null;
      applyVoucher(run, id); return true;
    }
    case 'reroll': {
      const c = rerollCost(run); if (!canAfford(run, c)) return false;
      run.money -= c; if (s.freeRerolls > 0) s.freeRerolls--; else s.rerolls++;
      run.charms.forEach(x => { const d = CHARMS[x.id]; if (d.onReroll && !x.dead) d.onReroll(run, x); });
      fillItems(run); return true;
    }
    case 'burn': {
      const card = run.deck.find(c => c.id === arg);
      if (!card || run.deck.length <= 20 || !canAfford(run, run.burnCost)) return false;
      run.money -= run.burnCost; run.burnCost++;
      removeCards(run, [card]); return true;
    }
  }
  return false;
}
function sellCharm(run, i) {
  const inst = run.charms[i]; if (!inst || (inst.stk && inst.stk.e)) return false;
  const v = sellValue(run, inst);
  run.money += v; run.charms.splice(i, 1); run.stats.sold++;
  let msg = null;
  const d = CHARMS[inst.id];
  if (d.sellUse) { const e = d.sellUse(run, inst, H); if (e && e.msg) msg = e.msg; }
  run.charms.forEach(x => { const dd = CHARMS[x.id]; if (dd.onSell && !x.dead) dd.onSell(run, x, inst); });
  if (run.blind && run.blind.boss === 'gel' && run.phase !== 'shop') { run.tf.gelBroken = true; msg = msg || 'Le Gel est brisé !'; }
  return { ok: true, money: v, msg };
}
function sellCons(run, i) {
  const c = run.consumables[i]; if (!c) return false;
  run.money += sellValue(run, c); run.consumables.splice(i, 1); run.stats.sold++;
  run.charms.forEach(x => { const dd = CHARMS[x.id]; if (dd.onSell && !x.dead) dd.onSell(run, x, c); });
  return true;
}
function moveCharm(run, i, dir) { const j = i + dir; if (j < 0 || j >= run.charms.length) return false; [run.charms[i], run.charms[j]] = [run.charms[j], run.charms[i]]; return true; }
function leaveShop(run) { run.shop = null; run.phase = 'select'; }

/* ---------- Paquets ---------- */
function rollPackCard(run, fancy) {
  const card = newCard(run, 1 + Math.floor(run.rng() * 13), pick(SUITS, run.rng));
  if (fancy === false) return card;
  if (run.rng() < 0.4) card.enh = pick(ENH_IDS, run.rng);
  const m = hasV(run, 'eclat') ? 4 : hasV(run, 'polissage') ? 2 : 1;
  const x = run.rng();
  if (x < 0.012 * m) card.ed = 'prisme'; else if (x < 0.04 * m) card.ed = 'holo'; else if (x < 0.08 * m) card.ed = 'brillant';
  if (run.rng() < 0.2) card.seal = pick(Object.keys(SEALS), run.rng);
  return card;
}
function drawTirage(run, n) { return shuffle(run.deck.slice(), run.rng).slice(0, Math.min(n || 8, run.deck.length)); }
function openPack(run, pk) {
  const P = PACKS[pk.type], S = PACK_SIZES[pk.size];
  const n = S.n[P.kind];
  const choices = [];
  const seen = run.shop ? run.shop.items.filter(x => x && x.inst).map(x => x.inst.id) : [];
  for (let k = 0; k < n; k++) {
    if (P.kind === 'charm') { const inst = rollShopCharm(run, null, seen); seen.push(inst.id); choices.push({ kind: 'charm', inst }); }
    else if (P.kind === 'carte') choices.push({ kind: 'carte', card: rollPackCard(run) });
    else if (P.kind === 'etoile') {
      let id;
      if (k === 0 && hasV(run, 'telescope') && mostPlayed(run)) id = HAND_TYPES[mostPlayed(run)].star;
      else if (run.rng() < 0.003) { choices.push({ kind: 'spectre', cons: newCons(run, 'spectre', 'trounoir') }); continue; }
      else { const pool = Object.keys(ETOILES).filter(x => !seen.includes(x)); id = pick(pool.length ? pool : Object.keys(ETOILES), run.rng); }
      seen.push(id); choices.push({ kind: 'etoile', cons: newCons(run, 'etoile', id) });
    } else if (P.kind === 'arcane') {
      if (run.rng() < 0.003) { choices.push({ kind: 'spectre', cons: newCons(run, 'spectre', 'ame') }); continue; }
      if (hasV(run, 'augure') && run.rng() < 0.2) { choices.push({ kind: 'spectre', cons: newCons(run, 'spectre', rollCons(run, 'spectre')) }); continue; }
      const pool = Object.keys(ARCANES).filter(x => !seen.includes(x)); const id = pick(pool, run.rng); seen.push(id);
      choices.push({ kind: 'arcane', cons: newCons(run, 'arcane', id) });
    } else {
      if (run.rng() < 0.006) { choices.push({ kind: 'spectre', cons: newCons(run, 'spectre', run.rng() < 0.5 ? 'ame' : 'trounoir') }); continue; }
      const pool = Object.keys(SPECTRES).filter(x => !SPECTRES[x].rare && !seen.includes(x)); const id = pick(pool, run.rng); seen.push(id);
      choices.push({ kind: 'spectre', cons: newCons(run, 'spectre', id) });
    }
  }
  run.pack = { type: pk.type, size: pk.size, name: S.name ? `${P.name} ${S.name}` : P.name, choices, picks: S.pick, tirage: (P.kind === 'arcane' || P.kind === 'spectre') ? drawTirage(run, 8) : null, taken: 0 };
  run.charms.forEach(x => { const d = CHARMS[x.id]; if (d.onPackOpen && !x.dead) d.onPackOpen(run, x, H); });
  return run.pack;
}
function packPick(run, i, targetIds) {
  const pk = run.pack; if (!pk) return { ok: false };
  const ch = pk.choices[i]; if (!ch) return { ok: false };
  let r = { ok: true };
  if (ch.kind === 'charm') { if (!charmRoom(run, ch.inst)) return { ok: false, msg: "Plus d'emplacement libre" }; run.charms.push(ch.inst); }
  else if (ch.kind === 'carte') addCard(run, ch.card);
  else { r = applyConsumable(run, ch.cons, targetIds || [], pk.tirage); if (!r.ok) return r; }
  pk.choices[i] = null; pk.taken++; pk.picks--;
  if (pk.tirage) pk.tirage = pk.tirage.filter(c => run.deck.includes(c));
  if (pk.picks <= 0 || pk.choices.every(x => !x)) closePack(run);
  return r;
}
function packSkip(run) {
  if (run.pack && run.pack.taken === 0) run.charms.forEach(x => { const d = CHARMS[x.id]; if (d.onSkipPack && !x.dead) d.onSkipPack(run, x); });
  closePack(run);
}
function closePack(run) { run.pack = null; }

/* ---------- Consommables : utilisation ---------- */
function consNeeds(c) { return consDef(c).target || 0; }
function removeFromCons(run, c) { const k = run.consumables.indexOf(c); if (k >= 0) run.consumables.splice(k, 1); }
function applyConsumable(run, c, targetIds, tirage) {
  const d = consDef(c);
  const pool = tirage || run.deck;
  const T = (targetIds || []).map(id => run.deck.find(k => k.id === id)).filter(Boolean);
  if (d.exact && T.length !== d.exact) return { ok: false, msg: `Choisis exactement ${d.exact} cartes` };
  if (d.target && !T.length) return { ok: false, msg: `Choisis jusqu'à ${d.target} carte${d.target > 1 ? 's' : ''}` };
  if (T.length > (d.target || 0)) return { ok: false, msg: 'Trop de cartes choisies' };
  let msg = null;
  const ranks = (lo, hi) => { const a = []; for (let r = lo; r <= hi; r++) a.push(r); return a; };
  const randTir = n => shuffle(pool.filter(k => run.deck.includes(k)), run.rng).slice(0, n);
  if (c.kind === 'etoile') {
    const t = d.type; run.levels[t]++; run.stats.etoiles++; run.stats.etoilesSeen[c.id] = 1;
    msg = `${HAND_TYPES[t].name} passe au niveau ${run.levels[t]}`;
  } else if (c.kind === 'arcane') {
    switch (c.id) {
      case 'echo': {
        if (!run.lastCons) return { ok: false, msg: "Aucun Arcane ou Étoile utilisé pour l'instant" };
        removeFromCons(run, c); create(run, run.lastCons.kind, run.lastCons.id); msg = `Copie de ${consName(run.lastCons)}`; break;
      }
      case 'astrolabe': { removeFromCons(run, c); let n = 0; for (let k = 0; k < 2; k++) if (create(run, 'etoile')) n++; msg = `${n} Étoile(s) créée(s)`; break; }
      case 'grimoire': { removeFromCons(run, c); let n = 0; for (let k = 0; k < 2; k++) if (create(run, 'arcane')) n++; msg = `${n} Arcane(s) créé(s)`; break; }
      case 'usurier': { const g = Math.min(20, Math.max(0, run.money)); run.money += g; msg = `+$${g}`; break; }
      case 'notaire': { let s = 0; run.charms.forEach(i => { s += sellValue(run, i); }); s = Math.min(50, s); run.money += s; msg = `+$${s}`; break; }
      case 'roue': {
        const cand = run.charms.filter(i => !i.ed);
        if (!cand.length) return { ok: false, msg: 'Aucun porte-bonheur sans édition' };
        if (H.chance(run, 4)) { const v = pick(cand, run.rng); v.ed = wpick([['brillant', 50], ['holo', 35], ['prisme', 15]], run.rng); msg = `${CHARMS[v.id].name} devient ${EDITIONS[v.ed].name} !`; }
        else msg = 'Raté !';
        break;
      }
      case 'oracle': { if (!charmRoom(run)) return { ok: false, msg: "Plus d'emplacement de porte-bonheur" }; const v = createCharm(run); msg = `${CHARMS[v.id].name} rejoint ta collection`; break; }
      case 'elevation': T.forEach(k => { k.rank = k.rank === 13 ? 1 : k.rank + 1; }); msg = 'Rang augmenté'; break;
      case 'couperet': removeCards(run, T); msg = `${T.length} carte(s) détruite(s)`; break;
      case 'metamorphose': { const [a, b] = T; a.rank = b.rank; a.suit = b.suit; a.enh = b.enh; a.ed = b.ed; a.seal = b.seal; msg = 'Métamorphose réussie'; break; }
      default:
        if (d.enh) { T.forEach(k => { k.enh = d.enh; }); msg = `${T.length} carte(s) ${ENH[d.enh].name}`; }
        else if (d.suit) { T.forEach(k => { k.suit = d.suit; if (k.enh === 'pierre') k.enh = null; }); msg = `${T.length} carte(s) ${SUIT_SYM[d.suit]}`; }
    }
    run.stats.arcanes++;
  } else {
    switch (c.id) {
      case 'ombre': case 'rite': case 'incant': {
        const v = randTir(1); if (v.length) removeCards(run, v);
        const cfg = { ombre: [3, ranks(11, 13)], rite: [2, [1]], incant: [4, ranks(2, 10)] }[c.id];
        for (let k = 0; k < cfg[0]; k++) addCard(run, randomEnhanced(run, cfg[1]));
        msg = `${cfg[0]} cartes améliorées ajoutées`; break;
      }
      case 'aura': T.forEach(k => { k.ed = wpick([['brillant', 50], ['holo', 35], ['prisme', 15]], run.rng); }); msg = 'Édition ajoutée'; break;
      case 'avide': { if (!charmRoom(run)) return { ok: false, msg: "Plus d'emplacement de porte-bonheur" }; const v = createCharm(run, 'r'); run.money = Math.min(run.money, 0); msg = `${CHARMS[v.id].name} ! Argent à $0`; break; }
      case 'sigil': { const s = pick(SUITS, run.rng); pool.forEach(k => { if (run.deck.includes(k)) k.suit = s; }); msg = `Tout devient ${SUIT_SYM[s]}`; break; }
      case 'planchette': { const r = 1 + Math.floor(run.rng() * 13); pool.forEach(k => { if (run.deck.includes(k)) k.rank = r; }); run.jetsMod--; msg = `Tout devient ${RANKS[r]}, −1 jet par table`; break; }
      case 'ecto': { const cand = run.charms.filter(i => !i.ed); if (!cand.length) return { ok: false, msg: 'Aucun porte-bonheur sans édition' }; const v = pick(cand, run.rng); v.ed = 'negatif'; run.jetsMod--; msg = `${CHARMS[v.id].name} devient Négatif, −1 jet par table`; break; }
      case 'bucher': { const v = randTir(5); removeCards(run, v); run.money += 20; msg = `${v.length} cartes brûlées, +$20`; break; }
      case 'clone': {
        if (!run.charms.length) return { ok: false, msg: 'Aucun porte-bonheur' };
        const v = pick(run.charms, run.rng);
        run.charms = run.charms.filter(i => i === v || (i.stk && i.stk.e));
        const cp = JSON.parse(JSON.stringify(v)); cp.uid = 'h' + (run.nextId++); if (cp.ed === 'negatif') cp.ed = null;
        run.charms.push(cp); msg = `${CHARMS[v.id].name} cloné`; break;
      }
      case 'malediction': {
        if (!run.charms.length) return { ok: false, msg: 'Aucun porte-bonheur' };
        const v = pick(run.charms, run.rng); v.ed = 'prisme';
        run.charms = run.charms.filter(i => i === v || (i.stk && i.stk.e)); msg = `${CHARMS[v.id].name} devient Prismatique`; break;
      }
      case 'sosie': { const k = T[0]; for (let n = 0; n < 2; n++) addCard(run, Object.assign({}, k, { id: 'c' + (run.nextId++) })); msg = '2 copies ajoutées'; break; }
      case 'ame': {
        if (!charmRoom(run)) return { ok: false, msg: "Plus d'emplacement de porte-bonheur" };
        const pl = CHARM_IDS.filter(id => CHARMS[id].rarity === 'l' && !run.charms.some(i => i.id === id));
        const inst = newCharm(run, pick(pl.length ? pl : ['sphinx'], run.rng)); run.charms.push(inst);
        msg = `${CHARMS[inst.id].name} apparaît !`; break;
      }
      case 'trounoir': HAND_TYPE_IDS.forEach(t => { run.levels[t]++; }); msg = 'Tous les types de main +1 niveau'; break;
      default: if (d.seal) { T.forEach(k => { k.seal = d.seal; }); msg = SEALS[d.seal].name + ' ajouté'; }
    }
  }
  removeFromCons(run, c);
  if (c.kind !== 'spectre' && c.id !== 'echo') run.lastCons = { kind: c.kind, id: c.id };
  run.charms.forEach(x => { const dd = CHARMS[x.id]; if (dd.onUse && !x.dead) dd.onUse(run, x, c.kind); });
  return { ok: true, msg };
}
function useCons(run, i, targetIds, tirage) { const c = run.consumables[i]; if (!c) return { ok: false }; return applyConsumable(run, c, targetIds, tirage); }

/* ---------- Description ---------- */
function charmDesc(run, inst) {
  const d = CHARMS[inst.id];
  let s = d.desc;
  if (d.descDyn) { const x = d.descDyn(run); if (x) s += ` (${x})`; }
  const v = inst.st && inst.st.v;
  if (v != null) {
    const f = String(v).replace('.', ',');
    if (inst.id === 'seltzer') s += ` (encore ${v} mains)`;
    else if (inst.id === 'fusee') s += ` (actuellement $${v})`;
    else if (/×/.test(d.desc) || inst.id === 'bouillon') s += ` (actuellement ×${f})`;
    else if (/Jetons/.test(d.desc)) s += ` (actuellement +${v} Jetons)`;
    else s += ` (actuellement +${v} Mult)`;
  }
  if (inst.id === 'fidelite') { const n = (inst.st.n || 0) % 6; s += n === 5 ? ' (prochaine main !)' : ` (encore ${5 - n} mains)`; }
  return s;
}

/* ---------- Sauvegarde ---------- */
function save(run) {
  const o = Object.assign({}, run);
  o.drawPile = run.drawPile ? run.drawPile.map(c => c.id) : null;
  o.usedIds = run.usedIds ? [...run.usedIds] : null;
  o.hands = []; o.dealer = null; o.pack = null; o.log = [];
  return JSON.stringify(o);
}
function load(str) {
  const run = JSON.parse(str);
  if (!run || run.v !== 2) return null;
  attachRng(run);
  const byId = new Map(run.deck.map(c => [c.id, c]));
  run.drawPile = run.drawPile ? run.drawPile.map(id => byId.get(id)).filter(Boolean) : null;
  run.usedIds = new Set(run.usedIds || []);
  run.log = []; run.pendingPacks = run.pendingPacks || [];
  return run;
}
function drain(run) { const l = run.log; run.log = []; return l; }
function deckSummary(run) {
  const rem = run.drawPile && run.phase !== 'shop' && run.phase !== 'select' ? run.drawPile : run.deck;
  const s = { total: rem.length, aces: 0, tens: 0, small: 0, mid: 0 };
  rem.forEach(c => { if (c.enh === 'pierre' || c.rank >= 10) s.tens++; else if (c.rank === 1) s.aces++; else if (c.rank <= 6) s.small++; else s.mid++; });
  return s;
}

const H = {
  isSuit, isFace, rankIs, debuffed: isDebuffed, sellValue, maxSlots, mostPlayed,
  chance: (run, n) => run.rng() < Math.min(1, probMult(run) / n), chanceRaw: (run, n) => run.rng() < 1 / n,
  create, createCharm, destroyCharm, addCard, newCard, addTag,
};

const API = Object.assign({}, D, {
  CONFIG, SUITS, SUIT_SYM, RANKS, H,
  newRun, save, load, drain, blinds, skipBlind, startTable, dealHand, can, act, resolve, applyResult, endHand,
  finishTable, collectEarnings, makeShop, shopBuy, sellCharm, sellCons, moveCharm, leaveShop, rerollCost, itemPrice, packPrice, voucherPrice,
  openPack, packPick, packSkip, closePack, drawTirage, useCons, applyConsumable, consNeeds, consDef, consName,
  canRerollBoss, rerollBoss, handValue, isBlackjack, analyze, handTypeOf, handTypeStats, has, hasV, bossActive, activeBoss, isDebuffed,
  maxSlots, baseSlots, consSlots, charmRoom, consRoom, sellValue, charmPrice, charmDesc, curHand, interestCap, deckSummary, blindTarget, anteBase,
  processTags, addTag, mostPlayed, isFace, isSuit, canAfford, dealerStand, cardChips,
});
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.F21 = API;
})(this);
