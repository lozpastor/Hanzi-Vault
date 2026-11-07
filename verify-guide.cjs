const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'C:/Users/alexi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml', json: 'application/json' };
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!/^[\w-]+\.(html|js|css|svg|json)$/.test(name) || !fs.existsSync(name)) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader('Content-Type', types[name.split('.').pop()]);
  fs.createReadStream(name).pipe(response);
});

async function verify() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, colorScheme: 'light' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/supabase-config.js*', route => route.fulfill({
      contentType: 'text/javascript', body: 'window.HANZI_SUPABASE={};'
    }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const guide = page.getByRole('dialog');
    await guide.getByRole('heading', { name: 'Hola, soy Lin' }).waitFor();
    assert.match(await page.locator('.sidebar [data-lin-target]').innerText(), /Lecciones/);
    await guide.getByRole('button', { name: 'Siguiente' }).click();
    assert.match(await page.locator('.sidebar [data-lin-target]').innerText(), /Frases/);
    await guide.getByRole('button', { name: 'Siguiente' }).click();
    assert.match(await page.locator('.sidebar [data-lin-target]').innerText(), /Repasar/);
    await guide.getByRole('button', { name: 'Ver mi recomendación' }).click();
    await guide.getByRole('heading', { name: 'Un rato con Lin' }).waitFor();
    await guide.getByRole('button', { name: 'Cerrar guía' }).click();
    await guide.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('[data-lin-target]').count(), 0);
    await page.screenshot({ path: 'qa-cuaderno-desktop.png' });
    const pet = page.getByRole('button', { name: 'Abrir guía de Lin' });
    const before = await pet.boundingBox();
    await page.mouse.move(before.x + 25, before.y + 25);
    await page.mouse.down();
    await page.mouse.move(before.x - 130, before.y - 110, { steps: 12 });
    assert.equal(await pet.getAttribute('data-state'), 'dragging');
    await page.mouse.up();
    assert.equal(await pet.getAttribute('data-state'), 'happy');
    assert((await pet.boundingBox()).x < before.x - 100);
    assert.equal(await guide.isVisible(), false);
    const dragged = await pet.boundingBox();
    await pet.focus();
    await page.keyboard.press('ArrowRight');
    assert((await pet.boundingBox()).x > dragged.x + 20);
    await page.locator('.sidebar').getByRole('button', { name: 'Perfil' }).click();
    await page.getByLabel('Nivel de conversación').selectOption('3');
    await page.getByLabel('Apariencia').selectOption('dark');
    await page.getByLabel('Mostrar caracteres en las lecciones').check();
    await page.getByRole('button', { name: 'Guardar preferencias' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Abrir guía de Lin' }).waitFor();
    assert.equal(await guide.isVisible(), false);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.evaluate(() => {
      DB.words = [{ id: 'due', zh: '水', status: 'learned', nextReview: '2020-01-01' }];
      DB.grammar = [];
    });
    await page.getByRole('button', { name: 'Abrir guía de Lin' }).click();
    assert.match(await guide.textContent(), /Nivel 3.*1 ficha pendiente/s);
    await guide.getByRole('button', { name: 'Ensayar un diálogo guiado' }).click();
    await guide.getByText('Ver una respuesta').click();
    await guide.getByRole('button', { name: 'Seguir' }).click();
    assert.match(await guide.locator('.lin-practice').innerText(), /Turno 2/);
    await guide.getByRole('button', { name: 'Ir al repaso' }).click();
    assert.equal(await page.locator('.practice-hanzi').textContent(), '水');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir guía de Lin' }).click();
    await guide.getByRole('button', { name: 'Prefiero una lección' }).click();
    await page.getByRole('heading', { name: 'Llegar al alojamiento' }).waitFor();
    assert(await page.locator('.lesson-list details').first().getAttribute('open') !== null);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: 'qa-cuaderno-leccion.png' });
    await page.locator('.mobile-dock').getByRole('button', { name: 'Perfil' }).click();
    assert.equal(await page.getByLabel('Nivel de conversación').inputValue(), '3');
    await page.screenshot({ path: 'qa-cuaderno-perfil.png' });
    await page.getByRole('button', { name: 'Volver a ver el tutorial' }).click();
    assert.equal(await page.locator('.mobile-dock [data-lin-target]').getAttribute('data-page'), 'lessons');
    await page.screenshot({ path: 'qa-lin-tutorial.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await guide.waitFor({ state: 'hidden' });
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ['dashboard', 'dictionary', 'grammar', 'lessons', 'review', 'profile', 'recommendations', 'categories', 'import-export']) {
        await page.evaluate(id => showPage(id), section);
        assert(await page.locator(`#page-${section}`).isVisible(), section);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section} at ${width}px`);
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: onboarding, preferences, due review, guided lesson, profile, navigation at 390/820/1440px.');
  } finally {
    await browser.close();
  }
}

verify().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => server.close());
