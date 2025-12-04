import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateProductCommand } from '../impl/create-product.command';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import {
  Product,
  ProductProps,
} from 'src/modules/product/domain/product.entity';
import { buildProductMetadataFromProduct } from 'src/modules/product/mappers/product-to-metadat.mapper';
import { ProductCreatedEvent } from '../../events/impl/product-created.event';
import { ProductMetadataDoc } from 'src/modules/product/domain/read-models/product-metadata.entity';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand>
{
  private readonly logger = new Logger(CreateProductHandler.name);

  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateProductCommand) {
    const { dto, userId } = command;

    this.logger.log(`➕ Creating product: ${dto.name}`);

    // 1️⃣ Create domain entity
    const product = Product.create({
      ...dto,
      createdById: userId,
      createdAt: new Date().toISOString(),
    } as ProductProps);

    // 2️⃣ Save to Postgres
    const created = await this.productRepo.create(product);
    this.logger.log(`✅ Product created in Postgres: ${created.id}`);

    // 3️⃣ Create metadata in MongoDB
    try {
      const metadata: ProductMetadataDoc = buildProductMetadataFromProduct(
        created,
        {
          category: dto.category,
          tags: dto.tag,
        },
      );

      // Add timestamps
      metadata.createdAt = new Date();
      metadata.updatedAt = new Date();

      // Upsert and get metadataId
      const metadataId =
        await this.productReadRepo.upsertMetadataReturningId(metadata);
      this.logger.log(`✅ Metadata created in MongoDB: ${metadataId}`);

      // 4️⃣ Update product with metadataId
      created.applyMetadataId(metadataId);
      await this.productRepo.update(created);
      this.logger.log(`✅ Product updated with metadataId: ${metadataId}`);
    } catch (error) {
      this.logger.error('❌ Failed to create metadata:', error);
      // Don't fail the whole operation if metadata creation fails
    }

    // 5️⃣ Emit event
    this.eventBus.publish(new ProductCreatedEvent(created.id));
    this.logger.log(`📢 ProductCreatedEvent published: ${created.id}`);

    return created.toDTO();
  }
}
