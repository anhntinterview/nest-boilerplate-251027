import { ObjectType, Field } from '@nestjs/graphql';
import { ProductModel } from './product.model';
import { ProductMetadataGQL } from './product.input';

@ObjectType()
export class ProductFull {
  @Field(() => ProductModel, { nullable: true })
  product?: ProductModel;

  @Field(() => ProductMetadataGQL, { nullable: true })
  metadata?: ProductMetadataGQL;
}
