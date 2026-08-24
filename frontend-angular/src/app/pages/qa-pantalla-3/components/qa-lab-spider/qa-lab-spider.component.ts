import { Component } from '@angular/core';
import { QaService } from '../../../../core/services/qa.service';

@Component({
  selector: 'app-qa-lab-spider',
  template: `
    <div class="lab-panel">
      <div class="panel-header">
        <h2 class="panel-title"><mat-icon class="title-icon spider">bug_report</mat-icon> Spider QA — Exploración Automática</h2>
        <p class="panel-desc">Un crawler inteligente que recorre la aplicación completa, detecta errores de consola, problemas de accesibilidad y genera un mapa de salud del sistema.</p>
      </div>
      <div class="config-grid">
        <div class="config-card">
          <label class="config-label">Secciones a explorar</label>
          <div class="checkbox-group">
            <mat-checkbox [(ngModel)]="seccionesMap.inicio" color="primary">Inicio</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.cargarExcel" color="primary">Cargar Excel</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.analisis" color="primary">Análisis</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.calculo" color="primary">Cálculo</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.diagnosticos" color="primary">Diagnósticos</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.historial" color="primary">Historial</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.configuracion" color="primary">Configuración</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.pantalla1" color="primary">QA Pantalla 1</mat-checkbox>
            <mat-checkbox [(ngModel)]="seccionesMap.pantalla2" color="primary">QA Pantalla 2</mat-checkbox>
          </div>
          <button mat-stroked-button class="btn-todas" (click)="seleccionarTodas()">Seleccionar todas</button>
        </div>
        <div class="config-card">
          <label class="config-label">Agresividad</label>
          <div class="agresividad-cards">
            <div class="agr-card" [class.selected]="agresividad === 'suave'" (click)="agresividad = 'suave'">
              <mat-icon>visibility</mat-icon><b>Suave</b><span>Navega y toma capturas</span>
            </div>
            <div class="agr-card" [class.selected]="agresividad === 'media'" (click)="agresividad = 'media'">
              <mat-icon>edit</mat-icon><b>Media</b><span>Llena formularios con datos aleatorios</span>
            </div>
            <div class="agr-card" [class.selected]="agresividad === 'extrema'" (click)="agresividad = 'extrema'">
              <mat-icon>warning</mat-icon><b>Extrema</b><span>XSS, unicode, strings kilométricos</span>
            </div>
          </div>
        </div>
      </div>
      <button mat-flat-button class="btn-ejecutar" [disabled]="ejecutando || seccionesSeleccionadas.length === 0" (click)="ejecutar()">
        <mat-icon *ngIf="!ejecutando">pest_control</mat-icon>
        <span *ngIf="ejecutando" class="spinner"></span>
        {{ ejecutando ? 'Explorando...' : 'Lanzar Spider' }}
      </button>

      <!-- Resultado Estructurado -->
      <div *ngIf="resultado && reporteEstructurado" class="reporte-rich">
        <div class="reporte-header">
          <mat-icon>health_and_safety</mat-icon>
          <h3>Reporte de Salud del Sistema</h3>
          <span class="reporte-duracion">{{ (resultado.duracion_ms / 1000).toFixed(1) }}s</span>
        </div>
        
        <div class="impacto-cards">
          <div class="impacto-card">
            <mat-icon>explore</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Páginas Visitadas</span>
              <span class="impacto-valor">{{ reporteEstructurado.paginas_visitadas.length }} / {{ reporteEstructurado.rutas_evaluadas.length }}</span>
            </div>
          </div>
          <div class="impacto-card" [class.destacado]="reporteEstructurado.errores_consola.length > 0">
            <mat-icon>terminal</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Errores JS / Consola</span>
              <span class="impacto-valor" [class.rojo-texto]="reporteEstructurado.errores_consola.length > 0">{{ reporteEstructurado.errores_consola.length }}</span>
            </div>
          </div>
          <div class="impacto-card" [class.destacado]="reporteEstructurado.errores_red.length > 0">
            <mat-icon>wifi_off</mat-icon>
            <div class="impacto-data">
              <span class="impacto-label">Errores de Red (HTTP)</span>
              <span class="impacto-valor" [class.rojo-texto]="reporteEstructurado.errores_red.length > 0">{{ reporteEstructurado.errores_red.length }}</span>
            </div>
          </div>
        </div>

        <div class="spider-secciones">
          <!-- Performance -->
          <div class="spider-seccion">
            <h4>Métricas de Carga</h4>
            <div class="metricas-list">
              <div *ngFor="let metric of reporteEstructurado.metricas_performance" class="metrica-row">
                <span class="ruta-badge">{{ metric.ruta }}</span>
                <span class="tiempo-badge" [class.lento]="metric.loadTimeMs > 2000">{{ metric.loadTimeMs }}ms</span>
              </div>
            </div>
          </div>
          
          <!-- Errores -->
          <div class="spider-seccion" *ngIf="reporteEstructurado.errores_consola.length > 0 || reporteEstructurado.errores_red.length > 0">
            <h4>Registro de Errores</h4>
            <div class="errores-list">
              <div *ngFor="let err of reporteEstructurado.errores_consola" class="error-item consola">
                <mat-icon>javascript</mat-icon> <span>{{ err }}</span>
              </div>
              <div *ngFor="let err of reporteEstructurado.errores_red" class="error-item red">
                <mat-icon>cloud_off</mat-icon> <span>{{ err }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Log crudo (si falla o si se desea ver) -->
      <div *ngIf="resultado && !reporteEstructurado" class="resultado-container" [class.verde]="resultado.estado === 'verde'" [class.rojo]="resultado.estado === 'rojo'">
        <div class="resultado-header">
          <mat-icon>health_and_safety</mat-icon>
          <span class="resultado-titulo">Error o Logs crudos</span>
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
    .title-icon.spider { color: #f59e0b; }
    .panel-desc { color: #64748b; font-size: 14px; margin: 0; line-height: 1.6; max-width: 680px; }
    .config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .config-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .config-label { display: block; font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .checkbox-group { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 12px; }
    .btn-todas { font-size: 12px; font-weight: 700; }
    .agresividad-cards { display: flex; flex-direction: column; gap: 8px; }
    .agr-card { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; border: 2px solid #e2e8f0; transition: all 0.15s; }
    .agr-card:hover { border-color: #cbd5e1; background: #f8fafc; }
    .agr-card.selected { border-color: #f59e0b; background: #fffbeb; }
    .agr-card mat-icon { font-size: 20px; width: 20px; height: 20px; color: #94a3b8; }
    .agr-card.selected mat-icon { color: #f59e0b; }
    .agr-card b { font-size: 13px; color: #0f172a; }
    .agr-card span { font-size: 11px; color: #64748b; margin-left: auto; }
    .btn-ejecutar { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 800; font-size: 14px; padding: 0 28px; height: 48px; border-radius: 12px; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3); transition: transform 0.15s, box-shadow 0.15s; }
    .btn-ejecutar:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(245, 158, 11, 0.4); }
    .btn-ejecutar:disabled { opacity: 0.5; }
    .btn-ejecutar mat-icon { margin-right: 8px; }
    .spinner { display: inline-block; width: 16px; height: 16px; margin-right: 8px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* Nuevos Estilos del Reporte Rich */
    .reporte-rich { margin-top: 24px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .reporte-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .reporte-header mat-icon { color: #f59e0b; font-size: 28px; width: 28px; height: 28px; }
    .reporte-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    .reporte-duracion { margin-left: auto; font-size: 12px; font-weight: 700; color: #64748b; padding: 4px 10px; background: #f1f5f9; border-radius: 999px; }
    
    .impacto-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .impacto-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .impacto-card mat-icon { font-size: 24px; width: 24px; height: 24px; color: #64748b; }
    .impacto-card.destacado { background: #fef2f2; border-color: #fca5a5; }
    .impacto-card.destacado mat-icon { color: #ef4444; }
    .impacto-data { display: flex; flex-direction: column; }
    .impacto-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .impacto-valor { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px; }
    .impacto-valor.rojo-texto { color: #ef4444; }
    
    .spider-secciones { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .spider-seccion h4 { margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #334155; }
    .metricas-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .metrica-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .ruta-badge { font-size: 12px; font-weight: 700; color: #334155; font-family: monospace; }
    .tiempo-badge { font-size: 12px; font-weight: 800; color: #22c55e; }
    .tiempo-badge.lento { color: #eab308; }
    
    .errores-list { display: flex; flex-direction: column; gap: 8px; }
    .error-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-family: monospace; }
    .error-item mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .error-item.consola { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
    .error-item.red { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    
    .resultado-container { margin-top: 24px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .resultado-container.verde { border-color: #22c55e; }
    .resultado-container.rojo { border-color: #ef4444; }
    .resultado-header { display: flex; align-items: center; gap: 10px; padding: 14px 20px; font-weight: 700; font-size: 14px; background: #fef2f2; color: #991b1b; }
    .resultado-duracion { margin-left: auto; font-size: 12px; opacity: 0.7; }
    .resultado-log { margin: 0; padding: 16px 20px; background: #0f172a; color: #94a3b8; font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; max-height: 400px; overflow-y: auto; }
    @media (max-width: 768px) { .config-grid { grid-template-columns: 1fr; } }
  `]
})
export class QaLabSpiderComponent {
  agresividad: 'suave' | 'media' | 'extrema' = 'suave';
  ejecutando = false;
  resultado: any = null;
  reporteEstructurado: any = null;
  
