import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, COOKIE_SESION } from './auth.service';

/**
 * Protege endpoints privados verificando la cookie HttpOnly de sesion.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { usuario?: unknown }>();
    const usuario = this.auth.verificarToken(this.leerCookie(request, COOKIE_SESION));

    if (!usuario) {
      throw new UnauthorizedException('Sesion no iniciada.');
    }

    request.usuario = usuario;
    return true;
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
