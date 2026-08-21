import { Component } from '@angular/core';

type EstadoEsperado = 'validado' | 'observado' | 'pendiente';

interface CasoQaForm {
  idCaso: string;
  datasetCodigo: string;
  periodo: string;
  descripcion: string;
  empleado: {
    legajo: string;
    nombre: string;
    cuil: string;
  };
  liquidacion: {
    remuneracionBruta: number | null;
    deducciones: number | null;
    retencionEsperada: number | null;
  };
  estadoEsperado: EstadoEsperado;
}

interface ArchivoExcelRef {
  nombre: string;
  sizeBytes: number;
  mime: string;
  seleccionadoEn: string;
}

interface CasoQaPayload {
  id: string;
  dataset_codigo: string;
  periodo: string;
  descripcion: string;
  archivo: ArchivoExcelRef | null;
  contexto: {
    empleado: {
      legajo: string;
      nombre: string;
      cuil: string;
    };
    liquidacion: {
      remuneracion_bruta: number | null;
      deducciones: number | null;
    };
  };
  resultado_esperado: {
    retencion_ganancias: number | null;
    estado: EstadoEsperado;
  };
  origen: {
    tipo: string;
    generado_en: string;
  };
}

interface CasoGuardado {
  id: string;
  creadoEn: string;
  payload: CasoQaPayload;
}

