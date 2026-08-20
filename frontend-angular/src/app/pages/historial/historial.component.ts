import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AnalisisResumen } from '../../core/models/analisis.model';
import { AnalisisService } from '../../core/services/analisis.service';

@Component({
  selector: 'app-historial',
  template: `
    <main class="p-6 max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div class="space-y-1">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-100">
            <mat-icon class="!text-base !w-4 !h-4">history</mat-icon>
            Auditorías ejecutadas
          </div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight m-0">Historial de análisis</h1>
          <p class="text-sm text-slate-500 max-w-2xl">
            Consulta los Excel procesados, revisa resultados, descarga el JSON de respaldo o elimina registros del historial.
          </p>
        </div>

        <a mat-flat-button color="primary" routerLink="/cargar-excel" class="!rounded-xl !h-11 px-5 shadow-sm">
          <mat-icon>add_circle</mat-icon>
          Nuevo análisis
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <mat-card class="p-4 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-blue-50 text-brand-600 grid place-items-center">
              <mat-icon>inventory_2</mat-icon>
            </div>
            <div>
              <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider m-0">Total</p>
              <p class="text-2xl font-extrabold text-slate-900 m-0">{{ total }}</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="p-4 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div>
              <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider m-0">Correctos</p>
              <p class="text-2xl font-extrabold text-slate-900 m-0">{{ totalCorrectos }}</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="p-4 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center">
              <mat-icon>report_problem</mat-icon>
            </div>
            <div>
              <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider m-0">Con revisión</p>
              <p class="text-2xl font-extrabold text-slate-900 m-0">{{ totalConRevision }}</p>
            </div>
          </div>
        </mat-card>
      </div>

      <mat-card class="p-4 border border-slate-100 shadow-sm rounded-2xl bg-white">
        <form [formGroup]="filtros" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center">
          <label class="campo-filtro">
            <mat-icon>business</mat-icon>
            <input formControlName="cliente" placeholder="Buscar por cliente" aria-label="Buscar por cliente">
          </label>

          <label class="campo-filtro">
            <mat-icon>badge</mat-icon>
            <input formControlName="legajo" placeholder="Legajo del empleado" aria-label="Legajo del empleado">
          </label>

          <label class="campo-filtro campo-filtro-select">
            <mat-icon>fact_check</mat-icon>
            <select formControlName="estado" aria-label="Estado de validación">
              <option value="">Todos los registros</option>
              <option value="analisis_completado">Completado</option>
              <option value="no_procesable">No procesable</option>
            </select>
            <mat-icon class="select-arrow">expand_more</mat-icon>
          </label>

          <div class="flex gap-2 h-[48px] items-center">
            <button mat-flat-button color="primary" class="flex-1 xl:w-44 !rounded-xl !h-full font-semibold shadow-sm" type="button" (click)="pagina=1; cargar()">
              <mat-icon class="text-sm">filter_alt</mat-icon>
              Filtrar
            </button>
            <button mat-stroked-button class="!rounded-xl !h-full !text-slate-500 hover:!bg-slate-50" type="button" (click)="limpiarFiltros()" title="Limpiar filtros" aria-label="Limpiar filtros">
              <mat-icon class="m-0">layers_clear</mat-icon>
            </button>
          </div>
        </form>
      </mat-card>

      <mat-card class="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white p-0">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900 m-0">Ejecuciones reales</h2>
            <p class="text-xs text-slate-500 m-0">Registros guardados por el backend y disponibles para trazabilidad.</p>
          </div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-500 w-fit">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
            {{ datos.length }} en pantalla
          </span>
        </div>

        <div *ngIf="datos.length; else historialVacio">
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full tabla-historial">
            <colgroup>
              <col class="w-[125px]">
              <col class="w-[100px]">
              <col class="w-[60px]">
              <col class="w-[205px]">
              <col class="w-[190px]">
              <col class="w-[125px]">
              <col class="w-[112px]">
            </colgroup>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Legajo</th>
                <th>Archivo</th>
                <th>Estado</th>
                <th class="!text-right">Diferencia</th>
                <th class="!text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let x of datos">
                <td class="whitespace-nowrap">
                  <div class="font-semibold text-slate-700">{{ x.fecha_analisis | fechaAr }}</div>
                </td>
                <td>
                  <div class="font-bold text-slate-900 truncate max-w-[220px]" [title]="x.cliente">
                    {{ x.cliente || 'Sin cliente' }}
                  </div>
                </td>
                <td>
                  <span class="inline-flex px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 font-mono text-xs font-bold text-slate-700">
                    {{ x.legajo || '—' }}
                  </span>
                </td>
                <td>
                  <div class="flex items-center gap-2 min-w-0 max-w-[220px]">
                    <mat-icon class="!text-base !w-4 !h-4 text-brand-500 shrink-0">description</mat-icon>
                    <span class="truncate text-xs text-slate-500" [title]="x.archivo">{{ x.archivo || 'Sin archivo' }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap">
                  <app-badge [estado]="x.veredicto || x.estado"></app-badge>
                </td>
                <td class="text-right whitespace-nowrap">
                  <span class="font-mono text-xs font-extrabold px-2 py-1 rounded-lg" [ngClass]="claseDiferencia(x.diferencia)">
                    {{ x.diferencia | monedaAr }}
                  </span>
                </td>
                <td>
                  <div class="flex items-center justify-center gap-2">
                    <a [routerLink]="['/analisis', x.id]" class="accion-btn accion-primaria" title="Ver analisis" aria-label="Ver analisis">
                      <mat-icon>visibility</mat-icon>
                    </a>
                    <a [href]="json(x.id)" class="accion-btn accion-secundaria" title="Descargar JSON" aria-label="Descargar JSON">
                      <mat-icon>download</mat-icon>
                    </a>
                    <button type="button" class="accion-btn accion-peligro"
                            [disabled]="eliminandoId === x.id"
                            (click)="eliminar(x.id)" title="Eliminar análisis" aria-label="Eliminar análisis">
                      <mat-spinner *ngIf="eliminandoId === x.id" diameter="15" color="warn"></mat-spinner>
                      <mat-icon *ngIf="eliminandoId !== x.id">delete_outline</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
            </table>
          </div>

          <div class="md:hidden p-4 space-y-3">
            <article *ngFor="let x of datos" class="historial-card-mobile">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
                    {{ x.fecha_analisis | fechaAr }}
                  </p>
                  <h3 class="text-base font-extrabold text-slate-900 m-0 truncate" [title]="x.cliente">
                    {{ x.cliente || 'Sin cliente' }}
                  </h3>
                  <p class="text-xs text-slate-500 m-0">
                    Legajo <span class="font-mono font-bold text-slate-700">{{ x.legajo || '—' }}</span>
                  </p>
                </div>
                <app-badge [estado]="x.veredicto || x.estado"></app-badge>
              </div>

              <div class="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <div class="flex items-center gap-2 min-w-0">
                  <mat-icon class="!text-base !w-4 !h-4 text-brand-500 shrink-0">description</mat-icon>
                  <span class="truncate text-xs text-slate-600" [title]="x.archivo">{{ x.archivo || 'Sin archivo' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs font-semibold text-slate-500">Diferencia</span>
                  <span class="font-mono text-xs font-extrabold px-2 py-1 rounded-lg" [ngClass]="claseDiferencia(x.diferencia)">
                    {{ x.diferencia | monedaAr }}
                  </span>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-3 gap-2">
                <a [routerLink]="['/analisis', x.id]" class="accion-card accion-primaria" aria-label="Ver analisis">
                  <mat-icon>visibility</mat-icon>
                  Ver
                </a>
                <a [href]="json(x.id)" class="accion-card accion-secundaria" aria-label="Descargar JSON">
                  <mat-icon>download</mat-icon>
                  JSON
                </a>
                <button
                  type="button"
                  class="accion-card accion-peligro"
                  [disabled]="eliminandoId === x.id"
                  (click)="eliminar(x.id)"
                  aria-label="Eliminar análisis">
                  <mat-spinner *ngIf="eliminandoId === x.id" diameter="15" color="warn"></mat-spinner>
                  <mat-icon *ngIf="eliminandoId !== x.id">delete_outline</mat-icon>
                  Eliminar
                </button>
              </div>
            </article>
          </div>
        </div>

        <mat-paginator
          *ngIf="datos.length"
          class="border-t border-slate-100 bg-slate-50/70"
          [length]="total"
          [pageSize]="20"
          [hidePageSize]="true"
          (page)="pagina=$event.pageIndex+1; cargar()">
        </mat-paginator>
      </mat-card>

      <ng-template #historialVacio>
        <div class="p-10 text-center space-y-3">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 text-slate-400 grid place-items-center border border-slate-100">
            <mat-icon class="!text-3xl !w-8 !h-8">folder_open</mat-icon>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800 m-0">Todavía no hay análisis para mostrar</h3>
            <p class="text-sm text-slate-500 m-0">Carga un Excel o limpia los filtros para ver registros anteriores.</p>
          </div>
          <button mat-stroked-button class="!rounded-xl" type="button" (click)="limpiarFiltros()">
            <mat-icon>layers_clear</mat-icon>
            Limpiar filtros
          </button>
        </div>
      </ng-template>
    </main>

    <ng-template #confirmDialog>
      <div class="p-1">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-11 h-11 rounded-2xl bg-red-50 text-red-600 grid place-items-center border border-red-100 shrink-0">
            <mat-icon>warning_amber</mat-icon>
          </div>
          <div>
            <h2 mat-dialog-title class="text-lg font-extrabold text-slate-900 p-0 m-0 border-0">Eliminar análisis</h2>
            <p class="text-xs text-slate-500 m-0 mt-1">Esta acción solo afecta el historial guardado.</p>
          </div>
        </div>

        <mat-dialog-content class="!p-0 text-slate-600 space-y-3">
          <p class="text-sm font-medium text-slate-700">¿Querés eliminar este análisis del historial?</p>
          <div class="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
            <strong>Nota:</strong> Esto elimina el registro guardado por la aplicación. No modifica ni borra el Excel original de tu equipo.
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end" class="gap-2 pt-4 !pb-0 !px-0">
          <button mat-button mat-dialog-close class="!rounded-xl !text-slate-500">Cancelar</button>
          <button mat-flat-button color="warn" [mat-dialog-close]="true" class="!rounded-xl px-4">
            Eliminar
          </button>
        </mat-dialog-actions>
      </div>
    </ng-template>
  `,
  styles: [`
    .campo-filtro {
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 0 14px;
      border: 1px solid #cbd7ea;
      border-radius: 12px;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .campo-filtro:focus-within {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      background: #ffffff;
    }

    .campo-filtro mat-icon {
      flex: 0 0 auto;
      color: #64748b;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .campo-filtro input,
    .campo-filtro select {
      width: 100%;
      min-width: 0;
      height: 46px;
      border: 0;
      outline: 0;
      background: transparent;
      color: #0f172a;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
    }

    .campo-filtro input::placeholder {
      color: #64748b;
      font-weight: 700;
      opacity: 1;
    }

    .campo-filtro-select {
      position: relative;
      padding-right: 42px;
    }

    .campo-filtro-select select {
      appearance: none;
      cursor: pointer;
      color: #0f172a;
    }

    .campo-filtro-select .select-arrow {
      position: absolute;
      right: 12px;
      color: #64748b;
      pointer-events: none;
    }

    .tabla-historial {
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
      table-layout: fixed;
      min-width: 930px;
    }

    .tabla-historial th {
      padding: 13px 12px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .tabla-historial td {
      padding: 13px 12px;
      border-bottom: 1px solid #eef2f7;
      vertical-align: middle;
    }

    .tabla-historial tbody tr {
      transition: background-color 160ms ease, box-shadow 160ms ease;
    }

    .tabla-historial tbody tr:hover {
      background: #f8fbff;
    }

    .accion-btn {
      width: 34px;
      height: 34px;
      display: inline-grid;
      place-items: center;
      border: 1px solid #dbe6f3;
      border-radius: 10px;
      background: #ffffff;
      transition: all 160ms ease;
      cursor: pointer;
      text-decoration: none;
    }

    .accion-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      line-height: 18px;
    }

    .accion-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
    }

    .accion-primaria {
      color: #2563eb;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    .accion-secundaria {
      color: #475569;
      background: #ffffff;
    }

    .accion-peligro {
      color: #dc2626;
      background: #ffffff;
    }

    .accion-peligro:hover {
      border-color: #fecaca;
      background: #fef2f2;
    }

    .accion-btn:disabled {
      opacity: 0.55;
      cursor: wait;
      transform: none;
      box-shadow: none;
    }

    .historial-card-mobile {
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
    }

    .accion-card {
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid #dbe6f3;
      border-radius: 12px;
      background: #ffffff;
      color: #475569;
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
      transition: all 160ms ease;
    }

    .accion-card mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      line-height: 17px;
    }

    .accion-card:disabled {
      opacity: 0.6;
      cursor: wait;
    }
  `],
})
export class HistorialComponent implements OnInit {
  datos: AnalisisResumen[] = [];
  total = 0;
  pagina = 1;
  filtros = this.fb.group({ cliente: '', legajo: '', estado: '' });
  eliminandoId = '';

