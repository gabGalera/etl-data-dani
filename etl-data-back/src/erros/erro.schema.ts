import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const ERROS_TABLE = 'erros';
export const CREATE_ERROS_MIGRATION = '20260930190000-create-erros';

export const errosAttributes: ModelAttributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  arquivo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  linha: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
};

export async function createErrosTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(ERROS_TABLE, errosAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
}
