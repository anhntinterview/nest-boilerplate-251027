import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProductRepository } from '../ports/product.repository.interface';
import { PostgresService } from 'src/prisma/postgres/postgres.service';
import { Product } from '../domain/product.entity';

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PostgresService) {}

  async updateMetadataId(productId: string, metadataId: string): Promise<void> {
    await this.prisma.product.update({
      where: { id: productId },
      data: { metadataId },
    });
  }

  async findAll(): Promise<Product[]> {
    const rawProduct = await this.prisma.product.findMany();
    return rawProduct.map((p) =>
      Product.create({
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        price: p.price !== null ? Number(p.price) : undefined,
        salePrice: p.salePrice !== null ? Number(p.salePrice) : undefined,
        sku: p.sku ?? undefined,
        expiredAt: p.expiredAt?.toISOString() ?? undefined,
        importedAt: p.importedAt?.toISOString() ?? undefined,
        createdById: p.createdById ?? undefined,
        metadataId: p.metadataId ?? undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt?.toISOString(),
      }),
    );
  }

  async create(product: Product): Promise<Product> {
    const data = product.toPrismaCreateData();
    const created = await this.prisma.product.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        salePrice: true,
        sku: true,
        expiredAt: true,
        importedAt: true,
        createdById: true,
        metadataId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Product.create({
      ...created,
      price: created.price ? Number(created.price) : undefined,
      salePrice: created.salePrice ? Number(created.salePrice) : undefined,
      description: created.description ?? undefined,
      sku: created.sku ?? undefined,
      expiredAt: created.expiredAt
        ? created.expiredAt.toISOString()
        : undefined,
      importedAt: created.importedAt
        ? created.importedAt.toISOString()
        : undefined,
      createdById: created.createdById ?? undefined,
      metadataId: created.metadataId ?? undefined,
      createdAt: created.createdAt
        ? created.updatedAt.toISOString()
        : undefined,
      updatedAt: created.updatedAt
        ? created.updatedAt.toISOString()
        : undefined,
    });
  }

  async update(product: Product): Promise<Product> {
    const data = product.toPrismaCreateData();
    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        salePrice: true,
        sku: true,
        expiredAt: true,
        importedAt: true,
        createdById: true,
        metadataId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Product.create({
      ...updated,
      price: updated.price ? Number(updated.price) : undefined,
      salePrice: updated.salePrice ? Number(updated.salePrice) : undefined,
      description: updated.description ?? undefined,
      sku: updated.sku ?? undefined,
      expiredAt: updated.expiredAt
        ? updated.expiredAt.toISOString()
        : undefined,
      importedAt: updated.importedAt
        ? updated.importedAt.toISOString()
        : undefined,
      createdById: updated.createdById ?? undefined,
      metadataId: updated.metadataId ?? undefined,
      createdAt: updated.createdAt
        ? updated.updatedAt.toISOString()
        : undefined,
      updatedAt: updated.updatedAt
        ? updated.updatedAt.toISOString()
        : undefined,
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      throw new InternalServerErrorException('Failed to delete product', err);
    }
  }

  /**
   * Find by id, returns domain Product or null.
   */
  async findById(id: string): Promise<Product | null> {
    const found = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        salePrice: true,
        sku: true,
        expiredAt: true,
        importedAt: true,
        createdById: true,
        metadataId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!found) return null;
    return Product.create({
      ...found,
      price: found.price ? Number(found.price) : undefined,
      salePrice: found.salePrice ? Number(found.salePrice) : undefined,
      description: found.description ?? undefined,
      sku: found.sku ?? undefined,
      expiredAt: found.expiredAt ? found.expiredAt.toISOString() : undefined,
      importedAt: found.importedAt ? found.importedAt.toISOString() : undefined,
      createdById: found.createdById ?? undefined,
      metadataId: found.metadataId ?? undefined,
      createdAt: found.createdAt ? found.updatedAt.toISOString() : undefined,
      updatedAt: found.updatedAt ? found.updatedAt.toISOString() : undefined,
    });
  }

  async batchFindByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];

    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, price: true, sku: true, createdAt: true },
    });

    return rows.map((r) =>
      Product.create({
        id: r.id,
        name: r.name,
        price: r.price ? Number(r.price) : undefined,
        sku: r.sku ?? undefined,
        createdAt: r.createdAt?.toISOString(),
      }),
    );
  }
}
