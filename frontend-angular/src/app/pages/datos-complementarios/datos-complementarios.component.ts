import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalisisService } from '../../core/services/analisis.service';
import { EstadoAnalisisService } from '../../core/services/estado-analisis.service';

@Component({
  selector: 'app-datos-complementarios',
  template: `
    <main class="page space-y-6">
      <section class="hero-complementarios">
        <div>
          <span class="hero-eyebrow">Configuración del controlador</span>
          <h1>Datos complementarios</h1>
          <p>
            Completa solo lo que tengas confirmado. Estos datos permiten habilitar mas controles del spec sin que el motor invente informacion.
          </p>
        </div>
        <div class="hero-metrica">
          <strong>{{ porcentajeCompletitud }}%</strong>
          <span>cobertura manual</span>
        </div>
      </section>

      <mat-card class="p-6 mb-6 border border-brand-100 rounded-2xl bg-gradient-to-br from-brand-50/80 to-white shadow-sm">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h2 class="text-lg font-extrabold text-slate-800 m-0">Módulos para completar el controlador</h2>
            <p class="text-sm text-slate-500 mt-1 max-w-3xl">
              El Excel dispara el análisis básico. Estos módulos agregan contexto para que el motor pueda evaluar más V sin inventar datos.
            </p>
          </div>
          <div class="px-4 py-3 rounded-xl bg-white border border-brand-100 shadow-sm text-center">
            <div class="text-2xl font-extrabold text-brand-700">{{ porcentajeCompletitud }}%</div>
            <div class="text-[11px] uppercase tracking-wider font-bold text-slate-400">cobertura manual</div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div *ngFor="let modulo of modulosDatos" class="p-4 rounded-xl border bg-white/90 shadow-sm" [ngClass]="claseModulo(modulo.estado)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-bold text-sm text-slate-800 m-0">{{ modulo.nombre }}</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ modulo.descripcion }}</p>
              </div>
              <span class="shrink-0 text-[10px] px-2 py-1 rounded-full font-bold border" [ngClass]="badgeModulo(modulo.estado)">
                {{ modulo.estado }}
              </span>
            </div>
            <div class="mt-3 space-y-2">
              <div class="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>{{ modulo.informados }} / {{ modulo.total }} campos</span>
                <span>{{ modulo.porcentaje }}%</span>
              </div>
              <mat-progress-bar mode="determinate" [value]="modulo.porcentaje"></mat-progress-bar>
              <div class="flex flex-wrap gap-1 pt-1">
                <span *ngFor="let v of modulo.validaciones" class="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {{ v }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </mat-card>

      <form [formGroup]="form" class="space-y-6 complementarios-form">

        <!-- ===== GRUPO: Datos del cliente ===== -->
        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-4">Datos del cliente</h2>
          <div class="grid md:grid-cols-2 gap-4">

            <mat-form-field>
              <mat-label>CUIT cliente</mat-label>
              <input matInput formControlName="cliente_cuit" placeholder="20-12345678-9">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Modalidad SAC</mat-label>
              <mat-select formControlName="modalidad_sac">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="devengado">Devengado</mat-option>
                <mat-option value="percibido">Percibido</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Modo saldo a favor</mat-label>
              <mat-select formControlName="modo_saldo_favor">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="compensar">Compensar</mat-option>
                <mat-option value="devolver">Devolver</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Póliza de seguro cobra sobre SAC</mat-label>
              <mat-select formControlName="poliza_seguro_cobra_sobre_sac">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="true">Sí</mat-option>
                <mat-option value="false">No</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>CCT por defecto del cliente</mat-label>
              <input matInput formControlName="cct_default" placeholder="ej. 130/75">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Zona geográfica por defecto</mat-label>
              <mat-select formControlName="zona_geografica_default">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="general">General</mat-option>
                <mat-option value="patagonica">Patagónica</mat-option>
                <mat-option value="tdf">Tierra del Fuego</mat-option>
              </mat-select>
            </mat-form-field>

          </div>
        </mat-card>

        <!-- ===== GRUPO: Datos del empleado / legajo ===== -->
        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-4">Datos del empleado / legajo</h2>
          <div class="grid md:grid-cols-2 gap-4">

            <mat-form-field>
              <mat-label>Número de legajo</mat-label>
              <input matInput formControlName="legajo_numero" placeholder="Ej. 180">
            </mat-form-field>

            <mat-form-field>
              <mat-label>CUIL empleado</mat-label>
              <input matInput formControlName="empleado_cuil" placeholder="20-12345678-9">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Fecha de ingreso</mat-label>
              <input matInput type="date" formControlName="fecha_ingreso">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Fecha de egreso</mat-label>
              <input matInput type="date" formControlName="fecha_egreso">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Zona geográfica</mat-label>
              <mat-select formControlName="zona_geografica">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="general">General</mat-option>
                <mat-option value="patagonica">Patagónica</mat-option>
                <mat-option value="tdf">Tierra del Fuego</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Régimen previsional</mat-label>
              <mat-select formControlName="regimen_previsional">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="sipa">SIPA</mat-option>
                <mat-option value="docente">Docente</mat-option>
                <mat-option value="judicial">Judicial</mat-option>
                <mat-option value="minero">Minero</mat-option>
                <mat-option value="insalubre">Insalubre</mat-option>
                <mat-option value="otro">Otro</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>CCT aplicable</mat-label>
              <input matInput formControlName="cct_aplicable" placeholder="ej. 130/75">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Categoría</mat-label>
              <input matInput formControlName="categoria">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Situación de revista</mat-label>
              <input matInput formControlName="situacion_revista">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Carga de familia — cónyuge</mat-label>
              <mat-select formControlName="cargas_familia_conyuge">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="true">Sí</mat-option>
                <mat-option value="false">No</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Cargas de familia — cantidad de hijos</mat-label>
              <input matInput type="number" min="0" formControlName="cargas_familia_cant_hijos">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Cargas de familia — otras</mat-label>
              <input matInput formControlName="cargas_familia_otras" placeholder="ej. padre, madre">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Tiene otros empleadores</mat-label>
              <mat-select formControlName="tiene_otros_empleadores">
                <mat-option value="desconocido">Desconocido</mat-option>
                <mat-option value="true">Sí</mat-option>
                <mat-option value="false">No</mat-option>
              </mat-select>
            </mat-form-field>

          </div>
        </mat-card>

        <!-- ===== GRUPO: Contexto adicional ===== -->
        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-2">SIRADIG y deducciones informadas</h2>
          <p class="muted mb-4">Permite completar controles de topes por rubro, multiempleo y deducciones declaradas.</p>
          <div class="grid md:grid-cols-3 gap-4">
            <mat-form-field><mat-label>SIRADIG disponible</mat-label><mat-select formControlName="siradig_disponible"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>Otros empleadores declarados</mat-label><input matInput formControlName="otros_empleadores" placeholder="Detalle o referencia SIRADIG"></mat-form-field>
            <mat-form-field><mat-label>Gastos médicos</mat-label><input matInput type="number" formControlName="gastos_medicos"></mat-form-field>
            <mat-form-field><mat-label>Cuota médico asistencial</mat-label><input matInput type="number" formControlName="cuota_medico_asistencial"></mat-form-field>
            <mat-form-field><mat-label>Gastos educativos</mat-label><input matInput type="number" formControlName="gastos_educativos"></mat-form-field>
            <mat-form-field><mat-label>Servicio doméstico</mat-label><input matInput type="number" formControlName="servicio_domestico"></mat-form-field>
            <mat-form-field><mat-label>Alquileres inquilino</mat-label><input matInput type="number" formControlName="alquileres_inquilino"></mat-form-field>
            <mat-form-field><mat-label>Donaciones</mat-label><input matInput type="number" formControlName="donaciones"></mat-form-field>
            <mat-form-field><mat-label>Seguros</mat-label><input matInput type="number" formControlName="seguros"></mat-form-field>
            <mat-form-field><mat-label>Intereses hipotecarios</mat-label><input matInput type="number" formControlName="intereses_hipotecarios"></mat-form-field>
          </div>
        </mat-card>

        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-2">Normativa, escalas y topes</h2>
          <p class="muted mb-4">Datos necesarios para validar topes, zona geográfica, regímenes diferenciales y actualización normativa.</p>
          <div class="grid md:grid-cols-3 gap-4">
            <mat-form-field><mat-label>Normativa oficial validada</mat-label><mat-select formControlName="normativa_oficial_validada"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>Período normativo</mat-label><input matInput formControlName="periodo_normativo" placeholder="2026-S1"></mat-form-field>
            <mat-form-field><mat-label>RIPTE / índice aplicado</mat-label><input matInput formControlName="ripte"></mat-form-field>
            <mat-form-field><mat-label>Parámetros por zona</mat-label><input matInput formControlName="parametros_por_zona" placeholder="general / patagónica / TDF"></mat-form-field>
            <mat-form-field><mat-label>Topes por rubro</mat-label><input matInput formControlName="topes_por_rubro" placeholder="Referencia o versión"></mat-form-field>
            <mat-form-field><mat-label>Tabla regímenes previsionales</mat-label><input matInput formControlName="tabla_regimenes_previsionales"></mat-form-field>
            <mat-form-field><mat-label>Orden de topes</mat-label><input matInput formControlName="orden_topes"></mat-form-field>
            <mat-form-field><mat-label>Versión escala Art. 94</mat-label><input matInput formControlName="escala_art94_version" placeholder="ART94_2026_S1"></mat-form-field>
          </div>
        </mat-card>

        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-2">Novedades, historial y ajuste final</h2>
          <p class="muted mb-4">Completa validaciones de HNH, saldo a favor, cambios de tramo, diciembre y liquidación final.</p>
          <div class="grid md:grid-cols-3 gap-4">
            <mat-form-field><mat-label>HNH del mes</mat-label><input matInput type="number" formControlName="hnh_mes"></mat-form-field>
            <mat-form-field><mat-label>Modalidad HNH</mat-label><input matInput formControlName="modalidad_hnh"></mat-form-field>
            <mat-form-field><mat-label>Distribución HNH</mat-label><input matInput formControlName="distribucion_hnh"></mat-form-field>
            <mat-form-field><mat-label>Historial retenciones disponible</mat-label><mat-select formControlName="historial_retenciones_disponible"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>Retenciones efectivas previas</mat-label><input matInput formControlName="retenciones_efectivas_previas"></mat-form-field>
            <mat-form-field><mat-label>Escala Art. 94 por mes</mat-label><input matInput formControlName="escala_art94_por_mes"></mat-form-field>
            <mat-form-field><mat-label>Ajustes previos</mat-label><input matInput formControlName="ajustes_previos"></mat-form-field>
            <mat-form-field><mat-label>Ajuste final disponible</mat-label><mat-select formControlName="ajuste_final_disponible"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>SIRADIG definitivo</mat-label><mat-select formControlName="siradig_definitivo"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>Egreso en período</mat-label><mat-select formControlName="egreso_en_periodo"><mat-option value="desconocido">Desconocido</mat-option><mat-option value="true">Sí</mat-option><mat-option value="false">No</mat-option></mat-select></mat-form-field>
            <mat-form-field><mat-label>Conceptos exentos Art. 26</mat-label><input matInput formControlName="conceptos_exentos_art26"></mat-form-field>
            <mat-form-field><mat-label>Conceptos de egreso</mat-label><input matInput formControlName="conceptos_egreso"></mat-form-field>
            <mat-form-field><mat-label>Indemnizaciones</mat-label><input matInput formControlName="indemnizaciones"></mat-form-field>
          </div>
        </mat-card>

        <!-- ===== GRUPO: Contexto adicional ===== -->
        <mat-card class="p-6 bloque-formulario">
          <h2 class="section-title mb-4">Contexto adicional</h2>
          <mat-form-field class="w-full">
            <mat-label>Observaciones</mat-label>
            <textarea matInput formControlName="observaciones" rows="3"></textarea>
          </mat-form-field>
        </mat-card>

        <!-- ===== Resumen de completitud ===== -->
        <mat-card class="p-4 bg-slate-50 bloque-resumen">
          <p class="text-sm text-slate-600">
            <mat-icon class="text-green-600 align-middle" style="font-size:18px">check_circle</mat-icon>
            Campos informados: <b>{{camposInformados}}</b> /
            <b>{{camposTotal}}</b>
            <span class="ml-2 text-slate-400">(los campos vacíos o «Desconocido» no afectan el cálculo)</span>
          </p>
        </mat-card>

        <div class="barra-acciones">
          <button mat-flat-button color="primary" (click)="guardar()">
            <mat-icon>save</mat-icon> Guardar y reevaluar cobertura
          </button>
          <button mat-stroked-button (click)="cancelar()">Cancelar</button>
        </div>

      </form>
    </main>`,
  styles: [`
    :host {
      display: block;
    }

    .hero-complementarios {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 32px;
      border: 1px solid #dbe7f7;
      border-radius: 26px;
      background:
        radial-gradient(circle at right top, rgba(37, 99, 235, 0.12), transparent 34%),
        linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      margin-bottom: 10px;
      padding: 6px 10px;
      border-radius: 999px;
      background: #eef5ff;
      color: #2563eb;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .hero-complementarios h1 {
      margin: 0;
      color: #0f172a;
      font-size: clamp(28px, 3vw, 40px);
      line-height: 1.05;
      font-weight: 900;
    }

    .hero-complementarios p {
      max-width: 720px;
      margin: 12px 0 0;
      color: #52627a;
      font-size: 15px;
      line-height: 1.6;
    }

    .hero-metrica {
      min-width: 172px;
      padding: 18px 20px;
      border-radius: 22px;
      background: #ffffff;
      border: 1px solid #dbe7f7;
      box-shadow: 0 12px 28px rgba(37, 99, 235, 0.08);
      text-align: center;
    }

    .hero-metrica strong {
      display: block;
      color: #2563eb;
      font-size: 34px;
      font-weight: 900;
      line-height: 1;
    }

    .hero-metrica span {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .bloque-formulario {
      overflow: visible;
      border: 1px solid #dbe7f7;
      border-radius: 24px !important;
      background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
      box-shadow: 0 14px 35px rgba(15, 23, 42, 0.045);
    }

    .bloque-formulario .section-title {
      margin: 0 0 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e8eef7;
      color: #0f172a;
      font-size: 18px;
      font-weight: 900;
    }

    .bloque-formulario .muted {
      color: #64748b;
      line-height: 1.55;
    }

    .complementarios-form mat-form-field {
      width: 100%;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field {
      min-height: 72px;
      --mdc-outlined-text-field-container-shape: 14px;
      --mdc-outlined-text-field-outline-color: #d6e1f0;
      --mdc-outlined-text-field-hover-outline-color: #8fb3f7;
      --mdc-outlined-text-field-focus-outline-color: #2563eb;
      --mdc-outlined-text-field-label-text-color: #64748b;
      --mdc-outlined-text-field-hover-label-text-color: #2563eb;
      --mdc-outlined-text-field-focus-label-text-color: #2563eb;
      --mdc-outlined-text-field-input-text-color: #0f172a;
      --mat-select-enabled-trigger-text-color: #0f172a;
      --mat-select-focused-arrow-color: #2563eb;
      --mat-select-enabled-arrow-color: #64748b;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-text-field-wrapper {
      min-height: 58px;
      border-radius: 14px !important;
      background: #ffffff !important;
      box-shadow: 0 1px 0 rgba(15, 23, 42, .02);
      transition: box-shadow .18s ease, background .18s ease, transform .18s ease;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field:hover .mat-mdc-text-field-wrapper {
      background: #fbfdff !important;
      box-shadow: 0 10px 24px rgba(37, 99, 235, .07);
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field.mat-focused .mat-mdc-text-field-wrapper {
      background: #ffffff !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, .10), 0 14px 30px rgba(37, 99, 235, .10);
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field-flex {
      min-height: 58px;
      align-items: center;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field-infix {
      width: auto;
      min-height: 58px;
      padding-top: 18px;
      padding-bottom: 8px;
    }

    :host ::ng-deep .complementarios-form .mdc-notched-outline__leading {
      border-radius: 14px 0 0 14px !important;
      border-right: 0 !important;
    }

    :host ::ng-deep .complementarios-form .mdc-notched-outline__trailing {
      border-radius: 0 14px 14px 0 !important;
      border-left: 0 !important;
    }

    :host ::ng-deep .complementarios-form .mdc-notched-outline__notch {
      border-left: 0 !important;
      border-right: 0 !important;
    }

    :host ::ng-deep .complementarios-form .mdc-notched-outline__leading,
    :host ::ng-deep .complementarios-form .mdc-notched-outline__notch,
    :host ::ng-deep .complementarios-form .mdc-notched-outline__trailing {
      transition: border-color .18s ease, border-width .18s ease;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-floating-label {
      color: #64748b !important;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .01em;
    }

    :host ::ng-deep .complementarios-form .mdc-floating-label--float-above {
      background: #ffffff;
      padding: 0 6px;
      color: #64748b !important;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field.mat-focused .mdc-floating-label--float-above {
      color: #2563eb !important;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-select-trigger {
      min-height: 30px;
      align-items: center;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-select-value,
    :host ::ng-deep .complementarios-form input,
    :host ::ng-deep .complementarios-form textarea {
      color: #0f172a !important;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.35;
      letter-spacing: -.01em;
    }

    :host ::ng-deep .complementarios-form input::placeholder,
    :host ::ng-deep .complementarios-form textarea::placeholder {
      color: #94a3b8 !important;
      font-weight: 600;
    }

    :host ::ng-deep .complementarios-form .mat-mdc-form-field-subscript-wrapper {
      display: none;
    }

    .bloque-resumen {
      border: 1px solid #dbe7f7;
      border-radius: 18px !important;
      box-shadow: none;
    }

    .barra-acciones {
      position: sticky;
      bottom: 18px;
      z-index: 5;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 14px;
      border: 1px solid #dbe7f7;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(10px);
    }

    @media (max-width: 768px) {
      .hero-complementarios {
        align-items: stretch;
        flex-direction: column;
        padding: 22px;
      }

      .hero-metrica {
        width: 100%;
      }

      .barra-acciones {
        flex-direction: column;
      }
    }
  `],
})
export class DatosComplementariosComponent implements OnInit {
  form = this.fb.group({
    // Datos cliente
    cliente_cuit: '',
    modalidad_sac: 'desconocido',
    modo_saldo_favor: 'desconocido',
    poliza_seguro_cobra_sobre_sac: 'desconocido',
    cct_default: '',
    zona_geografica_default: 'desconocido',
    // Datos empleado
    legajo_numero: '',
    empleado_cuil: '',
    fecha_ingreso: '',
    fecha_egreso: '',
    zona_geografica: 'desconocido',
    regimen_previsional: 'desconocido',
    cct_aplicable: '',
    categoria: '',
    situacion_revista: '',
    cargas_familia_conyuge: 'desconocido',
    cargas_familia_cant_hijos: null as number | null,
    cargas_familia_otras: '',
    tiene_otros_empleadores: 'desconocido',
    // SIRADIG
    siradig_disponible: 'desconocido',
    otros_empleadores: '',
    gastos_medicos: null as number | null,
    cuota_medico_asistencial: null as number | null,
    gastos_educativos: null as number | null,
    servicio_domestico: null as number | null,
    alquileres_inquilino: null as number | null,
    donaciones: null as number | null,
    seguros: null as number | null,
    intereses_hipotecarios: null as number | null,
    // Normativa y topes
    normativa_oficial_validada: 'desconocido',
    periodo_normativo: '',
    ripte: '',
    parametros_por_zona: '',
    topes_por_rubro: '',
    tabla_regimenes_previsionales: '',
    orden_topes: '',
    escala_art94_version: '',
    // Novedades / historial / ajuste
    hnh_mes: null as number | null,
    modalidad_hnh: '',
    distribucion_hnh: '',
    historial_retenciones_disponible: 'desconocido',
    retenciones_efectivas_previas: '',
    escala_art94_por_mes: '',
    ajustes_previos: '',
    ajuste_final_disponible: 'desconocido',
    siradig_definitivo: 'desconocido',
    egreso_en_periodo: 'desconocido',
    conceptos_exentos_art26: '',
    conceptos_egreso: '',
    indemnizaciones: '',
    // Contexto
    observaciones: '',
  });

