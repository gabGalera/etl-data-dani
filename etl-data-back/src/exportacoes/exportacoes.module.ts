import { Module } from '@nestjs/common';
import { ExportacoesController } from './exportacoes.controller.js';
import { ExportarJoinRecebimentosService } from './service/exportar-join-recebimentos.service.js';

@Module({
  controllers: [ExportacoesController],
  providers: [ExportarJoinRecebimentosService],
})
export class ExportacoesModule {}
