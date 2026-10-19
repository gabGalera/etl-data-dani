import {
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import {
  REPASSES_ID_TRANS_ADQUIRENTE_INDEX,
  REPASSES_ID_TRANS_PARCELA_INDEX,
} from './repasse.schema.js';

@Table({
  tableName: 'repasses',
  freezeTableName: true,
  timestamps: true,
  underscored: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  modelName: 'Repasse',
  indexes: [
    {
      name: REPASSES_ID_TRANS_ADQUIRENTE_INDEX,
      fields: ['idTransAdquirente'],
    },
    {
      name: REPASSES_ID_TRANS_PARCELA_INDEX,
      fields: ['idTransAdquirente', 'parcela'],
    },
  ],
})
export class Repasse extends Model {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    autoIncrement: false,
  })
  declare linha: number;

  @Column({ type: DataType.STRING(36), allowNull: false })
  declare idTransAdquirente: string;

  @Column({ type: DataType.STRING(10), allowNull: false })
  declare dataRepasse: string;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
  declare valorRepasse: string;

  @Column({ type: DataType.SMALLINT, allowNull: false })
  declare parcela: number;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare updatedAt: Date;
}
