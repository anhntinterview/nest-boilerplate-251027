import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../../generator/mongo';

@Injectable()
export class MongoService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: { db: { url: process.env.MONGO_DATABASE_URL } },
    });
  }

  async onModuleInit(): Promise<void> {
    console.log('🟢 Connecting to MongoSQL...');
    await this.$connect();
    console.log('✅ Connected to MongoSQL (admin)');
  }

  async onModuleDestroy(): Promise<void> {
    console.log('🔴 Disconnecting from MongoSQL...');
    await this.$disconnect();
    console.log('✅ MongoSQL disconnected.');
  }
}
