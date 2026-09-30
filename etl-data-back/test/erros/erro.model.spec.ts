import { Sequelize } from 'sequelize-typescript';
import { Erro } from '../../src/erros/erro.model.js';
import { ERROS_TABLE, errosAttributes } from '../../src/erros/erro.schema.js';

describe('Erro', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Erro],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the erros column contract', () => {
    expect(Erro.tableName).toBe(ERROS_TABLE);
    expect(Erro.options.timestamps).toBe(true);
    expect(Erro.options.updatedAt).toBe(false);

    const attributes = Erro.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(errosAttributes).sort(),
    );

    for (const [name, column] of Object.entries(errosAttributes)) {
      expect(attributes[name]?.allowNull).toBe(column.allowNull);
    }

    expect(attributes.id?.primaryKey).toBe(true);
    expect(attributes.id?.autoIncrement).toBe(true);
    expect(attributes.updatedAt).toBeUndefined();
  });
});
