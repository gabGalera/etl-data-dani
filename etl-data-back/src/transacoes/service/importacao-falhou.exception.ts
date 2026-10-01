import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErroRegistrado } from '../../erros/dto/erro-registrado.dto.js';
import type { ArquivoImportado } from '../dto/importar-transacoes.dto.js';

export class ImportacaoFalhouException extends HttpException {
  constructor(arquivos: ArquivoImportado[], erros: ErroRegistrado[]) {
    super(
      {
        message: 'Falha ao importar transacoes',
        arquivos,
        erros,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
