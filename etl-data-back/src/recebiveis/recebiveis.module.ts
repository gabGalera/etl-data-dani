import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Recebivel } from './recebivel.model.js';

@Module({
  imports: [SequelizeModule.forFeature([Recebivel])],
})
export class RecebiveisModule {}
