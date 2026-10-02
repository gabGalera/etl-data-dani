import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import type { ErroRegistrado } from '../../erros/dto/erro-registrado.dto.js';
import { ErrosService } from '../../erros/erros.service.js';
import type {
  ArquivoImportado,
  ImportacaoResultado,
} from '../dto/importar-recebimentos.dto.js';
import { Recebimento } from '../repository/recebimento.model.js';
import { ImportacaoFalhouException } from './importacao-falhou.exception.js';
import {
  LinhaInvalida,
  parseRecebimentosXlsx,
  XlsxIlegivel,
  type RecebimentoImportado,
} from './parse-recebimentos-xlsx.js';

const NOME = 'Recebimentos_MP.xlsx';
const PATH_INVALIDO = 'path deve ser um diretorio';

const UPDATE_ON_DUPLICATE: (keyof Recebimento)[] = [
  'idTransAdquirente',
  'dataRecibo',
  'confirmacao',
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
export class ImportarRecebimentosService {
  constructor(
    @InjectModel(Recebimento)
    private readonly recebimento: typeof Recebimento,
    private readonly errosService: ErrosService,
    private readonly sequelize: Sequelize,
  ) {}

  async executar(body: unknown): Promise<ImportacaoResultado> {
    const pasta = await this.pastaDoPedido(body);
    const arquivo = path.join(pasta, NOME);
    const arquivos: ArquivoImportado[] = [];
    const erros: ErroRegistrado[] = [];

    if (!(await this.eArquivoRegular(arquivo))) {
      erros.push(
        await this.errosService.registrar(arquivo, null, 'Arquivo ausente'),
      );
      throw new ImportacaoFalhouException(arquivos, erros);
    }

    try {
      arquivos.push(await this.importarArquivo(arquivo));
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

    if (erros.length > 0) {
      throw new ImportacaoFalhouException(arquivos, erros);
    }

    return {
      arquivos,
      inseridas: somar(arquivos, 'inseridas'),
      atualizadas: somar(arquivos, 'atualizadas'),
      deletadas: somar(arquivos, 'deletadas'),
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

  private async eArquivoRegular(arquivo: string): Promise<boolean> {
    try {
      const info = await stat(arquivo);
      return info.isFile();
    } catch {
      return false;
    }
  }

  private async importarArquivo(arquivo: string): Promise<ArquivoImportado> {
    const buffer = await this.ler(arquivo);
    let rows: RecebimentoImportado[];
    try {
      rows = await parseRecebimentosXlsx(buffer);
    } catch (error) {
      if (error instanceof LinhaInvalida) {
        throw new FalhaDeArquivo(error.linha, error.mensagem);
      }
      if (error instanceof XlsxIlegivel) {
        throw new FalhaDeArquivo(null, 'Arquivo ilegivel');
      }
      throw error;
    }

    try {
      return await this.gravar(arquivo, rows);
    } catch (error) {
      if (error instanceof FalhaDeArquivo) {
        throw error;
      }
      throw new FalhaDeArquivo(null, 'Falha ao gravar');
    }
  }

  private async ler(arquivo: string): Promise<Uint8Array> {
    try {
      return await readFile(arquivo);
    } catch {
      throw new FalhaDeArquivo(null, 'Arquivo ilegivel');
    }
  }

  private async gravar(
    arquivo: string,
    rows: RecebimentoImportado[],
  ): Promise<ArquivoImportado> {
    return this.sequelize.transaction(async (transaction) => {
      const linhas = rows.map((row) => row.linha);
      const existentes = await this.recebimento.findAll({
        attributes: ['linha'],
        where: { linha: linhas },
        transaction,
      });
      const deletadas = await this.recebimento.destroy({
        where: { linha: { [Op.notIn]: linhas } },
        transaction,
      });
      const agora = new Date();
      await this.recebimento.bulkCreate(
        rows.map((row) => ({ ...row, updatedAt: agora })),
        {
          updateOnDuplicate: UPDATE_ON_DUPLICATE,
          transaction,
        },
      );

      return {
        arquivo,
        inseridas: rows.length - existentes.length,
        atualizadas: existentes.length,
        deletadas,
        ignoradas: 0,
      };
    });
  }
}

function somar(
  arquivos: ArquivoImportado[],
  campo: 'inseridas' | 'atualizadas' | 'deletadas' | 'ignoradas',
): number {
  return arquivos.reduce((total, arquivo) => total + arquivo[campo], 0);
}
