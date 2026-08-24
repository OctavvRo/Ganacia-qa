import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-qa-cola-revision',
  template: `
    <div class="contenedor-hijo h-full">
      <div class="cabecera-hijo shrink-0">
        <h2 class="titulo-hijo">Cola de Revisión Manual</h2>
        <p class="subtitulo">Asienta el resultado esperado para los casos que requieren validación humana.</p>
      </div>

      <div class="revision-container">
        <!-- Lista de tareas -->
        <div class="lista-casos">
          <mat-card *ngFor="let caso of casosPendientes; let i = index" 
                   class="caso-card" 
                   [class.seleccionado]="casoSeleccionado === i"
                   (click)="seleccionarCaso(i)">
            <div class="card-header">
              <span class="badge badge-revision">Pendiente</span>
              <span class="dataset-ref">{{ caso.dataset }}</span>
            </div>
            <h3>{{ caso.codigo }}</h3>
            <p>{{ caso.descripcion }}</p>
          </mat-card>
          
          <div class="no-results" *ngIf="casosPendientes.length === 0">
            <mat-icon>task_alt</mat-icon>
            <p>No hay casos pendientes de revisión.</p>
          </div>
        </div>

        <!-- Panel de edición (solo visible si hay uno seleccionado) -->
        <div class="panel-edicion" *ngIf="casoSeleccionado !== null">
          <mat-card class="editor-card h-full">
            <mat-card-header>
              <mat-card-title>Asentar Resultado Esperado</mat-card-title>
              <mat-card-subtitle>
                {{ casosPendientes[casoSeleccionado].codigo }} - {{ casosPendientes[casoSeleccionado].descripcion }}
              </mat-card-subtitle>
            </mat-card-header>

            <mat-card-content class="pt-4 flex-col">
              <div class="diff-container flex-1">
                <div class="diff-columna">
                  <div class="diff-header">Contexto (Entrada)</div>
                  <pre>{{ casosPendientes[casoSeleccionado].entrada | json }}</pre>
                </div>
                <div class="diff-columna real">
                  <div class="diff-header">Resultado Arrojado por el Motor</div>
                  <pre>{{ casosPendientes[casoSeleccionado].resultado_real | json }}</pre>
                </div>
              </div>

              <div class="accion-asentar">
                <p>¿Validar este resultado devuelto por el motor como el nuevo <b>Esperado</b> para futuras regresiones?</p>
                <div class="botones">
                  <button mat-button color="warn" (click)="descartar()">Rechazar (Falla)</button>
                  <button mat-flat-button color="primary" (click)="aprobar()">Aprobar y Asentar</button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; }
    .h-full { height: 100%; min-height: 500px; }
    .shrink-0 { flex-shrink: 0; }
    .flex-1 { flex: 1; min-height: 0; }
    .flex-col { display: flex; flex-direction: column; }
    
    .cabecera-hijo { margin-bottom: 24px; }
    .titulo-hijo { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitulo { color: #64748b; margin: 0; font-size: 14px; }
    
    .revision-container { display: flex; gap: 24px; flex: 1; min-height: 0; }
    
    .lista-casos { width: 350px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 8px; flex-shrink: 0; }
    .caso-card { cursor: pointer; border: 2px solid transparent; transition: all 0.2s; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .caso-card:hover { border-color: #cbd5e1; }
    .caso-card.seleccionado { border-color: #2563eb; background: #eff6ff; }
    
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .badge-revision { background: #fef9c3; color: #854d0e; }
    .dataset-ref { font-size: 11px; color: #64748b; font-weight: 600; }
    
    .caso-card h3 { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #1e293b; }
    .caso-card p { margin: 0; font-size: 13px; color: #475569; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    
    .panel-edicion { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .editor-card { display: flex; flex-direction: column; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
    .pt-4 { padding-top: 16px; }
    
    .diff-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .diff-columna { background: #f8fafc; border-radius: 8px; display: flex; flex-direction: column; border: 1px solid #e2e8f0; }
    .diff-header { padding: 8px 12px; font-size: 12px; font-weight: 700; color: #475569; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
    .diff-columna.real .diff-header { background: #eff6ff; color: #1e40af; border-bottom-color: #bfdbfe; }
    .diff-columna pre { margin: 0; padding: 12px; font-family: 'Consolas', monospace; font-size: 13px; color: #1e293b; overflow: auto; flex: 1; }
    
    .accion-asentar { background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 20px; border: 1px solid #e2e8f0; text-align: center; }
    .accion-asentar p { margin: 0 0 16px; color: #334155; font-size: 15px; }
    .botones { display: flex; justify-content: center; gap: 16px; }
    .botones button { height: 42px; border-radius: 8px; font-weight: 600; padding: 0 24px; }
    
    .no-results { text-align: center; padding: 40px 20px; color: #94a3b8; }
    .no-results mat-icon { font-size: 40px; width: 40px; height: 40px; opacity: 0.5; margin-bottom: 12px; }
    .no-results p { margin: 0; font-size: 14px; font-weight: 600; }
  `]
})
export class QaColaRevisionComponent implements OnInit {
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  casosPendientes = [
    {
      dataset: 'DS-COM-0826',
      codigo: 'C-22',
      descripcion: 'Adicional por fallo de caja nuevo convenio',
      entrada: { sueldo_basico: 800000, categoria: 'Cajero' },
      resultado_real: { total_bruto: 900000, fallo_caja: 25000, antiguedad: 0 }
    },
    {
      dataset: 'DS-UOC-0926',
      codigo: 'U-05',
      descripcion: 'Cálculo de presentismo con 1 falta justificada',
      entrada: { dias_trabajados: 20, faltas: 1, justificada: true },
      resultado_real: { premio_presentismo: 15000, descuentos: 0 }
    }
  ];

  casoSeleccionado: number | null = null;

  ngOnInit(): void {
    if (this.casosPendientes.length > 0) {
      this.casoSeleccionado = 0;
    }
  }

  seleccionarCaso(index: number): void {
    this.casoSeleccionado = index;
  }

  aprobar(): void {
    if (this.casoSeleccionado !== null) {
      this.casosPendientes.splice(this.casoSeleccionado, 1);
      this.casoSeleccionado = this.casosPendientes.length > 0 ? 0 : null;
    }
  }

  descartar(): void {
    if (this.casoSeleccionado !== null) {
      this.casosPendientes.splice(this.casoSeleccionado, 1);
      this.casoSeleccionado = this.casosPendientes.length > 0 ? 0 : null;
    }
  }
}
