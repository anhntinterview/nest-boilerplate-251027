import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createClient, RedisClientType } from 'redis';
import { ProductModule } from './modules/product/product.module';
import { PrismaModule } from './prisma/prisma.module';
import { GraphQLModule } from './graphql/graphql.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProductModule,
    GraphQLModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<RedisClientType> => {
        const client: RedisClientType = createClient({
          socket: {
            host: config.get<string>('REDIS_HOST') || 'localhost',
            port: config.get<number>('REDIS_PORT') || 6379,
          },
        });

        client.on('error', (err) => {
          console.error('❌ Redis Client Error:', err);
        });

        client.on('connect', () => {
          console.log('🔗 Redis connecting...');
        });

        client.on('ready', () => {
          console.log('✅ Redis client ready');
        });

        await client.connect();
        console.log('✅ Redis client connected from AppModule');
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class AppModule {}
