import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { AuthService, COOKIE_SESION } from './auth.service';

/**
 * Endpoints publicos de autenticacion.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const sesion = await this.auth.login(body.correo, body.contrasena);
    response.cookie(COOKIE_SESION, sesion.token, this.opcionesCookie(sesion.expira_en));
    return { usuario: sesion.usuario };
  }

  @Get('me')
  me(@Req() request: Request) {
    const token = this.leerCookie(request, COOKIE_SESION);
    const usuario = this.auth.verificarToken(token);
    if (!usuario) throw new UnauthorizedException('Sesion no iniciada.');
    return { usuario };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  }

  private opcionesCookie(expiraEnSegundos: number) {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: expiraEnSegundos * 1000,
    };
  }

  private leerCookie(request: Request, nombre: string): string | undefined {
    const cookie = request.headers.cookie;
    if (!cookie) return undefined;

    return cookie
      .split(';')
      .map((parte) => parte.trim())
      .find((parte) => parte.startsWith(`${nombre}=`))
      ?.slice(nombre.length + 1);
  }
}
