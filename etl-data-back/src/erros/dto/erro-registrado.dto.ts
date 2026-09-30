export type ErroRegistrado = {
  id: number;
  arquivo: string;
  linha: number | null;
  mensagem: string;
};
