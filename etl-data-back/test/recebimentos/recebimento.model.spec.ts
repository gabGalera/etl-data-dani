import { Sequelize } from 'sequelize-typescript';
import { Recebimento } from '../../src/recebimentos/repository/recebimento.model.js';
import {
  RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX,
  RECEBIMENTOS_TABLE,
  recebimentosAttributes,
} from '../../src/recebimentos/repository/recebimento.schema.js';

describe('Recebimento', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Recebimento],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the recebimentos column contract', () => {
    expect(Recebimento.tableName).toBe(RECEBIMENTOS_TABLE);
    expect(Recebimento.options.timestamps).toBe(true);

    const attributes = Recebimento.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(recebimentosAttributes).sort(),
    );

    for (const [name, column] of Object.entries(recebimentosAttributes)) {
      expect(attributes[name]?.allowNull).toBe(column.allowNull);
    }

    expect(attributes.linha?.primaryKey).toBe(true);
    expect(attributes.linha?.autoIncrement).toBe(false);
    expect(attributes.linha?.references).toBeUndefined();
    expect(attributes.idTransAdquirente?.primaryKey).toBeFalsy();
    expect(attributes.idTransAdquirente?.allowNull).toBe(false);
    expect(attributes.idTransAdquirente?.references).toBeUndefined();
    expect(attributes.dataRecibo?.allowNull).toBe(false);
    expect(attributes.dataRecibo?.type).toMatchObject({
      key: 'STRING',
      options: { length: 10 },
    });
    expect(attributes.confirmacao?.allowNull).toBe(false);
    expect(Recebimento.options.indexes).toEqual([
      expect.objectContaining({
        name: RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX,
        fields: [{ name: 'idTransAdquirente' }],
      }),
    ]);
    expect(Recebimento.options.indexes?.[0]?.unique).toBeFalsy();
  });
});
