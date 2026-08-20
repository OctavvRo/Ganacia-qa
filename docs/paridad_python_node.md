# Paridad Python ↔ Node

`backend/tests/golden/manifest.json` fija los hashes de los Excel y reportes Python. `backend-node/test/golden/paridad-golden.spec.ts` procesa cada XLSX con Node y compara exactamente:

- estado, metadata y modalidad SAC;
- todos los importes del cálculo a centavos;
- validaciones y veredicto;
- detalle mensual;
- cobertura V1–V21 y controles técnicos.

```powershell
cd backend-node
npm run test:golden
```

Casos: Netser, Marinaro, CasoPrueba con error, CasoPrueba correcto, PruebaIntegral 303 y CMuniz 180. Los campos de infraestructura deliberadamente fuera del comparador son IDs Mongo, timestamps, rutas temporales y versión de runtime del nuevo snapshot.
