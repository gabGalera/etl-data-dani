import { access, readdir, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import type { ErroRegistrado } from '../../erros/dto/erro-registrado.dto.js';
import { ErrosService } from '../../erros/erros.service.js';
import { RotearRecebimentoMaquininhaService } from '../../maquininhas/service/rotear-recebimento-maquininha.service.js';
import type {
  ArquivoImportado,
  ImportacaoResultado,
} from '../dto/importar-transacoes.dto.js';
import { ImportacaoFalhouException } from './importacao-falhou.exception.js';
import {
  LinhaInvalida,
  parseTransacoesCsv,
  type LinhaRejeitada,
  type TransacaoImportada,
} from './parse-transacoes-csv.js';

const PREFIXO = 'transacoes_';
const PATH_INVALIDO = 'path deve ser um diretorio';

class FalhaDeArquivo extends Error {
  constructor(
    readonly linha: number | null,
    readonly mensagem: string,
  ) {
    super(mensagem);
  }
}

@Injectable()
export class ImportarTransacoesService {
  constructor(
    private readonly rotear: RotearRecebimentoMaquininhaService,
    private readonly errosService: ErrosService,
    private readonly sequelize: Sequelize,
  ) {}

  async executar(body: unknown): Promise<ImportacaoResultado> {
    const pasta = await this.pastaDoPedido(body);
    const arquivosEncontrados = await this.listar(pasta);
    const arquivos: ArquivoImportado[] = [];
    const erros: ErroRegistrado[] = [];

    for (const arquivo of arquivosEncontrados) {
      try {
        const lido = await this.importarArquivo(arquivo);
        arquivos.push(lido.importado);
        for (const rejeitada of lido.rejeitadas) {
          erros.push(
            await this.errosService.registrar(
              arquivo,
              rejeitada.linha,
              rejeitada.mensagem,
            ),
          );
        }
      } catch (error) {
        if (!(error instanceof FalhaDeArquivo)) {
          throw error;
        }
        erros.push(
          await this.errosService.registrar(
            arquivo,
            error.linha,
            error.mensagem,
          ),
        );
      }
    }

    if (erros.length > 0) {
      throw new ImportacaoFalhouException(arquivos, erros);
    }

    return {
      arquivos,
      inseridas: somar(arquivos, 'inseridas'),
      atualizadas: somar(arquivos, 'atualizadas'),
      ignoradas: somar(arquivos, 'ignoradas'),
    };
  }

  private async pastaDoPedido(body: unknown): Promise<string> {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException(PATH_INVALIDO);
    }
    const pedido = body as { path?: unknown };
    if (typeof pedido.path !== 'string' || pedido.path.trim() === '') {
      throw new BadRequestException(PATH_INVALIDO);
    }

    const pasta = path.resolve(pedido.path);
    try {
      const info = await stat(pasta);
      if (!info.isDirectory()) {
        throw new BadRequestException(PATH_INVALIDO);
      }
      await access(pasta, constants.R_OK);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(PATH_INVALIDO);
    }

    return pasta;
  }

  private async listar(pasta: string): Promise<string[]> {
    const entradas = await readdir(pasta, { withFileTypes: true }).catch(() => {
      throw new BadRequestException(PATH_INVALIDO);
    });
    return entradas
      .filter((entrada) => entrada.isFile() && entrada.name.startsWith(PREFIXO))
      .map((entrada) => path.join(pasta, entrada.name))
      .sort((left, right) =>
        path.basename(left).localeCompare(path.basename(right)),
      );
  }

  private async importarArquivo(arquivo: string): Promise<{
    importado: ArquivoImportado;
    rejeitadas: LinhaRejeitada[];
  }> {
    const text = await this.ler(arquivo);
    let parsed: ReturnType<typeof parseTransacoesCsv>;
    try {
      parsed = parseTransacoesCsv(text);
    } catch (error) {
      if (error instanceof LinhaInvalida) {
        throw new FalhaDeArquivo(error.linha, error.mensagem);
      }
      throw error;
    }

    try {
      return {
        importado: await this.gravar(arquivo, parsed.rows, parsed.ignoradas),
        rejeitadas: parsed.rejeitadas,
      };
    } catch (error) {
      if (error instanceof FalhaDeArquivo) {
        throw error;
      }
      throw new FalhaDeArquivo(null, 'Falha ao gravar');
    }
  }

  private async ler(arquivo: string): Promise<string> {
    try {
      const buffer = await readFile(arquivo);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return text;
    } catch {
      throw new FalhaDeArquivo(null, 'Arquivo ilegivel');
    }
  }

  private async gravar(
    arquivo: string,
    rows: TransacaoImportada[],
    ignoradas: number,
  ): Promise<ArquivoImportado> {
    return this.sequelize.transaction(async (transaction) => {
      const gravado = await this.rotear.gravarTransacoesImportadas(
        rows,
        transaction,
      );
      return {
        arquivo,
        inseridas: gravado.inseridas,
        atualizadas: gravado.atualizadas,
        ignoradas,
      };
    });
  }
}

function somar(
  arquivos: ArquivoImportado[],
  campo: 'inseridas' | 'atualizadas' | 'ignoradas',
): number {
  return arquivos.reduce((total, arquivo) => total + arquivo[campo], 0);
}
