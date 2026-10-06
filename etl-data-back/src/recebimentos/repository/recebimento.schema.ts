import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const RECEBIMENTOS_TABLE = 'recebimentos';
export const RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX =
  'recebimentos_id_trans_adquirente';
export const CREATE_RECEBIMENTOS_MIGRATION =
  '20261002173200-create-recebimentos';
export const ALTER_RECEBIMENTOS_DATA_VARCHAR_MIGRATION =
  '20261006185600-recebimentos-data-recibo-varchar';

export const recebimentosAttributes: ModelAttributes = {
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
  dataRecibo: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  confirmacao: {
    type: DataTypes.DECIMAL(12, 2),
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

export async function createRecebimentosTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(RECEBIMENTOS_TABLE, recebimentosAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
  await queryInterface.addIndex(RECEBIMENTOS_TABLE, ['idTransAdquirente'], {
    name: RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX,
  });
}

export async function alterRecebimentosDataReciboToVarchar(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.changeColumn(RECEBIMENTOS_TABLE, 'dataRecibo', {
    type: DataTypes.STRING(10),
    allowNull: false,
  });
}
