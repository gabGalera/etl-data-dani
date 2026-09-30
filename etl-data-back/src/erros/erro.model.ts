import {
  AutoIncrement,
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'erros',
  freezeTableName: true,
  timestamps: true,
  updatedAt: false,
  underscored: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  modelName: 'Erro',
})
export class Erro extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare arquivo: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare linha: number | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare mensagem: string;

  @CreatedAt
  @Column({ type: DataType.DATE, allowNull: false })
  declare createdAt: Date;
}
