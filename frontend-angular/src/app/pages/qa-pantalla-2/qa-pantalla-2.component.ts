import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-qa-pantalla-2',
  template: `
    <div class="pantalla-2-container">
      
      <!-- Navegación Principal del Módulo QA -->
      <div class="nav-superior">
        <div class="marca">
          <mat-icon color="primary">policy</mat-icon>
          <span>Gobernanza QA</span>
        </div>
        
        <div class="tabs-container">
          <button mat-button [class.activo]="vistaActual === 'datasets-list' || vistaActual === 'dataset-form' || vistaActual === 'casos-list' || vistaActual === 'caso-form'" (click)="cambiarVista('datasets-list')">
            <mat-icon>dataset</mat-icon> Datasets
          </button>
          
          <button mat-button [class.activo]="vistaActual === 'nueva-corrida' || vistaActual === 'resultado-corrida'" (click)="cambiarVista('nueva-corrida')">
            <mat-icon>play_circle</mat-icon> Regresión
          </button>
          
          <button mat-button [class.activo]="vistaActual === 'cola-revision'" (click)="cambiarVista('cola-revision')">
            <mat-icon>rule</mat-icon> Revisión Manual
          </button>
          
          <button mat-button [class.activo]="vistaActual === 'historial'" (click)="cambiarVista('historial')">
            <mat-icon>history</mat-icon> Historial
          </button>
          
          <button mat-button [class.activo]="vistaActual === 'panel-cobertura'" (click)="cambiarVista('panel-cobertura')">
            <mat-icon>grid_on</mat-icon> Matriz Cobertura
          </button>
        </div>
      </div>

      <!-- Contenedor Dinámico -->
      <div class="contenido-dinamico" [ngSwitch]="vistaActual">
        
        <!-- Fase A: Gestión -->
        <app-qa-datasets-list *ngSwitchCase="'datasets-list'" (cambiarVista)="onCambiarVista($event)"></app-qa-datasets-list>
        
        <app-qa-dataset-form *ngSwitchCase="'dataset-form'" [params]="paramsActuales" (cambiarVista)="onCambiarVista($event)"></app-qa-dataset-form>
        
        <app-qa-casos-list *ngSwitchCase="'casos-list'" [params]="paramsActuales" (cambiarVista)="onCambiarVista($event)"></app-qa-casos-list>
        
        <app-qa-caso-form *ngSwitchCase="'caso-form'" [params]="paramsActuales" (cambiarVista)="onCambiarVista($event)"></app-qa-caso-form>

        <!-- Fase B: Regresión -->
        <app-qa-nueva-corrida *ngSwitchCase="'nueva-corrida'" (cambiarVista)="onCambiarVista($event)"></app-qa-nueva-corrida>
        
        <app-qa-resultado-corrida *ngSwitchCase="'resultado-corrida'" [params]="paramsActuales" (cambiarVista)="onCambiarVista($event)"></app-qa-resultado-corrida>
        
        <app-qa-cola-revision *ngSwitchCase="'cola-revision'" (cambiarVista)="onCambiarVista($event)"></app-qa-cola-revision>

        <!-- Fase C: Gobernanza -->
        <app-qa-historial *ngSwitchCase="'historial'" (cambiarVista)="onCambiarVista($event)"></app-qa-historial>
        
        <app-qa-panel-cobertura *ngSwitchCase="'panel-cobertura'" (cambiarVista)="onCambiarVista($event)"></app-qa-panel-cobertura>

      </div>
    </div>
  `,
  styles: [`
    .pantalla-2-container { display: flex; flex-direction: column; height: 100%; background: #f8fafc; }
    
    .nav-superior { display: flex; align-items: center; background: white; padding: 0 24px; height: 64px; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    
    .marca { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 18px; color: #0f172a; margin-right: 48px; }
    
    .tabs-container { display: flex; gap: 8px; height: 100%; }
    .tabs-container button { height: 100%; border-radius: 0; padding: 0 16px; font-weight: 600; color: #475569; border-bottom: 3px solid transparent; }
    .tabs-container button mat-icon { margin-right: 6px; }
    .tabs-container button:hover { background: #f1f5f9; }
    .tabs-container button.activo { color: #2563eb; border-bottom-color: #2563eb; background: #eff6ff; }
    
    .contenido-dinamico { flex: 1; padding: 24px; overflow-y: auto; }
  `]
})
export class QaPantalla2Component implements OnInit {
  
  vistaActual = 'datasets-list';
  paramsActuales: any = {};

  constructor() {}

  ngOnInit(): void {}

  cambiarVista(vista: string) {
    this.vistaActual = vista;
    this.paramsActuales = {}; // Reset params on top-level navigation
  }

  onCambiarVista(event: {vista: string, params?: any}) {
    this.vistaActual = event.vista;
    this.paramsActuales = event.params || {};
  }
}
