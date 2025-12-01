import { Injectable } from '@nestjs/common';
import { ProductReadRepository } from '../ports/product.repository.interface';
import { MongoService } from 'src/prisma/mongo/mongo.service';
import { ProductMetadataDoc } from '../domain/read-models/product-metadata.entity';
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

  async upsertMetadata(doc: ProductMetadataDoc): Promise<void> {
    await this.mongo.productMetadata.upsert({
      where: { productId: doc.productId },
      create: {
        productId: doc.productId,
        category: doc.category ?? null,
        tags: doc.tags ?? [],
        attributes: (doc.attributes ?? {}) as Prisma.InputJsonValue,
        images: doc.images ?? [],
        stockInfo: (doc.stockInfo ?? {}) as Prisma.InputJsonValue,
        extra: (doc.extra ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        category: doc.category ?? null,
        tags: doc.tags ?? [],
        attributes: (doc.attributes ?? {}) as Prisma.InputJsonValue,
        images: doc.images ?? [],
        stockInfo: (doc.stockInfo ?? {}) as Prisma.InputJsonValue,
        extra: (doc.extra ?? {}) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  async findMetadataByProductId(
    productId: string,
  ): Promise<ProductMetadataDoc | null> {
    const res = await this.mongo.productMetadata.findFirst({
      where: { productId },
    });

    if (!res) return null;
    return {
      ...res,
      attributes: (res.attributes ?? {}) as Record<string, unknown>,
      stockInfo: (res.stockInfo ?? {}) as Record<string, unknown>,
      extra: (res.extra ?? {}) as Record<string, unknown>,
    };
  }

  async search(filters: ProductSearchFilters): Promise<{
    items: ProductMetadataDoc[];
    nextCursor?: string;
    total?: number;
  }> {
    /**
     * 1️⃣ Nhận filters từ client
     * Lấy các tham số tìm kiếm từ filters (ví dụ: từ query string).
     * Nếu client không gửi limit, mặc định 20.
     * sortBy và order để sắp xếp kết quả.
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
    const items =
      (res as unknown as { cursor?: { firstBatch?: ProductMetadataDoc[] } })
        .cursor?.firstBatch ?? [];

    let nextCursor: string | undefined;
    if (items.length > limit) {
      const nextItem = items[limit];
      items.splice(limit, items.length - limit);

      // Safe extract pivotValue
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
