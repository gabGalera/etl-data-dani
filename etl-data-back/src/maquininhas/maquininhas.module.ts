import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Recebimento } from '../recebimentos/repository/recebimento.model.js';
import { Transacao } from '../transacoes/repository/transacao.model.js';
import { Maquininha } from './repository/maquininha.model.js';
import { RotearRecebimentoMaquininhaService } from './service/rotear-recebimento-maquininha.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Maquininha, Recebimento, Transacao]),
  ],
  providers: [RotearRecebimentoMaquininhaService],
  exports: [RotearRecebimentoMaquininhaService],
})
export class MaquininhasModule {}
