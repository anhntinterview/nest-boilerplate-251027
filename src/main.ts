import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const nodeEnv = process.env.NODE_ENV || 'local';
  const port = process.env.NEST_PORT || 3001;

  // Create the Nest application
  const app = await NestFactory.create(AppModule, {
    cors: nodeEnv === 'local', // enable CORS only for local development
  });

  if (nodeEnv === 'production') {
    app.setGlobalPrefix('api');
  }

  await app.listen(port);

  logger.log(
    `🚀 Application is running in [${nodeEnv}] mode on: http://localhost:${port}`,
  );
}
bootstrap();
