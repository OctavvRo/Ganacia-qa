import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { QaLabService } from './qa-lab.service';

@Controller('qa/lab')
@UseGuards(AuthGuard)
export class QaLabController {
  constructor(private readonly service: QaLabService) {}

  /**
   * POST /api/qa/lab/mutacion
   * Ejecuta las pruebas de mutación de datos.
   */
  @Post('mutacion')
  async mutacion(
    @Body() body: { datasetCodigo: string; estrategia: 'extremos' | 'incrementales' | 'combinatoria'; variacion?: number }
  ) {
    if (!body?.datasetCodigo) {
      throw new HttpException('El parámetro datasetCodigo es requerido', HttpStatus.BAD_REQUEST);
    }
    if (!['extremos', 'incrementales', 'combinatoria'].includes(body.estrategia)) {
      throw new HttpException(
        'La estrategia debe ser "extremos", "incrementales" o "combinatoria"',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.service.runMutacion(body.datasetCodigo, body.estrategia, body.variacion);
  }

  /**
   * POST /api/qa/lab/simulacion
   * Ejecuta simulaciones de normativas sobre los datos de prueba.
   */
  @Post('simulacion')
  async simulacion(
    @Body() body: { datasetCodigo: string; parametrosModificados: Record<string, any> }
  ) {
    if (!body?.datasetCodigo) {
      throw new HttpException('El parámetro datasetCodigo es requerido', HttpStatus.BAD_REQUEST);
    }
    if (!body?.parametrosModificados || typeof body.parametrosModificados !== 'object') {
      throw new HttpException('El parámetro parametrosModificados debe ser un objeto', HttpStatus.BAD_REQUEST);
    }
    return this.service.runSimulacion(body.datasetCodigo, body.parametrosModificados);
  }

  /**
   * POST /api/qa/lab/spider
   * Ejecuta el recorrido exploratorio tipo spider por la aplicación.
   */
  @Post('spider')
  async spider(
    @Body() body: { secciones: string[]; agresividad: 'suave' | 'media' | 'extrema' }
  ) {
    if (!body?.secciones || !Array.isArray(body.secciones)) {
      throw new HttpException('El parámetro secciones debe ser un arreglo de strings', HttpStatus.BAD_REQUEST);
    }
    if (!['suave', 'media', 'extrema'].includes(body.agresividad)) {
      throw new HttpException(
        'La agresividad debe ser "suave", "media" o "extrema"',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.service.runSpider(body.secciones, body.agresividad);
  }
}
