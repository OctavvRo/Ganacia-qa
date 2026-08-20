import { Controller, Get } from '@nestjs/common';

@Controller('version')
export class VersionController {
  @Get()
  obtenerVersion(): Record<string, string> {
    return { motor: '2.1.0', runtime_objetivo: 'Node.js 18.14', tipo_analisis: 'ANALISIS_BASICO' };
  }
}
