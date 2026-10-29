# Ignore extra columns in recebiveis_ CSV exports

Status: accepted

The DB manager may add columns to `recebiveis_` files. `parseRecebiveisCsv` still requires every known header from ADR 0004 exactly once, in any order. Additional header names are ignored and their cell values are not stored. A duplicate header name, whether known or extra, still yields `Cabecalho invalido`. Each data line must have one field per header column. The import response is unchanged. This rule applies only to recebiveis CSV import, not to `transacoes_` or recebimentos Excel.
