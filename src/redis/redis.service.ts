import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.client.on('error', (err) => console.error('Redis Connection Error: ', err));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<void> {
    if (mode && duration) {
      await this.client.set(key, value, mode as any, duration);
    } else {
      await this.client.set(key, value);
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}