import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const RECEBIVEIS_TABLE = 'recebiveis';
export const RECEBIVEIS_ID_TRANS_ADQUIRENTE_INDEX =
  'recebiveis_id_trans_adquirente';
export const CREATE_RECEBIVEIS_MIGRATION = '20261001225400-create-recebiveis';

export const recebiveisAttributes: ModelAttributes = {
  idTransacao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: false,
  },
  parcelaRecebivel: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: false,
  },
  cliente: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  adquirente: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  idTransAdquirente: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  dataTransacao: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  valorTransacao: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  totalParcelas: {
    type: DataTypes.SMALLINT,
    allowNull: false,
  },
  taxaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  taxaValor: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  valorRepasse: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  dataRepasse: {
    type: DataTypes.DATEONLY,
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

export async function createRecebiveisTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(RECEBIVEIS_TABLE, recebiveisAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
  await queryInterface.addIndex(RECEBIVEIS_TABLE, ['idTransAdquirente'], {
    name: RECEBIVEIS_ID_TRANS_ADQUIRENTE_INDEX,
  });
}
