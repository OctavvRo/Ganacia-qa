import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { QaPlaywrightService } from './qa-playwright.service';

@Controller('qa/playwright')
@UseGuards(AuthGuard)
export class QaPlaywrightController {
  constructor(private readonly service: QaPlaywrightService) {}

  /**
   * POST /api/qa/playwright/run
   * Body: { pantalla: 'pantalla-1' | 'pantalla-2', escenario?: string }
   * Lanza el runner de Playwright correspondiente y devuelve el resultado.
   */
  @Post('run')
  run(@Body() body: { pantalla: string; escenario?: string }) {
    const pantallaValida = ['pantalla-1', 'pantalla-2'].includes(body?.pantalla);
    if (!pantallaValida) {
      throw new HttpException(
        `pantalla debe ser "pantalla-1" o "pantalla-2"`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.service.run(body.pantalla, body.escenario);
  }
}
