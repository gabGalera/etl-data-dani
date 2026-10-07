# Maquininhas table for recebiveis without a transacao

Status: accepted

A **maquininha** is one parcela line that would be a recebivel, but no row in `transacoes` has the same `idTransacao`. The `maquininhas` table uses the same camelCase column contract as `recebiveis` (duplicated in `maquininha.schema.ts`, not shared), including composite primary key `(idTransacao, parcelaRecebivel)`, non-unique index `maquininhas_id_trans_adquirente` on `idTransAdquirente`, `dataTransacao` and `dataRepasse` as `VARCHAR(10)`, and Sequelize `createdAt` / `updatedAt`. There is no foreign key to `transacoes` or `recebiveis`. `npm run db:migrate` creates the table and records `20261006193000-create-maquininhas`.

## Considered options

- One table only and query orphans with a left join. The product wants a named home for maquininhas and split storage at import time.
- Shared `ModelAttributes` between `recebiveis` and `maquininhas`. Kept separate so either table can diverge without coupling migrations.
- Separate `maquininhas_` export files. Data still comes from `recebiveis_` CSV; routing is application logic, not a second file prefix.
- Backfill existing orphan rows from `recebiveis` into `maquininhas` in the create migration. Not done. The next `recebiveis_` import of that parcela moves it.
- `POST /maquininhas/importar`. There is a `MaquininhasModule` with the routing service and no HTTP route. Recebiveis and transacoes import that module so neither feature module depends on the other.
- Fold maquininhas counts into the existing `inseridas` / `atualizadas` totals. Those fields stay recebiveis-only. Each file adds `maquininhas: { inseridas, atualizadas }`, and the response adds `maquininhasInseridas` and `maquininhasAtualizadas`.
- Copy the split and move rules into both importers. `RotearParcelaRecebivelService` owns them.

## Import behavior

`POST /recebiveis/importar` still reads `recebiveis_` files. For each file, one transaction:

- One `IN` query loads the distinct `idTransacao` values that exist in `transacoes`.
- A row whose id exists is upserted into `recebiveis` and removed from `maquininhas` when that primary key is there.
- A row whose id does not exist is upserted into `maquininhas` and removed from `recebiveis` when that primary key is there.
- Upsert rules match the previous recebiveis import (`updateOnDuplicate` on the business columns and `updatedAt`). `ignoradas` stays the parser count and is not split by table.
- `inseridas` and `atualizadas` on each file and at the top level count recebiveis only.

`POST /transacoes/importar` is unchanged in its JSON. In the same transaction as the transacao upsert, every `idTransacao` in that file (insert or update) moves its `maquininhas` rows into `recebiveis` (upsert, including when the recebivel primary key already exists) and then deletes those maquininhas. There is no delete route for transacoes; a later `recebiveis_` import routes from whatever is in `transacoes` at that moment.

Match is `idTransacao` only. The same `(idTransacao, parcelaRecebivel)` is never left in both tables.

## Consequences

- Existing recebiveis totals keep their meaning. Clients that only read `inseridas` / `atualizadas` / `ignoradas` still see recebiveis.
- `Maquininha` is registered through `MaquininhasModule`, which recebiveis and transacoes import.
- CONTEXT.md defines **Maquininha** as distinct from **Recebivel** even though columns match today.
- Rows already stored in `recebiveis` without a transacao stay there until the next `recebiveis_` import of that parcela.
