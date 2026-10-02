import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import JSZip from 'jszip';

export type XlsxCell =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'empty' };

export type XlsxRow = {
  linha: number;
  cells: XlsxCell[];
};

const HEADERS = [
  'Data Recibo MP',
  'ID Trans. Adquirente',
  'Confirmacao MP',
] as const;

export async function writeRecebimentosXlsx(
  pasta: string,
  nome: string,
  rows: XlsxRow[],
  options?: { headers?: string[]; extraSheet?: boolean },
): Promise<string> {
  const headers = options?.headers ?? [...HEADERS];
  const strings: string[] = [...headers];
  const dataRows = rows.map((row) => {
    const refs = row.cells.map((cell, index) => {
      const ref = `${columnLetter(index + 1)}${row.linha}`;
      if (cell.kind === 'empty') {
        return `<c r="${ref}"/>`;
      }
      if (cell.kind === 'number') {
        return `<c r="${ref}"><v>${cell.value}</v></c>`;
      }
      const idx = strings.length;
      strings.push(cell.value);
      return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    });
    return `<row r="${row.linha}">${refs.join('')}</row>`;
  });

  const headerCells = headers.map((header, index) => {
    return `<c r="${columnLetter(index + 1)}1" t="s"><v>${index}</v></c>`;
  });
  const sheet0 = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${headerCells.join('')}</row>
    ${dataRows.join('\n    ')}
  </sheetData>
</worksheet>`;

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  ${options?.extraSheet ? `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` : ''}
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="sheet0" sheetId="1" r:id="rId1"/>
    ${options?.extraSheet ? `<sheet name="other" sheetId="2" r:id="rId3"/>` : ''}
  </sheets>
</workbook>`,
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  ${options?.extraSheet ? `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>` : ''}
</Relationships>`,
  );
  zip.file('xl/worksheets/sheet1.xml', sheet0);
  if (options?.extraSheet) {
    zip.file(
      'xl/worksheets/sheet2.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c></row>
  </sheetData>
</worksheet>`,
    );
  }
  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
  ${strings.map((text) => `<si><t>${escapeXml(text)}</t></si>`).join('\n  ')}
</sst>`,
  );

  const arquivo = join(pasta, nome);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  await writeFile(arquivo, buffer);
  return arquivo;
}

function columnLetter(index: number): string {
  let n = index;
  let letter = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
