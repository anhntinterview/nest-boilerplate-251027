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

@CommandHandler(CreateProductCommand)
export class CreateProductHandler
  implements ICommandHandler<CreateProductCommand>
{
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateProductCommand) {
    const { dto, userId } = command;
    const product = Product.create({
      ...dto,
      createdById: userId,
    } as ProductProps);

    const created = await this.productRepo.create(product);

    const metadata = buildProductMetadataFromProduct(created, {
      category: dto.category,
      tags: dto.tag,
    });

    await this.productReadRepo.upsertMetadata(metadata);

    // Emit event
    this.eventBus.publish(new ProductCreatedEvent(created.id));

    return created.toDTO();
  }
}
