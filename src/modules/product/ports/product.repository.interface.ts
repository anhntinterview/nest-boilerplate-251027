import { Product } from '../domain/product.entity';
import { ProductMetadataDoc } from '../domain/read-models/product-metadata.entity';
import { ProductSearchFilters } from './product-read.repository.interface';

export interface ProductRepository {
  /**
   * Persist a new product to the write DB (Postgres).
   * Returns the persisted domain entity.
   */
  create(product: Product): Promise<Product>;

  /**
   * Update an existing product. should throw if the product does not exist
   */
  update(product: Product): Promise<Product>;

  /**
   * Delete a prodcut by id (hard delete). Implementations may choose soft-delete.
   */
  delete(id: string): Promise<void>;

  /**
   * Find a product by id on the write DB.
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Efficient batch read by ids (single query)
   */
  batchFindByIds(ids: string[]): Promise<Product[]>;

  /**
   * Update metadataId field in product
   */
  updateMetadataId(productId: string, metadataId: string): Promise<void>;

  /**
   * Find all products without metadata
   */
  findProductsWithoutMetadata(): Promise<Product[]>;
}

/**
 * Read-model repository (mongo) - for projecttions / queries.
 * Keep read-model operations lean and highly-performant
 */
export interface ProductReadRepository {
  /**
   * Upsert the read-model (ProductMetadataDoc) from a product snapshot
   */
  upsertMetadata(doc: ProductMetadataDoc): Promise<void>;

  /**
   * Upsert metadata and return the MongoDB document id
   */
  upsertMetadataReturningId(doc: ProductMetadataDoc): Promise<string>;

  /**
   * Find metadata by productId
   */
  findMetadataByProductId(
    productId: string,
  ): Promise<ProductMetadataDoc | null>;

  /**
   * Delete metadata by id
   */
  deleteMetadata(id: string): Promise<void>;

  /**
   * Delete metadata by productId
   */
  deleteMetadataByProductId(productId: string): Promise<void>;

  /**
   * Search / query the read-model using the provided filters.
   * Implementation should support cursor-based pagination and return
   * nextCursor when available.
   */
  search(filters: ProductSearchFilters): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }>;
}
