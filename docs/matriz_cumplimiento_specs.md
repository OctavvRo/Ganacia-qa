# Matriz de cumplimiento de specs

Esta matriz resume la lectura completa de:

- `spec-controlador-ganancias-4ta.md`
- `spec-reporte-esueldos-auditoria.md`

El criterio operativo del sistema queda definido asi:

1. El motor no inventa datos.
2. Si una validacion puede ejecutarse con el Excel actual, se ejecuta.
3. Si una validacion requiere datos que no vienen en el Excel actual, queda como `NO_EVALUADA` con datos faltantes y fuente sugerida.
4. El frontend solo muestra resultados y limitaciones devueltas por backend.

## Estado general

El sistema actual opera como controlador deterministico `ANALISIS_BASICO` / `ANALISIS_ENRIQUECIDO`.

- Con el Excel legacy actual puede calcular la retencion de referencia, detectar modalidad SAC, aplicar escala Art. 94, reconstruir detalle mensual y evaluar controles basicos.
- Con el reporte extendido del spec puede leer las 11 hojas formales: `Metadata`, `Acumuladores`, `PapelTrabajo`, `Config_Cliente`, `Legajo_Empleado`, `SIRADIG`, `Contexto_Normativo`, `Log_Calculo`, `Novedades_Mes`, `Historial_Retenciones` y `Ajuste_Final`.
- El catalogo V1-V21 se invoca siempre. Las validaciones con datos suficientes se ejecutan; las que dependen de datos no informados quedan como `NO_EVALUADA` con `datos_faltantes`, `fuentes_sugeridas` y `accion_recomendada`.
- Los controles tecnicos que no forman parte del catalogo V1-V21 se informan en `controles_tecnicos`. El tope LCT 35% queda como `CTRL_TOPE_LCT_35`; no reemplaza V11 del spec, que refiere a HNH prorrateado.

## Regla de fuentes aplicada

El controlador separa tres clases de datos:

1. **Acumuladores legacy del Excel actual**: son la fuente minima para reconstruir la referencia deterministica.
2. **Hojas formales del reporte extendido** (`PapelTrabajo`, `Log_Calculo`, `Contexto_Normativo`, etc.): son evidencia maquina segun contrato del spec y pueden usarse para validaciones AS-IS.
3. **Tablas laterales o papeles manuales agregados en la misma hoja legacy**: no se consideran contrato maquina y no se usan como insumo ni como comparacion, porque los Excel productivos pueden llegar sin esas tablas.

Por esta regla, el motor de referencia siempre calcula desde acumuladores + normativa cargada. Si falta una escala, un tope o un dato contextual, el sistema devuelve `NO_EVALUADA`, `no_procesable` o `analisis_no_soportado` segun corresponda, pero no inventa datos ni toma valores manuales laterales como oficiales.

## Validaciones del controlador

