import { Component } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';

@Component({
  selector: 'app-qa-lab-mutacion',
  template: `
    <div class="lab-panel">
      <div class="panel-header">
        <h2 class="panel-title"><mat-icon class="title-icon mutation">biotech</mat-icon> Pruebas de Mutación</h2>
        <p class="panel-desc">Toma los casos QA existentes, muta sus variables de entrada y verifica que el motor reacciona correctamente a cada cambio.</p>
      </div>
      <div class="config-grid">
        <div class="config-card">
          <label class="config-label">Dataset</label>
          <mat-form-field appearance="outline" class="config-field">
            <mat-select [(value)]="datasetCodigo" placeholder="Seleccionar dataset">
              <mat-option value="DS-COM-0726">DS-COM-0726 (Jul 2026)</mat-option>
              <mat-option value="DS-COM-0826">DS-COM-0826 (Ago 2026)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="config-card">
          <label class="config-label">Estrategia de Mutación</label>
          <mat-form-field appearance="outline" class="config-field">
            <mat-select [(value)]="estrategia" placeholder="Seleccionar estrategia">
              <mat-option value="extremos">Extremos (0, negativos, máximos)</mat-option>
              <mat-option value="incrementales">Incrementales (variación %)</mat-option>
              <mat-option value="combinatoria">Combinatoria (cruza 2 variables)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="config-card" *ngIf="estrategia === 'incrementales'">
          <label class="config-label">Variación (%)</label>
          <mat-form-field appearance="outline" class="config-field">
            <input matInput type="number" [(ngModel)]="variacion" min="1" max="100" placeholder="10">
          </mat-form-field>
        </div>
      </div>
      <button mat-flat-button class="btn-ejecutar" [disabled]="ejecutando || !datasetCodigo" (click)="ejecutar()">
        <mat-icon *ngIf="!ejecutando">play_circle_filled</mat-icon>
        <span *ngIf="ejecutando" class="spinner"></span>
        {{ ejecutando ? 'Mutando casos...' : 'Lanzar Mutaciones' }}
      </button>

      <!-- Resultado Estructurado -->
      <div *ngIf="resultado && reporteEstructurado" class="reporte-rich">
        <div class="reporte-header" [class.exito]="resultado.estado === 'verde'" [class.peligro]="resultado.estado === 'rojo'">
          <mat-icon>{{ resultado.estado === 'verde' ? 'verified_user' : 'bug_report' }}</mat-icon>
          <h3>Resumen de Mutaciones</h3>
          <span class="reporte-duracion">{{ (resultado.duracion_ms / 1000).toFixed(1) }}s</span>
        </div>
        
        <div class="reporte-stats">
          <div class="stat-box">
            <label>Estrategia</label>
            <strong>{{ reporteEstructurado.estrategia }}</strong>
          </div>
          <div class="stat-box">
            <label>Mutaciones Realizadas</label>
            <strong>{{ reporteEstructurado.resultados.length }}</strong>
          </div>
        </div>
        
        <div class="mutaciones-grid">
          <div *ngFor="let res of reporteEstructurado.resultados" class="mutacion-card">
            <div class="mut-card-header">
              <span class="caso-badge">{{ res.caso_original }}</span>
              <span class="estado-badge">{{ res.estado }}</span>
            </div>
            <p class="mut-desc">{{ res.mutacion }}</p>
            <div class="mut-datos">
              <div *ngFor="let key of getObjectKeys(res.datos_inyectados)" class="dato-row">
                <small>{{ key }}</small>
                <strong>{{ res.datos_inyectados[key] }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Log crudo (si falla o si se desea ver) -->
      <div *ngIf="resultado && !reporteEstructurado" class="resultado-container" [class.verde]="resultado.estado === 'verde'" [class.rojo]="resultado.estado === 'rojo'">
        <div class="resultado-header">
          <mat-icon *ngIf="resultado.estado === 'verde'">check_circle</mat-icon>
          <mat-icon *ngIf="resultado.estado === 'rojo'">error</mat-icon>
          <span class="resultado-titulo">{{ resultado.estado === 'verde' ? 'Motor robusto' : 'Se encontraron debilidades' }}</span>
          <span class="resultado-duracion" *ngIf="resultado.duracion_ms">{{ (resultado.duracion_ms / 1000).toFixed(1) }}s</span>
        </div>
        <pre class="resultado-log">{{ resultado.stdout }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .lab-panel { max-width: 1100px; margin: 0 auto; }
    .panel-header { margin-bottom: 24px; }
    .panel-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 8px; }
    .title-icon { font-size: 28px; width: 28px; height: 28px; }
    .title-icon.mutation { color: #7c3aed; }
    .panel-desc { color: #64748b; font-size: 14px; margin: 0; line-height: 1.6; max-width: 600px; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .config-card { background: white; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .config-label { display: block; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .config-field { width: 100%; }
    .btn-ejecutar { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; font-weight: 800; font-size: 14px; padding: 0 28px; height: 48px; border-radius: 12px; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3); transition: transform 0.15s, box-shadow 0.15s; }
    .btn-ejecutar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124, 58, 237, 0.4); }
    .btn-ejecutar:disabled { opacity: 0.5; }
    .btn-ejecutar mat-icon { margin-right: 8px; }
    .spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Nuevos Estilos del Reporte Rich */
    .reporte-rich { margin-top: 24px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .reporte-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .reporte-header.exito mat-icon { color: #22c55e; }
    .reporte-header.peligro mat-icon { color: #ef4444; }
    .reporte-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    .reporte-duracion { margin-left: auto; font-size: 12px; font-weight: 700; color: #64748b; padding: 4px 10px; background: #f1f5f9; border-radius: 999px; }
    
    .reporte-stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-box { flex: 1; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    .stat-box label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .stat-box strong { font-size: 20px; font-weight: 900; color: #7c3aed; text-transform: capitalize; }
    
    .mutaciones-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .mutacion-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
    .mut-card-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .caso-badge { background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; }
    .estado-badge { background: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
    .mut-desc { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px; line-height: 1.4; }
    .mut-datos { background: #f8fafc; border-radius: 8px; padding: 12px; flex-grow: 1; border: 1px solid #f1f5f9; }
    .dato-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .dato-row:last-child { border-bottom: none; }
    .dato-row small { color: #64748b; font-size: 11px; font-weight: 600; font-family: monospace; }
    .dato-row strong { color: #334155; font-size: 13px; font-weight: 700; font-family: Consolas, monospace; }

    .resultado-container { margin-top: 24px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .resultado-container.verde { border-color: #22c55e; }
    .resultado-container.rojo { border-color: #ef4444; }
    .resultado-header { display: flex; align-items: center; gap: 10px; padding: 14px 20px; font-weight: 700; font-size: 14px; }
    .resultado-container.verde .resultado-header { background: #f0fdf4; color: #166534; }
    .resultado-container.rojo .resultado-header { background: #fef2f2; color: #991b1b; }
    .resultado-duracion { margin-left: auto; font-size: 12px; opacity: 0.7; }
    .resultado-log { margin: 0; padding: 16px 20px; background: #0f172a; color: #94a3b8; font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; max-height: 350px; overflow-y: auto; }
  `]
})
export class QaLabMutacionComponent {
  datasetCodigo = 'DS-COM-0826';
  estrategia: 'extremos' | 'incrementales' | 'combinatoria' = 'incrementales';
  variacion = 10;
  ejecutando = false;
  resultado: any = null;
  reporteEstructurado: any = null;

  constructor(private qaService: QaService) {}

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  ejecutar() {
    this.ejecutando = true;
    this.resultado = null;
    this.reporteEstructurado = null;
    
    this.qaService.runLabMutacion(this.datasetCodigo, this.estrategia, this.variacion).subscribe({
      next: (res) => { 
        this.ejecutando = false; 
        this.resultado = res; 
        
        const match = res.stdout?.match(/===JSON_REPORT_START===\n([\s\S]*?)\n===JSON_REPORT_END===/);
        if (match) {
          try {
            this.reporteEstructurado = JSON.parse(match[1]);
          } catch (e) {
            console.error('Error parseando JSON de mutacion', e);
          }
        }
      },
      error: (err) => {
        this.ejecutando = false;
        this.resultado = { estado: 'rojo', stdout: 'Error: ' + (err?.error?.message || err.message), duracion_ms: 0 };
      }
    });
  }
}