  private readonly definicionModulos = [
    {
      nombre: 'Cliente',
      descripcion: 'SAC, saldo a favor, póliza y configuración base.',
      campos: [
        'cliente_cuit',
        'modalidad_sac',
        'modo_saldo_favor',
        'poliza_seguro_cobra_sobre_sac',
        'cct_default',
        'zona_geografica_default',
      ],
      validaciones: ['V2', 'V8', 'V9', 'V10'],
    },
    {
      nombre: 'Legajo',
      descripcion: 'Ingreso, egreso, zona, régimen y cargas familiares.',
      campos: [
        'legajo_numero',
        'empleado_cuil',
        'fecha_ingreso',
        'fecha_egreso',
        'zona_geografica',
        'regimen_previsional',
        'cct_aplicable',
        'categoria',
        'situacion_revista',
        'cargas_familia_conyuge',
        'cargas_familia_cant_hijos',
        'cargas_familia_otras',
        'tiene_otros_empleadores',
      ],
      validaciones: ['V5', 'V13', 'V14', 'V15', 'V16', 'V20'],
    },
    {
      nombre: 'SIRADIG',
      descripcion: 'Deducciones declaradas y otros empleadores.',
      campos: [
        'siradig_disponible',
        'otros_empleadores',
        'gastos_medicos',
        'cuota_medico_asistencial',
        'gastos_educativos',
        'servicio_domestico',
        'alquileres_inquilino',
        'donaciones',
        'seguros',
        'intereses_hipotecarios',
      ],
      validaciones: ['V7', 'V14', 'V18', 'V19'],
    },
    {
      nombre: 'Normativa',
      descripcion: 'Escala, RIPTE, zona, topes y tablas oficiales.',
      campos: [
        'normativa_oficial_validada',
        'periodo_normativo',
        'ripte',
        'parametros_por_zona',
        'topes_por_rubro',
        'tabla_regimenes_previsionales',
        'orden_topes',
        'escala_art94_version',
      ],
      validaciones: ['V4', 'V5', 'V7', 'V12', 'V15', 'V16', 'V17', 'V18'],
    },
    {
      nombre: 'Novedades',
      descripcion: 'HNH, exenciones y conceptos especiales del mes.',
      campos: ['hnh_mes', 'modalidad_hnh', 'distribucion_hnh', 'conceptos_exentos_art26', 'conceptos_egreso'],
      validaciones: ['V11', 'V20', 'V21'],
    },
    {
      nombre: 'Historial',
      descripcion: 'Retenciones previas, cambios de escala y ajustes.',
      campos: [
        'historial_retenciones_disponible',
        'retenciones_efectivas_previas',
        'escala_art94_por_mes',
        'ajustes_previos',
      ],
      validaciones: ['V10', 'V12', 'V19'],
    },
    {
      nombre: 'Ajuste final',
      descripcion: 'Diciembre, egreso, SIRADIG definitivo e indemnizaciones.',
      campos: ['ajuste_final_disponible', 'siradig_definitivo', 'egreso_en_periodo', 'fecha_egreso', 'indemnizaciones'],
      validaciones: ['V19', 'V20'],
    },
  ];

