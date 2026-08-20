# Plan de migracion a Node.js, MongoDB y Angular

## 0. Proposito y regla de oro

Este documento define una migracion gradual y verificable del auditor actual de Ganancias de cuarta categoria. No autoriza una reescritura tributaria ni el retiro del sistema vigente.

La regla de oro es la paridad funcional: para una misma entrada XLSX, el backend Node.js debe producir los mismos importes, estados, validaciones, motivos y veredictos que el backend Python, con igualdad monetaria a centavos. Python sera el oraculo de referencia hasta completar la aceptacion final.

Durante la migracion conviviran cuatro aplicaciones:

```text
backend/           Python + FastAPI actual (oraculo)
frontend/          React + Vite actual
backend-node/      NestJS + MongoDB nuevo
frontend-angular/  Angular nuevo
```

No se debe borrar ni modificar de forma incompatible `backend/` o `frontend/` durante esta migracion.

## 1. Resumen del sistema actual

Nota de estado: este documento nacio como plan de migracion. El estado operativo
actual debe leerse junto con `docs/matriz_cumplimiento_specs.md`, donde se
detalla la cobertura V1-V21 vigente del backend Node.

El sistema actual es un MVP deterministico denominado `ANALISIS_BASICO`. Recibe un reporte `.xlsx`, identifica su tabla de acumuladores, normaliza conceptos e importes, valida la entrada, detecta la modalidad de SAC, aplica una escala Art. 94 de referencia, reconstruye el calculo acumulado, compara la retencion calculada con la informada y genera un reporte trazable con detalle mensual.

Caracteristicas comprobadas en el repositorio:

- Backend Python con FastAPI, `openpyxl`, `Decimal` y pytest.
- Frontend React 18, Vite, TypeScript y React Router.
- Sin base de datos: el backend no persiste analisis y el frontend conserva como maximo 25 ejecuciones en `localStorage`.
- API real para salud, version, carga de Excel y cuatro ejemplos.
- Salida publica JSON en `snake_case`.
- Snapshot generado al finalizar cada ejecucion, pero actualmente no persistido.
- Detalle mensual desde enero hasta el mes liquidado.
- V6, V8, V10 y V17 se ejecutan cuando corresponden a los datos disponibles.
- V1, V2, V3 y V9 se ejecutan cuando el reporte extendido informa los campos necesarios.
- El catalogo V1-V21 se invoca completo; lo no evaluable queda como `NO_EVALUADA` con dato faltante y fuente sugerida.
- El control historico de Tope LCT 35% se publica como `CTRL_TOPE_LCT_35`, no como V11 del spec.
- Escala Art. 94: referencia 2026 S1 tomada de `spec2` y escala 2026 S2 mensual acumulada tomada de `Tabla-Art-94-LIG-per-jul-a-dic-2026.pdf`; el propio codigo exige validacion normativa antes de produccion.
- La tabla actual tiene un solapamiento de `23.90` entre el maximo exclusivo del tramo 4 (`13500227.00`) y el minimo del tramo 5 (`13500203.10`). Python resuelve esa franja por orden y elige primero el tramo 4. La migracion debe congelar ese comportamiento para mantener paridad y abrir una decision normativa separada; no debe "corregirlo" silenciosamente.
- La base del MVP usa `ganancia_neta_fila35` del Excel. No es aun una liquidacion tributaria integral con SIRADIG, todos los topes y retencion neta.

### 1.1 Inventario revisado

Se revisaron:

- `backend/app`
- `backend/examples`
- `backend/tests`
- `backend/docs`
- `frontend/src`
- `README.md`

En `backend/docs` no estan versionados los dos specs originales ni el PDF v3. Existen `alcance_mvp.md`, `api_frontend.md` y `revision_especificacion_v3.md`, que resumen parte de esos documentos. La futura migracion debe incorporar las fuentes normativas originales al repositorio o registrar su hash y version antes de parametrizar MongoDB.

Tambien se detecto que `backend/examples` contiene cuatro libros, no cinco. Falta:

```text
backend/examples/Review_PruebaIntegral_Legajo_303_062026.xlsx
```

