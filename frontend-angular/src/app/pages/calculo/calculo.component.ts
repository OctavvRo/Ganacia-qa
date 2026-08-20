import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Analisis } from '../../core/models/analisis.model';
import { AnalisisService } from '../../core/services/analisis.service';
import { EstadoAnalisisService } from '../../core/services/estado-analisis.service';

@Component({
  selector: 'app-calculo',
  template: `
    <main class="p-6 max-w-7xl mx-auto space-y-6">
      
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <mat-icon class="text-brand-600">calculate</mat-icon> Memoria de Cálculo
        </h1>
        <p class="text-sm text-slate-500">Detalle técnico, auditoría de fórmulas y trazabilidad determinística del motor fiscal.</p>
      </div>

      <ng-container *ngIf="cargando">
        <mat-card class="p-12 text-center border border-slate-100 shadow-sm rounded-2xl bg-white">
          <mat-progress-spinner mode="indeterminate" diameter="40" class="mx-auto mb-4" color="primary"></mat-progress-spinner>
          <h3 class="text-sm font-semibold text-slate-700 m-0">Compilando trazas de ejecución</h3>
          <p class="text-xs text-slate-400 mt-1">Alineando registros históricos del backend...</p>
        </mat-card>
      </ng-container>

      <ng-container *ngIf="!cargando && error">
        <mat-card class="p-10 text-center border border-red-100 shadow-sm rounded-2xl bg-red-50/30">
          <mat-icon class="text-red-500 !text-4xl !w-10 !h-10 mb-2">error_outline</mat-icon>
          <h3 class="text-sm font-bold text-red-800 m-0">Error de Recuperación</h3>
          <p class="text-xs text-red-600 max-w-md mx-auto mt-1">{{ error }}</p>
        </mat-card>
      </ng-container>

      <ng-container *ngIf="!cargando && !error && a">
        
        <mat-card class="border border-slate-100 shadow-sm rounded-xl p-5 bg-white space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
            <mat-icon class="text-slate-400 text-xl">alt_route</mat-icon>
            <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">Secuencia de Pipeline Ejecutada</h2>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div *ngFor="let p of pasosMotorPresentacion" 
                 class="flex items-start gap-3 p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50/80 transition-colors">
              <span class="flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white font-mono text-xs font-bold mt-0.5 shadow-sm">
                {{ p.numero }}
              </span>
              <div class="min-w-0 space-y-1">
                <div class="text-xs font-bold text-slate-700 truncate" [title]="p.nombre">{{ p.nombre }}</div>
                <div class="flex items-center gap-2">
                  <span class="px-1.5 py-0.2 text-[10px] font-medium rounded font-mono uppercase tracking-tight"
                        [ngClass]="claseEstadoPaso(p.estado)">
                    {{ etiquetaEstadoPaso(p.estado) }}
                  </span>
                  <span *ngIf="p.valor !== null" class="text-xs font-semibold text-brand-700 font-mono">
                    {{ p.valor | monedaAr }}
                  </span>
                </div>
                <p *ngIf="p.detalle" class="m-0 text-[11px] leading-snug text-slate-400">
                  {{ p.detalle }}
                </p>
              </div>
            </div>
          </div>
        </mat-card>

        <mat-card *ngIf="calculoEsParcial" class="border border-amber-200 shadow-sm rounded-xl p-5 bg-amber-50/70">
          <div class="flex items-start gap-3">
            <mat-icon class="text-amber-600 shrink-0">info</mat-icon>
            <div class="space-y-1">
              <h2 class="text-sm font-bold text-amber-900 m-0">Cálculo parcial reconstruido</h2>
              <p class="text-xs leading-relaxed text-amber-800 m-0">
                El Excel fue leído y el motor reconstruyó ingresos, deducciones, base imponible y pagos anteriores.
                El impuesto determinado y la retención final quedan pendientes porque falta parametrizar la escala Art. 94 aplicable a este período/tramo.
              </p>
              <p *ngIf="motivoCalculoParcial" class="text-xs leading-relaxed text-amber-700 m-0 font-mono">
                {{ motivoCalculoParcial }}
              </p>
            </div>
          </div>
        </mat-card>

        <mat-tab-group animationDuration="200ms" class="bg-transparent">
          
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="mr-2 text-base">dashboard</mat-icon> Resumen Aritmético
            </ng-template>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 py-5 items-start">
              
              <div class="lg:col-span-2 space-y-5">
                
                <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
                  <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider m-0">1. Construcción de la Ganancia Neta</h3>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/40 text-emerald-800 text-sm font-medium">
                      <span>＋ Total Ingresos Computados</span>
                      <strong class="font-mono">{{ calculoVista?.['total_ingresos_usado'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 text-amber-800 text-sm font-medium">
                      <span>－ Deducciones Personales</span>
                      <strong class="font-mono">{{ calculoVista?.['deducciones_personales'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 text-amber-800 text-sm font-medium">
                      <span>－ Deducciones Generales Admitidas</span>
                      <strong class="font-mono">{{ calculoVista?.['deducciones_generales'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 text-amber-800 text-sm font-medium">
                      <span>－ Deducciones Especiales Art. 30</span>
                      <strong class="font-mono">{{ calculoVista?.['deducciones_art30'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 text-base font-bold shadow-sm">
                      <span>＝ Ganancia Neta Imponible Base</span>
                      <span class="font-mono">{{ calculoVista?.['ganancia_neta_base'] | monedaAr }}</span>
                    </div>
                  </div>
                </mat-card>

                <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
                  <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider m-0">2. Aplicación de Escala Impositiva (Art. 94)</h3>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm text-slate-600">
                      <span>Tramo de Escala Asignado</span>
                      <span class="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {{ calculoVista?.['tramo_escala']?.tramo ? ('Tramo ' + calculoVista?.['tramo_escala']?.tramo) : 'Pendiente de escala' }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm text-slate-600">
                      <span>Mínimo del Tramo No Imponible</span>
                      <strong class="font-mono text-slate-700">{{ calculoVista?.['tramo_escala']?.minimo | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm text-slate-600">
                      <span>Excedente sobre el mínimo</span>
                      <strong class="font-mono text-slate-700">{{ calculoVista?.['tramo_escala']?.excedente_sobre_minimo | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm text-slate-600">
                      <span>Alícuota Marginal Aplicada</span>
                      <strong class="font-mono text-indigo-700">{{ calculoVista?.['tramo_escala']?.porcentaje !== undefined ? (calculoVista?.['tramo_escala']?.porcentaje | number:'1.0-2') : 'No disponible' }} %</strong>
                    </div>
                    <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm text-slate-600">
                      <span>Componente Importe Fijo</span>
                      <strong class="font-mono text-slate-700">{{ calculoVista?.['tramo_escala']?.importe_fijo | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 text-base font-bold shadow-sm">
                      <span>＝ Impuesto Determinado Proyectado</span>
                      <span class="font-mono">{{ calculoVista?.['impuesto_determinado_calculado'] | monedaAr }}</span>
                    </div>
                  </div>
                </mat-card>

                <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
                  <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider m-0">3. Liquidación de Cierre del Período</h3>
                  <div class="space-y-2">
                    <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50/40 text-emerald-800 text-sm font-medium">
                      <span>＋ Impuesto Determinado Acumulado</span>
                      <strong class="font-mono">{{ calculoVista?.['impuesto_determinado_calculado'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 text-amber-800 text-sm font-medium">
                      <span>－ Crédito Fiscal por Retenciones Anteriores</span>
                      <strong class="font-mono">{{ calculoVista?.['retenciones_anteriores'] | monedaAr }}</strong>
                    </div>
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-brand-600 border border-brand-700 text-white text-base font-bold shadow-sm">
                      <span>＝ Retención Líquida Resultante</span>
                      <span class="font-mono">{{ calculoVista?.['retencion_calculada'] | monedaAr }}</span>
                    </div>
                  </div>
                </mat-card>
              </div>

              <div class="space-y-5">
                <mat-card class="border border-slate-100 shadow-sm rounded-xl p-5 bg-white space-y-4">
                  <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <mat-icon class="text-slate-400 text-xl">fingerprint</mat-icon>
                    <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">Trazabilidad de Ejecución</h3>
                  </div>
                  
                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Archivo de Origen:</span>
                      <span class="font-medium text-slate-700 truncate max-w-[180px]" [title]="a.metadata['archivo']">
                        {{ a.metadata['archivo'] }}
                      </span>
                    </div>
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Margen de Tolerancia:</span>
                      <span class="font-mono font-medium text-slate-600">$ 0,05</span>
                    </div>
                    <div class="flex justify-between pb-1">
                      <span class="text-slate-400">Versión Core de Motor:</span>
                      <span class="font-mono font-medium text-slate-500">{{ a.snapshot?.['motor_version'] }}</span>
                    </div>
                  </div>

                  <div *ngIf="controlLct as v" class="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div class="flex items-center justify-between">
                      <h4 class="text-xs font-bold text-slate-800 m-0">Tope Técnico LCT 35%</h4>
                      <app-badge [estado]="v.estado"></app-badge>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 font-mono text-[11px]">
                      <div class="flex justify-between"><span class="text-slate-400">Bruto Mensual:</span> <span class="text-slate-700">{{ v.bruto_mensual | monedaAr }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-400">Tope Máximo 35%:</span> <span class="text-slate-700">{{ v.tope_35 | monedaAr }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-400">Retención calculada:</span> <span class="text-slate-700">{{ v.retencion_calculada | monedaAr }}</span></div>
                      <div *ngIf="v.excedente_sobre_tope !== undefined" class="flex justify-between">
                        <span class="text-slate-400">Excedente sobre tope:</span>
                        <span [ngClass]="v.excedente_sobre_tope > 0 ? 'text-amber-700 font-bold' : 'text-slate-700'">
                          {{ v.excedente_sobre_tope | monedaAr }}
                        </span>
                      </div>
                      <div class="flex justify-between border-t border-slate-200/60 pt-1.5 font-bold">
                        <span class="text-slate-500">Resultado del control:</span>
                        <span class="text-brand-700">{{ etiquetaEstadoPaso(v.estado) }}</span>
                      </div>
                    </div>
                    <p class="m-0 text-[11px] leading-relaxed text-slate-500 bg-white border border-slate-100 rounded-lg p-2">
                      {{ v.detalle }}
                    </p>
                  </div>
                </mat-card>

                <mat-card class="border border-slate-100 shadow-sm rounded-xl p-5 bg-white space-y-4">
                  <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <mat-icon class="text-slate-400 text-xl">rule</mat-icon>
                    <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">Topes y parámetros usados</h3>
                  </div>
                  <div class="space-y-2 text-xs">
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Escala Art. 94:</span>
                      <span class="font-mono text-slate-700">{{ a.snapshot?.['escala_art94_version'] }}</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Tramo aplicado:</span>
                      <span class="font-mono text-slate-700">
                        {{ calculoVista?.['tramo_escala']?.tramo ? ('Tramo ' + calculoVista?.['tramo_escala']?.tramo) : 'Pendiente de escala' }}
                      </span>
                    </div>
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Mínimo / máximo:</span>
                      <span class="font-mono text-slate-700">
                        {{ calculoVista?.['tramo_escala']?.minimo | monedaAr }} /
                        {{ calculoVista?.['tramo_escala']?.maximo ? (calculoVista?.['tramo_escala']?.maximo | monedaAr) : 'sin máximo' }}
                      </span>
                    </div>
                    <div class="flex justify-between border-b border-slate-50 pb-2">
                      <span class="text-slate-400">Alícuota / fijo:</span>
                      <span class="font-mono text-slate-700">
                        {{ calculoVista?.['tramo_escala']?.porcentaje !== undefined ? (calculoVista?.['tramo_escala']?.porcentaje | number:'1.0-2') : 'No disponible' }}% /
                        {{ calculoVista?.['tramo_escala']?.importe_fijo | monedaAr }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-400">Tope LCT 35%:</span>
                      <span class="font-mono text-slate-700">{{ controlLct?.tope_35 !== undefined ? (controlLct?.tope_35 | monedaAr) : 'Pendiente por datos' }}</span>
                    </div>
                  </div>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="mr-2 text-base">date_range</mat-icon> Detalle Cronológico Mensual
            </ng-template>
            
            <div class="py-5 space-y-4">
              <div class="flex gap-3 p-4 bg-brand-50 border border-brand-100 rounded-xl text-slate-700 text-xs leading-relaxed shadow-sm">
                <mat-icon class="text-brand-600 shrink-0">info</mat-icon>
                <div>
                  Los meses anteriores al período liquidado se muestran como <strong>reconstrucción acumulada secuencial</strong>. 
                  El mes liquidado es el que se compara contra la retención informada en el Excel para definir el resultado final.
                </div>
              </div>

              <mat-accordion class="space-y-2 block">
                <mat-expansion-panel
                  *ngFor="let m of a.detalle_mensual"
                  class="!shadow-sm !rounded-xl border border-slate-100 overflow-hidden"
                  [class.border-l-4]="m.mes === 6 || m.mes === 12"
                  [class.!border-l-amber-500]="m.mes === 6 || m.mes === 12">
                  
                  <mat-expansion-panel-header class="hover:!bg-slate-50/50 !h-14">
                    <mat-panel-title class="text-sm font-bold text-slate-800">{{ m.nombre_mes }}</mat-panel-title>
                    <mat-panel-description class="text-xs flex items-center justify-between w-full">
                      <span [ngClass]="{'text-brand-600 font-semibold': m.es_periodo_auditado, 'text-slate-400': !m.es_periodo_auditado}">
                        {{ m.es_periodo_auditado ? '🎯 Período Bajo Auditoría' : 'Reconstrucción de acumulados' }}
                      </span>
                    </mat-panel-description>
                  </mat-expansion-panel-header>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <app-month-card titulo="Parámetros de Entrada" [datos]="m.datos_entrada"></app-month-card>
                    <app-month-card titulo="Cálculo de Bases Imponibles" [datos]="m.calculo"></app-month-card>
                    <app-month-card titulo="Escala Aplicada (Art. 94)" [datos]="m.calculo?.tramo_escala" [mensaje]="m.motivo"></app-month-card>
                    <app-month-card titulo="Retención resultante" [datos]="{
                      impuesto_determinado: m.calculo?.impuesto_determinado,
                      retenciones_anteriores: m.calculo?.retenciones_anteriores,
                      retencion_calculada: m.calculo?.retencion_calculada,
                      retencion_informada: m.calculo?.retencion_informada,
                      diferencia_retencion: m.calculo?.diferencia_retencion
                    }"></app-month-card>
                  </div>

                  <div class="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">Controles Ejecutados en {{ m.nombre_mes }}</h4>
                    <div class="divide-y divide-slate-200/60 max-h-48 overflow-y-auto">
                      <div *ngFor="let v of m.validaciones" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 text-xs">
                        <span class="px-2 py-0.5 font-mono font-bold bg-slate-200 text-slate-700 rounded text-[10px]">
                          {{ codigoCorto(v.codigo) }}
                        </span>
                        <app-badge [estado]="v.estado" class="scale-90"></app-badge>
                        <span class="text-slate-600 flex-1 truncate" [title]="v.detalle">{{ v.detalle }}</span>
                      </div>
                    </div>
                  </div>

                </mat-expansion-panel>
              </mat-accordion>
            </div>
          </mat-tab>
        </mat-tab-group>
      </ng-container>

      <ng-container *ngIf="!cargando && !error && !a">
        <mat-card class="p-12 text-center border border-slate-200 shadow-md rounded-2xl bg-white max-w-md mx-auto mt-10 space-y-4">
          <div class="inline-flex p-4 bg-slate-50 text-slate-400 rounded-2xl">
            <mat-icon class="!text-5xl !w-12 !h-12">receipt_long</mat-icon>
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-slate-800 m-0">Sin Trazabilidad Activa</h3>
            <p class="text-xs text-slate-400">
              No hay datos técnicos en la sesión actual. Por favor, regrese al historial para abrir una liquidación.
            </p>
          </div>
        </mat-card>
      </ng-container>
      
    </main>
  `,
  styles: [`
    :host ::ng-deep .mat-tab-body-wrapper { margin-top: 4px; }
  `]
})
export class CalculoComponent implements OnInit {
  a?: Analisis;
  cargando = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private service: AnalisisService,
    private estado: EstadoAnalisisService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const enMemoria = this.estado.actual;
    