  get camposTotal(): number {
    return Object.keys(this.form.controls).length;
  }

  get camposInformados(): number {
    const v = this.form.value as Record<string, any>;
    return Object.values(v).filter(
      (val) => val !== null && val !== '' && val !== 'desconocido',
    ).length;
  }

  get porcentajeCompletitud(): number {
    return Math.round((this.camposInformados * 100) / this.camposTotal);
  }

  get modulosDatos() {
    const valor = this.form.value as Record<string, any>;
    return this.definicionModulos.map((modulo) => {
      const informados = modulo.campos.filter((campo) => this.tieneValor(valor[campo])).length;
      const porcentaje = Math.round((informados * 100) / modulo.campos.length);
      return {
        ...modulo,
        informados,
        total: modulo.campos.length,
        porcentaje,
        estado: porcentaje === 100 ? 'Completo' : informados > 0 ? 'Parcial' : 'Pendiente',
      };
    });
  }

  claseModulo(estado: string): string {
    if (estado === 'Completo') return 'border-green-100';
    if (estado === 'Parcial') return 'border-amber-100';
    return 'border-slate-100';
  }

  badgeModulo(estado: string): string {
    if (estado === 'Completo') return 'bg-green-50 text-green-700 border-green-100';
    if (estado === 'Parcial') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-slate-50 text-slate-500 border-slate-200';
  }

