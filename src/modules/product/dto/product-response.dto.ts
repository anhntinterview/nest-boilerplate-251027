export interface ProductResponseDto {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  salePrice: number | null;
  sku: string | null;
  expiredAt: string | null;
  importedAt: string | null;
  metadataId: string | null;
  createdAt: string;
  updatedAt: string | null;
}
