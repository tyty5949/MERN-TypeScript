import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as Dotenv from 'dotenv';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as DB from './util/db';

Dotenv.config();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.useStaticAssets(join(__dirname, 'public'));
  app.setBaseViewsDir(join(__dirname, 'views'));
  app.setViewEngine('hbs');

  await app.listen(3000);
}

/**
 * Attempt connection to the database. If successful, then start
 * the application.
 */
DB.connect(async (err, client) => {
  if (!err && client) {
    await bootstrap();
    process.exit(0);
  } else {
    console.log(err);
    process.exit(-1);
  }
});
