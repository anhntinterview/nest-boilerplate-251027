import { ProductMetadataDoc } from '../domain/read-models/product-metadata.entity';

export type MongoOperator =
  | { $in: string[] | number[] | boolean[] }
  | { $gte: number | string }
  | { $lte: number | string }
  | { $eq: string | number | boolean };

export type MongoMatchValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, string | number | boolean>
  | null
  | MongoOperator;

export type MongoMatch = Record<string, MongoMatchValue>;

export type MongoQuery =
  | MongoMatch
  | { $and: MongoQuery[] }
  | { $or: MongoQuery[] };

export type MongoPipelineStage =
  | { $match: MongoMatch | MongoQuery }
  | { $sort: Record<string, 1 | -1> }
  | { $limit: number }
  | { $project: Record<string, 0 | 1> }
  | { $addFields: Record<string, unknown> };

export interface ProductSearchFilters {
  search?: string;
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | `attributes.${string}`;
  order?: 'asc' | 'desc';
  limit?: number;
  afterCursor?: string;
}

export interface ProductReadRepository {
  upsertMetadata(doc: ProductMetadataDoc): Promise<void>;
  findMetadataByProductId(
    productId: string,
  ): Promise<ProductMetadataDoc | null>;
  search(filters: ProductSearchFilters): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }>;
}
