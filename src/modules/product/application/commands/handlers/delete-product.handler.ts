import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteProductCommand } from '../impl/delete-product.command';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';
import { NotFoundException, Logger } from '@nestjs/common';

@CommandHandler(DeleteProductCommand)
export class DeleteProductHandler
  implements ICommandHandler<DeleteProductCommand>
{
  private readonly logger = new Logger(DeleteProductHandler.name);

  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
  ) {}

  async execute(command: DeleteProductCommand): Promise<{ success: boolean }> {
    const { id } = command;

    this.logger.log(`🗑️ Deleting product: ${id}`);

    // 1️⃣ Check if product exists
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 2️⃣ Delete metadata from MongoDB FIRST
    try {
      this.logger.log(`🔍 Looking for metadata to delete for productId: ${id}`);
      await this.productReadRepo.deleteMetadataByProductId(id);
    } catch (error) {
      this.logger.error(
        '❌ Failed to delete metadata (will continue with product deletion):',
        error,
      );
      // Don't fail the whole operation if metadata deletion fails
    }

    // 3️⃣ Delete from Postgres
    await this.productRepo.delete(id);
    this.logger.log(`✅ Product deleted from Postgres: ${id}`);

    return { success: true };
  }
}
