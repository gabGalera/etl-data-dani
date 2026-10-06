import { DataTypes, Sequelize, type QueryInterface } from 'sequelize';
import {
  createSequelizeOptions,
  readDatabaseSettings,
} from './database.config.js';
import {
  CREATE_ERROS_MIGRATION,
  ERROS_TABLE,
  createErrosTable,
} from '../erros/erro.schema.js';
import {
  ALTER_RECEBIMENTOS_DATA_VARCHAR_MIGRATION,
  CREATE_RECEBIMENTOS_MIGRATION,
  RECEBIMENTOS_TABLE,
  alterRecebimentosDataReciboToVarchar,
  createRecebimentosTable,
} from '../recebimentos/repository/recebimento.schema.js';
import {
  ALTER_RECEBIVEIS_DATAS_VARCHAR_MIGRATION,
  CREATE_RECEBIVEIS_MIGRATION,
  RECEBIVEIS_TABLE,
  alterRecebiveisDatasToVarchar,
  createRecebiveisTable,
} from '../recebiveis/repository/recebivel.schema.js';
import {
  ALTER_TRANSACOES_DATA_VARCHAR_MIGRATION,
  CREATE_TRANSACOES_MIGRATION,
  TRANSACOES_TABLE,
  alterTransacoesDataToVarchar,
  createTransacoesTable,
} from '../transacoes/repository/transacao.schema.js';

const META_TABLE = 'SequelizeMeta';

const sequelize = new Sequelize({
  ...createSequelizeOptions(readDatabaseSettings()),
  logging: (sql) => {
    console.log(sql);
  },
});

const migrations: Migration[] = [
  {
    name: CREATE_TRANSACOES_MIGRATION,
    table: TRANSACOES_TABLE,
    create: createTransacoesTable,
  },
  {
    name: CREATE_ERROS_MIGRATION,
    table: ERROS_TABLE,
    create: createErrosTable,
  },
  {
    name: CREATE_RECEBIVEIS_MIGRATION,
    table: RECEBIVEIS_TABLE,
    create: createRecebiveisTable,
  },
  {
    name: CREATE_RECEBIMENTOS_MIGRATION,
    table: RECEBIMENTOS_TABLE,
    create: createRecebimentosTable,
  },
  {
    name: ALTER_TRANSACOES_DATA_VARCHAR_MIGRATION,
    alter: alterTransacoesDataToVarchar,
    message: `Changed ${TRANSACOES_TABLE}.data to VARCHAR(10).`,
  },
  {
    name: ALTER_RECEBIVEIS_DATAS_VARCHAR_MIGRATION,
    alter: alterRecebiveisDatasToVarchar,
    message: `Changed ${RECEBIVEIS_TABLE}.dataTransacao and dataRepasse to VARCHAR(10).`,
  },
  {
    name: ALTER_RECEBIMENTOS_DATA_VARCHAR_MIGRATION,
    alter: alterRecebimentosDataReciboToVarchar,
    message: `Changed ${RECEBIMENTOS_TABLE}.dataRecibo to VARCHAR(10).`,
  },
];

try {
  await sequelize.authenticate();
  const messages = await applyMigrations();
  for (const message of messages) {
    console.log(message);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}

type Migration = {
  name: string;
  table?: string;
  create?: (queryInterface: QueryInterface) => Promise<void>;
  alter?: (queryInterface: QueryInterface) => Promise<void>;
  message?: string;
};

async function applyMigrations(): Promise<string[]> {
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable();
  const messages: string[] = [];

  for (const migration of migrations) {
    const [rows] = await sequelize.query(
      `SELECT name FROM \`${META_TABLE}\` WHERE name = :name`,
      { replacements: { name: migration.name } },
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const target = migration.table ?? migration.name;
      messages.push(`Migration already applied. ${target} was left unchanged.`);
      continue;
    }

    const existing = tableNames(await queryInterface.showAllTables());
    if (migration.create && migration.table) {
      if (!existing.includes(migration.table)) {
        await migration.create(queryInterface);
      }
    }
    if (migration.alter) {
      await migration.alter(queryInterface);
    }

    await queryInterface.bulkInsert(META_TABLE, [{ name: migration.name }]);
    messages.push(
      migration.message ??
        (migration.table
          ? `Created table ${migration.table}.`
          : `Applied migration ${migration.name}.`),
    );
  }

  return messages;
}

async function ensureMetaTable(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const existing = tableNames(await queryInterface.showAllTables());
  if (existing.includes(META_TABLE)) {
    return;
  }

  await queryInterface.createTable(META_TABLE, {
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
    },
  });
}

function tableNames(tables: unknown): string[] {
  if (!Array.isArray(tables)) {
    return [];
  }

  return tables.map((table) => {
    if (typeof table === 'string') {
      return table;
    }
    if (isTableRef(table)) {
      return table.tableName;
    }
    return String(table);
  });
}

function isTableRef(value: unknown): value is { tableName: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tableName' in value &&
    typeof value.tableName === 'string'
  );
}
