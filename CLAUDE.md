# Scrolly Landingpage für Verlage – Claude Projektkontext

> **Dieses Dokument ist die einzige Quelle der Wahrheit für Claude Code in diesem Projekt.**
> Wird bei jeder Session automatisch geladen. Bei jeder strukturellen Änderung aktuell halten.

## Session-Start Checkliste

1. Branch prüfen: `git branch --show-current` → muss `main` sein (kein `develop` in diesem Projekt)
2. `git status` — offene Änderungen?
3. Bei Unsicherheit über den Bundle-Mechanismus (Abschnitt 3) zuerst lesen, bevor `public/index.html` angefasst wird

> **Stand: Juli 2026** — 31 Playwright-Tests, live auf Cloudflare Pages, inkl. Backend-Functions + KV

---

## 1. Zweck & Infrastruktur

Marketing-/Vertriebs-Landingpage für **Scrolly** (Scrollytelling-Produkt von ppi Media), Zielgruppe: Anzeigenleitung bei Verlagen. Wird perspektivisch zu einer regulären ppi-Media-Werbeseite.

| Layer | Details |
|---|---|
| Live | https://scrolly-verlage-landingpage.pages.dev |
| Repo | https://github.com/manus42ppi/scrolly-verlage-landingpage |
| Hosting | Cloudflare Pages, Git-Integration auf Branch `main` (Auto-Deploy bei jedem Push) |
| Build-Ausgabeverzeichnis | `public` (im Cloudflare-Dashboard gesetzt — **nicht** Repo-Root!) |
| Custom Domain | noch keine (nur `*.pages.dev`) |
| Analytics | Cloudflare Web Analytics (cookie-frei), Token `97476983e481409c9a299b270e527632` |
| Backend | Cloudflare Pages Functions (`functions/`) + Workers KV `scrolly-leads-kv` (Binding `LEADS_KV`) |
| Secrets | `LEADS_EXPORT_USER`, `LEADS_EXPORT_PASSWORD` (Basic Auth für CSV-Export, siehe Abschnitt 6) |

### Deployment-Mechanik

```bash
git add -A && git commit -m "..." && git push origin main
# → Cloudflare Pages baut automatisch, "Build output directory: public"
```

