# Maquininhas table for recebimentos without a transacao

Status: accepted

A **maquininha** is one recebimento line whose `idTransAdquirente` matches no row in `transacoes`. In practice those lines often come from another company's terminal on the adquirente receipt, while `transacoes_` exports only this cliente's sales. The `maquininhas` table uses the same camelCase column contract as `recebimentos` (duplicated in `maquininha.schema.ts`, not shared), including primary key `linha`, non-unique index `maquininhas_id_trans_adquirente` on `idTransAdquirente`, `dataRecibo` as `VARCHAR(10)`, required `parcela`, and Sequelize `createdAt` / `updatedAt`. There is no foreign key to `recebimentos` or `transacoes`. A row lives in **either** `recebimentos` or `maquininhas`, never both. `npm run db:migrate` creates the table, records `20261006193000-create-maquininhas`, recreates it with the transacao shape in `20261012130000-maquininhas-transacoes-shape`, adds `recebimentos.parcela` in `20261012130100-recebimentos-parcela`, and recreates `maquininhas` with the recebimento shape in `20261028140000-maquininhas-recebimento-shape`.

Match is `idTransAdquirente` only. `parcela` is stored but does not affect maquininha routing. The same `linha` is never left in both `recebimentos` and `maquininhas`.

## Considered options

- One table only and query orphans with a left join. The product wants a named home for maquininhas and split storage at import time.
- Keep transacao-shaped `maquininhas` and route transacoes without recebimentos there. Replaced: maquininha is recebimento-driven; transacoes import loads only `transacoes`.
- Shared `ModelAttributes` between `recebimentos` and `maquininhas`. Kept separate so either table can diverge without coupling migrations.
- Fold maquininhas counts into transacoes import. Those fields moved to recebimentos import only.

## Import behavior

`POST /transacoes/importar` still reads `transacoes_` files. For each file, one transaction upserts every parsed row into `transacoes` (same `updateOnDuplicate` rules as before). Then `RotearRecebimentoMaquininhaService` reclassifies existing recebimento and maquininha rows: maquininha rows whose `idTransAdquirente` now appears on a transacao move to `recebimentos`; recebimento rows whose id matches no transacao move to `maquininhas`. The response counts transacoes only (`inseridas`, `atualizadas`, `ignoradas`).

`POST /recebimentos/importar` still replaces the recebimento set from `Recebimentos_MP.xlsx`. In the same transaction, each parsed line is upserted into `recebimentos` when its `idTransAdquirente` exists on a transacao, and into `maquininhas` otherwise; linhas absent from the sheet are removed from both tables. The response adds per-file and top-level `maquininhasInseridas` and `maquininhasAtualizadas` alongside recebimento counts.

`POST /recebiveis/importar` does not read or write `maquininhas`.

## Consequences

- Transacoes import totals keep their previous meaning for `transacoes` rows.
- `Maquininha` is registered through `MaquininhasModule`, which transacoes and recebimentos import.
- CONTEXT.md defines **Maquininha** as distinct from **Recebimento** even though columns match today.