Ese archivo no debe fabricarse. Debe agregarse al corpus de paridad desde su fuente real antes de cerrar la fase de pruebas doradas.

## 2. Arquitectura actual de referencia historica

```text
React/Vite
  -> POST /api/analisis/excel
FastAPI
  -> archivo temporal
  -> lector XLSX
  -> normalizador
  -> validador de entrada
  -> detector SAC
  -> motor ANALISIS_BASICO + escala Art. 94
  -> V6/V8/V10 + control tecnico LCT informativo
  -> detalle mensual + snapshot + reporte JSON
  -> React
React
  -> localStorage (resultado actual e historial)
```

### 2.1 Endpoints existentes

| Metodo | Ruta | Funcion actual |
|---|---|---|
| GET | `/api/salud` | Estado y nombre del servicio. |
| GET | `/api/version` | Version `2.0.0`, tipo `ANALISIS_BASICO` y modo deterministico. |
| POST | `/api/analisis/excel` | Recibe multipart `archivo`, procesa el XLSX y devuelve el reporte completo sin todos los acumuladores. |
| GET | `/api/analisis/ejemplo/{nombre}` | Ejecuta `netser`, `marinaro`, `caso_correcto` o `caso_error`; es una ayuda de desarrollo. |

No existen endpoints de consulta por id, historial, borrado, descarga tecnica ni diagnosticos agregados.

### 2.2 Servicios Python y flujo real

1. `api.py`: rutas HTTP, CORS, version y ejemplos.
2. `adaptador_api.py`: valida la extension, sanea el nombre, guarda por bloques en un directorio UUID, llama al motor y elimina el temporal.
3. `principal.py`: orquestador para CLI y API.
4. `lector_excel.py`: abre con `openpyxl(data_only=True)`, puntua hojas, detecta encabezado por nombres de meses, lee conceptos sin depender de coordenadas fijas, infiere metadata desde el nombre y lee `total ingresos` lateral cuando existe.
5. `normalizador.py`: normaliza Unicode, aliases y numeros argentinos a `Decimal`.
6. `validador_entrada.py`: exige nueve filas y metadata minima; distingue faltantes requeridos y opcionales.
7. `detector_sac.py`: clasifica `percibido`, `devengado` o `indeterminado` usando tolerancia, ruido, provisiones semestrales y anulacion.
8. `motor_ganancias.py`: suma acumulados, toma `ganancia_neta_fila35`, busca tramo, aplica fijo mas porcentaje sobre excedente, resta retenciones anteriores y compara contra Excel.
9. `configuracion.py`: tolerancia y escala 2026 S1 documentada.
10. `validadores.py`: V6, V8, V10 y V11; V11 se excluye expresamente del veredicto.
11. `detalle_mensual.py`: vuelve a ejecutar el mismo motor para cada corte mensual y marca los meses anteriores como referencia informativa.
12. `generador_reporte.py`: contratos `analisis_completado`, `no_procesable` y `analisis_no_soportado`.
13. `snapshot_analisis.py`: foto autocontenida con resumen, precondiciones, nueve pasos, detalle y validaciones.
14. `explicador_local.py`: explicacion deterministica, sin IA.

### 2.3 Datos minimos actuales

Requeridos:

- `ganancia_neta_fila35`
- `retencion_practicada` (publicado como `retencion`)
- `impuesto_calculado`
- `porcentaje_aplicado` (publicado como `porcentaje`)
- `sac`
- `remuneraciones_con_aporte`
- `ganancia_no_imponible`
- `deduccion_especial`
- `doceava_parte_art30`

Opcionales recomendados: jubilacion, obra social, INSSJP, seguros, educacion, alquileres, donaciones y otras deducciones. Si faltan, el MVP permite procesar y los computa como cero, dejando advertencia.

### 2.4 Logica tributaria que se debe congelar