Kein Build-Schritt (Framework-Voreinstellung: „Keine"). Alles unter `public/` wird 1:1 ausgeliefert, alles außerhalb (Tests, `package.json`, …) bleibt unveröffentlicht.

⚠️ **Bekannte Cloudflare-Falle:** `.assetsignore` wird vom **Git-verbundenen** Pages-Build nicht berücksichtigt (nur relevant bei direktem `wrangler pages deploy`-Upload). Deshalb strikt trennen: Site-Content in `public/`, alles andere im Repo-Root.

---

## 2. Dateistruktur

```
scrolly-verlage-landingpage/
├── public/                      ← wird live ausgeliefert (Cloudflare Build-Output-Dir)
│   ├── index.html                 Haupt-Landingpage — KOMPILIERTES BUNDLE, siehe Abschnitt 3
│   ├── impressum.html             Handgeschriebene statische Seite
│   ├── datenschutz.html           Handgeschriebene statische Seite
│   └── js/
│       ├── popup-banner.js        Eigenständiges Modul, siehe Abschnitt 4
│       └── lead-capture.js        Kleiner Helfer: POST an /lead (fire-and-forget)
├── functions/                    ← Cloudflare Pages Functions, MUSS im Repo-Root liegen
│   ├── lead.js                    POST /lead — Validierung, Honeypot, Speicherung in LEADS_KV
│   └── leads-export.js            GET /leads-export — CSV-Export, Basic-Auth-geschützt
├── tests/
│   ├── legal.spec.js              Impressum/Datenschutz/Analytics-Beacon
│   ├── popup-banner.spec.js       Promo-Banner-Modul
│   └── lead-capture.spec.js       /lead + /leads-export + Formular-Integration
├── playwright.config.js           webServer startet `wrangler pages dev` (Functions + lokale KV)
├── package.json
└── README.md                      Kurzfassung für Menschen ohne Claude-Kontext
```

⚠️ **Cloudflare-Pages-Functions-Konvention:** `functions/` liegt am Repo-Root, NICHT unter `public/` — unabhängig vom Build-Ausgabeverzeichnis. Cloudflare erkennt und deployt sie automatisch anhand des Verzeichnisnamens.

---

## 3. `public/index.html` — Bundle-Format (KRITISCH)

Diese Datei ist **kein normales HTML**, sondern der Export eines Komponenten-Builders (`.dc`-Format, erkennbar an `<script type="text/x-dc" data-dc-script>`). Quelle ist `Scrolly für Verlage v2.dc.html` in einem separaten Design-Projekt — **nicht Teil dieses Repos**.

### Wie die Datei funktioniert

1. Beim Laden zeigt sie einen Platzhalter (`#__bundler_loading`, „Unpacking...").
2. Ein Bootstrap-Script liest zwei `<script type="__bundler/...">`-Tags:
   - `__bundler/manifest` — Ressourcen-Manifest (Fonts, Bilder als Blob-Referenzen)
   - `__bundler/template` — **ein JSON-String, der die komplette echte Seite enthält** (HTML + `<style>` + der eigentliche Komponenten-Code)
3. Der Bootstrap parst diesen String per `new DOMParser().parseFromString(template, 'text/html')` und ersetzt dann **das gesamte Dokument**: `document.documentElement.replaceWith(doc.documentElement)`.
4. Erst danach ist die "echte" Seite im DOM — alles, was vorher im ursprünglichen `<body>` stand (außer den `__bundler/*`-Script-Tags selbst), ist weg.

### Warum das wichtig ist

- **Jede Änderung an der sichtbaren Seite muss INNERHALB des JSON-Strings von `__bundler/template` passieren**, nicht am äußeren Dokument. Ein `<script>`-Tag vor dem äußeren `</body>` einzufügen funktioniert NICHT zuverlässig (das äußere Dokument wird verworfen, bevor es zuverlässig weiterläuft).
- Der JSON-String escaped alle `/` in schließenden Tags als `/` (z. B. `</div>` statt `</div>`) — vermutlich damit der Browser-HTML-Parser das äußere `<script>`-Tag nicht versehentlich vorzeitig schließt. **Diese Konvention bei eigenen Einfügungen exakt beibehalten.**

### Sicheres Editier-Verfahren (bewährt, mehrfach angewendet)

```python
# 1. Exakte alte Textstelle als Python-String mit \\" und \\u002F nachbauen
# 2. Vorkommen zählen — MUSS genau 1 sein, sonst alte Stelle nicht eindeutig genug wählen
old = 'color:#fff; white-space:nowrap;\\">ppi media<\\u002Fdiv>\\n    <\\u002Fdiv>\\n  <\\u002Ffooter>'
assert content.count(old) == 1
content = content.replace(old, new)

# 3. IMMER validieren: die Zeile mit __bundler/template muss weiterhin gültiges JSON sein
import json
json.loads(template_line)  # wirft eine Exception bei kaputtem Escaping
```

Bisher so eingefügt: Footer-Links (Impressum/Datenschutz), Cloudflare-Web-Analytics-Beacon, `<script src="/js/popup-banner.js">`. Immer **vor** dem escapten `</head>` bzw. innerhalb des bestehenden `<footer>` — nie mitten in die React-artige Komponenten-Logik (`sc-if`, `sc-for`, `{{ }}`-Bindings) einfügen.

❌ **NIEMALS:** `public/index.html` mit einem normalen HTML-Editor/Formatter bearbeiten, komplett neu einrücken, oder Teile der `sc-*`/`{{ }}`-Template-Syntax "aufräumen" — das ist kompilierte Ausgabe, keine Handschrift.

---

## 4. Modul-Architektur (`public/js/`)

**Prinzip:** Jedes Feature ist eine einzelne, in sich geschlossene JS-Datei — Konfiguration, Logik und (falls nötig) Styles zusammen in einer Datei. Ziel: Eine Änderung an einem Feature bedeutet einen Diff in **einer** Datei, nicht Suche+Ersetzen über mehrere Dateien verteilt. Spart Tokens und Zeit bei künftigen Anpassungen.

**Konvention pro Modul:**
- `CONFIG`-Objekt ganz oben — alles Redaktionelle/Verhalten (Text, Trigger, Timing) steht dort, nicht verstreut im Code
- Kein Build-Schritt, kein Bundler, kein Import/Export zwischen Modulen — reines Vanilla-JS (IIFE), da die Seite selbst keinen Build-Prozess hat
- Einbindung in `public/index.html` als ein einzelner `<script src="/js/<modul>.js" defer>`-Tag (siehe Abschnitt 3 für die sichere Einfüge-Methode)
- Legal-Seiten (`impressum.html`, `datenschutz.html`) bekommen nur Module, die dort wirklich hingehören (z. B. Analytics) — **keine** Marketing-/Conversion-Module wie Popups

### Vorhandene Module

| Modul | Datei | Zweck | Eingebunden in |
|---|---|---|---|
| Promo-Banner | `public/js/popup-banner.js` | Konfigurierbarer Scroll-getriggerter Banner mit Dismiss + Frequency-Cap | nur `index.html` |
| Lead-Capture | `public/js/lead-capture.js` | Fire-and-forget-Helfer: `window.ScrollyLeadCapture.submitLead(data)` postet an `/lead` | nur `index.html` |

**`popup-banner.js` im Detail:**
- Trigger: Scroll-Tiefe (`CONFIG.trigger.scrollPercent`, aktuell 35 %) — kein Delay-Timer, damit UX nicht aufdringlich ist und Tests deterministisch bleiben
- Dismiss-Zustand landet in `localStorage` (`scrolly_promo_dismissed_at`), Frequency-Cap über `CONFIG.frequencyCapDays` (aktuell 7)
- CTA verlinkt auf `#termin` (scrollt zum echten, funktionierenden Formular — siehe unten). Kein eigenes E-Mail-Feld im Banner, um kein zweites, paralleles Formular zu Pflegen.
- Test-Hook: `window.ScrollyPromoBanner._resetDismissed()` — nur für Playwright, kein Teil des Produktivverhaltens

**`lead-capture.js` im Detail:**
- Ein einziger Export: `submitLead(data)` → `fetch('/lead', { method: 'POST', body: JSON.stringify(data) })`, Fehler werden verschluckt (`.catch(() => {})`)
- Bewusst fire-and-forget: darf die bestehende UX (sofortige „Danke"-Anzeige) nicht verzögern oder blockieren

**Das „Termin sichern"-Formular (im Bundle, siehe Abschnitt 3) ist die EINZIGE echte Lead-Quelle:**
Der bestehende Submit-Handler im `__bundler/template`-JSON wurde minimal erweitert (ein zusätzlicher `window.ScrollyLeadCapture.submitLead({...})`-Aufruf vor dem bestehenden `this.setState({ sent: true })`), OHNE die bestehende State-Logik/UX zu verändern. Ausgelesene Felder: `this.state.email` (bereits vorhanden), Firmenname per `e.target.querySelector('input[type=text]')` (unkontrolliertes Input-Feld, kein State-Binding), `this.state.slot`. Zusätzlich ein Honeypot-Feld (`input[name=website]`, per CSS off-screen positioniert) wurde in dasselbe Formular eingefügt.

⚠️ Bei Änderungen an diesem Submit-Handler: **nur einzelne JS-Ausdrücke innerhalb der bestehenden Arrow-Function ergänzen**, nie die umgebende `sc-if`/State-Struktur anfassen. Beim Einfügen ausschließlich einfache Anführungszeichen (`'...'`) oder gar keine verwenden — jedes `"` im eingefügten Code müsste sonst als `\"` escaped werden (siehe Abschnitt 3).

Für ein neues Modul: neue Datei nach demselben Muster anlegen, eigene Tests in `tests/<modul>.spec.js`, in dieser Tabelle ergänzen.

---

## 5. Rechtliches (Impressum & Datenschutz)

- Firmenangaben (Name, Anschrift, Geschäftsführer, Registergericht, USt-ID) sowie DPO-Kontakt sind **wörtlich von https://ppimedia.de/de/impressum/ bzw. /datenschutz/ übernommen** — bei Änderungen dort (z. B. neuer Geschäftsführer) hier nachziehen.
- `datenschutz.html` beschreibt den **tatsächlichen technischen Stand** dieser Seite, nicht generische Textbausteine:
  - Cloudflare-Hosting-Logfiles (Punkt 4)
  - keine Cookies (Punkt 5)
  - Cloudflare Web Analytics, cookie-frei (Punkt 6)
  - „Termin sichern"-Formular überträgt echte Daten (Punkt 8) — Rechtsgrundlage: Kontaktanfrage/vorvertragliche Maßnahme (Art. 6 Abs. 1 lit. b DSGVO), **kein** Newsletter, daher kein Double-Opt-in nötig
- **Wichtig bei künftigen Features mit Datenverarbeitung** (z. B. Pipedrive-Anbindung): `datenschutz.html` VOR Go-Live um einen entsprechenden Punkt ergänzen, nicht nachträglich. Punkt 8 kündigt die geplante Pipedrive-Anbindung bereits an.

---

## 6. Lead-Speicherung (Backend)

**Flow:** „Termin sichern"-Formular → `POST /lead` → Validierung + Honeypot-Check → Workers KV (`LEADS_KV`) → Export nur per `GET /leads-export` (Basic Auth).

### `functions/lead.js`
- Erwartet JSON-Body: `{ email, company?, slot?, source, website }` (`website` = Honeypot, muss leer sein)
- Honeypot gefüllt → Antwort `{ ok: true }` **ohne** zu speichern (Bots sollen keinen Unterschied zu einer echten Annahme merken)
- E-Mail-Format-Validierung, sonst HTTP 400
- Speichert unter Key `lead:<ISO-Timestamp>:<uuid>` als JSON (inkl. User-Agent, Referer)

### `functions/leads-export.js`
- HTTP Basic Auth gegen die Secrets `LEADS_EXPORT_USER` / `LEADS_EXPORT_PASSWORD`
- Ohne/mit falschen Zugangsdaten → 401 mit `WWW-Authenticate`-Header (Browser zeigt automatisch einen Login-Dialog)
- Mit korrekten Zugangsdaten → CSV-Download aller Leads (paginiert über `kv.list()`, kein 1000-Key-Limit-Problem)
- **Kein Admin-UI nötig** — URL im Browser öffnen, Zugangsdaten eingeben, fertig. Bewusste Entscheidung: siehe Session vom 2026-07-31, kein Pipedrive/Admin-Page in dieser Phase.

### Secrets & Bindings setzen (bereits erledigt, hier als Referenz)
```bash
npx wrangler kv namespace create scrolly-leads-kv
# Danach im Cloudflare-Dashboard: Pages-Projekt → Settings → Bindungen →
# KV-Namespace hinzufügen → Variablenname LEADS_KV → scrolly-leads-kv auswählen
# (kein wrangler-CLI-Befehl für Pages-KV-Bindings auf bestehenden Projekten)

echo -n "<user>" | npx wrangler pages secret put LEADS_EXPORT_USER --project-name=scrolly-verlage-landingpage
echo -n "<passwort>" | npx wrangler pages secret put LEADS_EXPORT_PASSWORD --project-name=scrolly-verlage-landingpage
```

### Geplante Erweiterung (nicht mehr Teil dieser Phase)
Pipedrive-API-Anbindung in `functions/lead.js` (Lead direkt als Person/Deal anlegen) — siehe Abschnitt 8. `datenschutz.html` Punkt 8 vorher entsprechend ergänzen.

---

## 7. Tests

```bash
npm install
node node_modules/.bin/playwright install chromium   # einmalig
node node_modules/.bin/playwright test
```

`playwright.config.js` startet automatisch `wrangler pages dev public --kv=LEADS_KV ...` auf Port 4173 — testet Functions UND eine lokal emulierte KV-Instanz mit, kein manueller Server nötig. Test-Zugangsdaten für den Export sind fest im Config-Command hinterlegt (`test-export-user` / `test-export-pass`, nur lokal, keine echten Secrets).

| Datei | Deckt ab |
|---|---|
| `tests/legal.spec.js` | Erreichbarkeit Impressum/Datenschutz, Pflichtangaben, Web-Analytics-Beacon auf allen Seiten |
| `tests/popup-banner.spec.js` | Scroll-Trigger-Schwelle, Dismiss + Frequency-Cap, CTA-Link, Abwesenheit auf Legal-Seiten |
| `tests/lead-capture.spec.js` | `/lead`-Validierung + Honeypot, `/leads-export`-Zugriffsschutz (401 ohne/mit falschen Credentials, 200 CSV mit korrekten), echte Formular-Übertragung inkl. Payload-Check |

Neue Module bekommen eine eigene `tests/<modul>.spec.js` — nicht alles in eine Datei packen (würde Token-Kosten für spätere gezielte Änderungen erhöhen). Lokale KV-Testdaten landen in `.wrangler/state` (gitignored) und bleiben zwischen Testläufen erhalten — Tests verwenden deshalb pro Lauf eindeutige E-Mail-Adressen statt exakter Zählungen.

---

## 8. Kritische Regeln

| ❌ Verboten | ✅ Korrekt |
|---|---|
| `public/index.html` direkt mit einem Editor "aufräumen" oder neu formatieren | Nur gezielte, per Python validierte Textersetzungen (Abschnitt 3) |
| Neues Feature direkt in `public/index.html` oder in ein bestehendes Modul hineinschreiben | Neue, eigenständige Datei in `public/js/` nach dem Modul-Muster (Abschnitt 4) |
| Marketing-/Conversion-Module auf `impressum.html`/`datenschutz.html` einbinden | Nur seitenneutrale Module (z. B. Analytics) auf Legal-Seiten |
| `.assetsignore` nutzen, um Dateien vom Cloudflare-Git-Deploy auszuschließen | Site-Content in `public/`, alles andere im Root belassen |
| Datenschutzerklärung Datenverarbeitung beschreiben, die es (noch) nicht gibt | Nur den tatsächlichen Stand dokumentieren, bei neuen Features vorher aktualisieren |
| Direkt auf `main` ohne Tests pushen | `node node_modules/.bin/playwright test` vor jedem Push |
| `functions/` unter `public/` ablegen | `functions/` MUSS am Repo-Root liegen (Cloudflare-Konvention) |
| Echte Zugangsdaten/Secrets in Code, Tests oder Git committen | Secrets nur über `wrangler pages secret put`, lokale Tests nutzen separate Dummy-Credentials |
| Honeypot-Feld mit `display:none` verstecken | `position:absolute; left:-9999px` + `tabindex="-1"` + `aria-hidden` (manche Bots ignorieren `display:none`) |

---

## 9. Offene Punkte (Stand Juli 2026)

Reihenfolge aus der ursprünglichen Planung für eine vollständige Marketing-Seite:

1. ✅ Rechtliches (Impressum, Datenschutz)
2. ✅ Analytics (Cloudflare Web Analytics)
3. ✅ Popup/Banner
4. ✅ Lead-Speicherung — `/lead` + `/leads-export` (CSV, Basic Auth), **bewusst ohne Pipedrive-Anbindung** in dieser Phase (Nutzerentscheidung 2026-07-31)
5. 📋 **Pipedrive-Integration** — `functions/lead.js` um einen zusätzlichen API-Call an Pipedrive erweitern (Person/Lead anlegen). `datenschutz.html` Punkt 8 vorher aktualisieren (kündigt es bereits an). Pipedrive-API-Token als Cloudflare-Secret setzen (vom User selbst zu erzeugen, siehe Pipedrive-Kontoeinstellungen).
6. 📋 Custom Domain (z. B. `scrolly.ppimedia.de`) — Zone `ppimedia.de` müsste zu Cloudflare hinzugefügt oder CNAME beim aktuellen DNS-Provider gesetzt werden.
