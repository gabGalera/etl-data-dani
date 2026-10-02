import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type {
  ImportacaoResultado,
  ImportarRecebiveisDto,
} from './dto/importar-recebiveis.dto.js';
import { ImportarRecebiveisService } from './service/importar-recebiveis.service.js';

@Controller('recebiveis')
export class RecebiveisController {
  constructor(private readonly importarRecebiveis: ImportarRecebiveisService) {}

  @Post('importar')
  @HttpCode(200)
  importar(@Body() body: ImportarRecebiveisDto): Promise<ImportacaoResultado> {
    return this.importarRecebiveis.executar(body);
  }
}
