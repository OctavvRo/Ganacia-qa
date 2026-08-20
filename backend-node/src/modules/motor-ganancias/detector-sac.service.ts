import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { D, numero } from '../../common/decimal/decimal.util';
import { LiquidacionNormalizada, MESES, Mes } from './dominio';

@Injectable()
export class DetectorSacService {
  detectar(liquidacion:LiquidacionNormalizada,tolerancia= D('0.05')):Record<string,unknown>{
    const umbral=tolerancia.mul(10), sac=liquidacion.acumuladores.sac;
    if(!sac)return{modalidad:'indeterminado',confianza:'baja',motivo:'No se encontro la fila SAC entre los acumuladores normalizados.',valores_sac:{},advertencias:['Falta la fila SAC; no es posible inferir su modalidad.']};
    const valores=Object.fromEntries(MESES.map(m=>[m,sac.valores[m]??D(0)])) as Record<Mes,Decimal>; let mes=liquidacion.metadata.mes_liquidacion;const advertencias:string[]=[];
    if(!mes||mes<1||mes>12){mes=12;advertencias.push('No se pudo determinar el mes de liquidacion; se analizaron los doce meses.');}
    if(MESES.slice(0,mes).every(m=>valores[m].abs().lte(umbral)))return this.resultado('percibido','alta','La fila SAC solo contiene valores nulos o residuos de redondeo en los meses transcurridos; no se observa provisionamiento mensual.',valores,advertencias);
    for(const [previas,anulacion,pago] of [[MESES.slice(0,5),'junio',6],[MESES.slice(6,11),'diciembre',12]] as [readonly Mes[],Mes,number][]){
      if(mes<pago)continue;const positivas=previas.map(m=>valores[m]).filter(v=>v.gt(umbral));const negativas=previas.map(m=>valores[m]).filter(v=>v.lt(umbral.neg()));const an=valores[anulacion];if(positivas.length<2||negativas.length||!an.lt(umbral.neg()))continue;const suma=positivas.reduce((a,b)=>a.plus(b),D(0));const margen=Decimal.max(tolerancia,suma.mul('0.01'));if(an.abs().minus(suma).abs().gt(margen))continue;return this.resultado('devengado',positivas.length>=3?'alta':'media',`Se observaron ${positivas.length} provisiones positivas antes de ${anulacion} por ${suma.toFixed(2)} y una anulacion negativa de ${an.abs().toFixed(2)}, compatible con SAC devengado.`,valores,advertencias);
    }
    const inicio=mes<=6?0:6, ciclo=MESES.slice(inicio,mes).map(m=>valores[m]);if(![6,12].includes(mes)&&ciclo.filter(v=>v.gt(umbral)).length>=2&&!ciclo.some(v=>v.lt(umbral.neg())))return this.resultado('devengado','media','Se observan provisiones positivas repetidas en el semestre actual, pero aun no esta disponible el mes de anulacion.',valores,advertencias);
    advertencias.push('La fila SAC contiene valores materiales que no forman un patron coherente de provision y anulacion.');return this.resultado('indeterminado','baja','Los valores de SAC son contradictorios o insuficientes para distinguir entre modalidad devengada y percibida.',valores,advertencias);
  }
  private resultado(modalidad:string,confianza:string,motivo:string,valores:Record<Mes,Decimal>,advertencias:string[]){return{modalidad,confianza,motivo,valores_sac:Object.fromEntries(Object.entries(valores).map(([k,v])=>[k,numero(v)])),advertencias};}
}
