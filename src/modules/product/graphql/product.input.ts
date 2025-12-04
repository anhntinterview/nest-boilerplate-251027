// src/modules/product/graphql/product.input.ts
import { InputType, Field, Float, ObjectType, ID } from '@nestjs/graphql';

@InputType()
export class UpdateProductMetadataInput {
  @Field({ nullable: true })
  category?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  images?: string[];

  @Field(() => String, { nullable: true })
  attributes?: string; // JSON string

  @Field(() => String, { nullable: true })
  stockInfo?: string; // JSON string

  @Field(() => String, { nullable: true })
  extra?: string; // JSON string
}

@ObjectType()
export class ProductMetadataGQL {
  @Field(() => ID, { nullable: true })
  _id?: string;

  @Field()
  productId: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => [String])
  tags: string[];

  @Field(() => String, { nullable: true })
  attributes?: string; // có thể serialize JSON nếu cần

  @Field(() => [String], { nullable: true })
  images?: string[];

  @Field(() => String, { nullable: true })
  stockInfo?: string; // serialize JSON nếu muốn

  @Field(() => String, { nullable: true })
  extra?: string; // serialize JSON nếu muốn

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;
}

@InputType()
export class CreateProductInput {
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
}

@InputType()
export class UpdateProductInput {
  @Field({ nullable: true })
  name?: string;

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
}
