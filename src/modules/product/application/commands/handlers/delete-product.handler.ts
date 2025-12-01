import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteProductCommand } from '../impl/delete-product.command';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler
  implements ICommandHandler<DeleteProductCommand>
{
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
  ) {}

  async execute(command: DeleteProductCommand): Promise<any> {
    const { id } = command;
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    await this.productRepo.delete(id);
    await this.productReadRepo.upsertMetadata({
      productId: id,
      tags: [],
      images: [],
      extra: {},
      attributes: {},
      stockInfo: {},
    }); // Optional: clear metadata

    return { success: true };
  }
}
