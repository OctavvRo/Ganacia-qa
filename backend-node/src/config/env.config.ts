export interface ConfiguracionAplicacion {
  port: number;
  mongodbUri: string;
  maxUploadMb: number;
  toleranciaRedondeo: string;
}

export const cargarConfiguracion = (): ConfiguracionAplicacion => ({
  port: Number(process.env.PORT ?? 8001),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/auditoria_ganancias',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 20),
  toleranciaRedondeo: process.env.TOLERANCIA_REDONDEO ?? '0.05',
});
