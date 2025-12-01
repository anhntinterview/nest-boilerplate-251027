import { ProductSearchFilters } from 'src/modules/product/ports/product-read.repository.interface';

const BASE_SORT_FIELDS = ['price', 'createdAt', 'updatedAt'] as const;

type BaseSortField = (typeof BASE_SORT_FIELDS)[number];

export function isBaseSortField(value: string): value is BaseSortField {
  for (const field of BASE_SORT_FIELDS) {
    if (field === value) return true;
  }
  return false;
}

export function isAttributeSortField(
  value: string,
): value is `attributes.${string}` {
  return value.startsWith('attributes.');
}

export function toSortBy(raw?: string): ProductSearchFilters['sortBy'] {
  if (!raw) return undefined;

  if (isBaseSortField(raw)) return raw;
  if (isAttributeSortField(raw)) return raw;

  return undefined;
}
