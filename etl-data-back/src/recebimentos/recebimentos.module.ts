import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrosModule } from '../erros/erros.module.js';
import { RecebimentosController } from './recebimentos.controller.js';
import { Recebimento } from './repository/recebimento.model.js';
import { ImportarRecebimentosService } from './service/importar-recebimentos.service.js';

@Module({
  imports: [SequelizeModule.forFeature([Recebimento]), ErrosModule],
  controllers: [RecebimentosController],
  providers: [ImportarRecebimentosService],
})
export class RecebimentosModule {}
