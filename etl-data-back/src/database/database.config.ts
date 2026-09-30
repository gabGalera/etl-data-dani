import { registerAs } from '@nestjs/config';
import type { Options } from 'sequelize';

export type DatabaseSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

export function readDatabaseSettings(
  env: Record<string, string | undefined> = process.env,
): DatabaseSettings {
  const port = Number(env.DB_PORT ?? '3307');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer from 1 to 65535');
  }

  return {
    host: valueOrDefault(env.DB_HOST, '127.0.0.1'),
    port,
    username: valueOrDefault(env.DB_USERNAME, 'etl'),
    password: env.DB_PASSWORD ?? 'etl',
    database: valueOrDefault(env.DB_NAME, 'etl_data'),
  };
}

export function validateDatabaseEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const settings = readDatabaseSettings(asStringEnv(env));
  return {
    ...env,
    DB_HOST: settings.host,
    DB_PORT: String(settings.port),
    DB_USERNAME: settings.username,
    DB_PASSWORD: settings.password,
    DB_NAME: settings.database,
  };
}

export const databaseConfig = registerAs('database', () =>
  readDatabaseSettings(),
);

export function createSequelizeOptions(settings: DatabaseSettings): Options {
  return {
    dialect: 'mysql',
    host: settings.host,
    port: settings.port,
    username: settings.username,
    password: settings.password,
    database: settings.database,
    quoteIdentifiers: true,
    timezone: '+00:00',
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      freezeTableName: true,
      timestamps: true,
      underscored: false,
    },
    dialectOptions: {
      charset: 'utf8mb4',
    },
    logging: false,
  };
}

function valueOrDefault(value: string | undefined, fallback: string): string {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function asStringEnv(
  env: Record<string, unknown>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, toEnvString(value)]),
  );
}

function toEnvString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  throw new Error('Environment values must be strings, numbers, or booleans');
}
