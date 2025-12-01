import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductCommand } from '../impl/update-product.command';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { NotFoundException } from '@nestjs/common';
import { buildProductMetadataFromProduct } from 'src/modules/product/mappers/product-to-metadat.mapper';
import { ProductUpdatedEvent } from '../../events/impl/product-updated.event';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler
  implements ICommandHandler<UpdateProductCommand>
{
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateProductCommand) {
    const { id, dto } = command;
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    Object.assign(product, dto);
    const updated = await this.productRepo.update(product);

    const metadata = buildProductMetadataFromProduct(updated, {
      category: dto.category,
      tags: dto.tag,
    });

    await this.productReadRepo.upsertMetadata(metadata);

    this.eventBus.publish(new ProductUpdatedEvent(updated.id));

    return updated.toDTO();
  }
}
