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
import { TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX } from './transacao.schema.js';

@Table({
  tableName: 'transacoes',
  freezeTableName: true,
  timestamps: true,
  underscored: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  modelName: 'Transacao',
})
export class Transacao extends Model {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: false,
  })
  declare idTransacao: number;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare cliente: string;

  @Column({ type: DataType.STRING(10), allowNull: false })
  declare data: string;

  @Column({ type: DataType.TIME, allowNull: false })
  declare hora: string;

  @Column({ type: DataType.STRING(32), allowNull: false })
  declare adquirente: string;

  @Index(TRANSACOES_ID_TRANS_ADQUIRENTE_INDEX)
  @Column({ type: DataType.STRING(36), allowNull: true })
  declare idTransAdquirente: string | null;

  @Column({ type: DataType.STRING(32), allowNull: false })
  declare status: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare valorTransacao: string;

  @Column({ type: DataType.STRING(32), allowNull: false })
  declare tipo: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare parcelas: number;

  @Column({ type: DataType.STRING(32), allowNull: true })
  declare bandeira: string | null;

  @Column({ type: DataType.STRING(16), allowNull: true })
  declare aut: string | null;

  @Column({ type: DataType.STRING(32), allowNull: true })
  declare cartao: string | null;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  declare taxaPercentual: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  declare taxaValor: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  declare valorLiquido: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: true })
  declare totalReembolsado: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: Date;
}
