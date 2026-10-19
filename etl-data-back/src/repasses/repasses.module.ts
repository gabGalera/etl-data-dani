import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrosModule } from '../erros/erros.module.js';
import { Repasse } from './repository/repasse.model.js';
import { RepassesController } from './repasses.controller.js';
import { ImportarRepassesService } from './service/importar-repasses.service.js';

@Module({
  imports: [SequelizeModule.forFeature([Repasse]), ErrosModule],
  controllers: [RepassesController],
  providers: [ImportarRepassesService],
})
export class RepassesModule {}
