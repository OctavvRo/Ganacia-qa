import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Analisis } from '../../core/models/analisis.model';
import { AnalisisService } from '../../core/services/analisis.service';
import { EstadoAnalisisService } from '../../core/services/estado-analisis.service';

@Component({
  selector: 'app-analisis',
  template: `
    <main class="p-6 max-w-7xl mx-auto space-y-6" *ngIf="analisis as a; else sinDatos">
      <ng-template #calculoComparacion let-c="c">
        <div *ngIf="tieneCalculoComparacion(c)"
             class="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Motivo del error</div>
              <div class="text-sm font-bold text-slate-800">{{ motivoComparacion(c) }}</div>
            </div>
            <div class="text-left sm:text-right">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Diferencia</div>
              <div class="font-mono text-sm font-extrabold" [ngClass]="claseDiferencia(c.diferencia)">
                {{ c.diferencia | monedaAr }}
              </div>
            </div>
          </div>

          <div class="p-4 space-y-3">
            <div *ngIf="c.campos_a_revisar?.length" class="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-2">Dónde detectarlo</div>
              <div class="flex flex-wrap gap-1.5">
                <span *ngFor="let campo of c.campos_a_revisar"
                      class="px-2 py-1 rounded-md bg-white border border-blue-100 text-blue-700 font-mono text-[11px] font-semibold">
                  {{ campo }}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div class="rounded-xl border border-amber-100 bg-amber-50/60 p-3 space-y-2">
                <div class="flex items-center gap-2 text-amber-700">
                  <mat-icon class="!text-base !w-4 !h-4">description</mat-icon>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider">Excel informa</span>
                </div>
                <div class="font-mono text-xs text-slate-900 leading-relaxed break-words">
                  {{ formulaExcel(c) }}
                </div>
              </div>

              <div class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
                <div class="flex items-center gap-2 text-emerald-700">
                  <mat-icon class="!text-base !w-4 !h-4">check_circle</mat-icon>
                  <span class="text-[10px] font-extrabold uppercase tracking-wider">Sistema espera</span>
                </div>
                <div class="font-mono text-xs text-slate-900 leading-relaxed break-words">
                  {{ formulaSistema(c) }}
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">Por qué puede ser</div>
              <p class="m-0 text-sm leading-relaxed text-slate-700">{{ causaBreve(c) }}</p>
            </div>
          </div>
        </div>
      </ng-template>
      
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div class="space-y-1">
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Resultado del Análisis</h1>
          <p class="text-sm text-slate-500">Resultado determinístico calculado por el controlador.</p>
        </div>
        <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm w-fit">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado Global:</span>
          <app-badge [estado]="a.veredicto || a.estado"></app-badge>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <mat-card class="p-5 border border-slate-100 shadow-sm rounded-xl bg-white">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Cliente / Empresa</span>
          <h2 class="text-lg font-bold text-slate-800 truncate">{{ a.metadata['cliente'] }}</h2>
        </mat-card>
        
        <mat-card class="p-5 border border-slate-100 shadow-sm rounded-xl bg-white">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Legajo Identificador</span>
          <h2 class="text-lg font-bold text-slate-700 font-mono">{{ a.metadata['legajo'] }}</h2>
        </mat-card>
        
        <mat-card class="p-5 border border-slate-100 shadow-sm rounded-xl bg-white">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Período Fiscal</span>
          <h2 class="text-lg font-bold text-brand-700">{{ periodo }}</h2>
        </mat-card>
      </div>

      <mat-card class="border border-slate-100 shadow-sm rounded-xl overflow-hidden p-0 bg-white">
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <mat-icon class="text-slate-500 text-xl">monetization_on</mat-icon>
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider m-0">Resumen del resultado calculado</h2>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 divide-y sm:divide-y-0 xl:divide-x divide-slate-100 text-center sm:text-left">
          
          <div class="p-5 space-y-1">
            <span class="text-xs font-medium text-slate-400 block">Modalidad SAC</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 mt-1">
              SAC {{ a.analisis_sac['modalidad'] | titlecase }}
            </span>
          </div>

          <div class="p-5 space-y-1 min-w-0">
            <span class="text-xs font-medium text-slate-400 block">Ganancia Neta Base</span>
            <div class="text-lg 2xl:text-xl font-bold leading-tight break-words" [ngClass]="valorMonetarioClase(a.calculo?.['ganancia_neta_base'])">
              {{ a.calculo?.['ganancia_neta_base'] | monedaAr }}
            </div>
          </div>

          <div class="p-5 space-y-1 min-w-0">
            <span class="text-xs font-medium text-slate-400 block">Retención Calculada</span>
            <div class="text-lg 2xl:text-xl font-bold leading-tight break-words" [ngClass]="valorMonetarioClase(a.calculo?.['retencion_calculada'], true)">
              {{ a.calculo?.['retencion_calculada'] | monedaAr }}
            </div>
          </div>

          <div class="p-5 space-y-1 min-w-0">
            <span class="text-xs font-medium text-slate-400 block">Retención informada</span>
            <div class="text-lg 2xl:text-xl font-bold leading-tight break-words" [ngClass]="valorMonetarioClase(a.calculo?.['retencion_excel'])">
              {{ a.calculo?.['retencion_excel'] | monedaAr }}
            </div>
          </div>

          <div class="p-5 space-y-1 min-w-0">
            <span class="text-xs font-medium text-slate-400 block">Impuesto determinado</span>
            <div class="text-lg 2xl:text-xl font-bold leading-tight break-words" [ngClass]="valorMonetarioClase(a.calculo?.['impuesto_determinado_calculado'])">
              {{ a.calculo?.['impuesto_determinado_calculado'] | monedaAr }}
            </div>
          </div>

          <div class="p-5 space-y-1 bg-slate-50/30 min-w-0">
            <span class="text-xs font-medium text-slate-400 block">Diferencia</span>
            <div class="text-lg 2xl:text-xl font-extrabold leading-tight break-words" [ngClass]="claseDiferencia(a.calculo?.['diferencia_retencion'])">
              {{ a.calculo?.['diferencia_retencion'] | monedaAr }}
            </div>
          </div>
        </div>
      </mat-card>

      <mat-card *ngIf="a.estado !== 'analisis_completado'" class="p-5 border border-amber-200 bg-amber-50/70 rounded-xl shadow-sm">
        <div class="flex gap-3 items-start">
          <mat-icon class="text-amber-600">info</mat-icon>
          <div class="space-y-2">
            <h3 class="text-sm font-bold text-amber-900 m-0">El motor no ejecutó el cálculo completo</h3>
            <p class="text-sm text-amber-900/80 m-0">
              {{ a['motivo'] || 'No se pudo completar el análisis con los datos recibidos.' }}
            </p>
            <p *ngIf="a['detalle_tecnico']" class="text-xs text-amber-800/80 font-mono m-0">{{ a['detalle_tecnico'] }}</p>
            <div *ngIf="a['datos_faltantes']?.length" class="flex flex-wrap gap-1.5 pt-1">
              <span *ngFor="let d of a['datos_faltantes']" class="px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-800 text-xs font-semibold">
                {{ d }}
              </span>
            </div>
            <p class="text-xs text-amber-800/80 m-0">
              Revisá que el mes seleccionado corresponda a un mes con importes en el Excel y que exista escala normativa cargada para ese período.
            </p>
          </div>
        </div>
      </mat-card>

      <div class="space-y-6">
        
        <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-base font-bold text-slate-800 m-0">Matriz de Validaciones Legales</h3>
              <span class="text-xs text-slate-400 font-medium">Reglas fiscales analizadas</span>
            </div>
            <button
              *ngIf="a.id"
              type="button"
              mat-stroked-button
              class="!rounded-xl !text-brand-700 !border-brand-100 bg-brand-50/40 hover:bg-brand-50 w-full sm:w-auto"
              [disabled]="explicacionCargando"
              (click)="generarExplicacion()">
              <mat-icon>{{ explicacionCargando ? 'hourglass_top' : 'auto_awesome' }}</mat-icon>
              {{ explicacionCargando ? 'Generando guía...' : 'Explicar qué corregir' }}
            </button>
          </div>

          <mat-card *ngIf="explicacionIa || errorExplicacion" class="p-0 overflow-hidden border border-brand-100 bg-brand-50/30 shadow-none rounded-xl">
            <div class="px-4 py-3 border-b border-brand-100 bg-white/70 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <mat-icon class="text-brand-600">psychology</mat-icon>
                <h4 class="m-0 text-sm font-extrabold text-slate-800">Guía accionable del hallazgo</h4>
              </div>
              <span *ngIf="explicacionIa" class="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full"
                    [ngClass]="explicacionIa.proveedor === 'gemini' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'">
                {{ explicacionIa.proveedor === 'gemini' ? 'Gemini' : 'Guía local' }}
              </span>
            </div>
            <div class="p-4 space-y-4">
              <p *ngIf="errorExplicacion" class="m-0 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                {{ errorExplicacion }}
              </p>
              <ng-container *ngIf="explicacionIa">
                <div *ngIf="explicacionIa.diagnostico_humano || explicacionIa.resumen"
                     class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1">
                  <div class="flex items-center gap-2">
                    <mat-icon class="!text-base !w-4 !h-4 text-indigo-600">tips_and_updates</mat-icon>
                    <h5 class="m-0 text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Interpretación breve
                    </h5>
                  </div>
                  <p class="m-0 text-sm leading-relaxed text-slate-700">{{ textoBreve(explicacionIa.diagnostico_humano || explicacionIa.resumen) }}</p>
                </div>

                <div *ngIf="explicacionIa.pasos?.length" class="space-y-2">
                  <h5 class="m-0 text-xs font-bold uppercase tracking-wider text-slate-500">Qué hacer ahora</h5>
                  <ol class="m-0 pl-5 space-y-1.5 text-sm text-slate-700">
                    <li *ngFor="let paso of explicacionIa.pasos.slice(0, 3)" class="leading-relaxed">{{ textoBreve(paso, 180) }}</li>
                  </ol>
                </div>

                <div *ngIf="explicacionIa.hallazgos?.length" class="grid gap-2">
                  <div class="flex items-center gap-2 text-[11px] text-slate-500">
                    <mat-icon class="!text-base !w-4 !h-4">verified</mat-icon>
                    <span>Detalle técnico determinístico del backend. Gemini no modifica estos números.</span>
                  </div>
                  <div *ngFor="let h of explicacionIa.hallazgos.slice(0, 4)" class="p-3 rounded-xl bg-white border border-slate-100">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">{{ h.codigo }}</span>
                      <strong class="text-xs text-slate-800">{{ h.titulo }}</strong>
                      <app-badge [estado]="h.estado"></app-badge>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
                      <div class="rounded-lg bg-slate-50 border border-slate-100 p-2">
                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Motivo</div>
                        <div class="text-xs font-semibold text-slate-800">{{ motivoHallazgo(h) }}</div>
                      </div>
                      <div *ngIf="h.donde_revisar?.length" class="rounded-lg bg-blue-50/60 border border-blue-100 p-2">
                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 mb-1">Dónde detectarlo</div>
                        <div class="flex flex-wrap gap-1">
                          <span *ngFor="let item of h.donde_revisar.slice(0, 6)"
                                class="px-1.5 py-0.5 rounded bg-white border border-blue-100 text-blue-700 font-mono text-[10px]">
                            {{ item }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div *ngIf="h.comparaciones?.length" class="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
                      <div class="px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                        <mat-icon class="!text-base !w-4 !h-4 text-brand-600">compare_arrows</mat-icon>
                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">Comparación determinística del motor</span>
                      </div>
                      <div class="divide-y divide-slate-200">
                        <div *ngFor="let c of h.comparaciones.slice(0, 4)" class="p-3 space-y-2">
                          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <strong class="text-xs text-slate-800">
                              {{ c.concepto }}<span *ngIf="c.mes" class="font-normal text-slate-500"> · {{ c.mes | titlecase }}</span>
                            </strong>
                            <span *ngIf="c.formula_spec" class="text-[10px] text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                              según spec
                            </span>
                          </div>
                          <ng-container *ngTemplateOutlet="calculoComparacion; context: { c: c }"></ng-container>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p *ngIf="explicacionIa.advertencias?.length" class="m-0 text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  {{ explicacionIa.advertencias.join(' ') }}
                </p>
              </ng-container>
            </div>
          </mat-card>
          
          <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <div *ngFor="let v of validacionesLegales(a)" 
                 class="flex items-start gap-4 p-4 bg-slate-50/60 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
              
              <div class="mt-0.5" [ngClass]="claseIconoValidacion(v.estado)">
                <mat-icon class="text-2xl">{{ iconoValidacion(v.estado) }}</mat-icon>
              </div>

              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 text-slate-700 rounded uppercase">
                    {{ codigoLabel(v.codigo) }}
                  </span>
                  <h4 class="text-sm font-bold text-slate-800 m-0">{{ descripcion(v.codigo) }}</h4>
                </div>
                <p class="text-xs text-slate-500 break-words leading-relaxed">{{ v.detalle }}</p>
                <div *ngIf="v.codigo === 'V6_12VA_PARTE_ART30' && v.meses_con_diferencias?.length"
                     class="mt-3 rounded-xl border border-amber-100 bg-white overflow-hidden">
                  <div class="px-3 py-2 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between gap-3">
                    <span class="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Detalle de datos Art. 30 por mes</span>
                    <span class="text-[11px] text-amber-700 font-semibold">{{ v.meses_con_diferencias.length }} mes(es)</span>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <div *ngFor="let h of v.meses_con_diferencias" class="p-3 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <strong class="text-xs text-slate-800">12va parte Art. 30 · <span class="capitalize">{{ h.mes }}</span></strong>
                        <span class="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">según spec</span>
                      </div>
                      <ng-container *ngTemplateOutlet="calculoComparacion; context: { c: h }"></ng-container>
                    </div>
                  </div>
                </div>
                <div *ngIf="v.codigo !== 'V6_12VA_PARTE_ART30' && v.comparaciones?.length"
                     class="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div class="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                    <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Comparación contra referencia del spec</span>
                    <span class="text-[11px] text-slate-500 font-semibold">{{ v.comparaciones.length }} dato(s)</span>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <div *ngFor="let c of v.comparaciones" class="p-3 space-y-2">
                      <div class="flex items-center justify-between gap-2">
                        <strong class="text-xs text-slate-800">
                          {{ c.concepto }}<span *ngIf="c.mes" class="font-normal text-slate-500"> · {{ c.mes | titlecase }}</span>
                        </strong>
                        <span class="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">según spec</span>
                      </div>
                      <ng-container *ngTemplateOutlet="calculoComparacion; context: { c: c }"></ng-container>
                    </div>
                  </div>
                </div>
              </div>

              <div class="shrink-0">
                <app-badge [estado]="v.estado"></app-badge>
              </div>
            </div>
          </div>
        </mat-card>

        <mat-card *ngIf="controlEstructuraExcel as ctrl"
                  class="border shadow-sm rounded-xl p-6 bg-white space-y-4"
                  [ngClass]="ctrl.estado === 'OK' ? 'border-emerald-100' : 'border-red-100'">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div class="space-y-1">
              <h3 class="text-base font-extrabold text-slate-800 m-0 flex items-center gap-2">
                <mat-icon class="text-brand-600">view_column</mat-icon>
                Control de estructura de la tabla
              </h3>
              <p class="text-sm text-slate-500 m-0 leading-relaxed">
                Verifica solo la tabla base A1:O49 antes de interpretar los importes. Cualquier dato fuera de esa tabla se ignora.
              </p>
            </div>
            <app-badge [estado]="ctrl.estado"></app-badge>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Filas</div>
              <div class="mt-1 text-xl font-mono font-extrabold text-slate-800">
                {{ ctrl.filas_detectadas }} / {{ ctrl.filas_esperadas }}
              </div>
              <p class="m-0 mt-1 text-xs" [ngClass]="ctrl.filas_1_49_detectadas ? 'text-emerald-600' : 'text-red-600'">
                {{ ctrl.filas_1_49_detectadas ? 'Filas 1-49 detectadas' : 'Filas 1-49 incompletas' }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Columnas</div>
              <div class="mt-1 text-xl font-mono font-extrabold text-slate-800">
                {{ ctrl.columnas_detectadas }} / {{ ctrl.columnas_esperadas }}
              </div>
              <p class="m-0 mt-1 text-xs" [ngClass]="ctrl.columnas_a_o_presentes ? 'text-emerald-600' : 'text-red-600'">
                {{ ctrl.columnas_a_o_presentes ? 'Columnas A-O presentes' : 'Faltan columnas A-O' }}
              </p>
            </div>

            <div class="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Meses</div>
              <div class="mt-1 text-xl font-mono font-extrabold text-slate-800">
                {{ ctrl.meses_presentes?.length || 0 }} / {{ ctrl.meses_esperados?.length || 12 }}
              </div>
              <p class="m-0 mt-1 text-xs" [ngClass]="ctrl.meses_enero_diciembre_presentes ? 'text-emerald-600' : 'text-red-600'">
                {{ ctrl.meses_enero_diciembre_presentes ? 'Enero-diciembre presentes' : 'Faltan meses' }}
              </p>
            </div>
          </div>

          <div *ngIf="ctrl.estado !== 'OK'" class="rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-3">
            <div class="flex items-start gap-3">
              <div class="mt-0.5 h-8 w-8 rounded-full bg-white border border-red-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-red-600 text-base leading-none">build_circle</mat-icon>
              </div>
              <div class="space-y-2">
                <div class="text-xs font-extrabold uppercase tracking-wider text-red-700">Qué hacer</div>
                <p class="m-0 text-sm text-red-800 leading-relaxed">
                  Verifique la tabla base A1:O49. El motor espera exactamente 49 filas, columnas A-O y meses enero-diciembre.
                </p>
                <ul *ngIf="ctrl.acciones_recomendadas?.length" class="m-0 pl-4 space-y-1 text-sm text-red-800 leading-relaxed">
                  <li *ngFor="let accion of ctrl.acciones_recomendadas">{{ accion }}</li>
                </ul>
              </div>
            </div>

            <div class="rounded-lg border border-red-100 bg-white/70 p-3">
              <div class="text-[10px] font-extrabold uppercase tracking-wider text-red-500 mb-1">Detalle técnico</div>
              <p class="m-0 text-xs text-red-700 leading-relaxed">{{ ctrl.detalle }}</p>
            </div>

            <div class="flex flex-wrap gap-2 text-xs">
              <span *ngIf="ctrl.columnas_faltantes?.length" class="px-2 py-1 rounded-lg bg-white border border-red-100 text-red-700 font-semibold">
                Columnas faltantes: {{ ctrl.columnas_faltantes.join(', ') }}
              </span>
              <span *ngIf="ctrl.columnas_extras?.length" class="px-2 py-1 rounded-lg bg-white border border-red-100 text-red-700 font-semibold">
                Columnas extras: {{ ctrl.columnas_extras.join(', ') }}
              </span>
              <span *ngIf="ctrl.meses_faltantes?.length" class="px-2 py-1 rounded-lg bg-white border border-red-100 text-red-700 font-semibold">
                Meses faltantes: {{ ctrl.meses_faltantes.join(', ') }}
              </span>
              <span *ngIf="ctrl.filas_faltantes?.length" class="px-2 py-1 rounded-lg bg-white border border-red-100 text-red-700 font-semibold">
                Filas faltantes: {{ ctrl.filas_faltantes.join(', ') }}
              </span>
              <span *ngIf="ctrl.filas_extras?.length" class="px-2 py-1 rounded-lg bg-white border border-red-100 text-red-700 font-semibold">
                Filas extras: {{ ctrl.filas_extras.join(', ') }}
              </span>
            </div>
          </div>
        </mat-card>

        <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div class="space-y-1">
              <h3 class="text-base font-extrabold text-slate-800 m-0">Datos Faltantes</h3>
              <p class="text-sm text-slate-500 m-0 leading-relaxed">
                Estos datos no vienen en el Excel o todavía no fueron completados. El controlador los pide para habilitar más validaciones sin inventar información.
              </p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold">
                {{ datosFaltantesUnificados.length }} faltante(s)
              </span>
              <span class="px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-extrabold">
                {{ a.cobertura_reporte?.['porcentaje_cobertura_aproximado'] || 0 }}% cobertura
              </span>
            </div>
          </div>

          <div *ngIf="datosFaltantesUnificados.length; else sinDatosFaltantes" class="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div class="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              <span *ngFor="let dato of datosFaltantesUnificados"
                    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                <mat-icon class="!text-base !w-4 !h-4 text-amber-500">pending</mat-icon>
                {{ etiquetaDatoFaltante(dato) }}
              </span>
            </div>
          </div>

          <ng-template #sinDatosFaltantes>
            <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold flex items-center gap-2">
              <mat-icon>verified</mat-icon>
              No hay datos faltantes relevantes para este reporte.
            </div>
          </ng-template>

          <a *ngIf="a.id"
             mat-flat-button
             color="primary"
             [routerLink]="['/analisis', a.id, 'datos-complementarios']"
             class="!rounded-xl w-full sm:w-fit">
            <mat-icon>edit_note</mat-icon>
            Completar datos faltantes
          </a>
        </mat-card>
      </div>

      <mat-card class="p-4 border border-slate-100 shadow-sm rounded-xl bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <a mat-stroked-button [href]="descarga" class="!rounded-xl !text-slate-600 hover:!bg-slate-50 w-full sm:w-auto">
            <mat-icon>download</mat-icon> Descargar JSON
          </a>
          <a mat-stroked-button [routerLink]="['/calculo', a.id]" class="!rounded-xl !text-brand-600 hover:!bg-brand-50 w-full sm:w-auto">
            <mat-icon>visibility</mat-icon> Ver cálculo
          </a>
          <a mat-stroked-button [routerLink]="['/diagnosticos', a.id]" class="!rounded-xl !text-slate-600 hover:!bg-slate-50 w-full sm:w-auto">
            <mat-icon>fact_check</mat-icon> Ver diagnósticos
          </a>
          <a *ngIf="a.id" mat-stroked-button [routerLink]="['/analisis', a.id, 'datos-complementarios']" class="!rounded-xl !text-slate-600 hover:!bg-slate-50 w-full sm:w-auto">
            <mat-icon>playlist_add_check</mat-icon> Datos complementarios
          </a>
        </div>
        <a mat-flat-button color="primary" routerLink="/cargar-excel" class="!rounded-xl px-5 py-2 w-full sm:w-auto shadow-sm">
          <mat-icon class="mr-1">refresh</mat-icon> Nueva auditoría
        </a>
      </mat-card>
    </main>

    <ng-template #sinDatos>
      <main class="p-6 max-w-2xl mx-auto mt-12 text-center space-y-6">
        <mat-card class="p-10 border border-slate-200 shadow-md rounded-2xl bg-white space-y-4">
          <div class="inline-flex p-4 bg-slate-50 text-slate-400 rounded-2xl">
            <mat-icon class="!text-5xl !w-12 !h-12">folder_open</mat-icon>
          </div>
          <div class="space-y-1">
            <h1 class="text-xl font-bold text-slate-800">Resultado del Análisis</h1>
            <p class="text-sm text-slate-400 max-w-sm mx-auto">
              No se ha inicializado ningún contexto de auditoría en memoria activa. Por favor, procese un nuevo reporte.
            </p>
          </div>
          <div class="pt-2">
            <a mat-flat-button color="primary" routerLink="/cargar-excel" class="!rounded-xl px-6">
              Cargar Archivo de Entrada
            </a>
          </div>
        </mat-card>
      </main>
    </ng-template>
  `,
  styles: [`
    /* Scrollbar minimalista y estilizada para los paneles internos */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `]
})
export class AnalisisComponent implements OnInit {
  analisis?: Analisis;
  descarga = '';
  explicacionIa?: any;
  explicacionCargando = false;
  errorExplicacion = '';

