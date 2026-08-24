import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-qa-historial',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <h2 class="titulo-hijo">Historial de Corridas</h2>
        <p class="subtitulo">Registro temporal de ejecuciones de la suite de regresión.</p>
      </div>

      <div class="timeline">
        
        <div class="timeline-item" *ngFor="let run of corridas">
          <div class="timeline-punto" [ngClass]="'punto-' + run.estado"></div>
          
          <mat-card class="timeline-card">
            <div class="card-header">
              <div class="run-meta">
                <span class="run-id">{{ run.id }}</span>
                <span class="run-fecha">{{ run.fecha | date:'medium' }}</span>
              </div>
              <span class="badge" [ngClass]="'badge-' + run.estado">{{ formatoEstado(run.estado) }}</span>
            </div>
            
            <div class="card-body">
              <div class="dataset-flow">
                <div class="dataset-pill base" matTooltip="Dataset Base">
                  <mat-icon>source</mat-icon> {{ run.dataset_anterior }}
                </div>
                <div class="arrow">
                  <mat-icon>arrow_forward</mat-icon>
                </div>
                <div class="dataset-pill target" matTooltip="Dataset Validado">
                  <mat-icon>fact_check</mat-icon> {{ run.dataset_nuevo }}
                </div>
              </div>
              
              <div class="run-stats">
                <div class="stat-item" matTooltip="Total Casos">
                  <mat-icon>list_alt</mat-icon> {{ run.resumen.total }}
                </div>
                <div class="stat-item text-success" matTooltip="Exitosos">
                  <mat-icon>check_circle</mat-icon> {{ run.resumen.pass }}
                </div>
                <div class="stat-item text-warn" matTooltip="Revisión Manual">
                  <mat-icon>rule</mat-icon> {{ run.resumen.revision_manual }}
                </div>
                <div class="stat-item text-danger" matTooltip="Fallos">
                  <mat-icon>cancel</mat-icon> {{ run.resumen.fail_regresion + run.resumen.fail_migracion }}
                </div>
              </div>
            </div>
            
            <div class="card-footer">
              <div class="disparador">
                <mat-icon>account_circle</mat-icon>
                <span>Disparado por <b>{{ run.disparado_por }}</b></span>
              </div>
              <button mat-button color="primary" (click)="verDetalle(run.id)">Ver Resultados</button>
            </div>
          </mat-card>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; max-width: 900px; margin: 0 auto; }
    .cabecera-hijo { margin-bottom: 24px; text-align: center; }
    .titulo-hijo { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .subtitulo { color: #64748b; font-size: 15px; margin: 0; }
    
    .timeline { position: relative; padding-left: 32px; margin-top: 24px; }
    .timeline::before { content: ''; position: absolute; left: 11px; top: 0; bottom: 0; width: 2px; background: #e2e8f0; }
    
    .timeline-item { position: relative; margin-bottom: 32px; }
    
    .timeline-punto { position: absolute; left: -32px; top: 24px; width: 24px; height: 24px; border-radius: 50%; border: 4px solid #fff; box-shadow: 0 0 0 1px #cbd5e1; z-index: 1; }
    .punto-completado { background: #3b82f6; border-color: #dbeafe; }
    .punto-bloqueado { background: #ef4444; border-color: #fee2e2; }
    .punto-en_progreso { background: #eab308; border-color: #fef9c3; animation: pulse 2s infinite; }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
      100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
    }
    
    .timeline-card { border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    
    .card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #fafafa; border-radius: 16px 16px 0 0; }
    .run-meta { display: flex; align-items: center; gap: 12px; }
    .run-id { font-family: monospace; font-weight: 700; color: #0f172a; font-size: 15px; }
    .run-fecha { color: #64748b; font-size: 13px; }
    
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-completado { background: #dbeafe; color: #1e40af; }
    .badge-bloqueado { background: #fee2e2; color: #991b1b; }
    .badge-en_progreso { background: #fef9c3; color: #854d0e; }
    
    .card-body { padding: 20px; display: flex; justify-content: space-between; align-items: center; }
    @media (max-width: 640px) { .card-body { flex-direction: column; align-items: flex-start; gap: 20px; } }
    
    .dataset-flow { display: flex; align-items: center; gap: 8px; }
    .dataset-pill { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid #e2e8f0; }
    .dataset-pill mat-icon { font-size: 16px; width: 16px; height: 16px; opacity: 0.7; }
    .dataset-pill.base { background: #f8fafc; color: #475569; }
    .dataset-pill.target { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
    
    .arrow mat-icon { color: #94a3b8; }
    
    .run-stats { display: flex; gap: 16px; }
    .stat-item { display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 15px; color: #475569; }
    .stat-item mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .text-success { color: #16a34a; }
    .text-warn { color: #d97706; }
    .text-danger { color: #dc2626; }
    
    .card-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid #f1f5f9; background: #fff; border-radius: 0 0 16px 16px; }
    .disparador { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px; }
    .disparador mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .disparador b { color: #1e293b; }
  `]
})
export class QaHistorialComponent implements OnInit {
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  corridas = [
    {
      id: 'RUN-1235',
      dataset_anterior: 'DS-COM-0726',
      dataset_nuevo: 'DS-COM-0826',
      fecha: '2026-08-15T14:30:00Z',
      disparado_por: 'Admin',
      estado: 'completado',
      resumen: { total: 45, pass: 42, fail_regresion: 1, fail_migracion: 0, revision_manual: 2 }
    },
    {
      id: 'RUN-1234',
      dataset_anterior: 'DS-COM-0626',
      dataset_nuevo: 'DS-COM-0726',
      fecha: '2026-07-02T10:00:00Z',
      disparado_por: 'QA Auto',
      estado: 'completado',
      resumen: { total: 45, pass: 45, fail_regresion: 0, fail_migracion: 0, revision_manual: 0 }
    },
    {
      id: 'RUN-1100',
      dataset_anterior: 'DS-UOC-0426',
      dataset_nuevo: 'DS-UOC-0526',
      fecha: '2026-05-10T09:15:00Z',
      disparado_por: 'QA Auto',
      estado: 'bloqueado',
      resumen: { total: 120, pass: 90, fail_regresion: 30, fail_migracion: 0, revision_manual: 0 }
    }
  ];

  ngOnInit(): void {}

  formatoEstado(estado: string): string {
    return estado.replace('_', ' ');
  }

  verDetalle(runId: string): void {
    this.cambiarVista.emit({ vista: 'resultado-corrida', params: { runId } });
  }
}
