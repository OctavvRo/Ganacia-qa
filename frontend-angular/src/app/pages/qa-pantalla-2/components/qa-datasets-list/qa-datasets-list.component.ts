import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';
import { Dataset } from '../../../../core/models/qa.model';

@Component({
  selector: 'app-qa-datasets-list',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <div>
          <h2 class="titulo-hijo">Gestión de Datasets</h2>
          <p class="subtitulo">Administra los conjuntos de datos base para la suite de regresión.</p>
        </div>
        <button mat-flat-button color="primary" class="btn-accion" (click)="nuevoDataset()">
          <mat-icon>add</mat-icon> Nuevo Dataset
        </button>
      </div>

      <mat-card class="tarjeta-principal">
        <mat-card-content class="p-0">
          <div class="table-container">
            <table mat-table [dataSource]="datasets" class="w-full">
              
              <!-- Convenio Column -->
              <ng-container matColumnDef="convenio">
                <th mat-header-cell *matHeaderCellDef> Convenio </th>
                <td mat-cell *matCellDef="let ds">
                  <div class="fw-bold">{{ ds.convenio }}</div>
                  <div class="text-small text-muted">{{ ds.codigo }}</div>
                </td>
              </ng-container>

              <!-- Período Column -->
              <ng-container matColumnDef="periodo">
                <th mat-header-cell *matHeaderCellDef> Período </th>
                <td mat-cell *matCellDef="let ds"> {{ ds.periodo }} </td>
              </ng-container>

              <!-- Vigencia Column -->
              <ng-container matColumnDef="vigencia">
                <th mat-header-cell *matHeaderCellDef> Vigencia </th>
                <td mat-cell *matCellDef="let ds">
                  {{ ds.vigencia.desde }} a {{ ds.vigencia.hasta || 'Actualidad' }}
                </td>
              </ng-container>

              <!-- Estado Column -->
              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef> Estado </th>
                <td mat-cell *matCellDef="let ds">
                  <span class="badge" [ngClass]="'badge-' + ds.estado">
                    {{ ds.estado | titlecase }}
                  </span>
                </td>
              </ng-container>

              <!-- Casos Column -->
              <ng-container matColumnDef="casos">
                <th mat-header-cell *matHeaderCellDef> Casos </th>
                <td mat-cell *matCellDef="let ds"> {{ ds.cantidad_casos || 0 }} </td>
              </ng-container>

              <!-- Acciones Column -->
              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
                <td mat-cell *matCellDef="let ds" class="text-right">
                  <button mat-icon-button color="primary" matTooltip="Ver Casos" (click)="verCasos(ds.codigo)">
                    <mat-icon>list_alt</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Editar Dataset" (click)="editarDataset(ds.codigo)">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="fila-hover"></tr>
              
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell text-center p-4" colspan="6">No hay datasets cargados.</td>
              </tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; }
    .cabecera-hijo { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .titulo-hijo { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitulo { color: #64748b; margin: 0; font-size: 14px; }
    .btn-accion { height: 42px; border-radius: 12px; font-weight: 700; font-size: 14px; background: #2563eb; color: #fff; }
    .tarjeta-principal { border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; }
    .table-container { overflow-x: auto; }
    .w-full { width: 100%; }
    .p-0 { padding: 0 !important; }
    .p-4 { padding: 1.5rem !important; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .fw-bold { font-weight: 700; color: #1e293b; }
    .text-small { font-size: 12px; }
    .text-muted { color: #64748b; }
    .fila-hover:hover { background-color: #f8fafc; }
    th.mat-header-cell { font-weight: 700; color: #475569; font-size: 13px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 12px 16px; }
    td.mat-cell { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    
    .badge { padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; }
    .badge-vigente { background: #dcfce7; color: #166534; }
    .badge-borrador { background: #fef9c3; color: #854d0e; }
    .badge-validado { background: #dbeafe; color: #1e40af; }
    .badge-dado_de_baja { background: #f1f5f9; color: #475569; }
  `]
})
export class QaDatasetsListComponent implements OnInit {
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();
  
  datasets: Dataset[] = [];
  displayedColumns: string[] = ['convenio', 'periodo', 'vigencia', 'estado', 'casos', 'acciones'];

  constructor(private qaService: QaService) {}

  ngOnInit(): void {
    this.cargarDatasets();
  }

  cargarDatasets(): void {
    this.qaService.getDatasets().subscribe(data => {
      this.datasets = data;
    });
  }

  nuevoDataset(): void {
    this.cambiarVista.emit({ vista: 'dataset-form', params: { isEdit: false } });
  }

  editarDataset(codigo: string): void {
    this.cambiarVista.emit({ vista: 'dataset-form', params: { isEdit: true, codigo } });
  }

  verCasos(codigo: string): void {
    this.cambiarVista.emit({ vista: 'casos-list', params: { datasetId: codigo } });
  }
}
