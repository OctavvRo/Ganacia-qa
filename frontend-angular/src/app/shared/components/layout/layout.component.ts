import { Component, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { HttpClient } from '@angular/common/http';
import { AuthService, UsuarioAutenticado } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

/* Estado de una pasada de Playwright */
type EstadoRun = 'idle' | 'corriendo' | 'verde' | 'rojo';

interface QaRunConfig {
  pantalla: 'pantalla-1' | 'pantalla-2';
  label: string;
  estado: EstadoRun;
  duracion_ms?: number;
  salida?: string;
}

@Component({
  selector: 'app-layout',
  template: `
    <!-- ── Overlay de resultado Playwright ──────────────────────────────── -->
    <div class="pw-overlay" *ngIf="runActivo"
         [class.pw-verde]="runActivo.estado === 'verde'"
         [class.pw-rojo]="runActivo.estado === 'rojo'">
      <div class="pw-overlay-inner">
        <div class="pw-icono">
          <mat-icon *ngIf="runActivo.estado === 'corriendo'" class="spin">sync</mat-icon>
          <mat-icon *ngIf="runActivo.estado === 'verde'">check_circle</mat-icon>
          <mat-icon *ngIf="runActivo.estado === 'rojo'">cancel</mat-icon>
        </div>
        <div class="pw-info">
          <div class="pw-titulo">
            <span *ngIf="runActivo.estado === 'corriendo'">Ejecutando Playwright — {{ runActivo.label }}…</span>
            <span *ngIf="runActivo.estado === 'verde'">✅ Playwright OK — {{ runActivo.label }}</span>
            <span *ngIf="runActivo.estado === 'rojo'">❌ Playwright falló — {{ runActivo.label }}</span>
          </div>
          <div class="pw-sub" *ngIf="runActivo.duracion_ms">
            Duración: {{ (runActivo.duracion_ms / 1000) | number:'1.1-1' }}s
          </div>
          <pre class="pw-log" *ngIf="runActivo.salida && runActivo.estado !== 'corriendo'">{{ runActivo.salida }}</pre>
        </div>
        <button class="pw-cerrar" (click)="cerrarOverlay()" *ngIf="runActivo.estado !== 'corriendo'">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>

    <mat-sidenav-container class="layout-shell">
      <mat-sidenav
        #sidenav
        class="sidebar"
        [mode]="esMobile ? 'over' : 'side'"
        [opened]="!esMobile"
        [fixedInViewport]="esMobile">
        <div class="brand">
          <img src="/assets/logo-esueldos.png" alt="e-Sueldos" (error)="logoRoto = true" [class.oculto]="logoRoto" />
          <div *ngIf="logoRoto" class="brand-fallback">
            <mat-icon>cloud</mat-icon>
            <span>e-Sueldos</span>
          </div>
        </div>

        <nav class="menu">
          <a
            *ngFor="let item of items"
            mat-button
            [routerLink]="item.ruta"
            routerLinkActive="activo"
            class="menu-link"
            (click)="cerrarMenuSiMobile()">
            <mat-icon>{{ item.icono }}</mat-icon>
            <span>{{ item.texto }}</span>
          </a>

          <button
            mat-button
            type="button"
            class="menu-link menu-toggle"
            [class.abierto]="qaAbierto"
            (click)="toggleQa()"
            aria-label="Abrir menú QA">
            <mat-icon>science</mat-icon>
            <span>QA</span>
            <mat-icon class="chevron">expand_more</mat-icon>
          </button>

          <div *ngIf="qaAbierto" class="submenu">
            <!-- Pantalla 1 -->
            <div class="submenu-row">
              <a
                mat-button
                routerLink="/qa/pantalla-1"
                routerLinkActive="activo"
                class="submenu-link"
                (click)="cerrarMenuSiMobile()">
                Pantalla 1
              </a>
              <button
                class="btn-play"
                [class.corriendo]="qaRuns[0].estado === 'corriendo'"
                [class.verde]="qaRuns[0].estado === 'verde'"
                [class.rojo]="qaRuns[0].estado === 'rojo'"
                [disabled]="qaRuns[0].estado === 'corriendo' || !!runActivo"
                (click)="ejecutarPlaywright(qaRuns[0])"
                matTooltip="Ejecutar Playwright — Pantalla 1"
                matTooltipPosition="right"
                type="button">
                <mat-icon *ngIf="qaRuns[0].estado === 'idle'">play_circle</mat-icon>
                <mat-icon *ngIf="qaRuns[0].estado === 'corriendo'" class="spin">sync</mat-icon>
                <mat-icon *ngIf="qaRuns[0].estado === 'verde'">check_circle</mat-icon>
                <mat-icon *ngIf="qaRuns[0].estado === 'rojo'">cancel</mat-icon>
              </button>
            </div>

            <!-- Pantalla 2 -->
            <div class="submenu-row">
              <a
                mat-button
                routerLink="/qa/pantalla-2"
                routerLinkActive="activo"
                class="submenu-link"
                (click)="cerrarMenuSiMobile()">
                Pantalla 2
              </a>
              <button
                class="btn-play"
                [class.corriendo]="qaRuns[1].estado === 'corriendo'"
                [class.verde]="qaRuns[1].estado === 'verde'"
                [class.rojo]="qaRuns[1].estado === 'rojo'"
                [disabled]="qaRuns[1].estado === 'corriendo' || !!runActivo"
                (click)="ejecutarPlaywright(qaRuns[1])"
                matTooltip="Ejecutar Playwright — Pantalla 2"
                matTooltipPosition="right"
                type="button">
                <mat-icon *ngIf="qaRuns[1].estado === 'idle'">play_circle</mat-icon>
                <mat-icon *ngIf="qaRuns[1].estado === 'corriendo'" class="spin">sync</mat-icon>
                <mat-icon *ngIf="qaRuns[1].estado === 'verde'">check_circle</mat-icon>
                <mat-icon *ngIf="qaRuns[1].estado === 'rojo'">cancel</mat-icon>
              </button>
            </div>

            <!-- Pantalla 3 -->
            <div class="submenu-row">
              <a
                mat-button
                routerLink="/qa/pantalla-3"
                routerLinkActive="activo"
                class="submenu-link"
                (click)="cerrarMenuSiMobile()">
                Laboratorio
              </a>
            </div>
          </div>
        </nav>

        <div class="version">
          <b>e-Sueldos</b><br />
          Auditoría de Ganancias<br />
          v2.1.0
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="contenido">
        <mat-toolbar class="toolbar">
          <button
            mat-icon-button
            type="button"
            class="boton-menu"
            (click)="sidenav.toggle()"
            aria-label="Abrir menú principal">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="titulo">{{ titulo }}</span>
          <span class="flex-1"></span>

          <div class="usuario" *ngIf="usuario">
            <mat-icon>account_circle</mat-icon>
            <span>{{ usuario.correo }}</span>
          </div>

          <button mat-button type="button" class="logout" (click)="cerrarSesion()">
            <mat-icon>logout</mat-icon>
            <span>Cerrar sesión</span>
          </button>
        </mat-toolbar>

        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    /* ── Layout base ──────────────────────────────────────────────────────── */
    .layout-shell { height: 100vh; background: #f8fafc; }
    .sidebar { width: 190px; border-right: 1px solid #e2e8f0; background: #ffffff; }
    .brand { padding: 14px 12px 18px; }
    .brand img { display: block; width: 138px; max-width: 100%; border-radius: 9px; box-shadow: 0 10px 28px rgba(37, 99, 235, 0.16); }
    .brand img.oculto { display: none; }
    .brand-fallback { display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; background: #2563eb; color: #ffffff; font-size: 18px; font-weight: 900; box-shadow: 0 10px 28px rgba(37, 99, 235, 0.16); }
    .menu { display: flex; flex-direction: column; gap: 6px; padding: 0 8px; }
    .menu-link {
      width: 100%;
      height: 42px;
      justify-content: flex-start;
      border-radius: 12px;
      color: #111827;
      font-size: 14px;
      font-weight: 650;
      letter-spacing: -0.01em;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }
    .menu-link span { line-height: 1; }
    .menu-link mat-icon { margin-right: 10px; color: #0f1b3d; font-size: 20px; width: 20px; height: 20px; }
    .menu-link.activo { background: #eff6ff; color: #2563eb; }
    .menu-link.activo mat-icon { color: #2563eb; }
    .menu-toggle .chevron { margin-left: auto; margin-right: 0; transition: transform 160ms ease; }
    .menu-toggle.abierto .chevron { transform: rotate(180deg); }

    /* ── Submenu con botones ▶ ────────────────────────────────────────────── */
    .submenu { display: grid; gap: 4px; margin: -2px 0 4px 34px; padding-left: 10px; border-left: 1px solid #dbeafe; }
    .submenu-row { display: flex; align-items: center; gap: 4px; }
    .submenu-link {
      flex: 1;
      height: 34px;
      justify-content: flex-start;
      border-radius: 10px;
      color: #475569;
      font-size: 12px;
      font-weight: 850;
    }
    .submenu-link.activo { background: #eff6ff; color: #2563eb; }

    /* ── Botón ▶ play ─────────────────────────────────────────────────────── */
    .btn-play {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      transition: background 150ms ease, color 150ms ease, transform 150ms ease;
      padding: 0;
    }
    .btn-play mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .btn-play:hover:not(:disabled) { background: #eff6ff; color: #2563eb; transform: scale(1.15); }
    .btn-play:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-play.corriendo { color: #2563eb; background: #eff6ff; }
    .btn-play.verde { color: #16a34a; background: #f0fdf4; }
    .btn-play.rojo  { color: #dc2626; background: #fef2f2; }

    /* ── Spin ─────────────────────────────────────────────────────────────── */
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }

    /* ── Overlay de resultado ─────────────────────────────────────────────── */
    .pw-overlay {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      min-width: 340px;
      max-width: min(90vw, 700px);
      background: #1e293b;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      border: 1px solid #334155;
      animation: slideUp 250ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .pw-overlay.pw-verde { border-color: #22c55e; background: #052e16; }
    .pw-overlay.pw-rojo  { border-color: #ef4444; background: #450a0a; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .pw-overlay-inner { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; }
    .pw-icono mat-icon { font-size: 28px; width: 28px; height: 28px; color: #94a3b8; margin-top: 2px; }
    .pw-overlay.pw-verde .pw-icono mat-icon { color: #4ade80; }
    .pw-overlay.pw-rojo  .pw-icono mat-icon { color: #f87171; }
    .pw-overlay .spin { color: #60a5fa; }
    .pw-info { flex: 1; min-width: 0; }
    .pw-titulo { font-size: 14px; font-weight: 700; color: #f1f5f9; line-height: 1.3; }
    .pw-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .pw-log {
      margin-top: 10px;
      font-size: 11px;
      font-family: 'Consolas', monospace;
      color: #94a3b8;
      white-space: pre-wrap;
      max-height: 180px;
      overflow-y: auto;
      background: #0f172a;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .pw-cerrar { flex-shrink: 0; border: none; background: transparent; cursor: pointer; color: #475569; padding: 0; display: flex; }
    .pw-cerrar:hover { color: #f1f5f9; }
    .pw-cerrar mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* ── Resto del layout ─────────────────────────────────────────────────── */
    .version { position: absolute; left: 20px; bottom: 20px; color: #64748b; font-size: 12px; line-height: 1.35; }
    .version b { color: #0f172a; }
    .contenido { min-width: 0; background: #f8fafc; }
    .toolbar { position: sticky; top: 0; z-index: 20; min-height: 52px; height: 52px; padding: 0 24px; border-bottom: 1px solid #e2e8f0; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(10px); }
    .titulo { font-size: 16px; font-weight: 800; color: #0f172a; }
    .boton-menu { display: none; margin-right: 8px; color: #2563eb; }
    .usuario { display: inline-flex; align-items: center; gap: 6px; margin-right: 10px; color: #475569; font-size: 12px; font-weight: 700; }
    .usuario mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .logout { height: 36px; border-radius: 12px; color: #0f172a; font-weight: 900; }
    .logout mat-icon { margin-right: 4px; }
    @media (max-width: 899px) {
      .boton-menu { display: inline-flex; }
      .toolbar { padding: 0 12px; }
      .usuario { display: none; }
      .logout span { display: none; }
      .sidebar { width: min(82vw, 300px); }
      .version { position: static; margin: 28px 20px 20px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
    }
  `],
})
export class LayoutComponent {
  @ViewChild('sidenav') sidenav?: MatSidenav;

