# Export join recebimentos to CSV

Status: accepted

`POST /exportacoes/join-recebimentos` writes one CSV on disk by streaming a SQL join from MySQL. The body is `{ "path": "<directory>", "nome": "<filename>" }`, matching import endpoints on path validation (`path` must be an existing readable and writable directory). `nome` must be a single path segment (no `/` or `..`). Each POST always writes a **new** file: `stem_<timestamp>.csv` derived from `nome` (never overwrites an existing path).

The join is **recebimentos-driven**: one output row per row in `recebimentos`. `maquininhas` is out of scope for v1.

| Table | Join predicate |
|--------|----------------|
| `transacoes` | `transacoes.idTransAdquirente = recebimentos.idTransAdquirente` (parcela not used) |
| `recebiveis` | same `idTransAdquirente` and `recebiveis.parcelaRecebivel = recebimentos.parcela` |
| `repasses` | same `idTransAdquirente` and `repasses.parcela = recebimentos.parcela` |

Transacoes with no recebimento never appear. A recebimento line without a matching transacao still appears with empty transacao columns. Multiple transacoes sharing one `idTransAdquirente` can duplicate recebimento rows (ADR 0001). There are no filters in v1.

Column order and CSV headers follow the agreed SELECT list; recebivel `taxaPercentual` is exported as `taxaClient %`. The delimiter is `;` (same as `transacoes_` / `recebiveis_` imports). Null SQL cells become empty fields.

Implementation reads via the mysql2 query stream behind Sequelize (`highWaterMark` 1000), formats rows incrementally, and pipes to a single local file (no HTTP download, no split files). The JSON response is `{ "arquivo": "<absolute path>", "linhas": <data row count>, "totalRecebimentos": <COUNT(*) from recebimentos> }`. `linhas` is the number of streamed join rows written (header not counted); `totalRecebimentos` is the recebimentos table size before export. `linhas` can exceed `totalRecebimentos` when more than one transacao shares the same `idTransAdquirente` (ADR 0001).

SQL and headers live in `etl-data-back/src/exportacoes/service/join-recebimentos.query.ts`. Out of scope: `maquininhas`, query filters, configurable batch size, multi-file batches.
