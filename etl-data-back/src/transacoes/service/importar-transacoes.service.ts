import { access, readdir, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { ErroRegistrado } from '../../erros/dto/erro-registrado.dto.js';
import { ErrosService } from '../../erros/erros.service.js';
import type {
  ArquivoImportado,
  ImportacaoResultado,
} from '../dto/importar-transacoes.dto.js';
import { Transacao } from '../repository/transacao.model.js';
import { ImportacaoFalhouException } from './importacao-falhou.exception.js';
import {
  LinhaInvalida,
  parseTransacoesCsv,
  type LinhaRejeitada,
  type TransacaoImportada,
} from './parse-transacoes-csv.js';

const PREFIXO = 'transacoes_';
const PATH_INVALIDO = 'path deve ser um diretorio';

const UPDATE_ON_DUPLICATE: (keyof Transacao)[] = [
  'cliente',
  'data',
  'hora',
  'adquirente',
  'idTransAdquirente',
  'status',
  'valorTransacao',
  'tipo',
  'parcelas',
  'bandeira',
  'aut',
  'cartao',
  'taxaPercentual',
  'taxaValor',
  'valorLiquido',
  'totalReembolsado',
  'updatedAt',
];

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
    @InjectModel(Transacao)
    private readonly transacao: typeof Transacao,
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
      let atualizadas = 0;
      if (rows.length > 0) {
        const ids = rows.map((row) => row.idTransacao);
        const existentes = await this.transacao.findAll({
          attributes: ['idTransacao'],
          where: { idTransacao: ids },
          transaction,
        });
        atualizadas = existentes.length;
        const agora = new Date();
        await this.transacao.bulkCreate(
          rows.map((row) => ({ ...row, updatedAt: agora })),
          {
            updateOnDuplicate: UPDATE_ON_DUPLICATE,
            transaction,
          },
        );
      }

      return {
        arquivo,
        inseridas: rows.length - atualizadas,
        atualizadas,
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