    if (enMemoria && (!id || String(enMemoria.id) === id)) {
      this.a = enMemoria;
      return;
    }

    if (id) {
      this.cargando = true;
      this.service.obtener(id).subscribe({
        next: (a) => {
          this.a = a;
          this.estado.actual = a;
          this.cargando = false;
        },
        error: () => {
          this.error = `Identificador de análisis ${id} no localizable. Verifique los permisos o el árbol de registros.`;
          this.cargando = false;
        },
      });
    } else {
      this.a = undefined;
    }
  }

  get controlLct() {
    return this.a?.validaciones?.find(
      (v) => v.codigo === 'CTRL_TOPE_LCT_35' || v.codigo === 'V11_TOPE_LCT_35',
    );
  }

  get calculoVista() {
    const analisis = this.a as any;
    return analisis?.calculo ?? analisis?.calculo_parcial ?? {};
  }

  get calculoEsParcial() {
    const analisis = this.a as any;
    return !analisis?.calculo && Boolean(analisis?.calculo_parcial);
  }

  get motivoCalculoParcial() {
    const analisis = this.a as any;
    return analisis?.detalle_tecnico ?? analisis?.motivo ?? analisis?.calculo_parcial?.motivo_calculo_incompleto;
  }

  get pasosMotorPresentacion() {
    const pasos = this.a?.snapshot?.['pasos_motor'];
    if (!Array.isArray(pasos)) return [];
    return pasos;
  }

  etiquetaEstadoPaso(estado: string): string {
    const e = String(estado ?? '').toUpperCase();
    const etiquetas: Record<string, string> = {
      CALCULADO: 'Calculado',
      EVALUADO: 'Evaluado',
      PARCIAL_MVP: 'Parcial MVP',
      PENDIENTE_ESCALA: 'Pendiente de escala',
      NO_EVALUADO: 'Pendiente por datos',
      NO_EVALUADA: 'Pendiente por datos',
      NO_EJECUTADO: 'No ejecutado',
      SIN_AJUSTE: 'Sin ajuste',
      ADVERTENCIA: 'Advertencia',
      OK: 'OK',
    };
    return etiquetas[e] ?? e.replaceAll('_', ' ').toLowerCase();
  }

  claseEstadoPaso(estado: string): string {
    const e = String(estado ?? '').toUpperCase();
    if (e.includes('ERROR')) return 'bg-red-100 text-red-700';
    if (e.includes('NO_EVALUAD') || e.includes('NO_EJECUTADO')) return 'bg-slate-100 text-slate-500';
    if (e.includes('ADVERTENCIA') || e.includes('LIMITADA') || e.includes('PARCIAL') || e.includes('PENDIENTE')) return 'bg-amber-100 text-amber-700';
    if (e.includes('OK') || e.includes('CALCULADO') || e.includes('EVALUADO') || e.includes('SIN_AJUSTE')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-200/60 text-slate-600';
  }
  codigoCorto(c: string): string {
    if (c.startsWith('CTRL_')) return 'CTRL';
    return c.split('_')[0];
  }
}
