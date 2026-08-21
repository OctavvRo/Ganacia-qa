import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { QaCasosService } from './qa-casos.service';

@Controller('qa/casos')
@UseGuards(AuthGuard)
export class QaCasosController {
  constructor(private readonly service: QaCasosService) {}

  @Get()
  listar(@Query('activo') activo?: string) {
    return this.service.listar(activo !== 'false');
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.service.obtener(id);
  }

  @Post()
  guardar(@Body() body: unknown) {
    return this.service.guardar(body);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.service.desactivar(id);
  }
}
