import JSZip from 'jszip';

export class LinhaInvalida extends Error {
  constructor(
    readonly linha: number | null,
    readonly mensagem: string,
  ) {
    super(mensagem);
  }
}

export class XlsxIlegivel extends Error {}

export type RecebimentoImportado = {
  linha: number;
  idTransAdquirente: string;
  dataRecibo: string;
  confirmacao: string;
};

const HEADERS = [
  'Data Recibo MP',
  'ID Trans. Adquirente',
  'Confirmacao MP',
] as const;

const DATA_TEXTO = /^(\d{2})-(\d{2})-(\d{4})$/;
const DINHEIRO_TEXTO = /^-?\d+(\.\d+)?$/;
const MAX_INTEIRO = 10;

export async function parseRecebimentosXlsx(
  buffer: Uint8Array,
): Promise<RecebimentoImportado[]> {
  const zip = await unzip(buffer);
  const strings = sharedStrings(await read(zip, 'xl/sharedStrings.xml'));
  const sheet = await firstSheet(zip);
  const rows = parseRows(sheet, strings);
  const header = rows.find((row) => row.linha === 1);
  if (!header) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }
  assertHeader(header.cells);
  const data = rows.filter((row) => row.linha > 1);
  if (data.length === 0) {
    throw new LinhaInvalida(null, 'Arquivo vazio');
  }

  return data.map((row) => lerRecebimento(row));
}

async function unzip(buffer: Uint8Array): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(buffer);
  } catch {
    throw new XlsxIlegivel();
  }
}

async function read(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) {
    return null;
  }
  return file.async('string');
}

function sharedStrings(xml: string | null): string[] {
  if (xml === null) {
    return [];
  }
  const strings: string[] = [];
  for (const si of eachTag(xml, 'si')) {
    const texts = [...si.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)];
    strings.push(texts.map((match) => decodeXml(match[1] ?? '')).join(''));
  }
  return strings;
}

async function firstSheet(zip: JSZip): Promise<string> {
  const workbook = await read(zip, 'xl/workbook.xml');
  const rels = await read(zip, 'xl/_rels/workbook.xml.rels');
  if (workbook === null || rels === null) {
    throw new XlsxIlegivel();
  }
  const sheet = workbook.match(/<(?:\w+:)?sheet\b([^>]*)\/?>/);
  if (sheet === null) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }
  const rid =
    attr(sheet[1] ?? '', 'r:id') ??
    attr(sheet[1] ?? '', 'r:Id') ??
    attr(sheet[1] ?? '', 'id');
  if (rid === null) {
    throw new XlsxIlegivel();
  }
  const target = relationshipTarget(rels, rid);
  if (target === null) {
    throw new XlsxIlegivel();
  }
  const path = target.startsWith('/')
    ? target.slice(1)
    : `xl/${target.replace(/^\.\//, '')}`;
  const xml = await read(zip, path);
  if (xml === null) {
    throw new XlsxIlegivel();
  }
  return xml;
}

function relationshipTarget(rels: string, rid: string): string | null {
  for (const match of rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*)\/?>/g)) {
    const body = match[1] ?? '';
    if (attr(body, 'Id') === rid) {
      return attr(body, 'Target');
    }
  }
  return null;
}

type ParsedRow = { linha: number; cells: Map<number, string | number | null> };

function parseRows(sheet: string, strings: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const rowMatch of sheet.matchAll(
    /<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g,
  )) {
    const linha = Number(attr(rowMatch[1] ?? '', 'r'));
    if (!Number.isInteger(linha) || linha < 1) {
      continue;
    }
    const cells = new Map<number, string | number | null>();
    for (const cellMatch of (rowMatch[2] ?? '').matchAll(
      /<(?:\w+:)?c\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g,
    )) {
      const attrs = cellMatch[1] ?? '';
      const inner = cellMatch[2] ?? '';
      const ref = attr(attrs, 'r');
      if (ref === null) {
        continue;
      }
      const col = columnIndex(ref);
      if (col === 0) {
        continue;
      }
      cells.set(col, cellValue(attrs, inner, strings));
    }
    rows.push({ linha, cells });
  }
  return rows;
}

function cellValue(
  attrs: string,
  inner: string,
  strings: string[],
): string | number | null {
  const type = attr(attrs, 't');
  if (type === 's') {
    const index = Number(vText(inner));
    return strings[index] ?? '';
  }
  if (type === 'inlineStr' || type === 'str') {
    const texts = [...inner.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)];
    if (texts.length > 0) {
      return texts.map((match) => decodeXml(match[1] ?? '')).join('');
    }
    return vText(inner);
  }
  const raw = vText(inner);
  if (raw === '') {
    return null;
  }
  if (type === 'b' || type === 'e') {
    return raw;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : raw;
}