| Validacion | Segun spec | Estado actual | Datos faltantes cuando no se puede evaluar |
|---|---|---|---|
| V1 | Sincronizacion fila 35 vs papel de trabajo | Ejecutable si viene `PapelTrabajo.ganancia_neta`; si no, `NO_EVALUADA` | `papel_trabajo.ganancia_neta` |
| V2 | Composicion correcta del Total Ingresos, incluyendo SAC | Ejecutable si viene `PapelTrabajo.total_ingresos`; si no, `NO_EVALUADA` | `papel_trabajo.total_ingresos`, `papel_trabajo.total_ingresos_composicion`, `sac_bruto_cobrado`, `sac_anulacion_provisiones` |
| V3 | Cadena aritmetica del papel de trabajo | Ejecutable si viene el papel completo; si no, `NO_EVALUADA` | `papel_trabajo_completo` |
| V4 | Escala Art. 94 aplicada correctamente | Ejecutada cuando hay calculo; compara papel auxiliar si existe | Escala oficial versionada si se quiere validacion productiva |
| V5 | Consistencia de aportes personales | Catalogada | `regimen_previsional`, `topes_previsionales_vigentes` |
| V6 | 12va parte Art. 30 | Ejecutada | Acumuladores Art. 30 si faltan |
| V7 | Topes por rubro SIRADIG | Catalogada como familia V7.a a V7.i | `siradig_detallado`, `contexto_normativo.topes_por_rubro` |
| V8 | Modalidad SAC | Ejecutada por inferencia desde fila SAC | Config declarada para contraste formal |
| V9 | Sobreprima de seguro sobre SAC | Ejecutable si vienen configuracion de poliza y acumulador de seguros; si no, `NO_EVALUADA` | `config_cliente.poliza_seguro_cobra_sobre_sac`, `acumuladores.seguros_de_retiro` |
| V10 | Saldo a favor enmascarado | Implementada segun spec: inversion de signo, modo saldo y retencion efectiva cuando existe | `config_cliente.modo_saldo_favor`, `papel_trabajo.retencion_del_mes_efectiva`, `historial_retenciones` para casos con saldo |
| V11 | HNH prorrateado desde mes de pago | Catalogada; el control LCT 35% queda como control tecnico separado | `novedades_mes.hnh`, `modalidad_hnh`, `distribucion_efectiva_por_mes` |
| V12 | Cambio de tramo intra-anio | Catalogada | `historial_retenciones`, `escala_art94_por_mes` |
| V13 | Proporcionalizacion por ingreso/egreso | Catalogada | `fecha_ingreso`, `fecha_egreso` |
| V14 | Multiempleo y agente unico | Catalogada | `otros_empleadores`, `siradig_detallado` |
| V15 | Zona geografica | Catalogada | `zona_geografica`, `parametros_por_zona` |
| V16 | Regimen previsional diferencial | Catalogada | `regimen_previsional`, `tabla_regimenes_previsionales` |
| V17 | Actualizacion semestral RIPTE | Catalogada | `ripte`, `escala_art94_por_vigencia` |
| V18 | Interaccion de topes de deducciones | Catalogada | `log_calculo.topes_aplicados`, `contexto_normativo.orden_topes` |
| V19 | Ajuste anual de diciembre | Catalogada | `ajuste_final`, `siradig_definitivo`, `historial_retenciones` |
| V20 | Liquidacion final por egreso | Catalogada | `ajuste_final.egreso`, `conceptos_egreso`, `parametros_indemnizatorios` |
| V21 | Exenciones Art. 26 LIG | Catalogada | `novedades_mes.clasificacion_fiscal`, `fundamento_normativo_por_concepto` |

## Decision sobre V10

La V10 no es una simple comparacion de centavos contra el Excel.

Segun el spec, V10 controla:

- inversion de signo entre retencion declarada y retencion de referencia;
- tratamiento de retencion negativa segun `modo_saldo_favor`;
- retencion efectiva cuando el modo es `compensar`, `devolver` o `saldo_para_siradig`;
- saldo a favor generado o aplicado.

Por eso el backend ahora:

- marca `ERROR` si hay inversion de signo;
- marca `NO_EVALUADA` si la retencion es negativa y falta `modo_saldo_favor` o retencion efectiva;
- marca `OK` si no hay saldo a favor enmascarado detectable;
- no inventa modo de saldo ni historial.

## Estructura de reporte extendido

El spec de reporte define 11 hojas:

1. `Metadata`
2. `Acumuladores`
3. `PapelTrabajo`
4. `Config_Cliente`
5. `Legajo_Empleado`
6. `SIRADIG`
7. `Contexto_Normativo`
8. `Log_Calculo`
9. `Novedades_Mes`
10. `Historial_Retenciones`
11. `Ajuste_Final`

El parser actual reconoce las 11 hojas. Las columnas de contrato maquina se preservan en snake_case:

- `Acumuladores.acumulador`
- `PapelTrabajo.campo`
- `Metadata.campo`
- `Config_Cliente.campo`
- `Legajo_Empleado.campo`
- `Contexto_Normativo.campo`
- columnas tecnicas de `Log_Calculo`
- columnas tecnicas de `SIRADIG`, `Novedades_Mes`, `Historial_Retenciones` y `Ajuste_Final`

Los nombres humanizados pueden usarse como etiquetas visibles de frontend, pero no reemplazan las claves tecnicas del spec.

## Pendiente para auditoria productiva 100%

El controlador queda completo en modo seguro: no omite V del catalogo y no inventa informacion. Para que todas las V pasen de `NO_EVALUADA` a evaluadas en produccion hace falta que el origen real entregue datos suficientes:

1. Reporte extendido con las 11 hojas pobladas.
2. Normativa oficial versionada por vigencia completa, especialmente cuando se auditen periodos fuera de la escala cargada.
3. Datos de legajo: zona, regimen previsional, ingreso/egreso, multiempleo y situacion de revista.
4. SIRADIG detallado por rubro y topes por rubro.
5. Novedades del mes con clasificacion fiscal y fundamento normativo.
6. Historial de retenciones y ajustes finales cuando aplique.
