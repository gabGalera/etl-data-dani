import type { QueryInterface } from 'sequelize';
import {
  RECEBIMENTOS_TABLE,
  addRecebimentosParcela,
} from '../../src/recebimentos/repository/recebimento.schema.js';

describe('addRecebimentosParcela', () => {
  it('keeps parcela when the recebimentos table already has it', async () => {
    const queryInterface = recebimentosQueryInterface(['linha', 'parcela']);

    await addRecebimentosParcela(queryInterface);

    const columns = await queryInterface.describeTable(RECEBIMENTOS_TABLE);
    expect(columns).toHaveProperty('parcela');
  });

  it('adds parcela when the recebimentos table does not have it', async () => {
    const queryInterface = recebimentosQueryInterface(['linha']);

    await addRecebimentosParcela(queryInterface);

    const columns = await queryInterface.describeTable(RECEBIMENTOS_TABLE);
    expect(columns).toHaveProperty('parcela');
  });
});

function recebimentosQueryInterface(columnNames: string[]): QueryInterface {
  const present = new Set(columnNames);

  return {
    async describeTable() {
      return Object.fromEntries([...present].map((name) => [name, {}]));
    },
    async addColumn(_table: string, name: string) {
      if (present.has(name)) {
        throw new Error(`Duplicate column name '${name}'`);
      }
      present.add(name);
    },
  } as unknown as QueryInterface;
}