@Component({
  selector: 'app-qa-pantalla-1',
  template: `
    <main class="qa-page">
      <section class="titulo-seccion">
        <div>
          <h1>
            <mat-icon>science</mat-icon>
            QA - Pantalla 1
          </h1>
          <p>Alta de casos para probar la auditoría de ganancias con Playwright.</p>
        </div>
        <span class="contador">{{ casos.length }} casos guardados</span>
      </section>

      <section class="qa-grid">
        <mat-card class="panel form-panel">
          <div class="panel-header">
            <div>
              <h2>Caso de prueba</h2>
              <p>Asociá el dataset, el empleado y el resultado esperado.</p>
            </div>
            <span class="tag">Pantalla 1</span>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>ID caso</span>
              <input [(ngModel)]="form.idCaso" name="idCaso" placeholder="QA-GAN-RET-001">
            </label>

            <label class="field">
              <span>Código dataset</span>
              <input [(ngModel)]="form.datasetCodigo" name="datasetCodigo" placeholder="DS-AUD-GAN-082026">
            </label>

            <label class="field">
              <span>Período</span>
              <input [(ngModel)]="form.periodo" name="periodo" placeholder="06/2026">
            </label>

            <label class="field field-wide">
              <span>Descripción</span>
              <input [(ngModel)]="form.descripcion" name="descripcion" placeholder="Validar retención de ganancias del legajo">
            </label>

            <label class="field">
              <span>Legajo</span>
              <input [(ngModel)]="form.empleado.legajo" name="legajo" placeholder="6">
            </label>

            <label class="field">
              <span>Empleado</span>
              <input [(ngModel)]="form.empleado.nombre" name="empleadoNombre" placeholder="Apellido y nombre">
            </label>

            <label class="field">
              <span>CUIL</span>
              <input [(ngModel)]="form.empleado.cuil" name="cuil" placeholder="20-00000000-0">
            </label>

            <label class="field">
              <span>Remuneración bruta</span>
              <input type="number" min="0" step="0.01" [(ngModel)]="form.liquidacion.remuneracionBruta" name="remuneracionBruta" placeholder="0.00">
            </label>

            <label class="field">
              <span>Deducciones</span>
              <input type="number" min="0" step="0.01" [(ngModel)]="form.liquidacion.deducciones" name="deducciones" placeholder="0.00">
            </label>

            <label class="field">
              <span>Retención esperada</span>
              <input type="number" min="0" step="0.01" [(ngModel)]="form.liquidacion.retencionEsperada" name="retencionEsperada" placeholder="0.00">
            </label>

            <label class="field">
              <span>Estado esperado</span>
              <select [(ngModel)]="form.estadoEsperado" name="estadoEsperado">
                <option *ngFor="let estado of estados" [ngValue]="estado.valor">{{ estado.texto }}</option>
              </select>
            </label>
          </div>

          <div class="excel-box">
            <input #excelInput hidden type="file" accept=".xlsx,.xls" (change)="seleccionarExcel($event)">
            <button mat-stroked-button color="primary" type="button" class="excel-btn" (click)="excelInput.click()">
              <mat-icon>attach_file</mat-icon>
              Agregar Excel
            </button>

            <ng-container *ngIf="archivoExcel; else sinExcel">
              <div class="archivo-ref">
                <mat-icon>description</mat-icon>
                <div>
                  <strong>{{ archivoExcel.nombre }}</strong>
                  <span>{{ archivoExcel.sizeBytes / 1024 | number:'1.0-1' }} KB</span>
                </div>
                <button mat-icon-button type="button" title="Quitar Excel" (click)="quitarExcel()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            </ng-container>

            <ng-template #sinExcel>
              <p class="ayuda-excel">No se copia el archivo al sistema; solo queda referenciado para el caso.</p>
            </ng-template>
          </div>

          <div *ngIf="mensaje" class="mensaje">{{ mensaje }}</div>

          <div class="acciones">
            <button mat-stroked-button type="button" (click)="cargarEjemplo()">
              <mat-icon>auto_fix_high</mat-icon>
              Ejemplo
            </button>
            <button mat-stroked-button type="button" (click)="nuevoLimpio()">
              <mat-icon>refresh</mat-icon>
              Nuevo limpio
            </button>
            <button mat-flat-button color="primary" type="button" (click)="guardarCaso()">
              <mat-icon>save</mat-icon>
              Guardar caso
            </button>
          </div>
        </mat-card>

        <mat-card class="panel preview-panel">
          <div class="panel-header">
            <div>
              <h2>Vista previa</h2>
              <p>JSON del caso que va a usar la prueba.</p>
            </div>
            <mat-icon>data_object</mat-icon>
          </div>
          <pre>{{ previewJson }}</pre>
        </mat-card>
      </section>

      <mat-card class="panel casos-panel">
        <div class="panel-header">
          <div>
            <h2>Casos guardados</h2>
            <p>Quedan disponibles en este navegador para repetir la carga.</p>
          </div>
        </div>

        <div *ngIf="casos.length === 0" class="empty-state">
          <mat-icon>inventory_2</mat-icon>
          <span>Sin casos guardados todavía.</span>
        </div>

        <div *ngFor="let caso of casos; trackBy: trackByCaso" class="caso-row">
          <button type="button" class="caso-main" (click)="cargarCaso(caso)">
            <mat-icon>assignment</mat-icon>
            <span>
              <strong>{{ caso.id }}</strong>
              <small>{{ caso.payload.dataset_codigo || 'Sin dataset' }} · {{ caso.payload.periodo || 'Sin período' }}</small>
            </span>
          </button>

          <span class="caso-estado">{{ caso.payload.resultado_esperado.estado }}</span>

          <button mat-icon-button type="button" title="Eliminar caso" (click)="eliminarCaso(caso.id)">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </mat-card>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .qa-page {
      padding: 24px;
      display: grid;
      gap: 16px;
    }

    .titulo-seccion {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }

    .titulo-seccion h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: #0f172a;
      font-size: 24px;
      line-height: 1.2;
      font-weight: 950;
    }

    .titulo-seccion h1 mat-icon {
      color: #2563eb;
    }

    .titulo-seccion p {
      margin: 6px 0 0 34px;
      color: #64748b;
      font-size: 13px;
    }

    .contador {
      padding: 7px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .qa-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
      gap: 16px;
      align-items: start;
    }

    .panel {
      border: 1px solid #dce7f7;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    }

    .form-panel,
    .preview-panel,
    .casos-panel {
      padding: 16px;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .panel-header h2 {
      margin: 0;
      color: #0f172a;
      font-size: 16px;
      font-weight: 950;
    }

    .panel-header p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
    }

    .panel-header mat-icon {
      color: #2563eb;
    }

    .tag {
      padding: 5px 9px;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 5px;
      min-width: 0;
    }

    .field-wide {
      grid-column: span 2;
    }

    .field span {
      color: #475569;
      font-size: 11px;
      font-weight: 900;
    }

    .field input,
    .field select {
      width: 100%;
      min-width: 0;
      height: 38px;
      padding: 0 10px;
      border: 1px solid #cbd7ea;
      border-radius: 8px;
      outline: 0;
      background: #ffffff;
      color: #0f172a;
      font: inherit;
      font-size: 12px;
      font-weight: 750;
      box-sizing: border-box;
    }

    .field input:focus,
    .field select:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .excel-box {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 14px;
      padding: 12px;
      border: 1px dashed #bad2ff;
      border-radius: 10px;
      background: #f8fbff;
    }

    .excel-btn {
      height: 38px;
      border-radius: 8px;
      font-weight: 900;
      white-space: nowrap;
    }

    .excel-btn mat-icon {
      margin-right: 6px;
    }

    .archivo-ref {
      min-width: 0;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: 1px solid #dce7f7;
      border-radius: 9px;
      background: #ffffff;
    }

    .archivo-ref > mat-icon {
      color: #16a34a;
      flex: 0 0 auto;
    }

    .archivo-ref div {
      min-width: 0;
      flex: 1;
      display: grid;
      gap: 2px;
    }

    .archivo-ref strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #0f172a;
      font-size: 12px;
      font-weight: 900;
    }

    .archivo-ref span,
    .ayuda-excel {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.35;
    }

    .mensaje {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      background: #f0fdf4;
      color: #166534;
      font-size: 12px;
      font-weight: 800;
    }

    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 14px;
    }

    .acciones button {
      height: 38px;
      border-radius: 8px;
      font-weight: 900;
    }

    .acciones mat-icon {
      margin-right: 6px;
    }

    .preview-panel pre {
      max-height: 520px;
      min-height: 392px;
      overflow: auto;
      margin: 0;
      padding: 14px;
      border-radius: 10px;
      background: #111827;
      color: #e5edff;
      font-size: 12px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .casos-panel {
      display: grid;
      gap: 8px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px;
      border: 1px dashed #cbd7ea;
      border-radius: 10px;
      color: #64748b;
      font-size: 13px;
      font-weight: 800;
    }

    .caso-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
    }

    .caso-main {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 0;
      padding: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .caso-main mat-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 9px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 20px;
      flex: 0 0 auto;
    }

    .caso-main span {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .caso-main strong,
    .caso-main small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .caso-main strong {
      color: #0f172a;
      font-size: 13px;
      font-weight: 950;
    }

    .caso-main small {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }

    .caso-estado {
      padding: 5px 9px;
      border-radius: 999px;
      background: #ecfdf5;
      color: #15803d;
      font-size: 11px;
      font-weight: 900;
    }

    @media (max-width: 1120px) {
      .qa-grid {
        grid-template-columns: 1fr;
      }

      .preview-panel pre {
        min-height: 260px;
      }
    }

    @media (max-width: 720px) {
      .qa-page {
        padding: 16px 12px 24px;
      }

      .titulo-seccion {
        align-items: flex-start;
        flex-direction: column;
      }

      .titulo-seccion p {
        margin-left: 0;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .field-wide {
        grid-column: auto;
      }

      .excel-box,
      .acciones {
        align-items: stretch;
        flex-direction: column;
      }

      .caso-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .caso-estado {
        display: none;
      }
    }
  `]
})
export class QaPantalla1Component {
  readonly estados: { valor: EstadoEsperado; texto: string }[] = [
    { valor: 'validado', texto: 'Validado' },
    { valor: 'observado', texto: 'Observado' },
    { valor: 'pendiente', texto: 'Pendiente' },
  ];