  titulo = 'Auditoría de Ganancias';
  esMobile = this.calcularEsMobile();
  usuario: UsuarioAutenticado | null = null;
  logoRoto = false;
  qaAbierto = false;

  qaRuns: QaRunConfig[] = [
    { pantalla: 'pantalla-1', label: 'Pantalla 1', estado: 'idle' },
    { pantalla: 'pantalla-2', label: 'Pantalla 2', estado: 'idle' },
  ];

  runActivo: QaRunConfig | null = null;

  items = [
    { ruta: '/inicio',        icono: 'home',         texto: 'Inicio' },
    { ruta: '/cargar-excel',  icono: 'cloud_upload',  texto: 'Cargar Excel' },
    { ruta: '/analisis',      icono: 'analytics',     texto: 'Análisis' },
    { ruta: '/calculo',       icono: 'calculate',     texto: 'Cálculo' },
    { ruta: '/diagnosticos',  icono: 'fact_check',    texto: 'Diagnósticos' },
    { ruta: '/historial',     icono: 'history',       texto: 'Historial' },
    { ruta: '/configuracion', icono: 'settings',      texto: 'Configuración' },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
  ) {
    this.auth.usuario$.subscribe((usuario) => (this.usuario = usuario));
  }

  @HostListener('window:resize')
  alRedimensionar(): void {
    const eraMobile = this.esMobile;
    this.esMobile = this.calcularEsMobile();
    if (this.sidenav && eraMobile !== this.esMobile) {
      if (this.esMobile) void this.sidenav.close();
      else void this.sidenav.open();
    }
  }

