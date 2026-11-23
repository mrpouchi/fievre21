import pathlib
here = pathlib.Path(__file__).parent
shell = (here / 'shell.html').read_text()
out = (shell.replace('/*DATA*/', (here / 'data.js').read_text())
            .replace('/*ICONS*/', (here / 'icons.js').read_text())
            .replace('/*ENGINE*/', (here / 'engine.js').read_text())
            .replace('/*UI*/', (here / 'ui.js').read_text()))
(here.parent / 'fievre21.html').write_text(out)
print('fievre21.html', len(out), 'octets')
skel = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + out + '</body></html>'
(here / 'preview.html').write_text(skel)
(here.parent / 'index.html').write_text(skel)
