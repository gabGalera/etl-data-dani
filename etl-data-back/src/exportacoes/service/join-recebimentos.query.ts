/** High-water mark for mysql2 row stream — aligns with agreed 1000-row DB read chunks. */
export const JOIN_RECEBIMENTOS_STREAM_HIGH_WATER_MARK = 1000;

/**
 * Recebimentos-driven join export (v1). See docs/adr/0011-export-join-recebimentos.md.
 */
export const JOIN_RECEBIMENTOS_SQL = `
SELECT
  t.cliente AS cliente,
  t.data AS data,
  t.hora AS hora,
  t.adquirente AS adquirente,
  t.idTransAdquirente AS idTransAdquirente,
  t.status AS status,
  t.valorTransacao AS valorTransacao,
  t.tipo AS tipo,
  t.parcelas AS parcelas,
  t.bandeira AS bandeira,
  t.taxaPercentual AS taxaPercentual,
  t.taxaValor AS taxaValor,
  t.valorLiquido AS valorLiquido,
  t.totalReembolsado AS totalReembolsado,
  r.parcelaRecebivel AS parcelaRecebivel,
  r.totalParcelas AS totalParcelas,
  r.taxaPercentual AS \`taxaClient %\`,
  r.taxaValor AS taxaCliente,
  r.valorRepasse AS valorRepasse,
  r.dataRepasse AS dataRepasse,
  rec.dataRecibo AS dataRecibo,
  rec.confirmacao AS confirmacao,
  rec.parcela AS parcelaRecebimento,
  rep.dataRepasse AS repasseClienteData,
  rep.valorRepasse AS repasseClienteValor,
  rep.parcela AS repasseClienteParcela
FROM recebimentos rec
LEFT JOIN transacoes t
  ON t.idTransAdquirente = rec.idTransAdquirente
LEFT JOIN recebiveis r
  ON r.idTransAdquirente = rec.idTransAdquirente
 AND r.parcelaRecebivel = rec.parcela
LEFT JOIN repasses rep
  ON rep.idTransAdquirente = rec.idTransAdquirente
 AND rep.parcela = rec.parcela
`.trim();

export const COUNT_RECEBIMENTOS_SQL =
  'SELECT COUNT(*) AS total FROM recebimentos';

/** Header row labels — same order as SELECT aliases. */
export const JOIN_RECEBIMENTOS_HEADERS = [
  'cliente',
  'data',
  'hora',
  'adquirente',
  'idTransAdquirente',
  'status',
  'valorTransacao',
  'tipo',
  'parcelas',
  'bandeira',
  'taxaPercentual',
  'taxaValor',
  'valorLiquido',
  'totalReembolsado',
  'parcelaRecebivel',
  'totalParcelas',
  'taxaClient %',
  'taxaCliente',
  'valorRepasse',
  'dataRepasse',
  'dataRecibo',
  'confirmacao',
  'parcelaRecebimento',
  'repasseClienteData',
  'repasseClienteValor',
  'repasseClienteParcela',
] as const;

export type JoinRecebimentosField = (typeof JOIN_RECEBIMENTOS_HEADERS)[number];

export const JOIN_RECEBIMENTOS_COLUMNS: {
  header: JoinRecebimentosField;
  field: JoinRecebimentosField;
}[] = JOIN_RECEBIMENTOS_HEADERS.map((header) => ({ header, field: header }));
