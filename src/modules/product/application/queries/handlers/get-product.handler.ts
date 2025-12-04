import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductQuery } from '../impl/get-product.query';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { ProductSyncService } from '../../services/product-sync.service';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery> {
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly productSyncService: ProductSyncService,
  ) {}

  async execute(query: GetProductQuery) {
    console.log('Get started in product by ID');
    // 1. Get record from Postgres
    const product = await this.productRepo.findById(query.id);
    if (!product) return null;

    // 2. Sync metadata if missing
    await this.productSyncService.syncMissingMetadata();

    // 3. Get metadata from Mongo
    const metadata = await this.productReadRepo.findMetadataByProductId(
      query.id,
    );
    console.log('📄 Metadata from MongoDB:', metadata);

    // 4. Build GQL model
    const result = {
      product: product.toDTO(),
      metadata: metadata
        ? {
            _id: metadata._id?.toString(),
            productId: metadata.productId,
            category: metadata.category ?? undefined,
            tags: metadata.tags ?? [],
            attributes: metadata.attributes
              ? JSON.stringify(metadata.attributes)
              : undefined,
            images: metadata.images ?? undefined,
            stockInfo: metadata.stockInfo
              ? JSON.stringify(metadata.stockInfo)
              : undefined,
            extra: metadata.extra ? JSON.stringify(metadata.extra) : undefined,
            createdAt: metadata.createdAt ?? undefined,
            updatedAt: metadata.updatedAt ?? undefined,
          }
        : undefined,
    };

    console.log('✅ Final result:', JSON.stringify(result, null, 2));
    return result;
  }
}
