/**
 * run-qa-gobernanza-playwright.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Runner de regresión E2E para la Pantalla 2 (Gobernanza QA).
 * Replica la arquitectura de run-qa-cases-playwright.mjs pero orientado al
 * módulo de gestión de datasets, corridas de regresión y revisión manual.
 *
 * Uso básico:
 *   node scripts/run-qa-gobernanza-playwright.mjs
 *   node scripts/run-qa-gobernanza-playwright.mjs --demo
 *   node scripts/run-qa-gobernanza-playwright.mjs --demo --chrome
 *   node scripts/run-qa-gobernanza-playwright.mjs --escenario GOB-001
 *
 * Variables de entorno:
 *   AUDITORIA_API_URL          URL del backend   (default: http://localhost:8001/api)
 *   AUDITORIA_FRONTEND_URL     URL del frontend  (default: http://localhost:4200)
 *   AUDITORIA_QA_CORREO        correo del usuario QA (default: qa-local@auditoria.test)
 *   AUDITORIA_QA_PASSWORD      contraseña        (default: qa-local-123456)
 *   AUDITORIA_QA_GOBERNANZA_ESCENARIOS_PATH  ruta al JSON de escenarios
 *   AUDITORIA_QA_GOBERNANZA_ESCENARIO        filtrar por ID de escenario
 *   AUDITORIA_QA_OUTPUT_DIR    carpeta de salida (default: ../../outputs/playwright/qa-gobernanza)
 *   PLAYWRIGHT_HEADLESS        'false' para abrir el navegador (default: true)
 *   PLAYWRIGHT_SLOWMO_MS       milisegundos de slowmo (default: 0 en headless, 100 visible)
 *   PLAYWRIGHT_DEMO_PAUSE_MS   pausa entre acciones en modo demo
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE  ruta al ejecutable del navegador
 *   PLAYWRIGHT_BROWSER         'chrome' para forzar Google Chrome
 */

import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';
import { chromium } from 'playwright-core';

// ─── Configuración general ────────────────────────────────────────────────────

const backendRoot   = process.cwd();
const repoRoot      = resolve(backendRoot, '..');
const apiUrl        = (process.env.AUDITORIA_API_URL ?? 'http://localhost:8001/api').replace(/\/$/, '');
let   frontendUrl   = (process.env.AUDITORIA_FRONTEND_URL ?? 'http://localhost:4200').replace(/\/$/, '');
const frontendUrlConfigurado = Boolean(process.env.AUDITORIA_FRONTEND_URL);
const correo        = process.env.AUDITORIA_QA_CORREO   ?? 'qa-local@auditoria.test';
const contrasena    = process.env.AUDITORIA_QA_PASSWORD ?? 'qa-local-123456';
const mongodbUri    = process.env.MONGODB_URI ?? process.env.AUDITORIA_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/auditoria_ganancias';
const escenarioFiltro = process.env.AUDITORIA_QA_GOBERNANZA_ESCENARIO
  ?? argValue('--escenario');
const escenariosPath  = process.env.AUDITORIA_QA_GOBERNANZA_ESCENARIOS_PATH
  ?? resolve(backendRoot, 'scripts', 'qa-gobernanza-escenarios.json');
const outputDir     = resolve(
  repoRoot,
  process.env.AUDITORIA_QA_OUTPUT_DIR ?? 'outputs/playwright/qa-gobernanza',
);
const timeoutMs     = Number(process.env.AUDITORIA_PLAYWRIGHT_TIMEOUT_MS ?? 90_000);

// ─── Modos de ejecución (mismos flags que el runner original) ─────────────────
const modoDemo      = process.argv.includes('--demo')     || process.env.AUDITORIA_PLAYWRIGHT_DEMO      === 'true';
const modoMuyLento  = process.argv.includes('--muy-lento') || process.env.AUDITORIA_PLAYWRIGHT_MUY_LENTO === 'true';
const forzarChrome  = process.argv.includes('--chrome')   || process.env.PLAYWRIGHT_BROWSER             === 'chrome';
const headless      = modoDemo ? false : process.env.PLAYWRIGHT_HEADLESS !== 'false';
const slowMoMs      = Number(process.env.PLAYWRIGHT_SLOWMO_MS ?? (modoMuyLento ? 2600 : modoDemo ? 1800 : headless ? 0 : 100));
const demoPauseMs   = Number(process.env.PLAYWRIGHT_DEMO_PAUSE_MS ?? (modoMuyLento ? 1800 : modoDemo ? 900 : 0));

