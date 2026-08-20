import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { D, centavos } from '../../common/decimal/decimal.util';
import { TramoEscala } from './dominio';

export const ESCALA_ART94_2026_S1: TramoEscala[] = [
  // Valores tomados de spec-controlador-ganancias-4ta.md, Anexo A.
  // Validar contra normativa oficial antes de produccion.
  {tramo:1,minimo:D('0'),maximo:D('3375056.00'),importe_fijo:D('0'),porcentaje:D('5')},
  {tramo:2,minimo:D('3375056.00'),maximo:D('6750113.00'),importe_fijo:D('168752.80'),porcentaje:D('9')},
  {tramo:3,minimo:D('6750113.00'),maximo:D('10125170.00'),importe_fijo:D('472508.73'),porcentaje:D('12')},
  {tramo:4,minimo:D('10125170.00'),maximo:D('13500227.00'),importe_fijo:D('877515.57'),porcentaje:D('15')},
  {tramo:5,minimo:D('13500203.10'),maximo:D('20250339.00'),importe_fijo:D('2375035.73'),porcentaje:D('27')},
  {tramo:6,minimo:D('20250339.00'),maximo:D('27000451.00'),importe_fijo:D('4199916.71'),porcentaje:D('30')},
  {tramo:7,minimo:D('27000451.00'),maximo:D('30375456.98'),importe_fijo:D('6224950.58'),porcentaje:D('32')},
  {tramo:8,minimo:D('30375456.98'),maximo:null,importe_fijo:D('7336360.37'),porcentaje:D('35')},
];

