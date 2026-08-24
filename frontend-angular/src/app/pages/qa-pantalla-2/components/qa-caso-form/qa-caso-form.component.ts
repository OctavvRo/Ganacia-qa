import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QaService } from '../../../../core/services/qa.service';

@Component({
  selector: 'app-qa-caso-form',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <div class="flex-align">
          <button mat-icon-button (click)="volver()" class="btn-back">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 class="titulo-hijo">{{ isEdit ? 'Editar Caso: ' + (params?.codigo || '') : 'Nuevo Caso de Prueba' }}</h2>
            <p class="subtitulo">Dataset: <b>{{ datasetId }}</b></p>
          </div>
        </div>
      </div>

      <mat-card class="tarjeta-form">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="form-grid">
            
            <mat-form-field appearance="outline" class="col-span-1">
              <mat-label>Código del Caso</mat-label>
              <input matInput formControlName="codigo" placeholder="Ej: C-05" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Descripción / Escenario</mat-label>
              <input matInput formControlName="descripcion" placeholder="Ej: Empleado con 10 años de antigüedad..." required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-span-1">
              <mat-label>Tipo Dependencia</mat-label>
              <mat-select formControlName="tipo_dependencia">
                <mat-option value="ancla">Caso Ancla (Cálculo directo)</mat-option>
                <mat-option value="escala_lineal">Escala Lineal</mat-option>
                <mat-option value="formula_propia">Fórmula Propia</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-span-1">
              <mat-label>Categoría Salarial</mat-label>
              <input matInput formControlName="categoria_salarial" placeholder="Ej: Maestranza A">
            </mat-form-field>

            <mat-divider class="col-span-2 my-4"></mat-divider>
            <h3 class="col-span-2 text-section">Payloads de Configuración (JSON)</h3>

            <div class="col-span-2 json-grid">
              <!-- Estado Inicial -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Estado Inicial (Variables de contexto)</mat-label>
                <textarea matInput formControlName="estado_inicial" rows="5" class="json-textarea"></textarea>
                <mat-error *ngIf="form.get('estado_inicial')?.hasError('invalidJson')">JSON Inválido</mat-error>
              </mat-form-field>

              <!-- Entrada -->
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Parámetros de Entrada (Novedades)</mat-label>
                <textarea matInput formControlName="entrada" rows="5" class="json-textarea"></textarea>
                <mat-error *ngIf="form.get('entrada')?.hasError('invalidJson')">JSON Inválido</mat-error>
              </mat-form-field>

              <!-- Salida Esperada -->
              <mat-form-field appearance="outline" class="w-full json-success">
                <mat-label>Resultado Esperado (Expected)</mat-label>
                <textarea matInput formControlName="esperado" rows="5" class="json-textarea"></textarea>
                <mat-error *ngIf="form.get('esperado')?.hasError('invalidJson')">JSON Inválido</mat-error>
              </mat-form-field>
            </div>

            <div class="acciones-form col-span-2">
              <button mat-button type="button" (click)="volver()">Cancelar</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Guardar Caso</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .contenedor-hijo { padding: 8px 0; }
    .flex-align { display: flex; align-items: center; gap: 16px; }
    .btn-back { background: #f1f5f9; color: #475569; border-radius: 8px; }
    .cabecera-hijo { margin-bottom: 24px; }
    .titulo-hijo { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
    .subtitulo { color: #64748b; margin: 0; font-size: 14px; }
    .tarjeta-form { border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); padding: 16px; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .col-span-2 { grid-column: span 2; }
    .col-span-1 { grid-column: span 1; }
    .w-full { width: 100%; }
    .my-4 { margin: 16px 0; }
    .text-section { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; }

    .json-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 1024px) { .json-grid { grid-template-columns: 1fr; } }
    
    .json-textarea { font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.5; color: #0f172a; }
    .json-success ::ng-deep .mat-mdc-form-field-flex { background-color: #f0fdf4 !important; border: 1px solid #bbf7d0; }

    .acciones-form { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
    .acciones-form button { border-radius: 8px; font-weight: 600; padding: 0 24px; height: 42px; }
  `]
})
export class QaCasoFormComponent implements OnInit {
  @Input() params: any = {};
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  form: FormGroup;
  isEdit = false;
  datasetId = '';

  constructor(private fb: FormBuilder, private qaService: QaService) {
    this.form = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      tipo_dependencia: [''],
      categoria_salarial: [''],
      estado_inicial: ['{}', this.jsonValidator],
      entrada: ['{}', this.jsonValidator],
      esperado: ['{}', this.jsonValidator]
    });
  }

  ngOnInit(): void {
    this.datasetId = this.params?.datasetId || 'DS-UNKNOWN';
    
    if (this.params?.isEdit && this.params?.codigo) {
      this.isEdit = true;
      // Mock fetch
      this.form.patchValue({
        codigo: this.params.codigo,
        descripcion: 'Caso de prueba existente',
        tipo_dependencia: 'ancla',
        estado_inicial: '{\n  "antiguedad": 5\n}',
        entrada: '{\n  "sueldo_basico": 500000\n}',
        esperado: '{\n  "ganancia_neta": 450000\n}'
      });
    } else if (this.params?.clonedFrom) {
      const c = this.params.clonedFrom;
      this.form.patchValue({
        codigo: c.codigo + '-CLONE',
        descripcion: c.descripcion,
        tipo_dependencia: c.tipo_dependencia,
        categoria_salarial: c.categoria_salarial,
        estado_inicial: JSON.stringify(c.estado_inicial, null, 2),
        entrada: JSON.stringify(c.entrada, null, 2),
        esperado: JSON.stringify(c.esperado, null, 2)
      });
    }
  }

  jsonValidator(control: any): {[key: string]: boolean} | null {
    if (!control.value) return null;
    try {
      JSON.parse(control.value);
      return null;
    } catch (e) {
      return { invalidJson: true };
    }
  }

  guardar(): void {
    if (this.form.valid) {
      // Mock save
      this.volver();
    }
  }

  volver(): void {
    this.cambiarVista.emit({ vista: 'casos-list', params: { datasetId: this.datasetId } });
  }
}
