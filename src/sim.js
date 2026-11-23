// Simulateur v2 : node src/sim.js [parties] [paquet] [mise]
const F = require('./engine.js');
const N = +process.argv[2] || 1000;
const DECK = process.argv[3] || 'rouge';
const STAKE = +process.argv[4] || 0;

const upVal = run => { if (F.bossActive(run, 'brume') && !F.has(run, 'lynx')) return 10; const c = run.dealer.cards[0]; return c.rank === 1 ? 11 : Math.min(10, c.rank); };
function decide(run) {
  const h = F.curHand(run), v = F.handValue(run, h.cards, true), u = upVal(run);
  if (F.can(run, 'split')) { const r = h.cards[0].rank; if (r === 1 || r === 8 || ((r === 9 || r === 7 || r <= 3) && u <= 7)) return 'split'; }
  if (F.can(run, 'double') && h.cards.length === 2 && !v.soft) { if (v.total === 11 || (v.total === 10 && u <= 9) || (v.total === 9 && u >= 3 && u <= 6)) return 'double'; }
  let want;
  if (v.soft) want = v.total <= 17 || (v.total === 18 && u >= 9) ? 'hit' : 'stand';
  else if (v.total <= 11) want = 'hit';
  else if (v.total === 12) want = (u >= 4 && u <= 6) ? 'stand' : 'hit';
  else if (v.total <= 16) want = u >= 7 ? 'hit' : 'stand';
  else want = 'stand';
  if (want === 'stand' && !F.can(run, 'stand')) want = 'hit';
  return want;
}
const RV = { c: 1, u: 2, r: 4, l: 8 };
const val = inst => RV[F.CHARMS[inst.id].rarity] * 3 + F.CHARMS[inst.id].price + (inst.ed ? 3 : 0) - (inst.dead ? 50 : 0);
function useAll(run) {
  for (let k = run.consumables.length - 1; k >= 0; k--) {
    const c = run.consumables[k]; if (!c) continue;
    const need = F.consNeeds(c);
    const tir = F.drawTirage(run, 8);
    const targets = need ? tir.slice(0, F.consDef(c).exact || need).map(x => x.id) : [];
    if (c.kind === 'spectre' && ['clone', 'malediction', 'avide'].includes(c.id) && run.charms.length > 1) continue;
    F.useCons(run, k, targets, tir);
  }
}
function openPending(run) {
  while (run.pendingPacks.length) { F.openPack(run, run.pendingPacks.shift()); pickPack(run); }
}
function pickPack(run) {
  let guard = 0;
  while (run.pack && guard++ < 10) {
    const pk = run.pack;
    const i = pk.choices.findIndex(x => x && !(x.cons && x.cons.kind === 'spectre' && ['clone', 'malediction'].includes(x.cons.id)) && !(x.kind === 'charm' && !F.charmRoom(run, x.inst)));
    if (i < 0) { F.packSkip(run); break; }
    const ch = pk.choices[i];
    let t = [];
    if (ch.cons) { const n = F.consNeeds(ch.cons); t = (pk.tirage || []).slice(0, F.consDef(ch.cons).exact || n).map(x => x.id); }
    const r = F.packPick(run, i, t);
    if (!r.ok) { pk.choices[i] = null; if (pk.choices.every(x => !x)) F.closePack(run); }
  }
}
function shop(run) {
  const s = run.shop;
  for (let pass = 0; pass < 8; pass++) {
    let bought = false;
    s.items.forEach((it, i) => {
      if (!it || bought) return;
      const p = F.itemPrice(run, it);
      if (!F.canAfford(run, p) || run.money - p < 0) return;
      if (it.kind === 'charm') {
        if (!F.charmRoom(run, it.inst)) {
          const worst = run.charms.map((x, k) => ({ x, k })).filter(o => !o.x.stk.e).sort((a, b) => val(a.x) - val(b.x))[0];
          if (worst && val(worst.x) + 3 < val(it.inst)) F.sellCharm(run, worst.k); else return;
        }
        if (F.shopBuy(run, 'item', i)) bought = true;
      } else if (it.kind === 'etoile' || it.kind === 'arcane') { if (F.consRoom(run) && F.shopBuy(run, 'item', i)) bought = true; }
    });
    if (!bought && s.vouchers.some(Boolean) && run.money >= F.voucherPrice(run) + 6) { const i = s.vouchers.findIndex(Boolean); if (F.shopBuy(run, 'voucher', i)) bought = true; }
    if (!bought) { const i = s.packs.findIndex(p => p && run.money >= F.packPrice(run, p) + 4); if (i >= 0 && F.shopBuy(run, 'pack', i)) { pickPack(run); bought = true; } }
    useAll(run);
    if (!bought) break;
  }
}
function playRun(seed) {
  const run = F.newRun({ seed, deck: DECK, stake: STAKE });
  let best = 0;
  for (let guard = 0; guard < 200; guard++) {
    // sélection
    const tagGood = run.blindIdx < 2 && ['economie', 'rare', 'prisme', 'negatif', 'charmes', 'invest'].includes(run.anteTags[run.blindIdx]) && run.ante > 1;
    if (tagGood && run.blindIdx === 0) { F.skipBlind(run); openPending(run); continue; }
    F.startTable(run);
    useAll(run);
    for (;;) {
      F.dealHand(run);
      while (run.phase === 'player' || run.phase === 'bustChoice') F.act(run, run.phase === 'bustChoice' ? 'jetBust' : decide(run));
      const { results } = F.resolve(run);
      for (const r of results) { F.applyResult(run, r); best = Math.max(best, r.score); }
      const e = F.endHand(run);
      if (e === 'won') break;
      if (e === 'lost') return { ante: run.ante, run, best };
    }
    if (run.ante >= 8 && run.blindIdx === 2) { F.finishTable(run); return { ante: 9, run, best }; }
    F.finishTable(run); F.collectEarnings(run);
    openPending(run);
    shop(run);
    F.leaveShop(run);
  }
  return { ante: run.ante, run, best };
}
const reached = {}; let maxHand = 0; const t0 = Date.now(); let wins = 0;
const finalCharms = {};
for (let i = 0; i < N; i++) {
  const r = playRun(5000 + i);
  reached[r.ante] = (reached[r.ante] || 0) + 1;
  if (r.ante >= 9) { wins++; r.run.charms.forEach(c => { finalCharms[c.id] = (finalCharms[c.id] || 0) + 1; }); }
  maxHand = Math.max(maxHand, r.best);
}
console.log(`Paquet ${DECK}, mise ${STAKE}, ${N} parties (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
let alive = N;
for (let a = 1; a <= 8; a++) {
  const dead = reached[a] || 0;
  const pass = alive - dead;
  console.log(`Ante ${a} (boss ${F.blindTarget({ stake: STAKE, deckId: DECK, ante: a, charms: [] }, 2, 'puriste')}) : ${(100 * pass / Math.max(1, alive)).toFixed(1).padStart(5)} % passent, ${(100 * pass / N).toFixed(1)} % du total`);
  alive = pass;
}
console.log('Victoires', (100 * wins / N).toFixed(1) + ' %', '· meilleure main', maxHand);
