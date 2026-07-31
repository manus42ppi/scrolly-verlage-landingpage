# Scrolly Landingpage für Verlage

Marketing-Landingpage für Scrolly (ppi Media), gehostet auf Cloudflare Pages.

> Ausführliche Architektur- und Entwickler-Dokumentation: siehe [`CLAUDE.md`](./CLAUDE.md).

## Kurzüberblick

- **Live:** https://scrolly-verlage-landingpage.pages.dev
- **Inhalt:** `public/index.html` (Haupt-Landingpage, kompiliertes Bundle-Format — nicht direkt editieren, siehe `CLAUDE.md` Abschnitt 3), `public/impressum.html`, `public/datenschutz.html`
- **Module:** `public/js/` — ein Feature pro Datei (siehe `CLAUDE.md` Abschnitt 4)
- **Deployment:** Push auf `main` → automatisches Cloudflare-Pages-Deployment (Build-Ausgabeverzeichnis: `public`)

## Tests

```bash
npm install
node node_modules/.bin/playwright install chromium   # einmalig
node node_modules/.bin/playwright test
```
