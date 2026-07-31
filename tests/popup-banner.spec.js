import { test, expect } from '@playwright/test';

const BANNER = '#scrolly-promo-banner';

async function clearDismissed(page) {
  await page.evaluate(() => window.ScrollyPromoBanner?._resetDismissed());
}

test.describe('Promo-Banner — Scroll-Trigger', () => {
  test('erscheint nicht sofort beim Laden', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator(BANNER)).toHaveCount(0);
  });

  test('erscheint nach Scrollen über die konfigurierte Schwelle', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
      window.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator(BANNER)).toBeVisible();
  });

  test('bleibt unter der Schwelle unsichtbar', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.1);
      window.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator(BANNER)).toHaveCount(0);
  });
});

test.describe('Promo-Banner — Inhalt & CTA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
      window.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator(BANNER)).toBeVisible();
  });

  test('zeigt Headline und CTA-Button mit Link zum Termin-Bereich', async ({ page }) => {
    const banner = page.locator(BANNER);
    await expect(banner.locator('h3')).toHaveText('Neugierig, wie schnell das geht?');
    const cta = banner.locator('a.cta');
    await expect(cta).toHaveAttribute('href', '#termin');
  });
});

test.describe('Promo-Banner — Dismiss & Frequency-Cap', () => {
  test('Schließen-Button blendet den Banner aus', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
      window.dispatchEvent(new Event('scroll'));
    });
    const banner = page.locator(BANNER);
    await expect(banner).toBeVisible();

    await banner.locator('button.dismiss').click();
    await expect(banner).toHaveCount(0, { timeout: 2000 });
  });

  test('erscheint nach Dismiss bei erneutem Besuch innerhalb der Frequency-Cap nicht wieder', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
      window.dispatchEvent(new Event('scroll'));
    });
    await page.locator(`${BANNER} button.dismiss`).click();
    await expect(page.locator(BANNER)).toHaveCount(0, { timeout: 2000 });

    // Neuer Seitenaufruf — localStorage bleibt erhalten (kein neuer Context)
    await page.goto('/index.html');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
      window.dispatchEvent(new Event('scroll'));
    });
    await expect(page.locator(BANNER)).toHaveCount(0);

    await clearDismissed(page);
  });
});

test.describe('Promo-Banner — nicht auf Legal-Seiten', () => {
  for (const path of ['/impressum.html', '/datenschutz.html']) {
    test(`${path} bindet das Promo-Banner-Skript nicht ein`, async ({ page }) => {
      await page.goto(path);
      const scriptTag = page.locator('script[src="/js/popup-banner.js"]');
      await expect(scriptTag).toHaveCount(0);
    });
  }
});
