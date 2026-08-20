# API Node

Base: `http://localhost:8001/api`.

- `GET /salud`: disponibilidad.
- `GET /version`: versión y runtime objetivo.
- `POST /analisis/excel`: multipart con `archivo` y `contexto_complementario` JSON opcional.
- `GET /analisis`: historial paginado; filtros `cliente`, `legajo`, `periodo`, `estado`, `veredicto`, `fechaDesde`, `fechaHasta`, `pagina`, `limite`.
- `GET /analisis/:id`: snapshot completo.
- `GET /analisis/:id/json`: descarga técnica.
- `POST /analisis/:id/contexto-complementario`: crea una nueva revisión enriquecida conservando el original.
- `GET /diagnosticos/resumen`: agregados MongoDB.
- `GET /configuracion`: tolerancia, versiones y fuentes.

Errores de extensión, Excel o contexto inválido se devuelven como HTTP 400. Un ID inexistente devuelve 404.
