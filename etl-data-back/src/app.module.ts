import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { ExportacoesModule } from './exportacoes/exportacoes.module.js';
import { ErrosModule } from './erros/erros.module.js';
import { AppController } from './helloWorld/controller/app.controller.js';
import { AppService } from './helloWorld/service/app.service.js';
import { RecebimentosModule } from './recebimentos/recebimentos.module.js';
import { RepassesModule } from './repasses/repasses.module.js';
import { RecebiveisModule } from './recebiveis/recebiveis.module.js';
import { TransacoesModule } from './transacoes/transacoes.module.js';

@Module({
  imports: [
    DatabaseModule,
    ErrosModule,
    TransacoesModule,
    RecebiveisModule,
    RecebimentosModule,
    RepassesModule,
    ExportacoesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
