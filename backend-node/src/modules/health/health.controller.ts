import { Controller, Get } from '@nestjs/common';

@Controller('salud')
export class HealthController {
  @Get()
  obtenerSalud(): Record<string, string> {
    return { estado: 'ok', servicio: 'auditoria-ganancias-node' };
  }
}