  form: CasoQaForm = this.crearForm();
  archivoExcel: ArchivoExcelRef | null = null;
  casos: CasoGuardado[] = this.leerCasos();
  mensaje = '';

  private readonly storageKey = 'auditoria-ganancias.qa.casos';

  get previewJson(): string {
    return JSON.stringify(this.construirPayload(), null, 2);
  }

  seleccionarExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      this.mensaje = 'Seleccioná un archivo Excel válido (.xlsx o .xls).';
      input.value = '';
      return;
    }

    this.archivoExcel = {
      nombre: file.name,
      sizeBytes: file.size,
      mime: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      seleccionadoEn: new Date().toISOString(),
    };
    this.mensaje = 'Excel agregado como referencia del caso.';
    input.value = '';
  }

  quitarExcel(): void {
    this.archivoExcel = null;
    this.mensaje = 'Referencia de Excel quitada.';
  }

  guardarCaso(): void {
    const payload = this.construirPayload();
    const caso: CasoGuardado = {
      id: payload.id,
      creadoEn: new Date().toISOString(),
      payload,
    };

    this.casos = [caso, ...this.casos.filter((actual) => actual.id !== caso.id)].slice(0, 30);
    this.persistirCasos();
    this.mensaje = 'Caso guardado en este navegador.';
  }

  nuevoLimpio(): void {
    this.form = this.crearForm();
    this.archivoExcel = null;
    this.mensaje = '';
  }

  cargarEjemplo(): void {
    this.form = {
      idCaso: 'QA-GAN-RET-001',
      datasetCodigo: 'DS-AUD-GAN-082026',
      periodo: '06/2026',
      descripcion: 'Validar que el legajo 6 tenga la retención de ganancias esperada.',
      empleado: {
        legajo: '6',
        nombre: 'Empleado de prueba',
        cuil: '',
      },
      liquidacion: {
        remuneracionBruta: 0,
        deducciones: 0,
        retencionEsperada: 0,
      },
      estadoEsperado: 'validado',
    };
    this.mensaje = 'Ejemplo cargado. Podés ajustar los importes con los datos del Excel.';
  }

  cargarCaso(caso: CasoGuardado): void {
    this.form = {
      idCaso: caso.payload.id,
      datasetCodigo: caso.payload.dataset_codigo,
      periodo: caso.payload.periodo,
      descripcion: caso.payload.descripcion,
      empleado: {
        legajo: caso.payload.contexto.empleado.legajo,
        nombre: caso.payload.contexto.empleado.nombre,
        cuil: caso.payload.contexto.empleado.cuil,
      },
      liquidacion: {
        remuneracionBruta: caso.payload.contexto.liquidacion.remuneracion_bruta,
        deducciones: caso.payload.contexto.liquidacion.deducciones,
        retencionEsperada: caso.payload.resultado_esperado.retencion_ganancias,
      },
      estadoEsperado: caso.payload.resultado_esperado.estado,
    };
    this.archivoExcel = caso.payload.archivo;
    this.mensaje = 'Caso cargado para editar.';
  }

  eliminarCaso(id: string): void {
    this.casos = this.casos.filter((caso) => caso.id !== id);
    this.persistirCasos();
    this.mensaje = 'Caso eliminado.';
  }

  trackByCaso(_index: number, caso: CasoGuardado): string {
    return caso.id;
  }

  private crearForm(): CasoQaForm {
    return {
      idCaso: '',
      datasetCodigo: '',
      periodo: '',
      descripcion: '',
      empleado: {
        legajo: '',
        nombre: '',
        cuil: '',
      },
      liquidacion: {
        remuneracionBruta: null,
        deducciones: null,
        retencionEsperada: null,
      },
      estadoEsperado: 'validado',
    };
  }

  private construirPayload(): CasoQaPayload {
    return {
      id: this.form.idCaso.trim() || this.generarId(),
      dataset_codigo: this.form.datasetCodigo.trim(),
      periodo: this.form.periodo.trim(),
      descripcion: this.form.descripcion.trim(),
      archivo: this.archivoExcel,
      contexto: {
        empleado: {
          legajo: this.form.empleado.legajo.trim(),
          nombre: this.form.empleado.nombre.trim(),
          cuil: this.form.empleado.cuil.trim(),
        },
        liquidacion: {
          remuneracion_bruta: this.importe(this.form.liquidacion.remuneracionBruta),
          deducciones: this.importe(this.form.liquidacion.deducciones),
        },
      },
      resultado_esperado: {
        retencion_ganancias: this.importe(this.form.liquidacion.retencionEsperada),
        estado: this.form.estadoEsperado,
      },
      origen: {
        tipo: 'formulario_qa_pantalla_1',
        generado_en: new Date().toISOString(),
      },
    };
  }

  private importe(valor: number | null): number | null {
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
  }

  private generarId(): string {
    const legajo = this.form.empleado.legajo.trim() || 'SIN-LEGAJO';
    const periodo = this.form.periodo.trim().replace(/\D/g, '') || 'SIN-PERIODO';
    return `QA-GAN-${legajo}-${periodo}`;
  }

  private leerCasos(): CasoGuardado[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((caso): caso is CasoGuardado => this.esCasoGuardado(caso));
    } catch {
      return [];
    }
  }

  private persistirCasos(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.casos));
  }

  private esCasoGuardado(valor: unknown): valor is CasoGuardado {
    if (!valor || typeof valor !== 'object') return false;
    const registro = valor as Record<string, unknown>;
    return typeof registro['id'] === 'string' &&
      typeof registro['creadoEn'] === 'string' &&
      !!registro['payload'] &&
      typeof registro['payload'] === 'object';
  }
}
