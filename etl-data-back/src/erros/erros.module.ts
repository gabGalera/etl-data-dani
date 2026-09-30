import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Erro } from './erro.model.js';
import { ErrosService } from './erros.service.js';

@Module({
  imports: [SequelizeModule.forFeature([Erro])],
  providers: [ErrosService],
  exports: [ErrosService],
})
export class ErrosModule {}
