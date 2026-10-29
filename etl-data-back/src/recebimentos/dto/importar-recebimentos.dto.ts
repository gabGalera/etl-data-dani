export type ImportarRecebimentosDto = {
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
  deletadas: number;
  ignoradas: number;
  maquininhas: ContagemMaquininhas;
};

export type ImportacaoResultado = {
  arquivos: ArquivoImportado[];
  inseridas: number;
  atualizadas: number;
  deletadas: number;
  ignoradas: number;
  maquininhasInseridas: number;
  maquininhasAtualizadas: number;
};
