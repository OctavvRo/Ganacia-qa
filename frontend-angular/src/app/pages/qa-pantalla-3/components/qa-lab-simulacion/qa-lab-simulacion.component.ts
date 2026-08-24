import { Component } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';

@Component({
  selector: 'app-qa-lab-simulacion',
  template: `
    <div class="lab-panel">
      <div class="panel-header">
        <h2 class="panel-title"><mat-icon class="title-icon simulacion">trending_up</mat-icon> Simulación de Cambio Normativo</h2>
        <p class="panel-desc">Modificá los parámetros normativos (escalas, deducciones, topes) y observá cómo impactaría a todos los casos de prueba existentes.</p>
      </div>
      <div class="parametros-grid">
        <div class="param-card">
          <div class="param-header"><mat-icon>account_balance</mat-icon><span>Mínimo No Imponible</span></div>
          <div class="param-row">
            <div class="param-actual"><label>Actual</label><span class="param-value">$ {{parametros.minimo_no_imponible | number}}</span></div>
            <mat-icon class="param-arrow">arrow_forward</mat-icon>
            <div class="param-nuevo"><label>Simulado</label>
              <mat-form-field appearance="outline" class="param-input"><input matInput type="number" [(ngModel)]="simulados.minimo_no_imponible"></mat-form-field>
            </div>
          </div>
        </div>
        <div class="param-card">
          <div class="param-header"><mat-icon>family_restroom</mat-icon><span>Deducción Cónyuge</span></div>
          <div class="param-row">
            <div class="param-actual"><label>Actual</label><span class="param-value">$ {{parametros.deduccion_conyuge | number}}</span></div>
            <mat-icon class="param-arrow">arrow_forward</mat-icon>
            <div class="param-nuevo"><label>Simulado</label>
              <mat-form-field appearance="outline" class="param-input"><input matInput type="number" [(ngModel)]="simulados.deduccion_conyuge"></mat-form-field>
            </div>
          </div>
        </div>
        <div class="param-card">
          <div class="param-header"><mat-icon>child_care</mat-icon><span>Deducción por Hijo</span></div>
          <div class="param-row">
            <div class="param-actual"><label>Actual</label><span class="param-value">$ {{parametros.deduccion_hijo | number}}</span></div>
            <mat-icon class="param-arrow">arrow_forward</mat-icon>
            <div class="param-nuevo"><label>Simulado</label>
              <mat-form-field appearance="outline" class="param-input"><input matInput type="number" [(ngModel)]="simulados.deduccion_hijo"></mat-form-field>
            </div>
          </div>
        </div>
        <div class="param-card">
          <div class="param-header"><mat-icon>work</mat-icon><span>Deducción Especial (4ta Cat.)</span></div>
          <div class="param-row">
            <div class="param-actual"><label>Actual</label><span class="param-value">$ {{parametros.deduccion_especial | number}}</span></div>
            <mat-icon class="param-arrow">arrow_forward</mat-icon>
            <div class="param-nuevo"><label>Simulado</label>
              <mat-form-field appearance="outline" class="param-input"><input matInput type="number" [(ngModel)]="simulados.deduccion_especial"></mat-form-field>
            </div>
          </div>
        </div>
        <div class="param-card full-width">
          <div class="param-header"><mat-icon>bar_chart</mat-icon><span>Tasa 1er Tramo Art. 94 (%)</span></div>
          <div class="param-row">
            <div class="param-actual"><label>Actual</label><span class="param-value">{{parametros.tasa_tramo1}}%</span></div>
            <mat-icon class="param-arrow">arrow_forward</mat-icon>
            <div class="param-nuevo"><label>Simulado</label>
              <mat-form-field appearance="outline" class="param-input"><input matInput type="number" [(ngModel)]="simulados.tasa_tramo1" min="0" max="100"></mat-form-field>
            </div>
          </div>
        </div>
      </div>
      <div class="dataset-selector">
        <label class="config-label">Dataset de referencia</label>
        <mat-form-field appearance="outline" class="config-field">
          <mat-select [(value)]="datasetCodigo">
            <mat-option value="DS-COM-0726">DS-COM-0726 (Jul 2026)</mat-option>
            <mat-option value="DS-COM-0826">DS-COM-0826 (Ago 2026)</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <button mat-flat-button class="btn-ejecutar" [disabled]="ejecutando" (click)="ejecutar()">
        <mat-icon *ngIf="!ejecutando">rocket_launch</mat-icon>
        <span *ngIf="ejecutando" class="spinner"></span>
        {{ ejecutando ? 'Simulando impacto...' : 'Simular Impacto Normativo' }}
      </button>
      
      <!-- Resultado Estructurado -->
      <div *ngIf="resultado && reporteEstructurado" class="reporte-rich">
        <div class="reporte-header">
          <mat-icon>insights</mat-icon>
          <h3>Reporte de Impacto Normativo</h3>
          <span class="reporte-duracion">{{ (resultado.duracion_ms / 1000).toFixed(1) }}s</span>
        </div>
        
        <div class="impacto-cards">
          <div class="impacto-card destacado">
            <mat-icon>warning</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Casos Afectados</span>
              <span class="impacto-valor">{{ reporteEstructurado.analisis.casos_afectados }}</span>
            </div>
          </div>
          <div class="impacto-card">
            <mat-icon>analytics</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Impacto Promedio</span>
              <span class="impacto-valor">{{ reporteEstructurado.analisis.impacto_promedio }}</span>
            </div>
          </div>
          <div class="impacto-card">
            <mat-icon>person_search</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Más Afectado</span>
              <span class="impacto-valor">{{ reporteEstructurado.analisis.caso_mas_afectado }}</span>
            </div>
          </div>
        </div>

        <div class="comparativa-container">
          <div class="comparativa-col baseline">
            <h4>Baseline (Actual)</h4>
            <div class="kpi-row"><span>Total Casos</span><strong>{{ reporteEstructurado.comparativa.baseline.total }}</strong></div>
            <div class="kpi-row pass"><span>Exitosos</span><strong>{{ reporteEstructurado.comparativa.baseline.pass }}</strong></div>
            <div class="kpi-row fail"><span>Fallos Regresión</span><strong>{{ reporteEstructurado.comparativa.baseline.fail_regresion }}</strong></div>
          </div>
          
          <div class="comparativa-arrow">
            <mat-icon>compare_arrows</mat-icon>
          </div>
          
          <div class="comparativa-col modificado">
            <h4>Simulado (Normativa Modificada)</h4>
            <div class="kpi-row"><span>Total Casos</span><strong>{{ reporteEstructurado.comparativa.modificado.total }}</strong></div>
            <div class="kpi-row pass" [class.peor]="reporteEstructurado.comparativa.modificado.pass < reporteEstructurado.comparativa.baseline.pass">
              <span>Exitosos</span><strong>{{ reporteEstructurado.comparativa.modificado.pass }}</strong>
            </div>
            <div class="kpi-row fail" [class.peor]="reporteEstructurado.comparativa.modificado.fail_regresion > reporteEstructurado.comparativa.baseline.fail_regresion">
              <span>Fallos Regresión</span><strong>{{ reporteEstructurado.comparativa.modificado.fail_regresion }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Log crudo (si falla o si se desea ver) -->
      <div *ngIf="resultado && !reporteEstructurado" class="resultado-container" [class.rojo]="resultado.estado === 'rojo'">
        <div class="resultado-header">
          <mat-icon>error</mat-icon>
          <span class="resultado-titulo">Error o Logs crudos</span>
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
    .title-icon.simulacion { color: #0ea5e9; }
    .panel-desc { color: #64748b; font-size: 14px; margin: 0; line-height: 1.6; max-width: 680px; }
    .parametros-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .param-card { background: white; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .param-card.full-width { grid-column: 1 / -1; }
    .param-header { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; color: #334155; margin-bottom: 12px; }
    .param-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: #0ea5e9; }
    .param-row { display: flex; align-items: center; gap: 12px; }
    .param-actual, .param-nuevo { flex: 1; }
    .param-actual label, .param-nuevo label { display: block; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .param-value { font-size: 16px; font-weight: 900; color: #0f172a; font-family: Consolas, monospace; }
    .param-arrow { color: #cbd5e1; font-size: 20px; width: 20px; height: 20px; }
    .param-input { width: 100%; }
    .dataset-selector { margin-bottom: 24px; }
    .config-label { display: block; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .config-field { width: 320px; }
    .btn-ejecutar { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; font-weight: 800; font-size: 14px; padding: 0 28px; height: 48px; border-radius: 12px; box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3); transition: transform 0.15s, box-shadow 0.15s; }
    .btn-ejecutar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(14, 165, 233, 0.4); }
    .btn-ejecutar:disabled { opacity: 0.5; }
    .btn-ejecutar mat-icon { margin-right: 8px; }
    .spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Nuevos Estilos del Reporte Rich */
    .reporte-rich { margin-top: 24px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .reporte-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .reporte-header mat-icon { color: #0ea5e9; font-size: 28px; width: 28px; height: 28px; }
    .reporte-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    .reporte-duracion { margin-left: auto; font-size: 12px; font-weight: 700; color: #64748b; padding: 4px 10px; background: #f1f5f9; border-radius: 999px; }
    
    .impacto-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .impacto-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .impacto-card mat-icon { font-size: 24px; width: 24px; height: 24px; color: #64748b; }
    .impacto-card.destacado { background: #fffbeb; border-color: #fde68a; }
    .impacto-card.destacado mat-icon { color: #d97706; }
    .impacto-data { display: flex; flex-direction: column; }
    .impacto-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .impacto-valor { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px; }

    .comparativa-container { display: flex; align-items: center; gap: 24px; background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
    .comparativa-col { flex: 1; }
    .comparativa-col h4 { margin: 0 0 16px; font-size: 14px; font-weight: 800; color: #334155; text-align: center; }
    .comparativa-arrow { color: #94a3b8; }
    .kpi-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; margin-bottom: 8px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #475569; }
    .kpi-row.pass { border-left: 4px solid #22c55e; }
    .kpi-row.fail { border-left: 4px solid #ef4444; }
    .kpi-row strong { font-size: 15px; color: #0f172a; }
    .kpi-row.peor { background: #fef2f2; border-color: #fecaca; }
    
    .resultado-container { margin-top: 24px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .resultado-container.rojo { border-color: #ef4444; }
    .resultado-header { display: flex; align-items: center; gap: 10px; padding: 14px 20px; font-weight: 700; font-size: 14px; background: #fef2f2; color: #991b1b; }
    .resultado-log { margin: 0; padding: 16px 20px; background: #0f172a; color: #94a3b8; font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
    @media (max-width: 768px) { .parametros-grid { grid-template-columns: 1fr; } .comparativa-container { flex-direction: column; } }
  `]
})
export class QaLabSimulacionComponent {
  datasetCodigo = 'DS-COM-0826';
  ejecutando = false;
  resultado: any = null;
  reporteEstructurado: any = null;
  
  parametros = { minimo_no_imponible: 3091035, deduccion_conyuge: 2911135, deduccion_hijo: 1468096, deduccion_especial: 14836968, tasa_tramo1: 5 };
  simulados = { minimo_no_imponible: 3500000, deduccion_conyuge: 3200000, deduccion_hijo: 1600000, deduccion_especial: 16000000, tasa_tramo1: 7 };

  constructor(private qaService: QaService) {}

  ejecutar() {
    this.ejecutando = true;
    this.resultado = null;
    this.reporteEstructurado = null;
    
    this.qaService.runLabSimulacion(this.datasetCodigo, this.simulados).subscribe({
      next: (res) => { 
        this.ejecutando = false; 
        this.resultado = res; 
        
        // Parsear JSON si viene incrustado en stdout
        const match = res.stdout?.match(/===JSON_REPORT_START===\n([\s\S]*?)\n===JSON_REPORT_END===/);
        if (match) {
          try {
            this.reporteEstructurado = JSON.parse(match[1]);
          } catch (e) {
            console.error('Error parseando JSON de reporte', e);
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
