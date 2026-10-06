# Import a folder of recebiveis in one synchronous request

Status: accepted

ADR 0003 stored each export line as one parcela and left loading for later. `POST /recebiveis/importar` now loads a directory the way ADR 0002 loads transacoes: `{ path }`, every regular file named `recebiveis_`, one transaction per file, continue after a bad file, append an erro, respond 422 `Falha ao importar recebiveis` when any erro was recorded, leave the CSVs in place, and upsert on `(idTransacao, parcelaRecebivel)`. A non-integer `ID Transacao`, including the spreadsheet `Total` line, is `ignoradas`. An empty `Taxa %` or `Taxa Valor` is null. `Parcela Recebivel` and `Total Parcelas` are integers from 1 through 32767. Adquirente text is stored as exported. Recebiveis keeps its own parser, service, and exception.

## Considered options

- Extract a shared importer with transacoes. The header, the composite key, the required `idTransAdquirente`, the calendar-day columns, and the repeated-parcela rule differ, so this pass copies the shape and leaves transacoes alone.
- Fail a file when `(idTransacao, parcelaRecebivel)` repeats, as a repeated transacao id fails. Three export files repeat one parcela on the next line with the same columns. That later line is `ignoradas` and the first is kept. A later line whose parsed columns differ rolls the file back with `Recebivel duplicado`.
- Treat an empty fee as a broken row. Both fee columns are nullable, and one parcela in the April file has both empty with repasse equal to the gross amount.
- Accept parcela `0`. A parcela recebivel starts at 1.
- Normalize `mercadopago` and `MERCADO_PAGO`. We keep the export spelling.
- Stop at the first bad file, roll back the whole request, move the files, or add a list endpoint. Same rejection as ADR 0002.

## Consequences

- A 422 can follow a durable partial import. `erros` is committed outside the file transaction.
- Recebiveis imports the erros module and does not own the Erro model. The file path is what distinguishes a recebivel erro.
- Running the same folder again appends new erros. An upsert refreshes the business columns and `updatedAt`, and keeps `createdAt`.
- A later file in the same request upserts the same parcela. Files are sorted by basename.
- `ignoradas` counts both the `Total` line and an identical repeated parcela. The response does not say which.
- There is still no endpoint that lists recebiveis or erros.
