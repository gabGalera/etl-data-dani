import { Sequelize } from 'sequelize-typescript';
import { Transacao } from '../../src/transacoes/repository/transacao.model.js';
import {
  TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX,
  TRANSACOES_TABLE,
  transacoesAttributes,
} from '../../src/transacoes/repository/transacao.schema.js';

describe('Transacao', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Transacao],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the transacoes column contract', () => {
    expect(Transacao.tableName).toBe(TRANSACOES_TABLE);
    expect(Transacao.options.timestamps).toBe(true);

    const attributes = Transacao.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(transacoesAttributes).sort(),
    );

    for (const [name, column] of Object.entries(transacoesAttributes)) {
      expect(attributes[name]?.allowNull).toBe(column.allowNull);
    }

    expect(attributes.idTransacao?.primaryKey).toBe(true);
    expect(attributes.idTransacao?.autoIncrement).toBe(false);
    expect(attributes.data?.type).toMatchObject({
      key: 'STRING',
      options: { length: 10 },
    });
    expect(attributes.ultimaAtualizacao).toBeUndefined();
    expect(Transacao.options.indexes).toEqual([
      expect.objectContaining({
        name: TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX,
        fields: [{ name: 'idTransAdquirente' }],
      }),
    ]);
    expect(Transacao.options.indexes?.[0]?.unique).toBeFalsy();
  });
});
