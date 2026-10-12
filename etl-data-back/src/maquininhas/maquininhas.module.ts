import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Recebimento } from '../recebimentos/repository/recebimento.model.js';
import { Transacao } from '../transacoes/repository/transacao.model.js';
import { Maquininha } from './repository/maquininha.model.js';
import { RotearTransacaoMaquininhaService } from './service/rotear-transacao-maquininha.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Maquininha, Transacao, Recebimento]),
  ],
  providers: [RotearTransacaoMaquininhaService],
  exports: [RotearTransacaoMaquininhaService],
})
export class MaquininhasModule {}
