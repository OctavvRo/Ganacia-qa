import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalisisService } from '../analisis/analisis.service';
import { AuthGuard } from '../auth/auth.guard';
@Controller('diagnosticos')@UseGuards(AuthGuard)export class DiagnosticosController{constructor(private service:AnalisisService){}@Get('resumen')resumen(){return this.service.diagnosticos();}}
