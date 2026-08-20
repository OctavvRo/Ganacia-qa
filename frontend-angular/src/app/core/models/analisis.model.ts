export interface AnalisisResumen{id:string;fecha_analisis:string;cliente:string;legajo:string;periodo:string;archivo:string;estado:string;veredicto:string;diferencia:number}
export interface ListaAnalisis{datos:AnalisisResumen[];pagina:number;limite:number;total:number;paginas:number}
export interface Analisis{[clave:string]:any;id?:string;estado:string;veredicto:string;metadata:Record<string,any>;analisis_sac:Record<string,any>;calculo?:Record<string,any>;validaciones:any[];detalle_mensual:any[];cobertura_reporte?:Record<string,any>;snapshot?:Record<string,any>}
