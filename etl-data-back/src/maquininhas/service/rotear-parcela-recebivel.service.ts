import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { Maquininha } from '../repository/maquininha.model.js';
import { Recebivel } from '../../recebiveis/repository/recebivel.model.js';
import { Transacao } from '../../transacoes/repository/transacao.model.js';

export type ParcelaGravada = {
  idTransacao: number;
  parcelaRecebivel: number;
  cliente: string;
  adquirente: string;
  idTransAdquirente: string;
  tipo: string;
  dataTransacao: string;
  valorTransacao: string;
  totalParcelas: number;
  taxaPercentual: string | null;
  taxaValor: string | null;
  valorRepasse: string;
  dataRepasse: string;
};

export type ContagemTabela = {
  inseridas: number;
  atualizadas: number;
};

export type ResultadoRoteamento = {
  recebiveis: ContagemTabela;
  maquininhas: ContagemTabela;
};

const CAMPOS_ATUALIZAVEIS = [
  'cliente',
  'adquirente',
  'idTransAdquirente',
  'tipo',
  'dataTransacao',
  'valorTransacao',
  'totalParcelas',
  'taxaPercentual',
  'taxaValor',
  'valorRepasse',
  'dataRepasse',
  'updatedAt',
] as const;

const VAZIO: ContagemTabela = { inseridas: 0, atualizadas: 0 };

type ModeloParcela = {
  findAll(options: {
    attributes: string[];
    where: WhereOptions;
    transaction: Transaction;
  }): Promise<Array<{ idTransacao: number; parcelaRecebivel: number }>>;
  bulkCreate(
    records: object[],
    options: {
      updateOnDuplicate: string[];
      transaction: Transaction;
    },
  ): Promise<unknown>;
  destroy(options: {
    where: WhereOptions;
    transaction: Transaction;
  }): Promise<unknown>;
};

@Injectable()
export class RotearParcelaRecebivelService {
  constructor(
    @InjectModel(Transacao)
    private readonly transacao: typeof Transacao,
    @InjectModel(Recebivel)
    private readonly recebivel: typeof Recebivel,
    @InjectModel(Maquininha)
    private readonly maquininha: typeof Maquininha,
  ) {}

  async gravar(
    rows: ParcelaGravada[],
    transaction: Transaction,
  ): Promise<ResultadoRoteamento> {
    if (rows.length === 0) {
      return { recebiveis: VAZIO, maquininhas: VAZIO };
    }

    const ids = [...new Set(rows.map((row) => row.idTransacao))];
    const encontradas = await this.transacao.findAll({
      attributes: ['idTransacao'],
      where: { idTransacao: ids },
      transaction,
    });
    const comTransacao = new Set(
      encontradas.map((row) => row.idTransacao),
    );
    const paraRecebiveis = rows.filter((row) =>
      comTransacao.has(row.idTransacao),
    );
    const paraMaquininhas = rows.filter(
      (row) => !comTransacao.has(row.idTransacao),
    );

    const recebiveis = await this.upsert(
      comoModelo(this.recebivel),
      paraRecebiveis,
      transaction,
    );
    await this.apagar(comoModelo(this.maquininha), paraRecebiveis, transaction);
    const maquininhas = await this.upsert(
      comoModelo(this.maquininha),
      paraMaquininhas,
      transaction,
    );
    await this.apagar(comoModelo(this.recebivel), paraMaquininhas, transaction);

    return { recebiveis, maquininhas };
  }

  async moverParaRecebiveis(
    idsTransacao: number[],
    transaction: Transaction,
  ): Promise<void> {
    const ids = [...new Set(idsTransacao)];
    if (ids.length === 0) {
      return;
    }

    const linhas = await this.maquininha.findAll({
      where: { idTransacao: ids },
      transaction,
    });
    if (linhas.length === 0) {
      return;
    }

    const agora = new Date();
    await this.recebivel.bulkCreate(
      linhas.map((linha) => ({ ...parcelaDe(linha), updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.maquininha.destroy({
      where: { idTransacao: ids },
      transaction,
    });
  }

  private async upsert(
    model: ModeloParcela,
    rows: ParcelaGravada[],
    transaction: Transaction,
  ): Promise<ContagemTabela> {
    if (rows.length === 0) {
      return VAZIO;
    }

    const existentes = await model.findAll({
      attributes: ['idTransacao', 'parcelaRecebivel'],
      where: { [Op.or]: chaves(rows) },
      transaction,
    });
    const agora = new Date();
    await model.bulkCreate(
      rows.map((row) => ({ ...row, updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_ATUALIZAVEIS],
        transaction,
      },
    );
    return {
      inseridas: rows.length - existentes.length,
      atualizadas: existentes.length,
    };
  }

  private async apagar(
    model: ModeloParcela,
    rows: ParcelaGravada[],
    transaction: Transaction,
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    await model.destroy({
      where: { [Op.or]: chaves(rows) },
      transaction,
    });
  }
}

function parcelaDe(linha: Maquininha): ParcelaGravada {
  return {
    idTransacao: linha.idTransacao,
    parcelaRecebivel: linha.parcelaRecebivel,
    cliente: linha.cliente,
    adquirente: linha.adquirente,
    idTransAdquirente: linha.idTransAdquirente,
    tipo: linha.tipo,
    dataTransacao: linha.dataTransacao,
    valorTransacao: linha.valorTransacao,
    totalParcelas: linha.totalParcelas,
    taxaPercentual: linha.taxaPercentual,
    taxaValor: linha.taxaValor,
    valorRepasse: linha.valorRepasse,
    dataRepasse: linha.dataRepasse,
  };
}

function comoModelo(
  model: typeof Recebivel | typeof Maquininha,
): ModeloParcela {
  return model as unknown as ModeloParcela;
}

function chaves(rows: ParcelaGravada[]): WhereOptions[] {
  return rows.map((row) => ({
    idTransacao: row.idTransacao,
    parcelaRecebivel: row.parcelaRecebivel,
  }));
}
