// Génère AMELIORATIONS.md à partir des données du jeu
const F = require('./engine.js');
const fs = require('fs');
const path = require('path');
const L = []; let n = 0;
const add = s => L.push(`${++n}. ${s}`);
const R = { c: 'Commun', u: 'Peu commun', r: 'Rare', l: 'Légendaire' };
const v1 = ['pilepoil', 'charlie', 'cassecou', 'prudence', 'maudit', 'lynx', 'boule', 'chasseur', 'sang', 'encre', 'cour', 'septieme', 'calibre', 'elan', 'tirelire', 'poignee', 'filet', 'quitte', 'mainpleine', 'ferrailleur', 'dividende', 'capitaliste', 'artisan', 'minimaliste', 'tetebrulee', 'contre'];
const sec = t => L.push(`\n## ${t}\n`);

sec('Structure de partie');
['8 antes de 3 tables (petite, grande, boss) au lieu de 12 tables', 'Écran de sélection de table avec objectifs, gains et boss annoncé', 'Passer la petite ou la grande table pour gagner un badge', 'Boss final différent à l\'ante 8 (5 boss finaux)', 'Mode infini après l\'ante 8 avec objectifs exponentiels', 'Gains différents par table ($3, $4, $5, $8 au boss final)', 'Intérêts jusqu\'à $5 (relevables à $10 et $20)', 'Sauvegarde automatique et bouton Continuer', 'Choix du paquet de départ et de la mise avant chaque partie', 'Paquets de départ débloqués en progressant', 'Mises débloquées en gagnant', 'Collection avec porte-bonheur à découvrir', 'Options : vitesse ×1 à ×4, son, abandon, sauvegarder et quitter', 'Record d\'ante, meilleure main et nombre de victoires', 'Écrans de victoire et de défaite détaillés', 'Le type de main en cours s\'affiche sous ton total'].forEach(add);

sec(`Types de main et Étoiles (${F.HAND_TYPE_IDS.length})`);
F.HAND_TYPE_IDS.forEach(t => { const T = F.HAND_TYPES[t]; add(`**${T.name}** (${T.desc}) : base ${T.chips} × ${T.mult}, monté par l'Étoile ${F.ETOILES[T.star].name}`); });

sec(`Nouveaux porte-bonheur (${F.CHARM_IDS.length - v1.length})`);
F.CHARM_IDS.filter(id => !v1.includes(id)).forEach(id => { const d = F.CHARMS[id]; add(`**${d.name}** (${R[d.rarity]}, $${d.price}) : ${d.desc}`); });

sec('Porte-bonheur de la version 1');
add('Les 26 porte-bonheur d\'origine reçoivent une rareté explicite et des valeurs revues');

sec('Éditions, autocollants et raretés');
['Rareté Légendaire (5 porte-bonheur, obtenus seulement avec L\'Âme)', 'Édition Brillant (+50 Jetons)', 'Édition Holographique (+10 Mult)', 'Édition Prismatique (×1,5 Mult)', 'Édition Négatif (+1 emplacement)', 'Éditions aussi sur les cartes à jouer', 'Autocollant Éternel (mise Noire)', 'Autocollant Périssable (mise Orange)', 'Autocollant Location (mise Or)', 'Raretés pondérées 70 / 25 / 5 %', 'Valeur de revente augmentable (Œuf, Carte Cadeau)'].forEach(add);

sec('Améliorations et sceaux des cartes');
['pierre', 'chance', 'cameleon', 'elastique'].forEach(e => add(`Nouvelle amélioration **${F.ENH[e].name}** : ${F.ENH[e].desc}`));
add('Verre passe à ×2 Mult'); add('Bonus passe à +30 Jetons'); add('Or passe à +$3');
Object.values(F.SEALS).forEach(s => add(`**${s.name}** : ${s.desc}`));
add('Bonus de Jetons permanent sur les cartes (Randonneur)');

sec(`Arcanes (${Object.keys(F.ARCANES).length})`);
Object.values(F.ARCANES).forEach(a => add(`**${a.name}** : ${a.desc}`));
sec(`Spectres (${Object.keys(F.SPECTRES).length})`);
Object.values(F.SPECTRES).forEach(a => add(`**${a.name}** : ${a.desc}`));

