/**
 * run-qa-mutacion.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Runner de QA Lab para Mutación de datos en el cálculo de impuestos.
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

const qaLabDataset = process.env.QA_LAB_DATASET ?? 'DS-COM-0826';
const qaLabEstrategia = process.env.QA_LAB_ESTRATEGIA ?? 'incrementales';
const qaLabVariacion = Number(process.env.QA_LAB_VARIACION ?? 10);

const outputDir = resolve(repoRoot, 'outputs/playwright/qa-lab-mutacion');
const timeoutMs = Number(process.env.AUDITORIA_PLAYWRIGHT_TIMEOUT_MS ?? 90_000);

const modoDemo = process.argv.includes('--demo') || process.env.AUDITORIA_PLAYWRIGHT_DEMO === 'true';
const forzarChrome = process.argv.includes('--chrome') || process.env.PLAYWRIGHT_BROWSER === 'chrome';
const headedFlag = process.argv.includes('--headed');
// Usar headless: false por defecto ya que son visuales
const headless = (modoDemo || headedFlag) ? false : (process.env.PLAYWRIGHT_HEADLESS === 'true');
const slowMoMs = Number(process.env.PLAYWRIGHT_SLOWMO_MS ?? (modoDemo ? 900 : (headless ? 0 : 50)));

const capturas = [];
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

  await iniciarSesion();
  await tomarCaptura('00-inicio-mutacion');

  console.log(`\n▶ Iniciando Lab de Mutación... Estrategia: ${qaLabEstrategia}, Dataset: ${qaLabDataset}`);
  
  // Buscar casos en MongoDB
  const qacasoSchema = new mongoose.Schema({}, { strict: false, collection: 'qacasos' });
  const QaCaso = mongoose.models.QaCaso || mongoose.model('QaCaso', qacasoSchema);
  let casos = await QaCaso.find({ dataset: qaLabDataset }).lean();
  
  if (casos.length === 0) {
    console.log('⚠️ No se encontraron casos en BD. Usando casos MOCK para el Lab.');
    casos = [
      { codigo: 'C-01', entrada: { sueldo_basico: 600000, deducciones: 15000 } },
      { codigo: 'C-02', entrada: { sueldo_basico: 1200000, deducciones: 0 } }
    ];
  }

  const resultados = [];

  // Navegar a la pantalla de Análisis (pantalla-1)
  console.log('  → Navegando a /qa/pantalla-1 (Análisis)...');
  await page.goto(`${frontendUrl}/qa/pantalla-1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  for (const caso of casos) {
    console.log(`\n⚙️  Procesando caso original: ${caso.codigo}`);
    const mutaciones = generarMutaciones(caso, qaLabEstrategia, qaLabVariacion);
    
    for (const [idx, mutacion] of mutaciones.entries()) {
      console.log(`   🧬 Mutación ${idx + 1}: ${mutacion.descMutacion}`);
      
      // Interceptar la carga de casos para inyectar la mutación
      await page.route(`**/api/qa/casos**`, async route => {
        if (route.request().method() === 'GET') {
          // Devolver el caso mutado simulando que es el único caso en la BD
          const casoMutado = {
            id: caso.codigo,
            dataset_codigo: caso.dataset || qaLabDataset,
            periodo: '06/2026',
            descripcion: `MUTADO: ${mutacion.descMutacion}`,
            contexto: {
              empleado: { legajo: '999', nombre: 'Mutación', cuil: '20-99999999-9' },
              liquidacion: {
                remuneracion_bruta: mutacion.entrada?.sueldo_basico || 0,
                deducciones: mutacion.entrada?.deducciones || 0
              }
            },
            resultado_esperado: {
              campo: 'calculo.retencion_calculada',
              valor: 0,
              tolerancia: 0.05,
              estado: 'observado'
            }
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([casoMutado])
          });
        } else {
          await route.continue();
        }
      });

      // Recargar la pantalla para limpiar el estado y cargar el interceptor
      await page.goto(`${frontendUrl}/qa/pantalla-1`, { waitUntil: 'networkidle' });
      
      // Hacer clic en el caso en la lista para que se cargue en el formulario
      const casoBtn = page.locator('.caso-main').first();
      if (await casoBtn.isVisible()) {
        await casoBtn.click();
        await page.waitForTimeout(800); // Dar tiempo a la animación de UI (y para el modo demo)
      } else {
        console.log('   ⚠️ No se encontró el botón del caso en la UI');
      }
      
      await tomarCaptura(`mutacion-${caso.codigo}-mut-${idx}`);
      
      resultados.push({
        caso_original: caso.codigo,
        mutacion: mutacion.descMutacion,
        datos_inyectados: mutacion.entrada,
        estado: 'completado'
      });
      
      // Limpiar rutas para el próximo ciclo
      await page.unroute(`**/api/qa/casos**`);
    }
  }

  // Guardar evidencia JSON
  const evidenciaPath = join(outputDir, 'qa-lab-mutacion-summary.json');
  const summaryObj = {
    estrategia: qaLabEstrategia,
    variacion: qaLabVariacion,
    dataset: qaLabDataset,
    resultados,
    capturas,
    fecha: new Date().toISOString()
  };
  
  await writeFile(evidenciaPath, JSON.stringify(summaryObj, null, 2), 'utf8');

  console.log('\n===JSON_REPORT_START===');
  console.log(JSON.stringify(summaryObj));
  console.log('===JSON_REPORT_END===\n');

  console.log(`\n✅ Mutación completada. Resumen en ${evidenciaPath}`);

} catch (error) {
  if (page) await tomarCaptura('99-error-fatal').catch(() => undefined);
  console.error('\n❌ QA Lab Mutación: Error fatal');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  await mongoose.disconnect().catch(() => undefined);
}

// ─── Generación de Mutaciones ──────────────────────────────────────────────

function generarMutaciones(caso, estrategia, variacion) {
  const mutaciones = [];
  const entradas = Object.entries(caso.entrada || {});
  
  if (estrategia === 'extremos') {
    entradas.forEach(([key, val]) => {
      if (typeof val === 'number') {
        mutaciones.push({ ...caso, entrada: { ...caso.entrada, [key]: 0 }, descMutacion: `${key} a 0` });
        mutaciones.push({ ...caso, entrada: { ...caso.entrada, [key]: -val }, descMutacion: `${key} a negativo` });
        mutaciones.push({ ...caso, entrada: { ...caso.entrada, [key]: val * 1000 }, descMutacion: `${key} a valor muy alto` });
      }
    });
  } else if (estrategia === 'incrementales') {
    entradas.forEach(([key, val]) => {
      if (typeof val === 'number') {
        mutaciones.push({ ...caso, entrada: { ...caso.entrada, [key]: val * (1 + variacion / 100) }, descMutacion: `${key} +${variacion}%` });
        mutaciones.push({ ...caso, entrada: { ...caso.entrada, [key]: val * (1 - variacion / 100) }, descMutacion: `${key} -${variacion}%` });
      }
    });
  } else if (estrategia === 'combinatoria') {
    const numKeys = entradas.filter(e => typeof e[1] === 'number').map(e => e[0]);
    if (numKeys.length >= 2) {
      mutaciones.push({ 
        ...caso, 
        entrada: { ...caso.entrada, [numKeys[0]]: 0, [numKeys[1]]: 9999999 },
        descMutacion: `Cruce: ${numKeys[0]}=0, ${numKeys[1]}=MAX` 
      });
    }
  }
  return mutaciones.length > 0 ? mutaciones : [{ ...caso, descMutacion: 'Sin campos numéricos para mutar' }];
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
      $set: {
        correo,
        password_hash: crearPasswordHash(contrasena),
        updatedAt: new Date(),
      },
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
  const destino = join(outputDir, `${nombre.replace(/[^a-z0-9._-]+/gi, '-')}.png`);
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
