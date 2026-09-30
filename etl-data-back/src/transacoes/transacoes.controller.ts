import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ImportarTransacoesService,
  type ImportacaoResultado,
} from './importar-transacoes.service.js';

@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly importarTransacoes: ImportarTransacoesService) {}

  @Post('importar')
  @HttpCode(200)
  importar(@Body() body: unknown): Promise<ImportacaoResultado> {
    return this.importarTransacoes.executar(body);
  }
}
