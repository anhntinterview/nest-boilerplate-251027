import { Injectable } from '@nestjs/common';
import { PostgresService } from '../../prisma/postgres/postgres.service';
import { MongoService } from '../../prisma/mongo/mongo.service';

@Injectable()
export class HelloService {
  constructor(
    private readonly postgres: PostgresService,
    private readonly mongo: MongoService,
  ) {}

  async getGreeting(): Promise<{ greeting: string }> {
    return { greeting: 'My Hello World' };
  }
}
