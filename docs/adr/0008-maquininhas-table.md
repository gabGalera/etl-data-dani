# Maquininhas table for transacoes without a recebimento

Status: accepted

A **maquininha** is one transacao row that has no recebimento with the same `idTransAdquirente`. The `maquininhas` table uses the same camelCase column contract as `transacoes` (duplicated in `maquininha.schema.ts`, not shared), including primary key `idTransacao`, non-unique index `maquininhas_id_trans_adquirente` on `idTransAdquirente`, `data` as `VARCHAR(10)`, and Sequelize `createdAt` / `updatedAt`. There is no foreign key to `transacoes` or `recebimentos`. `npm run db:migrate` creates the table, records `20261006193000-create-maquininhas`, recreates it with the transacao shape in `20261012130000-maquininhas-transacoes-shape`, and adds `recebimentos.parcela` in `20261012130100-recebimentos-parcela`.

Match is `idTransAdquirente` only. `recebimentos.parcela` is stored from the workbook but does not affect maquininha routing. A transacao with null `idTransAdquirente` is always stored in `maquininhas`. The same `idTransacao` is never left in both `transacoes` and `maquininhas`.

## Considered options

- One table only and query orphans with a left join. The product wants a named home for maquininhas and split storage at import time.
- Shared `ModelAttributes` between `transacoes` and `maquininhas`. Kept separate so either table can diverge without coupling migrations.
- Route recebiveis parcelas into `maquininhas` when no transacao exists. Replaced by transacao/recebimento routing; recebiveis always land in `recebiveis`.
- Fold maquininhas counts into `inseridas` / `atualizadas` on transacoes import. Those fields stay transacoes-only. Each file adds `maquininhas: { inseridas, atualizadas }`, and the response adds `maquininhasInseridas` and `maquininhasAtualizadas`.
- Copy the split rules into both importers. `RotearTransacaoMaquininhaService` owns them.

## Import behavior

`POST /transacoes/importar` still reads `transacoes_` files. For each file, one transaction:

- One query loads the distinct `idTransAdquirente` values that exist in `recebimentos`.
- A row whose id appears there is upserted into `transacoes` and removed from `maquininhas` when that `idTransacao` is there.
- A row whose id does not appear (including null) is upserted into `maquininhas` and removed from `transacoes` when that `idTransacao` is there.
- Upsert rules match the previous transacoes import (`updateOnDuplicate` on the business columns and `updatedAt`). `ignoradas` stays the parser count and is not split by table.
- `inseridas` and `atualizadas` on each file and at the top level count transacoes only.

`POST /recebimentos/importar` still replaces the recebimento set from `Recebimentos_MP.xlsx` (now with required `PARCELA`). In the same transaction as the recebimento upsert and delete of absent linhas, every transacao and maquininha row is reclassified from the current recebimento ids.

`POST /recebiveis/importar` does not read or write `maquininhas`.

## Consequences

- Existing transacoes totals on the import response keep their meaning.
- `Maquininha` is registered through `MaquininhasModule`, which transacoes and recebimentos import.
- CONTEXT.md defines **Maquininha** as distinct from **Transacao** even though columns match today.
- Rows already stored in `transacoes` without a matching recebimento stay there until the next transacoes or recebimentos import reclassifies them.
