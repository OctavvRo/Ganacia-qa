import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AnalisisService } from './analisis.service';
import { ListarAnalisisDto } from './dto/listar-analisis.dto';

@Controller('analisis')
@UseGuards(AuthGuard)
export class AnalisisController{
 constructor(private service:AnalisisService){}
 @Post('excel')@UseInterceptors(FileInterceptor('archivo',{limits:{fileSize:Number(process.env.MAX_UPLOAD_MB??20)*1024*1024}}))
 analizar(@UploadedFile()archivo:Express.Multer.File,@Body('contexto_complementario')contexto?:string){if(!archivo)throw new BadRequestException('Debe adjuntar un archivo XLSX');let parsed:any;try{parsed=contexto?JSON.parse(contexto):undefined;}catch{throw new BadRequestException('contexto_complementario debe ser JSON valido');}return this.service.analizar(archivo.buffer,archivo.originalname,archivo.mimetype,parsed);}
 @Get()listar(@Query()query:ListarAnalisisDto){return this.service.listar(query);}
 @Get(':id/json')@Header('Content-Type','application/json; charset=utf-8')async descargar(@Param('id')id:string,@Res()res:Response){const r=await this.service.obtener(id);res.setHeader('Content-Disposition',`attachment; filename="analisis-${id}.json"`);res.send(JSON.stringify(r,null,2));}
 @Get(':id')obtener(@Param('id')id:string){return this.service.obtener(id);}
 @Post(':id/explicacion-ia')explicar(@Param('id')id:string){return this.service.explicar(id);}
 @Post(':id/contexto-complementario')actualizar(@Param('id')id:string,@Body()body:any){return this.service.actualizarContexto(id,body);}
 @Delete(':id')eliminar(@Param('id')id:string){return this.service.eliminar(id);}
}
