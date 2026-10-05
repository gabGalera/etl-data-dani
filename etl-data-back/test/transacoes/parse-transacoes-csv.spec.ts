import { describe, expect, it } from 'vitest';
import { parseTransacoesCsv } from '../../src/transacoes/service/parse-transacoes-csv.js';

const HEADER =
  '"ID Transacao";Cliente;Data/Hora;Adquirente;"ID Trans. Adquirente";Status;"Valor Transacao";Tipo;Parcelas;Bandeira;Aut;Cartao;"Taxa %";"Taxa Valor";"Valor Liquido";"Total Reembolsado";"Ultima Atualizacao"';

function csvComDataHora(dataHora: string): string {
  return `${HEADER}\n910001;RUNNERS;"${dataHora}";mercadopago;181226583096;Pago;198,00;"Cartao de Credito";3;visa;229989;"**** 7389";4,74;-9,39;188,61;;"27/09/2026 23:33:01"`;
}

describe('parseTransacoesCsv', () => {
  it('splits Data/Hora into data and hora', () => {
    const { rows } = parseTransacoesCsv(csvComDataHora('04/10/2026 14:05:06'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      data: '2026-10-04',
      hora: '14:05:06',
    });
  });

  it('rejects an impossible calendar date in Data/Hora', () => {
    const { rows, rejeitadas } = parseTransacoesCsv(
      csvComDataHora('31/02/2026 10:00:00'),
    );

    expect(rows).toHaveLength(0);
    expect(rejeitadas).toEqual([
      { linha: 2, mensagem: 'Data/Hora invalida' },
    ]);
  });

  it('rejects a clock time outside range in Data/Hora', () => {
    const { rows, rejeitadas } = parseTransacoesCsv(
      csvComDataHora('04/10/2026 25:00:00'),
    );

    expect(rows).toHaveLength(0);
    expect(rejeitadas).toEqual([
      { linha: 2, mensagem: 'Data/Hora invalida' },
    ]);
  });

  it('rejects Data/Hora without a time part', () => {
    const { rows, rejeitadas } = parseTransacoesCsv(
      csvComDataHora('04/10/2026'),
    );

    expect(rows).toHaveLength(0);
    expect(rejeitadas).toEqual([
      { linha: 2, mensagem: 'Data/Hora invalida' },
    ]);
  });
});