// ─── Estado global ────────────────────────────────────────────────────────────
const capturas = [];
let browser;
let page;

// ─── Punto de entrada ─────────────────────────────────────────────────────────
try {
  await mkdir(outputDir, { recursive: true });
  await verificarServicios();
  await conectarMongo();
  await asegurarUsuario();

  const escenarios = await cargarEscenarios();

  const executablePath = detectarNavegador({ forzarChrome });
  browser = await chromium.launch({
    headless,
    ...(executablePath ? { executablePath } : {}),
    slowMo: slowMoMs,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-AR',
  });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  await iniciarSesion();
  await tomarCaptura('00-inicio');

  // ─── Ejecución de escenarios ─────────────────────────────────────────────
  const resultados = [];
  for (const escenario of escenarios) {
    resultados.push(await ejecutarEscenario(escenario));
  }

  // ─── Evidencia JSON ───────────────────────────────────────────────────────
  const estado = resultados.every(r => r.estado === 'verde') ? 'verde' : 'rojo';
  const evidenciaPath = join(outputDir, 'qa-gobernanza-evidence.json');
  await writeFile(
    evidenciaPath,
    JSON.stringify({
      estado,
      sistema:       'auditoria-ganancias-gobernanza',
      modulo:        'qa-pantalla-2',
      frontend_url:  frontendUrl,
      api_url:       apiUrl,
      escenario_filtro: escenarioFiltro ?? null,
      modo_demo:     modoDemo,
      slow_mo_ms:    slowMoMs,
      resultados,
      capturas,
      fecha:         new Date().toISOString(),
    }, null, 2) + '\n',
    'utf8',
  );

  // ─── Resumen por consola ──────────────────────────────────────────────────
  console.log('');
  console.log(`QA Playwright Gobernanza: ${estado}`);
  console.log(`- escenarios=${resultados.length}`);
  console.log(`- evidencia=${evidenciaPath}`);
  for (const r of resultados) {
    const icono = r.estado === 'verde' ? '✅' : '❌';
    console.log(`  ${icono} [${r.id}] ${r.descripcion}: ${r.detalle}`);
    if (r.assertions_fallidas?.length) {
      for (const f of r.assertions_fallidas) {
        console.log(`       ↳ FALLO: ${f}`);
      }
    }
  }

  if (estado !== 'verde') process.exitCode = 1;

} catch (error) {
  if (page) await tomarCaptura('99-error-fatal').catch(() => undefined);
  console.error('');
  console.error('QA Playwright Gobernanza: rojo');
  console.error(`- ${detalleError(error)}`);
  console.error(`- Backend esperado:  ${apiUrl}`);
  console.error(`- Frontend esperado: ${frontendUrl}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  await mongoose.disconnect().catch(() => undefined);
}

// ─── Ejecutar un escenario ────────────────────────────────────────────────────

async function ejecutarEscenario(escenario) {
  const id      = escenario.id;
  const tipo    = escenario.tipo ?? 'regresion';
  const desc    = escenario.descripcion ?? id;
  const casoSeg = nombreSeguro(id);

  console.log(`\n▶ Ejecutando escenario [${id}] (${tipo})...`);

  try {
    if (tipo === 'solo_datasets') {
      return await ejecutarEscenarioDatasets(escenario, casoSeg);
    }
    return await ejecutarEscenarioRegresion(escenario, casoSeg);
  } catch (error) {
    await tomarCaptura(`${casoSeg}-error`).catch(() => undefined);
    return {
      id,
      descripcion: desc,
      estado:      'rojo',
      detalle:     detalleError(error),
    };
  }
}

// ─── Escenario: verificación del listado de Datasets ─────────────────────────

async function ejecutarEscenarioDatasets(escenario, casoSeg) {
  const assertions = escenario.assertions ?? {};

  // Navegar a Pantalla 2
  console.log('  → Navegando a /qa/pantalla-2...');
  await page.goto(`${frontendUrl}/qa/pantalla-2`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Gestión de Datasets' }).waitFor({ state: 'visible' });
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-datasets-list`);

  // Verificar que la tabla de datasets tiene filas
  const filas = page.locator('table tr[mat-row]');
  const cantFilas = await filas.count();
  const datasetsMinimos = assertions.datasets_minimos ?? 1;
  assert.ok(
    cantFilas >= datasetsMinimos,
    `Se esperaban al menos ${datasetsMinimos} dataset(s), se encontraron ${cantFilas}`,
  );
  console.log(`  ✓ Tabla con ${cantFilas} dataset(s)`);

  // Verificar que los badges de estado son válidos
  const estadosValidos = assertions.estados_validos ?? [];
  if (estadosValidos.length > 0) {
    const badges = page.locator('span.badge');
    const cantBadges = await badges.count();
    for (let i = 0; i < cantBadges; i++) {
      const texto = (await badges.nth(i).textContent() ?? '').trim().toLowerCase();
      // Verificamos que el badge corresponde a algún estado conocido
      const esValido = estadosValidos.some(e => texto.includes(e.toLowerCase()));
      assert.ok(esValido, `Badge con estado inesperado: "${texto}"`);
    }
    console.log(`  ✓ ${cantBadges} badge(s) con estados válidos`);
  }

  // Explorar: abrir formulario de Nuevo Dataset y volver
  console.log('  → Abriendo formulario "Nuevo Dataset"...');
  await page.getByRole('button', { name: /Nuevo Dataset/i }).click();
  await pausaDemo();
  await page.getByRole('heading', { name: /Nuevo Dataset|Dataset/i }).first().waitFor({ state: 'visible' });
  await tomarCaptura(`${casoSeg}-dataset-form`);
  await pausaDemo();

  // Volver al listado
  const btnVolver = page.getByRole('button', { name: /cancelar|volver/i }).first();
  if (await btnVolver.isVisible()) {
    await btnVolver.click();
    await page.getByRole('heading', { name: 'Gestión de Datasets' }).waitFor({ state: 'visible' });
  }
  await pausaDemo();

  // Explorar: abrir "Ver Casos" del primer dataset
  const btnVerCasos = page.getByRole('button').filter({
    has: page.locator('mat-icon', { hasText: 'list_alt' }),
  }).first();
  if (await btnVerCasos.count() > 0 && await btnVerCasos.isVisible()) {
    console.log('  → Abriendo listado de Casos del primer dataset...');
    await btnVerCasos.click();
    await pausaDemo();
    await tomarCaptura(`${casoSeg}-casos-list`);
    await pausaDemo();
    // Volver
    const btnBack = page.getByRole('button').filter({
      has: page.locator('mat-icon', { hasText: 'arrow_back' }),
    }).first();
    if (await btnBack.count() > 0 && await btnBack.isVisible()) {
      await btnBack.click();
      await page.getByRole('heading', { name: 'Gestión de Datasets' }).waitFor({ state: 'visible' });
    }
  }

  return {
    id:          escenario.id,
    descripcion: escenario.descripcion,
    estado:      'verde',
    tipo:        'solo_datasets',
    datasets_encontrados: cantFilas,
    detalle:     `${cantFilas} dataset(s) cargados correctamente`,
  };
}