function vText(inner: string): string {
  const match = /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner);
  return match === null ? '' : decodeXml(match[1] ?? '');
}

function assertHeader(cells: Map<number, string | number | null>): void {
  const max = Math.max(0, ...cells.keys());
  if (max !== HEADERS.length) {
    throw new LinhaInvalida(1, 'Cabecalho invalido');
  }
  for (let col = 1; col <= HEADERS.length; col += 1) {
    const value = cells.get(col);
    if (typeof value !== 'string' || value.trim() !== HEADERS[col - 1]) {
      throw new LinhaInvalida(1, 'Cabecalho invalido');
    }
  }
}

function lerRecebimento(row: ParsedRow): RecebimentoImportado {
  const max = Math.max(0, ...row.cells.keys());
  if (max > HEADERS.length) {
    throw new LinhaInvalida(row.linha, 'Linha invalida');
  }
  return {
    linha: row.linha,
    dataRecibo: dataRecibo(row.cells.get(1), row.linha),
    idTransAdquirente: idTransAdquirente(row.cells.get(2), row.linha),
    confirmacao: confirmacao(row.cells.get(3), row.linha),
  };
}

function dataRecibo(
  value: string | number | null | undefined,
  linha: number,
): string {
  if (value === null || value === undefined || value === '') {
    throw new LinhaInvalida(linha, 'Data Recibo MP obrigatorio');
  }
  if (typeof value === 'number') {
    const iso = serialIso(value);
    if (iso === null) {
      throw new LinhaInvalida(linha, 'Data Recibo MP invalida');
    }
    return iso;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new LinhaInvalida(linha, 'Data Recibo MP obrigatorio');
  }
  const match = DATA_TEXTO.exec(trimmed);
  if (match === null) {
    throw new LinhaInvalida(linha, 'Data Recibo MP invalida');
  }
  const iso = calendarIso(Number(match[1]), Number(match[2]), Number(match[3]));
  if (iso === null) {
    throw new LinhaInvalida(linha, 'Data Recibo MP invalida');
  }
  return iso;
}

function idTransAdquirente(
  value: string | number | null | undefined,
  linha: number,
): string {
  if (value === null || value === undefined) {
    throw new LinhaInvalida(linha, 'ID Trans. Adquirente obrigatorio');
  }
  const text = String(value).trim();
  if (text === '') {
    throw new LinhaInvalida(linha, 'ID Trans. Adquirente obrigatorio');
  }
  if (text.length > 36) {
    throw new LinhaInvalida(linha, 'ID Trans. Adquirente invalido');
  }
  return text;
}

function confirmacao(
  value: string | number | null | undefined,
  linha: number,
): string {
  if (value === null || value === undefined || value === '') {
    throw new LinhaInvalida(linha, 'Confirmacao MP obrigatorio');
  }
  let amount: number;
  if (typeof value === 'number') {
    amount = value;
  } else {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new LinhaInvalida(linha, 'Confirmacao MP obrigatorio');
    }
    if (!DINHEIRO_TEXTO.test(trimmed)) {
      throw new LinhaInvalida(linha, 'Confirmacao MP invalido');
    }
    amount = Number(trimmed);
  }
  if (!Number.isFinite(amount)) {
    throw new LinhaInvalida(linha, 'Confirmacao MP invalido');
  }
  const cents = Math.round(amount * 100);
  const inteiro = Math.floor(Math.abs(cents) / 100);
  if (String(inteiro).length > MAX_INTEIRO) {
    throw new LinhaInvalida(linha, 'Confirmacao MP invalido');
  }
  return (cents / 100).toFixed(2);
}

function serialIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 61) {
    return null;
  }
  const utc = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  const date = new Date(utc);
  return calendarIso(
    date.getUTCDate(),
    date.getUTCMonth() + 1,
    date.getUTCFullYear(),
  );
}

function calendarIso(day: number, month: number, year: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function columnIndex(ref: string): number {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref);
  if (match === null) {
    return 0;
  }
  let col = 0;
  for (const ch of match[1]?.toUpperCase() ?? '') {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return col;
}

function eachTag(xml: string, tag: string): string[] {
  const bodies: string[] = [];
  const pattern = new RegExp(
    `<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`,
    'g',
  );
  for (const match of xml.matchAll(pattern)) {
    bodies.push(match[1] ?? '');
  }
  return bodies;
}

function attr(body: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i').exec(body);
  return match?.[1] ?? null;
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}
