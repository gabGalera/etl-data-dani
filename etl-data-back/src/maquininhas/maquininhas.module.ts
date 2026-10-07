import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Recebivel } from '../recebiveis/repository/recebivel.model.js';
import { Transacao } from '../transacoes/repository/transacao.model.js';
import { Maquininha } from './repository/maquininha.model.js';
import { RotearParcelaRecebivelService } from './service/rotear-parcela-recebivel.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Maquininha, Recebivel, Transacao]),
  ],
  providers: [RotearParcelaRecebivelService],
  exports: [RotearParcelaRecebivelService],
})
export class MaquininhasModule {}
