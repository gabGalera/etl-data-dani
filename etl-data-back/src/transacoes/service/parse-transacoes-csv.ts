export class LinhaInvalida extends Error {
  constructor(
    readonly linha: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
  }
}

export type TransacaoImportada = {
  idTransacao: number;
  cliente: string;
  data: string;
  hora: string;
  adquirente: string;
  idTransAdquirente: string | null;
  status: string;
  valorTransacao: string;
  tipo: string;
  parcelas: number;
  bandeira: string | null;
  aut: string | null;
  cartao: string | null;
  taxaPercentual: string | null;
  taxaValor: string | null;
  valorLiquido: string | null;
  totalReembolsado: string | null;
};

export type LinhaRejeitada = {
  linha: number;
  mensagem: string;
};

export type TransacoesParseadas = {
  rows: TransacaoImportada[];
  ignoradas: number;
  rejeitadas: LinhaRejeitada[];
};

const HEADERS = [
  'ID Transacao',
  'Cliente',
  'Data/Hora',
  'Adquirente',
  'ID Trans. Adquirente',
  'Status',
  'Valor Transacao',
  'Tipo',
  'Parcelas',
  'Bandeira',
  'Aut',
  'Cartao',
  'Taxa %',
  'Taxa Valor',
  'Valor Liquido',
  'Total Reembolsado',
  'Ultima Atualizacao',
] as const;

const HEADER_SET = new Set<string>(HEADERS);
const INTEGER_ID = /^\d+$/;
const MONEY = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
const DATA_HORA = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;
const MAX_ID = 2147483647;
const MAX_PARCELAS = 32767;

const TEXT_LIMITS: Record<string, number> = {
  Cliente: 120,
  Adquirente: 32,
  'ID Trans. Adquirente': 36,
  Status: 32,
  Tipo: 32,
  Bandeira: 32,
  Aut: 16,
  Cartao: 32,
};

const MONEY_LIMITS: Record<string, number> = {
  'Valor Transacao': 10,
  'Taxa %': 3,
  'Taxa Valor': 10,
  'Valor Liquido': 10,
  'Total Reembolsado': 10,
};

export function parseTransacoesCsv(text: string): TransacoesParseadas {
  const csv = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = csv.split('\n');
  let columns: Map<string, number> | null = null;
  const seen = new Set<number>();
  const rows: TransacaoImportada[] = [];
  const rejeitadas: LinhaRejeitada[] = [];
  let ignoradas = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const linha = index + 1;
    const line = lines[index].replace(/\r$/, '');
    if (line.trim() === '') {
      continue;
    }

    if (!columns) {
      columns = readHeader(parseFields(line, linha));
      continue;
    }

    try {
      const row = readRow(parseFields(line, linha), columns, linha, seen);
      if (row === null) {
        ignoradas += 1;
      } else {
        rows.push(row);
      }
    } catch (error) {
      if (!(error instanceof LinhaInvalida)) {
        throw error;
      }
      rejeitadas.push({ linha: error.linha, mensagem: error.mensagem });
    }
  }

  if (!columns) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }

  return { rows, ignoradas, rejeitadas };
}

