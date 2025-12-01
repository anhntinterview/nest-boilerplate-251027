import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HelloController } from './controllers/hello.controller';
import { HelloService } from './services/hello.service';
import { PostgresService } from '../prisma/postgres/postgres.service';
import { MongoService } from '../prisma/mongo/mongo.service';
import { GetHelloHandler } from './queries/handlers/get-hello.handler';

@Module({
  imports: [CqrsModule],
  controllers: [HelloController],
  providers: [HelloService, GetHelloHandler, PostgresService, MongoService],
  exports: [HelloService],
})
export class HelloModule {}
