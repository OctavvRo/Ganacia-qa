import mongoose from 'mongoose';
import { AnalisisSnapshotSchema } from '../../src/modules/analisis/schemas/analisis-snapshot.schema';

describe('MongoDB real - validacion de snapshot', () => {
  const uri = process.env.MONGODB_URI;
  const hashArchivo = `test-mongo-${Date.now()}`;
  const nombreModelo = 'AnalisisSnapshotMongoRealTest';

  beforeAll(async () => {
    if (!uri) {
      throw new Error(
        'MONGODB_URI no esta definida. Configure una URI real de MongoDB antes de ejecutar npm run test:mongo.',
      );
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const Modelo = mongoose.model(nombreModelo, AnalisisSnapshotSchema);
      await Modelo.deleteMany({ hash_archivo: hashArchivo });
    }

    await mongoose.disconnect();
  });

  it('crea, lee, valida y limpia un snapshot de prueba', async () => {
    const Modelo = mongoose.model(nombreModelo, AnalisisSnapshotSchema);

    const creado = await Modelo.create({
      origen: 'TEST_MONGO_REAL',
      tipo_analisis: 'VALIDACION_MONGODB_LOCAL',
      cliente: 'ClienteTestMongo',
      legajo: '000000',
      periodo: '06/2026',
      archivo_origen: 'validacion_mongodb_local.xlsx',
      hash_archivo: hashArchivo,
      fecha_analisis: new Date('2026-07-08T12:00:00.000Z'),
      motor_version: 'test',
      escala_version: 'test',
      modalidad_sac: 'percibido',
      estado: 'test',
      veredicto: 'TEST',
      resumen: {
        retencion_calculada: '0.00',
        retencion_excel: '0.00',
        diferencia: '0.00',
      },
      calculo: {
        retencion_calculada: '0.00',
      },
      detalle_mensual: [],
      validaciones: [],
      advertencias: ['Documento creado por npm run test:mongo.'],
      faltantes: [],
      snapshot_original: {
        prueba: true,
        generado_por: 'npm run test:mongo',
      },
    });

    expect(creado._id).toBeDefined();

    const leido = await Modelo.findById(creado._id).lean();

    expect(leido).toBeTruthy();
    expect(leido?.origen).toBe('TEST_MONGO_REAL');
    expect(leido?.tipo_analisis).toBe('VALIDACION_MONGODB_LOCAL');
    expect(leido?.cliente).toBe('ClienteTestMongo');
    expect(leido?.legajo).toBe('000000');
    expect(leido?.periodo).toBe('06/2026');
    expect(leido?.hash_archivo).toBe(hashArchivo);
    expect(leido?.snapshot_original).toMatchObject({
      prueba: true,
      generado_por: 'npm run test:mongo',
    });

    const borrado = await Modelo.deleteOne({ _id: creado._id });
    expect(borrado.deletedCount).toBe(1);

    const eliminado = await Modelo.findById(creado._id).lean();
    expect(eliminado).toBeNull();
  });
});
