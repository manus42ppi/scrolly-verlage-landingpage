import { test, expect } from '@playwright/test';

const EXPORT_AUTH = { username: 'test-export-user', password: 'test-export-pass' };

function uniqueEmail(tag) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@beispiel.de`;
}

test.describe('POST /lead — Backend-Validierung', () => {
  test('speichert eine gültige Anfrage', async ({ request }) => {
    const email = uniqueEmail('valid');
    const res = await request.post('/lead', {
      data: { email, company: 'Test Verlag', slot: 'Diese Woche', source: 'api-test' },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const csv = await request.get('/leads-export', { headers: authHeader() });
    expect(await csv.text()).toContain(email);
  });

  test('lehnt eine ungültige E-Mail-Adresse ab', async ({ request }) => {
    const res = await request.post('/lead', {
      data: { email: 'keine-email', source: 'api-test' },
    });
    expect(res.status()).toBe(400);
  });

  test('Honeypot-Feld: Anfrage wird vorgetäuscht angenommen, aber nicht gespeichert', async ({ request }) => {
    const email = uniqueEmail('honeypot');
    const res = await request.post('/lead', {
      data: { email, source: 'api-test', website: 'https://spam-bot.example' },
    });
    expect(res.status()).toBe(200);

    const csv = await request.get('/leads-export', { headers: authHeader() });
    expect(await csv.text()).not.toContain(email);
  });
});

test.describe('GET /leads-export — Zugriffsschutz', () => {
  test('ohne Zugangsdaten: 401', async ({ request }) => {
    const res = await request.get('/leads-export');
    expect(res.status()).toBe(401);
  });

  test('mit falschen Zugangsdaten: 401', async ({ request }) => {
    const res = await request.get('/leads-export', {
      headers: { authorization: 'Basic ' + Buffer.from('falsch:falsch').toString('base64') },
    });
    expect(res.status()).toBe(401);
  });

  test('mit korrekten Zugangsdaten: 200, CSV mit Header-Zeile', async ({ request }) => {
    const res = await request.get('/leads-export', { headers: authHeader() });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    const text = await res.text();
    expect(text.split('\n')[0]).toBe('id,email,company,slot,source,createdAt,userAgent,referer');
  });
});

test.describe('Termin-Formular — echte Übertragung', () => {
  test('Absenden des Formulars sendet die Daten an /lead und zeigt weiterhin "Danke"', async ({ page }) => {
    const email = uniqueEmail('frontend');

    await page.goto('/index.html');

    const leadRequest = page.waitForRequest(
      (req) => req.url().endsWith('/lead') && req.method() === 'POST'
    );

    await page.locator('#termin input[type="email"]').fill(email);
    await page.locator('#termin button[type="submit"]').click();

    const request = await leadRequest;
    const payload = request.postDataJSON();
    expect(payload.email).toBe(email);
    expect(payload.source).toBe('termin-form');
    expect(payload.website).toBe('');

    await expect(page.locator('#termin')).toContainText('Danke');

    const csv = await page.request.get('/leads-export', { headers: authHeader() });
    expect(await csv.text()).toContain(email);
  });

  test('Honeypot-Feld ist im DOM vorhanden, aber für echte Nutzer unsichtbar', async ({ page }) => {
    await page.goto('/index.html');
    const honeypot = page.locator('#termin input[name="website"]');
    await expect(honeypot).toHaveCount(1);
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toHaveAttribute('aria-hidden', 'true');
    const box = await honeypot.boundingBox();
    expect(box.x).toBeLessThan(0); // per position:absolute; left:-9999px außerhalb des Viewports
  });
});

function authHeader() {
  const token = Buffer.from(`${EXPORT_AUTH.username}:${EXPORT_AUTH.password}`).toString('base64');
  return { authorization: `Basic ${token}` };
}
