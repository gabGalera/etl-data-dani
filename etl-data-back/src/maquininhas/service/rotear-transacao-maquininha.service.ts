import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { Recebimento } from '../../recebimentos/repository/recebimento.model.js';
import { Transacao } from '../../transacoes/repository/transacao.model.js';
import type { TransacaoImportada } from '../../transacoes/service/parse-transacoes-csv.js';
import { Maquininha } from '../repository/maquininha.model.js';

export type ContagemTabela = {
  inseridas: number;
  atualizadas: number;
};

export type ResultadoRoteamentoTransacao = {
  transacoes: ContagemTabela;
  maquininhas: ContagemTabela;
};

const CAMPOS_ATUALIZAVEIS = [
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
] as const;

const VAZIO: ContagemTabela = { inseridas: 0, atualizadas: 0 };

type LinhaTransacao = TransacaoImportada & { updatedAt?: Date };

@Injectable()
export class RotearTransacaoMaquininhaService {
  constructor(
    @InjectModel(Recebimento)
    private readonly recebimento: typeof Recebimento,
    @InjectModel(Transacao)
    private readonly transacao: typeof Transacao,
    @InjectModel(Maquininha)
    private readonly maquininha: typeof Maquininha,
  ) {}

  async gravarImportacao(
    rows: TransacaoImportada[],
    transaction: Transaction,
  ): Promise<ResultadoRoteamentoTransacao> {
    if (rows.length === 0) {
      return { transacoes: VAZIO, maquininhas: VAZIO };
    }

    const comRecebimento = await this.idsComRecebimento(transaction);
    const paraTransacoes = rows.filter((row) =>
      this.temRecebimento(row.idTransAdquirente, comRecebimento),
    );
    const paraMaquininhas = rows.filter(
      (row) => !this.temRecebimento(row.idTransAdquirente, comRecebimento),
    );

    const transacoes = await this.gravarDestino(
      this.transacao,
      this.maquininha,
      paraTransacoes,
      transaction,
    );
    const maquininhas = await this.gravarDestino(
      this.maquininha,
      this.transacao,
      paraMaquininhas,
      transaction,
    );

    return { transacoes, maquininhas };
  }

  async reclassificarAposRecebimentos(
    transaction: Transaction,
  ): Promise<void> {
    const comRecebimento = await this.idsComRecebimento(transaction);

    const sairDeTransacoes = await this.transacao.findAll({
      where: this.semRecebimentoWhere(comRecebimento),
      transaction,
    });
    if (sairDeTransacoes.length > 0) {
      await this.moverParaMaquininhas(sairDeTransacoes, transaction);
    }

    if (comRecebimento.size === 0) {
      return;
    }

    const entrarEmTransacoes = await this.maquininha.findAll({
      where: {
        idTransAdquirente: { [Op.in]: [...comRecebimento] },
      },
      transaction,
    });
    if (entrarEmTransacoes.length > 0) {
      await this.moverParaTransacoes(entrarEmTransacoes, transaction);
    }
  }

  private temRecebimento(
    idTransAdquirente: string | null,
    comRecebimento: Set<string>,
  ): boolean {
    return (
      idTransAdquirente !== null && comRecebimento.has(idTransAdquirente)
    );
  }

  private semRecebimentoWhere(comRecebimento: Set<string>): WhereOptions {
    if (comRecebimento.size === 0) {
      return {};
    }
    return {
      [Op.or]: [
        { idTransAdquirente: null },
        { idTransAdquirente: { [Op.notIn]: [...comRecebimento] } },
      ],
    };
  }

  private async idsComRecebimento(
    transaction: Transaction,
  ): Promise<Set<string>> {
    const rows = await this.recebimento.findAll({
      attributes: ['idTransAdquirente'],
      transaction,
    });
    return new Set(rows.map((row) => row.idTransAdquirente));
  }

  private async gravarDestino(
    destino: typeof Transacao | typeof Maquininha,
    outro: typeof Transacao | typeof Maquininha,
    rows: TransacaoImportada[],
    transaction: Transaction,
  ): Promise<ContagemTabela> {
    if (rows.length === 0) {
      return VAZIO;
    }

    const ids = rows.map((row) => row.idTransacao);
    const existentes = await destino.findAll({
      attributes: ['idTransacao'],
      where: { idTransacao: ids },
      transaction,
    });
    const agora = new Date();
    await destino.bulkCreate(
      rows.map((row) => ({ ...row, updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_ATUALIZAVEIS],
        transaction,
      },
    );
    await outro.destroy({
      where: { idTransacao: ids },
      transaction,
    });

    return {
      inseridas: rows.length - existentes.length,
      atualizadas: existentes.length,
    };
  }

  private async moverParaTransacoes(
    linhas: Maquininha[],
    transaction: Transaction,
  ): Promise<void> {
    const agora = new Date();
    await this.transacao.bulkCreate(
      linhas.map((linha) => ({
        ...linhaTransacaoDe(linha),
        updatedAt: agora,
      })),
      {
        updateOnDuplicate: [...CAMPOS_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.maquininha.destroy({
      where: { idTransacao: linhas.map((linha) => linha.idTransacao) },
      transaction,
    });
  }

  private async moverParaMaquininhas(
    linhas: Transacao[],
    transaction: Transaction,
  ): Promise<void> {
    const agora = new Date();
    await this.maquininha.bulkCreate(
      linhas.map((linha) => ({
        ...linhaTransacaoDe(linha),
        updatedAt: agora,
      })),
      {
        updateOnDuplicate: [...CAMPOS_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.transacao.destroy({
      where: { idTransacao: linhas.map((linha) => linha.idTransacao) },
      transaction,
    });
  }
}

function linhaTransacaoDe(
  linha: Transacao | Maquininha,
): LinhaTransacao {
  return {
    idTransacao: linha.idTransacao,
    cliente: linha.cliente,
    data: linha.data,
    hora: linha.hora,
    adquirente: linha.adquirente,
    idTransAdquirente: linha.idTransAdquirente,
    status: linha.status,
    valorTransacao: linha.valorTransacao,
    tipo: linha.tipo,
    parcelas: linha.parcelas,
    bandeira: linha.bandeira,
    aut: linha.aut,
    cartao: linha.cartao,
    taxaPercentual: linha.taxaPercentual,
    taxaValor: linha.taxaValor,
    valorLiquido: linha.valorLiquido,
    totalReembolsado: linha.totalReembolsado,
  };
}
