import { Product } from 'src/modules/product/domain/product.entity';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaProductRepository } from '../adapters/prisma-product.repository';
import { PrismaProductReadRepository } from '../adapters/prisma-product-read.repository';
import { ProductSyncService } from '../application/services/product-sync.service';
import {
  CreateProductInput,
  ProductMetadataGQL,
  UpdateProductInput,
  UpdateProductMetadataInput,
} from './product.input';
import { ProductModel } from './product.model';
import { ProductFull } from './product-full.model';
import { ProductMetadataDoc } from '../domain/read-models/product-metadata.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SKU } from '../domain/value-objects/sku.vo';
import { Price } from '../domain/value-objects/price.vo';

@Resolver(() => ProductModel)
export class ProductResolver {
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly productSyncService: ProductSyncService,
  ) {}

  // ===========================
  // Private Mappers
  // ===========================
  private toGraphQLModel(product: Product): ProductModel {
    console.log(`product: `, product);
    return {
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      price: product.price?.toNumber() ?? undefined,
      salePrice: product.salePrice?.toNumber() ?? undefined,
      sku: product.sku?.toString() ?? undefined,
      expiredAt: product.expiredAt?.toISOString() ?? undefined,
      importedAt: product.importedAt?.toISOString() ?? undefined,
      createdById: product.createdById ?? undefined,
      metadataId: product.metadataId ?? undefined,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt?.toISOString() ?? undefined,
    };
  }

  private mapMetadataToGQL(metadata: ProductMetadataDoc): ProductMetadataGQL {
    return {
      _id: metadata._id ? metadata._id.toString() : undefined,
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
      // ✅ Ensure Date objects are properly passed to GraphQL
      createdAt: metadata.createdAt ?? undefined,
      updatedAt: metadata.updatedAt ?? undefined,
    };
  }

  // ✅ Type-safe JSON parsing helper
  private safeJsonParse(jsonString: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(jsonString);
      // Type guard: check if parsed is an object
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {}; // Return empty object on parse error
    }
  }

  // ===========================
  // Queries
  // ===========================
  @Query(() => ProductFull, { nullable: true })
  async productFull(@Args('id') id: string): Promise<ProductFull | null> {
    // 1. Get record from Postgres
    const product = await this.productRepo.findById(id);
    console.log('📦 Product from Postgres:', product);

    if (!product) {
      console.log('❌ Product not found');
      return null;
    }

    // 2. Sync metadata if missing
    await this.productSyncService.syncMissingMetadata();

    // 3. Get metadata from Mongo
    const metadata = await this.productReadRepo.findMetadataByProductId(id);
    console.log('📄 Metadata from MongoDB:', metadata);

    // 4. Build GQL model
    const result = {
      product: this.toGraphQLModel(product),
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

  /**
   * Search products by category (returns metadata only)
   */
  @Query(() => [ProductMetadataGQL])
  async products(
    @Args('category', { nullable: true }) category?: string,
  ): Promise<ProductMetadataGQL[]> {
    console.log('🔍 Query products with category:', category);

    // Sync metadata before search
    await this.productSyncService.syncMissingMetadata();

    const filters = category ? { category } : {};
    const { items } = await this.productReadRepo.search(filters);

    console.log(`✅ Found ${items.length} products`);

    return items.map((item) => this.mapMetadataToGQL(item));
  }

  // ===========================
  // Mutations
  // ===========================
  @Mutation(() => ProductModel)
  async createProduct(
    @Args('input') input: CreateProductInput,
  ): Promise<ProductModel> {
    console.log('➕ Creating product:', input.name);

    // Validate required fields
    if (!input.name || input.name.trim() === '') {
      throw new BadRequestException('Product name is required');
    }

    // 1️⃣ Create domain entity
    const product = Product.create({
      name: input.name.trim(),
      description: input.description?.trim(),
      price: input.price,
      salePrice: input.salePrice,
      sku: input.sku?.trim(),
      expiredAt: input.expiredAt,
      importedAt: input.importedAt,
      createdById: input.createdById,
      createdAt: new Date().toISOString(),
    });

    // 2️⃣ Save via repository
    const created = await this.productRepo.create(product);
    console.log('✅ Product created in Postgres:', created.id);

    // 3️⃣ Create metadata in MongoDB
    try {
      const metadata: ProductMetadataDoc = {
        productId: created.id,
        category: null,
        tags: [],
        attributes: {},
        images: [],
        stockInfo: null,
        extra: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const metadataId =
        await this.productReadRepo.upsertMetadataReturningId(metadata);
      console.log('✅ Metadata created in MongoDB:', metadataId);

      // 4️⃣ Update product with metadataId
      created.applyMetadataId(metadataId);
      await this.productRepo.update(created);
      console.log('✅ Product updated with metadataId:', metadataId);
    } catch (error) {
      console.error('❌ Failed to create metadata:', error);
      // Don't fail the whole operation if metadata creation fails
    }

    // 3️⃣ Convert to GraphQL model
    return this.toGraphQLModel(created);
  }

  /**
   * Update existing product
   */
  @Mutation(() => ProductModel)
  async updateProduct(
    @Args('id') id: string,
    @Args('input') input: UpdateProductInput,
  ): Promise<ProductModel> {
    console.log('✏️ Updating product:', id);

    // Validate ID
    if (!id || id.trim() === '') {
      throw new BadRequestException('Product ID is required');
    }

    // Find existing product
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Update domain entity with only provided fields
    if (input.name !== undefined) existing.name = input.name.trim();
    if (input.description !== undefined)
      existing.description = input.description?.trim();
    if (input.price !== undefined) {
      existing.price = Price.create(input.price);
    }
    if (input.salePrice !== undefined) {
      existing.salePrice = Price.create(input.salePrice);
    }
    if (input.sku !== undefined) {
      existing.sku = SKU.create(input.sku.trim());
    }
    if (input.expiredAt !== undefined)
      existing.expiredAt = new Date(input.expiredAt);
    if (input.importedAt !== undefined)
      existing.importedAt = new Date(input.importedAt);

    existing.updatedAt = new Date();

    // Save and return
    const updated = await this.productRepo.update(existing);
    console.log('✅ Product updated in Postgres:', updated.id);

    // Update metadata in MongoDB if it exists
    try {
      const existingMetadata =
        await this.productReadRepo.findMetadataByProductId(id);

      if (existingMetadata) {
        // Update existing metadata
        const updatedMetadata: ProductMetadataDoc = {
          ...existingMetadata,
          updatedAt: new Date(),
        };

        await this.productReadRepo.upsertMetadata(updatedMetadata);
        console.log('✅ Metadata updated in MongoDB');
      } else {
        // Create new metadata if missing
        const newMetadata: ProductMetadataDoc = {
          productId: updated.id,
          category: null,
          tags: [],
          attributes: {},
          images: [],
          stockInfo: null,
          extra: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const metadataId =
          await this.productReadRepo.upsertMetadataReturningId(newMetadata);
        console.log('✅ Metadata created in MongoDB:', metadataId);

        // Update product with metadataId
        updated.applyMetadataId(metadataId);
        await this.productRepo.update(updated);
      }
    } catch (error) {
      console.error('❌ Failed to update/create metadata:', error);
      // Don't fail the whole operation if metadata update fails
    }

    return this.toGraphQLModel(updated);
  }

  /**
   * Delete product
   */
  @Mutation(() => Boolean)
  async deleteProduct(@Args('id') id: string): Promise<boolean> {
    console.log('🗑️ Deleting product:', id);

    // Validate ID
    if (!id || id.trim() === '') {
      throw new BadRequestException('Product ID is required');
    }

    // Check if product exists
    const existing = await this.productRepo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Delete
    await this.productRepo.delete(id);
    console.log('✅ Product deleted from Postgres:', id);

    // Delete metadata from MongoDB FIRST (before deleting product)
    try {
      console.log('🔍 Looking for metadata to delete for productId:', id);
      await this.productReadRepo.deleteMetadataByProductId(id);
    } catch (error) {
      console.error(
        '❌ Failed to delete metadata (will continue with product deletion):',
        error,
      );
      // Don't fail the whole operation if metadata deletion fails
    }

    // Delete from Postgres
    await this.productRepo.delete(id);
    console.log('✅ Product deleted from Postgres:', id);

    return true;
  }

  /**
   * Update product metadata (MongoDB only)
   */
  @Mutation(() => ProductMetadataGQL)
  async updateProductMetadata(
    @Args('productId') productId: string,
    @Args('input') input: UpdateProductMetadataInput,
  ): Promise<ProductMetadataGQL> {
    console.log('📝 Updating product metadata:', productId);

    // Validate productId
    if (!productId || productId.trim() === '') {
      throw new BadRequestException('Product ID is required');
    }

    // Check if product exists in Postgres
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Get existing metadata or create new one
    let existingMetadata =
      await this.productReadRepo.findMetadataByProductId(productId);

    if (!existingMetadata) {
      // Create new metadata if not exists
      existingMetadata = {
        productId,
        category: null,
        tags: [],
        attributes: {},
        images: [],
        stockInfo: null,
        extra: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Update metadata fields
    const updatedMetadata: ProductMetadataDoc = {
      ...existingMetadata,
      category:
        input.category !== undefined
          ? input.category
          : existingMetadata.category,
      tags: input.tags !== undefined ? input.tags : existingMetadata.tags,
      images:
        input.images !== undefined ? input.images : existingMetadata.images,
      attributes: input.attributes
        ? this.safeJsonParse(input.attributes)
        : existingMetadata.attributes,
      stockInfo: input.stockInfo
        ? this.safeJsonParse(input.stockInfo)
        : existingMetadata.stockInfo,
      extra: input.extra
        ? this.safeJsonParse(input.extra)
        : existingMetadata.extra,
      updatedAt: new Date(),
    };

    // Save to MongoDB
    const metadataId =
      await this.productReadRepo.upsertMetadataReturningId(updatedMetadata);
    console.log('✅ Metadata updated in MongoDB:', metadataId);

    // Update product with metadataId if not set
    if (!product.metadataId) {
      product.applyMetadataId(metadataId);
      await this.productRepo.update(product);
      console.log('✅ Product updated with metadataId:', metadataId);
    }

    // Return updated metadata
    updatedMetadata._id = metadataId;
    return this.mapMetadataToGQL(updatedMetadata);
  }
}
