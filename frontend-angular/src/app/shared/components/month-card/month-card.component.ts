import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-month-card',
  template: `
    <mat-card class="p-4 h-full">
      <h3 class="font-bold mb-3">{{titulo}}</h3>
      <p *ngIf="mensaje" class="warn estado mb-3">{{mensaje}}</p>
      <div *ngFor="let item of items" class="flex justify-between gap-3 py-2 border-t text-sm">
        <span>{{etiqueta(item[0])}}</span>
        <b>{{formato(item[0], item[1])}}</b>
      </div>
      <p *ngIf="!items.length" class="muted">No disponible</p>
    </mat-card>
  `
})
export class MonthCardComponent {
  @Input() titulo = '';
  @Input() datos: any;
  @Input() mensaje = '';

  get items() {
    return this.datos && typeof this.datos === 'object'
      ? Object.entries(this.datos).filter(([, v]) => typeof v !== 'object')
      : [];
  }

  etiqueta(k: string): string {
    const etiquetas: Record<string, string> = {
      remuneraciones_con_aporte: 'Remuneraciones con aporte',
      remuneraciones_sin_aporte: 'Remuneraciones sin aporte',
      sac: 'SAC',
      jubilacion: 'Jubilación',
      obra_social: 'Obra social',
      inssjp: 'INSSJP',
      deducciones_generales: 'Deducciones generales',
      deducciones_art30: 'Deducciones Art. 30',
      deducciones_personales: 'Deducciones personales',
      retencion_informada: 'Retención informada',
      impuesto_calculado_excel: 'Impuesto calculado Excel',
      ganancia_neta_fila35: 'Ganancia neta fila 35',
      porcentaje: 'Porcentaje',
      total_ingresos: 'Total ingresos',
      total_ingresos_usado: 'Total ingresos usado',
      ganancia_neta_base: 'Ganancia neta base',
      impuesto_determinado: 'Impuesto determinado',
      retenciones_anteriores: 'Retenciones anteriores',
      retencion_calculada: 'Retención calculada',
      diferencia_retencion: 'Diferencia de retención',
      origen_total_ingresos: 'Origen del total de ingresos',
      impuesto_sobre_excedente: 'Impuesto sobre excedente',
      tramo: 'Tramo',
      minimo: 'Mínimo',
      maximo: 'Máximo',
      importe_fijo: 'Importe fijo',
      excedente_sobre_minimo: 'Excedente sobre mínimo',
    };

    if (etiquetas[k]) {
      return etiquetas[k];
    }

    let label = k.replaceAll('_', ' ');
    // Aplicar tildes a palabras comunes visibles en la interfaz
    label = label.replace(/\bretencion\b/gi, 'retención');
    label = label.replace(/\bretenciones\b/gi, 'retenciones');
    label = label.replace(/\bcalculo\b/gi, 'cálculo');
    label = label.replace(/\banalisis\b/gi, 'análisis');
    label = label.replace(/\bperiodo\b/gi, 'período');
    label = label.replace(/\bdeclaracion\b/gi, 'declaración');
    label = label.replace(/\bdeduccion\b/gi, 'deducción');
    label = label.replace(/\bdeducciones\b/gi, 'deducciones');
    label = label.replace(/\bcomuna\b/gi, 'comuna');
    label = label.replace(/\bart30\b/gi, 'Art. 30');
    label = label.replace(/\bfila35\b/gi, 'fila 35');
    label = label.replace(/\bsac\b/gi, 'SAC');
    label = label.replace(/\binssjp\b/gi, 'INSSJP');
    label = label.replace(/\bexcel\b/gi, 'Excel');

    // Primera letra en mayúscula
    if (label.length > 0) {
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    return label;
  }

  formato(k: string, v: any): string {
    if (v === null || v === undefined) {
      return 'No disponible';
    }

    const keyLower = k.toLowerCase();
    const valorTexto = String(v);

    if (keyLower === 'origen_total_ingresos') {
      const origenes: Record<string, string> = {
        reconstruido_desde_base_y_deducciones: 'Reconstruido desde base y deducciones',
        acumulador_total_ingresos: 'Informado por acumulador de total ingresos',
        papel_trabajo: 'Informado por papel de trabajo',
      };
      return origenes[valorTexto] ?? valorTexto.replaceAll('_', ' ');
    }

    // 1. Tramo debe mostrarse como número entero simple
    if (keyLower.includes('tramo')) {
      return String(v);
    }

    // 2. Porcentaje debe mostrarse como porcentaje (ej: 35%)
    if (keyLower.includes('porcentaje') || keyLower.includes('tasa') || keyLower.includes('alicuota')) {
      const num = Number(v);
      if (!Number.isNaN(num)) {
        return num + '%';
      }
      return String(v);
    }

    // 3. Cantidades, meses, días, índices no deben formatearse como moneda
    if (
      keyLower.includes('cantidad') ||
      keyLower.includes('cant') ||
      keyLower.includes('dias') ||
      keyLower.includes('meses') ||
      keyLower.includes('mes') ||
      keyLower.includes('indice') ||
      keyLower.includes('coeficiente') ||
      keyLower.includes('anio') ||
      keyLower.includes('ano') ||
      keyLower.includes('numero') ||
      keyLower.includes('codigo')
    ) {
      return String(v);
    }

    // 4. Valores de tipo número por defecto se muestran como moneda
    if (typeof v === 'number') {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
    }

    return String(v);
  }
}
