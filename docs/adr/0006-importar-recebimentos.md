# Import a single Recebimentos_MP workbook in one synchronous request

Status: accepted

ADR 0005 stored each Excel data line as one recebimento and left loading for later. `POST /recebimentos/importar` now loads that file. `{ path }` is a directory, absolute or relative to the process working directory. The import reads only the regular file named exactly `Recebimentos_MP.xlsx`. Other names, including a Zone.Identifier sidecar, are ignored. Extra worksheets are ignored. The first worksheet must have the headers `Data Recibo MP`, `ID Trans. Adquirente`, and `Confirmacao MP` in that order and no extra columns.

The workbook is parsed as OOXML. There is no CSV step. `jszip` unpacks the archive; cell types stay in this module so Excel date serials and IEEE floats follow the rules below instead of a spreadsheet library's.

`linha` is the sheet row number. Row 1 is the header. A numeric cell in `Data Recibo MP` is an Excel 1900-date serial; text there must be `DD-MM-YYYY`. `DD/MM/YYYY`, empty, and a serial written as text fail that row. Other columns are never dates. `idTransAdquirente` is any non-empty string up to 36 characters, trimmed. `confirmacao` is money at `DECIMAL(12, 2)`: an Excel number, or trimmed text with an optional minus and a `.` decimal. CSV `1.234,56` fails. Cents are the nearest integer of the value times 100. Zero and negatives are allowed. At most ten digits stand before the decimal.

A missing workbook is 422 `Arquivo ausente` with `linha` null, not an empty 200. A valid header and no data rows is 422 `Arquivo vazio`. Any invalid data line fails the file; `ignoradas` is 0. Unreadable bytes are `Arquivo ilegivel`. A write failure is `Falha ao gravar`. Header and cell messages reuse the transacoes catalog (`Cabecalho invalido`, `Linha invalida`, `{header} obrigatorio`, `{header} invalido` / `invalida` for the date). The 422 message is `Falha ao importar recebimentos`.

One transaction upserts on `linha`, refreshes the business columns and `updatedAt`, and keeps `createdAt`. Linhas absent from the sheet are deleted in that same transaction. The file stays in place. Recebimentos copies the transacoes importer shape and does not share a module with transacoes or recebiveis.

The JSON adds `deletadas` on the file and on the totals, and keeps `ignoradas` as 0.

## Considered options

- Take `{ path }` as the xlsx file. The other importers take a directory, and `dados` already mixes this workbook with CSVs.
- Prefix-match `Recebimentos_`. That would pick up `Recebimentos_MP_.xlsx:Zone.Identifier`.
- Treat a missing file as a successful import of zero rows. The sheet is the whole set; absence is a failure.
- Convert to CSV before import. The source is this workbook, updated in place.
- Skip a bad line and keep the previous row for that `linha`. Skipping would leave a stale recebimento.
- Leave absent linhas in the table. The sheet replaces the set.
- Floor IEEE amounts. Flooring `4188.1899999999996` stores `4188.18` instead of the displayed `4188.19`.
- Reuse the CSV money grammar. Every current `Confirmacao MP` cell would fail.
- Detect Excel dates by number format. The column is the date; a numeric cell there is a serial. Confirmacao is never a date.
- Extract a shared importer. The xlsx, the `linha` key, the delete of absent rows, and `deletadas` differ.

## Consequences

- A 422 can follow no durable write. `erros` is committed outside the file transaction.
- Running the same directory again appends a new erro when the file is still missing or still empty.
- An upsert of an unchanged linha still counts as `atualizadas` and refreshes `updatedAt`.
- Inserting or deleting a line in the middle of the sheet still renumbers later linhas, as ADR 0005 said.
- A numeric `Data Recibo MP` below Excel serial 61 (1900-03-01, after the fake leap day) is `Data Recibo MP invalida`. Current rows are in 2026.
- `transacoes` and `recebiveis` are unchanged. There is still no endpoint that lists recebimentos or erros.
