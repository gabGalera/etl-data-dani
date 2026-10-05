import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const TRANSACOES_TABLE = 'transacoes';
export const TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX =
  'transacoes_id_trans_adquirente';
export const CREATE_TRANSACOES_MIGRATION = '20260928160000-create-transacoes';
export const ALTER_TRANSACOES_DATA_VARCHAR_MIGRATION =
  '20261005183000-transacoes-data-varchar';

export const transacoesAttributes: ModelAttributes = {
  idTransacao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: false,
  },
  cliente: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  data: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  adquirente: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  idTransAdquirente: {
    type: DataTypes.STRING(36),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  valorTransacao: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  parcelas: {
    type: DataTypes.SMALLINT,
    allowNull: false,
  },
  bandeira: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  aut: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  cartao: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  taxaPercentual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  taxaValor: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  valorLiquido: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  totalReembolsado: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
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

export async function createTransacoesTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(TRANSACOES_TABLE, transacoesAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
  await queryInterface.addIndex(TRANSACOES_TABLE, ['idTransAdquirente'], {
    name: TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX,
  });
}

export async function alterTransacoesDataToVarchar(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.changeColumn(TRANSACOES_TABLE, 'data', {
    type: DataTypes.STRING(10),
    allowNull: false,
  });
}
