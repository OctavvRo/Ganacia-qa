# Backend Node · Auditoría de Ganancias

Migración NestJS/TypeScript del motor Python. Usa `decimal.js` para toda aritmética tributaria, SheetJS para lectura XLSX y Mongoose para snapshots inmutables.

## Requisitos

- Node.js 18.14.x (el `package.json` fija este contrato).
- MongoDB 6 o superior en `mongodb://localhost:27017/auditoria_ganancias`.

```powershell
Copy-Item .env.example .env
npm install
npm run build
npm test
npm run test:golden
npm run test:e2e
npm run start:dev
```

El backend escucha en `http://localhost:8001/api`. Los XLSX aceptados no requieren las once hojas del modelo extendido: el reporte actual de acumuladores produce `ANALISIS_BASICO` y los datos ausentes se explicitan.

## Explicaciones accionables con Gemini

La IA es opcional y corre solo del lado backend. No calcula impuestos, no cambia
veredictos y no inventa datos: recibe los hallazgos ya generados por el motor y
los redacta como instrucciones de revision para el usuario.

Variables:

```powershell
GEMINI_API_KEY=pegar_clave_local
GEMINI_MODEL=gemini-3.5-flash
GEMINI_TIMEOUT_MS=15000
```

Endpoint:

```http
POST /api/analisis/:id/explicacion-ia
```

Si no hay clave o Gemini falla, el backend devuelve una guia local deterministica
con campos, meses y hojas a revisar.

Los golden de `test/golden/` provienen del backend Python, que sigue siendo el
oraculo y rollback. No se deben regenerar sin aprobar el cambio en Python.

Los XLSX y JSON golden con datos reales no se versionan en repos publicos. Para
ejecutar paridad completa en un entorno interno, copiar los archivos autorizados
en `test/fixtures/` y `test/golden/`. Si no estan presentes, esos casos se
saltan automaticamente.
