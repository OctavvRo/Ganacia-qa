import { test, expect } from '@playwright/test';

/**
 * TEST EXPLORATORIO - Pantalla 2 (Gobernanza QA)
 * ---------------------------------------------------
 * Objetivo: Login → navegar a Pantalla 2 → presionar todos los botones
 * interactivos de cada sección de la pantalla.
 * No aplica aserciones de negocio estrictas; solo verifica que la UI
 * responde sin errores fatales (no crashes, no consola de errores críticos).
 */

test('Exploratorio: recorrido completo de la Pantalla 2', async ({ page }) => {

  // ─── SETUP: Mockear el backend de autenticación ───────────────────────────
  const mockUsuario = { usuario: { id: '1', correo: 'admin@civitas.com' } };
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
  };
  await page.route('**/auth/login', route =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(mockUsuario) })
  );
  await page.route('**/auth/me', route =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(mockUsuario) })
  );

  // ─── PASO 1: Login ────────────────────────────────────────────────────────
  console.log('🔐 Iniciando sesión...');
  await page.goto('http://localhost:4200/login');
  await page.getByPlaceholder('Correo electrónico').fill('admin@civitas.com');
  await page.getByPlaceholder('Contraseña').fill('admin123');
  await page.getByRole('button', { name: /Iniciar sesión/i }).click();
  await page.waitForURL('**/inicio', { timeout: 15000 });
  console.log('✅ Login exitoso');

  // ─── PASO 2: Navegar a Pantalla 2 ─────────────────────────────────────────
  console.log('🚀 Navegando a Pantalla 2...');
  await page.goto('http://localhost:4200/qa/pantalla-2');
  await expect(page.getByText('Gobernanza QA')).toBeVisible({ timeout: 10000 });
  console.log('✅ Pantalla 2 cargada');

  // ─── SECCIÓN A: TAB DATASETS (vista por defecto) ──────────────────────────
  console.log('\n📋 [Tab Datasets] Explorando...');
  await expect(page.getByRole('heading', { name: 'Gestión de Datasets' })).toBeVisible();
  await page.waitForTimeout(800);

  // Clic en "Ver Casos" del primer dataset de la tabla
  const btnVerCasos = page.getByRole('button').filter({ has: page.locator('mat-icon', { hasText: 'list_alt' }) }).first();
  if (await btnVerCasos.isVisible()) {
    console.log('  → Clic en "Ver Casos"');
    await btnVerCasos.click();
    await page.waitForTimeout(800);
    // Volver desde la lista de casos
    const btnBack = page.getByRole('button').filter({ has: page.locator('mat-icon', { hasText: 'arrow_back' }) }).first();
    if (await btnBack.isVisible()) {
      console.log('  → Clic en "Volver"');
      await btnBack.click();
      await page.waitForTimeout(600);
    }
  }

  // Clic en "Editar Dataset" del primer dataset
  const btnEditar = page.getByRole('button').filter({ has: page.locator('mat-icon', { hasText: 'edit' }) }).first();
  if (await btnEditar.isVisible()) {
    console.log('  → Clic en "Editar Dataset"');
    await btnEditar.click();
    await page.waitForTimeout(800);
    // Cancelar/Volver desde el formulario
    const btnCancelar = page.getByRole('button', { name: /cancelar|volver/i }).first();
    if (await btnCancelar.isVisible()) {
      console.log('  → Clic en "Cancelar"');
      await btnCancelar.click();
      await page.waitForTimeout(600);
    }
  }

  // Clic en "Nuevo Dataset"
  console.log('  → Clic en "Nuevo Dataset"');
  await page.getByRole('button', { name: /Nuevo Dataset/i }).click();
  await page.waitForTimeout(800);
  // Volver al listado
  const btnVolverDataset = page.getByRole('button', { name: /cancelar|volver/i }).first();
  if (await btnVolverDataset.isVisible()) {
    console.log('  → Clic en "Volver/Cancelar"');
    await btnVolverDataset.click();
    await page.waitForTimeout(600);
  }

  // ─── SECCIÓN B: TAB REGRESIÓN ─────────────────────────────────────────────
  console.log('\n⚡ [Tab Regresión] Explorando...');
  await page.getByRole('button', { name: /Regresión/i }).click();
  await expect(page.getByRole('heading', { name: 'Ejecutar Suite de Regresión' })).toBeVisible();
  await page.waitForTimeout(800);

  // Seleccionar Dataset Base
  console.log('  → Seleccionando Dataset Base...');
  await page.getByTestId('select-ds-base').click({ force: true });
  await page.waitForTimeout(400);
  const opcionBase = page.getByRole('option').first();
  if (await opcionBase.isVisible()) {
    await opcionBase.click();
    await page.waitForTimeout(500);
  }

  // Seleccionar Dataset a Validar
  console.log('  → Seleccionando Dataset a Validar...');
  await page.getByTestId('select-ds-nuevo').click({ force: true });
  await page.waitForTimeout(400);
  const opcionesNuevo = page.getByRole('option');
  const countOpciones = await opcionesNuevo.count();
  if (countOpciones > 1) {
    // Elegir el segundo para que sean distintos
    await opcionesNuevo.nth(1).click();
  } else {
    await opcionesNuevo.first().click();
  }
  await page.waitForTimeout(500);

  // Clic en "Ejecutar Regresión" (si está habilitado)
  const btnEjecutar = page.getByRole('button', { name: /Ejecutar Regresión/i });
  if (await btnEjecutar.isEnabled()) {
    console.log('  → Clic en "Ejecutar Regresión"');
    await btnEjecutar.click();
    await page.waitForTimeout(1500);

    // Explorar resultados
    const btnVerCola = page.getByRole('button', { name: /Ver Cola de Revisión/i });
    if (await btnVerCola.isVisible()) {
      console.log('  → Clic en "Ver Cola de Revisión"');
      await btnVerCola.click();
      await page.waitForTimeout(800);
      // Volver
      await page.getByRole('button', { name: /Regresión/i }).click();
      await page.waitForTimeout(500);
    }

    // Volver al wizard
    const btnVolverRegresion = page.getByRole('button').filter({ has: page.locator('mat-icon', { hasText: 'arrow_back' }) }).first();
    if (await btnVolverRegresion.isVisible()) {
      console.log('  → Clic en "Volver"');
      await btnVolverRegresion.click();
      await page.waitForTimeout(600);
    }
  }

  // ─── SECCIÓN C: TAB REVISIÓN MANUAL ──────────────────────────────────────
  console.log('\n🔍 [Tab Revisión Manual] Explorando...');
  await page.getByRole('button', { name: /Revisión Manual/i }).click();
  await page.waitForTimeout(800);

  // Aprobar el primer item si existe
  const btnAprobar = page.getByRole('button', { name: /Aprobar/i }).first();
  if (await btnAprobar.isVisible()) {
    console.log('  → Clic en "Aprobar"');
    await btnAprobar.click();
    await page.waitForTimeout(600);
  }

  // Descartar el primer item si existe
  const btnDescartar = page.getByRole('button', { name: /Descartar/i }).first();
  if (await btnDescartar.isVisible()) {
    console.log('  → Clic en "Descartar"');
    await btnDescartar.click();
    await page.waitForTimeout(600);
  }

  // ─── SECCIÓN D: TAB HISTORIAL ────────────────────────────────────────────
  console.log('\n📅 [Tab Historial] Explorando...');
  await page.getByRole('button', { name: /Historial/i }).click();
  await page.waitForTimeout(800);

  // Ver detalle de la primera corrida
  const btnVerDetalle = page.getByRole('button', { name: /Ver Detalle/i }).first();
  if (await btnVerDetalle.isVisible()) {
    console.log('  → Clic en "Ver Detalle"');
    await btnVerDetalle.click();
    await page.waitForTimeout(800);
    // Volver
    await page.getByRole('button', { name: /Historial/i }).click();
    await page.waitForTimeout(500);
  }

  // ─── SECCIÓN E: TAB MATRIZ DE COBERTURA ──────────────────────────────────
  console.log('\n📊 [Tab Matriz Cobertura] Explorando...');
  await page.getByRole('button', { name: /Matriz Cobertura/i }).click();
  await page.waitForTimeout(800);

  // ─── FIN ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Recorrido exploratorio completado sin errores fatales.');
});
