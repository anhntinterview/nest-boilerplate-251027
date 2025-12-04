import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/postgres';

@Injectable()
export class PostgresService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: { db: { url: process.env.PG_URL } },
    });
  }

  async onModuleInit(): Promise<void> {
    console.log('🟢 Connecting to PostgreSQL...');
    await this.$connect();
    console.log('✅ Connected to PostgreSQL (pg_dev_db)');
  }

  async onModuleDestroy(): Promise<void> {
    console.log('🔴 Disconnecting from PostgreSQL...');
    await this.$disconnect();
    console.log('✅ PostgreSQL disconnected.');
  }
}
