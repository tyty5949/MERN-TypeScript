import { MongoClient } from 'mongodb';
import * as path from 'path';
import * as fs from 'fs';
import * as Logger from '../../util/log';
import * as DB from '../../util/db';
import { ISeeder } from '../seed';

/**
 * Applies the given seeder. Seeder should be given as a filename as the path
 * will be built within this function. If no file extension is supplied, .ts is inferred.
 *
 * @param seeder
 * @param clientInstance
 * @param seederDir
 */
export const applySeeder = async (
  seeder: string,
  clientInstance: MongoClient,
  seederDir: string,
): Promise<void> => {
  const seederFile =
    seeder.indexOf('.') > -1
      ? // Given seeder has an extension
        path.join(__dirname, seederDir, seeder)
      : // Given seeder is not given an extension, assume .ts
        path.join(__dirname, seederDir, `${seeder}.ts`);

  if (!fs.existsSync(seederFile)) {
    Logger.warn('Unable to find seeder!', { seeder, file: seederFile });
    return;
  }

  const stat = fs.lstatSync(seederFile);
  if (stat.isFile()) {
    try {
      await runSeeder(seederFile, clientInstance);
      Logger.info('-- successfully applied seeder', {
        seeder,
        file: seederFile,
      });
    } catch (err) {
      Logger.error('Unable to apply seeder!', { seeder, file: seederFile });
      console.error(err);
    }
  } else {
    Logger.warn('Unable to find seeder!', { seeder, file: seederFile });
    return;
  }
};

/**
 * Runs the specified seeder file. Assumes that the default export matches the
 * ISeeder type. If not, an error is thrown.
 *
 * @throws Error
 * @param seederFile
 * @param clientInstance
 */
export const runSeeder = async (
  seederFile: string,
  clientInstance: MongoClient,
): Promise<void> => {
  const a: ISeeder = await import(seederFile);
  await a.run(clientInstance);
};

/**
 * Runs the seeders specified by the default.json file within the configured
 * seeders directory.
 *
 * @param clientInstance
 * @param seederDir
 */
export const runDefault = async (
  clientInstance: MongoClient,
  seederDir: string,
): Promise<void> => {
  const defaultFile = path.join(__dirname, seederDir, 'default.json');

  if (!fs.existsSync(defaultFile)) {
    Logger.warn('Unable to find default file!', { file: defaultFile });
    return;
  }

  const stat = fs.lstatSync(defaultFile);
  if (!stat.isFile()) {
    Logger.warn('Unable to find default file!', { file: defaultFile });
    return;
  }

  let defaultFileData: { seeders: Array<string> };
  try {
    defaultFileData = JSON.parse(
      fs.readFileSync(defaultFile, { encoding: 'utf-8' }),
    );
  } catch (err) {
    Logger.warn('Malformed default file!', {
      file: defaultFile,
      reason: 'JSON parse error',
    });
    return;
  }

  const defaultSeeders = defaultFileData.seeders;

  if (defaultSeeders && Array.isArray(defaultSeeders)) {
    for (const seeder of defaultFileData.seeders) {
      await applySeeder(seeder, clientInstance, seederDir);
    }

    Logger.info(`Finished running ${defaultSeeders.length} default seeders!`);
  } else {
    Logger.warn('Malformed default file!', {
      file: defaultFile,
      reason: "Missing or malformed 'seeders' property",
    });
  }
};
