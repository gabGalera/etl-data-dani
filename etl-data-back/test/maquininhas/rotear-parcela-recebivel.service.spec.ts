import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import type { Transaction } from 'sequelize';
import { Maquininha } from '../../src/maquininhas/repository/maquininha.model.js';
import {
  RotearParcelaRecebivelService,
  type ParcelaGravada,
} from '../../src/maquininhas/service/rotear-parcela-recebivel.service.js';
import { Recebivel } from '../../src/recebiveis/repository/recebivel.model.js';
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';

const transaction = {} as Transaction;

function parcela(
  idTransacao: number,
  parcelaRecebivel = 1,
): ParcelaGravada {
  return {
    idTransacao,
    parcelaRecebivel,
    cliente: 'RUNNERS',
    adquirente: 'mercadopago',
    idTransAdquirente: '181226583096',
    tipo: 'PIX',
    dataTransacao: '2026-09-27',
    valorTransacao: '10.00',
    totalParcelas: 1,
    taxaPercentual: null,
    taxaValor: null,
    valorRepasse: '10.00',
    dataRepasse: '2026-10-02',
  };
}

describe('RotearParcelaRecebivelService', () => {
  const transacao = { findAll: vi.fn() };
  const recebivel = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };
  const maquininha = {
    findAll: vi.fn(),
    bulkCreate: vi.fn(),
    destroy: vi.fn(),
  };

  let service: RotearParcelaRecebivelService;

  beforeEach(async () => {
    vi.clearAllMocks();
    recebivel.findAll.mockResolvedValue([]);
    maquininha.findAll.mockResolvedValue([]);
    recebivel.bulkCreate.mockResolvedValue([]);
    maquininha.bulkCreate.mockResolvedValue([]);
    recebivel.destroy.mockResolvedValue(0);
    maquininha.destroy.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RotearParcelaRecebivelService,
        { provide: getModelToken(Transacao), useValue: transacao },
        { provide: getModelToken(Recebivel), useValue: recebivel },
        { provide: getModelToken(Maquininha), useValue: maquininha },
      ],
    }).compile();

    service = moduleRef.get(RotearParcelaRecebivelService);
  });

  it('splits rows by idTransacao and clears the other table', async () => {
    transacao.findAll.mockResolvedValue([{ idTransacao: 1 }]);

    const resultado = await service.gravar(
      [parcela(1), parcela(2, 3)],
      transaction,
    );

    expect(transacao.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idTransacao: [1, 2] },
        transaction,
      }),
    );
    expect(recebivel.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ idTransacao: 1, parcelaRecebivel: 1 })],
      expect.objectContaining({ transaction }),
    );
    expect(maquininha.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ idTransacao: 2, parcelaRecebivel: 3 })],
      expect.objectContaining({ transaction }),
    );
    expect(maquininha.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction }),
    );
    expect(recebivel.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ transaction }),
    );
    expect(resultado).toEqual({
      recebiveis: { inseridas: 1, atualizadas: 0 },
      maquininhas: { inseridas: 1, atualizadas: 0 },
    });
  });

  it('counts an existing destination row as an update', async () => {
    transacao.findAll.mockResolvedValue([]);
    maquininha.findAll.mockResolvedValue([
      { idTransacao: 2, parcelaRecebivel: 1 },
    ]);

    const resultado = await service.gravar([parcela(2)], transaction);

    expect(recebivel.bulkCreate).not.toHaveBeenCalled();
    expect(recebivel.destroy).toHaveBeenCalled();
    expect(resultado).toEqual({
      recebiveis: { inseridas: 0, atualizadas: 0 },
      maquininhas: { inseridas: 0, atualizadas: 1 },
    });
  });

  it('moves every maquininha of the given ids into recebiveis', async () => {
    maquininha.findAll.mockResolvedValue([
      parcela(9, 1),
      parcela(9, 2),
    ]);

    await service.moverParaRecebiveis([9, 9], transaction);

    expect(maquininha.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idTransacao: [9] },
        transaction,
      }),
    );
    expect(recebivel.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({ idTransacao: 9, parcelaRecebivel: 1 }),
        expect.objectContaining({ idTransacao: 9, parcelaRecebivel: 2 }),
      ],
      expect.objectContaining({ transaction }),
    );
    expect(maquininha.destroy).toHaveBeenCalledWith({
      where: { idTransacao: [9] },
      transaction,
    });
  });

  it('skips the move when no maquininha matches', async () => {
    await service.moverParaRecebiveis([4], transaction);

    expect(recebivel.bulkCreate).not.toHaveBeenCalled();
    expect(maquininha.destroy).not.toHaveBeenCalled();
  });
});
