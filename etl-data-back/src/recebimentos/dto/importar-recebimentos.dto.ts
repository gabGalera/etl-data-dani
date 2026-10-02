export type ImportarRecebimentosDto = {
  path: string;
};

export type ArquivoImportado = {
  arquivo: string;
  inseridas: number;
  atualizadas: number;
  deletadas: number;
  ignoradas: number;
};

export type ImportacaoResultado = {
  arquivos: ArquivoImportado[];
  inseridas: number;
  atualizadas: number;
  deletadas: number;
  ignoradas: number;
};
