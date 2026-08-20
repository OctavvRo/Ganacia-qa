# Acta de aceptación técnica

Fecha: 2026-07-07.

## Verificaciones satisfactorias

- Backend Python: 89 pruebas aprobadas; continúa operativo.
- Frontend React: build Vite aprobado; continúa operativo.
- Backend NestJS: build aprobado con Node 18.14.0.
- Backend Node unitario: 6 pruebas aprobadas.
- Paridad golden: 6/6 Excel aprobados contra Python.
- API Node E2E: 2 pruebas aprobadas (`salud` y `version`).
- Angular 15: build aprobado con Node 18.14.0, hash `878b123cea42b36d`.
- Angular consume exclusivamente la API; no contiene fórmulas de Ganancias.
- Mongoose implementa snapshots inmutables e historial; la capa se prueba con modelos aislados.

## Paridad de casos

| Caso | Resultado Node |
|---|---|
| Netser 67 | CORRECTO, diferencia -0.01 |
| Marinaro 1 | CORRECTO, diferencia -0.01 |
| CasoPrueba 99 incorrecto | CON_ERRORES_CRITICOS, diferencia -1000.00 |
| CasoPrueba 99 correcto | CORRECTO, diferencia 0.00 |
| PruebaIntegral 303 | CORRECTO, diferencia 0.00 |
| CMuniz 180 | CON_HALLAZGOS_MENORES, diferencia -652835.15 |

## Condiciones de despliegue

La estación no dispone de un daemon MongoDB ni Docker. Antes del corte productivo se debe ejecutar la prueba integrada con MongoDB real siguiendo la guía local. Hasta entonces, Python/React deben conservarse como rollback, tal como pidió el criterio de migración segura.

Karma/Chrome Headless no pudo completar dentro del sandbox por bloqueo `spawn EPERM` de NGCC. Los tres specs Angular quedaron incluidos; el build estricto de producción sí aprobó TypeScript, templates, Material y Tailwind.
# Actualizacion de aceptacion tecnica de migracion

Fecha: 2026-07-08.

## Estado general

La migracion quedo implementada en carpetas nuevas, sin borrar ni reemplazar el sistema actual.

- Sistema actual Python/React: conservado como rollback y oraculo de paridad.
- Backend nuevo Node/NestJS/Mongoose: implementado en `backend-node`.
- Frontend nuevo Angular 15/Material/Tailwind: implementado en `frontend-angular`.
- MongoDB: implementado a nivel de modelos, persistencia y script de validacion; queda pendiente la ejecucion contra MongoDB real fuera del sandbox.

## Estado de Python/React

El sistema original permanece disponible.

| Componente | Resultado |
|---|---|
| Backend Python | `89 passed, 1 warning` |
| Frontend React | Build Vite aprobado |
| Uso como oraculo | Activo para comparar resultados golden |

No se modifico la logica tributaria Python durante el cierre de aceptacion.

## Estado de backend-node

Backend nuevo implementado con Node.js 18.14.x, NestJS, Mongoose, MongoDB por `MONGODB_URI`, `decimal.js`, lectura Excel, motor de auditoria, validaciones, detalle mensual, snapshot auditable y endpoints de analisis, historial, diagnosticos, configuracion, salud y version.

| Prueba | Resultado |
|---|---|
| `npm run build` | Aprobado |
| `npm run test` | Aprobado: 6 tests |
| `npm run test:golden` | Aprobado: paridad 6/6 |
| `npm run test:e2e` | Aprobado: salud/version |

## Estado de frontend-angular

Frontend nuevo implementado con Angular 15, Angular Material, Tailwind, pantallas principales, conexion a API Node, formato argentino de moneda y fechas, visualizacion de analisis/calculo/diagnosticos/historial y sin calculos tributarios en frontend.

| Prueba | Resultado |
|---|---|
| Build Angular con Node 18.14 | Aprobado |
| TypeScript/templates | Validados por build |
| Angular Material/Tailwind | Validados por build |

## Paridad golden

| Caso | Resultado esperado | Resultado Node |
|---|---:|---:|
| Netser 67 | CORRECTO, diferencia -0.01 | OK |
| Marinaro 1 | CORRECTO, diferencia -0.01 | OK |
| CasoPrueba 99 incorrecto | CON_ERRORES_CRITICOS, diferencia -1000.00 | OK |
| CasoPrueba 99 correcto | CORRECTO, diferencia 0.00 | OK |
| PruebaIntegral 303 | CORRECTO, diferencia 0.00 | OK |
| CMuniz 180 | CON_HALLAZGOS_MENORES, diferencia -652835.15 | OK |

Resultado: paridad 6/6.

## Limitaciones ambientales

En el sandbox actual no se pudo cerrar la validacion con MongoDB real porque no hay `mongod`, no hay Docker y no hay una instancia Atlas configurada para pruebas.

Karma/Chrome Headless no pudo ejecutar specs por bloqueo del sandbox (`spawn EPERM` / NGCC). El build Angular con Node 18.14 si valido TypeScript, templates, Material y Tailwind.

## Validacion MongoDB agregada

Se agrego:

```powershell
cd backend-node
npm run test:mongo
```

La prueba requiere `MONGODB_URI`, se conecta a MongoDB real, crea un snapshot de prueba en `analisis_snapshots`, lo lee, valida campos principales, elimina el snapshot de prueba y falla claramente si MongoDB no esta disponible.

La guia completa esta en `docs/validacion_mongodb_local.md`.

## Pendiente obligatorio antes del corte

Antes de aprobar produccion o reemplazar Python/React, ejecutar en una maquina local o entorno QA:

```powershell
cd backend-node
nvm use 18.14.0
npm install
npm run build
npm run test
npm run test:golden
$env:MONGODB_URI="mongodb://127.0.0.1:27017/auditoria_ganancias"
npm run test:mongo
npm run start:dev
```

Luego levantar Angular, cargar un Excel real, confirmar resultado en `Analisis`, revisar `Calculo`, confirmar `Historial` desde Mongo, descargar JSON y verificar el documento en `analisis_snapshots`.

## Criterio para aprobar corte

El corte queda aprobado solamente si `npm run test:mongo` termina verde, se carga un Excel desde Angular usando backend Node, se confirma snapshot persistido en MongoDB, el historial se recupera desde MongoDB, la descarga JSON funciona, los seis golden siguen en paridad 6/6 y Python/React quedan disponibles como rollback durante la ventana de estabilizacion.

## Matriz final de pruebas

| Area | Comando / accion | Estado |
|---|---|---|
| Python backend | `python -m pytest tests -q -p no:cacheprovider` | Aprobado |
| React actual | `npm run build` | Aprobado |
| Node backend build | `npm run build` | Aprobado |
| Node backend unit | `npm run test` | Aprobado |
| Node golden | `npm run test:golden` | Aprobado 6/6 |
| Node API E2E | `npm run test:e2e` | Aprobado |
| Angular build Node 18.14 | `npm run build` | Aprobado |
| Mongo real | `npm run test:mongo` | Pendiente por entorno |
| Angular contra Mongo real | Cargar Excel y revisar historial | Pendiente por entorno |
| Descarga JSON desde snapshot | Boton/API JSON | Pendiente por entorno |
