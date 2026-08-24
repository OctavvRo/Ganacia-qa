import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-qa-resultado-corrida',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-resultados">
        <button mat-icon-button class="btn-back" (click)="volver()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h2 class="titulo-hijo">Resultados: {{ runId }}</h2>
          <div class="meta-run">
            <span>Base: <b>DS-COM-0726</b></span>
            <mat-icon>arrow_right_alt</mat-icon>
            <span>Validando: <b>DS-COM-0826</b></span>
          </div>
        </div>
        <div class="acciones-top">
          <button mat-stroked-button (click)="verColaRevision()" *ngIf="resumen.revision_manual > 0">
            <mat-icon class="text-warn">rule</mat-icon> Ir a Revisión ({{resumen.revision_manual}})
          </button>
          <button mat-stroked-button color="primary" (click)="generarInforme()" style="margin-left: 8px;">
            <mat-icon>picture_as_pdf</mat-icon> Descargar PDF Detallado
          </button>
        </div>
      </div>

      <div class="kpis-grid">
        <div class="kpi-card" [class.activo]="filtro === 'todos'" (click)="setFiltro('todos')">
          <div class="kpi-valor">{{ resumen.total }}</div>
          <div class="kpi-label">Casos Totales</div>
        </div>
        <div class="kpi-card success" [class.activo]="filtro === 'pass'" (click)="setFiltro('pass')">
          <div class="kpi-valor">{{ resumen.pass }}</div>
          <div class="kpi-label">Exitosos</div>
        </div>
        <div class="kpi-card warning" [class.activo]="filtro === 'revision'" (click)="setFiltro('revision')">
          <div class="kpi-valor">{{ resumen.revision_manual }}</div>
          <div class="kpi-label">A Revisar</div>
        </div>
        <div class="kpi-card danger" [class.activo]="filtro === 'fail'" (click)="setFiltro('fail')">
          <div class="kpi-valor">{{ resumen.fail_regresion }}</div>
          <div class="kpi-label">Fallos Regresión</div>
        </div>
      </div>

      <div class="listado-resultados">
        <mat-accordion multi>
          <mat-expansion-panel *ngFor="let res of resultadosFiltrados" class="panel-resultado">
            <mat-expansion-panel-header [collapsedHeight]="'64px'" [expandedHeight]="'64px'">
              <mat-panel-title class="panel-titulo">
                <span class="dot-indicator" [ngClass]="'dot-' + res.estado"></span>
                <b>{{ res.caso.codigo }}</b>
                <span class="desc-caso">{{ res.caso.descripcion }}</span>
              </mat-panel-title>
              <mat-panel-description class="panel-desc">
                <span class="badge" [ngClass]="'badge-' + res.estado">{{ formatoEstado(res.estado) }}</span>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="diff-container">
              <div class="diff-columna esperado">
                <div class="diff-header">Resultado Esperado (Dataset Base)</div>
                <pre>{{ res.caso.esperado | json }}</pre>
              </div>
              <div class="diff-columna real">
                <div class="diff-header" [ngClass]="res.estado === 'pass' ? 'text-success' : 'text-danger'">
                  Resultado Real (Dataset Validado)
                </div>
                <pre>{{ res.resultado_real | json }}</pre>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
        
        <div class="no-results" *ngIf="resultadosFiltrados.length === 0">
          <mat-icon>check_circle_outline</mat-icon>
          <p>No hay casos en este estado.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; max-width: 1200px; margin: 0 auto; }
    .cabecera-resultados { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .btn-back { background: #f1f5f9; color: #475569; border-radius: 8px; }
    .titulo-hijo { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .meta-run { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; }
    .meta-run b { color: #1e293b; font-weight: 700; }
    .meta-run mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .acciones-top { margin-left: auto; }
    .text-warn { color: #d97706; }
    
    .kpis-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    @media (max-width: 768px) { .kpis-grid { grid-template-columns: 1fr 1fr; } }
    
    .kpi-card { background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: center; cursor: pointer; transition: transform 0.2s; border: 2px solid transparent; }
    .kpi-card:hover { transform: translateY(-2px); }
    .kpi-card.activo { border-color: #cbd5e1; background: #f8fafc; }
    .kpi-card.success.activo { border-color: #22c55e; background: #f0fdf4; }
    .kpi-card.warning.activo { border-color: #eab308; background: #fefce8; }
    .kpi-card.danger.activo { border-color: #ef4444; background: #fef2f2; }
    
    .kpi-valor { font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
    .kpi-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    
    .success .kpi-valor { color: #16a34a; }
    .warning .kpi-valor { color: #ca8a04; }
    .danger .kpi-valor { color: #dc2626; }
    
    .listado-resultados { margin-top: 24px; }
    .panel-resultado { margin-bottom: 12px !important; border-radius: 12px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.04) !important; overflow: hidden; }
    .panel-titulo { display: flex; align-items: center; gap: 12px; font-size: 14px; }
    .panel-titulo b { font-family: monospace; font-size: 14px; color: #1e293b; }
    .desc-caso { color: #64748b; }
    
    .dot-indicator { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot-pass { background: #22c55e; }
    .dot-fail_regresion { background: #ef4444; }
    .dot-revision_manual { background: #eab308; }
    
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; text-transform: uppercase; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail_regresion { background: #fee2e2; color: #991b1b; }
    .badge-revision_manual { background: #fef9c3; color: #854d0e; }
    
    .diff-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .diff-columna { background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    .diff-header { padding: 8px 12px; font-size: 12px; font-weight: 700; color: #475569; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
    .text-success { color: #166534; background: #dcfce7; border-bottom-color: #bbf7d0; }
    .text-danger { color: #991b1b; background: #fee2e2; border-bottom-color: #fecaca; }
    .diff-columna pre { margin: 0; padding: 12px; font-family: 'Consolas', monospace; font-size: 13px; color: #1e293b; white-space: pre-wrap; }
    
    .no-results { text-align: center; padding: 32px; color: #94a3b8; }
    .no-results mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; opacity: 0.5; }
    .no-results p { margin: 0; font-size: 15px; font-weight: 600; }
  `]
})
export class QaResultadoCorridaComponent implements OnInit {
  @Input() params: any = {};
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  runId = '';
  filtro: 'todos' | 'pass' | 'fail' | 'revision' = 'todos';
  
  resumen = {
    total: 45,
    pass: 42,
    revision_manual: 2,
    fail_regresion: 1
  };

  resultados = [
    {
      estado: 'pass',
      caso: { codigo: 'C-01', descripcion: 'Empleado basico Maestranza', esperado: { ganancia_neta: 500000, deducciones: 0 } },
      resultado_real: { ganancia_neta: 500000, deducciones: 0 }
    },
    {
      estado: 'fail_regresion',
      caso: { codigo: 'C-15', descripcion: 'Hora extra 100% finde', esperado: { total_bruto: 850000, hs_extras_exentas: 50000 } },
      resultado_real: { total_bruto: 850000, hs_extras_exentas: 45000 }
    },
    {
      estado: 'revision_manual',
      caso: { codigo: 'C-22', descripcion: 'Adicional por fallo de caja nuevo convenio', esperado: null },
      resultado_real: { total_bruto: 900000, fallo_caja: 25000 }
    }
  ];

  resultadosFiltrados = this.resultados;

  ngOnInit(): void {
    this.runId = this.params?.runId || 'RUN-NEW';
  }

  setFiltro(f: 'todos' | 'pass' | 'fail' | 'revision') {
    this.filtro = f;
    if (f === 'todos') {
      this.resultadosFiltrados = this.resultados;
    } else if (f === 'pass') {
      this.resultadosFiltrados = this.resultados.filter(r => r.estado === 'pass');
    } else if (f === 'fail') {
      this.resultadosFiltrados = this.resultados.filter(r => r.estado === 'fail_regresion');
    } else {
      this.resultadosFiltrados = this.resultados.filter(r => r.estado === 'revision_manual');
    }
  }

  formatoEstado(estado: string): string {
    return estado.replace('_', ' ');
  }

  volver(): void {
    this.cambiarVista.emit({ vista: 'historial' });
  }

  verColaRevision(): void {
    this.cambiarVista.emit({ vista: 'cola-revision' });
  }

  generarInforme(): void {
    const doc = new jsPDF();
    const titulo = `Informe Extendido de Regresión: ${this.runId}`;
    
    // --- PORTADA ---
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('Auditoría Impuesto a las Ganancias', 14, 25);
    
    doc.setFontSize(16);
    doc.setTextColor(71, 85, 105);
    doc.text(titulo, 14, 35);
    
    doc.setFontSize(11);
    doc.text(`Fecha de Ejecución: ${new Date().toLocaleString()}`, 14, 45);
    doc.text(`Dataset Base: DS-COM-0726`, 14, 52);
    doc.text(`Dataset Validado: DS-COM-0826`, 14, 59);

    // --- RESUMEN EJECUTIVO (KPIs) ---
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumen Ejecutivo', 14, 75);

    autoTable(doc, {
      startY: 80,
      head: [['Métrica', 'Valor', 'Estado']],
      body: [
        ['Casos Totales Evaluados', this.resumen.total.toString(), ''],
        ['Casos Exitosos (Pass)', this.resumen.pass.toString(), 'OK'],
        ['Casos a Revisión Manual', this.resumen.revision_manual.toString(), 'Warning'],
        ['Fallos de Regresión', this.resumen.fail_regresion.toString(), 'Peligro']
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    // --- DESGLOSE DE CASOS ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('Detalle de Ejecución por Caso', 14, 20);

    const bodyCasos = this.resultados.map(res => [
      res.caso.codigo,
      this.formatoEstado(res.estado).toUpperCase(),
      res.caso.descripcion
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Código', 'Estado', 'Descripción del Caso']],
      body: bodyCasos,
      theme: 'striped',
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'PASS') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'FAIL REGRESION') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'REVISION MANUAL') {
            data.cell.styles.textColor = [202, 138, 4];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // --- ANÁLISIS PROFUNDO DE FALLOS Y REVISIONES ---
    const problematicos = this.resultados.filter(r => r.estado !== 'pass');
    if (problematicos.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.text('Análisis Profundo de Regresiones y Revisiones', 14, 20);
      
      let startY = 30;
      problematicos.forEach(f => {
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`[${f.caso.codigo}] ${f.caso.descripcion}`, 14, startY);
        doc.setFont('helvetica', 'normal');
        
        startY += 8;
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text('Resultado Esperado (Dataset Base):', 14, startY);
        startY += 5;
        doc.setFont('courier', 'normal');
        const strEsperado = f.caso.esperado ? JSON.stringify(f.caso.esperado, null, 2) : 'No disponible (Revisión manual)';
        const linesEsperado = doc.splitTextToSize(strEsperado, 180);
        doc.text(linesEsperado, 14, startY);
        startY += (linesEsperado.length * 4) + 5;

        doc.setFont('helvetica', 'normal');
        doc.text('Resultado Real (Dataset Validado):', 14, startY);
        startY += 5;
        doc.setFont('courier', 'normal');
        const strReal = f.resultado_real ? JSON.stringify(f.resultado_real, null, 2) : 'Sin datos';
        const linesReal = doc.splitTextToSize(strReal, 180);
        doc.text(linesReal, 14, startY);
        startY += (linesReal.length * 4) + 12;
      });
    }

    doc.save(`Informe_Regresion_${this.runId}.pdf`);
  }
}
