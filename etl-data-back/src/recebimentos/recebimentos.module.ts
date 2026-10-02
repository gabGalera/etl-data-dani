import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Recebimento } from './repository/recebimento.model.js';

@Module({
  imports: [SequelizeModule.forFeature([Recebimento])],
})
export class RecebimentosModule {}