  private tieneValor(valor: any): boolean {
    return valor !== null && valor !== undefined && valor !== '' && valor !== 'desconocido';
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private service: AnalisisService,
    private estado: EstadoAnalisisService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Prellenar si hay datos en el análisis actual
    const actual = this.estado.actual;
    const id = this.route.snapshot.paramMap.get('id');

    if (id && (!actual || actual.id !== id)) {
      this.service.obtener(id).subscribe((analisis) => {
        this.estado.actual = analisis;
        this.ngOnInit();
      });
      return;
    }

    const cc = actual?.['contexto_complementario'] ?? {};
    const dc = cc.datos_cliente ?? {};
    const dl = cc.datos_legajo ?? {};
    const ds = cc.datos_siradig ?? {};
    const dn = cc.datos_normativa ?? {};
    const dnov = cc.datos_novedades ?? {};
    const dh = cc.datos_historial ?? {};
    const da = cc.datos_ajuste_final ?? {};
    const ctx = cc.datos_contexto ?? {};

    this.form.patchValue({
      cliente_cuit: dc.cliente_cuit ?? '',
      modalidad_sac: dc.modalidad_sac ?? 'desconocido',
      modo_saldo_favor: dc.modo_saldo_favor ?? 'desconocido',
      poliza_seguro_cobra_sobre_sac: String(dc.poliza_seguro_cobra_sobre_sac ?? 'desconocido'),
      cct_default: dc.cct_default ?? '',
      zona_geografica_default: dc.zona_geografica_default ?? 'desconocido',
      legajo_numero: dl.legajo_numero ?? '',
      empleado_cuil: dl.empleado_cuil ?? '',
      fecha_ingreso: dl.fecha_ingreso ?? '',
      fecha_egreso: dl.fecha_egreso ?? '',
      zona_geografica: dl.zona_geografica ?? 'desconocido',
      regimen_previsional: dl.regimen_previsional ?? 'desconocido',
      cct_aplicable: dl.cct_aplicable ?? '',
      categoria: dl.categoria ?? '',
      situacion_revista: dl.situacion_revista ?? '',
      cargas_familia_conyuge: String(dl.cargas_familia_conyuge ?? 'desconocido'),
      cargas_familia_cant_hijos: dl.cargas_familia_cant_hijos ?? null,
      cargas_familia_otras: dl.cargas_familia_otras ?? '',
      tiene_otros_empleadores: String(dl.tiene_otros_empleadores ?? 'desconocido'),
      siradig_disponible: String(ds.siradig_disponible ?? 'desconocido'),
      otros_empleadores: ds.otros_empleadores ?? '',
      gastos_medicos: ds.gastos_medicos ?? null,
      cuota_medico_asistencial: ds.cuota_medico_asistencial ?? null,
      gastos_educativos: ds.gastos_educativos ?? null,
      servicio_domestico: ds.servicio_domestico ?? null,
      alquileres_inquilino: ds.alquileres_inquilino ?? null,
      donaciones: ds.donaciones ?? null,
      seguros: ds.seguros ?? null,
      intereses_hipotecarios: ds.intereses_hipotecarios ?? null,
      normativa_oficial_validada: String(dn.normativa_oficial_validada ?? 'desconocido'),
      periodo_normativo: dn.periodo_normativo ?? '',
      ripte: dn.ripte ?? '',
      parametros_por_zona: dn.parametros_por_zona ?? '',
      topes_por_rubro: dn.topes_por_rubro ?? '',
      tabla_regimenes_previsionales: dn.tabla_regimenes_previsionales ?? '',
      orden_topes: dn.orden_topes ?? '',
      escala_art94_version: dn.escala_art94_version ?? '',
      hnh_mes: dnov.hnh_mes ?? null,
      modalidad_hnh: dnov.modalidad_hnh ?? '',
      distribucion_hnh: dnov.distribucion_hnh ?? '',
      historial_retenciones_disponible: String(dh.historial_retenciones_disponible ?? 'desconocido'),
      retenciones_efectivas_previas: dh.retenciones_efectivas_previas ?? '',
      escala_art94_por_mes: dh.escala_art94_por_mes ?? '',
      ajustes_previos: dh.ajustes_previos ?? '',
      ajuste_final_disponible: String(da.ajuste_final_disponible ?? 'desconocido'),
      siradig_definitivo: String(da.siradig_definitivo ?? 'desconocido'),
      egreso_en_periodo: String(da.egreso_en_periodo ?? 'desconocido'),
      conceptos_exentos_art26: dnov.conceptos_exentos_art26 ?? '',
      conceptos_egreso: dnov.conceptos_egreso ?? '',
      indemnizaciones: da.indemnizaciones ?? '',
      observaciones: ctx.observaciones ?? '',
    });
  }

