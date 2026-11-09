import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type {
  ExportacaoJoinResultado,
  ExportarJoinRecebimentosDto,
} from './dto/exportar-join-recebimentos.dto.js';
import { ExportarJoinRecebimentosService } from './service/exportar-join-recebimentos.service.js';

@Controller('exportacoes')
export class ExportacoesController {
  constructor(private readonly joinRecebimentos: ExportarJoinRecebimentosService) {}

  @Post('join-recebimentos')
  @HttpCode(200)
  exportarJoinRecebimentos(
    @Body() body: ExportarJoinRecebimentosDto,
  ): Promise<ExportacaoJoinResultado> {
    return this.joinRecebimentos.executar(body);
  }
}
