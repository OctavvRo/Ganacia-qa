import { Injectable, Logger } from '@nestjs/common';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

export interface QaLabResultado {
  estado: 'verde' | 'rojo';
  modulo: string;
  stdout: string;
  stderr: string;
  duracion_ms: number;
  fecha: string;
  resultados?: any;
}

@Injectable()
export class QaLabService {
  private readonly logger = new Logger(QaLabService.name);

  /**
   * Lee la URI de la base de datos en memoria si existe el archivo `.memory-db-uri`.
   */
  private getMongoUri(): string | undefined {
    try {
      const uriPath = resolve(process.cwd(), '.memory-db-uri');
      if (fs.existsSync(uriPath)) {
        return fs.readFileSync(uriPath, 'utf8').trim();
      }
    } catch (error) {
      this.logger.warn('No se pudo leer .memory-db-uri');
    }
    return undefined;
  }

  /**
   * Lanza un script de QA en un proceso hijo.
   */
  private runScript(
    scriptName: string,
    modulo: string,
    envParams: Record<string, string>,
  ): Promise<QaLabResultado> {
    const scriptPath = resolve(process.cwd(), 'scripts', scriptName);
    const inicio = Date.now();
    const mongoUri = this.getMongoUri();

    const env: Record<string, string | undefined> = {
      ...process.env,
      ...envParams,
      PLAYWRIGHT_HEADLESS: 'false',
      AUDITORIA_PLAYWRIGHT_DEMO: 'true',
    };

    if (mongoUri) {
      env.MONGODB_URI = mongoUri;
    }

    this.logger.log(`▶ Iniciando QA Lab [${modulo}] — script=${scriptName}`);

    return new Promise((resolvePromise) => {
      const proc = spawn('node', [scriptPath], {
        cwd: process.cwd(),
        env,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        const linea = chunk.toString();
        stdout += linea;
        this.logger.verbose(linea.trim());
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        const linea = chunk.toString();
        stderr += linea;
        this.logger.warn(linea.trim());
      });

      proc.on('close', (code) => {
        const duracion_ms = Date.now() - inicio;
        const estado: 'verde' | 'rojo' = code === 0 ? 'verde' : 'rojo';
        this.logger.log(
          `✔ QA Lab [${modulo}] finalizado — código=${code} estado=${estado} (${(duracion_ms / 1000).toFixed(1)}s)`,
        );
        resolvePromise({
          estado,
          modulo,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duracion_ms,
          fecha: new Date().toISOString(),
        });
      });

      proc.on('error', (error) => {
        const duracion_ms = Date.now() - inicio;
        this.logger.error(`✖ Error lanzando QA Lab [${modulo}]: ${error.message}`);
        resolvePromise({
          estado: 'rojo',
          modulo,
          stdout: stdout.trim(),
          stderr: `Error al iniciar el proceso: ${error.message}`,
          duracion_ms,
          fecha: new Date().toISOString(),
        });
      });
    });
  }

  /**
   * Ejecuta el script de mutación de datos.
   */
  async runMutacion(
    datasetCodigo: string,
    estrategia: 'extremos' | 'incrementales' | 'combinatoria',
    variacion?: number,
  ): Promise<QaLabResultado> {
    const env: Record<string, string> = {
      QA_LAB_DATASET: datasetCodigo,
      QA_LAB_ESTRATEGIA: estrategia,
    };
    if (variacion !== undefined) {
      env.QA_LAB_VARIACION = variacion.toString();
    }
    return this.runScript('run-qa-mutacion.mjs', 'Mutación', env);
  }

  /**
   * Ejecuta el script de simulación normativa.
   */
  async runSimulacion(
    datasetCodigo: string,
    parametrosModificados: Record<string, any>,
  ): Promise<QaLabResultado> {
    const env: Record<string, string> = {
      QA_LAB_DATASET: datasetCodigo,
      QA_LAB_PARAMETROS: JSON.stringify(parametrosModificados),
    };
    return this.runScript('run-qa-simulacion-normativa.mjs', 'Simulación Normativa', env);
  }

  /**
   * Ejecuta el script de spider de componentes.
   */
  async runSpider(
    secciones: string[],
    agresividad: 'suave' | 'media' | 'extrema',
  ): Promise<QaLabResultado> {
    const env: Record<string, string> = {
      QA_LAB_SECCIONES: JSON.stringify(secciones),
      QA_LAB_AGRESIVIDAD: agresividad,
    };
    return this.runScript('run-qa-spider.mjs', 'Spider de Componentes', env);
  }
}
