import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { HTTP_INTERCEPTORS, HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatCardModule } from "@angular/material/card";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { MatExpansionModule } from "@angular/material/expansion";
import {
  MatFormFieldModule,
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
} from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { MatDividerModule } from "@angular/material/divider";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import {
  ConfirmarLogoutDialogComponent,
  LayoutComponent,
} from "./shared/components/layout/layout.component";
import { BadgeComponent } from "./shared/components/badge/badge.component";
import { MonthCardComponent } from "./shared/components/month-card/month-card.component";
import { MonedaArPipe } from "./shared/pipes/moneda-ar.pipe";
import { FechaArPipe } from "./shared/pipes/fecha-ar.pipe";
import { InicioComponent } from "./pages/inicio/inicio.component";
import { CargarExcelComponent } from "./pages/cargar-excel/cargar-excel.component";
import { AnalisisComponent } from "./pages/analisis/analisis.component";
import { CalculoComponent } from "./pages/calculo/calculo.component";
import { DiagnosticosComponent } from "./pages/diagnosticos/diagnosticos.component";
import { HistorialComponent } from "./pages/historial/historial.component";
import { ConfiguracionComponent } from "./pages/configuracion/configuracion.component";
import { DatosComplementariosComponent } from "./pages/datos-complementarios/datos-complementarios.component";
import { LoginComponent } from "./pages/login/login.component";
import { QaPantalla1Component } from "./pages/qa-pantalla-1/qa-pantalla-1.component";
import { QaPantalla2Component } from "./pages/qa-pantalla-2/qa-pantalla-2.component";
import { AuthInterceptor } from "./core/interceptors/auth.interceptor";
import { QaDatasetsListComponent } from "./pages/qa-pantalla-2/components/qa-datasets-list/qa-datasets-list.component";
import { QaDatasetFormComponent } from "./pages/qa-pantalla-2/components/qa-dataset-form/qa-dataset-form.component";
import { QaCasosListComponent } from "./pages/qa-pantalla-2/components/qa-casos-list/qa-casos-list.component";
import { QaCasoFormComponent } from "./pages/qa-pantalla-2/components/qa-caso-form/qa-caso-form.component";
import { QaNuevaCorridaComponent } from "./pages/qa-pantalla-2/components/qa-nueva-corrida/qa-nueva-corrida.component";
import { QaResultadoCorridaComponent } from "./pages/qa-pantalla-2/components/qa-resultado-corrida/qa-resultado-corrida.component";
import { QaColaRevisionComponent } from "./pages/qa-pantalla-2/components/qa-cola-revision/qa-cola-revision.component";
import { QaHistorialComponent } from "./pages/qa-pantalla-2/components/qa-historial/qa-historial.component";
import { QaPanelCoberturaComponent } from "./pages/qa-pantalla-2/components/qa-panel-cobertura/qa-panel-cobertura.component";
import { QaPantalla3Component } from "./pages/qa-pantalla-3/qa-pantalla-3.component";
import { QaLabMutacionComponent } from "./pages/qa-pantalla-3/components/qa-lab-mutacion/qa-lab-mutacion.component";
import { QaLabSimulacionComponent } from "./pages/qa-pantalla-3/components/qa-lab-simulacion/qa-lab-simulacion.component";
import { QaLabSpiderComponent } from "./pages/qa-pantalla-3/components/qa-lab-spider/qa-lab-spider.component";
import { MatCheckboxModule } from "@angular/material/checkbox";
@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,
    ConfirmarLogoutDialogComponent,
    BadgeComponent,
    MonthCardComponent,
    MonedaArPipe,
    FechaArPipe,
    InicioComponent,
    CargarExcelComponent,
    AnalisisComponent,
    CalculoComponent,
    DiagnosticosComponent,
    HistorialComponent,
    ConfiguracionComponent,
    DatosComplementariosComponent,
    LoginComponent,
    QaPantalla1Component,
    QaPantalla2Component,
    QaDatasetsListComponent,
    QaDatasetFormComponent,
    QaCasosListComponent,
    QaCasoFormComponent,
    QaNuevaCorridaComponent,
    QaResultadoCorridaComponent,
    QaColaRevisionComponent,
    QaHistorialComponent,
    QaPanelCoberturaComponent,
    QaPantalla3Component,
    QaLabMutacionComponent,
    QaLabSimulacionComponent,
    QaLabSpiderComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatSidenavModule,
    MatCardModule,
    MatTableModule,
    MatTabsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    MatDividerModule,
    MatPaginatorModule,
    MatChipsModule,
    MatTooltipModule,
    MatCheckboxModule,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: "outline" },
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
