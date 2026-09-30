import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Erro } from './erro.model.js';

export type ErroRegistrado = {
  id: number;
  arquivo: string;
  linha: number | null;
  mensagem: string;
};

@Injectable()
export class ErrosService {
  constructor(@InjectModel(Erro) private readonly erro: typeof Erro) {}

  async registrar(
    arquivo: string,
    linha: number | null,
    mensagem: string,
  ): Promise<ErroRegistrado> {
    const salvo = await this.erro.create({ arquivo, linha, mensagem });
    return {
      id: salvo.id,
      arquivo,
      linha,
      mensagem,
    };
  }
}
