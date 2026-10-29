# Store and import Repasse_Clientes by linha

Status: accepted

`Repasse_Clientes.xlsx` is one file, updated in place. The `repasses` table stores one row per data line as a denormalized copy of MP repasse facts for later join or comparison to `recebiveis` on `(idTransAdquirente, parcela)`. The primary key is `linha`, the Excel row number, with the header on row 1 and the first data row on row 2. There is no unique constraint on `(idTransAdquirente, parcela)`; the current workbook has pairs that repeat on two linhas with different dates or amounts.

`idTransAdquirente` is `STRING(36) NOT NULL` with a non-unique index and no foreign key. A non-unique composite index on `(idTransAdquirente, parcela)` supports joins. `dataRepasse` is `VARCHAR(10)`, a calendar day as `YYYY-MM-DD` text. `valorRepasse` is `DECIMAL(12, 2)` and may be negative. `parcela` is `SMALLINT NOT NULL`. Sequelize `createdAt` and `updatedAt` record when this system writes the row. `npm run db:migrate` creates the table and records `20261012220000-create-repasses`.

`POST /repasses/importar` loads that file. `{ path }` is a directory, absolute or relative to the process working directory. The import reads only the regular file named exactly `Repasse_Clientes.xlsx`. Other names, including a Zone.Identifier sidecar, are ignored. Extra worksheets are ignored. The first worksheet must have the headers `Data repasse`, `ID Trans. Adquirente`, `Valor Repasse`, and `Parcela` in that order and no extra columns.

Parsing follows the recebimentos OOXML rules (`jszip`, Excel date serial in `Data repasse`, money in `Valor Repasse` with `.` decimal, non-negative integer `Parcela`). A missing workbook is 422 `Arquivo ausente` with `linha` null. A valid header and no data rows is 422 `Arquivo vazio`. Any invalid data line fails the file; `ignoradas` is 0. The 422 message is `Falha ao importar repasses`.

One transaction upserts on `linha`, refreshes the business columns and `updatedAt`, and keeps `createdAt`. Linhas absent from the sheet are deleted in that same transaction. There is no maquininha reclassification and no reconciliation with `recebiveis` on import. The file stays in place. There is no list endpoint.

The JSON adds `deletadas` on the file and on the totals, and keeps `ignoradas` as 0.

## Considered options

- Unique `(idTransAdquirente, parcela)`. Twenty-three pairs in the current file would make a strict unique index or reject-on-duplicate import fail.
- Prefix-match `Repasse_`. That would pick up sidecar files like recebimentos.
- Shared xlsx parser with recebimentos. Different headers and column names; copy the module as recebimentos did (ADR 0006).
- Maquininha routing on import. Repasse does not drive recebimento vs maquininha; recebimentos and transacoes do (ADR 0008).

## Consequences

- Joining `repasses` to `recebiveis` on `(idTransAdquirente, parcela)` can return multiple repasse rows for one recebivel parcela until a later reconciliation pass defines tie-break rules.
- Inserting or deleting a line in the middle of the sheet renumbers later linhas, as for recebimentos.
- `recebiveis`, `recebimentos`, `transacoes`, and `maquininhas` are unchanged by repasse import.
