import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import type { Transaction } from 'sequelize';
import { Maquininha } from '../../src/maquininhas/repository/maquininha.model.js';
import {
  RotearTransacaoMaquininhaService,
} from '../../src/maquininhas/service/rotear-transacao-maquininha.service.js';
import { Recebimento } from '../../src/recebimentos/repository/recebimento.model.js';
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';
import type { TransacaoImportada } from '../../src/transacoes/service/parse-transacoes-csv.js';

const transaction = {} as Transaction;

function transacao(
  idTransacao: number,
  idTransAdquirente: string | null = '181226583096',
): TransacaoImportada {
  return {
    idTransacao,
    cliente: 'RUNNERS',
    data: '2026-09-27',
    hora: '23:32:38',
    adquirente: 'mercadopago',
    idTransAdquirente,
    status: 'Pago',
    valorTransacao: '198.00',
    tipo: 'PIX',
    parcelas: 1,
    bandeira: null,
    aut: null,
    cartao: null,
    taxaPercentual: null,
    taxaValor: null,
    valorLiquido: null,
    totalReembolsado: null,
  };
}

describe('RotearTransacaoMaquininhaService', () => {
  const recebimento = { findAll: vi.fn() };
  const transacaoModel = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };
  const maquininha = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };

  let service: RotearTransacaoMaquininhaService;

  beforeEach(async () => {
    vi.clearAllMocks();
    recebimento.findAll.mockResolvedValue([]);
    transacaoModel.findAll.mockResolvedValue([]);
    maquininha.findAll.mockResolvedValue([]);
    transacaoModel.bulkCreate.mockResolvedValue([]);
    maquininha.bulkCreate.mockResolvedValue([]);
    transacaoModel.destroy.mockResolvedValue(0);
    maquininha.destroy.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RotearTransacaoMaquininhaService,
        { provide: getModelToken(Recebimento), useValue: recebimento },
        { provide: getModelToken(Transacao), useValue: transacaoModel },
        { provide: getModelToken(Maquininha), useValue: maquininha },
      ],
    }).compile();

    service = moduleRef.get(RotearTransacaoMaquininhaService);
  });

  it('stores a transacao with recebimento in transacoes and without in maquininhas', async () => {
    recebimento.findAll.mockResolvedValue([
      { idTransAdquirente: 'com-recebimento' },
    ]);

    const resultado = await service.gravarImportacao(
      [transacao(1, 'com-recebimento'), transacao(2, 'sem-recebimento')],
      transaction,
    );

    expect(transacaoModel.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ idTransacao: 1 })],
      expect.objectContaining({ transaction }),
    );
    expect(maquininha.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idTransacao: [1] } }),
    );
    expect(maquininha.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ idTransacao: 2 })],
      expect.objectContaining({ transaction }),
    );
    expect(transacaoModel.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idTransacao: [2] } }),
    );
    expect(resultado).toEqual({
      transacoes: { inseridas: 1, atualizadas: 0 },
      maquininhas: { inseridas: 1, atualizadas: 0 },
    });
  });

  it('treats null idTransAdquirente as maquininha', async () => {
    recebimento.findAll.mockResolvedValue([
      { idTransAdquirente: 'outro' },
    ]);

    await service.gravarImportacao([transacao(3, null)], transaction);

    expect(maquininha.bulkCreate).toHaveBeenCalled();
    expect(transacaoModel.bulkCreate).not.toHaveBeenCalled();
  });

  it('moves transacoes without recebimento after recebimentos import', async () => {
    recebimento.findAll.mockResolvedValue([
      { idTransAdquirente: 'tem-recebimento' },
    ]);
    transacaoModel.findAll.mockResolvedValue([
      { ...transacao(10, 'sem-recebimento'), idTransacao: 10 },
    ]);

    await service.reclassificarAposRecebimentos(transaction);

    expect(maquininha.bulkCreate).toHaveBeenCalled();
    expect(transacaoModel.destroy).toHaveBeenCalled();
  });
});