  cerrarMenuSiMobile(): void {
    if (this.esMobile) void this.sidenav?.close();
  }

  toggleQa(): void {
    this.qaAbierto = !this.qaAbierto;
  }

  ejecutarPlaywright(run: QaRunConfig): void {
    if (run.estado === 'corriendo' || this.runActivo) return;
    run.estado = 'corriendo';
    run.salida = undefined;
    run.duracion_ms = undefined;
    this.runActivo = run;

    this.http
      .post<{ estado: string; stdout: string; stderr: string; duracion_ms: number }>(
        `${environment.apiUrl}/qa/playwright/run`,
        { pantalla: run.pantalla },
        // Playwright puede tardar 2-3 minutos: timeout de 5 minutos
        { headers: { 'x-playwright-demo': 'true' } },
      )
      .subscribe({
        next: (res) => {
          run.estado = res.estado === 'verde' ? 'verde' : 'rojo';
          run.duracion_ms = res.duracion_ms;
          run.salida = res.stdout || res.stderr;
        },
        error: (err) => {
          run.estado = 'rojo';
          run.salida = err?.error?.message ?? 'Error de comunicación con el backend';
        },
      });
  }

  cerrarOverlay(): void {
    this.runActivo = null;
  }

  cerrarSesion(): void {
    const ref = this.dialog.open(ConfirmarLogoutDialogComponent, {
      width: 'min(92vw, 420px)',
      maxWidth: '92vw',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'logout-dialog-panel',
    });
    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.auth.logout().subscribe({ complete: () => void this.router.navigate(['/login']) });
    });
  }

  private calcularEsMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 900;
  }
}

