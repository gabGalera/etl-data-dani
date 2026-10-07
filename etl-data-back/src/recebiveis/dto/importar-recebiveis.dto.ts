export type ImportarRecebiveisDto = {
  path: string;
};

export type ContagemMaquininhas = {
  inseridas: number;
  atualizadas: number;
};

export type ArquivoImportado = {
  arquivo: string;
  inseridas: number;
  atualizadas: number;
  ignoradas: number;
  maquininhas: ContagemMaquininhas;
};

export type ImportacaoResultado = {
  arquivos: ArquivoImportado[];
  inseridas: number;
  atualizadas: number;
  ignoradas: number;
  maquininhasInseridas: number;
  maquininhasAtualizadas: number;
};
