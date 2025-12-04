import { ObjectId } from 'mongodb';
import { Prisma } from '@prisma/client';

export interface ProductMetadataDoc {
  _id?: ObjectId | string; // ObjectId string from Prisma Mongo
  productId: string;
  category?: string | null;
  tags: string[];
  attributes?: Record<string, unknown> | null; // denormalized product attributes: name, description, price, salePrice, etc.
  images?: string[];
  stockInfo?: Record<string, unknown> | null;
  extra?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}
/**
 * Type for raw MongoDB document from Prisma MongoDB client
 */
export interface RawMongoMetadata {
  id?: string;
  _id?: ObjectId | string | { toString(): string };
  productId: string;
  category?: string | null;
  tags?: string[] | null;
  attributes?: Prisma.JsonValue | null;
  images?: string[] | null;
  stockInfo?: Prisma.JsonValue | null;
  extra?: Prisma.JsonValue | null;
  createdAt?: Date | { $date: string } | string | null;
  updatedAt?: Date | { $date: string } | string | null;
}
/**
 * Type guard to check if value is MongoDB $date object
 */
export function isMongoDateObject(value: unknown): value is { $date: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$date' in value &&
    typeof (value as { $date: unknown }).$date === 'string'
  );
}

// Type-safe extraction of results
export interface AggregationResult {
  cursor?: {
    firstBatch?: RawMongoMetadata[];
  };
}
