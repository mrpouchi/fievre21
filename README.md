# Fièvre 21

Roguelite de blackjack en deckbuilding, pensé pour le téléphone (format portrait), style psyché + pixel. Textes en français.

## Jouer

Ouvre `index.html` dans un navigateur. Le fichier est autonome : aucune dépendance, aucun serveur.

## Structure

- `src/data.js` : contenu (porte-bonheur, Arcanes, Spectres, boss, badges, talismans, paquets de départ, mises)
- `src/engine.js` : moteur de jeu pur JS, sans DOM (règles, score, boutique, sauvegarde)
- `src/ui.js` : écrans, animations, sons, fond animé
- `src/shell.html` : CSS et structure de la page
- `src/build.py` : assemble le tout dans `index.html` et `fievre21.html`
- `src/sim.js` : simulateur d'équilibrage (`node src/sim.js 2000`)
- `AMELIORATIONS.md` : liste des 395 ajouts de la version 2

## Construire

```bash
python3 src/build.py
```