// ─── Escenario: corrida de regresión entre dos datasets ───────────────────────

async function ejecutarEscenarioRegresion(escenario, casoSeg) {
  const assertions     = escenario.assertions ?? {};
  const dsAnteriorId   = escenario.dataset_anterior;
  const dsNuevoId      = escenario.dataset_nuevo;

  assert.ok(dsAnteriorId, 'El escenario debe definir "dataset_anterior"');
  assert.ok(dsNuevoId,    'El escenario debe definir "dataset_nuevo"');

  // ── 1. Navegar a Pantalla 2 y verificar carga inicial ────────────────────
  console.log('  → Navegando a /qa/pantalla-2...');
  await page.goto(`${frontendUrl}/qa/pantalla-2`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Gestión de Datasets' }).waitFor({ state: 'visible' });
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-00-datasets`);

  // ── 2. Ir al tab Regresión ────────────────────────────────────────────────
  console.log('  → Navegando al tab "Regresión"...');
  await page.getByRole('button', { name: /Regresión/i }).click();
  await page.getByRole('heading', { name: 'Ejecutar Suite de Regresión' }).waitFor({ state: 'visible' });
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-01-regresion-wizard`);

  // ── 3. Seleccionar Dataset Base ───────────────────────────────────────────
  console.log(`  → Seleccionando Dataset Base: ${dsAnteriorId}...`);
  await page.getByTestId('select-ds-base').click({ force: true });
  await page.waitForTimeout(400);
  const opcionBase = page.getByRole('option', { name: new RegExp(dsAnteriorId) }).first();
  await opcionBase.waitFor({ state: 'visible' });
  await opcionBase.click();
  await pausaDemo(0.5);

  // ── 4. Seleccionar Dataset a Validar ──────────────────────────────────────
  console.log(`  → Seleccionando Dataset a Validar: ${dsNuevoId}...`);
  await page.getByTestId('select-ds-nuevo').click({ force: true });
  await page.waitForTimeout(400);
  const opcionNuevo = page.getByRole('option', { name: new RegExp(dsNuevoId) }).first();
  await opcionNuevo.waitFor({ state: 'visible' });
  await opcionNuevo.click();
  await pausaDemo(0.5);
  await tomarCaptura(`${casoSeg}-02-datasets-seleccionados`);

  // ── 5. Verificar que el botón Ejecutar está habilitado ────────────────────
  const btnEjecutar = page.getByRole('button', { name: /Ejecutar Regresión/i });
  await btnEjecutar.waitFor({ state: 'visible' });
  const habilitado = await btnEjecutar.isEnabled();
  assert.ok(habilitado, 'El botón "Ejecutar Regresión" debería estar habilitado con dos datasets distintos');

  // ── 6. Ejecutar la regresión ──────────────────────────────────────────────
  console.log('  → Ejecutando la regresión...');
  await btnEjecutar.click();
  await pausaDemo();

  // Esperar a que aparezca la pantalla de resultados
  await page.getByRole('heading', { name: /Resultados:/i }).waitFor({ state: 'visible' });
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-03-resultados`);

  // ── 7. Leer y validar KPIs ────────────────────────────────────────────────
  console.log('  → Validando KPIs de resultados...');
  const kpisLeidos = await leerKpis();
  const assertionsFallidas = [];

  if (assertions.kpi_total !== undefined) {
    const ok = kpisLeidos.total === assertions.kpi_total;
    if (!ok) assertionsFallidas.push(`kpi_total: esperado=${assertions.kpi_total} actual=${kpisLeidos.total}`);
    else console.log(`  ✓ Casos Totales: ${kpisLeidos.total}`);
  }
  if (assertions.kpi_pass !== undefined) {
    const ok = kpisLeidos.pass === assertions.kpi_pass;
    if (!ok) assertionsFallidas.push(`kpi_pass: esperado=${assertions.kpi_pass} actual=${kpisLeidos.pass}`);
    else console.log(`  ✓ Exitosos: ${kpisLeidos.pass}`);
  }
  if (assertions.kpi_revision_manual !== undefined) {
    const ok = kpisLeidos.revision_manual === assertions.kpi_revision_manual;
    if (!ok) assertionsFallidas.push(`kpi_revision_manual: esperado=${assertions.kpi_revision_manual} actual=${kpisLeidos.revision_manual}`);
    else console.log(`  ✓ A Revisar: ${kpisLeidos.revision_manual}`);
  }
  if (assertions.kpi_fail_regresion !== undefined) {
    const ok = kpisLeidos.fail_regresion === assertions.kpi_fail_regresion;
    if (!ok) assertionsFallidas.push(`kpi_fail_regresion: esperado=${assertions.kpi_fail_regresion} actual=${kpisLeidos.fail_regresion}`);
    else console.log(`  ✓ Fallos Regresión: ${kpisLeidos.fail_regresion}`);
  }

  // ── 8. Explorar KPI cards (filtros) ──────────────────────────────────────
  console.log('  → Explorando filtros por estado...');
  for (const filtroTexto of ['Exitosos', 'Fallos Regresión', 'A Revisar', 'Casos Totales']) {
    const kpiCard = page.locator('.kpi-card', { hasText: filtroTexto });
    if (await kpiCard.count() > 0) {
      await kpiCard.click();
      await pausaDemo(0.4);
      await tomarCaptura(`${casoSeg}-04-filtro-${nombreSeguro(filtroTexto)}`);
    }
  }

  // ── 9. Abrir primer panel de resultado (accordion) ────────────────────────
  const primerPanel = page.locator('.panel-resultado').first();
  if (await primerPanel.count() > 0) {
    console.log('  → Abriendo primer caso del acordeón...');
    await primerPanel.click();
    await pausaDemo();
    await tomarCaptura(`${casoSeg}-05-detalle-caso`);
    await pausaDemo();
  }

  // ── 10. Ir a Cola de Revisión si hay ítems ────────────────────────────────
  const btnColaRevision = page.getByRole('button', { name: /Ir a Revisión/i });
  if (await btnColaRevision.count() > 0 && await btnColaRevision.isVisible()) {
    console.log('  → Navegando a Cola de Revisión...');
    await btnColaRevision.click();
    await pausaDemo();
    await tomarCaptura(`${casoSeg}-06-cola-revision`);
    await pausaDemo();
    // Aprobar/Descartar si existen ítems
    const btnAprobar = page.getByRole('button', { name: /Aprobar/i }).first();
    if (await btnAprobar.count() > 0 && await btnAprobar.isVisible()) {
      await btnAprobar.click();
      await pausaDemo(0.5);
      await tomarCaptura(`${casoSeg}-07-item-aprobado`);
    }
    // Volver a Regresión para explorar el historial
    await page.getByRole('button', { name: /Regresión/i }).click();
    await pausaDemo();
  }

  // ── 11. Historial ─────────────────────────────────────────────────────────
  console.log('  → Navegando al tab Historial...');
  await page.getByRole('button', { name: /Historial/i }).click();
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-08-historial`);
  await pausaDemo();

  // ── 12. Matriz de Cobertura ───────────────────────────────────────────────
  console.log('  → Navegando al tab Matriz Cobertura...');
  await page.getByRole('button', { name: /Matriz Cobertura/i }).click();
  await pausaDemo();
  await tomarCaptura(`${casoSeg}-09-cobertura`);
  await pausaDemo();

  // ── 13. Resultado final ───────────────────────────────────────────────────
  const hayFallos = assertionsFallidas.length > 0;
  return {
    id:                  escenario.id,
    descripcion:         escenario.descripcion,
    estado:              hayFallos ? 'rojo' : 'verde',
    dataset_anterior:    dsAnteriorId,
    dataset_nuevo:       dsNuevoId,
    kpis:                kpisLeidos,
    assertions_fallidas: assertionsFallidas,
    capturas_tomadas:    capturas.length,
    detalle:             hayFallos
      ? `${assertionsFallidas.length} assertion(s) fallidas`
      : `KPIs OK — total=${kpisLeidos.total} pass=${kpisLeidos.pass} fail=${kpisLeidos.fail_regresion} revision=${kpisLeidos.revision_manual}`,
  };
}

