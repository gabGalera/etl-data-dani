import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrosModule } from '../erros/erros.module.js';
import { MaquininhasModule } from '../maquininhas/maquininhas.module.js';
import { ImportarTransacoesService } from './service/importar-transacoes.service.js';
import { Transacao } from './repository/transacao.model.js';
import { TransacoesController } from './transacoes.controller.js';

@Module({
  imports: [
    SequelizeModule.forFeature([Transacao]),
    ErrosModule,
    MaquininhasModule,
  ],
  controllers: [TransacoesController],
  providers: [ImportarTransacoesService],
})
export class TransacoesModule {}
