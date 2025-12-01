import { ObjectId } from 'mongodb';

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
