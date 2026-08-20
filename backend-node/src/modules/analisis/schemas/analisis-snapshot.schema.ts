import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ collection:'analisis_snapshots', timestamps:true, strict:true })
export class AnalisisSnapshot{
 @Prop({required:true,index:true}) origen:string; @Prop({required:true}) tipo_analisis:string;
 @Prop({index:true}) cliente:string; @Prop({index:true}) legajo:string; @Prop({index:true}) periodo:string;
 @Prop({required:true}) archivo_origen:string; @Prop({required:true,index:true}) hash_archivo:string;
 @Prop({required:true,type:Date,index:true}) fecha_analisis:Date; @Prop() motor_version:string; @Prop() escala_version:string;
 @Prop() modalidad_sac:string; @Prop() modo_saldo_favor:string; @Prop({index:true}) estado:string; @Prop({index:true}) veredicto:string;
 @Prop({type:MongooseSchema.Types.Mixed}) resumen:Record<string,unknown>; @Prop({type:MongooseSchema.Types.Mixed}) calculo:Record<string,unknown>;
 @Prop({type:MongooseSchema.Types.Mixed}) composicion_ingresos:Record<string,unknown>; @Prop({type:MongooseSchema.Types.Mixed}) contexto_normativo:Record<string,unknown>;
 @Prop({type:MongooseSchema.Types.Mixed}) cobertura_reporte:Record<string,unknown>; @Prop({type:MongooseSchema.Types.Mixed}) contexto_complementario:Record<string,unknown>;
 @Prop({type:[MongooseSchema.Types.Mixed]}) detalle_mensual:unknown[]; @Prop({type:[MongooseSchema.Types.Mixed]}) validaciones:unknown[];
 @Prop({type:[String]}) advertencias:string[]; @Prop({type:[String]}) faltantes:string[];
 @Prop({required:true,type:MongooseSchema.Types.Mixed}) snapshot_original:Record<string,unknown>;
  @Prop({default:false,index:true}) eliminado?:boolean;
  @Prop({type:Date}) eliminado_en?:Date;
  @Prop() eliminado_por?:string;
}
export type AnalisisSnapshotDocument=HydratedDocument<AnalisisSnapshot>;
export const AnalisisSnapshotSchema=SchemaFactory.createForClass(AnalisisSnapshot);
AnalisisSnapshotSchema.pre(['updateOne','findOneAndUpdate','replaceOne'],function(){throw new Error('Los snapshots de analisis son inmutables');});
AnalisisSnapshotSchema.index({cliente:1,legajo:1,periodo:1,fecha_analisis:-1});
