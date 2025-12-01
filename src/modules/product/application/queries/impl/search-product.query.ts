import { ProductSearchFilters } from 'src/modules/product/ports/product-read.repository.interface';

export class SearchProductQuery {
  constructor(public readonly filters: ProductSearchFilters) {}
}
