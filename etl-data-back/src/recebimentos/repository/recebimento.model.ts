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
import { RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX } from './recebimento.schema.js';

@Table({
  tableName: 'recebimentos',
  freezeTableName: true,
  timestamps: true,
  underscored: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  modelName: 'Recebimento',
})
export class Recebimento extends Model {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: false,
  })
  declare linha: number;

  @Index(RECEBIMENTOS_ID_TRANS_ADQUIRENTE_INDEX)
  @Column({ type: DataType.STRING(36), allowNull: false })
  declare idTransAdquirente: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare dataRecibo: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare confirmacao: string;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: Date;
}
