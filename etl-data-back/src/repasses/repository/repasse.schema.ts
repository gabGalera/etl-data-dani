import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const REPASSES_TABLE = 'repasses';
export const REPASSES_ID_TRANS_ADQUIRENTE_INDEX =
  'repasses_id_trans_adquirente';
export const REPASSES_ID_TRANS_PARCELA_INDEX =
  'repasses_id_trans_adquirente_parcela';
export const CREATE_REPASSES_MIGRATION = '20261012220000-create-repasses';

export const repassesAttributes: ModelAttributes = {
  linha: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: false,
  },
  idTransAdquirente: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  dataRepasse: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  valorRepasse: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  parcela: {
    type: DataTypes.SMALLINT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
};

export async function createRepassesTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(REPASSES_TABLE, repassesAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
  await queryInterface.addIndex(REPASSES_TABLE, ['idTransAdquirente'], {
    name: REPASSES_ID_TRANS_ADQUIRENTE_INDEX,
  });
  await queryInterface.addIndex(
    REPASSES_TABLE,
    ['idTransAdquirente', 'parcela'],
    {
      name: REPASSES_ID_TRANS_PARCELA_INDEX,
    },
  );
}
