import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type {
  ImportacaoResultado,
  ImportarRepassesDto,
} from './dto/importar-repasses.dto.js';
import { ImportarRepassesService } from './service/importar-repasses.service.js';

@Controller('repasses')
export class RepassesController {
  constructor(private readonly importarRepasses: ImportarRepassesService) {}

  @Post('importar')
  @HttpCode(200)
  importar(@Body() body: ImportarRepassesDto): Promise<ImportacaoResultado> {
    return this.importarRepasses.executar(body);
  }
}
