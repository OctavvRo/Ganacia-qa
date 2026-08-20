# Migración completa Node + Angular + MongoDB

La migración vive en `backend-node/` y `frontend-angular/`. `backend/` y `frontend/` permanecen sin reemplazo para permitir rollback y comparación.

## Fases verificadas

1. Oráculo Python congelado en `backend/tests/golden/` con seis XLSX y SHA-256.
2. NestJS 9/TypeScript con contrato Node 18.14 y puerto 8001.
3. Seis colecciones Mongoose: snapshots, archivos, clientes, legajos, parámetros normativos y escalas Art. 94.
4. Lectura XLSX, normalización, SAC, escala, motor, detalle mensual y snapshot migrados con `decimal.js`.
5. V6, V8, conciliación y control técnico `CTRL_TOPE_LCT_35`; catálogo V1–V21 conserva NO_EVALUADA sin inventar fuentes.
6. Cobertura básica/enriquecida y contexto manual.
7. API REST, historial, filtros, descarga y diagnóstico.
8. Comparación golden: seis casos iguales en campos funcionales.
9. Angular 15, Material y Tailwind con todas las pantallas solicitadas.

## Decisiones

- Las 11 hojas del spec son el modelo ideal, no una precondición del XLSX actual.
- El control histórico `V11_TOPE_LCT_35` se publica además como `CTRL_TOPE_LCT_35`; V11 del catálogo queda reservado a HNH.
- MongoDB crea una nueva revisión al enriquecer contexto; nunca actualiza el snapshot previo.
- Los importes se calculan con Decimal. Los números JSON son exclusivamente la serialización final.

## Pendientes externos

La estación de validación no tiene `mongod` ni Docker instalados. El esquema, repositorio y prueba aislada de persistencia están verificados; la prueba contra un daemon real debe ejecutarse siguiendo `docs/guia_ejecucion_local.md` en un equipo con MongoDB.
