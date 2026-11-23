/* ===================== FIÈVRE 21 — DONNÉES ===================== */
(function (root) {
'use strict';

/* ---------- Types de main (niveaux via les Étoiles) ---------- */
// ordre = priorité : la première condition remplie donne le type de la main
const HAND_TYPES = {
  septs:     { name: 'Triple Sept',  chips: 120, mult: 10, lc: 40, lm: 4, star: 'pleiades', desc: 'Exactement trois 7 (21)' },
  couleur21: { name: 'Couleur 21',   chips: 70,  mult: 7,  lc: 30, lm: 3, star: 'aldebaran', desc: '21 avec des cartes toutes de la même couleur' },
  brelan:    { name: 'Brelan',       chips: 50,  mult: 5,  lc: 25, lm: 2, star: 'betelgeuse', desc: 'Trois cartes de même rang' },
  blackjack: { name: 'Blackjack',    chips: 40,  mult: 5,  lc: 20, lm: 2, star: 'antares', desc: '21 avec tes 2 premières cartes' },
  suite:     { name: 'Suite',        chips: 40,  mult: 4,  lc: 25, lm: 2, star: 'rigel', desc: '3 cartes ou plus aux rangs qui se suivent' },
  charlie:   { name: 'Charlie',      chips: 35,  mult: 4,  lc: 25, lm: 2, star: 'altair', desc: '5 cartes ou plus sans dépasser 21' },
  couleur:   { name: 'Couleur',      chips: 30,  mult: 3,  lc: 15, lm: 2, star: 'vega', desc: '3 cartes ou plus toutes de la même couleur' },
  vingtun:   { name: '21',           chips: 20,  mult: 3,  lc: 15, lm: 1, star: 'sirius', desc: 'Exactement 21' },
  paire:     { name: 'Paire',        chips: 15,  mult: 2,  lc: 15, lm: 1, star: 'castor', desc: 'Deux cartes de même rang' },
  simple:    { name: 'Main simple',  chips: 10,  mult: 1,  lc: 10, lm: 1, star: 'polaris', desc: 'Toute autre main' },
};
const HAND_TYPE_IDS = Object.keys(HAND_TYPES);
const TWENTYONE_TYPES = ['septs', 'couleur21', 'blackjack', 'vingtun'];

/* ---------- Étoiles ---------- */
const ETOILES = {};
for (const t of HAND_TYPE_IDS) {
  const names = { pleiades: 'Pléiades', aldebaran: 'Aldébaran', betelgeuse: 'Bételgeuse', antares: 'Antarès', rigel: 'Rigel', altair: 'Altaïr', vega: 'Véga', sirius: 'Sirius', castor: 'Castor', polaris: 'Polaris' };
  const id = HAND_TYPES[t].star;
  ETOILES[id] = { id, name: names[id], type: t, price: 3, desc: `+1 niveau pour ${HAND_TYPES[t].name}` };
}

/* ---------- Améliorations, éditions, sceaux ---------- */
const ENH = {
  bonus:     { name: 'Bonus',     tag: '+30',  desc: '+30 Jetons quand elle marque' },
  feu:       { name: 'Feu',       tag: '+4',   desc: '+4 Mult quand elle marque' },
  verre:     { name: 'Verre',     tag: '×2',   desc: '×2 Mult quand elle marque, 1 chance sur 4 de se briser' },
  or:        { name: 'Or',        tag: '$3',   desc: '+$3 si la main est gagnée' },
  fantome:   { name: 'Fantôme',   tag: '0',    desc: 'Compte pour 0 dans le total mais rapporte ses jetons' },
  pierre:    { name: 'Pierre',    tag: '+50',  desc: 'Vaut toujours 10, +50 Jetons, sans rang ni couleur' },
  chance:    { name: 'Chance',    tag: '?',    desc: '1 chance sur 5 : +20 Mult. 1 chance sur 15 : +$20' },
  cameleon:  { name: 'Caméléon',  tag: '★',    desc: 'Compte comme toutes les couleurs' },
  elastique: { name: 'Élastique', tag: '~',    desc: 'Vaut 1 si sa valeur te ferait dépasser 21' },
};
const ENH_IDS = Object.keys(ENH);
const EDITIONS = {
  brillant: { name: 'Brillant',       desc: '+50 Jetons', price: 2 },
  holo:     { name: 'Holographique',  desc: '+10 Mult', price: 3 },
  prisme:   { name: 'Prismatique',    desc: '×1,5 Mult', price: 5 },
  negatif:  { name: 'Négatif',        desc: '+1 emplacement', price: 5 },
};
const SEALS = {
  rouge:  { name: 'Sceau rouge',  desc: 'La carte se déclenche une fois de plus' },
  or:     { name: 'Sceau doré',   desc: '+$3 quand la carte marque' },
  bleu:   { name: 'Sceau bleu',   desc: "Si la main est gagnée, crée l'Étoile du type de main" },
  violet: { name: 'Sceau violet', desc: 'Quand la carte est jetée, crée un Arcane' },
};

/* ---------- Porte-bonheur ---------- */
// c = contexte de score. Effet : { chips, mult, xmult, money }
const Ch = {};
function def(id, name, rarity, price, desc, hooks) { Ch[id] = Object.assign({ id, name, rarity, price, desc }, hooks || {}); }
const st = (i, k, d) => (i.st[k] == null ? d : i.st[k]);
const X = v => Math.round(v * 100) / 100;

// --- Originaux (version 1, retouchés)
def('pilepoil', 'Pile Poil', 'u', 6, '×3 Mult si la main fait exactement 21', { onHand: c => c.total === 21 ? { xmult: 3 } : null });
def('charlie', 'Quatuor', 'c', 4, '+6 Mult si la main a 4 cartes ou plus', { onHand: c => c.n >= 4 ? { mult: 6 } : null });
def('cassecou', 'Casse-cou', 'u', 6, '+3 Mult par carte au-delà de 2', { onHand: c => c.n > 2 ? { mult: 3 * (c.n - 2) } : null });
def('prudence', 'Prudence', 'c', 4, '+60 Jetons si la main fait 17 ou moins', { onHand: c => c.total <= 17 ? { chips: 60 } : null });
def('maudit', 'Croupier Maudit', 'u', 6, '×2 Mult si le croupier dépasse 21', { onHand: c => c.dealerBust ? { xmult: 2 } : null });
def('lynx', 'Œil de Lynx', 'c', 4, 'La carte cachée du croupier est visible');
def('boule', 'Boule de Cristal', 'c', 4, 'Tu vois la prochaine carte de ta pioche');
def('chasseur', "Chasseur d'As", 'c', 5, 'Chaque As joué donne +30 Jetons et +4 Mult', { onCard: (c, k) => c.H.rankIs(c.run, k, 1) ? { chips: 30, mult: 4 } : null });
def('sang', 'Sang Rouge', 'c', 5, 'Chaque ♥ ou ♦ joué donne +3 Mult', { onCard: (c, k) => (c.H.isSuit(c.run, k, 'H') || c.H.isSuit(c.run, k, 'D')) ? { mult: 3 } : null });
def('encre', 'Encre Noire', 'c', 5, 'Chaque ♠ ou ♣ joué donne +30 Jetons', { onCard: (c, k) => (c.H.isSuit(c.run, k, 'S') || c.H.isSuit(c.run, k, 'C')) ? { chips: 30 } : null });
def('cour', 'Cour Royale', 'c', 5, 'Chaque figure jouée donne +4 Mult', { onCard: (c, k) => c.H.isFace(c.run, k) ? { mult: 4 } : null });
def('septieme', 'Septième Ciel', 'u', 6, 'Chaque 7 joué donne ×1,5 Mult', { onCard: (c, k) => c.H.rankIs(c.run, k, 7) ? { xmult: 1.5 } : null });
def('calibre', 'Petit Calibre', 'c', 5, 'Chaque carte de 2 à 5 donne +15 Jetons et +2 Mult', { onCard: (c, k) => (k.enh !== 'pierre' && k.rank >= 2 && k.rank <= 5) ? { chips: 15, mult: 2 } : null });
def('elan', 'Élan', 'u', 6, "+2 Mult par victoire d'affilée", { onHand: c => c.run.streak > 0 ? { mult: 2 * c.run.streak } : null });
def('tirelire', 'Tirelire', 'c', 4, 'Plafond des intérêts +$3');
def('poignee', 'Poignée de Main', 'c', 4, 'Les égalités rapportent 100 %');
def('filet', 'Filet de Sécurité', 'u', 5, 'Un bust rapporte quand même 50 % du score');
def('quitte', 'Quitte ou Double', 'r', 8, 'Doubler donne ×4 Mult au lieu de ×2');
def('mainpleine', 'Main Pleine', 'r', 8, '+1 main par table');
def('ferrailleur', 'Ferrailleur', 'c', 4, '+2 jets par table');
def('dividende', 'Dividende', 'c', 5, '+$1 par main gagnée', { after: c => c.win ? { money: 1 } : null });
def('capitaliste', 'Capitaliste', 'r', 9, '×Mult égal à 1 + (argent ÷ 20)', { onHand: c => c.run.money > 0 ? { xmult: X(1 + c.run.money / 20) } : null });
def('artisan', 'Artisan', 'u', 7, '+×0,15 Mult par carte améliorée dans ton paquet', { onHand: c => { const k = c.run.deck.filter(x => x.enh).length; return k ? { xmult: X(1 + 0.15 * k) } : null; } });
def('minimaliste', 'Minimaliste', 'u', 7, '×2 Mult si ton paquet a 44 cartes ou moins', { onHand: c => c.run.deck.length <= 44 ? { xmult: 2 } : null });
def('tetebrulee', 'Tête Brûlée', 'r', 8, '×3 Mult si tu as tiré à 17 ou plus sans dépasser 21', { onHand: c => (c.hand.hitHigh && !c.busted) ? { xmult: 3 } : null });
def('contre', 'Contre-Attaque', 'u', 6, "Si le croupier a un Blackjack, sa carte cachée est remplacée et tu joues quand même");

// --- Mult / Jetons simples
def('ficelle', 'Bout de Ficelle', 'c', 3, '+4 Mult', { onHand: () => ({ mult: 4 }) });
def('bourrin', 'Bourrin', 'c', 3, '+8 Mult si la main contient une paire', { onHand: c => c.f.pair ? { mult: 8 } : null });
def('rigolo', 'Rigolo', 'c', 4, '+12 Mult si la main contient un brelan', { onHand: c => c.f.brelan ? { mult: 12 } : null });
def('serenade', 'Sérénade', 'c', 4, '+10 Mult si la main contient une Couleur', { onHand: c => c.f.couleur ? { mult: 10 } : null });
def('escalier', 'Escalier', 'c', 4, '+12 Mult si la main contient une Suite', { onHand: c => c.f.suite ? { mult: 12 } : null });
def('pivot', 'Pivot', 'c', 3, '+50 Jetons si la main contient une paire', { onHand: c => c.f.pair ? { chips: 50 } : null });
def('harmonie', 'Harmonie', 'c', 4, '+80 Jetons si la main contient une Couleur', { onHand: c => c.f.couleur ? { chips: 80 } : null });
def('echelle', 'Échelle', 'c', 4, '+100 Jetons si la main contient une Suite', { onHand: c => c.f.suite ? { chips: 100 } : null });
def('toupie', 'Toupie', 'c', 4, '+100 Jetons si la main contient un brelan', { onHand: c => c.f.brelan ? { chips: 100 } : null });
def('demiportion', 'Demi-Portion', 'c', 5, '+20 Mult si la main a 2 cartes', { onHand: c => c.n === 2 ? { mult: 20 } : null });
def('banniere', 'Bannière', 'c', 5, '+30 Jetons par jet restant', { onHand: c => c.run.jets > 0 ? { chips: 30 * c.run.jets } : null });
def('sommet', 'Sommet', 'c', 5, "+15 Mult s'il ne te reste aucun jet", { onHand: c => c.run.jets === 0 ? { mult: 15 } : null });
def('egalitaire', 'Égalitaire', 'c', 4, 'Chaque carte paire jouée (2, 4, 6, 8, 10) donne +4 Mult', { onCard: (c, k) => (k.enh !== 'pierre' && k.rank <= 10 && k.rank % 2 === 0) ? { mult: 4 } : null });
def('impair', 'Impair', 'c', 4, 'Chaque carte impaire jouée (A, 3, 5, 7, 9) donne +31 Jetons', { onCard: (c, k) => (k.enh !== 'pierre' && k.rank <= 9 && k.rank % 2 === 1) ? { chips: 31 } : null });
def('pari', 'Pari Fou', 'c', 4, '+0 à +23 Mult au hasard', { onHand: c => ({ mult: Math.floor(c.run.rng() * 24) }) });
def('grocalibre', 'Gros Calibre', 'c', 4, 'Chaque 8, 9 ou 10 joué donne +20 Jetons', { onCard: (c, k) => (k.enh !== 'pierre' && k.rank >= 8 && k.rank <= 10) ? { chips: 20 } : null });
def('poing', 'Poing Levé', 'c', 5, 'Ajoute 2× la valeur de ta carte la plus basse au Mult', { onHand: c => { const v = c.cards.filter(k => k.enh !== 'pierre').map(k => Math.min(10, k.rank)); return v.length ? { mult: 2 * Math.min(...v) } : null; } });
def('glace', 'Glace', 'c', 5, '+100 Jetons, −5 Jetons par main jouée', { onHand: (c, i) => st(i, 'v', 100) > 0 ? { chips: st(i, 'v', 100) } : null, after: (c, i) => { i.st.v = st(i, 'v', 100) - 5; if (i.st.v <= 0) return { destroy: true, msg: 'Glace fondue !' }; } });
def('popcorn', 'Pop-corn', 'c', 5, '+20 Mult, −4 Mult par table', { onHand: (c, i) => ({ mult: st(i, 'v', 20) }), tableEnd: (run, i) => { i.st.v = st(i, 'v', 20) - 4; if (i.st.v <= 0) return { destroy: true, msg: 'Pop-corn terminé !' }; } });
def('bavard', 'Croupier Bavard', 'c', 4, '+3 Mult par carte du croupier', { onHand: c => ({ mult: 3 * c.dealerN }) });
def('dynamite', 'Dynamite', 'u', 6, '+8 Mult par carte tirée par le croupier', { onHand: c => c.dealerN > 2 ? { mult: 8 * (c.dealerN - 2) } : null });
def('souplesse', 'Souplesse', 'c', 4, '+12 Mult si ta main finale est souple (As compté 11)', { onHand: c => c.soft ? { mult: 12 } : null });
def('compteurfou', 'Compteur Fou', 'c', 4, '+3 Jetons par point de ton total', { onHand: c => c.total <= 21 ? { chips: 3 * c.total } : null });
def('avance', 'Large Avance', 'c', 5, "+2 Mult par point d'écart quand tu gagnes", { onHand: c => (c.win && c.margin > 0) ? { mult: 2 * c.margin } : null });
def('piquenique', 'Pique-Nique', 'c', 5, '+3 Mult par main gagnée cette table', { onHand: c => c.run.tf.wins ? { mult: 3 * c.run.tf.wins } : null });
def('collection', 'Collectionneur', 'c', 4, '+4 Mult par couleur différente dans la main', { onHand: c => { const s = new Set(); c.cards.forEach(k => { if (k.enh !== 'pierre') s.add(k.suit); }); return s.size ? { mult: 4 * s.size } : null; } });
def('poucet', 'Petit Poucet', 'c', 5, '+30 Mult si tu gagnes avec 15 ou moins', { onHand: c => (c.win && c.total <= 15) ? { mult: 30 } : null });
def('sourire', 'Sourire', 'c', 4, 'Chaque figure jouée donne +5 Mult', { onCard: (c, k) => c.H.isFace(c.run, k) ? { mult: 5 } : null });
def('masque', 'Masque Effrayant', 'c', 4, 'Chaque figure jouée donne +30 Jetons', { onCard: (c, k) => c.H.isFace(c.run, k) ? { chips: 30 } : null });
def('talkie', 'Talkie-Walkie', 'c', 4, 'Chaque 10 ou 4 joué donne +10 Jetons et +4 Mult', { onCard: (c, k) => (c.H.rankIs(c.run, k, 10) || c.H.rankIs(c.run, k, 4)) ? { chips: 10, mult: 4 } : null });
def('clairlune', 'Clair de Lune', 'c', 5, 'Chaque Dame jouée donne +10 Mult', { onCard: (c, k) => c.H.rankIs(c.run, k, 12) ? { mult: 10 } : null });
def('fibonacci', 'Fibonacci', 'u', 7, 'Chaque As, 2, 3, 5 ou 8 joué donne +8 Mult', { onCard: (c, k) => (k.enh !== 'pierre' && [1, 2, 3, 5, 8].includes(k.rank)) ? { mult: 8 } : null });
def('abstrait', 'Abstrait', 'c', 4, '+3 Mult par porte-bonheur possédé', { onHand: c => ({ mult: 3 * c.run.charms.length }) });
def('taureau', 'Taureau', 'u', 6, '+2 Jetons par $ possédé', { onHand: c => c.run.money > 0 ? { chips: 2 * c.run.money } : null });
def('lacets', 'Lacets', 'u', 7, '+2 Mult par tranche de $5 possédés', { onHand: c => c.run.money >= 5 ? { mult: 2 * Math.floor(c.run.money / 5) } : null });
def('flibustier', 'Flibustier', 'c', 4, 'Ajoute la valeur de revente des autres porte-bonheur au Mult', { onHand: (c, i) => { let s = 0; c.run.charms.forEach(o => { if (o !== i) s += c.H.sellValue(c.run, o); }); return s ? { mult: s } : null; } });
def('erosion', 'Érosion', 'u', 6, '+4 Mult par carte en dessous de 52 dans ton paquet', { onHand: c => c.run.deck.length < 52 ? { mult: 4 * (52 - c.run.deck.length) } : null });
def('tailleur', 'Tailleur de Pierre', 'u', 6, '+25 Jetons par carte Pierre dans ton paquet', { onHand: c => { const k = c.run.deck.filter(x => x.enh === 'pierre').length; return k ? { chips: 25 * k } : null; } });
def('diseuse', 'Diseuse de Bonne Aventure', 'c', 6, '+1 Mult par Arcane utilisé cette partie', { onHand: c => c.run.stats.arcanes ? { mult: c.run.stats.arcanes } : null });
def('supernova', 'Supernova', 'c', 5, 'Ajoute au Mult le nombre de fois où ce type de main a été joué', { onHand: c => { const n = c.run.handPlays[c.type] || 0; return n ? { mult: n } : null; } });
def('cascadeur', 'Cascadeur', 'r', 7, '+250 Jetons, −1 jet par table', { onHand: () => ({ chips: 250 }) });
def('banane', 'Banane', 'c', 5, '+15 Mult. 1 chance sur 6 de pourrir en fin de table', { onHand: () => ({ mult: 15 }), tableEnd: (run, i, H) => { if (H.chance(run, 6)) { run.flags.bananeGone = true; return { destroy: true, msg: 'La Banane a pourri !' }; } } });
def('bananebleue', 'Banane Bleue', 'c', 4, '×3 Mult. 1 chance sur 1000 de pourrir en fin de table', { onHand: () => ({ xmult: 3 }), tableEnd: (run, i, H) => H.chance(run, 1000) ? { destroy: true, msg: 'La Banane Bleue a pourri !' } : null, pool: run => !!run.flags.bananeGone });
def('pileface', 'Pile ou Face', 'c', 5, '×2 ou ×0,5 Mult au hasard', { onHand: c => ({ xmult: c.run.rng() < 0.5 ? 2 : 0.5 }) });

// --- ×Mult
def('pochoir', 'Pochoir', 'u', 8, '×1 Mult par emplacement vide (lui compris)', { onHand: c => { const free = c.H.maxSlots(c.run) - c.run.charms.filter(i => i.ed !== 'negatif').length + 1; return free > 1 ? { xmult: free } : null; } });
def('fidelite', 'Carte Fidélité', 'u', 5, '×4 Mult toutes les 6 mains', { onHand: (c, i) => (st(i, 'n', 0) % 6 === 5) ? { xmult: 4 } : null, after: (c, i) => { i.st.n = st(i, 'n', 0) + 1; } });
def('arnaqueur', 'Arnaqueur', 'u', 6, '×3 Mult si ce type de main a déjà été joué cette table', { onHand: c => (c.run.tf.types[c.type] || 0) > 0 ? { xmult: 3 } : null });
def('tableau', 'Tableau Noir', 'u', 6, '×3 Mult si toutes tes cartes sont ♠ ou ♣', { onHand: c => c.cards.length && c.cards.every(k => c.H.isSuit(c.run, k, 'S') || c.H.isSuit(c.run, k, 'C')) ? { xmult: 3 } : null });
def('acrobate', 'Acrobate', 'u', 6, '×3 Mult à la dernière main de la table', { onHand: c => c.last ? { xmult: 3 } : null });
def('photo', 'Photographie', 'c', 5, 'La première figure jouée donne ×2 Mult', { onCard: (c, k) => { if (!c.H.isFace(c.run, k)) return null; const first = c.cards.find(x => c.H.isFace(c.run, x)); return first === k && !c.retrig ? { xmult: 2 } : null; } });
def('grenat', 'Grenat', 'u', 7, 'Chaque ♥ joué a 1 chance sur 2 de donner ×1,5 Mult', { onCard: (c, k) => (c.H.isSuit(c.run, k, 'H') && c.H.chance(c.run, 2)) ? { xmult: 1.5 } : null });
def('fleche', 'Pointe de Flèche', 'u', 7, 'Chaque ♠ joué donne +50 Jetons', { onCard: (c, k) => c.H.isSuit(c.run, k, 'S') ? { chips: 50 } : null });
def('agate', 'Agate', 'u', 7, 'Chaque ♣ joué donne +7 Mult', { onCard: (c, k) => c.H.isSuit(c.run, k, 'C') ? { mult: 7 } : null });
def('pierrebrute', 'Pierre Brute', 'u', 7, 'Chaque ♦ joué rapporte $1', { onCard: (c, k) => c.H.isSuit(c.run, k, 'D') ? { money: 1 } : null });
def('pot', 'Pot de Fleurs', 'u', 6, '×3 Mult si la main contient ♥, ♦, ♠ et ♣', { onHand: c => ['H', 'D', 'S', 'C'].every(s => c.cards.some(k => c.H.isSuit(c.run, k, s))) ? { xmult: 3 } : null });
def('vision', 'Double Vision', 'u', 6, '×2 Mult si la main contient un ♣ et une carte d\'une autre couleur', { onHand: c => (c.cards.some(k => c.H.isSuit(c.run, k, 'C')) && c.cards.some(k => k.enh !== 'pierre' && !c.H.isSuit(c.run, k, 'C'))) ? { xmult: 2 } : null });
def('duo', 'Le Duo', 'r', 8, '×2 Mult si la main contient une paire', { onHand: c => c.f.pair ? { xmult: 2 } : null });
def('trio', 'Le Trio', 'r', 8, '×3 Mult si la main contient un brelan', { onHand: c => c.f.brelan ? { xmult: 3 } : null });
def('famille', 'La Famille', 'r', 8, '×4 Mult si la main contient un carré', { onHand: c => c.f.carre ? { xmult: 4 } : null });
def('ordre', "L'Ordre", 'r', 8, '×3 Mult si la main contient une Suite', { onHand: c => c.f.suite ? { xmult: 3 } : null });
def('tribu', 'La Tribu', 'r', 8, '×2 Mult si la main contient une Couleur', { onHand: c => c.f.couleur ? { xmult: 2 } : null });
def('roisoleil', 'Le Roi Soleil', 'r', 8, 'Chaque Roi joué donne ×1,5 Mult', { onCard: (c, k) => c.H.rankIs(c.run, k, 13) ? { xmult: 1.5 } : null });
def('permis', 'Permis de Conduire', 'r', 7, '×3 Mult si ton paquet a au moins 16 cartes améliorées', { onHand: c => c.run.deck.filter(x => x.enh).length >= 16 ? { xmult: 3 } : null });
def('collectionc', 'Carte de Collection', 'r', 8, 'Chaque porte-bonheur Peu commun donne ×1,5 Mult', { onHand: c => { const k = c.run.charms.filter(i => !i.off && Ch[i.id].rarity === 'u').length; return k ? { xmult: X(Math.pow(1.5, k)) } : null; } });
def('photofinish', 'Photo-Finish', 'u', 6, "×3 Mult si tu gagnes d'un seul point", { onHand: c => (c.win && c.margin === 1) ? { xmult: 3 } : null });
def('revanche', 'Revanche', 'u', 6, 'Gagner contre un croupier qui montrait un As ou un 10 donne ×2 Mult', { onHand: c => (c.win && c.dealerUp && (c.dealerUp.rank === 1 || c.dealerUp.rank >= 10)) ? { xmult: 2 } : null });
def('royal', 'Main Royale', 'u', 6, 'Un Blackjack avec un Roi ou une Dame donne ×3 Mult', { onHand: c => (c.type === 'blackjack' && c.cards.some(k => k.rank === 12 || k.rank === 13)) ? { xmult: 3 } : null });
def('tirageparfait', 'Tirage Parfait', 'u', 6, '×2 Mult si tu atteins 21 en tirant exactement une carte', { onHand: c => (c.total === 21 && c.n === 3) ? { xmult: 2 } : null });
def('jumeaux', 'Jumeaux', 'u', 6, 'Après une séparation, chaque main gagnée donne ×1,5 Mult', { onHand: c => (c.split && c.win) ? { xmult: 1.5 } : null });
def('roulette', 'Roulette Russe', 'r', 8, '×5 Mult, mais 1 chance sur 6 que la main ne marque rien', { onHand: c => c.H.chanceRaw(c.run, 6) ? { xmult: 0, msg: 'Pan !' } : { xmult: 5 } });

// --- Qui grandissent
def('accro', 'Accro', 'c', 6, "Gagne +1 Mult par main d'affilée sans figure", { pre: (c, i) => { i.st.v = c.cards.some(k => c.H.isFace(c.run, k)) ? 0 : st(i, 'v', 0) + 1; }, onHand: (c, i) => st(i, 'v', 0) ? { mult: st(i, 'v', 0) } : null });
def('coureur', 'Coureur', 'c', 5, 'Gagne +15 Jetons à chaque main contenant une Suite', { pre: (c, i) => { if (c.f.suite) i.st.v = st(i, 'v', 0) + 15; }, onHand: (c, i) => st(i, 'v', 0) ? { chips: st(i, 'v', 0) } : null });
def('jumelles', 'Jumelles', 'u', 6, 'Gagne +2 Mult à chaque main contenant une paire', { pre: (c, i) => { if (c.f.pair) i.st.v = st(i, 'v', 0) + 2; }, onHand: (c, i) => st(i, 'v', 0) ? { mult: st(i, 'v', 0) } : null });
def('carre', 'Carré Magique', 'c', 4, 'Gagne +4 Jetons à chaque main de exactement 4 cartes', { pre: (c, i) => { if (c.n === 4) i.st.v = st(i, 'v', 0) + 4; }, onHand: (c, i) => st(i, 'v', 0) ? { chips: st(i, 'v', 0) } : null });
def('petitbonhomme', 'Petit Bonhomme', 'r', 8, 'Gagne +8 Jetons à chaque 2 joué', { onCard: (c, k, i) => { if (!c.H.rankIs(c.run, k, 2)) return null; i.st.v = st(i, 'v', 0) + 8; return null; }, onHand: (c, i) => st(i, 'v', 0) ? { chips: st(i, 'v', 0) } : null });
def('randonneur', 'Randonneur', 'u', 5, 'Chaque carte jouée gagne +4 Jetons pour toujours', { onCard: (c, k) => { if (!c.retrig) k.bonus = (k.bonus || 0) + 4; return null; } });
def('vampire', 'Vampire', 'u', 7, "Gagne ×0,1 Mult par carte améliorée jouée et lui retire son amélioration", { pre: (c, i) => { const e = c.cards.filter(k => k.enh && !c.H.debuffed(c.run, k)); if (e.length) { i.st.v = X(st(i, 'v', 1) + 0.1 * e.length); c.vampire = e; } }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null, after: c => { (c.vampire || []).forEach(k => { k.enh = null; }); } });
def('constellation', 'Constellation', 'u', 6, 'Gagne ×0,1 Mult par Étoile utilisée', { onUse: (run, i, kind) => { if (kind === 'etoile') i.st.v = X(st(i, 'v', 1) + 0.1); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('hologramme', 'Hologramme', 'u', 7, 'Gagne ×0,25 Mult à chaque carte ajoutée à ton paquet', { onCardAdded: (run, i, n) => { i.st.v = X(st(i, 'v', 1) + 0.25 * n); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('chat', 'Chat Porte-Bonheur', 'u', 6, 'Gagne ×0,25 Mult à chaque fois qu\'une carte Chance se déclenche', { onLucky: (run, i) => { i.st.v = X(st(i, 'v', 1) + 0.25); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('vitrier', 'Vitrier', 'u', 6, 'Gagne ×0,75 Mult par carte Verre brisée', { onGlass: (run, i) => { i.st.v = X(st(i, 'v', 1) + 0.75); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('feucamp', 'Feu de Camp', 'r', 9, 'Gagne ×0,25 Mult par carte vendue, remis à zéro après un boss', { onSell: (run, i) => { i.st.v = X(st(i, 'v', 1) + 0.25); }, onBoss: (run, i) => { i.st.v = 1; }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('obelisque', 'Obélisque', 'r', 8, "Gagne ×0,2 Mult par main d'affilée sans jouer ton type de main le plus joué", { pre: (c, i) => { const top = c.H.mostPlayed(c.run); i.st.v = (top && c.type === top) ? 1 : X(st(i, 'v', 1) + 0.2); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('folie', 'Folie', 'u', 7, 'En début de petite ou grande table, gagne ×0,5 Mult et détruit un porte-bonheur au hasard', { tableStart: (run, i, H) => { if (run.blind.kind === 'boss') return; i.st.v = X(st(i, 'v', 1) + 0.5); const others = run.charms.filter(o => o !== i && !(o.stk && o.stk.e)); if (others.length) { const v = others[Math.floor(run.rng() * others.length)]; H.destroyCharm(run, v); return { msg: `Folie détruit ${Ch[v.id].name}` }; } }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('dague', 'Dague', 'u', 6, 'En début de table, détruit le porte-bonheur à droite et ajoute 2× sa revente à son Mult', { tableStart: (run, i, H) => { const k = run.charms.indexOf(i); const v = run.charms[k + 1]; if (!v || (v.stk && v.stk.e)) return; i.st.v = st(i, 'v', 0) + 2 * H.sellValue(run, v); H.destroyCharm(run, v); return { msg: `La Dague tranche ${Ch[v.id].name}` }; }, onHand: (c, i) => st(i, 'v', 0) ? { mult: st(i, 'v', 0) } : null });
def('cartonrouge', 'Carton Rouge', 'c', 5, 'Gagne +3 Mult à chaque paquet passé sans rien prendre', { onSkipPack: (run, i) => { i.st.v = st(i, 'v', 0) + 3; }, onHand: (c, i) => st(i, 'v', 0) ? { mult: st(i, 'v', 0) } : null });
def('flash', 'Carte Flash', 'u', 5, 'Gagne +2 Mult à chaque relance de la boutique', { onReroll: (run, i) => { i.st.v = st(i, 'v', 0) + 2; }, onHand: (c, i) => st(i, 'v', 0) ? { mult: st(i, 'v', 0) } : null });
def('bouillon', 'Bouillon', 'u', 6, '×2 Mult, perd ×0,1 à chaque carte jetée', { onJet: (run, i) => { i.st.v = X(st(i, 'v', 2) - 0.1); if (i.st.v <= 1) return { destroy: true, msg: 'Bouillon terminé !' }; }, onHand: (c, i) => ({ xmult: st(i, 'v', 2) }) });
def('chateau', 'Château', 'u', 6, 'Gagne +5 Jetons par carte de la couleur du jour jetée', { onJet: (run, i, card) => { if (card && card.suit === run.tf.chateau && card.enh !== 'pierre') i.st.v = st(i, 'v', 0) + 5; }, onHand: (c, i) => st(i, 'v', 0) ? { chips: st(i, 'v', 0) } : null, descDyn: run => `couleur du jour : ${({ H: '♥', D: '♦', S: '♠', C: '♣' })[run.tf && run.tf.chateau] || '?'}` });
def('domino', 'Effet Domino', 'u', 5, '+1 Mult par carte jouée cette table', { onHand: c => c.run.tf.cards ? { mult: c.run.tf.cards } : null });
def('retour', 'Retour en Arrière', 'u', 6, '×0,25 Mult par table passée cette partie', { onHand: c => c.run.stats.skips ? { xmult: X(1 + 0.25 * c.run.stats.skips) } : null });
def('dragon', 'Le Dragon', 'l', 20, '×Mult égal à 1 + 0,5 par Blackjack réussi cette partie', { onHand: c => c.run.stats.blackjacks ? { xmult: X(1 + 0.5 * c.run.stats.blackjacks) } : null });
def('phenix', 'Le Phénix', 'l', 20, 'Gagne ×0,5 Mult à chaque carte retirée de ton paquet', { onCardRemoved: (run, i) => { i.st.v = X(st(i, 'v', 1) + 0.5); }, onHand: (c, i) => st(i, 'v', 1) > 1 ? { xmult: st(i, 'v', 1) } : null });
def('sphinx', 'Le Sphinx', 'l', 20, 'Chaque Roi et chaque Dame joués donnent ×2 Mult', { onCard: (c, k) => (c.H.rankIs(c.run, k, 12) || c.H.rankIs(c.run, k, 13)) ? { xmult: 2 } : null });
def('chimere', 'La Chimère', 'l', 20, 'Redéclenche toutes les cartes jouées 2 fois', { retrig: () => 2 });
def('kraken', 'Le Kraken', 'l', 20, "Désactive l'effet de tous les boss");

// --- Redéclenchements
def('crepuscule', 'Crépuscule', 'u', 5, 'Redéclenche toutes les cartes à la dernière main de la table', { retrig: c => c.last ? 1 : 0 });
def('bis', 'Bis Repetita', 'u', 6, 'Redéclenche chaque 2, 3, 4 et 5 joué', { retrig: (c, k) => (k.enh !== 'pierre' && k.rank >= 2 && k.rank <= 5) ? 1 : 0 });
def('comedie', 'Comédie et Tragédie', 'u', 6, 'Redéclenche chaque figure jouée', { retrig: (c, k) => c.H.isFace(c.run, k) ? 1 : 0 });
def('premier', 'Ticket Premier', 'c', 4, 'La première carte jouée se redéclenche 2 fois', { retrig: (c, k) => c.cards[0] === k ? 2 : 0 });
def('seltzer', 'Eau Gazeuse', 'u', 6, 'Redéclenche toutes les cartes pendant les 10 prochaines mains', { retrig: (c, k, i) => st(i, 'v', 10) > 0 ? 1 : 0, after: (c, i) => { i.st.v = st(i, 'v', 10) - 1; if (i.st.v <= 0) return { destroy: true, msg: 'Eau Gazeuse éventée !' }; } });

// --- Copie
def('reflet', 'Reflet', 'r', 10, 'Copie l\'effet du porte-bonheur à sa droite', { copy: 'right' });
def('echo', 'Écho', 'r', 10, 'Copie l\'effet du porte-bonheur le plus à gauche', { copy: 'left' });

// --- Règles
def('doigts', 'Doigts Agiles', 'u', 7, 'Couleurs et Suites possibles dès 2 cartes, Charlie dès 4 cartes');
def('raccourci', 'Raccourci', 'u', 7, "Les Suites peuvent sauter un rang (ex. 3-5-6)");
def('pareidolie', 'Paréidolie', 'u', 5, 'Toutes les cartes comptent comme des figures');
def('barbouille', 'Barbouillé', 'u', 7, '♥ et ♦ comptent comme la même couleur, ♠ et ♣ aussi');
def('depipe', 'Dé Pipé', 'u', 6, 'Double toutes les probabilités (1 sur 4 → 2 sur 4)');
def('saltimbanque', 'Saltimbanque', 'u', 5, 'Les porte-bonheur et consommables peuvent apparaître en double');
def('credit', 'Carte de Crédit', 'c', 1, "Tu peux t'endetter jusqu'à −$20");
def('pilier', 'Pilier de Bar', 'c', 4, '+1 jet par table');
def('cambrioleur', 'Cambrioleur', 'u', 6, '+2 mains par table, mais plus aucun jet');
def('doubleur', 'Doubleur', 'u', 6, 'Tu peux doubler avec 3 cartes');
def('fendeur', 'Fendeur', 'u', 6, 'Tu peux séparer n\'importe quelles deux cartes');
def('souffle', 'Second Souffle', 'u', 6, 'Ton premier bust de chaque table est annulé gratuitement');
def('croupierlas', 'Croupier Las', 'r', 8, "Le croupier s'arrête dès 16");
def('assurance', 'Assurance', 'c', 4, 'Perdre contre un Blackjack du croupier rapporte $5', { after: c => (c.outcome === 'lose' && c.run.dealerBJ) ? { money: 5 } : null });
def('squelette', 'Squelette', 'u', 5, "Empêche la défaite si tu as atteint 25 % de l'objectif, puis se détruit");
def('luchador', 'Catcheur', 'u', 5, "Vends-le pour désactiver le boss en cours", { sellUse: (run) => { if (run.blind && run.blind.boss && run.phase !== 'shop') { run.tf.bossOff = true; return { msg: 'Boss désactivé !' }; } } });
def('soda', 'Soda', 'u', 6, 'Vends-le pour gagner un Badge Double', { sellUse: (run, i, H) => { H.addTag(run, 'double'); return { msg: 'Badge Double obtenu' }; } });
def('marchenoir', 'Marché Noir', 'u', 6, 'Tout coûte $1 de moins en boutique');
def('bonimenteur', 'Bonimenteur', 'c', 4, '1 relance gratuite par boutique');
def('astronome', 'Astronome', 'u', 8, 'Les Étoiles et les paquets d\'Étoiles sont gratuits en boutique');

// --- Argent
def('pepite', 'Pépite', 'c', 6, '+$4 en fin de table', { tableEnd: () => ({ money: 4 }) });
def('oeuf', 'Œuf', 'c', 4, 'Gagne $3 de valeur de revente en fin de table', { tableEnd: (run, i) => { i.sell = (i.sell || 0) + 3; } });
def('visite', 'Carte de Visite', 'c', 4, 'Chaque figure jouée a 1 chance sur 2 de rapporter $2', { onCard: (c, k) => (c.H.isFace(c.run, k) && c.H.chance(c.run, 2)) ? { money: 2 } : null });
def('petard', 'Pétard Mouillé', 'c', 4, '+$2 quand le croupier dépasse 21', { after: c => (c.dealerBust && c.firstOfDeal) ? { money: 2 } : null });
def('ruee', 'Ruée vers l\'Or', 'c', 5, '+$2 par main gagnée avec 4 cartes ou plus', { after: c => (c.win && c.n >= 4) ? { money: 2 } : null });
def('gratte', 'Ticket à Gratter', 'c', 4, 'Chaque main gagnée a 1 chance sur 4 de rapporter $5', { after: c => (c.win && c.H.chance(c.run, 4)) ? { money: 5 } : null });
def('feuille', 'Feuille de Route', 'c', 4, '+$4 si la main est du type du jour (change à chaque table)', { after: c => c.type === c.run.tf.todo ? { money: 4 } : null, descDyn: run => `type du jour : ${run.tf && run.tf.todo ? HAND_TYPES[run.tf.todo].name : '?'}` });
def('recycleur', 'Recycleur', 'c', 4, 'Chaque carte jetée rapporte $2', { onJet: () => ({ money: 2 }) });
def('patience', 'Patience', 'c', 4, "$2 par jet restant en fin de table si tu n'en as utilisé aucun", { tableEnd: run => (run.tf.jetsUsed === 0 && run.jets > 0) ? { money: 2 * run.jets } : null });
def('nuage', 'Neuf Nuages', 'u', 7, '$1 par 9 dans ton paquet en fin de table', { tableEnd: run => { const n = run.deck.filter(c => c.rank === 9 && c.enh !== 'pierre').length; return n ? { money: n } : null; } });
def('fusee', 'Fusée', 'u', 6, '$1 en fin de table, +$2 à chaque boss vaincu', { tableEnd: (run, i) => ({ money: st(i, 'v', 1) }), onBoss: (run, i) => { i.st.v = st(i, 'v', 1) + 2; } });
def('cadeau', 'Carte Cadeau', 'u', 6, '+$1 de revente à tous tes porte-bonheur et consommables en fin de table', { tableEnd: run => { run.charms.forEach(o => { o.sell = (o.sell || 0) + 1; }); run.consumables.forEach(o => { o.sell = (o.sell || 0) + 1; }); } });
def('lune', 'Vers la Lune', 'u', 5, '+$1 d\'intérêt en plus par tranche de $5');
def('satellite', 'Satellite', 'u', 6, '$1 en fin de table par Étoile différente utilisée cette partie', { tableEnd: run => { const n = Object.keys(run.stats.etoilesSeen || {}).length; return n ? { money: n } : null; } });
def('ticketdore', 'Ticket Doré', 'c', 5, 'Chaque carte Or jouée rapporte $4', { onCard: (c, k) => k.enh === 'or' ? { money: 4 } : null });
def('jackpot', 'Jackpot', 'c', 5, 'Chaque Blackjack rapporte $5', { after: c => c.type === 'blackjack' ? { money: 5 } : null });
def('triplemise', 'Triple Mise', 'c', 4, 'Doubler rapporte aussi $3', { after: c => c.doubled ? { money: 3 } : null });
def('matador', 'Matador', 'u', 7, '+$6 à chaque main gagnée contre un boss', { after: c => (c.win && c.run.blind.boss) ? { money: 6 } : null });

// --- Création
def('huit', 'Boule Huit', 'c', 5, 'Chaque 8 joué a 1 chance sur 4 de créer un Arcane', { onCard: (c, k) => { if (c.H.rankIs(c.run, k, 8) && c.H.chance(c.run, 4)) c.H.create(c.run, 'arcane'); return null; } });
def('superposition', 'Superposition', 'c', 4, 'Crée un Arcane si la main contient un As et une Suite', { after: c => { if (c.f.suite && c.cards.some(k => c.H.rankIs(c.run, k, 1))) c.H.create(c.run, 'arcane'); } });
def('vagabond', 'Vagabond', 'r', 8, 'Crée un Arcane si tu joues la main avec $4 ou moins', { after: c => { if (c.run.money <= 4) c.H.create(c.run, 'arcane'); } });
def('seance', 'Séance', 'u', 6, 'Crée un Spectre si la main est une Couleur 21', { after: c => { if (c.type === 'couleur21') c.H.create(c.run, 'spectre'); } });
def('cartomancien', 'Cartomancien', 'u', 6, 'Crée un Arcane au début de chaque table', { tableStart: (run, i, H) => { if (H.create(run, 'arcane')) return { msg: 'Cartomancien : Arcane créé' }; } });
def('astrologue', 'Astrologue', 'u', 6, "Chaque Blackjack crée l'Étoile Antarès", { after: c => { if (c.type === 'blackjack') c.H.create(c.run, 'etoile', 'antares'); } });
def('astronaute', 'Astronaute', 'u', 5, '1 chance sur 4 d\'augmenter le niveau du type de main joué', { after: c => { if (c.H.chance(c.run, 4)) { c.run.levels[c.type]++; return { msg: `${HAND_TYPES[c.type].name} monte de niveau !` }; } } });
def('hallucination', 'Hallucination', 'c', 4, "1 chance sur 2 de créer un Arcane à l'ouverture d'un paquet", { onPackOpen: (run, i, H) => { if (H.chance(run, 2)) H.create(run, 'arcane'); } });
def('marbrier', 'Marbrier', 'u', 6, 'Ajoute une carte Pierre à ton paquet au début de chaque table', { tableStart: (run, i, H) => { H.addCard(run, H.newCard(run, 1 + Math.floor(run.rng() * 13), 'S', 'pierre')); return { msg: 'Marbrier : carte Pierre ajoutée' }; } });
def('racaille', 'Racaille', 'c', 6, 'Au début de chaque table, crée 2 porte-bonheur Communs (si tu as de la place)', { tableStart: (run, i, H) => { let n = 0; for (let k = 0; k < 2; k++) if (H.createCharm(run, 'c')) n++; if (n) return { msg: `Racaille : ${n} porte-bonheur créé${n > 1 ? 's' : ''}` }; } });
def('midas', "Masque d'Or", 'u', 7, 'Les figures jouées deviennent des cartes Or', { after: c => { c.cards.forEach(k => { if (c.H.isFace(c.run, k) && k.enh !== 'pierre') k.enh = 'or'; }); } });
def('relique', 'Relique', 'r', 8, 'Chaque carte de la couleur du jour donne ×1,5 Mult (change à chaque table)', { onCard: (c, k) => c.H.isSuit(c.run, k, c.run.tf.relique) ? { xmult: 1.5 } : null, descDyn: run => `couleur du jour : ${({ H: '♥', D: '♦', S: '♠', C: '♣' })[run.tf && run.tf.relique] || '?'}` });
def('idole', 'Idole', 'u', 6, 'Chaque carte du jour (rang et couleur) donne ×2 Mult', { onCard: (c, k) => (c.run.tf.idole && k.enh !== 'pierre' && k.rank === c.run.tf.idole.rank && c.H.isSuit(c.run, k, c.run.tf.idole.suit)) ? { xmult: 2 } : null, descDyn: run => run.tf && run.tf.idole ? `carte du jour : ${['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'][run.tf.idole.rank]}${({ H: '♥', D: '♦', S: '♠', C: '♣' })[run.tf.idole.suit]}` : '' });
def('compteur', 'Compteur de Cartes', 'u', 6, '+1 Mult par 10 ou figure déjà sorti de ta pioche cette table', { onHand: c => { let n = 0; c.run.deck.forEach(k => { if (c.run.usedIds && c.run.usedIds.has(k.id) && k.enh !== 'pierre' && k.rank >= 10) n++; }); return n ? { mult: n } : null; } });

const CHARMS = Ch;
const CHARM_IDS = Object.keys(Ch);

/* ---------- Arcanes ---------- */
// target: nombre max de cartes à choisir (0 = aucune)
const ARCANES = {
  echo:        { name: "L'Écho",          target: 0, desc: 'Crée une copie du dernier Arcane ou de la dernière Étoile utilisés' },
  trefle:      { name: 'Le Trèfle à Quatre', target: 2, enh: 'chance', desc: 'Jusqu\'à 2 cartes deviennent Chance' },
  astrolabe:   { name: "L'Astrolabe",     target: 0, desc: "Crée jusqu'à 2 Étoiles au hasard" },
  braise:      { name: 'La Braise',       target: 2, enh: 'feu', desc: "Jusqu'à 2 cartes deviennent Feu" },
  grimoire:    { name: 'Le Grimoire',     target: 0, desc: "Crée jusqu'à 2 Arcanes au hasard" },
  enclume:     { name: "L'Enclume",       target: 2, enh: 'bonus', desc: "Jusqu'à 2 cartes deviennent Bonus" },
  cameleon:    { name: 'Le Caméléon',     target: 1, enh: 'cameleon', desc: '1 carte devient Caméléon' },
  ressort:     { name: 'Le Ressort',      target: 2, enh: 'elastique', desc: "Jusqu'à 2 cartes deviennent Élastiques" },
  miroir:      { name: 'Le Miroir',       target: 1, enh: 'verre', desc: '1 carte devient Verre' },
  usurier:     { name: "L'Usurier",       target: 0, desc: 'Double ton argent (+$20 maximum)' },
  roue:        { name: 'La Roue',         target: 0, desc: "1 chance sur 4 d'ajouter Brillant, Holographique ou Prismatique à un porte-bonheur au hasard" },
  elevation:   { name: "L'Élévation",     target: 2, desc: "Monte le rang de jusqu'à 2 cartes de 1" },
  couperet:    { name: 'Le Couperet',     target: 2, desc: "Détruit jusqu'à 2 cartes" },
  metamorphose:{ name: 'La Métamorphose', target: 2, exact: 2, desc: 'Choisis 2 cartes : la première devient une copie de la seconde' },
  notaire:     { name: 'Le Notaire',      target: 0, desc: 'Donne la valeur de revente totale de tes porte-bonheur ($50 maximum)' },
  midas:       { name: 'Le Midas',        target: 1, enh: 'or', desc: '1 carte devient Or' },
  carriere:    { name: 'La Carrière',     target: 1, enh: 'pierre', desc: '1 carte devient Pierre' },
  voile:       { name: 'Le Voile',        target: 1, enh: 'fantome', desc: '1 carte devient Fantôme' },
  flamme:      { name: 'La Flamme',       target: 3, suit: 'H', desc: "Jusqu'à 3 cartes deviennent ♥" },
  losange:     { name: 'Le Losange',      target: 3, suit: 'D', desc: "Jusqu'à 3 cartes deviennent ♦" },
  lance:       { name: 'La Lance',        target: 3, suit: 'S', desc: "Jusqu'à 3 cartes deviennent ♠" },
  trefle3:     { name: 'Le Gland',        target: 3, suit: 'C', desc: "Jusqu'à 3 cartes deviennent ♣" },
  oracle:      { name: "L'Oracle",        target: 0, desc: 'Crée un porte-bonheur au hasard' },
};
for (const id in ARCANES) ARCANES[id].id = id;

/* ---------- Spectres ---------- */
const SPECTRES = {
  ombre:     { name: "L'Ombre",        target: 0, desc: 'Détruit 1 carte au hasard du tirage, ajoute 3 figures améliorées' },
  rite:      { name: 'Le Rite',        target: 0, desc: 'Détruit 1 carte au hasard du tirage, ajoute 2 As améliorés' },
  incant:    { name: "L'Incantation",  target: 0, desc: 'Détruit 1 carte au hasard du tirage, ajoute 4 cartes numérotées améliorées' },
  marqueor:  { name: 'La Marque Dorée', target: 1, seal: 'or', desc: 'Ajoute un sceau doré à 1 carte' },
  marquerouge:{ name: 'La Marque Pourpre', target: 1, seal: 'rouge', desc: 'Ajoute un sceau rouge à 1 carte' },
  marquebleue:{ name: 'La Marque Azur', target: 1, seal: 'bleu', desc: 'Ajoute un sceau bleu à 1 carte' },
  marqueviolette:{ name: 'La Marque Violette', target: 1, seal: 'violet', desc: 'Ajoute un sceau violet à 1 carte' },
  aura:      { name: "L'Aura",         target: 1, desc: 'Ajoute Brillant, Holographique ou Prismatique à 1 carte' },
  avide:     { name: "L'Esprit Avide", target: 0, desc: 'Crée un porte-bonheur Rare, ton argent tombe à $0' },
  sigil:     { name: 'Le Sigil',       target: 0, desc: 'Toutes les cartes du tirage prennent la même couleur au hasard' },
  planchette:{ name: 'La Planchette',  target: 0, desc: 'Toutes les cartes du tirage prennent le même rang au hasard, −1 jet par table' },
  ecto:      { name: "L'Ectoplasme",   target: 0, desc: 'Un porte-bonheur au hasard devient Négatif, −1 jet par table' },
  bucher:    { name: 'Le Bûcher',      target: 0, desc: 'Détruit 5 cartes au hasard du tirage, +$20' },
  clone:     { name: 'Le Clone',       target: 0, desc: 'Copie un porte-bonheur au hasard, détruit tous les autres' },
  malediction:{ name: 'La Malédiction', target: 0, desc: 'Un porte-bonheur au hasard devient Prismatique, détruit tous les autres' },
  sosie:     { name: 'Le Sosie',       target: 1, desc: 'Crée 2 copies de 1 carte' },
  ame:       { name: "L'Âme",          target: 0, desc: 'Crée un porte-bonheur Légendaire', rare: true },
  trounoir:  { name: 'Le Trou Noir',   target: 0, desc: '+1 niveau pour tous les types de main', rare: true },
};
for (const id in SPECTRES) SPECTRES[id].id = id;

/* ---------- Boss ---------- */
const BOSSES = {
  puriste:  { name: 'Le Puriste',   rule: 'Tes As valent toujours 1', min: 1 },
  brume:    { name: 'La Brume',     rule: 'Les deux cartes du croupier sont cachées', min: 1 },
  avare:    { name: "L'Avare",      rule: 'Seulement 3 mains', min: 1 },
  tricheur: { name: 'Le Tricheur',  rule: 'Les égalités sont des défaites', min: 1 },
  muet:     { name: 'Le Muet',      rule: 'Les figures ne rapportent aucun jeton', min: 1 },
  sec:      { name: 'Le Sec',       rule: 'Pas de jets, de double ni de séparation', min: 1 },
  gourmand: { name: 'Le Gourmand',  rule: 'Les mains à 21 ne donnent aucun bonus', min: 1 },
  coeur:    { name: 'Le Cœur Brisé', rule: 'Les ♥ sont désactivés', min: 1, debuff: 'H' },
  losange:  { name: 'La Fêlure',    rule: 'Les ♦ sont désactivés', min: 1, debuff: 'D' },
  pique:    { name: 'La Pelle',     rule: 'Les ♠ sont désactivés', min: 1, debuff: 'S' },
  trefle:   { name: 'Le Chiendent', rule: 'Les ♣ sont désactivés', min: 1, debuff: 'C' },
  exigeant: { name: "L'Exigeant",   rule: 'Les mains de moins de 3 cartes ne marquent pas', min: 2 },
  mur:      { name: 'Le Mur',       rule: 'Objectif doublé', min: 2, mult: 2 },
  aiguille: { name: "L'Aiguille",   rule: 'Une seule main (objectif réduit)', min: 2, mult: 0.5 },
  silex:    { name: 'Le Silex',     rule: 'Jetons et Mult de base divisés par 2', min: 2 },
  miroir:   { name: 'Le Miroir',    rule: "Le croupier tire jusqu'à 18", min: 2 },
  ivrogne:  { name: "L'Ivrogne",    rule: 'Tu dois tirer au moins une carte par main', min: 1 },
  roue:     { name: 'La Roue',      rule: '1 carte sur 5 est tirée face cachée', min: 2 },
  bras:     { name: 'Le Bras',      rule: 'Le type de main joué perd 1 niveau', min: 2 },
  oeil:     { name: "L'Œil",        rule: 'Chaque type de main ne marque qu\'une fois', min: 3 },
  bouche:   { name: 'La Bouche',    rule: 'Un seul type de main peut marquer', min: 2 },
  dime:     { name: 'La Dîme',      rule: 'Chaque carte que tu tires coûte $1', min: 3 },
  sangsue:  { name: 'La Sangsue',   rule: 'Les cartes améliorées perdent leur amélioration en marquant', min: 3 },
  banque:   { name: 'La Banque',    rule: 'Le croupier commence toujours avec un As visible', final: true },
  bonneteau:{ name: 'Le Bonneteau', rule: 'Tes porte-bonheur sont retournés et mélangés', final: true },
  gel:      { name: 'Le Gel',       rule: "Toutes tes cartes sont désactivées jusqu'à ce que tu vendes un porte-bonheur", final: true },
  colosse:  { name: 'Le Colosse',   rule: 'Objectif ×3', final: true, mult: 3 },
  pourpre:  { name: 'Le Cœur Pourpre', rule: 'Un porte-bonheur au hasard est désactivé à chaque main', final: true },
};
for (const id in BOSSES) BOSSES[id].id = id;

/* ---------- Badges (récompenses pour passer une table) ---------- */
const TAGS = {
  peucommun: { name: 'Badge Peu commun', desc: 'La prochaine boutique a un porte-bonheur Peu commun gratuit', when: 'shop' },
  rare:      { name: 'Badge Rare', desc: 'La prochaine boutique a un porte-bonheur Rare gratuit', when: 'shop' },
  brillant:  { name: 'Badge Brillant', desc: 'Le prochain porte-bonheur de base en boutique devient Brillant et gratuit', when: 'shop' },
  holo:      { name: 'Badge Holo', desc: 'Le prochain porte-bonheur de base en boutique devient Holographique et gratuit', when: 'shop' },
  prisme:    { name: 'Badge Prisme', desc: 'Le prochain porte-bonheur de base en boutique devient Prismatique et gratuit', when: 'shop' },
  negatif:   { name: 'Badge Négatif', desc: 'Le prochain porte-bonheur de base en boutique devient Négatif et gratuit', when: 'shop', min: 2 },
  invest:    { name: 'Badge Investissement', desc: '+$20 après avoir battu le prochain boss', when: 'boss' },
  bon:       { name: 'Badge Talisman', desc: 'Ajoute un Talisman à la prochaine boutique', when: 'shop' },
  boss:      { name: 'Badge Boss', desc: 'Change le boss de cette ante', when: 'now' },
  cartes:    { name: 'Badge Cartes', desc: 'Un Méga paquet de Cartes gratuit', when: 'now', min: 2 },
  arcanes:   { name: 'Badge Arcanes', desc: "Un Méga paquet d'Arcanes gratuit", when: 'now' },
  etoiles:   { name: 'Badge Étoiles', desc: "Un Méga paquet d'Étoiles gratuit", when: 'now', min: 2 },
  charmes:   { name: 'Badge Porte-bonheur', desc: 'Un Méga paquet de porte-bonheur gratuit', when: 'now', min: 2 },
  spectral:  { name: 'Badge Spectral', desc: 'Un paquet Spectral gratuit', when: 'now', min: 2 },
  main:      { name: 'Badge Main', desc: '+$1 par main jouée cette partie', when: 'now', min: 2 },
  gaspi:     { name: 'Badge Gaspillage', desc: '+$1 par jet non utilisé cette partie', when: 'now', min: 2 },
  coupon:    { name: 'Badge Coupon', desc: 'Les objets et paquets de la prochaine boutique sont gratuits', when: 'shop' },
  double:    { name: 'Badge Double', desc: 'Copie le prochain badge obtenu', when: 'tag' },
  jongleur:  { name: 'Badge Jongleur', desc: '+3 jets à la prochaine table', when: 'table' },
  de:        { name: 'Badge Dé', desc: 'Les relances de la prochaine boutique commencent à $0', when: 'shop' },
  recharge:  { name: 'Badge Recharge', desc: "Crée jusqu'à 2 porte-bonheur Communs", when: 'now', min: 2 },
  vitesse:   { name: 'Badge Vitesse', desc: '+$5 par table passée cette partie', when: 'now' },
  orbital:   { name: 'Badge Orbital', desc: '+3 niveaux pour un type de main au hasard', when: 'now', min: 2 },
  economie:  { name: 'Badge Économie', desc: 'Double ton argent (+$40 maximum)', when: 'now' },
};
for (const id in TAGS) TAGS[id].id = id;

/* ---------- Talismans (bonus permanents, par paires) ---------- */
const VOUCHERS = {
  vitrine:    { name: 'Vitrine', desc: '+1 emplacement en boutique' },
  galerie:    { name: 'Galerie', desc: '+1 emplacement en boutique', req: 'vitrine' },
  surplus:    { name: 'Soldes', desc: 'Tout coûte 25 % de moins en boutique' },
  liquidation:{ name: 'Liquidation', desc: 'Tout coûte 50 % de moins en boutique', req: 'surplus' },
  polissage:  { name: 'Polissage', desc: 'Les éditions apparaissent 2× plus souvent' },
  eclat:      { name: 'Éblouissement', desc: 'Les éditions apparaissent 4× plus souvent', req: 'polissage' },
  ristourne:  { name: 'Ristourne', desc: 'Les relances coûtent $1 de moins' },
  rabais:     { name: 'Rabais', desc: 'Les relances coûtent encore $1 de moins', req: 'ristourne' },
  ceinture:   { name: 'Ceinture', desc: '+1 emplacement de consommable' },
  augure:     { name: 'Augure', desc: "Des Spectres peuvent apparaître dans les paquets d'Arcanes", req: 'ceinture' },
  telescope:  { name: 'Télescope', desc: "Les paquets d'Étoiles contiennent toujours l'Étoile de ton type de main le plus joué" },
  observatoire:{ name: 'Observatoire', desc: 'Chaque Étoile gardée donne ×1,5 Mult à son type de main', req: 'telescope' },
  endurance:  { name: 'Endurance', desc: '+1 main par table' },
  marathon:   { name: 'Marathon', desc: '+1 main par table', req: 'endurance' },
  ferraille:  { name: 'Ferraille', desc: '+1 jet par table' },
  recyclerie: { name: 'Recyclerie', desc: '+1 jet par table', req: 'ferraille' },
  cartomancie:{ name: 'Cartomancie', desc: 'Les Arcanes apparaissent 2× plus en boutique' },
  grandcarto: { name: 'Grand Cartomancien', desc: 'Les Arcanes apparaissent 4× plus en boutique', req: 'cartomancie' },
  astrologie: { name: 'Astrologie', desc: 'Les Étoiles apparaissent 2× plus en boutique' },
  grandastro: { name: 'Grand Astrologue', desc: 'Les Étoiles apparaissent 4× plus en boutique', req: 'astrologie' },
  baslaine:   { name: 'Bas de Laine', desc: 'Plafond des intérêts à $10' },
  coffre:     { name: 'Coffre-Fort', desc: 'Plafond des intérêts à $20', req: 'baslaine' },
  poche:      { name: 'Poche Secrète', desc: 'Les porte-bonheur Négatifs apparaissent 3× plus souvent' },
  doublefond: { name: 'Double Fond', desc: '+1 emplacement de porte-bonheur', req: 'poche' },
  magie:      { name: 'Tour de Magie', desc: 'Des cartes à jouer apparaissent en boutique' },
  illusion:   { name: 'Illusion', desc: 'Les cartes de la boutique peuvent avoir amélioration, édition et sceau', req: 'magie' },
  sablier:    { name: 'Sablier', desc: '−1 ante, −1 main par table' },
  clepsydre:  { name: 'Clepsydre', desc: '−1 ante, −1 jet par table', req: 'sablier' },
  montage:    { name: 'Montage', desc: 'Change le boss une fois par ante ($10)' },
  remontage:  { name: 'Remontage', desc: 'Change le boss autant de fois que tu veux ($10)', req: 'montage' },
  fente:      { name: 'Fente', desc: "Tu peux séparer jusqu'à 3 mains" },
  doublefente:{ name: 'Double Fente', desc: "Tu peux séparer jusqu'à 4 mains et doubler après séparation rapporte ×3", req: 'fente' },
  oeilverre:  { name: 'Œil de Verre', desc: 'Tu vois la prochaine carte de ta pioche' },
  oeilcristal:{ name: 'Œil de Cristal', desc: 'Tu vois les 3 prochaines cartes de ta pioche', req: 'oeilverre' },
};
for (const id in VOUCHERS) { VOUCHERS[id].id = id; VOUCHERS[id].price = 10; }

/* ---------- Paquets de départ ---------- */
const DECKS = {
  rouge:     { name: 'Paquet Rouge', desc: '+1 jet par table' },
  bleu:      { name: 'Paquet Bleu', desc: '+1 main par table' },
  jaune:     { name: 'Paquet Jaune', desc: 'Commence avec $10 de plus' },
  vert:      { name: 'Paquet Vert', desc: "En fin de table : $2 par main et $1 par jet restants, mais aucun intérêt" },
  noir:      { name: 'Paquet Noir', desc: '+1 emplacement de porte-bonheur, −1 main par table' },
  magique:   { name: 'Paquet Magique', desc: 'Commence avec la Ceinture et 2 Arcanes L\'Écho', unlock: { ante: 3 } },
  nebuleuse: { name: 'Paquet Nébuleuse', desc: 'Commence avec le Télescope, −1 emplacement de consommable', unlock: { ante: 3 } },
  fantome:   { name: 'Paquet Fantôme', desc: 'Des Spectres apparaissent en boutique, commence avec La Malédiction', unlock: { ante: 4 } },
  abandonne: { name: 'Paquet Abandonné', desc: 'Commence sans figures (40 cartes)', unlock: { ante: 4 } },
  damier:    { name: 'Paquet Damier', desc: 'Commence avec 26 ♠ et 26 ♥', unlock: { ante: 5 } },
  zodiaque:  { name: 'Paquet Zodiaque', desc: 'Commence avec Cartomancie, Astrologie et Vitrine', unlock: { ante: 5 } },
  peint:     { name: 'Paquet Peint', desc: '+2 jets par table, −1 emplacement de porte-bonheur', unlock: { ante: 6 } },
  anaglyphe: { name: 'Paquet Anaglyphe', desc: 'Gagne un Badge Double après chaque boss', unlock: { ante: 7 } },
  plasma:    { name: 'Paquet Plasma', desc: 'Équilibre Jetons et Mult au moment du score, objectifs ×2', unlock: { win: true } },
  erratique: { name: 'Paquet Erratique', desc: 'Rangs et couleurs tirés au hasard', unlock: { win: true } },
};
for (const id in DECKS) DECKS[id].id = id;

/* ---------- Mises (difficulté) ---------- */
const STAKES = [
  { id: 'blanche', name: 'Mise Blanche', desc: 'Difficulté de base', color: '#f6efff' },
  { id: 'rouge', name: 'Mise Rouge', desc: 'La petite table ne rapporte pas d\'argent', color: '#ff3b6b' },
  { id: 'verte', name: 'Mise Verte', desc: 'Les objectifs montent plus vite', color: '#3ef08a' },
  { id: 'noire', name: 'Mise Noire', desc: 'Porte-bonheur Éternels en boutique (ni vendus ni détruits)', color: '#6d6a80' },
  { id: 'bleue', name: 'Mise Bleue', desc: '−1 jet par table', color: '#33c4ff' },
  { id: 'violette', name: 'Mise Violette', desc: 'Les objectifs montent encore plus vite', color: '#b56cff' },
  { id: 'orange', name: 'Mise Orange', desc: 'Porte-bonheur Périssables (désactivés après 5 tables)', color: '#ff9f1a' },
  { id: 'or', name: 'Mise Or', desc: 'Porte-bonheur en Location ($1 à l\'achat, −$3 par table)', color: '#ffd23f' },
];

/* ---------- Paquets de boutique ---------- */
const PACKS = {
  arcane:  { name: "Paquet d'Arcanes", kind: 'arcane', w: 4 },
  etoile:  { name: "Paquet d'Étoiles", kind: 'etoile', w: 4 },
  cartes:  { name: 'Paquet de Cartes', kind: 'carte', w: 4 },
  charme:  { name: 'Paquet de Porte-bonheur', kind: 'charm', w: 1.2 },
  spectre: { name: 'Paquet Spectral', kind: 'spectre', w: 0.6 },
};
const PACK_SIZES = {
  normal: { name: '', price: 4, w: 4, n: { arcane: 3, etoile: 3, carte: 3, charm: 2, spectre: 2 }, pick: 1 },
  jumbo:  { name: 'Jumbo', price: 6, w: 2, n: { arcane: 5, etoile: 5, carte: 5, charm: 4, spectre: 4 }, pick: 1 },
  mega:   { name: 'Méga', price: 8, w: 0.5, n: { arcane: 5, etoile: 5, carte: 5, charm: 4, spectre: 4 }, pick: 2 },
};

const DATA = { HAND_TYPES, HAND_TYPE_IDS, TWENTYONE_TYPES, ETOILES, ENH, ENH_IDS, EDITIONS, SEALS, CHARMS, CHARM_IDS, ARCANES, SPECTRES, BOSSES, TAGS, VOUCHERS, DECKS, STAKES, PACKS, PACK_SIZES };
if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
else root.F21D = DATA;
})(this);
