import {
  Column,
  CreatedAt,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX } from './maquininha.schema.js';

@Table({
  tableName: 'maquininhas',
  freezeTableName: true,
  timestamps: true,
  underscored: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  modelName: 'Maquininha',
})
export class Maquininha extends Model {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: false,
  })
  declare idTransacao: number;

  @PrimaryKey
  @Column({
    type: DataType.SMALLINT,
    allowNull: false,
    autoIncrement: false,
  })
  declare parcelaRecebivel: number;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare cliente: string;

  @Column({ type: DataType.STRING(32), allowNull: false })
  declare adquirente: string;

  @Index(MAQUININHAS_ID_TRANS_ADQUIRENTE_INDEX)
  @Column({ type: DataType.STRING(36), allowNull: false })
  declare idTransAdquirente: string;

  @Column({ type: DataType.STRING(32), allowNull: false })
  declare tipo: string;

  @Column({ type: DataType.STRING(10), allowNull: false })
  declare dataTransacao: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare valorTransacao: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare totalParcelas: number;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  declare taxaPercentual: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  declare taxaValor: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare valorRepasse: string;

  @Column({ type: DataType.STRING(10), allowNull: false })
  declare dataRepasse: string;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: Date;
}
