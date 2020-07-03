import { MongoClient } from 'mongodb';
import { IMigration } from '../helpers/migrator';

const UsersMigration: IMigration = {
  up: async (db: MongoClient): Promise<boolean> => {
    const collection = await db.db('datastore').createCollection('users', {});
    await collection.createIndex({ email: 1 }, { unique: true });
    return true;
  },

  down: async (db: MongoClient): Promise<boolean> => {
    await db.db('datastore').dropCollection('users');
    return true;
  },
};

module.exports = UsersMigration;
