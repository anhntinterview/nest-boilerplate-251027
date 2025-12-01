import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class SearchProductDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsNumber() minPrice?: number;
  @IsOptional() @IsNumber() maxPrice?: number;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() order?: 'asc' | 'desc';
  @IsOptional() @IsInt() @Min(1) limit?: number = 10;
  @IsOptional() @IsString() afterCursor?: string;
}
