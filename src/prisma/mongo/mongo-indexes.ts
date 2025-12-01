import { MongoService } from './mongo.service';
import { Logger } from '@nestjs/common';

export async function ensureMongoIndexes(mongo: MongoService) {
  const logger = new Logger('MongoIndexes');

  try {
    // Create text index for full-text search
    await mongo.$runCommandRaw({
      createIndexes: 'ProductMetadata',
      indexes: [
        {
          key: {
            'attributes.name': 'text',
            'attributes.description': 'text',
            category: 'text',
            tags: 'text',
          },
          name: 'product_text_search',
        },
      ],
    });

    logger.log('✅ MongoDB text indexes created successfully');
  } catch (error: any) {
    // Index có thể đã tồn tại
    if (error.code === 85 || error.message?.includes('already exists')) {
      logger.log('ℹ️ MongoDB text indexes already exist');
    } else {
      logger.error('❌ Failed to create MongoDB indexes:', error);
      throw error;
    }
  }
}
