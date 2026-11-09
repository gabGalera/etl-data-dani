import type { JoinRecebimentosField } from './join-recebimentos.query.js';

/** Same delimiter as transacoes_/recebiveis_ import files in this project. */
export const CSV_DELIMITER = ';';

export function formatCsvHeaderLine(headers: readonly string[]): string {
  return headers.map(escapeCsvField).join(CSV_DELIMITER);
}

export function formatCsvDataLine(
  row: Record<string, unknown>,
  columns: { header: string; field: JoinRecebimentosField | string }[],
): string {
  return columns
    .map(({ field }) => escapeCsvField(stringifyCell(row[field])))
    .join(CSV_DELIMITER);
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsvField(raw: string): string {
  const needsQuotes =
    raw.includes(CSV_DELIMITER) ||
    raw.includes('"') ||
    raw.includes('\n') ||
    raw.includes('\r') ||
    raw.includes(' ');
  if (!needsQuotes) {
    return raw;
  }
  return `"${raw.replaceAll('"', '""')}"`;
}
