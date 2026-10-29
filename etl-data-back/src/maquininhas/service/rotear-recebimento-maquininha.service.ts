import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { Recebimento } from '../../recebimentos/repository/recebimento.model.js';
import type { RecebimentoImportado } from '../../recebimentos/service/parse-recebimentos-xlsx.js';
import { Transacao } from '../../transacoes/repository/transacao.model.js';
import type { TransacaoImportada } from '../../transacoes/service/parse-transacoes-csv.js';
import { Maquininha } from '../repository/maquininha.model.js';

export type ContagemTabela = {
  inseridas: number;
  atualizadas: number;
};

export type ResultadoGravacaoRecebimentos = {
  recebimentos: ContagemTabela;
  maquininhas: ContagemTabela;
  deletadas: number;
};

export type ResultadoGravacaoTransacoes = ContagemTabela;

const CAMPOS_RECEBIMENTO_ATUALIZAVEIS = [
  'idTransAdquirente',
  'dataRecibo',
  'confirmacao',
  'parcela',
  'updatedAt',
] as const;

const CAMPOS_TRANSACAO_ATUALIZAVEIS = [
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

@Injectable()
export class RotearRecebimentoMaquininhaService {
  constructor(
    @InjectModel(Recebimento)
    private readonly recebimento: typeof Recebimento,
    @InjectModel(Maquininha)
    private readonly maquininha: typeof Maquininha,
    @InjectModel(Transacao)
    private readonly transacao: typeof Transacao,
  ) {}

  async gravarRecebimentosImportados(
    rows: RecebimentoImportado[],
    linhasNoArquivo: number[],
    transaction: Transaction,
  ): Promise<ResultadoGravacaoRecebimentos> {
    const deletadasRecebimentos = await this.recebimento.destroy({
      where: { linha: { [Op.notIn]: linhasNoArquivo } },
      transaction,
    });
    const deletadasMaquininhas = await this.maquininha.destroy({
      where: { linha: { [Op.notIn]: linhasNoArquivo } },
      transaction,
    });
    const deletadas = deletadasRecebimentos + deletadasMaquininhas;

    if (rows.length === 0) {
      return { recebimentos: VAZIO, maquininhas: VAZIO, deletadas };
    }

    const comTransacao = await this.idsComTransacao(transaction);
    const paraRecebimentos = rows.filter((row) =>
      comTransacao.has(row.idTransAdquirente),
    );
    const paraMaquininhas = rows.filter(
      (row) => !comTransacao.has(row.idTransAdquirente),
    );

    const recebimentos = await this.gravarRecebimentos(
      paraRecebimentos,
      transaction,
    );
    const maquininhas = await this.gravarMaquininhas(
      paraMaquininhas,
      transaction,
    );

    return { recebimentos, maquininhas, deletadas };
  }

  async gravarTransacoesImportadas(
    rows: TransacaoImportada[],
    transaction: Transaction,
  ): Promise<ResultadoGravacaoTransacoes> {
    if (rows.length === 0) {
      await this.reclassificarAposTransacoes(transaction);
      return VAZIO;
    }

    const ids = rows.map((row) => row.idTransacao);
    const existentes = await this.transacao.findAll({
      attributes: ['idTransacao'],
      where: { idTransacao: ids },
      transaction,
    });
    const agora = new Date();
    await this.transacao.bulkCreate(
      rows.map((row) => ({ ...row, updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_TRANSACAO_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.reclassificarAposTransacoes(transaction);

    return {
      inseridas: rows.length - existentes.length,
      atualizadas: existentes.length,
    };
  }

  async reclassificarAposTransacoes(transaction: Transaction): Promise<void> {
    const comTransacao = await this.idsComTransacao(transaction);

    if (comTransacao.size > 0) {
      const promover = await this.maquininha.findAll({
        where: { idTransAdquirente: { [Op.in]: [...comTransacao] } },
        transaction,
      });
      if (promover.length > 0) {
        await this.moverParaRecebimentos(promover, transaction);
      }
    }

    const rebaixar = await this.recebimento.findAll({
      where: this.semTransacaoWhere(comTransacao),
      transaction,
    });
    if (rebaixar.length > 0) {
      await this.moverParaMaquininhas(rebaixar, transaction);
    }
  }

  private async gravarRecebimentos(
    rows: RecebimentoImportado[],
    transaction: Transaction,
  ): Promise<ContagemTabela> {
    if (rows.length === 0) {
      return VAZIO;
    }

    const linhas = rows.map((row) => row.linha);
    await this.maquininha.destroy({
      where: { linha: linhas },
      transaction,
    });

    const existentes = await this.recebimento.findAll({
      attributes: ['linha'],
      where: { linha: linhas },
      transaction,
    });
    const agora = new Date();
    await this.recebimento.bulkCreate(
      rows.map((row) => ({ ...row, updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_RECEBIMENTO_ATUALIZAVEIS],
        transaction,
      },
    );

    return {
      inseridas: rows.length - existentes.length,
      atualizadas: existentes.length,
    };
  }

  private async gravarMaquininhas(
    rows: RecebimentoImportado[],
    transaction: Transaction,
  ): Promise<ContagemTabela> {
    if (rows.length === 0) {
      return VAZIO;
    }

    const linhas = rows.map((row) => row.linha);
    await this.recebimento.destroy({
      where: { linha: linhas },
      transaction,
    });

    const existentes = await this.maquininha.findAll({
      attributes: ['linha'],
      where: { linha: linhas },
      transaction,
    });
    const agora = new Date();
    await this.maquininha.bulkCreate(
      rows.map((row) => ({ ...row, updatedAt: agora })),
      {
        updateOnDuplicate: [...CAMPOS_RECEBIMENTO_ATUALIZAVEIS],
        transaction,
      },
    );

    return {
      inseridas: rows.length - existentes.length,
      atualizadas: existentes.length,
    };
  }

  private semTransacaoWhere(comTransacao: Set<string>): WhereOptions {
    if (comTransacao.size === 0) {
      return {};
    }
    return { idTransAdquirente: { [Op.notIn]: [...comTransacao] } };
  }

  private async idsComTransacao(
    transaction: Transaction,
  ): Promise<Set<string>> {
    const rows = await this.transacao.findAll({
      attributes: ['idTransAdquirente'],
      where: { idTransAdquirente: { [Op.ne]: null } },
      transaction,
    });
    return new Set(
      rows
        .map((row) => row.idTransAdquirente)
        .filter((id): id is string => id !== null),
    );
  }

  private async moverParaRecebimentos(
    linhas: Maquininha[],
    transaction: Transaction,
  ): Promise<void> {
    const agora = new Date();
    await this.recebimento.bulkCreate(
      linhas.map((linha) => ({
        linha: linha.linha,
        idTransAdquirente: linha.idTransAdquirente,
        dataRecibo: linha.dataRecibo,
        confirmacao: linha.confirmacao,
        parcela: linha.parcela,
        updatedAt: agora,
      })),
      {
        updateOnDuplicate: [...CAMPOS_RECEBIMENTO_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.maquininha.destroy({
      where: { linha: linhas.map((linha) => linha.linha) },
      transaction,
    });
  }

  private async moverParaMaquininhas(
    linhas: Recebimento[],
    transaction: Transaction,
  ): Promise<void> {
    const agora = new Date();
    await this.maquininha.bulkCreate(
      linhas.map((linha) => ({
        linha: linha.linha,
        idTransAdquirente: linha.idTransAdquirente,
        dataRecibo: linha.dataRecibo,
        confirmacao: linha.confirmacao,
        parcela: linha.parcela,
        updatedAt: agora,
      })),
      {
        updateOnDuplicate: [...CAMPOS_RECEBIMENTO_ATUALIZAVEIS],
        transaction,
      },
    );
    await this.recebimento.destroy({
      where: { linha: linhas.map((linha) => linha.linha) },
      transaction,
    });
  }
}