  constructor(
    private route: ActivatedRoute,
    private service: AnalisisService,
    private estado: EstadoAnalisisService,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.obtener(id).subscribe((a) => {
        this.analisis = a;
        this.estado.actual = a;
        this.descarga = this.service.urlJson(id);
        this.explicacionIa = undefined;
        this.errorExplicacion = '';
      });
    } else {
      this.analisis = this.estado.actual ?? undefined;
      if (this.analisis?.id) {
        this.descarga = this.service.urlJson(this.analisis.id);
      }
    }
  }

  get periodo(): string {
    const m = this.analisis?.metadata;
    return m
      ? `${String(m['mes_liquidacion']).padStart(2, '0')}/${m['periodo_fiscal']}`
      : '';
  }

  codigoLabel(c: string): string {
    if (c.startsWith('CTRL_')) return 'CTRL';
    return c.split('_')[0];
  }

  descripcion(c: string): string {
    if (c.startsWith('V6')) return '12va parte Art. 30.';
    if (c.startsWith('V8')) return 'Modalidad SAC.';
    if (c.startsWith('V10')) return 'Retención calculada vs informada en Excel.';
    if (c.includes('RETENCION') && !c.includes('LCT')) return 'Retención calculada vs informada en Excel.';
    if (c.startsWith('CTRL_TOPE') || c.includes('LCT')) return 'Control técnico — Tope LCT 35%.';
    return c;
  }

  valorMonetarioClase(valor: unknown, destacado = false): string {
    const disponible = valor !== null && valor !== undefined && valor !== '';
    if (!disponible) return 'text-slate-400';
    return destacado ? 'text-brand-600' : 'text-slate-800';
  }

  claseDiferencia(valor: unknown): string {
    const n = Number(valor ?? 0);
    if (!Number.isFinite(n)) return 'text-slate-400';
    return Math.abs(n) <= 0.05 ? 'text-emerald-600' : 'text-red-600';
  }

  iconoValidacion(estado: string): string {
    const e = String(estado ?? '').toUpperCase();
    if (e === 'OK') return 'check_circle';
    if (e === 'NO_EVALUADA' || e === 'NO_EVALUADO') return 'info';
    if (e === 'ADVERTENCIA') return 'warning';
    return 'error';
  }

  claseIconoValidacion(estado: string): string {
    const e = String(estado ?? '').toUpperCase();
    if (e === 'OK') return 'text-green-600';
    if (e === 'NO_EVALUADA' || e === 'NO_EVALUADO') return 'text-amber-500';
    if (e === 'ADVERTENCIA') return 'text-amber-500';
    return 'text-red-500';
  }

  get controlesNoEvaluados(): any[] {
    const validaciones = this.analisis?.['cobertura_validaciones']?.validaciones;
    return Array.isArray(validaciones)
      ? validaciones.filter((v: any) => v.estado === 'NO_EVALUADA')
      : [];
  }

  get controlEstructuraExcel(): any | null {
    const controles = this.analisis?.['controles_tecnicos'];
    if (!Array.isArray(controles)) return null;
    return controles.find((v: any) => v.codigo === 'CTRL_ESTRUCTURA_EXCEL') ?? null;
  }

  get datosFaltantesUnificados(): string[] {
    const cobertura = this.analisis?.['cobertura_reporte']?.['datos_faltantes'];
    const desdeCobertura = Array.isArray(cobertura) ? cobertura : [];

    const informados = this.clavesInformadasNormalizadas();
    const porClave = new Map<string, string>();
    const etiquetasUsadas = new Set<string>();

    for (const dato of desdeCobertura) {
      const clave = this.canonizarDatoFaltante(dato);
      if (!clave || informados.has(clave)) continue;

      const etiquetaNormalizada = this.normalizarDatoTecnico(this.etiquetaDatoFaltante(clave));
      if (etiquetasUsadas.has(etiquetaNormalizada)) continue;

      porClave.set(clave, clave);
      etiquetasUsadas.add(etiquetaNormalizada);
    }

    return Array.from(porClave.values()).sort((a, b) =>
      this.etiquetaDatoFaltante(a).localeCompare(this.etiquetaDatoFaltante(b), 'es'),
    );
  }

  private clavesInformadasNormalizadas(): Set<string> {
    const salida = new Set<string>();
    const agregar = (valor: unknown) => {
      const clave = this.canonizarDatoFaltante(valor);
      if (clave) salida.add(clave);
    };

    const contexto = this.analisis?.['contexto_complementario'];
    const cobertura = this.analisis?.['cobertura_reporte'];

    for (const lista of [contexto?.campos_informados, cobertura?.['datos_complementarios']]) {
      if (Array.isArray(lista)) lista.forEach(agregar);
    }

    for (const grupo of [
      'datos_cliente',
      'datos_legajo',
      'datos_siradig',
      'datos_normativa',
      'datos_novedades',
      'datos_historial',
      'datos_ajuste_final',
      'datos_contexto',
    ]) {
      const valores = contexto?.[grupo];
      if (!valores || typeof valores !== 'object' || Array.isArray(valores)) continue;
      Object.entries(valores).forEach(([campo, valor]) => {
        if (this.tieneValorDato(valor)) agregar(`${grupo}.${campo}`);
      });
    }

    if (this.analisis?.metadata?.['cliente']) agregar('datos_cliente.cliente_nombre');
    if (this.analisis?.metadata?.['legajo']) agregar('datos_legajo.legajo_numero');
    if (this.analisis?.metadata?.['periodo_fiscal']) agregar('datos_contexto.periodo_fiscal');
    if (this.analisis?.metadata?.['mes_liquidacion']) agregar('datos_contexto.mes_liquidacion');

    return salida;
  }

  private canonizarDatoFaltante(dato: unknown): string {
    const clave = this.normalizarDatoTecnico(dato);
    const alias: Record<string, string> = {
      'config_cliente.modo_saldo_favor': 'datos_cliente.modo_saldo_favor',
      'config_cliente.modalidad_sac': 'datos_cliente.modalidad_sac',
      'config_cliente.poliza_seguro_cobra_sobre_sac': 'datos_cliente.poliza_seguro_cobra_sobre_sac',
      'legajo_empleado.legajo_numero': 'datos_legajo.legajo_numero',
      'legajo_empleado.empleado_cuil': 'datos_legajo.empleado_cuil',
      'legajo_empleado.fecha_ingreso': 'datos_legajo.fecha_ingreso',
      'legajo_empleado.fecha_egreso': 'datos_legajo.fecha_egreso',
      'legajo_empleado.zona_geografica': 'datos_legajo.zona_geografica',
      'legajo_empleado.regimen_previsional': 'datos_legajo.regimen_previsional',
      'legajo_empleado.cct_aplicable': 'datos_legajo.cct_aplicable',
      'legajo_empleado.categoria': 'datos_legajo.categoria',
      'legajo_empleado.situacion_revista': 'datos_legajo.situacion_revista',
      'legajo_empleado.cargas_familia_conyuge': 'datos_legajo.cargas_familia_conyuge',
      'legajo_empleado.cargas_familia_cant_hijos': 'datos_legajo.cargas_familia_cant_hijos',
      'legajo_empleado.cargas_familia_otras': 'datos_legajo.cargas_familia_otras',
      'legajo_empleado.tiene_otros_empleadores': 'datos_legajo.tiene_otros_empleadores',
      modo_saldo_favor: 'datos_cliente.modo_saldo_favor',
      modo_saldo_a_favor: 'datos_cliente.modo_saldo_favor',
      modalidad_sac: 'datos_cliente.modalidad_sac',
      cliente_cuit: 'datos_cliente.cliente_cuit',
      cuit_cliente: 'datos_cliente.cliente_cuit',
      poliza_seguro_cobra_sobre_sac: 'datos_cliente.poliza_seguro_cobra_sobre_sac',
      poliza_seguro_sobre_sac: 'datos_cliente.poliza_seguro_cobra_sobre_sac',
      cct_default: 'datos_cliente.cct_default',
      zona_geografica_default: 'datos_cliente.zona_geografica_default',
      legajo_numero: 'datos_legajo.legajo_numero',
      numero_de_legajo: 'datos_legajo.legajo_numero',
      empleado_cuil: 'datos_legajo.empleado_cuil',
      cuil_empleado: 'datos_legajo.empleado_cuil',
      fecha_ingreso: 'datos_legajo.fecha_ingreso',
      fecha_de_ingreso: 'datos_legajo.fecha_ingreso',
      fecha_egreso: 'datos_legajo.fecha_egreso',
      fecha_de_egreso: 'datos_legajo.fecha_egreso',
      zona_geografica: 'datos_legajo.zona_geografica',
      regimen_previsional: 'datos_legajo.regimen_previsional',
      cct_aplicable: 'datos_legajo.cct_aplicable',
      categoria: 'datos_legajo.categoria',
      situacion_revista: 'datos_legajo.situacion_revista',
      situacion_de_revista: 'datos_legajo.situacion_revista',
      cargas_familia_conyuge: 'datos_legajo.cargas_familia_conyuge',
      carga_de_familia_conyuge: 'datos_legajo.cargas_familia_conyuge',
      cargas_familia_cant_hijos: 'datos_legajo.cargas_familia_cant_hijos',
      carga_de_familia_cantidad_de_hijos: 'datos_legajo.cargas_familia_cant_hijos',
      cargas_familia_otras: 'datos_legajo.cargas_familia_otras',
      carga_de_familia_otras: 'datos_legajo.cargas_familia_otras',
      tiene_otros_empleadores: 'datos_legajo.tiene_otros_empleadores',
      siradig_disponible: 'datos_siradig.siradig_disponible',
      gastos_medicos: 'datos_siradig.gastos_medicos',
      cuota_medico_asistencial: 'datos_siradig.cuota_medico_asistencial',
      gastos_educativos: 'datos_siradig.gastos_educativos',
      servicio_domestico: 'datos_siradig.servicio_domestico',
      alquileres: 'datos_siradig.alquileres_inquilino',
      alquileres_inquilino: 'datos_siradig.alquileres_inquilino',
      donaciones: 'datos_siradig.donaciones',
      seguros: 'datos_siradig.seguros',
      intereses_hipotecarios: 'datos_siradig.intereses_hipotecarios',
      otros_empleadores: 'datos_siradig.otros_empleadores',
      normativa_oficial_validada: 'datos_normativa.normativa_oficial_validada',
      periodo_normativo: 'datos_normativa.periodo_normativo',
      ripte: 'datos_normativa.ripte',
      parametros_por_zona: 'datos_normativa.parametros_por_zona',
      topes_por_rubro: 'datos_normativa.topes_por_rubro',
      tabla_regimenes_previsionales: 'datos_normativa.tabla_regimenes_previsionales',
      orden_topes: 'datos_normativa.orden_topes',
      escala_art94_version: 'datos_normativa.escala_art94_version',
      version_escala_art_94: 'datos_normativa.escala_art94_version',
      hnh: 'datos_novedades.hnh_mes',
      hnh_del_mes: 'datos_novedades.hnh_mes',
      hnh_mes: 'datos_novedades.hnh_mes',
      modalidad_hnh: 'datos_novedades.modalidad_hnh',
      distribucion_hnh: 'datos_novedades.distribucion_hnh',
      conceptos_exentos_art_26: 'datos_novedades.conceptos_exentos_art26',
      conceptos_exentos_art26: 'datos_novedades.conceptos_exentos_art26',
      conceptos_egreso: 'datos_novedades.conceptos_egreso',
      conceptos_de_egreso: 'datos_novedades.conceptos_egreso',
      historial_retenciones: 'datos_historial.historial_retenciones_disponible',
      historial_de_retenciones_disponible: 'datos_historial.historial_retenciones_disponible',
      historial_retenciones_disponible: 'datos_historial.historial_retenciones_disponible',
      retenciones_efectivas_previas: 'datos_historial.retenciones_efectivas_previas',
      escala_art_94_por_mes: 'datos_historial.escala_art94_por_mes',
      escala_art94_por_mes: 'datos_historial.escala_art94_por_mes',
      ajustes_previos: 'datos_historial.ajustes_previos',
      ajuste_final: 'datos_ajuste_final.ajuste_final_disponible',
      ajuste_final_disponible: 'datos_ajuste_final.ajuste_final_disponible',
      siradig_definitivo: 'datos_ajuste_final.siradig_definitivo',
      egreso_en_periodo: 'datos_ajuste_final.egreso_en_periodo',
      indemnizaciones: 'datos_ajuste_final.indemnizaciones',
    };

    return alias[clave] ?? clave;
  }

  private normalizarDatoTecnico(dato: unknown): string {
    return String(dato ?? '')
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private tieneValorDato(valor: unknown): boolean {
    return valor !== undefined && valor !== null && String(valor).trim() !== '' && String(valor).trim().toLowerCase() !== 'desconocido';
  }

  etiquetaDatoFaltante(dato: unknown): string {
    const clave = this.canonizarDatoFaltante(dato);
    const etiquetas: Record<string, string> = {
      'datos_cliente.cliente_cuit': 'Cliente CUIT',
      'datos_cliente.modalidad_sac': 'Modalidad SAC',
      'datos_cliente.modo_saldo_favor': 'Modo saldo a favor',
      'datos_cliente.poliza_seguro_cobra_sobre_sac': 'Póliza seguro sobre SAC',
      'datos_cliente.cct_default': 'CCT default',
      'datos_cliente.zona_geografica_default': 'Zona geográfica default',
      'datos_legajo.legajo_numero': 'Número de legajo',
      'datos_legajo.empleado_cuil': 'CUIL empleado',
      'datos_legajo.fecha_ingreso': 'Fecha de ingreso',
      'datos_legajo.fecha_egreso': 'Fecha de egreso',
      'datos_legajo.zona_geografica': 'Zona geográfica',
      'datos_legajo.regimen_previsional': 'Régimen previsional',
      'datos_legajo.cct_aplicable': 'CCT aplicable',
      'datos_legajo.categoria': 'Categoría',
      'datos_legajo.situacion_revista': 'Situación de revista',
      'datos_legajo.cargas_familia_conyuge': 'Carga de familia: cónyuge',
      'datos_legajo.cargas_familia_cant_hijos': 'Carga de familia: cantidad de hijos',
      'datos_legajo.cargas_familia_otras': 'Carga de familia: otras',
      'datos_legajo.tiene_otros_empleadores': 'Tiene otros empleadores',
      'datos_siradig.siradig_disponible': 'SIRADIG disponible',
      'datos_siradig.otros_empleadores': 'Otros empleadores',
      'datos_siradig.gastos_medicos': 'Gastos médicos',
      'datos_siradig.cuota_medico_asistencial': 'Cuota médico asistencial',
      'datos_siradig.gastos_educativos': 'Gastos educativos',
      'datos_siradig.servicio_domestico': 'Servicio doméstico',
      'datos_siradig.alquileres_inquilino': 'Alquileres',
      'datos_siradig.donaciones': 'Donaciones',
      'datos_siradig.seguros': 'Seguros',
      'datos_siradig.intereses_hipotecarios': 'Intereses hipotecarios',
      'datos_normativa.normativa_oficial_validada': 'Normativa oficial validada',
      'datos_normativa.periodo_normativo': 'Período normativo',
      'datos_normativa.ripte': 'RIPTE',
      'datos_normativa.parametros_por_zona': 'Parámetros por zona',
      'datos_normativa.topes_por_rubro': 'Topes por rubro',
      'datos_normativa.tabla_regimenes_previsionales': 'Tabla regímenes previsionales',
      'datos_normativa.orden_topes': 'Orden de topes',
      'datos_normativa.escala_art94_version': 'Versión escala Art. 94',
      'datos_novedades.hnh_mes': 'HNH del mes',
      'datos_novedades.modalidad_hnh': 'Modalidad HNH',
      'datos_novedades.distribucion_hnh': 'Distribución HNH',
      'datos_novedades.conceptos_exentos_art26': 'Conceptos exentos Art. 26',
      'datos_novedades.conceptos_egreso': 'Conceptos de egreso',
      'datos_historial.historial_retenciones_disponible': 'Historial de retenciones disponible',
      'datos_historial.retenciones_efectivas_previas': 'Retenciones efectivas previas',
      'datos_historial.escala_art94_por_mes': 'Escala Art. 94 por mes',
      'datos_historial.ajustes_previos': 'Ajustes previos',
      'datos_ajuste_final.ajuste_final_disponible': 'Ajuste final disponible',
      'datos_ajuste_final.siradig_definitivo': 'SIRADIG definitivo',
      'datos_ajuste_final.egreso_en_periodo': 'Egreso en período',
      'datos_ajuste_final.fecha_egreso': 'Fecha de egreso',
      'datos_ajuste_final.indemnizaciones': 'Indemnizaciones',
      'config_cliente.modo_saldo_favor': 'Modo saldo a favor',
      'config_cliente.modalidad_sac': 'Modalidad SAC',
      'papel_trabajo.ganancia_neta': 'Papel trabajo: ganancia neta',
      'papel_trabajo.total_ingresos': 'Papel trabajo: total ingresos',
      'papel_trabajo.total_ingresos_composicion': 'Papel trabajo: composición total ingresos',
      'papel_trabajo.retencion_del_mes': 'Papel trabajo: retención del mes',
      'papel_trabajo.impuesto_determinado': 'Papel trabajo: impuesto determinado',
      'sac_bruto_cobrado': 'SAC bruto cobrado',
      'sac_anulacion_provisiones': 'SAC anulación provisiones',
    };

    if (etiquetas[clave]) return etiquetas[clave];

    const partes = clave.split('.');
    const ultima = partes[partes.length - 1] || clave;
    return ultima
      .replace(/_/g, ' ')
      .replace(/\b(cuit|cuil|cct|sac|siradig|ripte|hnh|lct|tdf)\b/gi, (m) => m.toUpperCase())
      .replace(/^\w/, (m) => m.toUpperCase());
  }

  validacionesLegales(a: Analisis): any[] {
    return (a.validaciones ?? []).filter((v: any) => {
      const codigo = String(v?.codigo ?? '').toUpperCase();
      return !codigo.startsWith('CTRL_') && codigo !== 'V11_TOPE_LCT_35';
    });
  }

  generarExplicacion(): void {
    const id = this.analisis?.id;
    if (!id || this.explicacionCargando) return;
    this.explicacionCargando = true;
    this.errorExplicacion = '';
    this.service.explicarIa(id).subscribe({
      next: (respuesta) => {
        this.explicacionIa = respuesta;
        this.explicacionCargando = false;
      },
      error: (error) => {
        this.errorExplicacion = error?.error?.message ?? 'No se pudo generar la explicación accionable.';
        this.explicacionCargando = false;
      },
    });
  }

  tooltipV6(h: any): string {
    const componentes = h?.componentes ?? {};
    const partes = [
      `El Excel informa deduccion_especial = ${this.formatoNumeroPlano(componentes.deduccion_especial)}.`,
      `La fila doceava_parte_art30 informa ${this.formatoNumeroPlano(h?.informado)}, pero por formula del spec se esperaba ${this.formatoNumeroPlano(h?.esperado)}.`,
      h?.causa_probable ? `Lectura del controlador: ${h.causa_probable}` : '',
      h?.formula_probable ? `Formula probable detectada: ${h.formula_probable}.` : '',
      h?.campos_a_revisar?.length ? `Campos a revisar: ${h.campos_a_revisar.join(', ')}.` : '',
    ];

    return partes.filter(Boolean).join('\n');
  }

  componentesTexto(componentes: Record<string, unknown>): string {
    return Object.entries(componentes)
      .map(([clave, valor]) => `${clave}: ${this.formatoImporteCorto(valor)}`)
      .join(' · ');
  }

  tieneCalculoComparacion(c: any): boolean {
    if (!c) return false;
    return Boolean(
      c.formula_detallada ||
      c.formula_spec ||
      c.formula_operacion ||
      c.formula_valores ||
      (c.total_base_esperada !== null && c.total_base_esperada !== undefined),
    );
  }

  formulaTitulo(c: any): string {
    return c?.formula_detallada || c?.formula_spec || 'Cuenta esperada segun spec.';
  }

  formulaOperacion(c: any): string {
    const valores = c?.formula_valores ?? {};
    const operacion = String(c?.formula_operacion ?? '');

    if (operacion === 'parametro_por_cantidad') {
      return `Parametro hijo Art. 30 acumulado (${this.formatoImporteCorto(valores.parametro_por_hijo)}) x cantidad de hijos detectada (${this.formatoCantidad(valores.cantidad_hijos_detectada)}) = hijos esperados (${this.formatoImporteCorto(c?.esperado)})`;
    }

    if (operacion === 'parametro_acumulado') {
      return `Parametro acumulado vigente (${this.formatoImporteCorto(valores.parametro_acumulado ?? c?.esperado)}) = valor esperado por el motor (${this.formatoImporteCorto(c?.esperado)})`;
    }

    if (operacion === 'impuesto_menos_retenciones') {
      return `Impuesto determinado acumulado (${this.formatoImporteCorto(valores.impuesto_determinado_acumulado)}) - retenciones anteriores (${this.formatoImporteCorto(valores.retenciones_anteriores)}) = retencion calculada (${this.formatoImporteCorto(c?.esperado)})`;
    }

    if (operacion === 'division_12') {
      return `Base Art. 30 informada del mes (${this.formatoImporteCorto(valores.base_art30 ?? c.total_base_esperada)}) / ${this.formatoCantidad(valores.divisor ?? 12)} = 12va parte esperada (${this.formatoImporteCorto(c?.esperado)})`;
    }

    if (c?.total_base_esperada !== null && c?.total_base_esperada !== undefined) {
      return `Base informada del mes (${this.formatoImporteCorto(c.total_base_esperada)}) / 12 = valor esperado (${this.formatoImporteCorto(c?.esperado)})`;
    }

    return c?.formula_spec || 'Ver valores esperados e informados.';
  }

  motivoHallazgo(h: any): string {
    const codigo = String(h?.codigo ?? '').toUpperCase();
    if (codigo.startsWith('V17')) return 'El acumulador informado no coincide con el parámetro Art. 30 vigente.';
    if (codigo.startsWith('V6')) return 'La 12va parte Art. 30 no coincide con los acumuladores informados.';
    if (codigo.startsWith('V10')) return 'La retención no se puede cerrar sin revisar el tratamiento del saldo.';
    return this.textoBreve(h?.accion_recomendada || h?.detalle_tecnico || 'Hay una diferencia contra la referencia del motor.', 160);
  }

  motivoComparacion(c: any): string {
    const operacion = String(c?.formula_operacion ?? '');
    if (operacion === 'parametro_por_cantidad') {
      return 'La cantidad/importe de hijos informado en Excel no coincide con lo detectado por el sistema.';
    }
    if (operacion === 'division_12') {
      return 'La 12va parte informada no coincide con la base Art. 30 del mes.';
    }
    if (operacion === 'parametro_acumulado') {
      return 'El acumulado informado no coincide con el parámetro vigente.';
    }
    if (operacion === 'impuesto_menos_retenciones') {
      return 'La retención informada no coincide con impuesto determinado menos retenciones anteriores.';
    }
    return 'El valor informado no coincide con el valor esperado por el sistema.';
  }

  formulaExcel(c: any): string {
    const valores = c?.formula_valores ?? {};
    const operacion = String(c?.formula_operacion ?? '');

    if (operacion === 'parametro_por_cantidad') {
      return `Parámetro hijos Art. 30 acumulado (${this.formatoImporteCorto(valores.parametro_por_hijo)}) x cantidad que surge del Excel (${this.formatoCantidad(valores.cantidad_equivalente_informada)}) = ${this.formatoImporteCorto(c?.informado)}`;
    }

    if (operacion === 'division_12') {
      return `Base usada por Excel (${this.formatoImporteCorto(c?.total_base_probable ?? Number(c?.informado) * 12)}) / 12 = ${this.formatoImporteCorto(c?.informado)}`;
    }

    if (operacion === 'parametro_acumulado') {
      return `Acumulado informado en Excel = ${this.formatoImporteCorto(c?.informado)}`;
    }

    if (operacion === 'impuesto_menos_retenciones') {
      return `Retención informada en Excel = ${this.formatoImporteCorto(c?.informado)}`;
    }

    return `Valor informado en Excel = ${this.formatoImporteCorto(c?.informado)}`;
  }

  formulaSistema(c: any): string {
    const valores = c?.formula_valores ?? {};
    const operacion = String(c?.formula_operacion ?? '');

    if (operacion === 'parametro_por_cantidad') {
      return `Parámetro hijos Art. 30 acumulado (${this.formatoImporteCorto(valores.parametro_por_hijo)}) x cantidad de hijos detectada (${this.formatoCantidad(valores.cantidad_hijos_detectada)}) = ${this.formatoImporteCorto(c?.esperado)}`;
    }

    if (operacion === 'division_12') {
      return `Base Art. 30 informada del mes (${this.formatoImporteCorto(valores.base_art30 ?? c?.total_base_esperada)}) / 12 = ${this.formatoImporteCorto(c?.esperado)}`;
    }

    if (operacion === 'parametro_acumulado') {
      return `Parámetro acumulado vigente = ${this.formatoImporteCorto(c?.esperado)}`;
    }

    if (operacion === 'impuesto_menos_retenciones') {
      return `Impuesto determinado (${this.formatoImporteCorto(valores.impuesto_determinado_acumulado)}) - retenciones anteriores (${this.formatoImporteCorto(valores.retenciones_anteriores)}) = ${this.formatoImporteCorto(c?.esperado)}`;
    }

    return `Valor esperado por el sistema = ${this.formatoImporteCorto(c?.esperado)}`;
  }

  causaBreve(c: any): string {
    const valores = c?.formula_valores ?? {};
    const operacion = String(c?.formula_operacion ?? '');

    if (operacion === 'parametro_por_cantidad') {
      const detectada = this.formatoCantidad(valores.cantidad_hijos_detectada);
      const informada = this.formatoCantidad(valores.cantidad_equivalente_informada);
      return `Puede haber una carga duplicada o una cantidad de hijos distinta: el sistema detecta ${detectada}, pero el Excel equivale a ${informada}.`;
    }

    if (operacion === 'division_12') {
      return 'Puede haberse usado otra base Art. 30 o un acumulador distinto al informado para ese mes.';
    }

    if (operacion === 'parametro_acumulado') {
      return 'Puede estar cargado un parámetro anterior, un acumulado manual o un valor de otro semestre.';
    }

    if (operacion === 'impuesto_menos_retenciones') {
      return 'Puede faltar configurar cómo se trata el saldo a favor o puede haber una retención informada con otro criterio.';
    }

    return this.textoBreve(c?.causa_probable || c?.por_que_revisar || 'Revisar el dato de origen contra la referencia del sistema.', 180);
  }

  formulaValores(c: any): Array<{ label: string; valor: string }> {
    const valores = c?.formula_valores;
    if (!valores || typeof valores !== 'object' || Array.isArray(valores)) return [];
    const orden = this.ordenFormula(String(c?.formula_operacion ?? ''));
    const entries = Object.entries(valores).sort(([a], [b]) => {
      const ia = orden.indexOf(a);
      const ib = orden.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return entries.map(([clave, valor]) => ({
      label: this.labelFormula(clave),
      valor: this.valorFormula(clave, valor),
    }));
  }

  textoBreve(texto: unknown, maximo = 220): string {
    const valor = String(texto ?? '').replace(/\s+/g, ' ').trim();
    if (!valor) return '';
    if (valor.length <= maximo) return valor;
    return `${valor.slice(0, maximo).trim()}...`;
  }

  private formatoNumeroPlano(valor: unknown): string {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 'No disponible';
    return n.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatoImporteCorto(valor: unknown): string {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 'No disponible';
    return `$ ${n.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private formatoCantidad(valor: unknown): string {
    const n = Number(valor);
    if (!Number.isFinite(n)) return 'No disponible';
    return n.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private labelFormula(clave: string): string {
    const labels: Record<string, string> = {
      parametro_acumulado: 'Parametro esperado',
      acumulado_informado_excel: 'Acumulado informado Excel',
      parametro_por_hijo: 'Parametro hijo Art. 30 acumulado',
      cantidad_hijos_detectada: 'Cantidad de hijos detectada',
      acumulado_esperado: 'Acumulado esperado',
      cantidad_equivalente_informada: 'Equivalente informado',
      impuesto_determinado_acumulado: 'Impuesto determinado',
      retenciones_anteriores: 'Retenciones anteriores',
      retencion_calculada: 'Retencion calculada',
      retencion_informada_excel: 'Retencion informada',
      ganancia_no_imponible: 'Ganancia no imponible',
      conyuge: 'Conyuge',
      hijos: 'Hijos',
      otras_cargas: 'Otras cargas',
      deduccion_especial: 'Deduccion especial',
      base_art30: 'Base Art. 30',
      divisor: 'Divisor',
      doceava_esperada: '12va esperada',
      doceava_informada_excel: '12va informada Excel',
    };
    return labels[clave] ?? clave.replace(/_/g, ' ');
  }

  private ordenFormula(operacion: string): string[] {
    const ordenes: Record<string, string[]> = {
      parametro_por_cantidad: [
        'parametro_por_hijo',
        'cantidad_hijos_detectada',
        'acumulado_esperado',
        'acumulado_informado_excel',
        'cantidad_equivalente_informada',
      ],
      parametro_acumulado: [
        'parametro_acumulado',
        'acumulado_informado_excel',
      ],
      impuesto_menos_retenciones: [
        'impuesto_determinado_acumulado',
        'retenciones_anteriores',
        'retencion_calculada',
        'retencion_informada_excel',
      ],
      division_12: [
        'ganancia_no_imponible',
        'conyuge',
        'hijos',
        'otras_cargas',
        'deduccion_especial',
        'base_art30',
        'divisor',
        'doceava_esperada',
        'doceava_informada_excel',
      ],
    };
    return ordenes[operacion] ?? [];
  }

  private valorFormula(clave: string, valor: unknown): string {
    if (typeof valor === 'string') return valor;
    if (clave.includes('cantidad') || clave.includes('equivalente') || clave === 'divisor') {
      return this.formatoCantidad(valor);
    }
    return this.formatoImporteCorto(valor);
  }
}
