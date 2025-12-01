import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { buildProductMetadataFromProduct } from './product-to-metadat.mapper';

export async function syncMissingMetadata(
  productRepo: PrismaProductRepository,
  productReadRepo: PrismaProductReadRepository,
) {
  const allProducts = await productRepo.findAll();
  const missingProducts = allProducts.filter((p) => !p.metadataId);

  for (const product of missingProducts) {
    const metadata = buildProductMetadataFromProduct(product, {
      category: undefined,
      tags: [],
      images: [],
      stockInfo: {},
    });

    await productReadRepo.upsertMetadata(metadata);
    await productRepo.updateMetadataId(product.id, metadata.productId);
  }
}
