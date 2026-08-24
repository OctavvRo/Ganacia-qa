import { test, expect } from '@playwright/test';

test.describe('Gobernanza QA (Suite de Regresión) - Pantalla 2', () => {

  // Configuración de la ruta base, apuntamos al frontend de Angular asumiendo localhost:4200
  // Para que esto funcione, la aplicación de angular debe estar corriendo
  test.beforeEach(async ({ page }) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4200',
      'Access-Control-Allow-Credentials': 'true'
    };

    // Interceptar llamadas al backend de autenticación para simular login exitoso
    await page.route('**/auth/login', route => route.fulfill({
      status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify({ usuario: { id: '1', correo: 'test@test.com' } })
    }));
    await page.route('**/auth/me', route => route.fulfill({
      status: 200, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify({ usuario: { id: '1', correo: 'test@test.com' } })
    }));

    // Primero, iniciamos sesión para evadir el AuthGuard
    await page.goto('http://127.0.0.1:4200/login');
    await page.getByPlaceholder('Correo electrónico').fill('test@test.com');
    await page.getByPlaceholder('Contraseña').fill('123456');
    await page.getByRole('button', { name: /Iniciar sesión|Ingresando/i }).click();
    await page.waitForURL('**/inicio');

    // Navegamos directamente a la ruta donde se aisló el componente
    await page.goto('http://127.0.0.1:4200/qa/pantalla-2');
  });

  test('Prueba 1: Navegación del State Machine y Visualización de Datasets', async ({ page }) => {
    // Aserción 1: Verificar que el título renderiza
    await expect(page.getByRole('heading', { name: 'Gestión de Datasets' })).toBeVisible();
    
    // Validamos que se muestre la tabla de Datasets
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Aserción 2: Cambiar de vista usando el state machine
    const btnRegresion = page.getByRole('button', { name: 'Regresión' });
    await btnRegresion.click();

    // Validar el cambio renderizando el nuevo título sin modificar la URL
    await expect(page.getByRole('heading', { name: 'Ejecutar Suite de Regresión' })).toBeVisible();
    expect(page.url()).toContain('/qa/pantalla-2'); // La URL no debe cambiar
  });

  test('Prueba 2: Creación de un Nuevo Dataset', async ({ page }) => {
    // Acción 1: Hacer clic en "Nuevo Dataset"
    await page.getByRole('button', { name: 'Nuevo Dataset' }).click();

    // Aserción 1: Verificar mensaje informativo "Dataset anterior detectado"
    await expect(page.getByRole('heading', { name: 'Nuevo Dataset' })).toBeVisible();
    await expect(page.getByText('Dataset anterior detectado: DS-COM-0826')).toBeVisible();

    // Acción 2: Llenar el formulario
    await page.getByLabel('Convenio').click();
    await page.getByRole('option', { name: 'UOCRA (76/22)' }).click();
    
    await page.getByLabel('Período').fill('2026-09');
    await page.getByLabel('Vigencia Desde').fill('2026-09');

    // Aserción 2 (Integridad del Formulario): El botón guardar debe estar habilitado
    const btnGuardar = page.getByRole('button', { name: 'Guardar Dataset' });
    await expect(btnGuardar).toBeEnabled();

    // Acción 3: Guardar el formulario
    await btnGuardar.click();

    // Aserción 3: Verificar que la vista regresa al listado original
    await expect(page.getByRole('heading', { name: 'Gestión de Datasets' })).toBeVisible();
  });

  test('Prueba 3: Ejecución de Nueva Corrida (Wizard)', async ({ page }) => {
    // Navegar a Regresión
    await page.getByRole('button', { name: 'Regresión' }).click();

    // Paso 1: Seleccionar Dataset Base
    await page.getByTestId('select-ds-base').click({ force: true });
    // Como los datos son asíncronos y están mockeados, esperamos que la opción renderice
    await page.getByRole('option', { name: 'DS-COM-0726' }).first().click();

    // Paso 2: Seleccionar el MISMO Dataset
    await page.getByTestId('select-ds-nuevo').click({ force: true });
    await page.getByRole('option', { name: 'DS-COM-0726' }).first().click();

    // Aserción 1: Debe aparecer el mensaje de advertencia y el botón estar deshabilitado
    await expect(page.getByText('Estás seleccionando el mismo dataset para ambas bases')).toBeVisible();
    const btnEjecutar = page.getByRole('button', { name: 'Ejecutar Regresión' });
    await expect(btnEjecutar).toBeDisabled();

    // Acción 2: Cambiar el Dataset del Paso 2
    await page.getByTestId('select-ds-nuevo').click({ force: true });
    await page.getByRole('option', { name: 'DS-COM-0826' }).first().click();

    // Aserción 2: El botón ahora se habilita
    await expect(btnEjecutar).toBeEnabled();

    // Acción 3: Ejecutar la regresión
    await btnEjecutar.click();

    // Aserción 3: Validar el paso a Resultados
    await expect(page.getByRole('heading', { name: 'Resultados: RUN-NEW' })).toBeVisible();
    await expect(page.getByText('Casos Totales')).toBeVisible();
    await expect(page.getByText('45', { exact: true })).toBeVisible();
  });

  test('Prueba 4: Visualización de Diferencias (Diff) en Resultados', async ({ page }) => {
    // Navegar directamente a la vista renderizando Regresión -> Ejecutar
    await page.getByRole('button', { name: 'Regresión' }).click();
    await page.getByTestId('select-ds-base').click({ force: true });
    await page.getByRole('option', { name: 'DS-COM-0726' }).first().click();
    await page.getByTestId('select-ds-nuevo').click({ force: true });
    await page.getByRole('option', { name: 'DS-COM-0826' }).first().click();
    await page.getByRole('button', { name: 'Ejecutar Regresión' }).click();

    // Aserción de la prueba
    // Acción 1: Filtrar por "Fallos Regresión"
    const kpiFail = page.locator('.kpi-card', { hasText: 'Fallos Regresión' });
    await kpiFail.click();

    // Aserción 1: El listado debe contener el badge de fallo de regresión (case-insensitive)
    await expect(page.locator('.panel-resultado').first()).toContainText(/fail regresion/i);

    // Acción 2: Desplegar el acordeón del caso C-15
    await page.getByText('C-15').click();

    // Aserción 2: Validar renderización del diff JSON
    await expect(page.getByText('Resultado Esperado (Dataset Base)')).toBeVisible();
    await expect(page.getByText('Resultado Real (Dataset Validado)')).toBeVisible();
    
    // Verificamos el contenido en el diff para hs_extras_exentas (50000 esperado vs 45000 real)
    const expectedCol = page.locator('.diff-columna.esperado');
    const realCol = page.locator('.diff-columna.real');
    
    await expect(expectedCol).toContainText('50000');
    await expect(realCol).toContainText('45000');
  });

});
