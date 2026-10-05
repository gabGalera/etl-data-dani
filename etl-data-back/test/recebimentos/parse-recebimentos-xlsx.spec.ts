import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LinhaInvalida,
  parseRecebimentosXlsx,
} from '../../src/recebimentos/service/parse-recebimentos-xlsx.js';
import { writeRecebimentosXlsx } from './write-recebimentos-xlsx.js';

describe('parseRecebimentosXlsx', () => {
  let pasta: string;

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'recebimentos-parse-'));
  });

  afterEach(async () => {
    await rm(pasta, { recursive: true, force: true });
  });

  it('reads text dates, numeric ids, and IEEE confirmacao as cents', async () => {
    const arquivo = await writeRecebimentosXlsx(pasta, 'Recebimentos_MP.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '04-04-2026' },
          { kind: 'text', value: '152306875159' },
          { kind: 'number', value: 4188.1899999999996 },
        ],
      },
      {
        linha: 3,
        cells: [
          { kind: 'text', value: ' 27-09-2026 ' },
          { kind: 'text', value: '181218443578' },
          { kind: 'number', value: -76.97 },
        ],
      },
    ]);

    const parsed = await parseRecebimentosXlsx(await readFile(arquivo));
    expect(parsed).toEqual([
      {
        linha: 2,
        idTransAdquirente: '152306875159',
        dataRecibo: '2026-04-04',
        confirmacao: '4188.19',
      },
      {
        linha: 3,
        idTransAdquirente: '181218443578',
        dataRecibo: '2026-09-27',
        confirmacao: '-76.97',
      },
    ]);
  });

  it('reads an Excel serial in Data Recibo MP and ignores another sheet', async () => {
    const arquivo = await writeRecebimentosXlsx(
      pasta,
      'Recebimentos_MP.xlsx',
      [
        {
          linha: 2,
          cells: [
            { kind: 'number', value: 46116 },
            { kind: 'text', value: '152306875159' },
            { kind: 'text', value: '729.14' },
          ],
        },
      ],
      { extraSheet: true },
    );

    expect(await parseRecebimentosXlsx(await readFile(arquivo))).toEqual([
      {
        linha: 2,
        idTransAdquirente: '152306875159',
        dataRecibo: '2026-04-04',
        confirmacao: '729.14',
      },
    ]);
  });

  it('rejects a serial written as text and a CSV money string', async () => {
    const serial = await writeRecebimentosXlsx(pasta, 'serial.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '46116' },
          { kind: 'text', value: '152306875159' },
          { kind: 'number', value: 1 },
        ],
      },
    ]);
    await expect(parseRecebimentosXlsx(await readFile(serial))).rejects.toThrow(
      new LinhaInvalida(2, 'Data Recibo MP invalida'),
    );

    const csvMoney = await writeRecebimentosXlsx(pasta, 'money.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '04-04-2026' },
          { kind: 'text', value: '152306875159' },
          { kind: 'text', value: '1.234,56' },
        ],
      },
    ]);
    await expect(parseRecebimentosXlsx(await readFile(csvMoney))).rejects.toThrow(
      new LinhaInvalida(2, 'Confirmacao MP invalido'),
    );
  });

  it('rejects a missing header column and an empty data sheet', async () => {
    const cabecalho = await writeRecebimentosXlsx(
      pasta,
      'header.xlsx',
      [
        {
          linha: 2,
          cells: [
            { kind: 'text', value: '04-04-2026' },
            { kind: 'text', value: '152306875159' },
            { kind: 'number', value: 1 },
          ],
        },
      ],
      { headers: ['Data Recibo MP', 'ID Trans. Adquirente'] },
    );
    await expect(parseRecebimentosXlsx(await readFile(cabecalho))).rejects.toThrow(
      new LinhaInvalida(1, 'Cabecalho invalido'),
    );

    const vazio = await writeRecebimentosXlsx(pasta, 'empty.xlsx', []);
    await expect(parseRecebimentosXlsx(await readFile(vazio))).rejects.toThrow(
      new LinhaInvalida(null, 'Arquivo vazio'),
    );
  });
});
