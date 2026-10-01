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
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';

const HEADER =
  '"ID Transacao";Cliente;Data/Hora;Adquirente;"ID Trans. Adquirente";Status;"Valor Transacao";Tipo;Parcelas;Bandeira;Aut;Cartao;"Taxa %";"Taxa Valor";"Valor Liquido";"Total Reembolsado";"Ultima Atualizacao"';

const IDS = { [Op.between]: [910001, 910099] };

describe('POST /transacoes/importar', () => {
  let app: INestApplication<App>;
  let transacao: typeof Transacao;
  let erro: typeof Erro;
  let pasta: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    transacao = app.get(getModelToken(Transacao));
    erro = app.get(getModelToken(Erro));
  });

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'transacoes-'));
    await transacao.destroy({ where: { idTransacao: IDS } });
    await erro.destroy({ where: { arquivo: { [Op.startsWith]: pasta } } });
  });

  afterEach(async () => {
    await transacao.destroy({ where: { idTransacao: IDS } });
    await erro.destroy({
      where: { arquivo: { [Op.startsWith]: pasta } },
    });
    await rm(pasta, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores a parsed export row and skips the total line', async () => {
    await writeCsv(pasta, 'transacoes_exemplo.csv', [
      '910001;RUNNERS;"27/09/2026 23:32:38";mercadopago;181226583096;Pago;198,00;"Cartao de Credito";3;visa;229989;"**** 7389";4,74;-9,39;188,61;;"27/09/2026 23:33:01"',
      '910002;"TAXIBUS TRANSPORTES";"27/09/2026 19:03:50";MERCADO_PAGO;180197844653;Pendente;80,00;PIX;1;;;;;;;;"27/09/2026 19:04:03"',
      'Total;;;;;;"1.234,50";;;;;;;;;;',
    ]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toEqual({
      arquivos: [
        {
          arquivo: path.join(pasta, 'transacoes_exemplo.csv'),
          inseridas: 2,
          atualizadas: 0,
          ignoradas: 1,
        },
      ],
      inseridas: 2,
      atualizadas: 0,
      ignoradas: 1,
    });

    const cartao = await transacao.findByPk(910001);
    expect(cartao?.get({ plain: true })).toMatchObject({
      idTransacao: 910001,
      cliente: 'RUNNERS',
      data: '2026-09-27',
      hora: '23:32:38',
      adquirente: 'mercadopago',
      idTransAdquirente: '181226583096',
      status: 'Pago',
      valorTransacao: '198.00',
      tipo: 'Cartao de Credito',
      parcelas: 3,
      bandeira: 'visa',
      aut: '229989',
      cartao: '**** 7389',
      taxaPercentual: '4.74',
      taxaValor: '-9.39',
      valorLiquido: '188.61',
      totalReembolsado: null,
    });

    const pix = await transacao.findByPk(910002);
    expect(pix?.get({ plain: true })).toMatchObject({
      idTransacao: 910002,
      cliente: 'TAXIBUS TRANSPORTES',
      adquirente: 'MERCADO_PAGO',
      idTransAdquirente: '180197844653',
      status: 'Pendente',
      valorTransacao: '80.00',
      tipo: 'PIX',
      parcelas: 1,
      bandeira: null,
      aut: null,
      cartao: null,
      taxaPercentual: null,
      taxaValor: null,
      valorLiquido: null,
      totalReembolsado: null,
    });
  });

  it('updates an existing transacao and keeps createdAt', async () => {
    await writeCsv(pasta, 'transacoes_exemplo.csv', [row(910001, 'RUNNERS')]);

    await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(200);

    const createdAt = (await transacao.findByPk(910001))?.createdAt;

    await writeCsv(pasta, 'transacoes_exemplo.csv', [row(910001, 'OUTRO')]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({
      inseridas: 0,
      atualizadas: 1,
      ignoradas: 0,
    });
    const atualizada = await transacao.findByPk(910001);
    expect(atualizada?.cliente).toBe('OUTRO');
    expect(atualizada?.createdAt).toEqual(createdAt);
  });

  it('commits the good file, records the bad file, and returns 422', async () => {
    await writeCsv(pasta, 'transacoes_a_ok.csv', [row(910010, 'RUNNERS')]);
    await writeCsv(pasta, 'transacoes_b_ruim.csv', [
      row(910011, 'RUNNERS').replace('198,00', 'nao'),
    ]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body).toEqual({
      message: 'Falha ao importar transacoes',
      arquivos: [
        {
          arquivo: path.join(pasta, 'transacoes_a_ok.csv'),
          inseridas: 1,
          atualizadas: 0,
          ignoradas: 0,
        },
      ],
      erros: [
        {
          id: expect.any(Number),
          arquivo: path.join(pasta, 'transacoes_b_ruim.csv'),
          linha: 2,
          mensagem: 'Valor Transacao invalido',
        },
      ],
    });

    const deNovo = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(422);

    expect(deNovo.body.arquivos[0]).toMatchObject({
      inseridas: 0,
      atualizadas: 1,
    });
    expect(await transacao.findByPk(910011)).toBeNull();

    const corrigida = await mkdtemp(path.join(tmpdir(), 'transacoes-'));
    try {
      await writeCsv(corrigida, 'transacoes_b_ruim.csv', [
        row(910011, 'RUNNERS'),
      ]);
      const gravou = await request(app.getHttpServer())
        .post('/transacoes/importar')
        .send({ path: corrigida })
        .expect(200);
      expect(gravou.body).toMatchObject({ inseridas: 1, atualizadas: 0 });
    } finally {
      await erro.destroy({
        where: { arquivo: { [Op.startsWith]: corrigida } },
      });
      await rm(corrigida, { recursive: true, force: true });
    }
  });

  it('rejects a file that repeats idTransacao and keeps none of its rows', async () => {
    await writeCsv(pasta, 'transacoes_dup.csv', [
      row(910020, 'RUNNERS'),
      row(910020, 'OUTRO'),
    ]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.erros).toEqual([
      {
        id: expect.any(Number),
        arquivo: path.join(pasta, 'transacoes_dup.csv'),
        linha: 3,
        mensagem: 'ID Transacao duplicado',
      },
    ]);
    expect(await transacao.findByPk(910020)).toBeNull();
  });

  it('imports a directory given as a relative path', async () => {
    await writeCsv(pasta, 'transacoes_exemplo.csv', [row(910001, 'RUNNERS')]);
    const relativo = path.relative(process.cwd(), pasta);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: relativo })
      .expect(200);

    expect(response.body.arquivos).toEqual([
      {
        arquivo: path.join(pasta, 'transacoes_exemplo.csv'),
        inseridas: 1,
        atualizadas: 0,
        ignoradas: 0,
      },
    ]);
  });

  it('returns 400 when path is not a readable directory', async () => {
    await writeCsv(pasta, 'transacoes_exemplo.csv', [row(910001, 'RUNNERS')]);

    for (const body of [
      {},
      { path: '' },
      { path: path.join(pasta, 'transacoes_exemplo.csv') },
      { path: path.join(pasta, 'ausente') },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/transacoes/importar')
        .send(body)
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    }
  });

  it('imports only regular transacoes_ files and reports an empty folder', async () => {
    await writeCsv(pasta, 'notas.csv', [row(910030, 'RUNNERS')]);
    await mkdir(path.join(pasta, 'transacoes_pasta'));
    await writeCsv(
      path.join(pasta, 'transacoes_pasta'),
      'transacoes_dentro.csv',
      [row(910032, 'RUNNERS')],
    );
    await writeCsv(pasta, 'transacoes_ok.csv', [
      row(910031, 'RUNNERS', '1.234,56'),
    ]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body.arquivos).toEqual([
      {
        arquivo: path.join(pasta, 'transacoes_ok.csv'),
        inseridas: 1,
        atualizadas: 0,
        ignoradas: 0,
      },
    ]);
    expect(await transacao.findByPk(910030)).toBeNull();
    expect(await transacao.findByPk(910032)).toBeNull();
    expect((await transacao.findByPk(910031))?.valorTransacao).toBe('1234.56');

    const vazia = await mkdtemp(path.join(tmpdir(), 'transacoes-'));
    try {
      const vazio = await request(app.getHttpServer())
        .post('/transacoes/importar')
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
        .post('/transacoes/importar')
        .send({ path: pasta })
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    } finally {
      await chmod(pasta, 0o700);
    }
  });

  it('rejects a bad header and still imports the other file', async () => {
    await writeCsv(pasta, 'transacoes_a_ok.csv', [row(910040, 'RUNNERS')]);
    await writeFile(
      path.join(pasta, 'transacoes_b_cabecalho.csv'),
      'id;cliente\n1;RUNNERS\n',
      'utf8',
    );

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.arquivos).toHaveLength(1);
    expect(response.body.erros[0]).toMatchObject({
      arquivo: path.join(pasta, 'transacoes_b_cabecalho.csv'),
      linha: 1,
      mensagem: 'Cabecalho invalido',
    });
    expect(await transacao.findByPk(910040)).not.toBeNull();
  });

  it('lets the later file replace the same idTransacao', async () => {
    await writeCsv(pasta, 'transacoes_a.csv', [row(910050, 'PRIMEIRO')]);
    await writeCsv(pasta, 'transacoes_b.csv', [row(910050, 'SEGUNDO')]);

    const response = await request(app.getHttpServer())
      .post('/transacoes/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({ inseridas: 1, atualizadas: 1 });
    expect((await transacao.findByPk(910050))?.cliente).toBe('SEGUNDO');
  });
});

function row(id: number, cliente: string, valor = '198,00'): string {
  return `${id};${cliente};"27/09/2026 23:32:38";mercadopago;181226583096;Pago;${valor};"Cartao de Credito";3;visa;229989;"**** 7389";4,74;-9,39;188,61;;"27/09/2026 23:33:01"`;
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
