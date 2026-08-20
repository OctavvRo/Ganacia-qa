import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span class="estado" [ngClass]="clase"><span>●</span>{{ etiqueta }}</span>`,
})
export class BadgeComponent {
  @Input() estado = '';

  get etiqueta(): string {
    if (!this.estado) return '';
    const estadoNormalizado = this.estado.toUpperCase();
    const etiquetasEspeciales: Record<string, string> = {
      NO_EVALUADA: 'Pendiente por datos',
      NO_EVALUADO: 'Pendiente por datos',
      REQUIERE_DATOS_COMPLEMENTARIOS: 'Requiere datos',
    };

    if (etiquetasEspeciales[estadoNormalizado]) {
      return etiquetasEspeciales[estadoNormalizado];
    }

    let label = this.estado.replaceAll('_', ' ').toLowerCase();

    const reemplazos: Record<string, string> = {
      analisis: 'análisis',
      calculo: 'cálculo',
      periodo: 'período',
      retencion: 'retención',
      criticos: 'críticos',
      critico: 'crítico',
      revision: 'revisión',
    };

    Object.entries(reemplazos).forEach(([origen, destino]) => {
      label = label.replace(new RegExp(`\\b${origen}\\b`, 'g'), destino);
    });

    return label.length > 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label;
  }

  get clase(): string {
    const e = this.estado.toUpperCase();
    return e.includes('ERROR') || e.includes('CRITIC') || e.includes('NO_PROCESABLE')
      ? 'error'
      : e.includes('OK') || e.includes('CORRECTO') || e.includes('CALCULADO') || e.includes('LIQUIDADO')
        ? 'ok'
        : 'warn';
  }
}
