import { constants, createWriteStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline, Transform } from 'node:stream';
import { promisify } from 'node:util';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Connection } from 'mysql2';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import type {
  ExportacaoJoinResultado,
  ExportarJoinRecebimentosDto,
} from '../dto/exportar-join-recebimentos.dto.js';
import {
  formatCsvDataLine,
  formatCsvHeaderLine,
} from './csv-row.js';
import {
  COUNT_RECEBIMENTOS_SQL,
  JOIN_RECEBIMENTOS_COLUMNS,
  JOIN_RECEBIMENTOS_HEADERS,
  JOIN_RECEBIMENTOS_SQL,
  JOIN_RECEBIMENTOS_STREAM_HIGH_WATER_MARK,
} from './join-recebimentos.query.js';

const pipelineAsync = promisify(pipeline);

const PATH_INVALIDO = 'path deve ser um diretorio';
const NOME_INVALIDO = 'nome deve ser um nome de arquivo';

@Injectable()
export class ExportarJoinRecebimentosService {
  private readonly logger = new Logger(ExportarJoinRecebimentosService.name);

  constructor(private readonly sequelize: Sequelize) {}

  async executar(body: unknown): Promise<ExportacaoJoinResultado> {
    const pasta = await this.pastaDoPedido(body);
    const nome = this.nomeDoPedido(body);
    const arquivo = this.arquivoDeSaida(pasta, nome);
    const totalRecebimentos = await this.contarRecebimentos();
    const linhas = await this.exportarParaArquivo(arquivo);
    return { arquivo, linhas, totalRecebimentos };
  }

  private async contarRecebimentos(): Promise<number> {
    const row = await this.sequelize.query<{ total: string }>(
      COUNT_RECEBIMENTOS_SQL,
      { type: QueryTypes.SELECT, plain: true },
    );
    return Number(row?.total ?? 0);
  }

  private async exportarParaArquivo(arquivo: string): Promise<number> {
    const pooled = await this.sequelize.connectionManager.getConnection({
      type: 'read',
    });
    const connection = pooled as unknown as Connection;

    let linhas = 0;

    try {
      const queryStream = connection
        .query({
          sql: JOIN_RECEBIMENTOS_SQL,
          rowsAsArray: false,
        })
        .stream({
          highWaterMark: JOIN_RECEBIMENTOS_STREAM_HIGH_WATER_MARK,
        });

      const writeStream = createWriteStream(arquivo, { encoding: 'utf8' });
      writeStream.write(`${formatCsvHeaderLine(JOIN_RECEBIMENTOS_HEADERS)}\n`);

      const csvTransform = new Transform({
        objectMode: true,
        transform: (row: Record<string, unknown>, _encoding, callback) => {
          linhas += 1;
          callback(
            null,
            `${formatCsvDataLine(row, JOIN_RECEBIMENTOS_COLUMNS)}\n`,
          );
        },
      });

      await pipelineAsync(queryStream, csvTransform, writeStream);
      return linhas;
    } catch (error) {
      this.logger.error(`Falha ao exportar join para ${arquivo}`, error);
      throw error;
    } finally {
      await this.sequelize.connectionManager.releaseConnection(pooled);
    }
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
      await access(pasta, constants.R_OK | constants.W_OK);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(PATH_INVALIDO);
    }

    return pasta;
  }

  private nomeDoPedido(body: unknown): string {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException(NOME_INVALIDO);
    }
    const pedido = body as { nome?: unknown };
    if (typeof pedido.nome !== 'string' || pedido.nome.trim() === '') {
      throw new BadRequestException(NOME_INVALIDO);
    }
    const nome = pedido.nome.trim();
    if (nome !== path.basename(nome) || nome.includes('..')) {
      throw new BadRequestException(NOME_INVALIDO);
    }
    return nome;
  }

  private arquivoDeSaida(pasta: string, nome: string): string {
    const ext = path.extname(nome);
    const stem = path.basename(nome, ext);
    const sufixo = formatTimestamp(new Date());
    const arquivo = `${stem}_${sufixo}${ext || '.csv'}`;
    return path.join(pasta, arquivo);
  }
}

export { formatTimestamp };

function formatTimestamp(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join('');
}
