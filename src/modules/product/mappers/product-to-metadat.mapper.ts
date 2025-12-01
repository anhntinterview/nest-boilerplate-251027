import { Product } from '../domain/product.entity';
import { ProductMetadataDoc } from '../domain/read-models/product-metadata.entity';

interface BuildExtras {
  category?: string;
  tags?: string[];
  images?: string[];
  stockInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

const RESERVED_EXTRAS_KEYS = [
  'category',
  'tags',
  'images',
  'stockInfo',
] as const;

export function buildProductMetadataFromProduct(
  product: Product,
  extras: BuildExtras = {},
): ProductMetadataDoc {
  const { category, tags, images, stockInfo } = extras;

  // rest is persisted to only extras
  const rest: Record<string, unknown> = {};
  Object.entries(extras).forEach(([key, value]) => {
    if (!RESERVED_EXTRAS_KEYS.includes(key as any)) {
      rest[key] = value;
    }
  });

  const attributes: Record<string, string | number | null> = {
    name: product.name,
    description: product.description ?? null,
    price: product.price?.toNumber() ?? null,
    salePrice: product.salePrice?.toNumber() ?? null,
    sku: product.sku?.toString() ?? null,
    expiredAt: product.expiredAt?.toISOString() ?? null,
    importedAt: product.importedAt?.toISOString() ?? null,
    createdById: product.createdById ?? null,
  };

  return {
    productId: product.id,
    category: category ?? null,
    tags: tags ?? [],
    attributes,
    images: images ?? [],
    stockInfo: stockInfo ?? {},
    extra: rest ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
