import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QaService } from '../../../../core/services/qa.service';

@Component({
  selector: 'app-qa-dataset-form',
  template: `
    <div class="contenedor-hijo">
      <div class="cabecera-hijo">
        <div class="flex-align">
          <button mat-icon-button (click)="volver()" class="btn-back">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h2 class="titulo-hijo">{{ isEdit ? 'Editar Dataset' : 'Nuevo Dataset' }}</h2>
            <p class="subtitulo">Configura los parámetros base para este conjunto de datos.</p>
          </div>
        </div>
      </div>

      <div class="alerta-info" *ngIf="!isEdit && datasetAnterior">
        <mat-icon>info</mat-icon>
        <span>Dataset anterior detectado: <b>{{ datasetAnterior }}</b>. Este nuevo dataset continuará la cadena de vigencias.</span>
      </div>

      <mat-card class="tarjeta-form">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="form-grid">
            
            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Convenio</mat-label>
              <mat-select formControlName="convenio" required>
                <mat-option value="Comercio (130/75)">Comercio (130/75)</mat-option>
                <mat-option value="UOCRA (76/22)">UOCRA (76/22)</mat-option>
                <mat-option value="SMATA (15/89)">SMATA (15/89)</mat-option>
              </mat-select>
              <mat-error>Requerido</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-span-1">
              <mat-label>Período</mat-label>
              <input matInput formControlName="periodo" placeholder="Ej: 2026-09" required>
              <mat-error>Requerido</mat-error>
            </mat-form-field>

            <div class="grupo-vigencia col-span-1">
              <mat-form-field appearance="outline" class="input-mitad">
                <mat-label>Vigencia Desde</mat-label>
                <input matInput formControlName="vigencia_desde" placeholder="YYYY-MM" required>
                <mat-error>Requerido</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="input-mitad">
                <mat-label>Vigencia Hasta</mat-label>
                <input matInput formControlName="vigencia_hasta" placeholder="Opcional">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Ajuste respecto al anterior</mat-label>
              <input matInput formControlName="ajuste" placeholder="Ej: Factor general 1.05">
              <mat-hint>Describe qué cambió respecto al dataset base.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Fuente Normativa</mat-label>
              <input matInput formControlName="fuente_normativa" placeholder="Resolución o Acuerdo">
            </mat-form-field>

            <div class="acciones-form col-span-2">
              <button mat-button type="button" (click)="volver()">Cancelar</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Guardar Dataset</button>
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
    
    .grupo-vigencia { display: flex; gap: 12px; }
    .input-mitad { flex: 1; }

    .acciones-form { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
    .acciones-form button { border-radius: 8px; font-weight: 600; padding: 0 24px; height: 42px; }

    .alerta-info { display: flex; align-items: center; gap: 12px; background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; color: #1e3a8a; font-size: 14px; }
    .alerta-info mat-icon { color: #3b82f6; }
  `]
})
export class QaDatasetFormComponent implements OnInit {
  @Input() params: any = {};
  @Output() cambiarVista = new EventEmitter<{vista: string, params?: any}>();

  form: FormGroup;
  isEdit = false;
  datasetAnterior = 'DS-COM-0826'; 

  constructor(private fb: FormBuilder, private qaService: QaService) {
    this.form = this.fb.group({
      convenio: ['', Validators.required],
      periodo: ['', Validators.required],
      vigencia_desde: ['', Validators.required],
      vigencia_hasta: [''],
      ajuste: [''],
      fuente_normativa: ['']
    });
  }

  ngOnInit(): void {
    if (this.params?.isEdit && this.params?.codigo) {
      this.isEdit = true;
      this.qaService.getDataset(this.params.codigo).subscribe(ds => {
        if (ds) {
          this.form.patchValue({
            convenio: ds.convenio,
            periodo: ds.periodo,
            vigencia_desde: ds.vigencia.desde,
            vigencia_hasta: ds.vigencia.hasta,
            ajuste: ds.ajuste,
            fuente_normativa: ds.fuente_normativa
          });
        }
      });
    }
  }

  guardar(): void {
    if (this.form.valid) {
      const val = this.form.value;
      const payload = {
        codigo: this.params?.codigo,
        convenio: val.convenio,
        periodo: val.periodo,
        vigencia: {
          desde: val.vigencia_desde,
          hasta: val.vigencia_hasta
        },
        estado: 'borrador' as const,
        ajuste: val.ajuste,
        fuente_normativa: val.fuente_normativa
      };

      this.qaService.saveDataset(payload).subscribe(() => {
        this.volver();
      });
    }
  }

  volver(): void {
    this.cambiarVista.emit({ vista: 'datasets-list' });
  }
}
