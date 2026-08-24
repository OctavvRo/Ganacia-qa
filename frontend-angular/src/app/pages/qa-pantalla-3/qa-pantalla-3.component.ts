import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-qa-pantalla-3',
  template: `
    <div class="pantalla-3-container">
      <div class="nav-superior">
        <div class="marca">
          <mat-icon color="primary">science</mat-icon>
          <span>Laboratorio de Estrés</span>
        </div>
        <div class="tabs-container">
          <button mat-button [class.activo]="vistaActual === 'mutacion'" (click)="cambiarVista('mutacion')">
            <mat-icon>biotech</mat-icon> Mutaciones
          </button>
          <button mat-button [class.activo]="vistaActual === 'simulacion'" (click)="cambiarVista('simulacion')">
            <mat-icon>trending_up</mat-icon> Simulación Normativa
          </button>
          <button mat-button [class.activo]="vistaActual === 'spider'" (click)="cambiarVista('spider')">
            <mat-icon>bug_report</mat-icon> Spider QA
          </button>
        </div>
      </div>
      <div class="contenido-dinamico" [ngSwitch]="vistaActual">
        <app-qa-lab-mutacion *ngSwitchCase="'mutacion'"></app-qa-lab-mutacion>
        <app-qa-lab-simulacion *ngSwitchCase="'simulacion'"></app-qa-lab-simulacion>
        <app-qa-lab-spider *ngSwitchCase="'spider'"></app-qa-lab-spider>
      </div>
    </div>
  `,
  styles: [`
    .pantalla-3-container { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
    .nav-superior { display: flex; align-items: center; background: white; padding: 0 24px; height: 64px; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .marca { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 18px; color: #0f172a; margin-right: 48px; }
    .tabs-container { display: flex; gap: 8px; height: 100%; }
    .tabs-container button { height: 100%; border-radius: 0; padding: 0 16px; font-weight: 600; color: #475569; border-bottom: 3px solid transparent; }
    .tabs-container button mat-icon { margin-right: 6px; }
    .tabs-container button:hover { background: #f1f5f9; }
    .tabs-container button.activo { color: #7c3aed; border-bottom-color: #7c3aed; background: #f5f3ff; }
    .contenido-dinamico { flex: 1; padding: 24px; overflow-y: auto; }
  `]
})
export class QaPantalla3Component implements OnInit {
  vistaActual = 'mutacion';
  constructor() {}
  ngOnInit(): void {}
  cambiarVista(vista: string) { this.vistaActual = vista; }
}
