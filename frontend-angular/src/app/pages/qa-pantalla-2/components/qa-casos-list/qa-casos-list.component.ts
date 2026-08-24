import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';
import { Caso } from '../../../../core/models/qa.model';

@Component({
  selector: 'app-qa-casos-list',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <div class="flex-align">
          <button mat-icon-button (click)="volver()" class="btn-back">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 class="titulo-hijo">Casos de Prueba</h2>
            <p class="subtitulo">Dataset seleccionado: <b>{{ datasetId }}</b></p>
          </div>
        </div>
        <button mat-flat-button color="primary" class="btn-accion" (click)="nuevoCaso()">
          <mat-icon>add</mat-icon> Nuevo Caso
        </button>
      </div>

      <div class="filtros">
        <mat-form-field appearance="outline" class="filtro-input">
          <mat-icon matPrefix>search</mat-icon>
          <mat-label>Buscar por código o descripción</mat-label>
          <input matInput [(ngModel)]="busqueda" (ngModelChange)="filtrarCasos()">
        </mat-form-field>
      </div>

      <mat-card class="tarjeta-principal">
        <mat-card-content class="p-0">
          <div class="table-container">
            <table mat-table [dataSource]="casosFiltrados" class="w-full">
              
              <ng-container matColumnDef="codigo">
                <th mat-header-cell *matHeaderCellDef> Código </th>
                <td mat-cell *matCellDef="let c"> <b>{{ c.codigo }}</b> </td>
              </ng-container>

              <ng-container matColumnDef="descripcion">
                <th mat-header-cell *matHeaderCellDef> Descripción </th>
                <td mat-cell *matCellDef="let c"> {{ c.descripcion }} </td>
              </ng-container>

              <ng-container matColumnDef="tipo">
                <th mat-header-cell *matHeaderCellDef> Tipo Dep. </th>
                <td mat-cell *matCellDef="let c"> 
                  <mat-chip-listbox>
                    <mat-chip color="accent" selected *ngIf="c.tipo_dependencia">{{ c.tipo_dependencia | titlecase }}</mat-chip>
                  </mat-chip-listbox>
                </td>
              </ng-container>

              <ng-container matColumnDef="estado">
                <th mat-header-cell *matHeaderCellDef> Estado (Último Run) </th>
                <td mat-cell *matCellDef="let c">
                  <span class="badge" [ngClass]="'badge-' + c.estado_ultimo_run">
                    <mat-icon class="icon-small">{{ getIconoEstado(c.estado_ultimo_run) }}</mat-icon>
                    {{ formatoEstado(c.estado_ultimo_run) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="acciones">
                <th mat-header-cell *matHeaderCellDef class="text-right"> Acciones </th>
                <td mat-cell *matCellDef="let c" class="text-right">
                  <button mat-icon-button color="primary" matTooltip="Duplicar" (click)="duplicar(c)">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Editar" (click)="editar(c.codigo)">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="fila-hover"></tr>
              
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell text-center p-4" colspan="5">No se encontraron casos.</td>
              </tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; }
    .flex-align { display: flex; align-items: center; gap: 16px; }
    .btn-back { background: #f1f5f9; color: #475569; border-radius: 8px; }
    .cabecera-hijo { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .titulo-hijo { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitulo { color: #64748b; margin: 0; font-size: 14px; }
    .btn-accion { height: 42px; border-radius: 12px; font-weight: 700; font-size: 14px; }
    
    .filtros { margin-bottom: 16px; display: flex; justify-content: flex-end; }
    .filtro-input { width: 300px; }

    .tarjeta-principal { border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; }
    .table-container { overflow-x: auto; }
    .w-full { width: 100%; }
    .p-0 { padding: 0 !important; }
    .p-4 { padding: 1.5rem !important; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .fila-hover:hover { background-color: #f8fafc; }
    
    th.mat-header-cell { font-weight: 700; color: #475569; font-size: 13px; text-transform: uppercase; background: #f8fafc; }
    td.mat-cell { padding: 12px 16px; vertical-align: middle; }
    
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
    .icon-small { font-size: 16px; width: 16px; height: 16px; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-revision_manual { background: #fef9c3; color: #854d0e; }
  `]
})
export class QaCasosListComponent implements OnInit {
  @Input() params: any = {};
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  datasetId = '';
  casos: Caso[] = [];
  casosFiltrados: Caso[] = [];
  busqueda = '';
  displayedColumns: string[] = ['codigo', 'descripcion', 'tipo', 'estado', 'acciones'];

  constructor(private qaService: QaService) {}

  ngOnInit(): void {
    if (this.params?.datasetId) {
      this.datasetId = this.params.datasetId;
      this.cargarCasos();
    } else {
      this.volver();
    }
  }

  cargarCasos(): void {
    this.qaService.getCasosByDataset(this.datasetId).subscribe(data => {
      this.casos = data;
      this.casosFiltrados = data;
    });
  }

  filtrarCasos(): void {
    const q = this.busqueda.toLowerCase();
    this.casosFiltrados = this.casos.filter(c => 
      c.codigo.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q)
    );
  }

  volver(): void {
    this.cambiarVista.emit({ vista: 'datasets-list' });
  }

  nuevoCaso(): void {
    this.cambiarVista.emit({ vista: 'caso-form', params: { datasetId: this.datasetId, isEdit: false } });
  }

  editar(codigo: string): void {
    this.cambiarVista.emit({ vista: 'caso-form', params: { datasetId: this.datasetId, isEdit: true, codigo } });
  }

  duplicar(caso: Caso): void {
    // Clonar para el nuevo dataset o misma base
    this.cambiarVista.emit({ vista: 'caso-form', params: { datasetId: this.datasetId, isEdit: false, clonedFrom: caso } });
  }

  getIconoEstado(estado: string | undefined): string {
    switch (estado) {
      case 'pass': return 'check_circle';
      case 'fail': return 'cancel';
      case 'revision_manual': return 'rule';
      default: return 'help_outline';
    }
  }

  formatoEstado(estado: string | undefined): string {
    if (!estado) return 'N/A';
    return estado.replace('_', ' ');
  }
}
