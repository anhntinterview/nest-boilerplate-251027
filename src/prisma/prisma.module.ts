import { Global, Module } from '@nestjs/common';
import { PostgresService } from './postgres/postgres.service';
import { MongoService } from './mongo/mongo.service';

@Global()
@Module({
  providers: [PostgresService, MongoService],
  exports: [PostgresService, MongoService],
})
export class PrismaModule {}
