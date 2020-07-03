import { ISeeder } from '../helpers/seeder';

const Seeder: ISeeder = {
  async run(db) {
    await db.db('datastore').collection('users').insertOne({
      name: 'Mocky Mockery',
      email: 'test@gmail.com',
    });
  },
};

module.exports = Seeder;
