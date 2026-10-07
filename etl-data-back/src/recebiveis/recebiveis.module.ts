import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrosModule } from '../erros/erros.module.js';
import { MaquininhasModule } from '../maquininhas/maquininhas.module.js';
import { Recebivel } from './repository/recebivel.model.js';
import { RecebiveisController } from './recebiveis.controller.js';
import { ImportarRecebiveisService } from './service/importar-recebiveis.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Recebivel]),
    ErrosModule,
    MaquininhasModule,
  ],
  controllers: [RecebiveisController],
  providers: [ImportarRecebiveisService],
})
export class RecebiveisModule {}
