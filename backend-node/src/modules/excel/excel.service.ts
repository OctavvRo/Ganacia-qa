import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { AcumuladorMensual, LiquidacionNormalizada, MESES, Mes } from '../motor-ganancias/dominio';
import { NormalizadorService } from '../normalizacion/normalizador.service';
import { D } from '../../common/decimal/decimal.util';

@Injectable()
export class ExcelService {
  constructor(private readonly normalizador: NormalizadorService) {}

  async leer(buffer: Buffer, nombreArchivo: string): Promise<LiquidacionNormalizada> {
    if (path.extname(nombreArchivo).toLowerCase() !== '.xlsx') throw new BadRequestException('El archivo debe tener extension .xlsx');
    const libro = new ExcelJS.Workbook();
    try { await libro.xlsx.load(buffer as never); } catch (error) { throw new BadRequestException(`No se pudo abrir el libro: ${String(error)}`); }
    const hojas = libro.worksheets;
    const hoja = this.detectarHojaPrincipal(hojas);
    const { filaEncabezado, columnas } = this.detectarColumnas(hoja);
    const acumuladores: Record<string, AcumuladorMensual> = {};
    const desconocidos: string[] = [];
    const advertencias: string[] = [];
    for (let fila = filaEncabezado + 1; fila <= hoja.rowCount; fila++) {
      const etiqueta = this.valorCelda(hoja.getCell(fila, columnas.concepto));
      if (etiqueta === null || String(etiqueta).trim() === '') continue;
      const clave = this.normalizador.normalizarClave(etiqueta);
      if (!clave) {
        const parece = columnas.tipo ? Boolean(this.valorCelda(hoja.getCell(fila, columnas.tipo))) : MESES.some(m => columnas[m] && this.valorCelda(hoja.getCell(fila, columnas[m]!)) != null);
        if (parece) desconocidos.push(String(etiqueta).trim());
        continue;
      }
      const valores = {} as Record<Mes, ReturnType<typeof D>>;
      for (const mes of MESES) valores[mes] = columnas[mes] ? this.normalizador.convertirNumero(this.valorCelda(hoja.getCell(fila, columnas[mes]!))) : D(0);
      const total = columnas.total ? this.normalizador.convertirNumero(this.valorCelda(hoja.getCell(fila, columnas.total))) : Object.values(valores).reduce((a,b)=>a.plus(b),D(0));
      if (acumuladores[clave]) advertencias.push(`El concepto '${clave}' aparece mas de una vez; se uso la ultima fila.`);
      acumuladores[clave] = { clave, etiqueta_original:String(etiqueta).trim(), tipo_original: columnas.tipo ? String(this.valorCelda(hoja.getCell(fila,columnas.tipo)) ?? '').trim() || null : null, valores, total, fila_origen:fila };
    }
    if (!Object.keys(acumuladores).length) throw new BadRequestException('No se reconocio ningun acumulador en el libro');
    const metadata = this.inferirMetadata(nombreArchivo, hoja.name, this.valorCelda(hoja.getCell(1,1)));
    const papel: Record<string, ReturnType<typeof D>> = {};
    hoja.eachRow(row => row.eachCell(cell => { if (this.normalizador.normalizarTexto(this.valorCelda(cell)) === 'total ingresos') { const siguiente = hoja.getCell(cell.row, cell.col + 1); try { papel.total_ingresos = this.normalizador.convertirNumero(this.valorCelda(siguiente)); } catch {} } }));
    return { metadata, acumuladores, papel_trabajo:papel, papel_trabajo_mes:metadata.mes_liquidacion, hojas_detectadas:hojas.map(h=>h.name), hojas_faltantes:[], advertencias, conceptos_no_reconocidos:desconocidos };
  }

  private detectarHojaPrincipal(hojas: ExcelJS.Worksheet[]): ExcelJS.Worksheet {
    let mejor: ExcelJS.Worksheet | undefined; let puntajeMejor = -1;
    for (const hoja of hojas) { let puntaje=0; const maxFila=Math.min(hoja.rowCount,30), maxCol=Math.min(hoja.columnCount,25); for(let f=1;f<=maxFila;f++) for(let c=1;c<=maxCol;c++){const v=this.valorCelda(hoja.getCell(f,c)); const t=this.normalizador.normalizarTexto(v); if((MESES as readonly string[]).includes(t)) puntaje+=2; if(t==='acumulador'||t==='acomulador')puntaje+=8; if(this.normalizador.normalizarClave(v))puntaje++;} if(puntaje>puntajeMejor){mejor=hoja;puntajeMejor=puntaje;} }
    if(!mejor||puntajeMejor<10) throw new BadRequestException('No se encontro una hoja principal compatible'); return mejor;
  }

  private detectarColumnas(hoja: ExcelJS.Worksheet): {filaEncabezado:number; columnas:Record<string,number>} {
    for(let f=1;f<=Math.min(hoja.rowCount,30);f++){const encabezados:Record<string,number>={};for(let c=1;c<=Math.min(hoja.columnCount,40);c++){const v=this.valorCelda(hoja.getCell(f,c));if(v!==null&&v!==undefined)encabezados[this.normalizador.normalizarTexto(v)]=c;}const concepto=encabezados.acumulador||encabezados.acomulador;const meses=MESES.filter(m=>encabezados[m]);if(concepto&&meses.length>=6){const columnas:Record<string,number>={concepto};for(const m of meses)columnas[m]=encabezados[m];if(encabezados.tipo)columnas.tipo=encabezados.tipo;const total=Object.entries(encabezados).find(([k])=>k.includes('total')&&!(MESES as readonly string[]).includes(k));if(total)columnas.total=total[1];return{filaEncabezado:f,columnas};}}
    throw new BadRequestException('No se detectaron los encabezados de meses');
  }

  private inferirMetadata(nombre:string, hoja:string, titulo:unknown) {
    const stem=path.basename(nombre,path.extname(nombre)); const m=/(?:(?:review|auditoria)_)?(.+?)_legajo_?(\d+)_m?(0[1-9]|1[0-2])[-_]?(\d{4})(?:_|$)/i.exec(stem);
    return { archivo:nombre, hoja, cliente:m?m[1].replace(/_/g,' ').trim():titulo?String(titulo).split(/\s*-\s*legajos/i)[0].trim():null, legajo:m?m[2]:null, periodo_fiscal:m?Number(m[4]):null, mes_liquidacion:m?Number(m[3]):null };
  }

  private valorCelda(celda: ExcelJS.Cell): unknown { const v=celda.value as any; if(v&&typeof v==='object'){if('result'in v)return v.result;if('text'in v)return v.text;if('richText'in v)return v.richText.map((x:any)=>x.text).join('');}return v; }
}
