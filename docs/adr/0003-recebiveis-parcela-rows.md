# Store recebiveis as parcela rows without a foreign key

Status: accepted

A `recebiveis_` export line is one parcela of a payment. The `recebiveis` table keeps one camelCase column per business field, with the same SQL types as `transacoes`. The primary key is `(idTransacao, parcelaRecebivel)`. There is no surrogate key and no foreign key. `idTransacao` is the recebivel's own id. `idTransAdquirente` is `STRING(36) NOT NULL` and has a non-unique index. `dataTransacao` and `dataRepasse` are `VARCHAR(10)`, calendar days as `YYYY-MM-DD` text. `taxaPercentual` and `taxaValor` allow null. Sequelize `createdAt` and `updatedAt` record when this system writes the row. `npm run db:migrate` creates the table and records `20261001225400-create-recebiveis`, then changes the date columns and records `20261006185500-recebiveis-datas-varchar`.

## Considered options

- One row per `idTransacao`. A payment can have many parcelas, and `Data Repasse` and `Valor Repasse` differ per parcela, so the row is one parcela.
- Store the spreadsheet `Total` line. It has no `ID Transacao`. A recebivel is a parcela, so that line has no row.
- Use a surrogate auto-increment `id`. The parcela of a payment is already the identity. Three files repeat one parcela on two consecutive identical lines; that second line is the same recebivel.
- Make `idTransacao` a foreign key to `transacoes.idTransacao`. It is the recebivel's own id. 314 recebivel ids in the current files have no transacao.
- Make `idTransAdquirente` a foreign key to `transacoes.idTransAdquirente`. ADR 0001 left that column nullable and non-unique. 289 transacoes omit it, and 314 recebivel values have no matching transacao. A foreign key would reject those recebiveis. These files have no repeated non-empty value, and the matched sales agree on both ids, but the constraint still does not fit.
- Full-join later on `idTransacao`. The future full outer join matches `idTransAdquirente`. Unmatched transacoes and unmatched recebiveis both remain. This migration does not create that query.
- Import `recebiveis_` files in this pass. Loading stays a later decision, as ADR 0002 did for transacoes.

## Consequences

- `transacoes` is unchanged. ADR 0001 still stands: `idTransAdquirente` there can be missing and is not unique.
- A recebivel can be stored when no transacao carries its `idTransAdquirente`.
- A transacao with several parcelas will appear once per parcela in the future full join. A transacao with an empty `idTransAdquirente` cannot match a recebivel on that join.
- MySQL has no `FULL OUTER JOIN` syntax. The future read is a union of both sides.
- `createdAt` and `updatedAt` are MySQL `DATETIME` values written in UTC, same as `transacoes`.
- Column names are camelCase. The table charset is `utf8mb4`.
