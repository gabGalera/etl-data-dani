import { describe, expect, it } from 'vitest';
import {
  CSV_DELIMITER,
  formatCsvDataLine,
  formatCsvHeaderLine,
} from '../../src/exportacoes/service/csv-row.js';
import {
  JOIN_RECEBIMENTOS_COLUMNS,
  JOIN_RECEBIMENTOS_HEADERS,
} from '../../src/exportacoes/service/join-recebimentos.query.js';

describe('formatCsvHeaderLine', () => {
  it('quotes headers that contain spaces and percent', () => {
    const line = formatCsvHeaderLine(JOIN_RECEBIMENTOS_HEADERS);
    expect(line).toContain(`"taxaClient %"`);
    expect(line.split(CSV_DELIMITER)).toHaveLength(
      JOIN_RECEBIMENTOS_HEADERS.length,
    );
  });
});

describe('formatCsvDataLine', () => {
  it('emits fields in column order with empty cells for null', () => {
    const row = Object.fromEntries(
      JOIN_RECEBIMENTOS_HEADERS.map((header) => [header, 'x']),
    ) as Record<string, unknown>;
    row.cliente = 'RUNNERS';
    row.data = '2026-04-04';
    row.hora = '23:32:38';
    row['taxaClient %'] = '1.50';
    row.totalReembolsado = null;

    const line = formatCsvDataLine(row, JOIN_RECEBIMENTOS_COLUMNS);
    expect(line.startsWith('RUNNERS;2026-04-04;23:32:38')).toBe(true);
    expect(line).toContain(';1.50;');
    const parts = line.split(CSV_DELIMITER);
    const idxTotalReembolsado = JOIN_RECEBIMENTOS_HEADERS.indexOf(
      'totalReembolsado',
    );
    expect(parts[idxTotalReembolsado]).toBe('');
  });
});
