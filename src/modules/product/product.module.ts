import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { PrismaProductRepository } from './adapters/prisma-product.repository';
import { PrismaProductReadRepository } from './adapters/prisma-product-read.repository';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateProductHandler } from './application/commands/handlers/create-product.handler';
import { UpdateProductHandler } from './application/commands/handlers/update-product.handler';
import { DeleteProductHandler } from './application/commands/handlers/delete-product.handler';
import { GetProductHandler } from './application/queries/handlers/get-product.handler';
import { SearchProductHandler } from './application/queries/handlers/search-product.handler';
import { RedisService } from './adapters/redis.service';

const CommandHandlers = [
  CreateProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
];

const QueryHandlers = [GetProductHandler, SearchProductHandler];

@Module({
  imports: [CqrsModule],
  controllers: [ProductController],
  providers: [
    PrismaProductRepository,
    PrismaProductReadRepository,
    RedisService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaProductRepository, PrismaProductRepository],
})
export class ProductModule {}
