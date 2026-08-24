import { Injectable, Logger } from '@nestjs/common';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

export interface QaPlaywrightResultado {
  estado: 'verde' | 'rojo';
  pantalla: string;
  stdout: string;
  stderr: string;
  duracion_ms: number;
  fecha: string;
}

@Injectable()
export class QaPlaywrightService {
  private readonly logger = new Logger(QaPlaywrightService.name);

  /**
   * Lanza el runner de Playwright para la pantalla indicada.
   *
   * - Si hay variable DISPLAY disponible abre el navegador de forma visual (--demo).
   * - Si no hay DISPLAY (servidor sin interfaz gráfica) corre en headless.
   */
  async run(pantalla: string, escenario?: string): Promise<QaPlaywrightResultado> {
    const script = pantalla === 'pantalla-1'
      ? 'run-qa-cases-playwright.mjs'
      : 'run-qa-gobernanza-playwright.mjs';

    const scriptPath = resolve(process.cwd(), 'scripts', script);
    const hayDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);

    // Argumentos: --demo solo si hay pantalla gráfica disponible
    const args: string[] = hayDisplay ? ['--demo'] : [];
    if (escenario) args.push('--escenario', escenario);

    this.logger.log(
      `▶ Playwright [${pantalla}] — headless=${!hayDisplay} display=${process.env.DISPLAY ?? 'none'} script=${script}`,
    );

    const inicio = Date.now();

    return new Promise((resolvePromise) => {
      const proc = spawn('node', [scriptPath, ...args], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_HEADLESS: hayDisplay ? 'false' : 'true',
          AUDITORIA_PLAYWRIGHT_DEMO: hayDisplay ? 'true' : 'false',
          // Slowmo más suave en modo visual desde UI
          PLAYWRIGHT_SLOWMO_MS: hayDisplay ? '1200' : '0',
        },
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
          `✔ Playwright [${pantalla}] finalizado — código=${code} estado=${estado} (${(duracion_ms / 1000).toFixed(1)}s)`,
        );
        resolvePromise({
          estado,
          pantalla,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          duracion_ms,
          fecha: new Date().toISOString(),
        });
      });

      proc.on('error', (error) => {
        const duracion_ms = Date.now() - inicio;
        this.logger.error(`✖ Error lanzando Playwright [${pantalla}]: ${error.message}`);
        resolvePromise({
          estado: 'rojo',
          pantalla,
          stdout: stdout.trim(),
          stderr: `Error al iniciar el proceso: ${error.message}`,
          duracion_ms,
          fecha: new Date().toISOString(),
        });
      });
    });
  }
}
