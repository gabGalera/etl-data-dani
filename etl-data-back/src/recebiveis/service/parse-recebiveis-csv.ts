export class LinhaInvalida extends Error {
  constructor(
    readonly linha: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
  }
}

export type RecebivelImportado = {
  idTransacao: number;
  parcelaRecebivel: number;
  cliente: string;
  adquirente: string;
  idTransAdquirente: string;
  tipo: string;
  dataTransacao: string;
  valorTransacao: string;
  totalParcelas: number;
  taxaPercentual: string | null;
  taxaValor: string | null;
  valorRepasse: string;
  dataRepasse: string;
};

export type RecebiveisParseados = {
  rows: RecebivelImportado[];
  ignoradas: number;
};

const HEADERS = [
  'Cliente',
  'ID Transacao',
  'Adquirente',
  'ID Trans. Adquirente',
  'Tipo',
  'Data Transacao',
  'Valor Transacao',
  'Parcela Recebivel',
  'Total Parcelas',
  'Taxa %',
  'Taxa Valor',
  'Valor Repasse',
  'Data Repasse',
] as const;

const HEADER_SET = new Set<string>(HEADERS);
const INTEGER_ID = /^\d+$/;
const MONEY = /^-?\d{1,3}(\.\d{3})*,\d{2}$/;
const DATA = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MAX_ID = 2147483647;
const MAX_PARCELAS = 32767;

const TEXT_LIMITS: Record<string, number> = {
  Cliente: 120,
  Adquirente: 32,
  'ID Trans. Adquirente': 36,
  Tipo: 32,
};

const MONEY_LIMITS: Record<string, number> = {
  'Valor Transacao': 10,
  'Taxa %': 3,
  'Taxa Valor': 10,
  'Valor Repasse': 10,
};

const CAMPOS: (keyof RecebivelImportado)[] = [
  'idTransacao',
  'parcelaRecebivel',
  'cliente',
  'adquirente',
  'idTransAdquirente',
  'tipo',
  'dataTransacao',
  'valorTransacao',
  'totalParcelas',
  'taxaPercentual',
  'taxaValor',
  'valorRepasse',
  'dataRepasse',
];

export function parseRecebiveisCsv(text: string): RecebiveisParseados {
  const csv = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = csv.split('\n');
  let columns: Map<string, number> | null = null;
  const seen = new Map<string, RecebivelImportado>();
  const rows: RecebivelImportado[] = [];
  let ignoradas = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const linha = index + 1;
    const line = lines[index].replace(/\r$/, '');
    if (line.trim() === '') {
      continue;
    }

    const fields = parseFields(line, linha);
    if (!columns) {
      columns = readHeader(fields);
      continue;
    }
    if (fields.length !== columns.size) {
      throw new LinhaInvalida(linha, 'Linha invalida');
    }

    const idRaw = cell(fields, columns, 'ID Transacao');
    if (!INTEGER_ID.test(idRaw)) {
      ignoradas += 1;
      continue;
    }

    const idTransacao = Number(idRaw);
    if (idRaw.length > 10 || idTransacao > MAX_ID) {
      throw new LinhaInvalida(linha, 'ID Transacao invalido');
    }

    const row = lerRecebivel(fields, columns, idTransacao, linha);
    const chave = `${row.idTransacao}:${row.parcelaRecebivel}`;
    const anterior = seen.get(chave);
    if (anterior) {
      if (mesmoRecebivel(anterior, row)) {
        ignoradas += 1;
        continue;
      }
      throw new LinhaInvalida(linha, 'Recebivel duplicado');
    }
    seen.set(chave, row);
    rows.push(row);
  }

  if (!columns) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }

  return { rows, ignoradas };
}

function lerRecebivel(
  fields: string[],
  columns: Map<string, number>,
  idTransacao: number,
  linha: number,
): RecebivelImportado {
  return {
    idTransacao,
    parcelaRecebivel: parseContagem(
      cell(fields, columns, 'Parcela Recebivel'),
      'Parcela Recebivel',
      linha,
    ),
    cliente: requireText(fields, columns, 'Cliente', linha),
    adquirente: requireText(fields, columns, 'Adquirente', linha),
    idTransAdquirente: requireText(
      fields,
      columns,
      'ID Trans. Adquirente',
      linha,
    ),
    tipo: requireText(fields, columns, 'Tipo', linha),
    dataTransacao: parseData(
      cell(fields, columns, 'Data Transacao'),
      'Data Transacao',
      linha,
    ),
    valorTransacao: requireMoney(fields, columns, 'Valor Transacao', linha),
    totalParcelas: parseContagem(
      cell(fields, columns, 'Total Parcelas'),
      'Total Parcelas',
      linha,
    ),
    taxaPercentual: optionalMoney(fields, columns, 'Taxa %', linha),
    taxaValor: optionalMoney(fields, columns, 'Taxa Valor', linha),
    valorRepasse: requireMoney(fields, columns, 'Valor Repasse', linha),
    dataRepasse: parseData(
      cell(fields, columns, 'Data Repasse'),
      'Data Repasse',
      linha,
    ),
  };
}

function mesmoRecebivel(
  left: RecebivelImportado,
  right: RecebivelImportado,
): boolean {
  return CAMPOS.every((campo) => left[campo] === right[campo]);
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

function parseData(value: string, header: string, linha: number): string {
  if (value === '') {
    throw new LinhaInvalida(linha, `${header} obrigatorio`);
  }
  const match = DATA.exec(value);
  if (!match) {
    throw new LinhaInvalida(linha, `${header} invalida`);
  }
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day);
  if (!valid) {
    throw new LinhaInvalida(linha, `${header} invalida`);
  }
  return `${year}-${month}-${day}`;
}

function parseContagem(value: string, header: string, linha: number): number {
  if (value === '') {
    throw new LinhaInvalida(linha, `${header} obrigatorio`);
  }
  if (!INTEGER_ID.test(value)) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  const parsed = Number(value);
  if (parsed < 1 || parsed > MAX_PARCELAS) {
    throw new LinhaInvalida(linha, `${header} invalido`);
  }
  return parsed;
}
