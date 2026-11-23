# Fièvre 21

Roguelite de blackjack en deckbuilding, pensé pour le téléphone (format portrait), style psyché + pixel. Textes en français.

## Jouer

**En ligne : [mrpouchi.github.io/fievre21](https://mrpouchi.github.io/fievre21/)**

Ou en local : ouvre `index.html` dans un navigateur. Le fichier est autonome : aucune dépendance, aucun serveur.

## Structure

- `src/data.js` : contenu (porte-bonheur, Arcanes, Spectres, boss, badges, talismans, paquets de départ, mises)
- `src/engine.js` : moteur de jeu pur JS, sans DOM (règles, score, boutique, sauvegarde)
- `src/ui.js` : écrans, animations, sons, fond animé
- `src/shell.html` : CSS et structure de la page
- `src/icon_map.js` : quelle icône pour chaque porte-bonheur, consommable, badge, talisman et paquet
- `src/icons.js` : icônes vectorielles générées par `src/gen_icons.js` (ne pas modifier à la main)
- `src/coins.js` : pièces des porte-bonheur dessinées à la main (SVG 100 × 100), pixellisées en jeu sur une grille de 56 px
- `src/build.py` : assemble le tout dans `index.html` et `fievre21.html`
- `src/sim.js` : simulateur d'équilibrage (`node src/sim.js 2000`)
- `AMELIORATIONS.md` : liste des 395 ajouts de la version 2

## Construire

```bash
python3 src/build.py
```

## Icônes

Les icônes viennent de [game-icons.net](https://game-icons.net) (Lorc, Delapouite et contributeurs), sous licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Pour changer une icône, modifie `src/icon_map.js` puis régénère :

```bash
npm pack @iconify-json/game-icons && tar xzf iconify-json-game-icons-*.tgz
node src/gen_icons.js package/icons.json
python3 src/build.py
```
