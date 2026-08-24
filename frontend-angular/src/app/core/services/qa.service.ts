import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Caso, Corrida, Dataset } from '../models/qa.model';

@Injectable({
  providedIn: 'root'
})
export class QaService {

  private mockDatasets: Dataset[] = [
    {
      codigo: 'DS-COM-0726',
      convenio: 'Comercio (130/75)',
      periodo: '2026-07',
      vigencia: { desde: '2026-07', hasta: '2026-08', motivo_baja: 'Nueva escala' },
      estado: 'dado_de_baja',
      cantidad_casos: 45
    },
    {
      codigo: 'DS-COM-0826',
      convenio: 'Comercio (130/75)',
      periodo: '2026-08',
      vigencia: { desde: '2026-08', hasta: null },
      estado: 'vigente',
      validado_por: 'Admin',
      validado_en: '2026-08-01',
      fuente_normativa: 'Acuerdo Agosto 2026',
      ajuste: 'Factor general 1.05',
      cantidad_casos: 45
    }
  ];

  private mockCasos: Caso[] = [
    {
      dataset: 'DS-COM-0826',
      codigo: 'C-01',
      descripcion: 'Empleado basico Maestranza A',
      tipo_dependencia: 'ancla',
      categoria_salarial: 'Maestranza A',
      estado_ultimo_run: 'pass',
      estado_inicial: { antiguedad: 0 },
      entrada: { sueldo_basico: 600000 },
      esperado: { ganancia_neta: 500000 },
      fuente: { tipo: 'normativa', ref: 'CCT 130/75 art 1' }
    },
    {
      dataset: 'DS-COM-0826',
      codigo: 'C-02',
      descripcion: 'Con Antiguedad 10 años',
      tipo_dependencia: 'formula_propia',
      estado_ultimo_run: 'revision_manual',
      estado_inicial: { antiguedad: 10 },
      entrada: { sueldo_basico: 600000 },
      esperado: null,
      fuente: { tipo: 'normativa', ref: 'CCT 130/75 art 2' }
    }
  ];

  private mockCorridas: Corrida[] = [
    {
      id: 'RUN-1234',
      dataset_anterior: 'DS-COM-0726',
      dataset_nuevo: 'DS-COM-0826',
      fecha: '2026-08-02T10:00:00Z',
      disparado_por: 'QA Auto',
      estado: 'completado',
      resumen: {
        total: 45,
        pass: 40,
        fail_regresion: 1,
        fail_migracion: 2,
        revision_manual: 2
      },
      resultados: []
    }
  ];

  constructor() { }

  getDatasets(convenio?: string): Observable<Dataset[]> {
    let res = this.mockDatasets;
    if (convenio) {
      res = res.filter(d => d.convenio.includes(convenio));
    }
    return of(res).pipe(delay(400));
  }

  getDataset(codigo: string): Observable<Dataset | undefined> {
    return of(this.mockDatasets.find(d => d.codigo === codigo)).pipe(delay(300));
  }

  getCasosByDataset(datasetCodigo: string): Observable<Caso[]> {
    return of(this.mockCasos.filter(c => c.dataset === datasetCodigo)).pipe(delay(400));
  }

  getHistorialCorridas(convenio?: string): Observable<Corrida[]> {
    return of(this.mockCorridas).pipe(delay(500));
  }

  saveDataset(dataset: Partial<Dataset>): Observable<Dataset> {
    const ds = { ...dataset, codigo: dataset.codigo || 'DS-NEW' } as Dataset;
    this.mockDatasets.push(ds);
    return of(ds).pipe(delay(600));
  }

  saveCaso(caso: Partial<Caso>): Observable<Caso> {
    const c = { ...caso, codigo: caso.codigo || 'C-NEW' } as Caso;
    this.mockCasos.push(c);
    return of(c).pipe(delay(500));
  }
}
