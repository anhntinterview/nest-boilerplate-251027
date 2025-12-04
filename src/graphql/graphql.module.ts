import { Module } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      debug: true,
      // // Install subscription support if needed
      // installSubscriptionHandlers: true,
      // Note: installSubscriptionHandlers is deprecated, use subscriptions instead
      subscriptions: {
        'graphql-ws': true,
      },
    }),
  ],
})
export class GraphQLModule {}
