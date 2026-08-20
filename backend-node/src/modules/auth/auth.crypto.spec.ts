import { crearPasswordHash, firmarSesion, verificarPassword, verificarSesion } from './auth.crypto';

describe('auth.crypto', () => {
  it('hashea y verifica contrasenas sin guardar texto plano', () => {
    const hash = crearPasswordHash('clave-segura');

    expect(hash).not.toContain('clave-segura');
    expect(verificarPassword('clave-segura', hash)).toBe(true);
    expect(verificarPassword('otra-clave', hash)).toBe(false);
  });

  it('firma y verifica sesiones', () => {
    const secreto = 'secreto-local-de-prueba-con-mas-de-32-caracteres';
    const token = firmarSesion({ sub: '1', correo: 'test@empresa.com', exp: 9999999999 }, secreto);

    expect(verificarSesion(token, secreto)).toMatchObject({ sub: '1', correo: 'test@empresa.com' });
    expect(verificarSesion(token, 'otro-secreto-local-de-prueba-con-mas-de-32')).toBeNull();
  });
});