  seccionesMap = {
    inicio: true, cargarExcel: true, analisis: true, calculo: true,
    diagnosticos: true, historial: true, configuracion: true,
    pantalla1: true, pantalla2: true
  };
  private seccionRoutes: {[key: string]: string} = {
    inicio: '/inicio', cargarExcel: '/cargar-excel', analisis: '/analisis',
    calculo: '/calculo', diagnosticos: '/diagnosticos', historial: '/historial',
    configuracion: '/configuracion', pantalla1: '/qa/pantalla-1', pantalla2: '/qa/pantalla-2'
  };

  get seccionesSeleccionadas(): string[] {
    return (Object.entries(this.seccionesMap) as [string, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => this.seccionRoutes[k]);
  }

  constructor(private qaService: QaService) {}

  seleccionarTodas() {
    (Object.keys(this.seccionesMap) as Array<keyof typeof this.seccionesMap>).forEach(k => {
      this.seccionesMap[k] = true;
    });
  }

  ejecutar() {
    this.ejecutando = true;
    this.resultado = null;
    this.reporteEstructurado = null;
    
    this.qaService.runLabSpider(this.seccionesSeleccionadas, this.agresividad).subscribe({
      next: (res) => { 
        this.ejecutando = false; 
        this.resultado = res; 
        
        const match = res.stdout?.match(/===JSON_REPORT_START===\n([\s\S]*?)\n===JSON_REPORT_END===/);
        if (match) {
          try {
            this.reporteEstructurado = JSON.parse(match[1]);
          } catch (e) {
            console.error('Error parseando JSON de spider', e);
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
