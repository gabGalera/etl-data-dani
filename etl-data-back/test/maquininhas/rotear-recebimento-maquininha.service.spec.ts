import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { Recebimento } from '../../src/recebimentos/repository/recebimento.model.js';
import { Maquininha } from '../../src/maquininhas/repository/maquininha.model.js';
import {
  RotearRecebimentoMaquininhaService,
} from '../../src/maquininhas/service/rotear-recebimento-maquininha.service.js';
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';

describe('RotearRecebimentoMaquininhaService', () => {
  const transaction = {} as never;

  const recebimento = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };
  const maquininha = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };
  const transacao = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
  };

  let service: RotearRecebimentoMaquininhaService;

  beforeEach(async () => {
    recebimento.findAll.mockReset();
    recebimento.bulkCreate.mockReset();
    recebimento.destroy.mockReset();
    maquininha.findAll.mockReset();
    maquininha.bulkCreate.mockReset();
    maquininha.destroy.mockReset();
    transacao.findAll.mockReset();
    transacao.bulkCreate.mockReset();

    recebimento.destroy.mockResolvedValue(0);
    maquininha.destroy.mockResolvedValue(0);
    recebimento.findAll.mockResolvedValue([]);
    maquininha.findAll.mockResolvedValue([]);
    transacao.findAll.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RotearRecebimentoMaquininhaService,
        { provide: getModelToken(Recebimento), useValue: recebimento },
        { provide: getModelToken(Maquininha), useValue: maquininha },
        { provide: getModelToken(Transacao), useValue: transacao },
      ],
    }).compile();

    service = moduleRef.get(RotearRecebimentoMaquininhaService);
  });

  it('stores a recebimento with a transacao in recebimentos and without in maquininhas', async () => {
    transacao.findAll.mockResolvedValue([
      { idTransAdquirente: 'ADQ-1' },
    ]);
    recebimento.findAll.mockResolvedValue([]);
    maquininha.destroy.mockResolvedValue(0);

    const result = await service.gravarRecebimentosImportados(
      [
        {
          linha: 2,
          idTransAdquirente: 'ADQ-1',
          dataRecibo: '2026-04-04',
          confirmacao: '10.00',
          parcela: 1,
        },
      ],
      [2],
      transaction,
    );

    expect(recebimento.bulkCreate).toHaveBeenCalled();
    expect(maquininha.bulkCreate).not.toHaveBeenCalled();
    expect(maquininha.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { linha: [2] } }),
    );
    expect(result).toEqual({
      recebimentos: { inseridas: 1, atualizadas: 0 },
      maquininhas: { inseridas: 0, atualizadas: 0 },
      deletadas: 0,
    });
  });

  it('stores a recebimento without a transacao in maquininhas', async () => {
    transacao.findAll.mockResolvedValue([]);
    maquininha.findAll.mockResolvedValue([]);
    recebimento.destroy.mockResolvedValue(0);

    await service.gravarRecebimentosImportados(
      [
        {
          linha: 3,
          idTransAdquirente: 'ORPHAN',
          dataRecibo: '2026-04-04',
          confirmacao: '10.00',
          parcela: 1,
        },
      ],
      [3],
      transaction,
    );

    expect(maquininha.bulkCreate).toHaveBeenCalled();
    expect(recebimento.bulkCreate).not.toHaveBeenCalled();
    expect(recebimento.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { linha: [3] } }),
    );
  });

  it('promotes maquininhas when a matching transacao is imported', async () => {
    transacao.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ idTransAdquirente: 'ADQ-2' }]);
    maquininha.findAll.mockResolvedValue([
      {
        linha: 4,
        idTransAdquirente: 'ADQ-2',
        dataRecibo: '2026-04-04',
        confirmacao: '10.00',
        parcela: 1,
      },
    ]);
    transacao.bulkCreate.mockResolvedValue([]);

    await service.gravarTransacoesImportadas(
      [
        {
          idTransacao: 100,
          cliente: 'RUNNERS',
          data: '2026-09-27',
          hora: '23:32:38',
          adquirente: 'mercadopago',
          idTransAdquirente: 'ADQ-2',
          status: 'Pago',
          valorTransacao: '198.00',
          tipo: 'Cartao de Credito',
          parcelas: 1,
          bandeira: null,
          aut: null,
          cartao: null,
          taxaPercentual: null,
          taxaValor: null,
          valorLiquido: null,
          totalReembolsado: null,
        },
      ],
      transaction,
    );

    expect(recebimento.bulkCreate).toHaveBeenCalled();
    expect(maquininha.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { linha: [4] } }),
    );
  });
});
