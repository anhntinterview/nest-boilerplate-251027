import { Injectable } from '@nestjs/common';
import { ProductReadRepository } from '../ports/product.repository.interface';
import { MongoService } from 'src/prisma/mongo/mongo.service';
import {
  AggregationResult,
  isMongoDateObject,
  ProductMetadataDoc,
  RawMongoMetadata,
} from '../domain/read-models/product-metadata.entity';
import { ObjectId } from 'mongodb';
import {
  MongoMatch,
  MongoPipelineStage,
  MongoQuery,
  ProductSearchFilters,
} from '../ports/product-read.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaProductReadRepository implements ProductReadRepository {
  constructor(private readonly mongo: MongoService) {}

  /**
   * Helper: Normalize MongoDB object to plain JavaScript object
   * Handles MongoDB-specific types like ObjectId and $date
   */
  private normalizeMongoDoc(item: RawMongoMetadata): ProductMetadataDoc {
    // Handle _id conversion
    let normalizedId: string | undefined;
    if (item._id) {
      if (typeof item._id === 'string') {
        normalizedId = item._id;
      } else if (typeof item._id === 'object' && 'toString' in item._id) {
        normalizedId = item._id.toString();
      }
    } else if (item.id) {
      normalizedId = item.id;
    }

    // Handle createdAt conversion
    let normalizedCreatedAt: Date | undefined;
    if (isMongoDateObject(item.createdAt)) {
      normalizedCreatedAt = new Date(item.createdAt.$date);
    } else if (item.createdAt instanceof Date) {
      normalizedCreatedAt = item.createdAt;
    } else if (typeof item.createdAt === 'string') {
      normalizedCreatedAt = new Date(item.createdAt);
    }

    // Handle updatedAt conversion
    let normalizedUpdatedAt: Date | undefined;
    if (isMongoDateObject(item.updatedAt)) {
      normalizedUpdatedAt = new Date(item.updatedAt.$date);
    } else if (item.updatedAt instanceof Date) {
      normalizedUpdatedAt = item.updatedAt;
    } else if (typeof item.updatedAt === 'string') {
      normalizedUpdatedAt = new Date(item.updatedAt);
    }

    // Handle JSON values
    const normalizeJsonValue = (
      value: Prisma.JsonValue | null | undefined,
    ): Record<string, unknown> => {
      if (!value) return {};
      if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
      return {};
    };

    return {
      _id: normalizedId,
      productId: item.productId,
      category: item.category ?? null,
      tags: item.tags ?? [],
      attributes: normalizeJsonValue(item.attributes),
      images: item.images ?? [],
      stockInfo: normalizeJsonValue(item.stockInfo),
      extra: normalizeJsonValue(item.extra),
      createdAt: normalizedCreatedAt,
      updatedAt: normalizedUpdatedAt,
    };
  }

  /**
   * Private: upsert và return Mongo _id
   */
  private async upsertAndReturnId(doc: ProductMetadataDoc): Promise<string> {
    const existing = await this.mongo.productMetadata.findFirst({
      where: { productId: doc.productId },
    });

    if (existing) {
      await this.mongo.productMetadata.update({
        where: { id: existing.id },
        data: {
          category: doc.category,
          tags: doc.tags,
          attributes: doc.attributes as Prisma.InputJsonValue,
          images: doc.images,
          stockInfo: doc.stockInfo as Prisma.InputJsonValue,
          extra: doc.extra as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
      return existing.id;
    }

    const created = await this.mongo.productMetadata.create({
      data: {
        productId: doc.productId,
        category: doc.category,
        tags: doc.tags,
        attributes: doc.attributes as Prisma.InputJsonValue,
        images: doc.images,
        stockInfo: doc.stockInfo as Prisma.InputJsonValue,
        extra: doc.extra as Prisma.InputJsonValue,
      },
    });

    return created.id;
  }

  /**
   * Interface requirement: nothing is returned
   */
  async upsertMetadata(doc: ProductMetadataDoc): Promise<void> {
    await this.upsertAndReturnId(doc);
  }

  /**
   * API is spend to use syncMissingMetadata(): upsert + return id
   */
  async upsertMetadataReturningId(doc: ProductMetadataDoc): Promise<string> {
    return this.upsertAndReturnId(doc);
  }

  /**
   * Delete metadata by id
   */
  async deleteMetadata(id: string): Promise<void> {
    try {
      await this.mongo.productMetadata.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Failed to delete metadata:', error);
      throw error;
    }
  }

  /**
   * Delete metadata by productId (alternative method)
   */
  async deleteMetadataByProductId(productId: string): Promise<void> {
    try {
      console.log('🗑️ Attempting to delete metadata for productId:', productId);

      const metadata = await this.mongo.productMetadata.findFirst({
        where: { productId },
      });

      if (!metadata) {
        console.log('ℹ️ No metadata found for productId:', productId);
        return;
      }

      await this.mongo.productMetadata.delete({
        where: { id: metadata.id },
      });

      console.log('✅ Metadata deleted successfully for productId:', productId);
    } catch (error) {
      console.error('❌ Failed to delete metadata by productId:', error);
      throw error;
    }
  }

  async findMetadataByProductId(
    productId: string,
  ): Promise<ProductMetadataDoc | null> {
    const res = await this.mongo.productMetadata.findFirst({
      where: { productId },
    });

    // ✅ Use normalizer to handle MongoDB types
    return this.normalizeMongoDoc(res as RawMongoMetadata);
  }

  async search(filters: ProductSearchFilters): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }> {
    /**
     * 1️⃣ receive filters from client
     * Get the parameters to find for filters.
     * if client did not send limit, the default limit is 20.
     * sortBy & order to arrange result.
     */
    const {
      search,
      category,
      tags,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      order = 'desc',
      limit: rawLimit,
      afterCursor,
    } = filters;
    const limit = typeof rawLimit === 'number' && rawLimit > 0 ? rawLimit : 20;

    /**
     * 2️⃣ Khởi tạo pipeline
     * - Pipeline là mảng các giai đoạn
     * ($match, $sort, $limit, $project...)
     * dùng trong MongoDB Aggregation Framework.
     * - Mỗi stage xử lý dữ liệu theo một bước,
     * kết quả của stage trước được truyền sang stage sau.
     */
    const pipeline: MongoPipelineStage[] = [];

    // ✅ CHỈ thêm $text search khi có search parameter
    /**
     * 3️⃣ Thêm $text search nếu có
     * Nếu người dùng nhập search (ví dụ "rec"),
     * thêm stage $match với $text.
     * $addFields tạo thêm trường score
     * dùng để xếp hạng kết quả theo độ liên quan (textScore).
     * Chú ý: $match với $text phải là
     * stage đầu tiên trong pipeline.
     */
    if (search && search.trim()) {
      pipeline.push({ $match: { $text: { $search: search } } });
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }

    // MATCH stage
    /**
     * 4️⃣ Thêm các filter khác
     * Kiểm tra các filter khác như category, tags, price.
     * Nếu có, thêm $match stage để lọc dữ liệu theo các điều kiện này.
     */
    const match: MongoMatch = {};
    if (category) match.category = category;
    if (tags && tags.length) match.tags = { $in: tags };
    if (minPrice != null || maxPrice != null) {
      match['attributes.price'] = {};
      if (minPrice != null) match['attributes.price'].$gte = minPrice;
      if (maxPrice != null) match['attributes.price'].$lte = maxPrice;
    }

    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    const sortDirection = order === 'asc' ? 1 : -1;
    /**
     * 6️⃣ Thêm sắp xếp và limit
     */
    const sortStage: Record<string, 1 | -1> = {
      [sortBy]: sortDirection,
      _id: sortDirection,
    };

    /**
     * 5️⃣ Thêm cursor pagination (nếu có)
     * Nếu client dùng cursor pagination, decode afterCursor.
     * Tạo filter $match để chỉ lấy dữ liệu sau cursor.
     * Điều này giúp phân trang “an toàn” với sắp xếp phức tạp.
     */
    if (afterCursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(afterCursor, 'base64').toString('utf-8'),
        ) as { pivotValue?: unknown; pivotId?: string };
        const pivotValue = decoded.pivotValue;
        const pivotId = new ObjectId(decoded.pivotId);

        const cursorMatch = {
          $or: [
            { [sortBy]: { [order === 'desc' ? '$lt' : '$gt']: pivotValue } },
            {
              $and: [
                { [sortBy]: pivotValue },
                { _id: { [order === 'desc' ? '$lt' : '$gt']: pivotId } },
              ],
            },
          ],
        };
        pipeline.push({ $match: cursorMatch as MongoQuery });
      } catch {
        // ignore invalid cursor
      }
    }

    /**
     * 6️⃣ Thêm sắp xếp và limit
     * $sort: sắp xếp theo trường sortBy
     * và _id (dùng _id để đảm bảo thứ tự ổn định).
     */
    pipeline.push({ $sort: sortStage });
    /**
     * $limit: lấy thêm 1 bản ghi để kiểm tra
     * xem còn trang tiếp theo không (dùng cho nextCursor).
     */
    pipeline.push({ $limit: limit + 1 });
    /**
     * 7️⃣ Chọn fields cần trả về
     * $project chọn chỉ những trường cần thiết trả về
     * cho client, giảm dữ liệu thừa.
     */
    pipeline.push({
      $project: {
        productId: 1,
        category: 1,
        tags: 1,
        attributes: 1,
        images: 1,
        createdAt: 1,
        updatedAt: 1,
        score: 1,
      },
    });

    /**
     * 8️⃣ Thực thi aggregation
     * Gửi pipeline lên MongoDB để thực thi.
     * Kết quả sẽ có dạng res.cursor.firstBatch.
     */
    const res = await this.mongo.$runCommandRaw({
      aggregate: 'ProductMetadata',
      pipeline: pipeline as Prisma.InputJsonValue,
      cursor: {},
    });

    /**
     * 9️⃣ Xử lý kết quả và tạo nextCursor
     * Nếu có nhiều hơn limit bản ghi, tạo nextCursor cho trang kế tiếp.
     * pivotValue dùng để so sánh với trường sắp xếp (sortBy).
     * pivotId đảm bảo thứ tự ổn định nếu pivotValue trùng nhau.
     */
    const rawItems =
      (res as unknown as AggregationResult).cursor?.firstBatch ?? [];

    // ✅ Normalize all MongoDB objects
    const items: ProductMetadataDoc[] = rawItems.map((item) =>
      this.normalizeMongoDoc(item),
    );

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const nextItem = items[limit];
      items.splice(limit, items.length - limit);

      // Extract pivot value for cursor
      const pivotValue =
        (nextItem.attributes &&
          typeof nextItem.attributes === 'object' &&
          nextItem.attributes !== null &&
          nextItem.attributes[sortBy]) ??
        (nextItem as Record<string, unknown>)[sortBy] ??
        nextItem.createdAt;

      // Safe extract pivotId
      const pivotId =
        typeof (nextItem as { _id?: ObjectId | string })._id === 'object'
          ? (nextItem as { _id?: ObjectId })._id?.toString()
          : (nextItem as { _id?: string })._id;

      nextCursor = Buffer.from(
        JSON.stringify({ pivotValue, pivotId }),
      ).toString('base64');
    }

    /**
     * 10️⃣ Trả kết quả
     * items: danh sách sản phẩm.
     * nextCursor: nếu còn trang tiếp theo, client có thể gửi lại để lấy trang tiếp theo.
     */
    return { items, nextCursor };
  }
}