function readRow(
  fields: string[],
  columns: Map<string, number>,
  linha: number,
  seen: Set<number>,
): TransacaoImportada | null {
  if (fields.length !== columns.size) {
    throw new LinhaInvalida(linha, 'Linha invalida');
  }

  const idRaw = cell(fields, columns, 'ID Transacao');
  if (!INTEGER_ID.test(idRaw)) {
    return null;
  }

  const idTransacao = Number(idRaw);
  if (idRaw.length > 10 || idTransacao > MAX_ID) {
    throw new LinhaInvalida(linha, 'ID Transacao invalido');
  }
  if (seen.has(idTransacao)) {
    throw new LinhaInvalida(linha, 'ID Transacao duplicado');
  }

  const dataHora = parseDataHora(cell(fields, columns, 'Data/Hora'), linha);
  const row: TransacaoImportada = {
    idTransacao,
    cliente: requireText(fields, columns, 'Cliente', linha),
    data: dataHora.data,
    hora: dataHora.hora,
    adquirente: requireText(fields, columns, 'Adquirente', linha),
    idTransAdquirente: optionalText(
      fields,
      columns,
      'ID Trans. Adquirente',
      linha,
    ),
    status: requireText(fields, columns, 'Status', linha),
    valorTransacao: requireMoney(fields, columns, 'Valor Transacao', linha),
    tipo: requireText(fields, columns, 'Tipo', linha),
    parcelas: parseParcelas(cell(fields, columns, 'Parcelas'), linha),
    bandeira: optionalText(fields, columns, 'Bandeira', linha),
    aut: optionalText(fields, columns, 'Aut', linha),
    cartao: optionalText(fields, columns, 'Cartao', linha),
    taxaPercentual: optionalMoney(fields, columns, 'Taxa %', linha),
    taxaValor: optionalMoney(fields, columns, 'Taxa Valor', linha),
    valorLiquido: optionalMoney(fields, columns, 'Valor Liquido', linha),
    totalReembolsado: optionalMoney(
      fields,
      columns,
      'Total Reembolsado',
      linha,
    ),
  };
  seen.add(idTransacao);
  return row;
}

function readHeader(fields: string[]): Map<string, number> {
  const columns = new Map<string, number>();
  fields.forEach((field, index) => {
    const name = field.trim();
    if (columns.has(name) || !HEADER_SET.has(name)) {
      throw new LinhaInvalida(1, 'Cabecalho invalido');
    }
    columns.set(name, index);
  });
  if (columns.size !== HEADERS.length) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }
  return columns;
}

function parseFields(line: string, linha: number): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ';') {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (quoted) {
    throw new LinhaInvalida(linha, 'Linha invalida');
  }
  fields.push(current);
  return fields;
}

function cell(
  fields: string[],
  columns: Map<string, number>,
  header: string,
): string {
  return fields[columns.get(header) ?? -1]?.trim() ?? '';
}

function requireText(
  fields: string[],
  columns: Map<string, number>,
  header: string,
  linha: number,
): string {
  const value = cell(fields, columns, header);
  if (value === '') {
    throw new LinhaInvalida(linha, `${header} obrigatorio`);
  }
  if (value.length > TEXT_LIMITS[header]) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  return value;
}

function optionalText(
  fields: string[],
  columns: Map<string, number>,
  header: string,
  linha: number,
): string | null {
  const value = cell(fields, columns, header);
  if (value === '') {
    return null;
  }
  if (value.length > TEXT_LIMITS[header]) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  return value;
}

function requireMoney(
  fields: string[],
  columns: Map<string, number>,
  header: string,
  linha: number,
): string {
  const value = cell(fields, columns, header);
  if (value === '') {
    throw new LinhaInvalida(linha, `${header} obrigatorio`);
  }
  return money(value, header, linha);
}

function optionalMoney(
  fields: string[],
  columns: Map<string, number>,
  header: string,
  linha: number,
): string | null {
  const value = cell(fields, columns, header);
  if (value === '') {
    return null;
  }
  return money(value, header, linha);
}

function money(value: string, header: string, linha: number): string {
  if (!MONEY.test(value)) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  const normalized = value.replaceAll('.', '').replace(',', '.');
  const digits = normalized.replace('-', '').split('.')[0] ?? '';
  if (digits.length > MONEY_LIMITS[header]) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  return normalized;
}

function parseDataHora(
  value: string,
  linha: number,
): { data: string; hora: string } {
  const match = DATA_HORA.exec(value);
  if (!match) {
    throw new LinhaInvalida(linha, 'Data/Hora invalida');
  }
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day) &&
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59;
  if (!valid) {
    throw new LinhaInvalida(linha, 'Data/Hora invalida');
  }
  return {
    data: `${year}-${month}-${day}`,
    hora: `${hour}:${minute}:${second}`,
  };
}

function parseParcelas(value: string, linha: number): number {
  if (!INTEGER_ID.test(value)) {
    throw new LinhaInvalida(linha, 'Parcelas invalido');
  }
  const parcelas = Number(value);
  if (parcelas > MAX_PARCELAS) {
    throw new LinhaInvalida(linha, 'Parcelas invalido');
  }
  return parcelas;
}
