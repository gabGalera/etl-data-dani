import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { Op } from 'sequelize';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { Erro } from '../../src/erros/erro.model.js';
import { Recebivel } from '../../src/recebiveis/repository/recebivel.model.js';

const HEADER =
  'Cliente;"ID Transacao";Adquirente;"ID Trans. Adquirente";Tipo;"Data Transacao";"Valor Transacao";"Parcela Recebivel";"Total Parcelas";"Taxa %";"Taxa Valor";"Valor Repasse";"Data Repasse"';

const IDS = { [Op.between]: [910001, 910099] };

describe('POST /recebiveis/importar', () => {
  let app: INestApplication<App>;
  let recebivel: typeof Recebivel;
  let erro: typeof Erro;
  let pasta: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    recebivel = app.get(getModelToken(Recebivel));
    erro = app.get(getModelToken(Erro));
  });

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'recebiveis-'));
    await recebivel.destroy({ where: { idTransacao: IDS } });
    await erro.destroy({ where: { arquivo: { [Op.startsWith]: pasta } } });
  });

  afterEach(async () => {
    await recebivel.destroy({ where: { idTransacao: IDS } });
    await erro.destroy({
      where: { arquivo: { [Op.startsWith]: pasta } },
    });
    await rm(pasta, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores each parcela and skips the total line', async () => {
    await writeCsv(pasta, 'recebiveis_exemplo.csv', [
      linha({
        idTransacao: 910001,
        parcelaRecebivel: 1,
        dataRepasse: '02/10/2026',
      }),
      linha({
        idTransacao: 910001,
        parcelaRecebivel: 2,
        dataRepasse: '02/11/2026',
      }),
      linha({
        idTransacao: 910002,
        adquirente: 'MERCADO_PAGO',
        tipo: 'PIX',
        taxaPercentual: '',
        taxaValor: '-0,99',
        valorTransacao: '80,00',
        valorRepasse: '79,01',
        totalParcelas: 1,
      }),
      linha({
        idTransacao: 910003,
        cliente: 'USE TRAVEL',
        valorTransacao: '2.792,66',
        taxaPercentual: '',
        taxaValor: '',
        valorRepasse: '2.792,66',
        totalParcelas: 10,
        dataTransacao: '13/04/2026',
        dataRepasse: '27/04/2026',
      }),
      'Total;;;;;;"1.234,50";;;;;;',
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toEqual({
      arquivos: [
        {
          arquivo: path.join(pasta, 'recebiveis_exemplo.csv'),
          inseridas: 4,
          atualizadas: 0,
          ignoradas: 1,
        },
      ],
      inseridas: 4,
      atualizadas: 0,
      ignoradas: 1,
    });

    const primeira = await parcela(recebivel, 910001, 1);
    expect(primeira?.get({ plain: true })).toMatchObject({
      idTransacao: 910001,
      parcelaRecebivel: 1,
      cliente: 'RUNNERS',
      adquirente: 'mercadopago',
      idTransAdquirente: '181226583096',
      tipo: 'Cartao de Credito',
      dataTransacao: '2026-09-27',
      valorTransacao: '19000.00',
      totalParcelas: 2,
      taxaPercentual: '7.87',
      taxaValor: '-1495.30',
      valorRepasse: '17504.70',
      dataRepasse: '2026-10-02',
    });
    expect((await parcela(recebivel, 910001, 2))?.dataRepasse).toBe(
      '2026-11-02',
    );
    expect(
      (await parcela(recebivel, 910002, 1))?.get({ plain: true }),
    ).toMatchObject({
      adquirente: 'MERCADO_PAGO',
      tipo: 'PIX',
      taxaPercentual: null,
      taxaValor: '-0.99',
      valorTransacao: '80.00',
      valorRepasse: '79.01',
    });
    expect(
      (await parcela(recebivel, 910003, 1))?.get({ plain: true }),
    ).toMatchObject({
      cliente: 'USE TRAVEL',
      taxaPercentual: null,
      taxaValor: null,
      valorTransacao: '2792.66',
      valorRepasse: '2792.66',
    });
  });

  it('counts an identical second parcela as ignoradas', async () => {
    const repetida = linha({ idTransacao: 910010 });
    await writeCsv(pasta, 'recebiveis_dup.csv', [repetida, repetida]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({
      inseridas: 1,
      atualizadas: 0,
      ignoradas: 1,
    });
    expect(await parcela(recebivel, 910010, 1)).not.toBeNull();
  });

  it('rejects a file that repeats a parcela with different columns', async () => {
    await writeCsv(pasta, 'recebiveis_dup.csv', [
      linha({ idTransacao: 910020, cliente: 'RUNNERS' }),
      linha({ idTransacao: 910020, cliente: 'OUTRO' }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.erros).toEqual([
      {
        id: expect.any(Number),
        arquivo: path.join(pasta, 'recebiveis_dup.csv'),
        linha: 3,
        mensagem: 'Recebivel duplicado',
      },
    ]);
    expect(await parcela(recebivel, 910020, 1)).toBeNull();
  });

  it('updates an existing recebivel and keeps createdAt', async () => {
    await writeCsv(pasta, 'recebiveis_exemplo.csv', [
      linha({ idTransacao: 910001, cliente: 'RUNNERS' }),
    ]);

    await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    const createdAt = (await parcela(recebivel, 910001, 1))?.createdAt;

    await writeCsv(pasta, 'recebiveis_exemplo.csv', [
      linha({ idTransacao: 910001, cliente: 'OUTRO' }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({
      inseridas: 0,
      atualizadas: 1,
      ignoradas: 0,
    });
    const atualizada = await parcela(recebivel, 910001, 1);
    expect(atualizada?.cliente).toBe('OUTRO');
    expect(atualizada?.createdAt).toEqual(createdAt);
  });

  it('commits the good file, records the bad file, and returns 422', async () => {
    await writeCsv(pasta, 'recebiveis_a_ok.csv', [
      linha({ idTransacao: 910030 }),
    ]);
    await writeCsv(pasta, 'recebiveis_b_ruim.csv', [
      linha({ idTransacao: 910031, valorTransacao: 'nao' }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body).toEqual({
      message: 'Falha ao importar recebiveis',
      arquivos: [
        {
          arquivo: path.join(pasta, 'recebiveis_a_ok.csv'),
          inseridas: 1,
          atualizadas: 0,
          ignoradas: 0,
        },
      ],
      erros: [
        {
          id: expect.any(Number),
          arquivo: path.join(pasta, 'recebiveis_b_ruim.csv'),
          linha: 2,
          mensagem: 'Valor Transacao invalido',
        },
      ],
    });

    const deNovo = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(422);

    expect(deNovo.body.arquivos[0]).toMatchObject({
      inseridas: 0,
      atualizadas: 1,
    });
    expect(await parcela(recebivel, 910031, 1)).toBeNull();

    const corrigida = await mkdtemp(path.join(tmpdir(), 'recebiveis-'));
    try {
      await writeCsv(corrigida, 'recebiveis_b_ruim.csv', [
        linha({ idTransacao: 910031 }),
      ]);
      const gravou = await request(app.getHttpServer())
        .post('/recebiveis/importar')
        .send({ path: corrigida })
        .expect(200);
      expect(gravou.body).toMatchObject({ inseridas: 1, atualizadas: 0 });
    } finally {
      await erro.destroy({
        where: { arquivo: { [Op.startsWith]: corrigida } },
      });
      await recebivel.destroy({ where: { idTransacao: 910031 } });
      await rm(corrigida, { recursive: true, force: true });
    }
  });

  it('rejects an empty id da transacao do adquirente and a parcela of zero', async () => {
    await writeCsv(pasta, 'recebiveis_adquirente.csv', [
      linha({ idTransacao: 910040, idTransAdquirente: '' }),
    ]);
    await writeCsv(pasta, 'recebiveis_parcela.csv', [
      linha({ idTransacao: 910041, parcelaRecebivel: 0 }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.erros).toEqual([
      {
        id: expect.any(Number),
        arquivo: path.join(pasta, 'recebiveis_adquirente.csv'),
        linha: 2,
        mensagem: 'ID Trans. Adquirente obrigatorio',
      },
      {
        id: expect.any(Number),
        arquivo: path.join(pasta, 'recebiveis_parcela.csv'),
        linha: 2,
        mensagem: 'Parcela Recebivel invalido',
      },
    ]);
    expect(await parcela(recebivel, 910040, 1)).toBeNull();
    expect(await parcela(recebivel, 910041, 1)).toBeNull();
  });

  it('imports a directory given as a relative path', async () => {
    await writeCsv(pasta, 'recebiveis_exemplo.csv', [
      linha({ idTransacao: 910001 }),
    ]);
    const relativo = path.relative(process.cwd(), pasta);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: relativo })
      .expect(200);

    expect(response.body.arquivos).toEqual([
      {
        arquivo: path.join(pasta, 'recebiveis_exemplo.csv'),
        inseridas: 1,
        atualizadas: 0,
        ignoradas: 0,
      },
    ]);
  });

  it('returns 400 when path is not a readable directory', async () => {
    await writeCsv(pasta, 'recebiveis_exemplo.csv', [
      linha({ idTransacao: 910001 }),
    ]);

    for (const body of [
      {},
      { path: '' },
      { path: path.join(pasta, 'recebiveis_exemplo.csv') },
      { path: path.join(pasta, 'ausente') },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/recebiveis/importar')
        .send(body)
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    }
  });

  it('imports only regular recebiveis_ files and reports an empty folder', async () => {
    await writeCsv(pasta, 'notas.csv', [linha({ idTransacao: 910050 })]);
    await mkdir(path.join(pasta, 'recebiveis_pasta'));
    await writeCsv(
      path.join(pasta, 'recebiveis_pasta'),
      'recebiveis_dentro.csv',
      [linha({ idTransacao: 910052 })],
    );
    await writeCsv(pasta, 'recebiveis_ok.csv', [
      linha({ idTransacao: 910051, valorTransacao: '1.234,56' }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body.arquivos).toEqual([
      {
        arquivo: path.join(pasta, 'recebiveis_ok.csv'),
        inseridas: 1,
        atualizadas: 0,
        ignoradas: 0,
      },
    ]);
    expect(await parcela(recebivel, 910050, 1)).toBeNull();
    expect(await parcela(recebivel, 910052, 1)).toBeNull();
    expect((await parcela(recebivel, 910051, 1))?.valorTransacao).toBe(
      '1234.56',
    );

    const vazia = await mkdtemp(path.join(tmpdir(), 'recebiveis-'));
    try {
      const vazio = await request(app.getHttpServer())
        .post('/recebiveis/importar')
        .send({ path: vazia })
        .expect(200);
      expect(vazio.body).toEqual({
        arquivos: [],
        inseridas: 0,
        atualizadas: 0,
        ignoradas: 0,
      });
    } finally {
      await rm(vazia, { recursive: true, force: true });
    }
  });

  it('returns 400 when the directory cannot be listed', async () => {
    await chmod(pasta, 0o000);
    try {
      const response = await request(app.getHttpServer())
        .post('/recebiveis/importar')
        .send({ path: pasta })
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    } finally {
      await chmod(pasta, 0o700);
    }
  });

  it('rejects a bad header and still imports the other file', async () => {
    await writeCsv(pasta, 'recebiveis_a_ok.csv', [
      linha({ idTransacao: 910060 }),
    ]);
    await writeFile(
      path.join(pasta, 'recebiveis_b_cabecalho.csv'),
      'id;cliente\n1;RUNNERS\n',
      'utf8',
    );

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.arquivos).toHaveLength(1);
    expect(response.body.erros[0]).toMatchObject({
      arquivo: path.join(pasta, 'recebiveis_b_cabecalho.csv'),
      linha: 1,
      mensagem: 'Cabecalho invalido',
    });
    expect(await parcela(recebivel, 910060, 1)).not.toBeNull();
  });

  it('lets the later file replace the same parcela', async () => {
    await writeCsv(pasta, 'recebiveis_a.csv', [
      linha({ idTransacao: 910070, cliente: 'PRIMEIRO' }),
    ]);
    await writeCsv(pasta, 'recebiveis_b.csv', [
      linha({ idTransacao: 910070, cliente: 'SEGUNDO' }),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebiveis/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({ inseridas: 1, atualizadas: 1 });
    expect((await parcela(recebivel, 910070, 1))?.cliente).toBe('SEGUNDO');
  });
});

function parcela(
  recebivel: typeof Recebivel,
  idTransacao: number,
  parcelaRecebivel: number,
): Promise<Recebivel | null> {
  return recebivel.findOne({ where: { idTransacao, parcelaRecebivel } });
}

function linha(partial: {
  idTransacao: number;
  cliente?: string;
  adquirente?: string;
  idTransAdquirente?: string;
  tipo?: string;
  dataTransacao?: string;
  valorTransacao?: string;
  parcelaRecebivel?: number;
  totalParcelas?: number;
  taxaPercentual?: string;
  taxaValor?: string;
  valorRepasse?: string;
  dataRepasse?: string;
}): string {
  return [
    partial.cliente ?? 'RUNNERS',
    String(partial.idTransacao),
    partial.adquirente ?? 'mercadopago',
    partial.idTransAdquirente ?? '181226583096',
    partial.tipo ?? 'Cartao de Credito',
    partial.dataTransacao ?? '27/09/2026',
    partial.valorTransacao ?? '19.000,00',
    String(partial.parcelaRecebivel ?? 1),
    String(partial.totalParcelas ?? 2),
    partial.taxaPercentual ?? '7,87',
    partial.taxaValor ?? '-1.495,30',
    partial.valorRepasse ?? '17.504,70',
    partial.dataRepasse ?? '02/10/2026',
  ].join(';');
}

async function writeCsv(
  pasta: string,
  nome: string,
  linhas: string[],
): Promise<void> {
  await writeFile(
    path.join(pasta, nome),
    `\uFEFF${HEADER}\n${linhas.join('\n')}\n`,
    'utf8',
  );
}
