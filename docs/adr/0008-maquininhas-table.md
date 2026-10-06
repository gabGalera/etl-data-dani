# Maquininhas table for recebiveis without a transacao

Status: accepted

A **maquininha** is one parcela line that would be a recebivel, but no row in `transacoes` has the same `idTransacao`. The `maquininhas` table uses the same camelCase column contract as `recebiveis` (duplicated in `maquininha.schema.ts`, not shared), including composite primary key `(idTransacao, parcelaRecebivel)`, non-unique index `maquininhas_id_trans_adquirente` on `idTransAdquirente`, `dataTransacao` and `dataRepasse` as `VARCHAR(10)`, and Sequelize `createdAt` / `updatedAt`. There is no foreign key to `transacoes` or `recebiveis`. `npm run db:migrate` creates the table and records `20261006193000-create-maquininhas`.

## Considered options

- One table only and query orphans with a left join. The product wants a named home for maquininhas and split storage at import time.
- Shared `ModelAttributes` between `recebiveis` and `maquininhas`. Kept separate so either table can diverge without coupling migrations.
- Separate `maquininhas_` export files. Data still comes from `recebiveis_` CSV; routing is application logic, not a second file prefix.
- Backfill existing orphan rows from `recebiveis` into `maquininhas` in this migration. Deferred; table starts empty until import split ships. Re-import or manual fix is acceptable in dev.
- Nest module and `POST /maquininhas/importar`. Out of scope; only schema, Sequelize model, and model contract test in this pass.

## Planned import behavior (not implemented here)

When `recebiveis_` import is updated:

- If `idTransacao` exists in `transacoes`, upsert into `recebiveis` only.
- If not, upsert into `maquininhas` only (never both).
- Same duplicate-key upsert semantics as recebiveis import today, per table.
- If a row already sits in `recebiveis` but has no transacao, move it to `maquininhas` on import to enforce split storage.
- When a transacao is imported for an `idTransacao` that has rows in `maquininhas`, move those rows to `recebiveis` and remove them from `maquininhas`.

Match transacao by `idTransacao` only.

## Consequences

- `recebiveis` and import code are unchanged until the follow-up.
- `Maquininha` is not registered in `SequelizeModule.forFeature` yet; only tests load the model.
- CONTEXT.md defines **Maquininha** as distinct from **Recebivel** even though columns match today.
