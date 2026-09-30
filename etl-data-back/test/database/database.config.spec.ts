import { readDatabaseSettings } from '../../src/database/database.config.js';

describe('readDatabaseSettings', () => {
  it('uses the compose MySQL defaults when env vars are absent', () => {
    expect(readDatabaseSettings({})).toEqual({
      host: '127.0.0.1',
      port: 3307,
      username: 'etl',
      password: 'etl',
      database: 'etl_data',
    });
  });

  it('reads overrides from the environment', () => {
    expect(
      readDatabaseSettings({
        DB_HOST: 'mysql',
        DB_PORT: '3306',
        DB_USERNAME: 'app',
        DB_PASSWORD: 'secret',
        DB_NAME: 'warehouse',
      }),
    ).toEqual({
      host: 'mysql',
      port: 3306,
      username: 'app',
      password: 'secret',
      database: 'warehouse',
    });
  });

  it('rejects a port that is not an integer', () => {
    expect(() => readDatabaseSettings({ DB_PORT: '3307.5' })).toThrow(
      'DB_PORT must be an integer from 1 to 65535',
    );
  });
});
