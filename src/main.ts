import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { PostgresService } from './prisma/postgres/postgres.service';
import { MongoService } from './prisma/mongo/mongo.service';
import { ensureMongoIndexes } from './prisma/mongo/mongo-indexes';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const nodeEnv = process.env.NODE_ENV || 'local';
  const port = process.env.NEST_PORT || 3001;

  // Create the Nest application
  const app = await NestFactory.create(AppModule, {
    cors: nodeEnv === 'local', // enable CORS only for local development
  });

  // if (nodeEnv === 'production') {
  //   app.setGlobalPrefix('api');
  // }
  app.setGlobalPrefix('api');

  app.enableCors();

  // grateful shutdown for Prisma connections
  const postgresService = app.get(PostgresService);
  const mongoService = app.get(MongoService);
  await ensureMongoIndexes(mongoService);

  app.enableShutdownHooks();

  process.on('beforeExit', () => {
    postgresService
      .$disconnect()
      .then(() => mongoService.$disconnect())
      .catch((err) => console.error('Error during shutdown', err));
  });

  await app.listen(port);

  logger.log(
    `🚀 Application is running in [${nodeEnv}] mode on: http://localhost:${port}`,
  );
}
bootstrap();
