import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalisisResumen } from '../../core/models/analisis.model';
import { AnalisisService } from '../../core/services/analisis.service';
import { ApiService } from '../../core/services/api.service';

interface KpiVeredicto {
  _id: string;
  cantidad: number;
}

interface ResumenApiResponse {
  total: number;
  por_veredicto: KpiVeredicto[];
}

const GRUPOS_VEREDICTO = {
  correctos: ['CORRECTO'],
  hallazgos: ['CON_HALLAZGOS', 'CON_HALLAZGOS_MENORES', 'CON_OBSERVACIONES', 'OBSERVADO'],
  errores: ['ERROR', 'ERROR_CRITICO', 'CON_ERRORES', 'CON_ERRORES_CRITICOS'],
  noProcesables: ['NO_PROCESABLE'],
};

@Component({
  selector: 'app-inicio',
  template: `
    <main class="inicio-page">
      <section class="hero">
        <div class="hero-content">
          <span class="hero-pill">
            <mat-icon>auto_awesome</mat-icon>
            Auditoría Inteligente v2
          </span>
          <h1>Bienvenido al auditor de Ganancias</h1>
          <p>
            Audite, valide y controle el Impuesto a las Ganancias con precisión matemática
            absoluta mediante nuestro motor determinístico y trazable.
          </p>
          <a mat-flat-button routerLink="/cargar-excel" class="hero-btn">
            <mat-icon>add_circle</mat-icon>
            Iniciar nuevo análisis
          </a>
        </div>

        <div class="hero-illustration" aria-hidden="true">
          <div class="sheet">
            <div class="chart"></div>
            <span></span>
            <span></span>
            <span class="short"></span>
            <div class="checks">
              <mat-icon>check_box</mat-icon>
              <mat-icon>check_box</mat-icon>
            </div>
          </div>
          <div class="lens"></div>
          <mat-icon class="spark spark-a">auto_awesome</mat-icon>
          <mat-icon class="spark spark-b">auto_awesome</mat-icon>
        </div>
      </section>

      <section class="kpis">
        <mat-card class="kpi kpi-blue">
          <div class="kpi-icon"><mat-icon>bar_chart</mat-icon></div>
          <div>
            <span>Total analizados</span>
            <strong>{{ kpiTotal }}</strong>
            <p>Análisis ejecutados en total</p>
          </div>
        </mat-card>

        <mat-card class="kpi kpi-green">
          <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
          <div>
            <span>Correctos</span>
            <strong>{{ kpiCorrectos }}</strong>
            <p>Sin hallazgos detectados</p>
          </div>
        </mat-card>

        <mat-card class="kpi kpi-amber">
          <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
          <div>
            <span>Hallazgos menores</span>
            <strong>{{ kpiHallazgos }}</strong>
            <p>Observaciones menores</p>
          </div>
        </mat-card>

        <mat-card class="kpi kpi-red">
          <div class="kpi-icon"><mat-icon>error</mat-icon></div>
          <div>
            <span>Errores críticos</span>
            <strong>{{ kpiErrores }}</strong>
            <p>Errores que requieren acción</p>
          </div>
        </mat-card>
      </section>

      <mat-card class="tabla-card">
        <div class="tabla-header">
          <div>
            <h2>Análisis recientes</h2>
            <p>Últimas 5 ejecuciones registradas en la plataforma</p>
          </div>
          <a mat-stroked-button routerLink="/historial" class="historial-link">
            Ver historial completo
            <mat-icon>chevron_right</mat-icon>
          </a>
        </div>

        <div class="tabla-wrap" *ngIf="recientes.length; else sinAnalisis">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Legajo</th>
                <th>Período</th>
                <th>Veredicto</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of recientes">
                <td>
                  <div class="cliente-cell">
                    <span class="avatar">{{ inicial(a.cliente) }}</span>
                    <strong>{{ a.cliente || 'Sin cliente' }}</strong>
                  </div>
                </td>
                <td>{{ a.legajo }}</td>
                <td>
                  <strong>{{ a.periodo }}</strong>
                  <small *ngIf="a.fecha_analisis">{{ fechaCorta(a.fecha_analisis) }}</small>
                </td>
                <td><app-badge [estado]="a.veredicto"></app-badge></td>
                <td class="text-right">
                  <a mat-icon-button [routerLink]="['/analisis', a.id]" title="Ver análisis">
                    <mat-icon>visibility</mat-icon>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #sinAnalisis>
          <div class="sin-analisis">
            <mat-icon>folder_open</mat-icon>
            <p>No se registran análisis cargados en el sistema.</p>
          </div>
        </ng-template>
      </mat-card>
    </main>
  `,
  styles: [`
    .inicio-page {
      width: min(100%, 1140px);
      margin: 0 auto;
      padding: 26px 28px 48px;
      display: grid;
      gap: 22px;
    }

    .hero {
      position: relative;
      min-height: 250px;
      overflow: hidden;
      border-radius: 22px;
      padding: 34px 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
      background:
        radial-gradient(circle at 86% 44%, rgba(255,255,255,.16), transparent 18%),
        linear-gradient(118deg, #2563eb 0%, #2563eb 48%, #6d4df7 100%);
      box-shadow: 0 18px 46px rgba(37, 99, 235, 0.26);
    }

    .hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 76% 44%, transparent 0 26%, rgba(255,255,255,.08) 27%, transparent 28%),
        radial-gradient(ellipse at 78% 46%, transparent 0 34%, rgba(255,255,255,.06) 35%, transparent 36%);
      pointer-events: none;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 650px;
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,.16);
      font-size: 12px;
      font-weight: 900;
    }

    .hero-pill mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .hero h1 {
      margin: 18px 0 10px;
      font-size: clamp(30px, 4vw, 42px);
      line-height: 1.05;
      font-weight: 950;
      letter-spacing: -0.05em;
    }

    .hero p {
      max-width: 640px;
      margin: 0 0 24px;
      color: #eaf2ff;
      font-size: 16px;
      line-height: 1.55;
    }

    .hero-btn {
      height: 46px;
      padding: 0 18px;
      border-radius: 14px;
      background: #ffffff !important;
      color: #2563eb !important;
      font-weight: 900;
      box-shadow: 0 12px 26px rgba(15,23,42,.14);
    }

    .hero-btn mat-icon {
      margin-right: 7px;
    }

    .hero-illustration {
      position: relative;
      z-index: 1;
      width: 240px;
      height: 190px;
      flex: 0 0 240px;
      display: grid;
      place-items: center;
    }

    .sheet {
      position: absolute;
      width: 118px;
      height: 156px;
      padding: 22px 18px;
      border-radius: 14px;
      background: rgba(255,255,255,.94);
      box-shadow: 0 22px 38px rgba(15,23,42,.16);
    }

    .chart {
      width: 48px;
      height: 48px;
      margin: 0 auto 18px;
      border-radius: 999px;
      background: conic-gradient(#2563eb 0 35%, #93c5fd 35% 64%, #6d4df7 64% 100%);
    }

    .sheet span {
      display: block;
      height: 8px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: #e5e7eb;
    }

    .sheet span.short {
      width: 68%;
    }

    .checks {
      display: grid;
      gap: 6px;
      color: #2563eb;
    }

    .lens {
      position: absolute;
      right: 16px;
      bottom: 16px;
      width: 68px;
      height: 68px;
      border: 10px solid #1f2a44;
      border-radius: 999px;
    }

    .lens::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 60px;
      right: -22px;
      bottom: -48px;
      border-radius: 999px;
      background: #1f2a44;
      transform: rotate(-42deg);
      transform-origin: top center;
    }

    .spark {
      position: absolute;
      color: rgba(255,255,255,.72);
    }

    .spark-a { right: 36px; top: 42px; }
    .spark-b { left: 14px; bottom: 44px; font-size: 17px; }

    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
    }

    .kpi {
      min-height: 112px;
      padding: 22px;
      border: 1px solid #dce7f7;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
      display: flex;
      align-items: center;
      gap: 18px;
    }

    .kpi-icon {
      width: 58px;
      height: 58px;
      border-radius: 999px;
      display: grid;
      place-items: center;
    }

    .kpi-icon mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }

    .kpi span {
      display: block;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-size: 12px;
      font-weight: 900;
    }

    .kpi strong {
      display: block;
      font-size: 30px;
      line-height: 1;
      color: #0f172a;
      font-weight: 950;
    }

    .kpi p {
      margin: 8px 0 0;
      color: #64748b;
      font-size: 13px;
    }

    .kpi-blue span { color: #2563eb; }
    .kpi-blue .kpi-icon { background: #eaf2ff; color: #2563eb; }
    .kpi-green span { color: #16a34a; }
    .kpi-green .kpi-icon { background: #dcfce7; color: #16a34a; }
    .kpi-amber span { color: #d97706; }
    .kpi-amber .kpi-icon { background: #fef3c7; color: #f59e0b; }
    .kpi-red span { color: #dc2626; }
    .kpi-red .kpi-icon { background: #ffe4e6; color: #dc2626; }

    .tabla-card {
      overflow: hidden;
      border: 1px solid #dce7f7;
      border-radius: 18px;
      box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    }

    .tabla-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 20px 24px;
      border-bottom: 1px solid #eef2f7;
    }

    .tabla-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 19px;
      font-weight: 950;
    }

    .tabla-header p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 13px;
    }

    .historial-link {
      border-radius: 12px;
      color: #2563eb;
      font-weight: 900;
      white-space: nowrap;
    }

    .tabla-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      padding: 15px 24px;
      text-align: left;
      background: #f8fafc;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 950;
      text-transform: uppercase;
    }

    td {
      padding: 16px 24px;
      border-top: 1px solid #eef2f7;
      color: #334155;
      font-size: 14px;
    }

    .text-right {
      text-align: right;
    }

    .cliente-cell {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #eaf2ff;
      color: #2563eb;
      font-weight: 950;
    }

    tr:nth-child(even) .avatar {
      background: #dcfce7;
      color: #16a34a;
    }

    td small {
      display: block;
      margin-top: 2px;
      color: #94a3b8;
      font-size: 12px;
    }

    .sin-analisis {
      display: grid;
      place-items: center;
      gap: 8px;
      padding: 46px;
      color: #94a3b8;
    }

    @media (max-width: 1100px) {
      .kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hero-illustration {
        display: none;
      }
    }

    @media (max-width: 700px) {
      .inicio-page {
        padding: 18px 14px 34px;
      }

      .hero {
        padding: 26px 22px;
      }

      .kpis {
        grid-template-columns: 1fr;
      }

      .tabla-header {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `],
})
export class InicioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  kpiTotal = 0;
  kpiCorrectos = 0;
  kpiHallazgos = 0;
  kpiErrores = 0;
  kpiNoProcesables = 0;
  recientes: AnalisisResumen[] = [];

  constructor(
    private analisisService: AnalisisService,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.cargarKpisGlobales();
    this.cargarAnalisisRecientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  inicial(cliente: string): string {
    return (cliente || '?').trim().charAt(0).toUpperCase() || '?';
  }

  fechaCorta(fecha: string): string {
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private cargarKpisGlobales(): void {
    this.apiService.get<ResumenApiResponse>('/diagnosticos/resumen')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.kpiTotal = res?.total ?? 0;
          const pv = res?.por_veredicto ?? [];
          this.kpiCorrectos = this.sumar(pv, GRUPOS_VEREDICTO.correctos);
          this.kpiHallazgos = this.sumar(pv, GRUPOS_VEREDICTO.hallazgos);
          this.kpiErrores = this.sumar(pv, GRUPOS_VEREDICTO.errores);
          this.kpiNoProcesables = this.sumar(pv, GRUPOS_VEREDICTO.noProcesables);
        },
      });
  }

  private cargarAnalisisRecientes(): void {
    this.analisisService.listar({ limite: 5 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.recientes = res?.datos ?? [];
        },
      });
  }

  private sumar(pv: KpiVeredicto[], keys: string[]): number {
    const upperKeys = new Set(keys.map(k => this.normalizarVeredicto(k)));
    return pv
      .filter((x) => x._id && upperKeys.has(this.normalizarVeredicto(x._id)))
      .reduce((acc, x) => acc + (x.cantidad ?? 0), 0);
  }

  private normalizarVeredicto(valor: string): string {
    return valor.trim().toUpperCase().replace(/\s+/g, '_');
  }
}