sec('Consommables');
['2 emplacements (3 avec Ceinture)', 'Utilisables entre deux mains, avant une table ou en boutique', 'Tirage de 8 cartes de ton paquet pour cibler Arcanes et Spectres', 'Acheter et utiliser tout de suite en boutique', 'Revente des consommables'].forEach(add);

sec('Paquets de boutique (15)');
Object.values(F.PACKS).forEach(P => Object.values(F.PACK_SIZES).forEach(S => add(`${P.name}${S.name ? ' ' + S.name : ''} ($${S.price}) : choisis ${S.pick} parmi ${S.n[P.kind]}`)));

sec('Boutique');
['Articles mélangés (porte-bonheur, Arcanes, Étoiles, cartes, Spectres)', '2 paquets par boutique, le premier de la partie est un paquet de porte-bonheur', '1 Talisman par ante, renouvelé après le boss', 'Relance des articles ($3, +$1 par relance)', 'Articles gratuits via les badges', 'Brûler une carte conservé (minimum 20 cartes)', 'Dette possible avec la Carte de Crédit'].forEach(add);

sec(`Badges (${Object.keys(F.TAGS).length})`);
Object.values(F.TAGS).forEach(t => add(`**${t.name}** : ${t.desc}`));
sec(`Talismans (${Object.keys(F.VOUCHERS).length}, par paires)`);
Object.values(F.VOUCHERS).forEach(v => add(`**${v.name}** : ${v.desc}${v.req ? ` (après ${F.VOUCHERS[v.req].name})` : ''}`));

const oldB = ['puriste', 'brume', 'avare', 'tricheur', 'muet', 'sec', 'gourmand', 'banque'];
sec(`Nouveaux boss (${Object.keys(F.BOSSES).length - oldB.length})`);
Object.values(F.BOSSES).filter(b => !oldB.includes(b.id)).forEach(b => add(`**${b.name}**${b.final ? ' (final)' : ''} : ${b.rule}`));
add('Boss tirés sans répétition tant que tous ne sont pas sortis'); add('Ante minimale par boss'); add('Changer de boss avec Montage, Remontage ou le Badge Boss');

sec(`Paquets de départ (${Object.keys(F.DECKS).length})`);
Object.values(F.DECKS).forEach(d => add(`**${d.name}** : ${d.desc}`));
sec('Mises (7 nouvelles)');
F.STAKES.slice(1).forEach(s => add(`**${s.name}** : ${s.desc}`));

sec('Animations et finitions');
['Cartes en éventail comme une main tenue', 'Inclinaison 3D des cartes et objets au toucher', 'Flammes sur la boîte de score quand la main suffit à battre l\'objectif', 'Flash rouge et grosse pulsation sur chaque ×Mult', 'Score qui défile jusqu\'au nouveau total', 'Ouverture de paquet : secousse, étincelles, cartes qui volent', 'Articles de boutique qui arrivent en éventail', 'Tables de l\'ante qui montent une par une', 'Jetons de table qui tournent', 'Transition pixel entre les écrans', 'Éditions animées (métallisé, holo, prisme, négatif)', 'Améliorations animées (flammes, verre, or, fantôme, caméléon)', 'Cartes désactivées hachurées en rouge', 'Cartes face cachée avec point d\'interrogation (La Roue)', 'Porte-bonheur retournés pendant le Bonneteau', 'Notifications pour badges, créations et gains', 'Fond qui change selon la situation : normal, boss, bust, boutique, paquet, victoire', 'Nouveaux sons : paquets, magie, gains, ×Mult', 'Vitesse des animations réglable'].forEach(add);

const out = ['# Fièvre 21 : améliorations de la version 2', '', 'Mécaniques tirées du wiki de Balatro et adaptées au blackjack. Tous les noms et tous les effets sont originaux.', '', `**Total : ${n} ajouts.**`, ...L, ''];
fs.writeFileSync(path.join(__dirname, '..', 'AMELIORATIONS.md'), out.join('\n'));
console.log('ajouts', n);
