import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AnalisisService } from '../../core/services/analisis.service';
import { EstadoAnalisisService } from '../../core/services/estado-analisis.service';

@Component({
  selector: 'app-diagnosticos',
  template: `
    <main class="p-6 max-w-7xl mx-auto space-y-6">
      
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <mat-icon class="text-brand-600">fact_check</mat-icon> Centro de Diagnósticos
        </h1>
        <p class="text-sm text-slate-500">Métricas globales de la plataforma y cobertura analítica del caso en revisión.</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <mat-card class="p-4 border border-slate-100 shadow-sm rounded-xl bg-white flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Analizados</span>
          <div class="text-2xl font-extrabold text-slate-800 font-mono">{{ resumen?.total || 0 }}</div>
        </mat-card>
        
        <mat-card *ngFor="let e of resumen?.por_estado" 
                  class="p-4 border border-slate-100 shadow-sm rounded-xl bg-white flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate mb-1" [title]="e._id">
            {{ e._id }}
          </span>
          <div class="text-2xl font-extrabold text-slate-700 font-mono">{{ e.cantidad }}</div>
        </mat-card>
      </div>

      <div *ngIf="cargando" class="flex justify-center py-2">
        <mat-progress-spinner mode="indeterminate" diameter="28" color="primary"></mat-progress-spinner>
      </div>
      
      <div *ngIf="errorMsg" class="animate-fade-in">
        <mat-card class="p-4 border border-red-100 bg-red-50/40 rounded-xl text-center flex items-center justify-center gap-2 text-sm text-red-700">
          <mat-icon class="text-red-500">error_outline</mat-icon>
          <span class="font-medium">{{ errorMsg }}</span>
        </mat-card>
      </div>

      <mat-card *ngIf="actual && hallazgosEvaluados.length" class="border border-amber-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-base font-bold text-slate-800 m-0">Hallazgos evaluados</h2>
            <p class="text-xs text-slate-400 mt-0.5">Controles que el motor pudo revisar con los datos disponibles del Excel.</p>
          </div>
          <span class="text-xs font-bold font-mono px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
            {{ hallazgosEvaluados.length }} hallazgo(s)
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div *ngFor="let v of hallazgosEvaluados" class="p-3.5 rounded-xl border" [ngClass]="claseHallazgo(v.estado)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 font-mono font-bold bg-white/70 text-slate-700 rounded text-[9px] tracking-wider uppercase">
                    {{ etiquetaValidacion(v.codigo) }}
                  </span>
                  <h4 class="text-xs font-bold text-slate-800 m-0">{{ v.nombre || v.codigo }}</h4>
                </div>
                <p class="text-xs text-slate-600 leading-relaxed mt-1 break-words">{{ v.detalle }}</p>
                <p *ngIf="v.tipo_hallazgo" class="text-[11px] text-slate-500 mt-1 font-mono">{{ v.tipo_hallazgo }}</p>
              </div>
              <span class="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border" [ngClass]="claseBadge(v.estado)">
                {{ v.estado }}
              </span>
            </div>
          </div>
        </div>
      </mat-card>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <mat-card class="lg:col-span-2 border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-bold text-slate-800 m-0">Limitaciones del Análisis Actual</h2>
              <p class="text-xs text-slate-400 mt-0.5">Reglas de negocio del catálogo que no pudieron ser ponderadas.</p>
            </div>
            <span *ngIf="actual && noEvaluadas.length" class="text-xs font-bold font-mono px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
              {{ noEvaluadas.length }} Omitidas
            </span>
          </div>

          <ng-container *ngIf="actual">
            <div class="space-y-3 max-h-[380px] overflow-y-auto pr-2">
              <div *ngFor="let v of noEvaluadas" 
                   class="p-3.5 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 font-mono font-bold bg-slate-200 text-slate-700 rounded text-[9px] tracking-wider uppercase">
                    {{ etiquetaValidacion(v.codigo) }}
                  </span>
                  <h4 class="text-xs font-bold text-slate-700 m-0">{{ v.nombre }}</h4>
                </div>
                <p class="text-xs text-slate-500 leading-relaxed break-words">{{ v.detalle }}</p>
              </div>

              <div *ngIf="noEvaluadas.length === 0" class="text-center py-10 space-y-2">
                <mat-icon class="text-green-500 !text-3xl !w-8 !h-8">verified</mat-icon>
                <p class="text-xs text-slate-400 max-w-xs mx-auto">
                  Sin limitaciones detectadas. Todas las directrices del motor legal fueron cruzadas exitosamente.
                </p>
              </div>
            </div>
          </ng-container>

          <div *ngIf="!actual" class="text-center py-12 text-slate-400 space-y-2">
            <mat-icon class="!text-4xl !w-10 !h-10">folder_open</mat-icon>
            <p class="text-xs">Por favor, asigne un identificador de auditoría para examinar las variables omitidas.</p>
          </div>
        </mat-card>

        <mat-card class="border border-slate-100 shadow-sm rounded-xl p-6 bg-white space-y-4 h-full min-h-[220px]">
          <div class="space-y-1 border-b border-slate-100 pb-3">
            <h2 class="text-base font-bold text-slate-800 m-0">Insumos y Fuentes Faltantes</h2>
            <p class="text-xs text-slate-400">Documentos complementarios recomendados para mitigar desvíos.</p>
          </div>

          <div class="pt-1">
            <mat-chip-listbox class="flex flex-wrap gap-1.5">
              <mat-chip-option *ngFor="let f of fuentes" selectable="false" class="!bg-slate-100 !text-slate-700 text-xs !font-medium !rounded-lg">
                <mat-icon matChipAvatar class="text-slate-400 text-sm">attachment</mat-icon>
                {{ f }}
              </mat-chip-option>
            </mat-chip-listbox>
            
            <div *ngIf="fuentes.length === 0" class="flex flex-col items-center justify-center text-center py-8 text-slate-400 space-y-2">
              <mat-icon class="text-slate-300">task_alt</mat-icon>
              <p class="text-xs">No se requieren cruces alternativos de datos externos.</p>
            </div>
          </div>

          <a *ngIf="actual?.id"
             mat-flat-button
             color="primary"
             [routerLink]="['/analisis', actual.id, 'datos-complementarios']"
             class="!rounded-xl w-full mt-2">
            <mat-icon>playlist_add_check</mat-icon>
            Completar datos faltantes
          </a>
        </mat-card>
        
      </div>
    </main>
  `,
  styles: [`
    /* Scrollbar ultra compacta para las listas internas */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    :host ::ng-deep .mat-mdc-chip {
      max-width: 100%;
    }

    :host ::ng-deep .mat-mdc-chip .mdc-evolution-chip__text-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class DiagnosticosComponent implements OnInit {
  resumen: any;
  actual: any;
  cargando = false;
  errorMsg = '';

  constructor(
    private api: ApiService,
    private service: AnalisisService,
    private route: ActivatedRoute,
    estado: EstadoAnalisisService,
  ) {
    this.actual = estado.actual;
  }

  ngOnInit() {
    this.api.get('/diagnosticos/resumen').subscribe({ 
      next: (r) => (this.resumen = r), 
      error: () => {} 
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && !this.actual) {
      this.cargando = true;
      this.service.obtener(id).subscribe({
        next: (a) => {
          this.actual = a;
          this.cargando = false;
        },
        error: () => {
          this.errorMsg = `El token identificador de auditoría ${id} no se encuentra registrado en el nodo.`;
          this.cargando = false;
        },
      });
    }
  }

  etiquetaValidacion(c: string): string {
    if (c.startsWith('CTRL_')) return 'CTRL';
    if (c.startsWith('V10') && c.includes('SALDO')) return 'V10 Ampliada';
    return c.split('_')[0];
  }

  claseHallazgo(estado: string): string {
    if (estado === 'ERROR') return 'bg-red-50/50 border-red-100';
    if (estado === 'ADVERTENCIA') return 'bg-amber-50/50 border-amber-100';
    return 'bg-blue-50/40 border-blue-100';
  }

  claseBadge(estado: string): string {
    if (estado === 'ERROR') return 'bg-red-100 text-red-700 border-red-200';
    if (estado === 'ADVERTENCIA') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (estado === 'OK') return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  get hallazgosEvaluados(): any[] {
    const cobertura = this.actual?.cobertura_validaciones?.validaciones ?? [];
    const controles = this.actual?.controles_tecnicos ?? [];
    return [...cobertura, ...controles].filter(
      (v: any) => v.estado !== 'OK' && v.estado !== 'NO_EVALUADA' && v.estado !== 'INFORMATIVA',
    );
  }

  get noEvaluadas(): any[] {
    return (
      this.actual?.cobertura_validaciones?.validaciones?.filter(
        (v: any) => v.estado === 'NO_EVALUADA',
      ) ?? []
    );
  }

  get fuentes(): string[] {
    return [
      ...new Set(this.noEvaluadas.flatMap((v: any) => v.fuentes_sugeridas ?? [])),
    ] as string[];
  }
}
