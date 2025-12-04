import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchProductQuery } from '../impl/search-product.query';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { RedisService } from 'src/modules/product/application/services/redis.service';
import { ProductMetadataDoc } from 'src/modules/product/domain/read-models/product-metadata.entity';
import { ProductSyncService } from '../../services/product-sync.service';

@QueryHandler(SearchProductQuery)
export class SearchProductHandler implements IQueryHandler<SearchProductQuery> {
  constructor(
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly redis: RedisService,
    private readonly productSyncService: ProductSyncService,
  ) {}

  async execute(query: SearchProductQuery): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }> {
    const cacheKey = `products:search:${JSON.stringify(query)}`;

    // --- 1. Check Cache ---
    const cached = await this.redis.get(cacheKey);
    console.log('Cached result:', cached);
    if (cached)
      return JSON.parse(cached) as {
        items: ProductMetadataDoc[];
        nextCursor?: string;
        total?: number;
      };

    // --- 2. Synchronize missing metadata ---
    // (Postgres product → Mongo read-model)
    await this.productSyncService.syncMissingMetadata();

    // --- 3. Execute search ---
    const results = await this.productReadRepo.search(query.filters);

    // --- 4. Cache results ---
    await this.redis.set(cacheKey, JSON.stringify(results), 60);
    await this.redis.debugKeys('products:search*');

    return results;
  }
}