  @ViewChild('confirmDialog') confirmDialog!: TemplateRef<any>;

  constructor(
    private service: AnalisisService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    const v = this.filtros.getRawValue();
    this.service
      .listar({
        cliente: v.cliente ?? '',
        legajo: v.legajo ?? '',
        estado: v.estado ?? '',
        pagina: this.pagina,
      })
      .subscribe((r) => {
        this.datos = r.datos;
        this.total = r.total || r.datos.length;
      });
  }

  limpiarFiltros() {
    this.filtros.reset({ cliente: '', legajo: '', estado: '' });
    this.pagina = 1;
    this.cargar();
  }

  json(id: string) {
    return this.service.urlJson(id);
  }

  claseDiferencia(diferencia: number) {
    if (!diferencia) return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    return 'text-amber-700 bg-amber-50 border border-amber-100';
  }

  get totalCorrectos() {
    return this.datos.filter((x) => x.veredicto === 'CORRECTO').length;
  }

  get totalConRevision() {
    return this.datos.filter((x) => x.veredicto !== 'CORRECTO').length;
  }

  eliminar(id: string) {
    const dialogRef = this.dialog.open(this.confirmDialog, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      restoreFocus: true,
      hasBackdrop: true,
      panelClass: 'custom-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.eliminandoId = id;
        this.service.eliminar(id).subscribe({
          next: () => {
            this.snackbar.open('Análisis eliminado del historial.', 'Entendido', {
              duration: 3500,
            });
            this.cargar();
            this.eliminandoId = '';
          },
          error: () => {
            this.snackbar.open('No se pudo eliminar el análisis. Intenta nuevamente.', 'Reintentar', {
              duration: 3500,
            });
            this.eliminandoId = '';
          },
        });
      }
    });
  }
}
