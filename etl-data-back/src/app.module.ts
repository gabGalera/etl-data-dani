import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { AppController } from './helloWorld/controller/app.controller.js';
import { AppService } from './helloWorld/service/app.service.js';
import { TransacoesModule } from './transacoes/transacoes.module.js';

@Module({
  imports: [DatabaseModule, TransacoesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
