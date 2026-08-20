# Modelo MongoDB

## `analisis_snapshots`

Snapshot inmutable con origen, tipo, cliente, legajo, período, archivo, SHA-256, fecha, versiones, modalidad SAC, estado, veredicto, resumen, cálculo, composición, normativa, cobertura, contexto, detalle mensual, validaciones, advertencias, faltantes y `snapshot_original`.

El middleware Mongoose rechaza `updateOne`, `findOneAndUpdate` y `replaceOne`. Un reanálisis o enriquecimiento crea otro documento y conserva el hash del archivo.

## Otras colecciones

- `archivos_procesados`: nombre, hash, tamaño, MIME y snapshot asociado.
- `clientes`: identidad y configuración.
- `legajos`: empleado y vínculo con cliente.
- `parametros_normativos`: valores versionados por vigencia.
- `escalas_art94`: tramos y fuente/versionado.

Los cálculos internos nunca usan `number`; usan `decimal.js`. Para persistencia monetaria especializada el esquema admite Decimal128/strings; el snapshot original preserva el contrato JSON auditable.
