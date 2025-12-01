import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProductQuery } from '../impl/get-product.query';
import { PrismaProductRepository } from 'src/modules/product/adapters/prisma-product.repository';
import { PrismaProductReadRepository } from 'src/modules/product/adapters/prisma-product-read.repository';

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery> {
  constructor(
    private readonly productRepo: PrismaProductRepository,
    private readonly productReadRepo: PrismaProductReadRepository,
  ) {}

  async execute(query: GetProductQuery) {
    const product = await this.productRepo.findById(query.id);
    if (!product) return null;
    const metadata = await this.productReadRepo.findMetadataByProductId(
      query.id,
    );

    return { ...product.toDTO(), metadata };
  }
}
