# Validacion MongoDB local

Esta guia sirve para cerrar la verificacion pendiente de la migracion: confirmar que `backend-node` persiste snapshots reales en MongoDB y que el historial puede recuperarlos.

El sistema Python/React actual debe permanecer disponible como rollback hasta completar este checklist.

## Objetivo de la prueba

Validar con MongoDB real que:

- `backend-node` se conecta usando `MONGODB_URI`;
- se puede crear un snapshot en `analisis_snapshots`;
- el snapshot se puede leer desde MongoDB;
- el documento conserva campos principales de auditoria;
- el test de validacion limpia el documento de prueba;
- luego la aplicacion puede cargar un Excel real, guardar el analisis y recuperarlo desde el historial.

## Comandos base del backend Node

Desde la raiz del proyecto:

```powershell
cd backend-node
nvm use 18.14.0
npm install
npm run build
npm run test
npm run test:golden
```

Para iniciar la API:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/auditoria_ganancias"
npm run start:dev
```

La API queda disponible, por defecto, en:

```text
http://localhost:3000
```

## Opcion A: MongoDB instalado localmente

### 1. Verificar si `mongod` esta instalado

```powershell
mongod --version
```

Si el comando no existe, instalar MongoDB Community Server y volver a probar.

### 2. Iniciar MongoDB

Si MongoDB esta instalado como servicio de Windows:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

Si se usa una terminal manual:

```powershell
mongod --dbpath C:\data\db
```

Crear la carpeta si no existe:

```powershell
New-Item -ItemType Directory -Force C:\data\db
```

### 3. Configurar `MONGODB_URI`

```powershell
cd backend-node
$env:MONGODB_URI="mongodb://127.0.0.1:27017/auditoria_ganancias"
```

### 4. Ejecutar validacion Mongo

```powershell
npm run test:mongo
```

Resultado esperado:

```text
PASS test/mongo/mongo-real.mongo-spec.ts
```

Si Mongo no esta disponible o la variable no esta configurada, el test debe fallar con un mensaje claro.

### 5. Correr backend y cargar un Excel

```powershell
npm run start:dev
```

Desde otra terminal se puede cargar un Excel por `curl`:

```powershell
curl.exe -X POST "http://localhost:3000/api/analisis/excel" `
  -F "archivo=@..\backend\examples\Review_Netser_Legajo_67_062026.xlsx"
```

Tambien puede cargarse desde Angular, usando la pantalla `Cargar Excel`.

### 6. Verificar snapshot creado

Con `mongosh`:

```powershell
mongosh "mongodb://127.0.0.1:27017/auditoria_ganancias"
```

Dentro de Mongo:

```javascript
db.analisis_snapshots.find({}, {
  cliente: 1,
  legajo: 1,
  periodo: 1,
  estado: 1,
  veredicto: 1,
  hash_archivo: 1,
  fecha_analisis: 1
}).sort({ fecha_analisis: -1 }).limit(5).pretty()
```

Debe aparecer el analisis cargado.

## Opcion B: MongoDB con Docker

### 1. Levantar MongoDB

```powershell
docker run --name auditoria-ganancias-mongo `
  -p 27017:27017 `
  -v auditoria_ganancias_mongo:/data/db `
  -d mongo:7
```

Si el contenedor ya existe:

```powershell
docker start auditoria-ganancias-mongo
```

### 2. Configurar URI

```powershell
cd backend-node
$env:MONGODB_URI="mongodb://127.0.0.1:27017/auditoria_ganancias"
```

### 3. Ejecutar tests de integracion

```powershell
npm run test:mongo
```

### 4. Levantar backend

```powershell
npm run start:dev
```

### 5. Cargar Excel y verificar historial

Cargar un archivo desde Angular o por `curl`:

```powershell
curl.exe -X POST "http://localhost:3000/api/analisis/excel" `
  -F "archivo=@..\backend\examples\Review_Marinaro_Legajo_1_062026.xlsx"
```

Luego verificar:

```powershell
curl.exe "http://localhost:3000/api/analisis"
```

Debe devolver el historial desde MongoDB.

## Opcion C: MongoDB Atlas

Usar la URI de Atlas en `MONGODB_URI`:

```powershell
$env:MONGODB_URI="mongodb+srv://USUARIO:CLAVE@cluster.mongodb.net/auditoria_ganancias?retryWrites=true&w=majority"
```

Advertencias:

- no commitear credenciales;
- no guardar la URI real en archivos versionados;
- usar variables de entorno o secretos del entorno de despliegue;
- restringir IPs permitidas en Atlas;
- usar un usuario con permisos acotados para QA;
- crear una base separada para pruebas, por ejemplo `auditoria_ganancias_qa`.

Luego ejecutar:

```powershell
cd backend-node
npm run test:mongo
npm run start:dev
```

## Validacion desde Angular

En otra terminal:

```powershell
cd frontend-angular
nvm use 18.14.0
npm install
npm run build
npm start
```

Abrir Angular, cargar un Excel y confirmar:

- pantalla `Analisis` muestra cliente, legajo, periodo, estado y diferencia;
- pantalla `Calculo` muestra resumen y detalle mensual;
- pantalla `Historial` recupera la ejecucion desde MongoDB;
- boton `Descargar JSON` devuelve el snapshot persistido.

## Criterio de aceptacion MongoDB

La validacion MongoDB se considera aprobada cuando:

- `npm run test:mongo` finaliza en verde;
- se carga al menos un Excel real desde Angular o `curl`;
- se confirma un documento en `analisis_snapshots`;
- `GET /api/analisis` recupera el historial desde Mongo;
- `GET /api/analisis/:id/json` descarga el JSON del analisis;
- Python/React siguen intactos como rollback.