- Dinero con `Decimal` y redondeo `ROUND_HALF_UP` a `0.01`.
- Total usado: primero `total ingresos` del papel de trabajo si corresponde al mes; de otro modo, reconstruccion desde base y deducciones.
- Base: valor del mes de `ganancia_neta_fila35`.
- Impuesto: `importe_fijo + (base - minimo) * porcentaje / 100`.
- Retencion del mes: impuesto determinado acumulado menos retenciones anteriores.
- Diferencia: retencion calculada menos retencion informada.
- Limites de tramo: minimo inclusivo y maximo exclusivo; ultimo maximo abierto.
- V10 decide error critico segun la tolerancia configurada.
- V11 usa solo la remuneracion con aporte del mes liquidado como bruto mensual confiable; es informativa y no cambia retencion ni veredicto.
- Los meses anteriores al liquidado son reconstrucciones informativas; solo el mes liquidado define el resultado final.

### 2.5 Contrato JSON consumido por React

El frontend tipa y usa, entre otros:

- `estado`, `tipo_analisis`, `metadata`
- `analisis_sac`
- `calculo`, composicion de ingresos y tramo
- `contexto_normativo`
- `detalle_mensual`
- `validaciones`
- `veredicto`
- `snapshot`
- faltantes, advertencias y motivos para resultados alternativos

Decision de compatibilidad: el primer backend NestJS debe mantener este contrato `snake_case`. Los documentos MongoDB pueden usar `camelCase`, pero un mapper de salida debe conservar la API actual. Una API `v2` en `camelCase` solo se evaluara despues de lograr paridad y no forma parte del primer corte.

### 2.6 Pantallas React y datos mostrados

| Pantalla | Datos/acciones actuales |
|---|---|
| Inicio | KPIs construidos desde historial local, analisis recientes y resumen operativo. |
| Cargar Excel | Selector `.xlsx`, envio real al backend, ayuda de formato y subidas recientes locales. |
| Analisis | Cliente, legajo, periodo, estado, modalidad SAC, base, retenciones, diferencia, snapshot, validaciones, explicacion y descarga JSON. |
| Calculo | Pasos del motor, cadena acumulada, composicion de ingresos, tramo Art. 94, retencion, V11, resumen mensual y acordeones mensuales. |
| Diagnosticos | Filtros visuales, KPIs locales, hallazgos y limitaciones del ultimo resultado. No hay agregacion de servidor. |
| Historial | Busqueda/filtros, exportar, ver, descargar, repetir y eliminar sobre `localStorage`. |
| Configuracion | Tolerancia, escala, tipo, version y estado operativo; es principalmente informativa. |

El codigo aun incluye archivos `mock*.ts`, pero el flujo principal de carga y analisis usa la API real. En Angular no se migraran mocks como fuente operativa.

## 3. Arquitectura destino

Se elige **NestJS con TypeScript**. Su estructura por modulos, inyeccion de dependencias, DTOs, pipes, filtros, testing con Supertest e integracion Mongoose reducen el riesgo de mezclar lectura, calculo y persistencia. Express puro seria mas liviano, pero exigiria construir manualmente esas fronteras en una migracion donde la trazabilidad es mas importante que el peso inicial.

```text
Angular
  -> API REST /api (puerto 8000)
NestJS
  -> AnalisisApplicationService (orquestacion)
     -> ExcelModule
     -> NormalizacionModule
     -> MotorGananciasModule
        -> SAC
        -> Escala Art. 94 versionada
        -> calculo Decimal
        -> validaciones
        -> detalle mensual
        -> snapshot
     -> PersistenciaModule
        -> MongoDB/Mongoose
        -> GridFS para XLSX original
MongoDB
  -> snapshots inmutables
  -> archivos y hashes
  -> clientes/legajos
  -> escalas y parametros versionados
```

### 3.1 Estructura propuesta

```text
backend-node/
  src/
    main.ts
    app.module.ts
    config/
    common/
      decimal/
      filters/
      pipes/
      mappers/
    modules/
      analisis/
        analisis.controller.ts
        analisis.service.ts
        dto/
        schemas/
      archivos/
      excel/
      normalizacion/
      motor-ganancias/
        motor-ganancias.service.ts
        escala-art94.service.ts
        detector-sac.service.ts
        validaciones.service.ts
        detalle-mensual.service.ts
        snapshot.service.ts
      historial/
      diagnosticos/
      normativa/
  test/
    fixtures/
    golden/
  package.json
  tsconfig.json
  .env.example
```

