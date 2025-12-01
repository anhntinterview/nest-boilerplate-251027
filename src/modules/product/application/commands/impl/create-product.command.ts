import { CreateProductDto } from 'src/modules/product/dto/create-product.dto';

export class CreateProductCommand {
  constructor(
    public readonly dto: CreateProductDto,
    public readonly userId?: string,
  ) {}
}