  guardar() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    const v = this.form.value;

    // Los campos booleanos se envían como string ("true"|"false"|"desconocido")
    const body = {
      datos_cliente: {
        cliente_cuit: v.cliente_cuit || undefined,
        modalidad_sac: v.modalidad_sac !== 'desconocido' ? v.modalidad_sac : undefined,
        modo_saldo_favor: v.modo_saldo_favor !== 'desconocido' ? v.modo_saldo_favor : undefined,
        poliza_seguro_cobra_sobre_sac:
          v.poliza_seguro_cobra_sobre_sac !== 'desconocido'
            ? v.poliza_seguro_cobra_sobre_sac
            : undefined,
        cct_default: v.cct_default || undefined,
        zona_geografica_default:
          v.zona_geografica_default !== 'desconocido' ? v.zona_geografica_default : undefined,
      },
      datos_legajo: {
        legajo_numero: v.legajo_numero || undefined,
        empleado_cuil: v.empleado_cuil || undefined,
        fecha_ingreso: v.fecha_ingreso || undefined,
        fecha_egreso: v.fecha_egreso || undefined,
        zona_geografica: v.zona_geografica !== 'desconocido' ? v.zona_geografica : undefined,
        regimen_previsional:
          v.regimen_previsional !== 'desconocido' ? v.regimen_previsional : undefined,
        cct_aplicable: v.cct_aplicable || undefined,
        categoria: v.categoria || undefined,
        situacion_revista: v.situacion_revista || undefined,
        cargas_familia_conyuge:
          v.cargas_familia_conyuge !== 'desconocido' ? v.cargas_familia_conyuge : undefined,
        cargas_familia_cant_hijos: v.cargas_familia_cant_hijos ?? undefined,
        cargas_familia_otras: v.cargas_familia_otras || undefined,
        tiene_otros_empleadores:
          v.tiene_otros_empleadores !== 'desconocido' ? v.tiene_otros_empleadores : undefined,
      },
      datos_siradig: {
        siradig_disponible: v.siradig_disponible !== 'desconocido' ? v.siradig_disponible : undefined,
        otros_empleadores: v.otros_empleadores || undefined,
        gastos_medicos: v.gastos_medicos ?? undefined,
        cuota_medico_asistencial: v.cuota_medico_asistencial ?? undefined,
        gastos_educativos: v.gastos_educativos ?? undefined,
        servicio_domestico: v.servicio_domestico ?? undefined,
        alquileres_inquilino: v.alquileres_inquilino ?? undefined,
        donaciones: v.donaciones ?? undefined,
        seguros: v.seguros ?? undefined,
        intereses_hipotecarios: v.intereses_hipotecarios ?? undefined,
      },
      datos_normativa: {
        normativa_oficial_validada:
          v.normativa_oficial_validada !== 'desconocido' ? v.normativa_oficial_validada : undefined,
        periodo_normativo: v.periodo_normativo || undefined,
        ripte: v.ripte || undefined,
        parametros_por_zona: v.parametros_por_zona || undefined,
        topes_por_rubro: v.topes_por_rubro || undefined,
        tabla_regimenes_previsionales: v.tabla_regimenes_previsionales || undefined,
        orden_topes: v.orden_topes || undefined,
        escala_art94_version: v.escala_art94_version || undefined,
      },
      datos_novedades: {
        hnh_mes: v.hnh_mes ?? undefined,
        modalidad_hnh: v.modalidad_hnh || undefined,
        distribucion_hnh: v.distribucion_hnh || undefined,
        conceptos_exentos_art26: v.conceptos_exentos_art26 || undefined,
        conceptos_egreso: v.conceptos_egreso || undefined,
      },
      datos_historial: {
        historial_retenciones_disponible:
          v.historial_retenciones_disponible !== 'desconocido' ? v.historial_retenciones_disponible : undefined,
        retenciones_efectivas_previas: v.retenciones_efectivas_previas || undefined,
        escala_art94_por_mes: v.escala_art94_por_mes || undefined,
        ajustes_previos: v.ajustes_previos || undefined,
      },
      datos_ajuste_final: {
        ajuste_final_disponible:
          v.ajuste_final_disponible !== 'desconocido' ? v.ajuste_final_disponible : undefined,
        siradig_definitivo: v.siradig_definitivo !== 'desconocido' ? v.siradig_definitivo : undefined,
        egreso_en_periodo: v.egreso_en_periodo !== 'desconocido' ? v.egreso_en_periodo : undefined,
        indemnizaciones: v.indemnizaciones || undefined,
      },
      datos_contexto: {
        observaciones: v.observaciones || undefined,
        fuente_datos: 'manual',
      },
    };

    this.service.agregarContexto(id, body).subscribe((a) => {
      this.estado.actual = a;
      this.router.navigate(['/analisis', a.id]);
    });
  }

  cancelar() {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(id ? ['/analisis', id] : ['/inicio']);
  }
}
