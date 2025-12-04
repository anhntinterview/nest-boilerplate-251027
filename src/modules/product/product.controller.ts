import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Put,
  Get,
  Query,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from './application/commands/impl/create-product.command';
import { UpdateProductCommand } from './application/commands/impl/update-product.command';
import { DeleteProductCommand } from './application/commands/impl/delete-product.command';
import { GetProductQuery } from './application/queries/impl/get-product.query';
import { SearchProductDto } from './dto/search-product.dto';
import { SearchProductQuery } from './application/queries/impl/search-product.query';
import { toSortBy } from 'src/common/utils/product/isValidSort';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductMetadataDoc } from './domain/read-models/product-metadata.entity';

@Controller('products')
export class ProductController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.commandBus.execute(new CreateProductCommand(dto));
  }

  @Get()
  async search(
    @Query() query: SearchProductDto,
  ): Promise<{ items: ProductMetadataDoc[]; nextCursors?: string }> {
    return this.queryBus.execute(
      new SearchProductQuery({
        ...query,
        sortBy: toSortBy(query.sortBy),
      }),
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ProductResponseDto> {
    console.log('Get started in product by ID');
    return this.queryBus.execute(new GetProductQuery(id));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.commandBus.execute(new UpdateProductCommand(id, dto));
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.commandBus.execute(new DeleteProductCommand(id));
  }
}
