/*
 * Scrolly Lead-Capture — kleiner, eigenständiger Helfer zum Versenden von
 * Terminanfragen an die Cloudflare Function /lead.
 *
 * Wird vom bestehenden "Termin sichern"-Formular in index.html aufgerufen
 * (Submit-Handler im eingebetteten Bundle-Template, siehe CLAUDE.md Abschnitt 3).
 * Bewusst fire-and-forget: ein Netzwerkfehler darf die bestehende "Danke"-Anzeige
 * der Seite nicht blockieren oder verzögern.
 */
(function () {
  "use strict";

  function submitLead(data) {
    return fetch("/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch(function () {});
  }

  window.ScrollyLeadCapture = { submitLead: submitLead };
})();
