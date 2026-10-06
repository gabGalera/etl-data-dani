import { Sequelize } from 'sequelize-typescript';
import { Recebivel } from '../../src/recebiveis/repository/recebivel.model.js';
import {
  RECEBIVEIS_ID_TRANS_ADQUIRENTE_INDEX,
  RECEBIVEIS_TABLE,
  recebiveisAttributes,
} from '../../src/recebiveis/repository/recebivel.schema.js';

describe('Recebivel', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Recebivel],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the recebiveis column contract', () => {
    expect(Recebivel.tableName).toBe(RECEBIVEIS_TABLE);
    expect(Recebivel.options.timestamps).toBe(true);

    const attributes = Recebivel.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(recebiveisAttributes).sort(),
    );

    for (const [name, column] of Object.entries(recebiveisAttributes)) {
      expect(attributes[name]?.allowNull).toBe(column.allowNull);
    }

    expect(attributes.idTransacao?.primaryKey).toBe(true);
    expect(attributes.idTransacao?.autoIncrement).toBe(false);
    expect(attributes.idTransacao?.references).toBeUndefined();
    expect(attributes.parcelaRecebivel?.primaryKey).toBe(true);
    expect(attributes.parcelaRecebivel?.autoIncrement).toBe(false);
    expect(attributes.idTransAdquirente?.allowNull).toBe(false);
    expect(attributes.idTransAdquirente?.references).toBeUndefined();
    expect(attributes.dataTransacao?.type).toMatchObject({
      key: 'STRING',
      options: { length: 10 },
    });
    expect(attributes.dataRepasse?.type).toMatchObject({
      key: 'STRING',
      options: { length: 10 },
    });
    expect(Recebivel.options.indexes).toEqual([
      expect.objectContaining({
        name: RECEBIVEIS_ID_TRANS_ADQUIRENTE_INDEX,
        fields: [{ name: 'idTransAdquirente' }],
      }),
    ]);
    expect(Recebivel.options.indexes?.[0]?.unique).toBeFalsy();
  });
});
