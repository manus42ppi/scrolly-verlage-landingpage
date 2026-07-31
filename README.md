# Scrolly Landingpage für Verlage

Statische Landingpage, eine einzige selbstständige Datei.

## Inhalt
- `index.html` — komplette Seite, alle Assets (Schriften, Bilder, Skripte) inline. Keine Abhängigkeiten, kein Build-Schritt.

## Deployment (Cloudflare Pages)
Gleicher Aufbau wie `cxfusione-landinpage`:

1. Neues Repo anlegen, z. B. `scrolly-verlage-landingpage`.
2. `index.html` in den Repo-Root legen, committen, pushen.
3. Cloudflare Pages → Create project → Connect to Git → Repo wählen.
   - Framework preset: **None**
   - Build command: *(leer)*
   - Build output directory: `/`
4. Custom domain zuweisen, z. B. `scrolly.ppimedia.de`.

Jeder Push auf `main` löst ein automatisches Deployment aus.

## Änderungen
Nicht direkt in `index.html` editieren — die Datei ist kompiliert.
Quelle ist `Scrolly für Verlage v2.dc.html` im Design-Projekt; von dort neu bündeln und ersetzen.
