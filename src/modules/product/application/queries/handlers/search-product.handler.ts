import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchProductQuery } from '../impl/search-product.query';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { RedisService } from 'src/modules/product/adapters/redis.service';
import { ProductMetadataDoc } from 'src/modules/product/domain/read-models/product-metadata.entity';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { syncMissingMetadata } from 'src/modules/product/mappers/sync-missing-metadata.mapper';

@QueryHandler(SearchProductQuery)
export class SearchProductHandler implements IQueryHandler<SearchProductQuery> {
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly redis: RedisService,
  ) {}

  async execute(query: SearchProductQuery): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }> {
    const cacheKey = `products:search:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    console.log('Cached result:', cached);
    if (cached)
      return JSON.parse(cached) as {
        items: ProductMetadataDoc[];
        nextCursor?: string;
        total?: number;
      };

    // Integrated Mongo & Postgres
    await syncMissingMetadata(this.productRepo, this.productReadRepo);

    // Seawrch Mongo
    const { filters } = query;
    const results = await this.productReadRepo.search(filters);
    await this.redis.set(cacheKey, JSON.stringify(results), 60);
    await this.redis.debugKeys('products:search*');
    return results;
  }
}
