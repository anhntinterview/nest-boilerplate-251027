import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() price?: number;
  @IsOptional() @IsNumber() salePrice?: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() tag?: string[];
}
