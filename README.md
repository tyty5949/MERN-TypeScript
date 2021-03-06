# MERN-TypeScript

MERN boilerplate written with TypeScript

# Table of contents

<!--ts-->

- [Getting Setup](#getting-setup)
- [Template Structure](#template-structure)
- [Scripts](#scripts)
  - [Database](#database-scripts)
  - [Build](#build-scripts)
  - [Development](#development-scripts)
  - [Utility](#utility-scripts)
- [Database Migrations](#database-migrations)
  - [Configuration](#migrations-configuration)
  - [Creating Migrations](#creating-a-migration)
- [Database Seeders](#database-seeders)
  - [Configuration](#seeder-configuration)
  - [Creating Seeders](#creating-a-seeder)
  - [Default Seeders](#default-seeders)

<!--te-->

## Getting Setup

### 1. Installing dependencies

`npm install`

### 2. Local MongoDB

On Mac, use Homebrew:
`brew install mongodb`

## Template Structure

### `/client`

**`components`**

**`containers`**

**`index.tsx`**

### `/server`

**`assets`**

**`database`**

**`domain`**

**`util`**

**`views`**

**`app.module.ts`**

**`main.ts`**

### `/public`

This directory is inteded for any static assets which should be included and served publicly alongside the client. All assets within this
directory will be copied to the `dist` directory upon application build. They will in-turn be served directly Nginx under the `/static` route prefix.

## Scripts

This template ships with numerous NPM scripts to automate useful parts in development, deployment, etc. This list is not exhaustive but should
provide guidance on how to use some key included scripts.

#### Database Scripts

**db:start & db:start-windows**

These scripts will bring up the locally installed MongoDB server packages on the respective system. On Mac this assumes that MongoDB was installed
via `homebrew`. On windows this script assumes that the MongoDB server is installed under the `C:\Program Files` directory.

> Note: On Mac the MongoDB service will run in the background, freeing up the terminal this script is run on. But on Windows,
> the MongoDB instance is run in the foreground, meaning the terminal isntance this command is run in will be occupied the entire
> time the MongoDB instance in running.

**db:stop**

Kills the background MongoDB database service running on Mac.

> Note: Only for Mac.

**db:seed [seeder-a][seeder-b] [seeder-c] ...**

Runs the specified seeder(s) against the database supplied for this environment. The supplied seeders represent the file names of the
seeders within the configured seeder directory. If no file-extension is provided, `.ts` is infered.

> WARNING: Care should be taken to not run seeders within production environments unless absolutely necessary as they have un-restricted access and can cause loss of data.

**migrate:up**

// TODO

**migrate:down**

// TODO

#### Build Scripts

**prebuild**

// TODO

**build**

// TODO

#### Development Scripts

**start:dev**

// TODO

#### Utility Scripts

**prettier**

// TODO

**lint**

// TODO

## Database Migrations

Migrations are used to keep local development environments, staging, production, any other environment in sync with
one another. This is accomplished by writing migration files which apply database schema changes that will be automatically
run when the app deployed to a new environment.

Migrations will only be run once on any given environment. This is accomplished
my maintaining a collection of records indicating which migrations have been ran. The contents
of this collection are then compared to the contents of the migrations directory. Any migrations
that aren't applied will be before running the application.

### Migrations Configuration

**MongoDB Collection**

By default, `config.migrations` is the collection which contains past migration records in the following schema:

```
{
  "_id": ObjectId, // The autogenerated MongoDB document id
  "ranAt": number // The unix-timestamp of when the migration was ran
}
```

The collection which migration records are stored can be changed by supplying a `MIGRATIONS_TABLE` field within the
applications `.env` file.

**Migrations Directory**

By default, migration files are to be stored in the _server/database/migrations/_ directory. To change the directory from
which migrations are loaded, add a `MIGRATIONS_DIR` option to the applications `.env` file.

### Creating a Migration

Migrations files are typescript files which export a single object, containing an `up` and a `down` function.
These functions are automatically run when the migration is applied or reverted.

Migration files are applied in the order in which they are presented in the directory (sorted alphanumerically descending).
A common practice is to prefix each migration file with the unix-timestamp when they are created.
This ensures that the migrations will run in the intended order on every system.

The exported migration object should match the schema below:

```typescript
export interface IMigration {
  /**
   * Function to apply the necessary changes for this migration.
   * @param db
   */
  up(db: MongoClient): void;

  /**
   * Function to effectively undo the changes made by this migration.
   * @param db
   */
  down(db: MongoClient): void;
}
```

For example a migration file to create a user's collection would look like so:

`server/database/migrations/1591998925_users_collection_migration.ts`

```typescript
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
```

Using the supplied `MongoClient` you can invoke commands on the given environments database.

> WARNING: Care should be taken to thoroughly test and ensure migrations will not cause any data loss
> on production environments. Read more about drawback of database migrations [here](https://en.wikipedia.org/wiki/Schema_migration).

## Database Seeders

Seeders are intended to provide a way to place data into an environment's MongoDB database. Some common
use cases includes test data for testing locally, mock data for running test-suites, or example data pulled
from production environments to debug issues.

### Seeder Configuration

The directory which seeders are searched for can be changed by adding a `SEEDER_DIR` option to the application's `.env` file.
By default `server/database/seeders` will be used.

### Creating a Seeder

Following our `UsersMigration` migration example from above, an example of a seeder is:

`server/database/seeders/user_seeder.ts`

```typescript
const Seeder: ISeeder = {
  async run(db) {
    await db.db('datastore').collection('users').insertOne({
      name: 'Mocky Mockery',
      email: 'test@gmail.com',
    });
  },
};

module.exports = Seeder;
```

Using the supplied `MongoClient` you can invoke commands on the environment's database to effectively seed data within it.

### Default Seeders

You can supply "default" seeders which will be executed upon a complete database rebuild. This is done by adding a `default.json`
file to your configured seeder directory path. The seeders listed within will be run in
the order in which they are specified.

The `default.json` should follow this schema:

```json
{
  "seeders": ["seeder-1", "seeder-2", "seeder-3"]
}
```

If no extension is supplied in the seeder name, `.ts` is inferred.

> NOTE: While these seeders are run on a database rebuild, they are never automatically run in production.
