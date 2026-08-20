import 'reflect-metadata';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import { crearPasswordHash } from '../src/modules/auth/auth.crypto';
import { Usuario, UsuarioSchema } from '../src/modules/auth/schemas/usuario.schema';

/**
 * Crea o actualiza un usuario local con correo y contrasena hasheada.
 */
async function main() {
  cargarEnvLocal();
  const correoArg = leerArg('--correo');
  const correo = (correoArg || await preguntar('Correo: ')).trim().toLowerCase();
  if (!correo || !correo.includes('@')) throw new Error('Debe ingresar un correo valido.');

  const contrasena = await preguntarOculto('Contrasena: ');
  const confirmacion = await preguntarOculto('Confirmar contrasena: ');

  if (contrasena.length < 6) throw new Error('La contrasena debe tener al menos 6 caracteres.');
  if (contrasena !== confirmacion) throw new Error('Las contrasenas no coinciden.');

  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/auditoria_ganancias';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const UsuarioModel = mongoose.model(Usuario.name, UsuarioSchema);

  await UsuarioModel.findOneAndUpdate(
    { correo },
    { $set: { correo, password_hash: crearPasswordHash(contrasena) } },
    { upsert: true, new: true },
  );

  await mongoose.disconnect();
  console.log(`Usuario listo: ${correo}`);
}

function cargarEnvLocal(): void {
  const ruta = path.join(process.cwd(), '.env');
  if (!fs.existsSync(ruta)) return;

  const contenido = fs.readFileSync(ruta, 'utf8');
  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const indice = limpia.indexOf('=');
    if (indice <= 0) continue;
    const clave = limpia.slice(0, indice).trim();
    const valor = limpia.slice(indice + 1).trim();
    process.env[clave] ??= valor;
  }
}

function leerArg(nombre: string): string | null {
  const prefijo = `${nombre}=`;
  const directo = process.argv.find((arg) => arg.startsWith(prefijo));
  if (directo) return directo.slice(prefijo.length);
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] ?? null : null;
}

function preguntar(texto: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(texto, (respuesta) => {
    rl.close();
    resolve(respuesta);
  }));
}

function preguntarOculto(texto: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  return new Promise((resolve) => {
    stdout.write(texto);
    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.setEncoding('utf8');

    let valor = '';
    const onData = (caracter: string) => {
      if (caracter === '\u0003') process.exit(1);
      if (caracter === '\r' || caracter === '\n') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(valor);
        return;
      }
      if (caracter === '\b' || caracter === '\u007f') {
        valor = valor.slice(0, -1);
        return;
      }
      valor += caracter;
    };

    stdin.on('data', onData);
  });
}

main().catch(async (error) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(`No se pudo crear el usuario: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
