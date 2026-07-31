import { test, expect } from '@playwright/test';

test.describe('Impressum & Datenschutz — Erreichbarkeit', () => {
  test('Startseite lädt und enthält Footer-Links zu Impressum und Datenschutz', async ({ page }) => {
    const response = await page.goto('/index.html');
    expect(response.status()).toBe(200);

    const impressumLink = page.locator('a[href="/impressum.html"]');
    const datenschutzLink = page.locator('a[href="/datenschutz.html"]');

    await expect(impressumLink).toHaveCount(1);
    await expect(datenschutzLink).toHaveCount(1);
    await expect(impressumLink).toHaveText('Impressum');
    await expect(datenschutzLink).toHaveText('Datenschutz');
  });

  test('Impressum-Link von der Startseite aus führt zur Impressum-Seite', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('a[href="/impressum.html"]').click();
    await expect(page).toHaveURL(/\/impressum(\.html)?$/); // Cloudflare Pages entfernt .html serverseitig
    await expect(page.locator('h1')).toHaveText('Impressum');
  });

  test('Datenschutz-Link von der Startseite aus führt zur Datenschutzerklärung', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('a[href="/datenschutz.html"]').click();
    await expect(page).toHaveURL(/\/datenschutz(\.html)?$/); // Cloudflare Pages entfernt .html serverseitig
    await expect(page.locator('h1')).toHaveText('Datenschutzerklärung');
  });

  test('Impressum und Datenschutz sind auch direkt per URL erreichbar (HTTP 200)', async ({ request }) => {
    const impressum = await request.get('/impressum.html');
    expect(impressum.status()).toBe(200);

    const datenschutz = await request.get('/datenschutz.html');
    expect(datenschutz.status()).toBe(200);
  });
});

test.describe('Impressum — Pflichtangaben', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/impressum.html');
  });

  test('enthält Firmenname, Anschrift und Kontakt', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('ppi Media GmbH');
    expect(text).toContain('Wendenstraße 130');
    expect(text).toContain('20537 Hamburg');
    expect(text).toContain('info@ppimedia.de');
  });

  test('enthält Geschäftsführer und Registereintrag', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('Dr. Hauke Berndt');
    expect(text).toContain('Manuel Scheyda');
    expect(text).toContain('Amtsgericht Hamburg');
    expect(text).toContain('84308');
    expect(text).toContain('DE 811136645');
  });

  test('verlinkt zurück zur Startseite', async ({ page }) => {
    await page.locator('header a[href="/index.html"]').click();
    await expect(page).toHaveURL(/\/(index\.html)?$/);
  });
});

test.describe('Datenschutzerklärung — Pflichtangaben', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/datenschutz.html');
  });

  test('nennt Verantwortlichen und Datenschutzbeauftragten', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('ppi Media GmbH');
    expect(text).toContain('Dirk Behrsing');
    expect(text).toContain('datenschutz@ppimedia.de');
  });

  test('legt Hosting-Datenverarbeitung (Cloudflare) offen', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('Cloudflare');
    expect(text).toContain('Server-Logfiles');
  });

  test('erklärt den aktuellen Cookie-Status korrekt', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toMatch(/keine Cookies/i);
  });

  test('nennt die Betroffenenrechte', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('Auskunft');
    expect(text).toContain('Löschung');
    expect(text).toContain('Widerspruch');
  });

  test('legt den Einsatz von Cloudflare Web Analytics offen und beschreibt ihn als cookie-frei', async ({ page }) => {
    const text = await page.locator('main').innerText();
    expect(text).toContain('Cloudflare Web Analytics');
    expect(text).toMatch(/ohne Cookies/i);
  });
});

test.describe('Cloudflare Web Analytics — Beacon auf allen Seiten', () => {
  for (const path of ['/index.html', '/impressum.html', '/datenschutz.html']) {
    test(`${path} bindet den Web-Analytics-Beacon ein`, async ({ page }) => {
      await page.goto(path);
      const beacon = page.locator('script[data-cf-beacon]');
      await expect(beacon).toHaveCount(1);
      await expect(beacon).toHaveAttribute('src', 'https://static.cloudflareinsights.com/beacon.min.js');
    });
  }
});

// Hinweis: Das Termin-Formular überträgt seit der Lead-Speicherung (siehe CLAUDE.md)
// absichtlich Daten an /lead. Der zugehörige Test dafür liegt in tests/lead-capture.spec.js
// ("Absenden des Formulars sendet die Daten an /lead und zeigt weiterhin Danke").
