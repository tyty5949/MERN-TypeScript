import { ISeeder } from '../seed';

const Seeder: ISeeder = {
  async run(db) {
    await db.db('datastore').collection('users').insertOne({
      name: 'Mocky Mockery',
      email: 'test@gmail.com',
    });
  },
};

module.exports = Seeder;