Dependencias candidatas: NestJS, Mongoose, `decimal.js`, `class-validator`, `class-transformer`, Multer, crypto nativo y una libreria XLSX seleccionada mediante prueba de paridad. `exceljs` es la primera opcion, pero debe comprobarse que preserve resultados cacheados de formulas igual que `openpyxl(data_only=True)`; Node no debe recalcular formulas tributarias.

## 4. Mapeo Python a Node.js

| Python actual | NestJS destino | Regla de migracion |
|---|---|---|
| `api.py` | controladores de analisis, salud y version | Mismos codigos HTTP y contrato inicial. |
| `adaptador_api.py` | interceptor/pipeline de upload + `ArchivoService` | Limites de tamano, nombre seguro, hash SHA-256 y limpieza garantizada. |
| `principal.py` | `AnalisisService` de aplicacion | Orquestacion, sin formulas dentro del controlador. |
| `lector_excel.py` | `LectorExcelService` | Deteccion dinamica de hoja/encabezados y lectura de valores cacheados. |
| `normalizador.py` | `NormalizadorAcumuladoresService` | Tabla unica de aliases y parser argentino probado. |
| `validador_entrada.py` | `ValidadorEntradaService` | Mismos requeridos, opcionales y motivos. |
| `detector_sac.py` | `DetectorSacService` | Mismos umbrales, ciclos, confianza y textos canonicos. |
| `configuracion.py` | `ConfigModule` + `NormativaModule` | Tolerancia por entorno; escala versionada en Mongo y seed controlado. |
| `motor_ganancias.py` | `MotorGananciasService` + `EscalaArt94Service` | `decimal.js`, mismo redondeo y mismos limites. |
| `validadores.py` | `ValidacionesService` | Validaciones ejecutables con datos reales y catalogo V1-V21 con `NO_EVALUADA` seguro. |
| `detalle_mensual.py` | `DetalleMensualService` | Reusar motor; nunca duplicar formulas por mes. |
| `generador_reporte.py` | `ReporteMapper` | Mantener `snake_case` y estados actuales. |
| `snapshot_analisis.py` | `SnapshotService` | Snapshot inmutable, versionado y persistido. |
| `explicador_local.py` | `ExplicadorDeterministicoService` | Sin IA y basado solo en resultados. |
| dataclasses de `modelos.py` | interfaces de dominio/objetos de valor | Separados de schemas Mongoose y DTOs HTTP. |

### 4.1 Precision monetaria

No se usara `number` de JavaScript para operaciones tributarias. El dominio utilizara `Decimal` de `decimal.js`; MongoDB almacenara importes como `Decimal128`; los mappers convertiran de manera explicita. Para conservar el contrato actual, la API podra emitir numeros JSON redondeados a dos decimales, pero las comparaciones doradas tambien validaran una representacion canonica decimal para detectar perdida de precision.

## 5. Mapeo React a Angular

| React actual | Angular destino |
|---|---|
| `Layout`, `Sidebar`, `Header` | `CoreLayoutComponent`, `SidebarComponent`, `HeaderComponent` |
| componentes `ui` | componentes standalone compartidos: card, badge, table, button, money-value, stepper |
| `AnalisisContext` | servicios con signals/observables; el historial real proviene de API, no de `localStorage` |
| `auditoriaService.ts` | `ApiService`, `AnalisisService`, `HistorialService`, `DiagnosticosService` |
| `Inicio.tsx` | `InicioPageComponent` |
| `CargarExcel.tsx` | `CargarExcelPageComponent` |
| `Analisis.tsx` | `AnalisisPageComponent` con ruta `/analisis/:id` |
| `Calculo.tsx` | `CalculoPageComponent` y `DetalleMensualComponent` |
| `Diagnosticos.tsx` | `DiagnosticosPageComponent` con metricas MongoDB |
| `Historial.tsx` | `HistorialPageComponent` paginado y filtrado por backend |
| `Configuracion.tsx` | `ConfiguracionPageComponent` informativa en el MVP |
| formateadores | pipes `MonedaArPipe`, `FechaHoraArPipe`, `PorcentajeArPipe` |

