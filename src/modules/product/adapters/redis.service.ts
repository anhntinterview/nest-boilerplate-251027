import {
  Inject,
  Injectable,
  // OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
// export class RedisService implements OnModuleDestroy {
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly client: RedisClientType,
  ) {}

  async get(key: string): Promise<string | null> {
    const result = await this.client.get(key);
    console.log('Redis get:', key, 'found:', !!result);
    const allKeys = await this.client.keys('*');
    console.log('All keys in Redis:', allKeys);
    return result;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    console.log('Redis set:', key, 'TTL:', ttlSeconds);
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }

  // async onModuleDestroy() {
  //   await this.client.disconnect();
  // }

  /**
   * DEBUG UTILITY
   * List all Redis keys matching a pattern (default '*')
   * Logs key, TTL, and truncated value.
   */
  async debugKeys(pattern: string = '*', valuePreviewLength = 100) {
    let cursor = '0';
    const allKeys: string[] = [];

    do {
      // scan return object { cursor, keys }
      const reply: { cursor: string; keys: string[] } = await this.client.scan(
        cursor,
        { MATCH: pattern, COUNT: 100 },
      );

      cursor = reply.cursor;
      allKeys.push(...reply.keys);
    } while (cursor !== '0');

    this.logger.log(`Found ${allKeys.length} keys matching "${pattern}"`);

    for (const key of allKeys) {
      const ttl = await this.client.ttl(key);
      let value: string | null = null;
      try {
        const val = await this.client.get(key);
        value = val
          ? val.slice(0, valuePreviewLength) +
            (val.length > valuePreviewLength ? '...' : '')
          : null;
      } catch {
        value = `<error reading value>`;
      }

      this.logger.log(`Key: ${key}, TTL: ${ttl}s, Value Preview: ${value}`);
    }

    return allKeys;
  }
}
