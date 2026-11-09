import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { Op } from 'sequelize';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { Recebimento } from '../../src/recebimentos/repository/recebimento.model.js';
import { Recebivel } from '../../src/recebiveis/repository/recebivel.model.js';
import { Repasse } from '../../src/repasses/repository/repasse.model.js';
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';

const ID_TRANS_ADQUIRENTE = '999000000101';
const ID_TRANSACAO = 910_200;
const LINHA_RECEBIMENTO = 910_200;
const LINHA_REPASSE = 910_200;
const IDS_TRANSACAO = { [Op.between]: [910_200, 910_209] };
const LINHAS_RECEBIMENTO = { [Op.between]: [910_200, 910_209] };
const LINHAS_STREAM = { [Op.between]: [910_300, 910_399] };

describe('POST /exportacoes/join-recebimentos', () => {
  let app: INestApplication<App>;
  let transacao: typeof Transacao;
  let recebivel: typeof Recebivel;
  let recebimento: typeof Recebimento;
  let repasse: typeof Repasse;
  let pasta: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    transacao = app.get(getModelToken(Transacao));
    recebivel = app.get(getModelToken(Recebivel));
    recebimento = app.get(getModelToken(Recebimento));
    repasse = app.get(getModelToken(Repasse));
  });

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'export-join-'));
    await repasse.destroy({ where: { linha: LINHAS_RECEBIMENTO } });
    await recebimento.destroy({ where: { linha: LINHAS_RECEBIMENTO } });
    await recebivel.destroy({ where: { idTransacao: IDS_TRANSACAO } });
    await transacao.destroy({ where: { idTransacao: IDS_TRANSACAO } });

    await transacao.create({
      idTransacao: ID_TRANSACAO,
      cliente: 'RUNNERS',
      data: '2026-04-04',
      hora: '23:32:38',
      adquirente: 'mercadopago',
      idTransAdquirente: ID_TRANS_ADQUIRENTE,
      status: 'Pago',
      valorTransacao: '100.00',
      tipo: 'Cartao de Credito',
      parcelas: 3,
      bandeira: 'visa',
      taxaPercentual: '4.74',
      taxaValor: '4.74',
      valorLiquido: '95.26',
      totalReembolsado: null,
    });

    await recebivel.create({
      idTransacao: ID_TRANSACAO,
      parcelaRecebivel: 1,
      cliente: 'RUNNERS',
      adquirente: 'mercadopago',
      idTransAdquirente: ID_TRANS_ADQUIRENTE,
      tipo: 'Cartao de Credito',
      dataTransacao: '2026-04-04',
      valorTransacao: '100.00',
      totalParcelas: 3,
      taxaPercentual: '2.50',
      taxaValor: '2.50',
      valorRepasse: '32.50',
      dataRepasse: '2026-05-04',
    });

    await recebimento.create({
      linha: LINHA_RECEBIMENTO,
      idTransAdquirente: ID_TRANS_ADQUIRENTE,
      dataRecibo: '2026-04-04',
      confirmacao: '95.26',
      parcela: 1,
    });

    await repasse.create({
      linha: LINHA_REPASSE,
      idTransAdquirente: ID_TRANS_ADQUIRENTE,
      dataRepasse: '2026-05-04',
      valorRepasse: '32.50',
      parcela: 1,
    });
  });

  afterEach(async () => {
    await recebimento.destroy({ where: { linha: LINHAS_STREAM } });
    await rm(pasta, { recursive: true, force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('writes a joined CSV with expected headers and row count', async () => {
    const nome = 'join.csv';
    const response = await request(app.getHttpServer())
      .post('/exportacoes/join-recebimentos')
      .send({ path: pasta, nome })
      .expect(200);

    expect(path.basename(response.body.arquivo)).toMatch(/^join_\d{8}T\d{9}\.csv$/);
    expect(response.body.totalRecebimentos).toBeGreaterThanOrEqual(1);
    expect(response.body.linhas).toBeGreaterThanOrEqual(1);

    const text = await readFile(response.body.arquivo, 'utf8');
    const [header, ...rows] = text.trim().split('\n');
    expect(header).toContain('"taxaClient %"');
    expect(rows.length).toBe(response.body.linhas);

    const nosso = rows.find(
      (linha) =>
        linha.includes('RUNNERS') && linha.includes(ID_TRANS_ADQUIRENTE),
    );
    expect(nosso).toBeDefined();
    expect(nosso).toContain('2.50');
    expect(nosso).toContain('95.26');
    expect(nosso).toContain('32.50');
  });

  it('always uses a timestamped filename on every POST', async () => {
    const nome = 'join.csv';
    const first = await request(app.getHttpServer())
      .post('/exportacoes/join-recebimentos')
      .send({ path: pasta, nome })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/exportacoes/join-recebimentos')
      .send({ path: pasta, nome })
      .expect(200);

    expect(first.body.arquivo).not.toBe(second.body.arquivo);
    expect(path.basename(first.body.arquivo)).toMatch(/^join_\d{8}T\d{9}\.csv$/);
    await access(first.body.arquivo);
    await access(second.body.arquivo);
  });

  it('streams every recebimento row when many linhas exist', async () => {
    const quantidade = 50;
    const linhas = Array.from({ length: quantidade }, (_, i) => ({
      linha: 910_300 + i,
      idTransAdquirente: `999stream${String(i).padStart(6, '0')}`,
      dataRecibo: '2026-04-04',
      confirmacao: '1.00',
      parcela: 1,
    }));
    await recebimento.bulkCreate(linhas);

    const antes = await recebimento.count();
    const response = await request(app.getHttpServer())
      .post('/exportacoes/join-recebimentos')
      .send({ path: pasta, nome: 'stream.csv' })
      .expect(200);

    expect(response.body.totalRecebimentos).toBe(antes);
    expect(response.body.linhas).toBeGreaterThanOrEqual(quantidade);

    const text = await readFile(response.body.arquivo, 'utf8');
    const dataRows = text.trim().split('\n').length - 1;
    expect(dataRows).toBe(response.body.linhas);
  });

  it('rejects invalid path', async () => {
    await request(app.getHttpServer())
      .post('/exportacoes/join-recebimentos')
      .send({ path: path.join(pasta, 'missing'), nome: 'x.csv' })
      .expect(400);
  });
});