Angular solo enviara archivos, consultara snapshots, descargara JSON y renderizara. No tendra formulas de SAC, Art. 94, impuesto, retencion ni validaciones.

## 6. Modelo de datos MongoDB

### 6.1 Decisiones generales

- Snapshot inmutable: una ejecucion nunca se actualiza para reflejar una escala nueva.
- Cada snapshot referencia versiones exactas de motor, escala y parametros.
- El XLSX original se guarda en GridFS; `ArchivoProcesado` conserva metadata y hash. Esto evita el limite de 16 MB de un documento normal.
- `DetalleMensual` y `Validacion` son subdocumentos embebidos en el snapshot para preservar la foto exacta y permitir una lectura atomica.
- Escalas y parametros son colecciones versionadas, no configuraciones mutables sin historial.
- Idempotencia por indice compuesto `hashArchivo + motorVersion + escalaVersion + tipoAnalisis`. Un reanalisis deliberado podra usar una opcion explicita, no crear duplicados por doble clic.

### 6.2 `analisis_snapshots`

Campos principales:

```text
_id: ObjectId
origen: "AUDITORIA_EXCEL"
clienteId: ObjectId | null
legajoId: ObjectId | null
cliente: string
legajo: string
periodo: string (AAAA-MM)
archivoProcesadoId: ObjectId
archivoOrigen: string
hashArchivo: string (SHA-256)
fechaAnalisis: Date
motorVersion: string
escalaVersion: string
parametrosVersion: string
tipoAnalisis: "ANALISIS_BASICO"
modalidadSac: "DEVENGADO" | "PERCIBIDO" | "INDETERMINADO"
resumen: subdocumento con Decimal128
detalleMensual: DetalleMensual[]
validaciones: Validacion[]
contextoNormativo: objeto congelado
precondiciones: objeto
advertencias: string[]
pasosMotor: objeto[]
estado: string
veredicto: string
contratoVersion: string
```

`resumen` incluira al menos total de ingresos usado, deducciones personales, generales y Art. 30, base, impuesto, retenciones anteriores, retencion calculada, informada, diferencia y veredicto.

Indices:

- unico compuesto de idempotencia;
- `{ fechaAnalisis: -1 }`;
- `{ cliente: 1, legajo: 1, periodo: -1 }`;
- `{ estado: 1, fechaAnalisis: -1 }`;
- `{ veredicto: 1, fechaAnalisis: -1 }`.

### 6.3 `archivos_procesados`

```text
_id, nombreOriginal, nombreSeguro, hashSha256, mimeType, tamano,
gridFsFileId, fechaRecepcion, estadoProcesamiento, errorTecnico,
snapshotId, metadataInferida
```

El archivo se valida antes de persistir: extension, firma ZIP/XLSX, tamano, numero razonable de hojas/filas y nombre saneado. No se ejecutan macros ni formulas.

### 6.4 `DetalleMensual` embebido

Replica la evidencia actual: mes, nombre, acumulado usado, modalidad SAC, indicador de periodo auditado, datos de entrada, construccion de base, tramo, impuesto, retenciones, diferencia, estado, motivo, validaciones y veredicto informativo/final.

### 6.5 `Validacion` embebida

```text
codigo, estado, severidad, detalle, evidencia, esInformativa, afectaVeredicto
```

Para V11, `evidencia` conserva bruto mensual, tope 35 %, retencion calculada y excedente. V11 sigue sin afectar el veredicto hasta que exista soporte normativo y funcional expreso para retencion neta.

### 6.6 `escalas_art94`

```text
version, periodoFiscal, vigenciaDesde, vigenciaHasta, fuente,
hashFuente, estadoValidacion, esOficial, tramos[], activa, creadaEn
```

Cada tramo usa Decimal128 para minimo, maximo, fijo y porcentaje. Una escala usada por un snapshot no se edita: se crea una nueva version.

### 6.7 `parametros_normativos`

