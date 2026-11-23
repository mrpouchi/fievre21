// Génère src/icons.js à partir de icon_map.js et du jeu d'icônes game-icons.net (CC BY 3.0).
// Usage : node src/gen_icons.js <chemin vers @iconify-json/game-icons/icons.json>
const fs = require('fs');
const path = require('path');
const src = process.argv[2];
if (!src) { console.error('Usage : node src/gen_icons.js <icons.json de @iconify-json/game-icons>'); process.exit(1); }
const set = JSON.parse(fs.readFileSync(src, 'utf8'));
const M = require('./icon_map.js');
const resolve = n => { const seen = new Set(); while (set.aliases && set.aliases[n] && !set.icons[n] && !seen.has(n)) { seen.add(n); n = set.aliases[n].parent; } return set.icons[n] ? n : null; };

const map = {}, used = new Set(), missing = [];
for (const [kind, entries] of Object.entries(M)) {
  map[kind] = {};
  for (const [id, cands] of Object.entries(entries)) {
    const name = cands.split('|').map(resolve).find(Boolean);
    if (!name) { missing.push(`${kind}:${id}`); continue; }
    map[kind][id] = name; used.add(name);
  }
}
if (missing.length) { console.error('Icônes introuvables :', missing.join(', ')); process.exit(1); }

// Corps SVG en 512 × 512 : on ne garde que les « d » quand l'icône est un simple <path fill="currentColor">
const paths = {};
for (const n of [...used].sort()) {
  const body = set.icons[n].body;
  const m = body.match(/^<path fill="currentColor" d="([^"]+)"\/>$/);
  // Une décimale suffit sur une grille de 512 : le fichier pèse nettement moins
  // (on retokenise : « 1.4.005 » = deux nombres, il faut garder un séparateur après arrondi)
  const round = s => { let out = ''; for (const [, num, other] of s.matchAll(/(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)|([^\d.-]+|-)/g)) {
    if (other !== undefined) { out += other; continue; }
    let r = String(Math.round(parseFloat(num) * 10) / 10).replace(/^(-?)0\./, '$1.');
    if (r === '-0') r = '0';
    const prevNum = out.match(/[\d.]*$/)[0];
    if (prevNum && (/^\d/.test(r) || (r[0] === '.' && !prevNum.includes('.')))) out += ' ';
    out += r;
  } return out; };
  paths[n] = m ? round(m[1]) : body;
}
const out = `/* ===================== FIÈVRE 21 — ICÔNES =====================
   Généré par src/gen_icons.js à partir de src/icon_map.js. Ne pas modifier à la main.
   Icônes : game-icons.net (Lorc, Delapouite et contributeurs), licence CC BY 3.0. */
(function (root) {
root.F21I = ${JSON.stringify({ paths, map })};
})(this);
`;
fs.writeFileSync(path.join(__dirname, 'icons.js'), out);
console.log(`icons.js : ${used.size} icônes, ${out.length} octets`);
