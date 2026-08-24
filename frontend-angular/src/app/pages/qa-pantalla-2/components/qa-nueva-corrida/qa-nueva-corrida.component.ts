import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';
import { Dataset } from '../../../../core/models/qa.model';

@Component({
  selector: 'app-qa-nueva-corrida',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <h2 class="titulo-hijo">Ejecutar Suite de Regresión</h2>
        <p class="subtitulo">Selecciona los datasets para comparar los resultados del cálculo.</p>
      </div>

      <mat-card class="tarjeta-wizard">
        <mat-card-content class="wizard-grid">
          
          <div class="paso-columna">
            <div class="paso-header">
              <div class="paso-numero">1</div>
              <h3>Dataset Anterior (Base)</h3>
            </div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Seleccionar Dataset Base</mat-label>
              <mat-select [(value)]="dsAnterior" data-testid="select-ds-base">
                <mat-option *ngFor="let ds of datasets" [value]="ds.codigo">
                  {{ ds.codigo }} - {{ ds.convenio }} ({{ ds.periodo }})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="icono-flecha">
            <mat-icon>trending_flat</mat-icon>
          </div>

          <div class="paso-columna">
            <div class="paso-header">
              <div class="paso-numero">2</div>
              <h3>Dataset Nuevo (A Validar)</h3>
            </div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Seleccionar Dataset a Validar</mat-label>
              <mat-select [(value)]="dsNuevo" data-testid="select-ds-nuevo">
                <mat-option *ngFor="let ds of datasets" [value]="ds.codigo">
                  {{ ds.codigo }} - {{ ds.convenio }} ({{ ds.periodo }})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

        </mat-card-content>

        <div class="panel-confirmacion" *ngIf="dsAnterior && dsNuevo">
          <h3>Resumen de Corrida</h3>
          <p>Se ejecutarán <b>45 casos de prueba</b> correspondientes al dataset {{ dsNuevo }}.</p>
          <div class="alert-validacion" *ngIf="dsAnterior === dsNuevo">
            <mat-icon>warning</mat-icon> Estás seleccionando el mismo dataset para ambas bases.
          </div>
          
          <div class="acciones-wizard">
            <button mat-button (click)="cancelar()">Cancelar</button>
            <button mat-flat-button color="primary" [disabled]="dsAnterior === dsNuevo" (click)="ejecutar()">
              <mat-icon>play_arrow</mat-icon> Ejecutar Regresión
            </button>
          </div>
        </div>

      </mat-card>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; max-width: 900px; margin: 0 auto; }
    .cabecera-hijo { margin-bottom: 24px; text-align: center; }
    .titulo-hijo { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .subtitulo { color: #64748b; font-size: 15px; margin: 0; }
    
    .tarjeta-wizard { border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; }
    
    .wizard-grid { display: flex; align-items: center; justify-content: space-between; padding: 32px; gap: 20px; }
    @media (max-width: 768px) { .wizard-grid { flex-direction: column; } .icono-flecha { transform: rotate(90deg); margin: 20px 0; } }
    
    .paso-columna { flex: 1; min-width: 250px; }
    .w-full { width: 100%; }
    
    .paso-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .paso-numero { width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; }
    .paso-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
    
    .icono-flecha mat-icon { font-size: 40px; width: 40px; height: 40px; color: #cbd5e1; }
    
    .panel-confirmacion { background: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; }
    .panel-confirmacion h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #0f172a; }
    .panel-confirmacion p { color: #475569; margin: 0 0 20px; font-size: 14px; }
    
    .alert-validacion { display: flex; align-items: center; gap: 8px; color: #991b1b; background: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; font-size: 14px; }
    
    .acciones-wizard { display: flex; justify-content: flex-end; gap: 16px; }
    .acciones-wizard button { height: 42px; padding: 0 24px; border-radius: 8px; font-weight: 700; font-size: 14px; }
  `]
})
export class QaNuevaCorridaComponent implements OnInit {
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  datasets: Dataset[] = [];
  dsAnterior = '';
  dsNuevo = '';

  constructor(private qaService: QaService) {}

  ngOnInit(): void {
    this.qaService.getDatasets().subscribe(ds => this.datasets = ds);
  }

  cancelar(): void {
    this.cambiarVista.emit({ vista: 'datasets-list' });
  }

  ejecutar(): void {
    this.cambiarVista.emit({ vista: 'resultado-corrida', params: { runId: 'RUN-NEW' } });
  }
}
