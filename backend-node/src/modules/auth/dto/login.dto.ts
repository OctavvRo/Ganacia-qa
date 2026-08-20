import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Datos minimos para iniciar sesion.
 */
export class LoginDto {
  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  contrasena: string;
}
