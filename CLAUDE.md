# Scrolly Landingpage für Verlage – Claude Projektkontext

> **Dieses Dokument ist die einzige Quelle der Wahrheit für Claude Code in diesem Projekt.**
> Wird bei jeder Session automatisch geladen. Bei jeder strukturellen Änderung aktuell halten.

## Session-Start Checkliste

1. Branch prüfen: `git branch --show-current` → muss `main` sein (kein `develop` in diesem Projekt)
2. `git status` — offene Änderungen?
3. Bei Unsicherheit über den Bundle-Mechanismus (Abschnitt 3) zuerst lesen, bevor `public/index.html` angefasst wird

> **Stand: Juli 2026** — 24 Playwright-Tests, live auf Cloudflare Pages

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
│       └── popup-banner.js        Eigenständiges Modul, siehe Abschnitt 4
├── tests/
│   ├── legal.spec.js              Impressum/Datenschutz/Analytics-Beacon
│   └── popup-banner.spec.js       Promo-Banner-Modul
├── playwright.config.js           webServer startet `http-server public`
├── package.json
└── README.md                      Kurzfassung für Menschen ohne Claude-Kontext
```

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

**`popup-banner.js` im Detail:**
- Trigger: Scroll-Tiefe (`CONFIG.trigger.scrollPercent`, aktuell 35 %) — kein Delay-Timer, damit UX nicht aufdringlich ist und Tests deterministisch bleiben
- Dismiss-Zustand landet in `localStorage` (`scrolly_promo_dismissed_at`), Frequency-Cap über `CONFIG.frequencyCapDays` (aktuell 7)
- CTA verlinkt aktuell auf `#termin` (die bestehende Demo-Sektion) — **sobald die Lead-Speicherung/Pipedrive-Integration steht, ist das der natürliche Erweiterungspunkt**: `CONFIG.ctaHref` durch ein eigenes E-Mail-Feld ersetzen, das an `/lead` postet
- Test-Hook: `window.ScrollyPromoBanner._resetDismissed()` — nur für Playwright, kein Teil des Produktivverhaltens

Für ein neues Modul (z. B. künftiges Lead-Formular): neue Datei nach demselben Muster anlegen, eigene Tests in `tests/<modul>.spec.js`, in dieser Tabelle ergänzen.

---

## 5. Rechtliches (Impressum & Datenschutz)

- Firmenangaben (Name, Anschrift, Geschäftsführer, Registergericht, USt-ID) sowie DPO-Kontakt sind **wörtlich von https://ppimedia.de/de/impressum/ bzw. /datenschutz/ übernommen** — bei Änderungen dort (z. B. neuer Geschäftsführer) hier nachziehen.
- `datenschutz.html` beschreibt den **tatsächlichen technischen Stand** dieser Seite, nicht generische Textbausteine:
  - Cloudflare-Hosting-Logfiles (Punkt 4)
  - keine Cookies (Punkt 5)
  - Cloudflare Web Analytics, cookie-frei (Punkt 6)
  - das „Termin sichern"-Demo-Formular überträgt nachweislich keine Daten (Punkt 8) — das ist per Playwright-Test abgesichert (siehe Abschnitt 6)
- **Wichtig bei künftigen Features mit Datenverarbeitung** (z. B. Lead-Formular → Pipedrive): `datenschutz.html` VOR Go-Live um einen entsprechenden Punkt ergänzen, nicht nachträglich.

---

## 6. Tests

```bash
npm install
node node_modules/.bin/playwright install chromium   # einmalig
node node_modules/.bin/playwright test
```

`playwright.config.js` startet automatisch `http-server public` auf Port 4173 — kein manueller Server nötig.

| Datei | Deckt ab |
|---|---|
| `tests/legal.spec.js` | Erreichbarkeit Impressum/Datenschutz, Pflichtangaben, Web-Analytics-Beacon auf allen Seiten, **Regressionsschutz**: Ausfüllen des Demo-Formulars darf keine zusätzlichen Netzwerk-Requests auslösen (Seitenaufruf selbst darf den Analytics-Beacon feuern) |
| `tests/popup-banner.spec.js` | Scroll-Trigger-Schwelle, Dismiss + Frequency-Cap, CTA-Link, Abwesenheit auf Legal-Seiten |

Neue Module bekommen eine eigene `tests/<modul>.spec.js` — nicht alles in eine Datei packen (würde Token-Kosten für spätere gezielte Änderungen erhöhen).

---

## 7. Kritische Regeln

| ❌ Verboten | ✅ Korrekt |
|---|---|
| `public/index.html` direkt mit einem Editor "aufräumen" oder neu formatieren | Nur gezielte, per Python validierte Textersetzungen (Abschnitt 3) |
| Neues Feature direkt in `public/index.html` oder in ein bestehendes Modul hineinschreiben | Neue, eigenständige Datei in `public/js/` nach dem Modul-Muster (Abschnitt 4) |
| Marketing-/Conversion-Module auf `impressum.html`/`datenschutz.html` einbinden | Nur seitenneutrale Module (z. B. Analytics) auf Legal-Seiten |
| `.assetsignore` nutzen, um Dateien vom Cloudflare-Git-Deploy auszuschließen | Site-Content in `public/`, alles andere im Root belassen |
| Datenschutzerklärung Datenverarbeitung beschreiben, die es (noch) nicht gibt | Nur den tatsächlichen Stand dokumentieren, bei neuen Features vorher aktualisieren |
| Direkt auf `main` ohne Tests pushen | `node node_modules/.bin/playwright test` vor jedem Push |

---

## 8. Offene Punkte (Stand Juli 2026)

Reihenfolge aus der ursprünglichen Planung für eine vollständige Marketing-Seite:

1. ✅ Rechtliches (Impressum, Datenschutz)
2. ✅ Analytics (Cloudflare Web Analytics)
3. ✅ Popup/Banner
4. 📋 **Lead-Speicherung** — Cloudflare Function `/lead` → Pipedrive-API (Person/Lead anlegen), Spam-Schutz (Turnstile/Honeypot), optional KV-Backup. Natürlicher Anknüpfungspunkt: `popup-banner.js` um ein E-Mail-Feld erweitern statt nur auf `#termin` zu verlinken.
5. 📋 Custom Domain (z. B. `scrolly.ppimedia.de`) — Zone `ppimedia.de` müsste zu Cloudflare hinzugefügt oder CNAME beim aktuellen DNS-Provider gesetzt werden.
