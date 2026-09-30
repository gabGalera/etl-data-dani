import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type {
  ImportacaoResultado,
  ImportarTransacoesDto,
} from './dto/importar-transacoes.dto.js';
import { ImportarTransacoesService } from './importar-transacoes.service.js';

@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly importarTransacoes: ImportarTransacoesService) {}

  @Post('importar')
  @HttpCode(200)
  importar(@Body() body: ImportarTransacoesDto): Promise<ImportacaoResultado> {
    return this.importarTransacoes.executar(body);
  }
}