@Component({
  selector: 'app-confirmar-logout-dialog',
  template: `
    <div class="dialog-logout">
      <div class="dialog-icono">
        <mat-icon>logout</mat-icon>
      </div>

      <div class="dialog-copy">
        <h2>¿Cerrar sesión?</h2>
        <p>Vas a salir del sistema de auditoría. Para volver a ingresar vas a necesitar tu correo y contraseña.</p>
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn-cancelar" mat-dialog-close>Cancelar</button>
        <button type="button" class="btn-confirmar" [mat-dialog-close]="true">Sí, cerrar sesión</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-logout {
      width: min(100%, 420px);
      padding: 30px 30px 24px;
      display: grid;
      justify-items: center;
      gap: 18px;
      text-align: center;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08), transparent 36%),
        #ffffff;
    }
    .dialog-icono {
      width: 58px; height: 58px;
      display: grid; place-items: center;
      border-radius: 20px;
      background: #eff6ff; color: #2563eb;
      box-shadow: inset 0 0 0 1px #dbeafe;
    }
    .dialog-icono mat-icon { font-size: 30px; width: 30px; height: 30px; }
    .dialog-copy { display: grid; gap: 9px; }
    h2 { margin: 0; color: #0f172a; font-size: 23px; line-height: 1.15; font-weight: 950; letter-spacing: -0.035em; }
    p { margin: 0 auto; max-width: 330px; color: #64748b; line-height: 1.55; font-size: 14px; }
    .dialog-actions { width: 100%; display: flex; justify-content: center; gap: 10px; padding-top: 4px; }
    .btn-cancelar, .btn-confirmar {
      height: 40px; min-width: 132px; padding: 0 18px;
      border: 0; border-radius: 12px; font: inherit; font-size: 13px; font-weight: 900;
      cursor: pointer; transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
    }
    .btn-cancelar { background: #f8fafc; color: #475569; box-shadow: inset 0 0 0 1px #e2e8f0; }
    .btn-confirmar { background: #2563eb; color: #ffffff; box-shadow: 0 10px 22px rgba(37, 99, 235, 0.24); }
    .btn-cancelar:hover, .btn-confirmar:hover { transform: translateY(-1px); }
    @media (max-width: 460px) {
      .dialog-logout { padding: 26px 18px 20px; }
      .dialog-actions { flex-direction: column-reverse; }
      .btn-cancelar, .btn-confirmar { width: 100%; }
    }
  `],
})
export class ConfirmarLogoutDialogComponent {}
