/**
 * run-qa-spider.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Runner de QA Lab Spider para exploración automática y health-check de la UI.
 */

import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';
import { chromium } from 'playwright-core';

const backendRoot = process.cwd();
const repoRoot = resolve(backendRoot, '..');
const apiUrl = (process.env.AUDITORIA_API_URL ?? 'http://localhost:8001/api').replace(/\/$/, '');
let frontendUrl = (process.env.AUDITORIA_FRONTEND_URL ?? 'http://localhost:4200').replace(/\/$/, '');
const correo = process.env.AUDITORIA_QA_CORREO ?? 'qa-local@auditoria.test';
const contrasena = process.env.AUDITORIA_QA_PASSWORD ?? 'qa-local-123456';
let mongodbUri = process.env.MONGODB_URI ?? process.env.AUDITORIA_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/auditoria_ganancias';
const memoryUriPath = resolve(backendRoot, '.memory-db-uri');
if ((mongodbUri === 'memory' || (!process.env.MONGODB_URI && !process.env.AUDITORIA_MONGODB_URI)) && existsSync(memoryUriPath)) {
  mongodbUri = readFileSync(memoryUriPath, 'utf8').trim();
}

const qaLabSeccionesStr = process.env.QA_LAB_SECCIONES ?? 'todas';
const qaLabAgresividad = process.env.QA_LAB_AGRESIVIDAD ?? 'suave'; // suave | media | extrema

const allRoutes = [
  '/inicio', '/cargar-excel', '/analisis', '/calculo', 
  '/diagnosticos', '/historial', '/configuracion', 
  '/qa/pantalla-1', '/qa/pantalla-2'
];

let rutasACrawlear = allRoutes;
if (qaLabSeccionesStr !== 'todas') {
  try {
    rutasACrawlear = JSON.parse(qaLabSeccionesStr);
  } catch (e) {
    rutasACrawlear = qaLabSeccionesStr.split(',').map(s => s.trim());
  }
}

const outputDir = resolve(repoRoot, 'outputs/playwright/qa-lab-spider');
const timeoutMs = Number(process.env.AUDITORIA_PLAYWRIGHT_TIMEOUT_MS ?? 90_000);

const modoDemo = process.argv.includes('--demo') || process.env.AUDITORIA_PLAYWRIGHT_DEMO === 'true';
const forzarChrome = process.argv.includes('--chrome') || process.env.PLAYWRIGHT_BROWSER === 'chrome';
const headedFlag = process.argv.includes('--headed');
const headless = (modoDemo || headedFlag) ? false : (process.env.PLAYWRIGHT_HEADLESS === 'true');
const slowMoMs = Number(process.env.PLAYWRIGHT_SLOWMO_MS ?? (modoDemo ? 900 : (headless ? 0 : 50)));

const capturas = [];
const consoleErrors = [];
const networkErrors = [];
const a11yIssues = [];
const pageLoadMetrics = [];
const visitedPages = [];
let browser;
let page;

