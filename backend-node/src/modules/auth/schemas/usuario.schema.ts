import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UsuarioDocument = HydratedDocument<Usuario>;

/**
 * Usuario simple del sistema.
 *
 * La contrasena real nunca se guarda. Solo se persiste password_hash.
 */
@Schema({ timestamps: true, collection: 'usuarios' })
export class Usuario {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true })
  password_hash: string;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
