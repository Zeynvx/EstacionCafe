function pathForRuntime() {
  return require('node:path').join(
    require('node:os').homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',
  );
}
const assert = require('node:assert/strict');
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    require.resolve('playwright', { paths: [process.cwd(), pathForRuntime()] }),
);
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path');
(async () => {
  const root = path.resolve('dist/estacion-cafe/browser');
  const server = http.createServer((req, res) => {
    let file = path.join(root, req.url.split('?')[0]);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, 'index.html');
    const types = {
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(4300, '127.0.0.1', r));
  let browser, page;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (e) => {
      errors.push(e.message);
      console.log('ERROR', e.message);
    });
    const go = async (url) => {
      console.log('CHECK', url);
      await page.goto('http://127.0.0.1:4300' + url);
      await page.waitForTimeout(400);
    };
    const dialog = () => page.locator('dialog[open]');
    const save = async () => {
      await dialog().getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.waitForTimeout(400);
      if (await page.locator('dialog[open]').count())
        throw new Error(await page.locator('dialog[open]').innerText());
    };
    const create = async () => page.getByRole('button', { name: 'Crear registro' }).click();
    const login = async (name, pw = 'CafePrueba123') => {
      await go('/login');
      await page.getByLabel('Usuario o correo').fill(name);
      await page.getByLabel('Contraseña', { exact: true }).first().fill(pw);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await page.waitForTimeout(500);
    };
    await go('/login');
    await page.getByLabel('Usuario o correo').fill('no-existe');
    await page.getByLabel('Contraseña', { exact: true }).first().fill('Incorrecta123');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByText('Usuario o contraseña incorrectos.').waitFor();
    await page.getByLabel('Nombres', { exact: true }).fill('Administrador Local');
    await page.getByLabel('Correo', { exact: true }).fill('admin@example.com');
    await page.getByLabel('Contraseña', { exact: true }).last().fill('CafePrueba123');
    await page.getByLabel('Repetir contraseña', { exact: true }).fill('CafePrueba123');
    await page.getByLabel('Acepto los términos y condiciones').check();
    await page.getByRole('button', { name: 'Configurar administrador local' }).click();
    await page.waitForURL('**/admin/dashboard');
    await go('/admin/proveedores');
    await create();
    await dialog().getByLabel('Proveedor', { exact: true }).fill('Proveedor prueba');
    await dialog().getByLabel('Correo', { exact: true }).fill('proveedor@example.com');
    await dialog().getByLabel('Teléfono').fill('999999999');
    await save();
    assert.equal(await page.locator('.dt-container').count(), 1);
    await go('/admin/compras');
    await create();
    await dialog()
      .getByRole('combobox', { name: /^Proveedor/ })
      .selectOption({ label: 'Proveedor prueba' });
    await dialog()
      .getByRole('combobox', { name: /^Insumo/ })
      .selectOption({ label: 'Café en grano (kg)' });
    await dialog().getByLabel('Cantidad en').fill('2');
    await dialog().getByLabel('Costo total').fill('50');
    await save();
    await page.getByRole('button', { name: 'Recibir', exact: true }).click();
    await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
    await go('/admin/stock');
    assert.match(await page.locator('tbody').innerText(), /14/);
    await go('/admin/trabajadores');
    for (const [name, role] of [
      ['Cocinero', 'Barista / Cocina'],
      ['Cajero', 'Caja'],
      ['Logistico', 'Logistica'],
    ]) {
      await create();
      await dialog().getByLabel('Nombre', { exact: true }).fill(name);
      await dialog().getByLabel('Apellido paterno').fill('Prueba');
      await dialog().getByLabel('Apellido materno').fill('Local');
      await dialog()
        .getByLabel('Correo', { exact: true })
        .fill(name.toLowerCase() + '@example.com');
      await dialog().getByLabel('Teléfono').fill('999999999');
      await dialog().getByLabel('Dirección', { exact: true }).fill('Calle prueba 123');
      await dialog().getByRole('combobox', { name: /^Rol/ }).selectOption(role);
      await dialog().getByLabel('Contraseña (mínimo').fill('CafePrueba123');
      await save();
    }
    await page.screenshot({ path: 'checks/admin.png' });
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await go('/login');
    await page.getByLabel('Usuario o correo').fill('no-existe');
    await page.getByLabel('Contraseña', { exact: true }).first().fill('Incorrecta123');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByText('Usuario o contraseña incorrectos.').waitFor();
    await page.getByLabel('Nombres', { exact: true }).fill('Cliente Prueba');
    await page.getByLabel('Correo', { exact: true }).fill('cliente@example.com');
    await page.getByLabel('Contraseña', { exact: true }).last().fill('CafePrueba123');
    await page.getByLabel('Repetir contraseña', { exact: true }).fill('CafePrueba123');
    await page.getByLabel('Acepto los términos y condiciones').check();
    await page.getByRole('button', { name: 'Registrarme' }).click();
    await page.waitForURL('**/usuario');
    await go('/productos');
    assert.equal(await page.getByRole('button', { name: 'Elegir y agregar' }).count(), 23);
    await page.screenshot({ path: 'checks/catalog.png' });
    await page.getByRole('button', { name: 'Elegir y agregar' }).first().click();
    await dialog().getByLabel('Cantidad', { exact: true }).fill('2');
    await dialog().getByLabel('Tipo de leche').selectOption('Avena');
    await dialog().getByLabel('Shot extra').check();
    await dialog().getByLabel('Indicaciones especiales').fill('Tibio');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'checks/dialog.png' });
    await dialog()
      .getByRole('button', { name: /Agregar ·/ })
      .click();
    await go('/promociones');
    assert.equal(await page.getByRole('button', { name: 'Elegir y agregar' }).count(), 5);
    await go('/postres');
    assert.equal(await page.getByRole('button', { name: 'Elegir y agregar' }).count(), 6);
    await page.getByRole('button', { name: 'Carrito (2)' }).click();
    await page.waitForTimeout(500);
    assert.match(await dialog().innerText(), /Avena/);
    await page.screenshot({ path: 'checks/cart.png' });
    await dialog().getByRole('button', { name: 'Continuar al pago' }).click();
    await page.getByLabel('Teléfono', { exact: true }).fill('999999999');
    await page.getByLabel('Número de mesa').fill('3');
    await page.getByRole('button', { name: 'Finalizar pedido' }).click();
    await page.getByRole('heading', { name: 'Pedido recibido' }).waitFor();
    await go('/usuario');
    assert.match(await page.locator('main').innerText(), /Café Expreso/);
    await page.getByLabel('Dirección', { exact: true }).fill('Calle nueva 123');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.getByText('Tus datos se guardaron.').waitFor();
    await go('/admin/productos');
    assert.match(page.url(), /login/);
    await login('cocinero.prueba');
    await go('/admin/pedidos');
    assert.equal(await page.getByRole('button', { name: 'Editar', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Crear registro' }).count(), 0);
    await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.locator('tbody').getByText('Finalizado', { exact: true }).waitFor();
    await login('cajero.prueba');
    await go('/admin/pedidos');
    await page.getByRole('button', { name: 'Confirmar pago', exact: true }).click();
    await dialog().getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.locator('tbody').getByText('Efectivo · Pagado', { exact: true }).waitFor();
    await create();
    await dialog().getByLabel('Mesa', { exact: true }).fill('5');
    await dialog().locator('select[name=productId]').selectOption({ label: 'Café Americano' });
    await dialog().getByRole('button', { name: 'Agregar producto' }).click();
    await save();
    await login('logistico.prueba');
    await go('/admin/pedidos');
    assert.equal(await page.getByRole('button', { name: 'Finalizar', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Editar', exact: true }).count(), 0);
    await go('/admin/clientes');
    assert.match(page.url(), /login/);
    await page.setViewportSize({ width: 390, height: 844 });
    await go('/productos');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: 'checks/mobile.png' });
    assert.deepEqual(errors, []);
    console.log(
      'PASS: 23 products, 5 promotions, 6 desserts, customization, persistent cart, checkout, profile, users, roles, DataTables, purchase receipt, stock, cash payment, counter order, mobile layout.',
    );
  } catch (e) {
    if (page) {
      console.log(await page.locator('body').innerText());
      console.log('PURCHASES', await page.evaluate(() => localStorage.getItem('ec.purchases')));
      await page.screenshot({ path: 'checks/failure.png' });
    }
    throw e;
  } finally {
    if (browser) await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
