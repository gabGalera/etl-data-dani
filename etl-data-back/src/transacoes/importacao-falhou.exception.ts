import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErroRegistrado } from '../erros/erros.service.js';

export type ArquivoImportado = {
  arquivo: string;
  inseridas: number;
  atualizadas: number;
  ignoradas: number;
};

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
