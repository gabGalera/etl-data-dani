import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LinhaInvalida,
  parseRepassesXlsx,
} from '../../src/repasses/service/parse-repasses-xlsx.js';
import { writeRepassesXlsx } from './write-repasses-xlsx.js';

describe('parseRepassesXlsx', () => {
  let pasta: string;

  beforeEach(async () => {
    pasta = await mkdtemp(path.join(tmpdir(), 'repasses-parse-'));
  });

  afterEach(async () => {
    await rm(pasta, { recursive: true, force: true });
  });

  it('reads text dates, numeric ids, and IEEE valor as cents', async () => {
    const arquivo = await writeRepassesXlsx(pasta, 'Repasse_Clientes.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '04-04-2026' },
          { kind: 'text', value: '152306875159' },
          { kind: 'number', value: 4188.1899999999996 },
          { kind: 'number', value: 1 },
        ],
      },
      {
        linha: 3,
        cells: [
          { kind: 'text', value: ' 27-09-2026 ' },
          { kind: 'text', value: '181218443578' },
          { kind: 'number', value: -76.97 },
          { kind: 'number', value: 2 },
        ],
      },
    ]);

    const parsed = await parseRepassesXlsx(await readFile(arquivo));
    expect(parsed).toEqual([
      {
        linha: 2,
        idTransAdquirente: '152306875159',
        dataRepasse: '2026-04-04',
        valorRepasse: '4188.19',
        parcela: 1,
      },
      {
        linha: 3,
        idTransAdquirente: '181218443578',
        dataRepasse: '2026-09-27',
        valorRepasse: '-76.97',
        parcela: 2,
      },
    ]);
  });

  it('reads an Excel serial in Data repasse and ignores another sheet', async () => {
    const arquivo = await writeRepassesXlsx(
      pasta,
      'Repasse_Clientes.xlsx',
      [
        {
          linha: 2,
          cells: [
            { kind: 'number', value: 46116 },
            { kind: 'text', value: '152306875159' },
            { kind: 'text', value: '49.75' },
            { kind: 'text', value: '1' },
          ],
        },
      ],
      { extraSheet: true },
    );

    expect(await parseRepassesXlsx(await readFile(arquivo))).toEqual([
      {
        linha: 2,
        idTransAdquirente: '152306875159',
        dataRepasse: '2026-04-04',
        valorRepasse: '49.75',
        parcela: 1,
      },
    ]);
  });

  it('rejects a serial written as text and a CSV money string', async () => {
    const serial = await writeRepassesXlsx(pasta, 'serial.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '46116' },
          { kind: 'text', value: '152306875159' },
          { kind: 'number', value: 1 },
          { kind: 'number', value: 1 },
        ],
      },
    ]);
    await expect(parseRepassesXlsx(await readFile(serial))).rejects.toThrow(
      new LinhaInvalida(2, 'Data repasse invalida'),
    );

    const csvMoney = await writeRepassesXlsx(pasta, 'money.xlsx', [
      {
        linha: 2,
        cells: [
          { kind: 'text', value: '04-04-2026' },
          { kind: 'text', value: '152306875159' },
          { kind: 'text', value: '1.234,56' },
          { kind: 'number', value: 1 },
        ],
      },
    ]);
    await expect(parseRepassesXlsx(await readFile(csvMoney))).rejects.toThrow(
      new LinhaInvalida(2, 'Valor Repasse invalido'),
    );
  });

  it('rejects a missing header column and an empty data sheet', async () => {
    const cabecalho = await writeRepassesXlsx(
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
      { headers: ['Data repasse', 'ID Trans. Adquirente'] },
    );
    await expect(parseRepassesXlsx(await readFile(cabecalho))).rejects.toThrow(
      new LinhaInvalida(1, 'Cabecalho invalido'),
    );

    const vazio = await writeRepassesXlsx(pasta, 'empty.xlsx', []);
    await expect(parseRepassesXlsx(await readFile(vazio))).rejects.toThrow(
      new LinhaInvalida(null, 'Arquivo vazio'),
    );
  });
});
