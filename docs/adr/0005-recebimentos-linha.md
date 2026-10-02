# Identify a recebimento by its linha

Status: accepted

`Recebimentos_MP` is one file, updated in place. The `recebimentos` table stores one row per data line. The primary key is `linha`, the Excel row number, with the header on row 1 and the first recebimento on row 2. `idTransAdquirente` is `STRING(36) NOT NULL` with a non-unique index and no foreign key. `dataRecibo` is `DATEONLY`. `confirmacao` is `DECIMAL(12, 2)` and may be negative. Sequelize `createdAt` and `updatedAt` record when this system writes the row. `npm run db:migrate` creates the table and records `20261002173200-create-recebimentos`. This pass does not load the file.

## Considered options

- Primary key `(linha, idTransAdquirente)`. Every current Excel row is already unique, and 95 adquirente ids repeat with a different `confirmacao`, often a later reversal. A composite key would store an id correction on an existing line as a second row.
- Number `linha` from 1 for the first data row. The sheet's own row number is the place that stays put when the file is edited.
- Foreign key from `idTransAdquirente` to `recebiveis`. The same id appears on several recebimentos, and a recebimento can be stored when no recebivel carries it.
- Import the file in this pass. Loading stays a later decision, as ADR 0003 did for recebiveis.

## Consequences

- A recebimento keeps its row when the amount or the adquirente id on that line changes. Inserting or deleting a line in the middle of the sheet would renumber later linhas.
- `recebiveis` and `transacoes` are unchanged. Neither id column becomes unique.
- Column names are camelCase. The table charset is `utf8mb4`.
