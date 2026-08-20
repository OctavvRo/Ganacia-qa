# Golden files privados

Los `.json` golden generados desde casos reales no se versionan porque pueden
contener datos de liquidaciones.

Para ejecutar `npm run test:golden` con paridad completa, copiar los golden
autorizados en esta carpeta junto con los fixtures XLSX correspondientes.

Si los archivos no existen, las pruebas de paridad se saltan automaticamente.
