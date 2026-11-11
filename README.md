# Selecta

Selecta is een statische ETF-vergelijker voor cursisten van Fiscaal Slim Beleggen. Er is geen server, geen login en geen database. Selecta slaat niets van de gebruiker op; alleen de filterkeuze blijft in de eigen browser bewaard.

- `index.html`, `style.css`, `app.js`: de pagina
- `data/fondsen.json`: alle fondsgegevens, met per fonds een bron-URL
- `data/aanbieders.json`: aanbieders, affiliate-links en beschikbaarheid
- `bronnen/`: ruwe gegevens zoals opgehaald bij de uitgevers
- `CONTROLEVERSLAG.md`: wat er gecontroleerd is, wat nog ontbreekt en waar twijfel is
- `scripts/controleer-data.mjs`: automatische controle (draait in GitHub Actions)

Hosting: GitHub Pages. In Huddle kan Selecta als iframe worden ingebed, of als gewone link.
