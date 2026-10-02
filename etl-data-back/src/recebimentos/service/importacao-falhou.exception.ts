import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErroRegistrado } from '../../erros/dto/erro-registrado.dto.js';
import type { ArquivoImportado } from '../dto/importar-recebimentos.dto.js';

export class ImportacaoFalhouException extends HttpException {
  constructor(arquivos: ArquivoImportado[], erros: ErroRegistrado[]) {
    super(
      {
        message: 'Falha ao importar recebimentos',
        arquivos,
        erros,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