Parametros versionados por clave, valor tipado, unidad, vigencia, fuente, estado de validacion y version. Incluye tolerancia solo si se decide administrarla normativamente; la configuracion operativa conserva su propio origen.

### 6.8 `clientes` y `legajos`

`clientes`: nombre canonico, aliases, identificador externo opcional, activo y timestamps.

`legajos`: clienteId, numero como string para preservar ceros, aliases, activo y timestamps. Indice unico `{ clienteId, numero }`.

La inferencia desde nombre de archivo no debe crear silenciosamente identidades definitivas: se puede usar `upsert` con origen `INFERIDO_ARCHIVO` y conservar el valor original en el snapshot.

## 7. Endpoints destino

### 7.1 Compatibilidad y nuevos endpoints

| Metodo | Ruta | Resultado |
|---|---|---|
| GET | `/api/salud` | Salud de API y, opcionalmente, estado MongoDB. |
| GET | `/api/version` | Version de motor, analisis, contrato y escala activa. |
| POST | `/api/analisis/excel` | Procesa, persiste archivo/snapshot y devuelve el reporte completo mas `id`. |
| GET | `/api/analisis/:id` | Snapshot por id. |
| GET | `/api/analisis` | Historial paginado con filtros. |
| GET | `/api/analisis/:id/json` | Descarga JSON tecnico. |
| GET | `/api/diagnosticos/resumen` | KPIs agregados y limitaciones. |

Filtros de historial: `cliente`, `legajo`, `periodo`, `estado`, `veredicto`, `fechaDesde`, `fechaHasta`, `pagina` y `limite`. Orden predeterminado: fecha descendente.

El endpoint de ejemplos puede existir solo en desarrollo y pruebas. Nunca debe ser la fuente de casos especiales del motor.

### 7.2 Errores HTTP

- `400`: multipart, extension o parametros invalidos.
- `413`: archivo demasiado grande.
- `422`: XLSX legible pero incompatible/no procesable a nivel tecnico. Los resultados tributarios `no_procesable` siguen siendo respuestas de negocio exitosas si se pudo construir el reporte.
- `404`: snapshot inexistente.
- `409`: conflicto de idempotencia si la politica no devuelve el snapshot existente.
- `500`: error no controlado con `correlationId`, sin exponer rutas o stack.

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion obligatoria |
|---|---|---|
| IEEE-754 cambia centavos | Critico | `decimal.js`, Decimal128 y tests de redondeo/linderos. |
| Libreria Node lee formulas distinto a `data_only=True` | Critico | Spike con cinco XLSX, usar resultados cacheados y rechazar formulas sin resultado. |
| Aliases/Unicode divergen | Alto | Corpus de normalizacion compartido y golden tests. |
| Limites inclusivos de tramos cambian | Critico | Tests exactos en minimo, centavo anterior y maximo. |
| Solapamiento actual entre tramos 4 y 5 | Critico | Test de caracterizacion de la franja, paridad por orden y validacion normativa antes de cualquier correccion. |
| Mongo altera tipos/precision | Critico | Mapper explicito dominio-Mongoose-API y round-trip tests. |
| Persistir antes de completar deja datos huerfanos | Alto | Estado de procesamiento y transaccion/compensacion entre GridFS y snapshot. |
| Reintentos duplican historial | Medio | Hash, indice de idempotencia y respuesta estable. |
| Snapshot mutable pierde trazabilidad | Critico | Coleccion append-only y versiones congeladas. |
| Angular duplica reglas tributarias | Critico | Modelos de presentacion, pipes de formato y prohibicion revisada por tests/code review. |
| Cambiar nombres JSON rompe UI | Alto | Mantener `snake_case` en v1 y contract tests. |
| Specs originales no versionados | Alto | Incorporar fuente/hash antes de cargar normativa productiva. |
| Escala actual no oficial | Critico para produccion | Mantener advertencia y no promover a produccion sin validacion oficial. |
| PruebaIntegral falta en examples | Alto para aceptacion | Agregar archivo real al corpus antes de gate de paridad. |
| Historial local y Mongo conviven | Medio | Durante transicion, Angular usa Mongo y React sigue local; no fusionar datos implicitamente. |

