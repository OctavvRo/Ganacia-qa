import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { crearPasswordHash, firmarSesion, verificarPassword, verificarSesion } from './auth.crypto';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

export const COOKIE_SESION = 'auditoria_sesion';

export interface UsuarioSesion {
  id: string;
  correo: string;
}

/**
 * Servicio de autenticacion simple con correo y contrasena.
 */
@Injectable()
export class AuthService {
  constructor(@InjectModel(Usuario.name) private readonly usuarios: Model<UsuarioDocument>) {}

  /**
   * Valida credenciales y genera token de sesion firmado.
   */
  async login(correoEntrada: string, contrasena: string): Promise<{ token: string; usuario: UsuarioSesion; expira_en: number }> {
    const correo = this.normalizarCorreo(correoEntrada);
    const usuario = await this.usuarios.findOne({ correo }).lean();

    if (!usuario || !verificarPassword(contrasena, usuario.password_hash)) {
      throw new UnauthorizedException('Correo o contrasena incorrectos.');
    }

    const ahora = Math.floor(Date.now() / 1000);
    const expiraEn = this.segundosSesion();
    const usuarioSesion = { id: String(usuario._id), correo: usuario.correo };
    const token = firmarSesion({ sub: usuarioSesion.id, correo: usuarioSesion.correo, iat: ahora, exp: ahora + expiraEn }, this.secreto());

    return { token, usuario: usuarioSesion, expira_en: expiraEn };
  }

  /**
   * Devuelve el usuario de la sesion si el token es valido.
   */
  verificarToken(token?: string): UsuarioSesion | null {
    if (!token) return null;
    const payload = verificarSesion(token, this.secreto());
    if (!payload) return null;

    const exp = Number(payload.exp);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

    const id = typeof payload.sub === 'string' ? payload.sub : null;
    const correo = typeof payload.correo === 'string' ? payload.correo : null;
    return id && correo ? { id, correo } : null;
  }

  /**
   * Crea o actualiza un usuario desde scripts internos.
   */
  async guardarUsuario(correoEntrada: string, contrasena: string): Promise<UsuarioSesion> {
    const correo = this.normalizarCorreo(correoEntrada);
    const password_hash = crearPasswordHash(contrasena);
    const doc = await this.usuarios.findOneAndUpdate(
      { correo },
      { $set: { correo, password_hash } },
      { upsert: true, new: true },
    ).lean();

    return { id: String(doc._id), correo: doc.correo };
  }

  segundosSesion(): number {
    const horas = Number(process.env.SESSION_HOURS ?? 8);
    return Math.max(1, Number.isFinite(horas) ? horas : 8) * 60 * 60;
  }

  private normalizarCorreo(correo: string): string {
    return String(correo ?? '').trim().toLowerCase();
  }

  private secreto(): string {
    const secreto = process.env.JWT_SECRET;
    if (secreto && secreto.length >= 32) return secreto;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET debe estar configurado en produccion y tener al menos 32 caracteres.');
    }
    return 'desarrollo-local-cambiar-en-produccion-32-caracteres-minimo';
  }
}
