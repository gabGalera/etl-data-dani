import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrosModule } from '../erros/erros.module.js';
import { ImportarTransacoesService } from './importar-transacoes.service.js';
import { Transacao } from './transacao.model.js';
import { TransacoesController } from './transacoes.controller.js';

@Module({
  imports: [SequelizeModule.forFeature([Transacao]), ErrosModule],
  controllers: [TransacoesController],
  providers: [ImportarTransacoesService],
})
export class TransacoesModule {}
