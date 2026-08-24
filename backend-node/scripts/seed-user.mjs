import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { pbkdf2Sync, randomBytes } from 'node:crypto';

function crearPasswordHash(valor) {
  const iteraciones = 210_000;
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(valor, salt, iteraciones, 32, 'sha256').toString('base64url');
  return `pbkdf2$${iteraciones}$${salt}$${hash}`;
}

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
  
  const usuarios = mongoose.connection.collection('usuarios');
  
  const correo = 'admin@auditoria.test';
  const contrasena = 'admin1234';

  await usuarios.updateOne(
    { correo },
    {
      $set: {
        correo,
        password_hash: crearPasswordHash(contrasena),
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  
  console.log('✅ Usuario creado exitosamente en la base de datos temporal.');
  console.log('=================================');
  console.log(`Correo:     ${correo}`);
  console.log(`Contraseña: ${contrasena}`);
  console.log('=================================');

  await mongoose.disconnect();
}

seed().catch(console.error);
