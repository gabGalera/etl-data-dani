export type ExportarJoinRecebimentosDto = {
  path: string;
  nome: string;
};

export type ExportacaoJoinResultado = {
  arquivo: string;
  linhas: number;
  /** Rows in `recebimentos` before export (join rows can exceed this). */
  totalRecebimentos: number;
};
