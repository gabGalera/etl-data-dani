export type ImportarTransacoesDto = {
  path: string;
};

export type ArquivoImportado = {
  arquivo: string;
  inseridas: number;
  atualizadas: number;
  ignoradas: number;
};

export type ImportacaoResultado = {
  arquivos: ArquivoImportado[];
  inseridas: number;
  atualizadas: number;
  ignoradas: number;
};
