import { Component, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-qa-panel-cobertura',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <h2 class="titulo-hijo">Matriz de Cobertura QA</h2>
        <p class="subtitulo">Visualización del nivel de cobertura de casos por Convenio y Tipo de Cálculo (Implementado usando CSS Grid).</p>
      </div>

      <div class="leyenda">
        <div class="leyenda-item">
          <div class="leyenda-color bg-alta"></div>
          <span>Alta Cobertura (≥ 10 casos)</span>
        </div>
        <div class="leyenda-item">
          <div class="leyenda-color bg-media"></div>
          <span>Media Cobertura (1 - 9 casos)</span>
        </div>
        <div class="leyenda-item">
          <div class="leyenda-color bg-nula"></div>
          <span>Hueco / Sin Cobertura (0 casos)</span>
        </div>
      </div>

      <div class="matriz-container">
        <div class="matriz-grid">
          
          <div class="celda header vacia"></div>
          
          <div class="celda header col" *ngFor="let tipo of tiposCalculo">{{ tipo.nombre }}</div>

          <ng-container *ngFor="let conv of convenios">
            <div class="celda header row">{{ conv.nombre }}</div>
            
            <div class="celda dato" 
                 *ngFor="let tipo of tiposCalculo"
                 [ngClass]="getClaseCobertura(conv.id, tipo.id)"
                 [matTooltip]="getTooltip(conv.id, tipo.id)">
              <div class="dato-valor">{{ getCantidadCasos(conv.id, tipo.id) }}</div>
            </div>
          </ng-container>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; max-width: 1200px; margin: 0 auto; }
    .cabecera-hijo { margin-bottom: 24px; text-align: center; }
    .titulo-hijo { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px; }
    .subtitulo { color: #64748b; font-size: 15px; margin: 0; }
    
    .leyenda { display: flex; justify-content: center; gap: 24px; margin-bottom: 32px; flex-wrap: wrap; }
    .leyenda-item { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #475569; }
    .leyenda-color { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); }
    
    .bg-alta { background: #dcfce7; }
    .bg-media { background: #fef9c3; }
    .bg-nula { background: #fee2e2; }
    
    .matriz-container { overflow-x: auto; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    
    .matriz-grid { 
      display: grid; 
      grid-template-columns: 200px repeat(4, minmax(120px, 1fr)); 
      gap: 8px; 
    }
    
    .celda { border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 12px; transition: transform 0.2s; }
    
    .header { font-weight: 800; color: #1e293b; font-size: 13px; text-align: center; }
    .header.vacia { background: transparent; }
    .header.col { background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
    .header.row { background: #f8fafc; justify-content: flex-end; text-align: right; border-right: 2px solid #e2e8f0; padding-right: 16px; }
    
    .dato { cursor: pointer; border: 1px solid rgba(0,0,0,0.05); }
    .dato:hover { transform: scale(1.05); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 10; }
    
    .dato-valor { font-size: 20px; font-weight: 900; }
    
    .celda.alta { background: #dcfce7; color: #166534; }
    .celda.media { background: #fef9c3; color: #854d0e; }
    .celda.nula { background: #fee2e2; color: #991b1b; }
  `]
})
export class QaPanelCoberturaComponent implements OnInit {
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();
  
  tiposCalculo = [
    { id: 'basico', nombre: 'Sueldo Básico' },
    { id: 'antiguedad', nombre: 'Antigüedad' },
    { id: 'adicionales', nombre: 'Adicionales CCT' },
    { id: 'hs_extras', nombre: 'Horas Extras' }
  ];
  
  convenios = [
    { id: 'com', nombre: 'Comercio (130/75)' },
    { id: 'uocra', nombre: 'UOCRA (76/22)' },
    { id: 'smata', nombre: 'SMATA (15/89)' },
    { id: 'bancarios', nombre: 'Bancarios' }
  ];

  datos: Record<string, number> = {
    'com_basico': 45,
    'com_antiguedad': 12,
    'com_adicionales': 5,
    'com_hs_extras': 0,
    
    'uocra_basico': 20,
    'uocra_antiguedad': 0,
    'uocra_adicionales': 15,
    'uocra_hs_extras': 2,
    
    'smata_basico': 15,
    'smata_antiguedad': 8,
    'smata_adicionales': 0,
    'smata_hs_extras': 0,
    
    'bancarios_basico': 0,
    'bancarios_antiguedad': 0,
    'bancarios_adicionales': 0,
    'bancarios_hs_extras': 0,
  };

  ngOnInit(): void {}

  getCantidadCasos(convId: string, tipoId: string): number {
    return this.datos[`${convId}_${tipoId}`] || 0;
  }

  getClaseCobertura(convId: string, tipoId: string): string {
    const cantidad = this.getCantidadCasos(convId, tipoId);
    if (cantidad >= 10) return 'alta';
    if (cantidad > 0) return 'media';
    return 'nula';
  }

  getTooltip(convId: string, tipoId: string): string {
    const cantidad = this.getCantidadCasos(convId, tipoId);
    return `${cantidad} casos configurados`;
  }
}
