import { Field, ID, ObjectType, Float } from '@nestjs/graphql';

@ObjectType('Product')
export class ProductModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => Float, { nullable: true })
  salePrice?: number;

  @Field({ nullable: true })
  sku?: string;

  @Field({ nullable: true })
  expiredAt?: string;

  @Field({ nullable: true })
  importedAt?: string;

  @Field({ nullable: true })
  createdById?: string;

  @Field({ nullable: true })
  metadataId?: string;

  @Field()
  createdAt: string;

  @Field({ nullable: true })
  updatedAt?: string;
}
