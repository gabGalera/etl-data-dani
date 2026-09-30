# Import a folder of transacoes in one synchronous request

Status: accepted

`POST /transacoes/importar` receives an absolute directory path, reads every regular file whose name starts with `transacoes_`, and upserts rows on `idTransacao`. A row whose `ID Transacao` is not an integer is skipped. A file that cannot be parsed, or that repeats an id, is rolled back and recorded as an erro. The handler continues through the remaining files and, if any erro was recorded, responds 422. Good files stay committed. Files are left in place. Adquirente text is stored as exported.

## Considered options

- Stop at the first bad file. We finish the folder so one bad file does not hide the next.
- Roll the whole request back. Good files stay committed, and a rerun upserts them.
- Treat the spreadsheet `Total` line as a failure. We skip any non-integer `ID Transacao` and count it as `ignoradas`.
- Normalize `mercadopago` and `MERCADO_PAGO` to one name. We keep the export spelling.
- Move or delete files after a successful import. We leave them, because a second run is safe.
- Add a read endpoint for erros. This pass only writes `erros` and returns the rows saved by the failing call.
- Accept only a path under a configured root. The process reads any absolute directory it can read. Compose mounts `./dados` read-only at `/dados`.

## Consequences

- A 422 can follow a durable partial import. `erros` is committed outside the file transaction, so the rollback does not erase it.
- The erros table and the write of an erro live in the erros module. Transacoes imports that module and does not own the Erro model.
- Running the same folder again appends new erros. It does not replace the earlier ones.
- Updating a transacao refreshes the business columns and `updatedAt`, and keeps `createdAt`.
- There is still no endpoint that lists transacoes or erros.
- Loading the CSV files, left out of ADR 0001, happens through this endpoint. Column types stay as that ADR defined them.
