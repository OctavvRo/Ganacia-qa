import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import mongoose, { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../../src/app.module';
import { AnalisisSnapshot } from '../../src/modules/analisis/schemas/analisis-snapshot.schema';
import { AuthService } from '../../src/modules/auth/auth.service';
import { Usuario } from '../../src/modules/auth/schemas/usuario.schema';

describe('Logical Delete Integration Tests (MongoDB)', () => {
  let app: INestApplication;
  let snapshotModel: Model<any>;
  let usuarioModel: Model<any>;
  let agente: any;
  const uri = process.env.MONGODB_URI;

  const testHash = `logical-delete-test-${Date.now()}`;
  const correoTest = `${testHash}@test.local`;
  const contrasenaTest = 'contrasena-test-123456';
  let idActivo: string;
  let idEliminado: string;

  beforeAll(async () => {
    if (!uri) {
      throw new Error(
        'MONGODB_URI no esta definida. Configure una URI real de MongoDB antes de ejecutar npm run test:mongo.',
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    snapshotModel = moduleFixture.get<Model<any>>(getModelToken(AnalisisSnapshot.name));
    usuarioModel = moduleFixture.get<Model<any>>(getModelToken(Usuario.name));

    const auth = moduleFixture.get(AuthService);
    await auth.guardarUsuario(correoTest, contrasenaTest);
    agente = request.agent(app.getHttpServer());
    await agente
      .post('/api/auth/login')
      .send({ correo: correoTest, contrasena: contrasenaTest })
      .expect(201);

    // Crear dos documentos de prueba
    const docActivo = await snapshotModel.create({
      origen: 'TEST_DELETE',
      tipo_analisis: 'ANALISIS_BASICO',
      cliente: 'Cliente Activo',
      legajo: '123',
      periodo: '06/2026',
      archivo_origen: 'activo.xlsx',
      hash_archivo: `${testHash}-activo`,
      fecha_analisis: new Date(),
      estado: 'analisis_completado',
      veredicto: 'CORRECTO',
      resumen: { retencion_calculada: 100 },
      calculo: { retencion_calculada: 100 },
      detalle_mensual: [],
      validaciones: [],
      advertencias: [],
      faltantes: [],
      snapshot_original: { test: true },
    });
    idActivo = String(docActivo._id);

    const docEliminado = await snapshotModel.create({
      origen: 'TEST_DELETE',
      tipo_analisis: 'ANALISIS_BASICO',
      cliente: 'Cliente Eliminado',
      legajo: '456',
      periodo: '06/2026',
      archivo_origen: 'eliminado.xlsx',
      hash_archivo: `${testHash}-eliminado`,
      fecha_analisis: new Date(),
      estado: 'analisis_completado',
      veredicto: 'CORRECTO',
      resumen: { retencion_calculada: 200 },
      calculo: { retencion_calculada: 200 },
      detalle_mensual: [],
      validaciones: [],
      advertencias: [],
      faltantes: [],
      snapshot_original: { test: true },
    });
    idEliminado = String(docEliminado._id);
  });

  afterAll(async () => {
    if (snapshotModel) {
      await snapshotModel.deleteMany({
        hash_archivo: { $regex: new RegExp(`^${testHash}`) },
      });
    }
    if (usuarioModel) {
      await usuarioModel.deleteMany({ correo: correoTest });
    }
    if (app) {
      await app.close();
    }
    await mongoose.disconnect();
  });

  it('DELETE /api/analisis/:id realiza borrado logico', async () => {
    // 1. Verificar que existe inicialmente y no está marcado como eliminado
    const preDoc = await snapshotModel.findById(idEliminado).lean() as any;
    expect(preDoc?.eliminado).toBeFalsy();

    // 2. Ejecutar borrado lógico por API
    await agente
      .delete(`/api/analisis/${idEliminado}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.mensaje).toBe('Análisis eliminado correctamente');
        expect(res.body.id).toBe(idEliminado);
      });

    // 3. Verificar que se marcaron los campos de borrado lógico
    const postDoc = await snapshotModel.findById(idEliminado).lean() as any;
    expect(postDoc?.eliminado).toBe(true);
    expect(postDoc?.eliminado_en).toBeDefined();
    expect(postDoc?.eliminado_por).toBe('usuario_local');
  });

  it('GET /api/analisis no devuelve el analisis eliminado por defecto', async () => {
    await agente
      .get('/api/analisis')
      .expect(200)
      .expect((res: any) => {
        const ids = res.body.datos.map((d: any) => d.id);
        expect(ids).toContain(idActivo);
        expect(ids).not.toContain(idEliminado);
      });
  });

  it('GET /api/analisis?incluir_eliminados=true devuelve el analisis eliminado', async () => {
    await agente
      .get('/api/analisis?incluir_eliminados=true')
      .expect(200)
      .expect((res: any) => {
        const ids = res.body.datos.map((d: any) => d.id);
        expect(ids).toContain(idActivo);
        expect(ids).toContain(idEliminado);
      });
  });

  it('GET /api/diagnosticos/resumen no cuenta analisis eliminados', async () => {
    // Buscar total actual de MongoDB para comparar
    const totalActivosReal = await snapshotModel.countDocuments({
      eliminado: { $ne: true },
    });

    await agente
      .get('/api/diagnosticos/resumen')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.total).toBe(totalActivosReal);
      });
  });

  it('DELETE de ID inexistente devuelve 404', async () => {
    const fakeId = new Types.ObjectId().toString();
    await agente
      .delete(`/api/analisis/${fakeId}`)
      .expect(404);
  });

  it('DELETE de analisis ya eliminado devuelve 404', async () => {
    await agente
      .delete(`/api/analisis/${idEliminado}`)
      .expect(404);
  });

  it('GET /api/analisis/:id devuelve 404 para analisis eliminado', async () => {
    await agente
      .get(`/api/analisis/${idEliminado}`)
      .expect(404);
  });

  it('GET /api/analisis/:id/json devuelve 404 para analisis eliminado', async () => {
    await agente
      .get(`/api/analisis/${idEliminado}/json`)
      .expect(404);
  });

  it('no se rompe la descarga JSON ni lectura del analisis activo', async () => {
    await agente
      .get(`/api/analisis/${idActivo}`)
      .expect(200);

    await agente
      .get(`/api/analisis/${idActivo}/json`)
      .expect(200);
  });
});
