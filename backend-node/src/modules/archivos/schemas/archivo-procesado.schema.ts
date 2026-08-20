import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
@Schema({collection:'archivos_procesados',timestamps:true}) export class ArchivoProcesado{@Prop({required:true})nombre:string;@Prop({required:true,index:true})hash:string;@Prop({required:true})tamano:number;@Prop({required:true})mime:string;@Prop({type:MongooseSchema.Types.ObjectId,ref:'AnalisisSnapshot'})analisis_id:unknown;}
export type ArchivoProcesadoDocument=HydratedDocument<ArchivoProcesado>;export const ArchivoProcesadoSchema=SchemaFactory.createForClass(ArchivoProcesado);
