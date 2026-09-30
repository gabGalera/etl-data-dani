import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { ErroRegistrado } from './dto/erro-registrado.dto.js';
import { Erro } from './erro.model.js';

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
