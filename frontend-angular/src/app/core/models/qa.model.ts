export interface Vigencia {
  desde: string; // YYYY-MM
  hasta: string | null;
  motivo_baja?: string;
}

export interface Dataset {
  codigo: string;
  convenio: string;
  periodo: string;
  vigencia: Vigencia;
  estado: 'borrador' | 'validado' | 'vigente' | 'dado_de_baja';
  validado_por?: string;
  validado_en?: string;
  fuente_normativa?: string;
  ajuste?: string;
  cantidad_casos?: number;
}

export interface Caso {
  dataset: string;
  codigo: string;
  descripcion: string;
  tipo_dependencia?: 'ancla' | 'escala_lineal' | 'formula_propia';
  categoria_salarial?: string;
  estado_ultimo_run?: 'pass' | 'fail' | 'revision_manual';
  estado_inicial: any;
  entrada: any;
  esperado: any;
  fuente: {
    tipo: 'normativa' | 'interna';
    ref: string;
  };
}

export interface ResultadoCaso {
  caso: Caso;
  estado: 'pass' | 'fail_regresion' | 'fail_migracion' | 'revision_manual';
  resultado_real: any;
  diff?: any; 
}

export interface Corrida {
  id: string;
  dataset_anterior: string;
  dataset_nuevo: string;
  fecha: string;
  disparado_por: string;
  resultados: ResultadoCaso[];
  estado: 'completado' | 'bloqueado' | 'en_progreso';
  resumen: {
    total: number;
    pass: number;
    fail_regresion: number;
    fail_migracion: number;
    revision_manual: number;
  };
}