## 9. Plan por fases con gates

No se avanza si una fase no compila, no pasa sus tests o tiene diferencias no explicadas.

### Fase 0 - Congelar el oraculo Python

- Ejecutar todos los tests Python.
- Generar JSON completos canonicos de los cinco casos.
- Eliminar del diff solo campos no deterministas: id, ruta temporal y fecha.
- Registrar hashes SHA-256 de XLSX, JSON, specs y escala.
- Agregar el archivo real de PruebaIntegral al corpus si se autoriza y esta disponible.

Gate: pytest verde y baselines revisados manualmente.

### Fase 1 - Esqueleto NestJS

- Crear `backend-node` con configuracion estricta de TypeScript.
- Salud, version, manejo de errores, logs con correlacion y `.env.example`.
- Conectar MongoDB sin portar aun el calculo.

Gate: build, unit tests y prueba de conexion controlada.

### Fase 2 - Lectura y normalizacion XLSX

- Portar deteccion de hoja, encabezados, metadata, papel de trabajo, aliases y parser numerico.
- Validar limites y seguridad del archivo.
- Comparar el modelo normalizado contra Python para cada fixture.

Gate: igualdad estructural de metadata, conceptos y valores mensuales.

### Fase 3 - Entrada y SAC

- Portar requeridos/opcionales y estados de procesabilidad.
- Portar detector SAC con tolerancias identicas.

Gate: mismos estados, confianza, motivos y advertencias en tests sinteticos y reales.

### Fase 4 - Escala y motor

- Implementar objetos Decimal y redondeo comercial.
- Sembrar la escala de referencia con version y procedencia.
- Portar construccion de base, tramo, impuesto, retenciones y diferencia.

Gate: igualdad centavo a centavo y mismos errores de escala.

### Fase 5 - Validaciones, detalle y snapshot

- Portar validaciones ejecutables y catalogo V1-V21.
- Mantener el tope LCT como control tecnico informativo separado de V11.
- Portar detalle mensual, estados de referencia y snapshot.
- Mantener textos/estados o documentar cualquier cambio de contrato antes de aplicarlo.

Gate: JSON canonico de Node igual al de Python en campos funcionales.

### Fase 6 - Persistencia e historial

- Implementar schemas, GridFS, hash, idempotencia y snapshots inmutables.
- Implementar consulta por id, listado filtrado, descarga y diagnosticos.

Gate: tests con MongoDB efimero, round-trip Decimal128 y endpoints con Supertest.

### Fase 7 - Esqueleto Angular y sistema visual

- Crear `frontend-angular` con rutas, layout, tokens y componentes reutilizables.
- Implementar servicios HTTP y modelos, aun sin retirar React.

Gate: build Angular y pruebas de componentes base.

### Fase 8 - Pantallas Angular

- Migrar Inicio, Carga, Analisis, Calculo/Detalle mensual, Diagnosticos, Historial y Configuracion.
- Historial y KPIs deben provenir de MongoDB.
- No portar calculos tributarios al cliente.

Gate: build, pruebas de servicios/componentes y revision visual comparativa.

### Fase 9 - Integracion y ejecucion en sombra

- Angular contra NestJS.
- Ejecutar cada XLSX en Python y Node en paralelo.
- Comparar salidas canonicas y revisar visualmente las pantallas.
- Probar errores: extension, libro incompatible, faltantes, escala ausente y caida Mongo.

Gate: cero diferencias funcionales no aprobadas.

### Fase 10 - Preparacion de corte

- Documentar instalacion, backup, restauracion, observabilidad y rollback.
- Mantener Python/React disponibles durante un periodo acordado.
- Retirar lo viejo solo mediante una decision posterior y explicita.

## 10. Estrategia de pruebas

### 10.1 Backend Node

