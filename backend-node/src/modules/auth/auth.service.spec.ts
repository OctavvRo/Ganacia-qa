import { UnauthorizedException } from '@nestjs/common';
import { crearPasswordHash } from './auth.crypto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const secretoOriginal = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = secretoOriginal;
  });

  it('valida correo y contrasena y devuelve token de sesion', async () => {
    process.env.JWT_SECRET = 'secreto-de-test-con-mas-de-32-caracteres';
    const modelo: any = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'usuario-1',
          correo: 'persona@empresa.com',
          password_hash: crearPasswordHash('clave123'),
        }),
      }),
    };
    const service = new AuthService(modelo);

    const resultado = await service.login('Persona@Empresa.com ', 'clave123');

    expect(modelo.findOne).toHaveBeenCalledWith({ correo: 'persona@empresa.com' });
    expect(resultado.usuario).toEqual({ id: 'usuario-1', correo: 'persona@empresa.com' });
    expect(service.verificarToken(resultado.token)).toEqual({ id: 'usuario-1', correo: 'persona@empresa.com' });
  });

  it('rechaza credenciales invalidas', async () => {
    process.env.JWT_SECRET = 'secreto-de-test-con-mas-de-32-caracteres';
    const modelo: any = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'usuario-1',
          correo: 'persona@empresa.com',
          password_hash: crearPasswordHash('clave123'),
        }),
      }),
    };
    const service = new AuthService(modelo);

    await expect(service.login('persona@empresa.com', 'incorrecta')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
