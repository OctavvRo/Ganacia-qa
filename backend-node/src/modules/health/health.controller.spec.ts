import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('informa que el servicio esta disponible', () => {
    expect(new HealthController().obtenerSalud()).toEqual({
      estado: 'ok',
      servicio: 'auditoria-ganancias-node',
    });
  });
});
