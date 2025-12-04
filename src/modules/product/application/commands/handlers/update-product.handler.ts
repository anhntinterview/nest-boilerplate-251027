import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductCommand } from '../impl/update-product.command';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { NotFoundException, Logger } from '@nestjs/common';
import { buildProductMetadataFromProduct } from 'src/modules/product/mappers/product-to-metadat.mapper';
import { ProductUpdatedEvent } from '../../events/impl/product-updated.event';
import { ProductMetadataDoc } from 'src/modules/product/domain/read-models/product-metadata.entity';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements ICommandHandler<UpdateProductCommand>
{
  private readonly logger = new Logger(UpdateProductHandler.name);

  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand) {
    const { id, dto } = command;

    this.logger.log(`✏️ Updating product: ${id}`);

    // 1️⃣ Find existing product
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 2️⃣ Update domain entity
    Object.assign(product, dto);
    product.updatedAt = new Date();

    // 3️⃣ Save to Postgres
    const updated = await this.productRepo.update(product);
    this.logger.log(`✅ Product updated in Postgres: ${updated.id}`);

    // 4️⃣ Update metadata in MongoDB
    try {
      const existingMetadata =
        await this.productReadRepo.findMetadataByProductId(id);

      if (existingMetadata) {
        // Update existing metadata
        const updatedMetadata: ProductMetadataDoc =
          buildProductMetadataFromProduct(updated, {
            category: dto.category ?? existingMetadata.category,
            tags: dto.tag ?? existingMetadata.tags,
          });

        // Preserve existing fields not in update
        updatedMetadata._id = existingMetadata._id;
        updatedMetadata.images = existingMetadata.images;
        updatedMetadata.attributes = existingMetadata.attributes;
        updatedMetadata.stockInfo = existingMetadata.stockInfo;
        updatedMetadata.extra = existingMetadata.extra;
        updatedMetadata.createdAt = existingMetadata.createdAt;
        updatedMetadata.updatedAt = new Date();

        await this.productReadRepo.upsertMetadata(updatedMetadata);
        this.logger.log(`✅ Metadata updated in MongoDB`);
      } else {
        // Create new metadata if missing
        const newMetadata: ProductMetadataDoc = buildProductMetadataFromProduct(
          updated,
          {
            category: dto.category,
            tags: dto.tag,
          },
        );

        newMetadata.createdAt = new Date();
        newMetadata.updatedAt = new Date();

        const metadataId =
          await this.productReadRepo.upsertMetadataReturningId(newMetadata);
        this.logger.log(`✅ Metadata created in MongoDB: ${metadataId}`);

        // Update product with metadataId
        updated.applyMetadataId(metadataId);
        await this.productRepo.update(updated);
      }
    } catch (error) {
      this.logger.error('❌ Failed to update/create metadata:', error);
      // Don't fail the whole operation if metadata update fails
    }

    // 5️⃣ Emit event
    this.eventBus.publish(new ProductUpdatedEvent(updated.id));
    this.logger.log(`📢 ProductUpdatedEvent published: ${updated.id}`);

    return updated.toDTO();
  }
}
