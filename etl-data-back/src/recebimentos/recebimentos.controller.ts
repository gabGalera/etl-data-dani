import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type {
  ImportacaoResultado,
  ImportarRecebimentosDto,
} from './dto/importar-recebimentos.dto.js';
import { ImportarRecebimentosService } from './service/importar-recebimentos.service.js';

@Controller('recebimentos')
export class RecebimentosController {
  constructor(
    private readonly importarRecebimentos: ImportarRecebimentosService,
  ) {}

  @Post('importar')
  @HttpCode(200)
  importar(
    @Body() body: ImportarRecebimentosDto,
  ): Promise<ImportacaoResultado> {
    return this.importarRecebimentos.executar(body);
  }
}
