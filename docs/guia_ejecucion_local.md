# Guía de ejecución local

## 1. Runtime

Instalar Node.js 18.14.x y comprobar `node --version`. La compilación y las pruebas finales se ejecutaron con Node 18.14.0. Si NVM tiene activa otra versión, ejecutar `nvm use 18.14.0` antes de instalar o compilar.

## 2. MongoDB

Con Docker:

```powershell
cd backend-node
docker compose -f docker-compose.mongodb.yml up -d
```

O instalar MongoDB local y exponer el puerto 27017.

## 3. Backend

```powershell
cd backend-node
Copy-Item .env.example .env
npm install
npm run test
npm run test:golden
npm run test:e2e
npm run start:dev
```

## 4. Angular

```powershell
cd frontend-angular
npm install
npm run build
npm start
```

Abrir `http://localhost:4200`, cargar un XLSX y comprobar que navega a `/analisis/:id`. Node corre en 8001; Python puede seguir en 8000.

## 5. Rollback

El sistema previo no fue borrado. Para volver temporalmente, iniciar `backend/` y `frontend/` con sus instrucciones originales.
