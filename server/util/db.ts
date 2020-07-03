import { MongoClient, Collection } from 'mongodb';
import * as Migrator from '../database/helpers/migrator';
import * as Logger from './log';

/**
 * The shared db connection.
 */
let db: MongoClient;

interface IConnectCallback {
  (err: Error | null, db: MongoClient | null): void;
}

/**
 * Connects to a MongoDB database and stores the returned database
 * within the db singleton in this file. The supplied callback
 * function is called on both connection success or failure.
 *
 * @param callback
 */
export function connect(callback: IConnectCallback): void {
  if (db) {
    Logger.warn('Trying to init DB again!');
  }

  MongoClient.connect(
    process.env.MONGO_URL || '',
    { useUnifiedTopology: true },
    (err: Error, initialized: MongoClient) => {
      if (err) {
        Logger.error(`Error connecting to MongoDB database`, { err });
        return callback(err, null);
      }
      db = initialized;
      Logger.info('Successfully connected to MongoDB database!');
      return callback(null, db);
    },
  );
}

/**
 * Gets the active connection to the database. The connection must be
 * created first by calling the connect function in this file.
 *
 * @returns {MongoClient}
 */
export function getConnection(): MongoClient {
  return db;
}

/**
 * Access function which wraps getting a specific collection from
 * a specific database. To add further helpfulness, the 'database'
 * parameter is optional and the default can be set.
 *
 * @param {string} collection               - The collection to get
 * @param {string} [database=datastore]     - The database to use to get the collection
 *
 * @returns {Collection}
 */
export function get(collection: string, database = 'datastore'): Collection {
  return db.db(database).collection(collection);
}

interface IMigrationOptions {
  database: string;
  migrationCollection: string;
  migrationsPath: string;
}

/* eslint-disable no-await-in-loop */
/**
 * Run all migrations which have yet to be run using our
 * migration runner.
 *
 * @see database/migrate_up.ts
 *
 * @param options
 */
export const runMigrations = async (
  options: IMigrationOptions,
): Promise<void> => {
  Logger.info('Running migrations...');
  await Migrator.ensureMigrationCollection(
    options.database,
    options.migrationCollection,
  );

  const migrations = await Migrator.getMigrations(options.migrationsPath);

  for (let i = 0; i < migrations.length; i++) {
    const item = migrations[i];

    const migrationApplied = await Migrator.isMigrationApplied(item.file);
    if (!migrationApplied) {
      item.migration.up(db);
      await Migrator.markMigrationAsApplied(
        item.file,
        options.database,
        options.migrationCollection,
      );
      Logger.info('-- applied migration', { filename: item.file });
    }
  }
};
/* eslint-enable no-await-in-loop */
