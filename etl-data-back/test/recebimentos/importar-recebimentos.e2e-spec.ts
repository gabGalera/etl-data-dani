import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
import { Recebimento } from '../../src/recebimentos/repository/recebimento.model.js';
import { writeRecebimentosXlsx } from './write-recebimentos-xlsx.js';

describe('POST /recebimentos/importar', () => {
  let app: INestApplication<App>;
  let recebimento: typeof Recebimento;
  let erro: typeof Erro;
  let pasta: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    recebimento = app.get(getModelToken(Recebimento));
    erro = app.get(getModelToken(Erro));
  });

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'recebimentos-'));
    await recebimento.truncate();
    await erro.destroy({ where: { arquivo: { [Op.startsWith]: pasta } } });
  });

  afterEach(async () => {
    await recebimento.truncate();
    await erro.destroy({
      where: { arquivo: { [Op.startsWith]: pasta } },
    });
    await rm(pasta, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores parsed workbook rows and ignores other files', async () => {
    await writeFile(path.join(pasta, 'Recebimentos_MP_.xlsx:Zone.Identifier'), 'x');
    await writeWorkbook([
      linha(900002, '04-04-2026', '152306875159', 4188.1899999999996),
      linha(900003, '27-09-2026', '181218443578', -198),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(200);

    const arquivo = path.join(pasta, 'Recebimentos_MP.xlsx');
    expect(response.body).toEqual({
      arquivos: [
        {
          arquivo,
          inseridas: 2,
          atualizadas: 0,
          deletadas: 0,
          ignoradas: 0,
        },
      ],
      inseridas: 2,
      atualizadas: 0,
      deletadas: 0,
      ignoradas: 0,
    });

    expect((await recebimento.findByPk(900002))?.get({ plain: true })).toMatchObject({
      linha: 900002,
      idTransAdquirente: '152306875159',
      dataRecibo: '2026-04-04',
      confirmacao: '4188.19',
    });
    expect((await recebimento.findByPk(900003))?.get({ plain: true })).toMatchObject({
      linha: 900003,
      confirmacao: '-198.00',
    });
  });

  it('updates an existing linha, keeps createdAt, and deletes absent linhas', async () => {
    await writeWorkbook([linha(900002, '04-04-2026', 'AAA', 10)]);
    await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(200);
    await writeWorkbook([
      linha(900002, '04-04-2026', 'BBB', 10),
      linha(900003, '05-04-2026', 'CCC', 1),
    ]);
    await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(200);

    const createdAt = (await recebimento.findByPk(900002))?.createdAt;

    await writeWorkbook([linha(900002, '08-04-2026', 'DDD', 20)]);

    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(200);

    expect(response.body).toMatchObject({
      inseridas: 0,
      atualizadas: 1,
      deletadas: 1,
      ignoradas: 0,
    });
    const atualizada = await recebimento.findByPk(900002);
    expect(atualizada?.idTransAdquirente).toBe('DDD');
    expect(atualizada?.dataRecibo).toBe('2026-04-08');
    expect(atualizada?.confirmacao).toBe('20.00');
    expect(atualizada?.createdAt).toEqual(createdAt);
    expect(await recebimento.findByPk(900003)).toBeNull();
  });

  it('records a missing workbook and returns 422', async () => {
    const arquivo = path.join(pasta, 'Recebimentos_MP.xlsx');
    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body).toEqual({
      message: 'Falha ao importar recebimentos',
      arquivos: [],
      erros: [
        {
          id: expect.any(Number),
          arquivo,
          linha: null,
          mensagem: 'Arquivo ausente',
        },
      ],
    });
  });

  it('rejects an empty data sheet without deleting existing rows', async () => {
    await writeWorkbook([linha(900002, '04-04-2026', 'AAA', 10)]);
    await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(200);

    await writeWorkbook([]);

    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body.erros).toEqual([
      {
        id: expect.any(Number),
        arquivo: path.join(pasta, 'Recebimentos_MP.xlsx'),
        linha: null,
        mensagem: 'Arquivo vazio',
      },
    ]);
    expect(await recebimento.findByPk(900002)).not.toBeNull();
  });

  it('rolls back a bad line and records the erro', async () => {
    await writeWorkbook([
      linha(900002, '04-04-2026', 'AAA', 10),
      linha(900003, '08/04/2026', 'BBB', 1),
    ]);

    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: pasta })
      .expect(422);

    expect(response.body).toEqual({
      message: 'Falha ao importar recebimentos',
      arquivos: [],
      erros: [
        {
          id: expect.any(Number),
          arquivo: path.join(pasta, 'Recebimentos_MP.xlsx'),
          linha: 900003,
          mensagem: 'Data Recibo MP invalida',
        },
      ],
    });
    expect(await recebimento.findByPk(900002)).toBeNull();
  });

  it('imports a directory given as a relative path', async () => {
    await writeWorkbook([linha(900002, '04-04-2026', 'AAA', 10)]);
    const relativo = path.relative(process.cwd(), pasta);

    const response = await request(app.getHttpServer())
      .post('/recebimentos/importar')
      .send({ path: relativo })
      .expect(200);

    expect(response.body.arquivos).toEqual([
      {
        arquivo: path.join(pasta, 'Recebimentos_MP.xlsx'),
        inseridas: 1,
        atualizadas: 0,
        deletadas: 0,
        ignoradas: 0,
      },
    ]);
  });

  it('returns 400 when path is not a readable directory', async () => {
    await writeWorkbook([linha(900002, '04-04-2026', 'AAA', 10)]);

    for (const body of [
      {},
      { path: '' },
      { path: path.join(pasta, 'Recebimentos_MP.xlsx') },
      { path: path.join(pasta, 'ausente') },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/recebimentos/importar')
        .send(body)
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    }
  });

  it('returns 400 when the directory cannot be listed', async () => {
    await chmod(pasta, 0o000);
    try {
      const response = await request(app.getHttpServer())
        .post('/recebimentos/importar')
        .send({ path: pasta })
        .expect(400);
      expect(response.body.message).toBe('path deve ser um diretorio');
    } finally {
      await chmod(pasta, 0o700);
    }
  });

  function linha(
    row: number,
    data: string,
    id: string,
    confirmacao: number,
  ): Parameters<typeof writeRecebimentosXlsx>[2][number] {
    return {
      linha: row,
      cells: [
        { kind: 'text', value: data },
        { kind: 'text', value: id },
        { kind: 'number', value: confirmacao },
      ],
    };
  }

  async function writeWorkbook(
    rows: Parameters<typeof writeRecebimentosXlsx>[2],
  ): Promise<string> {
    return writeRecebimentosXlsx(pasta, 'Recebimentos_MP.xlsx', rows);
  }
});
