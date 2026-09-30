import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  createSequelizeOptions,
  databaseConfig,
  validateDatabaseEnv,
  type DatabaseSettings,
} from './database.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      validate: validateDatabaseEnv,
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createSequelizeOptions(
          config.getOrThrow<DatabaseSettings>('database'),
        ),
        autoLoadModels: true,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
