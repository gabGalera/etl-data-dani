import {
  DataTypes,
  type ModelAttributes,
  type QueryInterface,
} from 'sequelize';

export const MAQUININHAS_TABLE = 'maquininhas';
export const MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX =
  'maquininhas_id_trans_adquirente';
export const CREATE_MAQUININHAS_MIGRATION =
  '20261006193000-create-maquininhas';

/** Same column contract as `recebiveis`; kept separate so each table can diverge later. */
export const maquininhasAttributes: ModelAttributes = {
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
    type: DataTypes.STRING(10),
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
    type: DataTypes.STRING(10),
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

export async function createMaquininhasTable(
  queryInterface: QueryInterface,
): Promise<void> {
  await queryInterface.createTable(MAQUININHAS_TABLE, maquininhasAttributes, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  });
  await queryInterface.addIndex(MAQUININHAS_TABLE, ['idTransAdquirente'], {
    name: MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX,
  });
}
