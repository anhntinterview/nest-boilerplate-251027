import { UpdateProductDto } from 'src/modules/product/dto/update-product.dto';

export class UpdateProductCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateProductDto,
  ) {}
}