- Unitarias: normalizacion, parseo, SAC, tramos, redondeo, motor, validaciones ejecutables, catalogo V1-V21, reporte y snapshot.
- Limites: cada minimo/maximo de tramo, cero, negativos, centavo y tolerancia.
- Integracion: XLSX reales, MongoDB efimero, GridFS, idempotencia y round-trip Decimal128.
- API: salud, version, upload, consulta, listado, filtros, descarga y errores.
- Seguridad: nombre con ruta, archivo falso, tamano, libro corrupto y doble upload.
- Golden/paridad: comparador Python-Node sobre JSON canonico.

Comando esperado:

```bash
cd backend-node
npm run test
```

### 10.2 Frontend Angular

- Unitarias: pipes argentinos, badges, estados y componentes de detalle.
- Servicios: contratos HTTP y errores.
- Integracion: upload y navegacion a `/analisis/:id`.
- E2E: cargar Excel, ver analisis, calculo, mes liquidado, diagnosticos, historial y descargar JSON.
- Regla arquitectonica: ningun servicio/componente contiene tablas Art. 94 ni formulas tributarias.

```bash
cd frontend-angular
npm run build
npm run test
```

### 10.3 Matriz minima de paridad

| Caso | Veredicto esperado | Diferencia esperada |
|---|---|---:|
| Netser | `CORRECTO` | `-0.01` aprox. |
| Marinaro | `CORRECTO` | `-0.01` aprox. |
| CasoPrueba incorrecto | `CON_ERRORES_CRITICOS` | `-1000.00` |
| CasoPrueba correcto | `CORRECTO` | `0.00` |
| PruebaIntegral | `CORRECTO`, SAC percibido | `0.00` |

Para PruebaIntegral tambien se validan legajo `303`, periodo `06/2026` y ambas retenciones en `3444360.79`.

La expresion “aproximada” describe el resultado de negocio ya esperado; no habilita tolerancias adicionales entre Python y Node. La migracion debe reproducir exactamente el mismo valor serializado por Python.

## 11. Criterios de aceptacion

La migracion se considera completa solo si:

1. `backend-node` levanta en el puerto 8000 y reporta salud/version.
2. `frontend-angular` compila y levanta.
3. Angular sube un XLSX real a NestJS.
4. NestJS procesa dinamicamente sin ramas por cliente o archivo.
5. MongoDB conserva el XLSX, su hash y un snapshot inmutable.
6. Se puede recuperar el snapshot por id y listar el historial con filtros.
7. Angular muestra Analisis, Calculo, Detalle mensual, Diagnosticos, Historial y Configuracion con datos reales.
8. Los cinco casos coinciden con Python a centavos y en estados/veredictos.
9. V6, V8, V10 y V11 conservan conducta y evidencia; las no implementadas no se presentan como evaluadas.
10. V11 no altera retencion ni veredicto.
11. Angular no contiene calculos tributarios.
12. Las escalas y parametros tienen version, fuente y vigencia.
13. Los tests Node, Angular, integracion y paridad pasan.
14. El build Angular pasa.
15. Existen instrucciones de MongoDB, Node, Angular, backup y rollback.
16. Python y React permanecen disponibles hasta aprobacion explicita de retiro.

## 12. Configuracion operativa prevista

`backend-node/.env.example`:

```dotenv
MONGODB_URI=mongodb://localhost:27017/auditoria_ganancias
PORT=8000
TOLERANCIA_REDONDEO=0.05
MAX_UPLOAD_MB=20
```

Angular:

```typescript
export const environment = {
  apiUrl: 'http://localhost:8000/api',
};
```

Comandos previstos, no disponibles hasta implementar las fases:

```bash
cd backend-node
npm install
npm run start:dev
npm run test

cd frontend-angular
npm install
npm start
npm run build
```

## 13. Entrega y control de cambios por fase

Al finalizar cada fase se informara:

1. alcance migrado;
2. archivos creados/modificados;
3. pendientes y riesgos;
4. pruebas ejecutadas y resultados;
5. diferencias contra Python;
6. endpoints habilitados;
7. comandos de ejecucion;
8. configuracion MongoDB;
9. XLSX efectivamente probados;
10. decision de avanzar o detenerse.

Este documento es la salida de planificacion. La implementacion debe comenzar unicamente despues de la confirmacion del usuario y por la Fase 0, sin saltar gates.
