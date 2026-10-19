import { Sequelize } from 'sequelize-typescript';
import { Repasse } from '../../src/repasses/repository/repasse.model.js';
import {
  REPASSES_ID_TRANS_ADQUIRENTE_INDEX,
  REPASSES_ID_TRANS_PARCELA_INDEX,
  REPASSES_TABLE,
  repassesAttributes,
} from '../../src/repasses/repository/repasse.schema.js';

describe('Repasse', () => {
  const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    username: 'etl',
    password: 'etl',
    database: 'etl_data',
    models: [Repasse],
    logging: false,
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('matches the repasses column contract', () => {
    expect(Repasse.tableName).toBe(REPASSES_TABLE);
    expect(Repasse.options.timestamps).toBe(true);

    const attributes = Repasse.getAttributes();
    expect(Object.keys(attributes).sort()).toEqual(
      Object.keys(repassesAttributes).sort(),
    );

    for (const [name, column] of Object.entries(repassesAttributes)) {
      expect(attributes[name]?.allowNull).toBe(column.allowNull);
    }

    expect(attributes.linha?.primaryKey).toBe(true);
    expect(attributes.linha?.autoIncrement).toBe(false);
    expect(attributes.linha?.references).toBeUndefined();
    expect(attributes.idTransAdquirente?.primaryKey).toBeFalsy();
    expect(attributes.idTransAdquirente?.allowNull).toBe(false);
    expect(attributes.idTransAdquirente?.references).toBeUndefined();
    expect(attributes.dataRepasse?.allowNull).toBe(false);
    expect(attributes.dataRepasse?.type).toMatchObject({
      key: 'STRING',
      options: { length: 10 },
    });
    expect(attributes.valorRepasse?.allowNull).toBe(false);
    expect(Repasse.options.indexes).toEqual([
      expect.objectContaining({
        name: REPASSES_ID_TRANS_ADQUIRENTE_INDEX,
        fields: ['idTransAdquirente'],
      }),
      expect.objectContaining({
        name: REPASSES_ID_TRANS_PARCELA_INDEX,
        fields: ['idTransAdquirente', 'parcela'],
      }),
    ]);
    expect(Repasse.options.indexes?.every((index) => !index.unique)).toBe(true);
  });
});
