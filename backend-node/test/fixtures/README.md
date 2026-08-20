# Fixtures privados

Los archivos `.xlsx` reales de prueba no se versionan porque pueden contener
datos de legajos, clientes o liquidaciones.

Para ejecutar las pruebas de paridad completas en un entorno interno, copiar los
XLSX autorizados en esta carpeta con los nombres esperados por los specs.

Si los archivos no existen, las pruebas que dependen de fixtures privados se
saltan automaticamente.
