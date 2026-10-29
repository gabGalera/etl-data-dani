import { describe, expect, it } from 'vitest';
import {
  LinhaInvalida,
  parseRecebiveisCsv,
} from '../../src/recebiveis/service/parse-recebiveis-csv.js';

const HEADER =
  'Cliente;"ID Transacao";Adquirente;"ID Trans. Adquirente";Tipo;"Data Transacao";"Valor Transacao";"Parcela Recebivel";"Total Parcelas";"Taxa %";"Taxa Valor";"Valor Repasse";"Data Repasse"';

const LINHA =
  'RUNNERS;920001;mercadopago;181226583096;Cartao de Credito;27/09/2026;19.000,00;1;2;7,87;-1.495,30;17.504,70;02/10/2026';

const PARSED = {
  idTransacao: 920001,
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
};

describe('parseRecebiveisCsv', () => {
  it('ignores extra columns appended after the known headers', () => {
    const { rows, ignoradas } = parseRecebiveisCsv(
      `${HEADER};Coluna Extra\n${LINHA};valor ignorado\n`,
    );

    expect(ignoradas).toBe(0);
    expect(rows).toEqual([PARSED]);
  });

  it('ignores extra columns when the header order changes', () => {
    const header =
      'Coluna Extra;Cliente;"ID Transacao";Adquirente;"ID Trans. Adquirente";Tipo;"Data Transacao";"Valor Transacao";"Parcela Recebivel";"Total Parcelas";"Taxa %";"Taxa Valor";"Valor Repasse";"Data Repasse"';
    const linha =
      'extra;RUNNERS;920001;mercadopago;181226583096;Cartao de Credito;27/09/2026;19.000,00;1;2;7,87;-1.495,30;17.504,70;02/10/2026';

    const { rows } = parseRecebiveisCsv(`${header}\n${linha}\n`);

    expect(rows).toEqual([PARSED]);
  });

  it('rejects a duplicate extra column name in the header', () => {
    expect(() =>
      parseRecebiveisCsv(
        `${HEADER};Coluna Extra;Coluna Extra\n${LINHA};a;b\n`,
      ),
    ).toThrow(new LinhaInvalida(1, 'Cabecalho invalido'));
  });

  it('rejects a header that omits a known column', () => {
    const headerSemTaxa = HEADER.replace('"Taxa %";', '');

    expect(() =>
      parseRecebiveisCsv(`${headerSemTaxa}\n${LINHA}\n`),
    ).toThrow(new LinhaInvalida(1, 'Cabecalho invalido'));
  });

  it('rejects a data line with fewer fields than the header row', () => {
    expect(() =>
      parseRecebiveisCsv(`${HEADER};Coluna Extra\n${LINHA}\n`),
    ).toThrow(new LinhaInvalida(2, 'Linha invalida'));
  });
});