export const ESCALA_ART94_2026_S2: Record<number, TramoEscala[]> = {
  // Valores tomados de Tabla-Art-94-LIG-per-jul-a-dic-2026.pdf.
  // Validar contra normativa oficial antes de produccion.
  7:[
    {tramo:1,minimo:D('0'),maximo:D('1194761.19'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('1194761.19'),maximo:D('2389522.36'),importe_fijo:D('59738.06'),porcentaje:D('9')},
    {tramo:3,minimo:D('2389522.36'),maximo:D('3584283.55'),importe_fijo:D('167266.57'),porcentaje:D('12')},
    {tramo:4,minimo:D('3584283.55'),maximo:D('5376425.33'),importe_fijo:D('310637.91'),porcentaje:D('15')},
    {tramo:5,minimo:D('5376425.33'),maximo:D('10752850.66'),importe_fijo:D('579459.17'),porcentaje:D('19')},
    {tramo:6,minimo:D('10752850.66'),maximo:D('16129276.00'),importe_fijo:D('1600979.99'),porcentaje:D('23')},
    {tramo:7,minimo:D('16129276.00'),maximo:D('24193913.99'),importe_fijo:D('2837557.81'),porcentaje:D('27')},
    {tramo:8,minimo:D('24193913.99'),maximo:D('36290871.00'),importe_fijo:D('5015010.07'),porcentaje:D('31')},
    {tramo:9,minimo:D('36290871.00'),maximo:null,importe_fijo:D('8765066.75'),porcentaje:D('35')},
  ],
  8:[
    {tramo:1,minimo:D('0'),maximo:D('1389507.33'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('1389507.33'),maximo:D('2779014.64'),importe_fijo:D('69475.37'),porcentaje:D('9')},
    {tramo:3,minimo:D('2779014.64'),maximo:D('4168521.97'),importe_fijo:D('194531.02'),porcentaje:D('12')},
    {tramo:4,minimo:D('4168521.97'),maximo:D('6252782.96'),importe_fijo:D('361271.90'),porcentaje:D('15')},
    {tramo:5,minimo:D('6252782.96'),maximo:D('12505565.93'),importe_fijo:D('673911.05'),porcentaje:D('19')},
    {tramo:6,minimo:D('12505565.93'),maximo:D('18758348.89'),importe_fijo:D('1861939.82'),porcentaje:D('23')},
    {tramo:7,minimo:D('18758348.89'),maximo:D('28137523.34'),importe_fijo:D('3300079.90'),porcentaje:D('27')},
    {tramo:8,minimo:D('28137523.34'),maximo:D('42206285.02'),importe_fijo:D('5832457.00'),porcentaje:D('31')},
    {tramo:9,minimo:D('42206285.02'),maximo:null,importe_fijo:D('10193773.12'),porcentaje:D('35')},
  ],
  9:[
    {tramo:1,minimo:D('0'),maximo:D('1584253.47'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('1584253.47'),maximo:D('3168506.93'),importe_fijo:D('79212.67'),porcentaje:D('9')},
    {tramo:3,minimo:D('3168506.93'),maximo:D('4752760.39'),importe_fijo:D('221795.48'),porcentaje:D('12')},
    {tramo:4,minimo:D('4752760.39'),maximo:D('7129140.60'),importe_fijo:D('411905.90'),porcentaje:D('15')},
    {tramo:5,minimo:D('7129140.60'),maximo:D('14258281.19'),importe_fijo:D('768362.93'),porcentaje:D('19')},
    {tramo:6,minimo:D('14258281.19'),maximo:D('21387421.79'),importe_fijo:D('2122899.64'),porcentaje:D('23')},
    {tramo:7,minimo:D('21387421.79'),maximo:D('32081132.69'),importe_fijo:D('3762601.98'),porcentaje:D('27')},
    {tramo:8,minimo:D('32081132.69'),maximo:D('48121699.04'),importe_fijo:D('6649903.92'),porcentaje:D('31')},
    {tramo:9,minimo:D('48121699.04'),maximo:null,importe_fijo:D('11622479.49'),porcentaje:D('35')},
  ],
  10:[
    {tramo:1,minimo:D('0'),maximo:D('1778999.61'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('1778999.61'),maximo:D('3557999.21'),importe_fijo:D('88949.98'),porcentaje:D('9')},
    {tramo:3,minimo:D('3557999.21'),maximo:D('5336998.81'),importe_fijo:D('249059.94'),porcentaje:D('12')},
    {tramo:4,minimo:D('5336998.81'),maximo:D('8005498.23'),importe_fijo:D('462539.90'),porcentaje:D('15')},
    {tramo:5,minimo:D('8005498.23'),maximo:D('16010996.46'),importe_fijo:D('862814.81'),porcentaje:D('19')},
    {tramo:6,minimo:D('16010996.46'),maximo:D('24016494.69'),importe_fijo:D('2383859.47'),porcentaje:D('23')},
    {tramo:7,minimo:D('24016494.69'),maximo:D('36024742.03'),importe_fijo:D('4225124.07'),porcentaje:D('27')},
    {tramo:8,minimo:D('36024742.03'),maximo:D('54037113.06'),importe_fijo:D('7467350.85'),porcentaje:D('31')},
    {tramo:9,minimo:D('54037113.06'),maximo:null,importe_fijo:D('13051185.87'),porcentaje:D('35')},
  ],
  11:[
    {tramo:1,minimo:D('0'),maximo:D('1973745.75'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('1973745.75'),maximo:D('3947491.49'),importe_fijo:D('98687.29'),porcentaje:D('9')},
    {tramo:3,minimo:D('3947491.49'),maximo:D('5921237.23'),importe_fijo:D('276324.40'),porcentaje:D('12')},
    {tramo:4,minimo:D('5921237.23'),maximo:D('8881855.86'),importe_fijo:D('513173.89'),porcentaje:D('15')},
    {tramo:5,minimo:D('8881855.86'),maximo:D('17763711.72'),importe_fijo:D('957266.69'),porcentaje:D('19')},
    {tramo:6,minimo:D('17763711.72'),maximo:D('26645567.59'),importe_fijo:D('2644819.30'),porcentaje:D('23')},
    {tramo:7,minimo:D('26645567.59'),maximo:D('39968351.38'),importe_fijo:D('4687646.15'),porcentaje:D('27')},
    {tramo:8,minimo:D('39968351.38'),maximo:D('59952527.08'),importe_fijo:D('8284797.77'),porcentaje:D('31')},
    {tramo:9,minimo:D('59952527.08'),maximo:null,importe_fijo:D('14479892.24'),porcentaje:D('35')},
  ],
  12:[
    {tramo:1,minimo:D('0'),maximo:D('2168491.89'),importe_fijo:D('0'),porcentaje:D('5')},
    {tramo:2,minimo:D('2168491.89'),maximo:D('4336983.77'),importe_fijo:D('108424.59'),porcentaje:D('9')},
    {tramo:3,minimo:D('4336983.77'),maximo:D('6505475.65'),importe_fijo:D('303588.86'),porcentaje:D('12')},
    {tramo:4,minimo:D('6505475.65'),maximo:D('9758213.49'),importe_fijo:D('563807.89'),porcentaje:D('15')},
    {tramo:5,minimo:D('9758213.49'),maximo:D('19516426.99'),importe_fijo:D('1051718.57'),porcentaje:D('19')},
    {tramo:6,minimo:D('19516426.99'),maximo:D('29274640.48'),importe_fijo:D('2905779.13'),porcentaje:D('23')},
    {tramo:7,minimo:D('29274640.48'),maximo:D('43911960.73'),importe_fijo:D('5150168.23'),porcentaje:D('27')},
    {tramo:8,minimo:D('43911960.73'),maximo:D('65867941.10'),importe_fijo:D('9102244.70'),porcentaje:D('31')},
    {tramo:9,minimo:D('65867941.10'),maximo:null,importe_fijo:D('15908598.62'),porcentaje:D('35')},
  ],
};

export function obtenerEscalaArt94(periodo:number,mes:number):TramoEscala[]{
  if(periodo!==2026)throw new ErrorEscalaNoSoportada('No hay escala Art. 94 cargada para el periodo fiscal solicitado');
  if(mes>=1&&mes<=6)return ESCALA_ART94_2026_S1;
  if(mes>=7&&mes<=12)return ESCALA_ART94_2026_S2[mes];
  throw new ErrorEscalaNoSoportada('Mes de liquidacion fuera de rango para escala Art. 94');
}

export function versionEscalaArt94(periodo:number,mes:number):string{
  if(periodo===2026&&mes>=7&&mes<=12)return `ART94_2026_S2_PDF_JUL_DIC_MES_${String(mes).padStart(2,'0')}`;
  if(periodo===2026&&mes>=1&&mes<=6)return 'ART94_2026_S1_SPEC_REFERENCIA';
  return 'ART94_NO_CARGADA';
}

export class ErrorEscalaNoSoportada extends Error {}

@Injectable()
export class EscalaArt94Service {
  buscar(ganancia: Decimal, periodo: number, mes: number): TramoEscala {
    const escala=obtenerEscalaArt94(periodo,mes);
    const tramo=escala.find(t=>ganancia.gte(t.minimo)&&(t.maximo===null||ganancia.lt(t.maximo)));
    if(!tramo)throw new ErrorEscalaNoSoportada('La ganancia neta no pertenece a la escala documentada para este MVP');
    return tramo;
  }
  version(periodo:number,mes:number):string{return versionEscalaArt94(periodo,mes);}
  tramos(periodo:number,mes:number):TramoEscala[]{return obtenerEscalaArt94(periodo,mes);}
  calcular(ganancia:Decimal,tramo:TramoEscala):Decimal{return centavos(tramo.importe_fijo.plus(ganancia.minus(tramo.minimo).mul(tramo.porcentaje).div(100)));}
}
