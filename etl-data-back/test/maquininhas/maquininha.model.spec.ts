import { Sequelize } from 'sequelize-typescript';
import { Maquininha } from '../../src/maquininhas/repository/maquininha.model.js';
import {
  MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX,
  MAQUININHAS_TABLE,
  maquininhasAttributes,
} from '../../src/maquininhas/repository/maquininha.schema.js';

describe('Maquininha', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Maquininha],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the maquininhas column contract', () => {
    expect(Maquininha.tableName).toBe(MAQUININHAS_TABLE);
    expect(Maquininha.options.timestamps).toBe(true);

    const attributes = Maquininha.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(maquininhasAttributes).sort(),
    );

    for (const [name, column] of Object.entries(maquininhasAttributes)) {
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
    expect(Maquininha.options.indexes).toEqual([
      expect.objectContaining({
        name: MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX,
        fields: [{ name: 'idTransAdquirente' }],
      }),
    ]);
    expect(Maquininha.options.indexes?.[0]?.unique).toBeFalsy();
  });
});