// ─── Leer los valores de los KPI cards ───────────────────────────────────────

async function leerKpis() {
  const kpis = { total: null, pass: null, revision_manual: null, fail_regresion: null };

  const cardTotal    = page.locator('.kpi-card', { hasText: 'Casos Totales' });
  const cardPass     = page.locator('.kpi-card', { hasText: 'Exitosos' });
  const cardRevision = page.locator('.kpi-card', { hasText: 'A Revisar' });
  const cardFail     = page.locator('.kpi-card', { hasText: 'Fallos Regresión' });

  const leerValor = async (locator) => {
    if (await locator.count() === 0) return null;
    const texto = await locator.locator('.kpi-valor').textContent();
    return Number((texto ?? '').trim());
  };

  kpis.total           = await leerValor(cardTotal);
  kpis.pass            = await leerValor(cardPass);
  kpis.revision_manual = await leerValor(cardRevision);
  kpis.fail_regresion  = await leerValor(cardFail);

  return kpis;
}

// ─── Conectar a MongoDB ───────────────────────────────────────────────────────

async function conectarMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5000 });
  console.log('  ✓ MongoDB conectado');
}

// ─── Crear/actualizar usuario QA en MongoDB ───────────────────────────────────

async function asegurarUsuario() {
  await mongoose.connection.collection('usuarios').updateOne(
    { correo },
    {
      $set: {
        correo,
        password_hash: crearPasswordHash(contrasena),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  console.log(`  ✓ Usuario QA listo (${correo})`);
}

function crearPasswordHash(valor) {
  const iteraciones = 210_000;
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(valor, salt, iteraciones, 32, 'sha256').toString('base64url');
  return `pbkdf2$${iteraciones}$${salt}$${hash}`;
}

// ─── Verificar que backend y frontend están levantados ───────────────────────

async function verificarServicios() {
  console.log('⏳ Verificando servicios...');

  const salud = await requestJson(`${apiUrl}/salud`, 'Backend no responde en /api/salud').catch(e => {
    throw new Error(`Backend no disponible: ${e.message}`);
  });
  assert.equal(salud.estado, 'ok', `Backend responde pero estado ≠ ok: ${JSON.stringify(salud)}`);
  console.log(`  ✓ Backend OK  (${apiUrl})`);

  await verificarFrontend();
  console.log(`  ✓ Frontend OK (${frontendUrl})`);
}

async function verificarFrontend() {
  const candidatos = frontendUrlConfigurado
    ? [frontendUrl]
    : Array.from(new Set([frontendUrl, 'http://localhost:4300']));

  const errores = [];
  for (const candidato of candidatos) {
    try {
      const response = await fetchConTimeout(candidato);
      if (!response.ok) { errores.push(`${candidato}: HTTP ${response.status}`); continue; }
      const html = await response.text();
      if (!/<app-root>/i.test(html)) { errores.push(`${candidato}: no parece un frontend Angular`); continue; }
      frontendUrl = candidato;
      return;
    } catch (error) {
      errores.push(`${candidato}: ${detalleError(error)}`);
    }
  }
  throw new Error(`Frontend no responde. Intentos: ${errores.join(' | ')}`);
}

// ─── Cargar escenarios desde JSON ────────────────────────────────────────────

async function cargarEscenarios() {
  if (!existsSync(escenariosPath)) {
    throw new Error(`No encontré el archivo de escenarios: ${escenariosPath}`);
  }
  const raw = await readFile(escenariosPath, 'utf8');
  const todos = JSON.parse(raw);

  const activos = todos.filter(e => e.activo !== false);
  const filtrados = escenarioFiltro
    ? activos.filter(e => e.id === escenarioFiltro)
    : activos;

  if (filtrados.length === 0) {
    throw new Error(escenarioFiltro
      ? `No hay escenario activo con id "${escenarioFiltro}".`
      : 'No hay escenarios activos en el archivo de escenarios.');
  }

  console.log(`  ✓ ${filtrados.length} escenario(s) cargados desde ${escenariosPath}`);
  return filtrados;
}

// ─── Login en la UI ───────────────────────────────────────────────────────────

async function iniciarSesion() {
  console.log(`\n🔐 Iniciando sesión como ${correo}...`);
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[aria-label="Correo electrónico"]').fill(correo);
  await page.locator('input[aria-label="Contraseña"]').fill(contrasena);

  const [response] = await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/api/auth/login') && r.request().method() === 'POST',
    ),
    page.locator('button[type="submit"]').click(),
  ]);

  if (!response.ok()) {
    throw new Error(`Login falló ${response.status()}: ${await response.text()}`);
  }
  await page.waitForURL(/\/inicio(?:$|[?#])/, { timeout: 30_000 });
  console.log('  ✓ Sesión iniciada');
}

// ─── Captura de pantalla ──────────────────────────────────────────────────────

async function tomarCaptura(nombre) {
  const destino = join(outputDir, `${nombreSeguro(nombre)}.png`);
  await page.screenshot({ path: destino, fullPage: true });
  capturas.push(destino);
  return destino;
}

// ─── Pausa en modo demo ───────────────────────────────────────────────────────

async function pausaDemo(factor = 1) {
  if (!demoPauseMs || factor <= 0) return;
  await page.waitForTimeout(Math.round(demoPauseMs * factor));
}

// ─── Detección de navegador ───────────────────────────────────────────────────

function detectarNavegador({ forzarChrome: soloChrome = false } = {}) {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

  // Linux
  const linuxChrome = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  const chromeLinux = linuxChrome.find(p => existsSync(p));
  if (chromeLinux) return chromeLinux;

  // Windows
  const winChrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    resolve(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
  ];
  const chromeWin = winChrome.find(p => p && existsSync(p));
  if (chromeWin) return chromeWin;

  if (soloChrome) {
    throw new Error('No encontré Google Chrome. Instalá Chrome o definí PLAYWRIGHT_CHROMIUM_EXECUTABLE.');
  }
  return undefined; // Usa el Chromium empaquetado con Playwright
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

async function requestJson(url, mensaje) {
  const response = await fetchConTimeout(url);
  if (!response.ok) {
    throw new Error(`${mensaje}: HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function fetchConTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function nombreSeguro(valor) {
  return String(valor)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'captura';
}

function detalleError(error) {
  return error instanceof Error ? error.message : String(error);
}

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}
