/*
 * Scrolly Promo-Banner — eigenständiges Modul, keine Abhängigkeiten.
 *
 * Um Text, Timing oder Trigger zu ändern: NUR das CONFIG-Objekt unten anpassen.
 * Kein anderer Teil der Seite muss dafür angefasst werden.
 *
 * Eingebunden wird das Modul per <script src="/js/popup-banner.js" defer></script>
 * — aktuell nur auf der Landingpage (index.html), bewusst NICHT auf den
 * Legal-Seiten (Impressum/Datenschutz).
 */
(function () {
  "use strict";

  var CONFIG = {
    enabled: true,
    storageKey: "scrolly_promo_dismissed_at",
    frequencyCapDays: 7,
    trigger: { type: "scroll", scrollPercent: 35 },
    eyebrow: "Für Anzeigenleitung im Verlag",
    headline: "Neugierig, wie schnell das geht?",
    body: "Sichern Sie sich ein kostenloses 15-Minuten-Gespräch — wir bauen live einen Scrolly über einen Ihrer Kunden.",
    ctaText: "Termin sichern",
    ctaHref: "#termin",
    dismissLabel: "Schließen",
  };

  function alreadyDismissedRecently() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) return false;
      var capMs = CONFIG.frequencyCapDays * 24 * 60 * 60 * 1000;
      return Date.now() - Number(raw) < capMs;
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(CONFIG.storageKey, String(Date.now()));
    } catch (e) {}
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      "#scrolly-promo-banner{position:fixed;left:20px;right:20px;bottom:20px;max-width:420px;margin:0 auto;" +
      "background:#100c14;color:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 12px 40px rgba(0,0,0,0.35);" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;z-index:9999;" +
      "transform:translateY(140%);transition:transform 420ms cubic-bezier(0.2,0.8,0.2,1);}" +
      "#scrolly-promo-banner.is-visible{transform:translateY(0);}" +
      "#scrolly-promo-banner .eyebrow{font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#ff0f6e;margin-bottom:8px;}" +
      "#scrolly-promo-banner h3{font-size:19px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;margin:0 0 8px;}" +
      "#scrolly-promo-banner p{font-size:14px;line-height:1.5;color:rgba(255,255,255,0.72);margin:0 0 16px;}" +
      "#scrolly-promo-banner .cta-row{display:flex;align-items:center;gap:14px;}" +
      "#scrolly-promo-banner a.cta{background:#ff0f6e;color:#fff;font-size:14px;font-weight:600;padding:11px 18px;border-radius:9999px;text-decoration:none;white-space:nowrap;}" +
      "#scrolly-promo-banner a.cta:hover{opacity:0.9;}" +
      "#scrolly-promo-banner button.dismiss{position:absolute;top:10px;right:12px;background:none;border:0;color:rgba(255,255,255,0.45);font-size:22px;line-height:1;cursor:pointer;padding:6px;}" +
      "#scrolly-promo-banner button.dismiss:hover{color:#fff;}" +
      "@media (max-width:480px){#scrolly-promo-banner{left:12px;right:12px;bottom:12px;padding:18px 20px;}}";
    document.head.appendChild(style);
  }

  function hide(el) {
    el.classList.remove("is-visible");
    setTimeout(function () {
      el.remove();
    }, 450);
  }

  function render() {
    var el = document.createElement("div");
    el.id = "scrolly-promo-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", CONFIG.headline);
    el.innerHTML =
      '<button class="dismiss" type="button" aria-label="' + CONFIG.dismissLabel + '">×</button>' +
      '<div class="eyebrow">' + CONFIG.eyebrow + "</div>" +
      "<h3>" + CONFIG.headline + "</h3>" +
      "<p>" + CONFIG.body + "</p>" +
      '<div class="cta-row"><a class="cta" href="' + CONFIG.ctaHref + '">' + CONFIG.ctaText + "</a></div>";
    document.body.appendChild(el);

    el.querySelector(".dismiss").addEventListener("click", function () {
      markDismissed();
      hide(el);
    });
    el.querySelector("a.cta").addEventListener("click", function () {
      markDismissed();
    });

    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });
  }

  function scrollPercent() {
    var doc = document.documentElement;
    var scrollTop = window.scrollY || doc.scrollTop;
    var scrollable = (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    if (scrollable <= 0) return 100;
    return (scrollTop / scrollable) * 100;
  }

  function setupScrollTrigger() {
    var shown = false;
    function onScroll() {
      if (shown) return;
      if (scrollPercent() >= CONFIG.trigger.scrollPercent) {
        shown = true;
        window.removeEventListener("scroll", onScroll);
        render();
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function init() {
    if (!CONFIG.enabled) return;
    if (alreadyDismissedRecently()) return;
    if (document.getElementById("scrolly-promo-banner")) return;
    injectStyles();
    if (CONFIG.trigger.type === "scroll") {
      setupScrollTrigger();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Für Tests/Debugging ansprechbar — kein Teil des eigentlichen Verhaltens.
  window.ScrollyPromoBanner = {
    CONFIG: CONFIG,
    _resetDismissed: function () {
      try {
        localStorage.removeItem(CONFIG.storageKey);
      } catch (e) {}
    },
  };
})();
