import { Injectable, Logger } from '@nestjs/common';
import { PrismaProductRepository } from '../../adapters/prisma-product.repository';
import { PrismaProductReadRepository } from '../../adapters/prisma-product-read.repository';
import { buildProductMetadataFromProduct } from '../../mappers/product-to-metadat.mapper';
import { Product } from '../../domain/product.entity';
import { ProductMetadataDoc } from '../../domain/read-models/product-metadata.entity';

@Injectable()
export class ProductSyncService {
  private readonly logger = new Logger(ProductSyncService.name);

  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
  ) {}

  async syncMissingMetadata(): Promise<void> {
    const missingProducts =
      await this.productRepo.findProductsWithoutMetadata();

    if (missingProducts.length === 0) return;

    this.logger.log(`Syncing ${missingProducts.length} products metadata...`);

    for (const product of missingProducts) {
      const metadata = buildProductMetadataFromProduct(product);

      // upsert to Mongo return ObjectId
      const metadataId =
        await this.productReadRepo.upsertMetadataReturningId(metadata);

      // assign to entity (DDD)
      product.applyMetadataId(metadataId);

      // save to Postgres
      await this.productRepo.update(product);

      this.logger.log(
        `→ Synced metadata for product ${product.id} (metadataId=${metadataId})`,
      );
    }
  }

  /**
   * Find all of product is missed metadataId
   */
  private async findProductsWithoutMetadata(): Promise<Product[]> {
    return this.productRepo.findProductsWithoutMetadata();
  }

  /**
   * Build Mongo read-model from Product domain entity
   */
  private createMetadataDocFromProduct(product: Product): ProductMetadataDoc {
    return {
      productId: product.id,
      category: null,
      tags: [],
      attributes: {},
      images: [],
      stockInfo: null,
      extra: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }
}
