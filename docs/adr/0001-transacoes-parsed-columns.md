# Store transacoes as parsed camelCase columns

Status: accepted

The `transacoes` table keeps one camelCase column per field in the export files, with SQL types instead of the original text. `Data/Hora` is split into `data` (`DATE`) and `hora` (`TIME`). `Ultima Atualizacao` is not stored. Sequelize `createdAt` and `updatedAt` record when this system writes the row. The Nest app connects with `synchronize: false`. `npm run db:migrate` creates the table.

## Considered options

- Keep `Data/Hora` as one datetime. We split it into `data` and `hora`.
- Keep `Ultima Atualizacao` from the export, alone or beside Sequelize timestamps. We dropped it and kept `createdAt` and `updatedAt`.
- Store every value as text, matching the CSV. We parse dates, times, counts, and money.
- Use a surrogate auto-increment `id`. `idTransacao` is the primary key and is not auto-increment, so inserts must supply it.
- Make `idTransAdquirente` unique. It is a non-unique index and it allows null.
- Call `sequelize.sync()` on boot. Startup only connects. The migration command creates the table and records `20260928160000-create-transacoes` in `SequelizeMeta`.
- Point the compose `app` service at MySQL. The host process uses `127.0.0.1:3307` with the compose credentials as defaults (`etl` / `etl`, database `etl_data`), overridable by `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME`.

## Consequences

- Loading the CSV files is decided in ADR 0002. The export's last-update time is not in the database. `createdAt` and `updatedAt` are set when a row is inserted or updated here.
- `createdAt` and `updatedAt` are MySQL `DATETIME` values written in UTC (`timezone: '+00:00'`).
- Column names are stored in camelCase. The table charset is `utf8mb4`.
- Running `db:migrate` again after `SequelizeMeta` has the migration name leaves `transacoes` unchanged.
- MySQL commits `CREATE TABLE` immediately, so a failure after the table exists and before `SequelizeMeta` is written is recovered by running `db:migrate` again: the existing table is kept and the migration name is recorded.
