import { z } from 'zod';
import { Price } from './value-objects/price.vo';
import { SKU } from './value-objects/sku.vo';
import { randomUUID } from 'crypto';

const ProductPropsSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
  sku: z.string().optional(),
  expiredAt: z.string().optional().nullable(),
  importedAt: z.string().optional().nullable(),
  createdById: z.string().optional().nullable(),
  metadataId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductProps = z.infer<typeof ProductPropsSchema>;

export class Product {
  public readonly id: string;
  public name: string;
  public description?: string | null;
  public price?: Price | null;
  public salePrice?: Price | null;
  public sku?: SKU | null;
  public expiredAt?: Date | null;
  public importedAt?: Date | null;
  public readonly createdById?: string | null;
  public metadataId?: string | null;
  public readonly createdAt: Date;
  public updatedAt?: Date;

  private constructor(props: ProductProps) {
    this.id = props.id ?? randomUUID();
    this.name = props.name;
    this.description = props.description ?? null;
    this.price =
      props.price !== undefined && props.price !== null
        ? Price.create(props.price)
        : null;
    this.salePrice =
      props.salePrice !== undefined && props.salePrice !== null
        ? Price.create(props.salePrice)
        : null;
    this.sku = props.sku ? SKU.create(props.sku) : null;
    this.expiredAt = props.expiredAt ? new Date(props.expiredAt) : null;
    this.importedAt = props.importedAt ? new Date(props.importedAt) : null;
    this.createdById = props.createdById ?? null;
    this.metadataId = props.metadataId ?? null;
    this.createdAt = props.createdAt ? new Date(props.createdAt) : new Date();
    this.updatedAt = props.updatedAt ? new Date(props.updatedAt) : undefined;
  }

  static create(props: ProductProps) {
    ProductPropsSchema.parse(props);

    return new Product(props);
  }

  // A lean serilizer for transport / storing to Postgres via Prisma
  toPrismaCreateData() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price ? this.price.toNumber() : null,
      salePrice: this.salePrice ? this.salePrice.toNumber() : null,
      sku: this.sku ? this.sku.toString() : null,
      expiredAt: this.expiredAt,
      importedAt: this.importedAt,
      createdById: this.createdById,
      metadataId: this.metadataId,
    };
  }

  // Minimal DTO for APIs
  toDTO() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price?.toNumber() ?? null,
      salePrice: this.salePrice?.toNumber() ?? null,
      sku: this.sku?.toString() ?? null,
      expiredAt: this.expiredAt?.toISOString() ?? null,
      importedAt: this.importedAt?.toISOString() ?? null,
      metadataId: this.metadataId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString() ?? null,
    };
  }

  // Mutators that return void but keep entity consistent (small, explicit)
  applyMetadataId(metadataId: string) {
    this.metadataId = metadataId;
    this.updatedAt = new Date();
  }
}