try {
  await mkdir(outputDir, { recursive: true });
  await conectarMongo();
  await asegurarUsuario();

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

  // Listeners para captura de errores
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${msg.type()}] ${msg.text()} en ${page.url()}`);
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`[PAGE_ERROR] ${error.message} en ${page.url()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  await iniciarSesion();
  await tomarCaptura('00-inicio-spider');

  console.log(`\n▶ Iniciando QA Spider... Agresividad: ${qaLabAgresividad}`);
  
  for (const ruta of rutasACrawlear) {
    console.log(`\n🕸️ Crawleando: ${ruta}`);
    const start = Date.now();
    try {
      await page.goto(`${frontendUrl}${ruta}`, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - start;
      pageLoadMetrics.push({ ruta, loadTimeMs: loadTime });
      console.log(`  ✓ Página cargada en ${loadTime}ms`);
      
      visitedPages.push(ruta);

      // A11y Snapshot
      const snapshot = await page.accessibility.snapshot();
      if (snapshot) {
        // En una implementación real validaríamos roles o contrastes; aquí solo guardamos el árbol
        a11yIssues.push({ ruta, a11yNodesCount: countA11yNodes(snapshot) });
      }

      await tomarCaptura(`spider-${ruta.replace(/\//g, '-')}`);

      // Agresividad: Interacción con formularios
      if (qaLabAgresividad === 'media' || qaLabAgresividad === 'extrema') {
        await interactuarConFormularios(page, qaLabAgresividad);
      }

    } catch (err) {
      console.log(`  ❌ Error al visitar ${ruta}: ${err.message}`);
      consoleErrors.push(`[VISIT_ERROR] ${ruta} - ${err.message}`);
    }
  }

  // Generar Reporte de Salud
  const healthReport = {
    agresividad: qaLabAgresividad,
    rutas_evaluadas: rutasACrawlear,
    paginas_visitadas: visitedPages,
    metricas_performance: pageLoadMetrics,
    errores_consola: consoleErrors,
    errores_red: networkErrors,
    a11y_snapshots: a11yIssues,
    capturas,
    fecha: new Date().toISOString()
  };

  const evidenciaPath = join(outputDir, 'qa-lab-spider-report.json');
  await writeFile(evidenciaPath, JSON.stringify(healthReport, null, 2), 'utf8');

  console.log('\n===JSON_REPORT_START===');
  console.log(JSON.stringify(healthReport));
  console.log('===JSON_REPORT_END===\n');

  console.log(`\n✅ Spider completado. Informe de salud guardado en ${evidenciaPath}`);

} catch (error) {
  if (page) await tomarCaptura('99-error-fatal').catch(() => undefined);
  console.error('\n❌ QA Lab Spider: Error fatal');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  await mongoose.disconnect().catch(() => undefined);
}

// ─── Funciones Específicas del Spider ──────────────────────────────────────

function countA11yNodes(node) {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countA11yNodes(child);
    }
  }
  return count;
}

async function interactuarConFormularios(page, agresividad) {
  const inputs = page.locator('input:not([type="hidden"]):not([readonly])');
  const count = await inputs.count();
  
  if (count > 0) {
    console.log(`  → Encontrados ${count} inputs. Aplicando agresividad ${agresividad}...`);
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      try {
        if (await input.isVisible() && await input.isEnabled()) {
          const valor = generarDatoFuzz(agresividad);
          await input.fill(valor);
        }
      } catch (e) {
        // Ignorar inputs no interactuables
      }
    }
    // Opcional: Intentar enviar
    // const btnSubmit = page.locator('button[type="submit"]');
    // if (await btnSubmit.count() > 0) await btnSubmit.first().click();
  }
}

function generarDatoFuzz(agresividad) {
  if (agresividad === 'media') {
    return `fuzz-${Math.random().toString(36).substring(7)}`;
  } else if (agresividad === 'extrema') {
    const payloads = [
      "100000000000000",
      "-9999",
      "DROP TABLE usuarios;--",
      "<script>alert(1)</script>",
      "🙂👾🔥"
    ];
    return payloads[Math.floor(Math.random() * payloads.length)];
  }
  return "dato";
}

// ─── Funciones Comunes ─────────────────────────────────────────────────────

async function conectarMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5000 });
}

async function asegurarUsuario() {
  await mongoose.connection.collection('usuarios').updateOne(
    { correo },
    {
      $set: { correo, password_hash: crearPasswordHash(contrasena), updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

function crearPasswordHash(valor) {
  const iteraciones = 210_000;
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(valor, salt, iteraciones, 32, 'sha256').toString('base64url');
  return `pbkdf2$${iteraciones}$${salt}$${hash}`;
}

async function iniciarSesion() {
  await page.goto(`${frontendUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[aria-label="Correo electrónico"]').fill(correo);
  await page.locator('input[aria-label="Contraseña"]').fill(contrasena);
  
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
    page.locator('button[type="submit"]').click(),
  ]);

  if (!response.ok()) throw new Error('Login falló');
  await page.waitForURL(/\/inicio(?:$|[?#])/, { timeout: 30_000 });
}

async function tomarCaptura(nombre) {
  // Manejar nombres con slash u otros caracteres raros
  const safeName = nombre.replace(/[^a-z0-9._-]+/gi, '-');
  const destino = join(outputDir, `${safeName}.png`);
  await page.screenshot({ path: destino, fullPage: true });
  capturas.push(destino);
  return destino;
}

function detectarNavegador({ forzarChrome: soloChrome = false } = {}) {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const winChrome = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return winChrome.find(p => p && existsSync(p));
}
