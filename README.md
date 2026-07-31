# Scrolly Landingpage für Verlage

Statische Landingpage, eine einzige selbstständige Datei.

## Inhalt
- `public/index.html` — komplette Seite, alle Assets (Schriften, Bilder, Skripte) inline. Keine Abhängigkeiten, kein Build-Schritt.
- `public/impressum.html`, `public/datenschutz.html` — rechtliche Pflichtseiten (Angaben von ppimedia.de übernommen).
- `tests/` — Playwright-Tests für Erreichbarkeit, Pflichtangaben und die Datenschutz-Behauptung "keine Datenübertragung" im Demo-Formular.
- Alles außerhalb von `public/` (Tests, `package.json`, …) wird NICHT live ausgeliefert — Cloudflare Pages Build-Ausgabeverzeichnis ist auf `public` gesetzt.

## Deployment (Cloudflare Pages)
Git-Integration ist eingerichtet (`manus42ppi/scrolly-verlage-landingpage`, Branch `main`, Auto-Deploy aktiv):
- Framework preset: **None**
- Build command: *(leer)*
- Build output directory: **`public`**

Jeder Push auf `main` löst automatisch ein neues Deployment aus.

Custom Domain (z. B. `scrolly.ppimedia.de`) ist noch nicht eingerichtet.

## Tests

```bash
npm install
node node_modules/.bin/playwright install chromium   # einmalig
node node_modules/.bin/playwright test
```

## Änderungen an `public/index.html`
Nicht direkt editieren — die Datei ist kompiliert (Bundler-Format mit eingebettetem Template-String).
Quelle ist `Scrolly für Verlage v2.dc.html` im Design-Projekt; von dort neu bündeln und ersetzen.
Rein additive Änderungen (z. B. Footer-Links) wurden bisher als gezielte Textersetzung im
eingebetteten `<script type="__bundler/template">`-JSON-String vorgenommen — siehe Git-History.
