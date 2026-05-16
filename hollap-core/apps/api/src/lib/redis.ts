import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env";

class RedisStore {
  private client: RedisClientType | null = null;
  private memoryStore = new Map<string, string>();
  private isReady = false;

  async connect() {
    if (this.client) {
      return;
    }

    this.client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 1500,
        reconnectStrategy: () => false,
      },
    });
    this.client.on("error", () => {
      this.isReady = false;
    });

    try {
      await this.client.connect();
      this.isReady = true;
    } catch {
      this.isReady = false;
      this.client = null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (this.client && this.isReady) {
      if (ttlSeconds) {
        await this.client.set(key, value, { EX: ttlSeconds });
        return;
      }
      await this.client.set(key, value);
      return;
    }
    this.memoryStore.set(key, value);
  }

  async get(key: string) {
    if (this.client && this.isReady) {
      return this.client.get(key);
    }
    return this.memoryStore.get(key) ?? null;
  }

  async del(key: string) {
    if (this.client && this.isReady) {
      await this.client.del(key);
      return;
    }
    this.memoryStore.delete(key);
  }
}

export const redisStore = new RedisStore();
