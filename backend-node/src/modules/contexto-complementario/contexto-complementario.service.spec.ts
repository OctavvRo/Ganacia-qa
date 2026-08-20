import { ContextoComplementarioService } from './contexto-complementario.service';

describe('ContextoComplementarioService', () => {
  const service = new ContextoComplementarioService();

  it('clasifica un analisis enriquecido sin modificar calculos', () => {
    const reporte: any = {
      tipo_analisis: 'ANALISIS_BASICO',
      calculo: { retencion_calculada: 10 },
      metadata: { hoja: 'Mensual' },
      cobertura_validaciones: { validaciones: [] },
      snapshot: {},
    };

    service.aplicar(reporte, {
      datos_cliente: { cliente_cuit: '30-1' },
      datos_contexto: { fuente_datos: 'manual' },
    });

    expect(reporte.tipo_analisis).toBe('ANALISIS_ENRIQUECIDO');
    expect(reporte.calculo.retencion_calculada).toBe(10);
    expect(reporte.contexto_complementario.origen).toBe('MANUAL');
  });

  it('devuelve modulos de datos con estado de completitud', () => {
    const contexto = service.normalizar({
      datos_legajo: {
        legajo_numero: '180',
        zona_geografica: 'general',
      },
      datos_siradig: {
        siradig_disponible: 'true',
      },
    });

    const legajo = contexto.modulos_datos.find((m: any) => m.grupo === 'datos_legajo')!;
    const siradig = contexto.modulos_datos.find((m: any) => m.grupo === 'datos_siradig')!;

    expect(contexto.modulos_datos.length).toBe(7);
    expect(legajo.estado).toBe('PARCIAL');
    expect(legajo.campos_informados).toBe(2);
    expect(siradig.validaciones_habilitadas).toContain('V7');
    expect(contexto.campos_faltantes).toContain('datos_legajo.fecha_ingreso');
  });

  it('normaliza zonas geograficas humanas a claves tecnicas', () => {
    const contexto = service.normalizar({
      datos_cliente: {
        zona_geografica_default: 'Mendoza',
      },
      datos_legajo: {
        zona_geografica: 'Neuquén',
      },
    });

    expect(contexto.datos_cliente.zona_geografica_default).toBe('general');
    expect(contexto.datos_legajo.zona_geografica).toBe('patagonica');
  });

  it('normaliza modo_saldo_favor a clave tecnica', () => {
    const contexto = service.normalizar({
      datos_cliente: {
        modo_saldo_favor: 'Devolución',
      },
    });

    expect(contexto.datos_cliente.modo_saldo_favor).toBe('devolver');
  });

  it('no pide detalle SIRADIG de otros empleadores cuando el legajo informa que no tiene', () => {
    const contexto = service.normalizar({
      datos_legajo: {
        tiene_otros_empleadores: 'No',
      },
    });

    expect(contexto.campos_faltantes).not.toContain('datos_siradig.otros_empleadores');
  });
});
