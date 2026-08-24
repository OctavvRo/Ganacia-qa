import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';

async function seed() {
  const backendRoot = process.cwd();
  const memoryUriPath = resolve(backendRoot, '.memory-db-uri');
  
  if (!existsSync(memoryUriPath)) {
    console.error('No se encontró .memory-db-uri. Ejecuta el backend primero.');
    process.exit(1);
  }

  const mongodbUri = readFileSync(memoryUriPath, 'utf8').trim();
  console.log(`Conectando a MongoDB en memoria: ${mongodbUri}`);
  
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5000 });
  
  const qaCasosCollection = mongoose.connection.collection('qa_casos');
  
  const mock1 = {
    id: 'mock-0726',
    dataset_codigo: 'DS-COM-0726',
    periodo: '07-2026',
    descripcion: 'Mock dataset anterior',
    archivo: null,
    contexto: {},
    resultado_esperado: { campo: 'calculo.retencion_excel', valor: 0, tolerancia: 0.05, estado: 'validado' },
    assertions: [{ campo: 'calculo.retencion_excel', operador: 'igual', esperado: 0, tolerancia: 0.05 }],
    origen: {},
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mock2 = {
    id: 'mock-0826',
    dataset_codigo: 'DS-COM-0826',
    periodo: '08-2026',
    descripcion: 'Mock dataset nuevo',
    archivo: null,
    contexto: {},
    resultado_esperado: { campo: 'calculo.retencion_excel', valor: 0, tolerancia: 0.05, estado: 'validado' },
    assertions: [{ campo: 'calculo.retencion_excel', operador: 'igual', esperado: 0, tolerancia: 0.05 }],
    origen: {},
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await qaCasosCollection.updateOne({ id: mock1.id }, { $set: mock1 }, { upsert: true });
  await qaCasosCollection.updateOne({ id: mock2.id }, { $set: mock2 }, { upsert: true });
  
  console.log('✅ Datasets DS-COM-0726 y DS-COM-0826 creados correctamente en la base de datos.');
  await mongoose.disconnect();
}

seed().catch(console.error);
