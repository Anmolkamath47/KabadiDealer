import { Redis } from 'ioredis';
import { config } from '../config/index.js';

export interface RateLimitRecord {
  totalHits: number;
  resetTime: number; // Unix timestamp in milliseconds when window expires
}

export interface IRateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;
  get(key: string): Promise<RateLimitRecord | null>;
  reset(): Promise<void>;
  isRedisActive(): boolean;
}

/**
 * In-Memory Sliding-Window Rate Limit Store
 * High-performance, zero-external-dependency fallback store with automatic TTL sweep.
 */
export class MemoryRateLimitStore implements IRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sweepTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (record.resetTime <= now) {
          this.store.delete(key);
        }
      }
    }, 30000);

    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, record);
    } else {
      record.count += 1;
    }

    return { totalHits: record.count, resetTime: record.resetTime };
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    const now = Date.now();
    const record = this.store.get(key);
    if (!record || record.resetTime <= now) {
      if (record) this.store.delete(key);
      return null;
    }
    return { totalHits: record.count, resetTime: record.resetTime };
  }

  async reset(): Promise<void> {
    this.store.clear();
  }

  isRedisActive(): boolean {
    return false;
  }

  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.store.clear();
  }
}

/**
 * Distributed Redis Rate Limit Store (ioredis)
 * Uses atomic Lua script execution to guarantee zero race conditions across multi-instance Render deployments.
 */
export class RedisRateLimitStore implements IRateLimitStore {
  private client: Redis;
  private memoryFallback: MemoryRateLimitStore;
  private isConnected: boolean = false;

  private static readonly LUA_INCREMENT_SCRIPT = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return {current, ttl}
  `;

  constructor(redisUrl: string) {
    this.memoryFallback = new MemoryRateLimitStore();

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 4000,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️ [RateLimit] Redis retry threshold reached. Using in-memory fallback.');
          return null;
        }
        return Math.min(times * 300, 1500);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ [RateLimit] Connected to shared Redis store for distributed rate limiting.');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      console.warn(`⚠️ [RateLimit] Redis error (${err.message}). Seamlessly using in-memory fallback.`);
    });
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    if (!this.isConnected) {
      return this.memoryFallback.increment(key, windowMs);
    }

    try {
      const now = Date.now();
      const result = (await this.client.eval(
        RedisRateLimitStore.LUA_INCREMENT_SCRIPT,
        1,
        key,
        windowMs
      )) as [number, number];

      const hits = result[0];
      const ttlMs = result[1] > 0 ? result[1] : windowMs;
      return { totalHits: hits, resetTime: now + ttlMs };
    } catch (err: any) {
      console.warn(`⚠️ [RateLimit] Redis command failed (${err.message}), falling back to memory.`);
      return this.memoryFallback.increment(key, windowMs);
    }
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    if (!this.isConnected) {
      return this.memoryFallback.get(key);
    }

    try {
      const [countStr, ttlMs] = await Promise.all([
        this.client.get(key),
        this.client.pttl(key),
      ]);
      if (!countStr || ttlMs <= 0) return null;
      return { totalHits: parseInt(countStr, 10), resetTime: Date.now() + ttlMs };
    } catch {
      return this.memoryFallback.get(key);
    }
  }

  async reset(): Promise<void> {
    await this.memoryFallback.reset();
    if (this.isConnected) {
      try {
        const keys = await this.client.keys('rl:*');
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {}
    }
  }

  isRedisActive(): boolean {
    return this.isConnected;
  }
}

/**
 * RateLimitStore Factory
 */
const createRateLimitStore = (): IRateLimitStore => {
  if (config.redisUrl && config.redisUrl.trim().length > 0) {
    try {
      return new RedisRateLimitStore(config.redisUrl);
    } catch (err: any) {
      console.warn('⚠️ [RateLimit] Failed to initialize Redis store, using memory store:', err.message);
    }
  }
  return new MemoryRateLimitStore();
};

export const rateLimitStore = createRateLimitStore();
