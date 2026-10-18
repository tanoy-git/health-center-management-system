import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface UserSessionData {
  userId: string;
  sessionId: string;
  email: string;
  role: string;
  centerId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastActiveAt: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly sessionTtl = 86400; // 24 hours in seconds
  private isConnected = false;

  // In-memory fallback for local development without Redis
  private readonly inMemorySessions = new Map<string, UserSessionData>();
  private readonly inMemoryUserSessions = new Map<string, Set<string>>();
  private readonly invalidatedSessions = new Set<string>();
  private readonly invalidatedUsers = new Set<string>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    const redisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // Do not spam reconnects if Redis is not running locally
    };

    if (redisUrl) {
      this.client = new Redis(redisUrl, redisOptions);
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        ...redisOptions,
      });
    }

    // Attach silent error listener so ECONNREFUSED does not spam unhandled error events
    this.client.on('error', (err) => {
      if (this.isConnected) {
        this.logger.warn(`Redis error: ${err.message}`);
      }
      this.isConnected = false;
    });

    this.client
      .connect()
      .then(() => {
        this.isConnected = true;
        if (redisUrl) {
          this.logger.log('Connected to Redis via REDIS_URL');
        } else {
          this.logger.log(`Connected to Redis at ${host}:${port}`);
        }
      })
      .catch((err) => {
        this.isConnected = false;
        this.logger.warn(
          `Redis is not running (${err.message}). Using built-in In-Memory session manager.`,
        );
      });
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
      } catch {
        // Disconnect gracefully
      }
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  // Session Management Key Pattern: aegis:session:{userId}:{sessionId}
  private getSessionKey(userId: string, sessionId: string): string {
    return `aegis:session:${userId}:${sessionId}`;
  }

  async createSession(session: UserSessionData): Promise<void> {
    const key = this.getSessionKey(session.userId, session.sessionId);

    // If connected to Redis, save in Redis
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(session), 'EX', this.sessionTtl);
        await this.client.sadd(`aegis:user_sessions:${session.userId}`, session.sessionId);
        return;
      } catch (error) {
        this.logger.warn(`Redis session write failed: ${error.message}. Saving in memory.`);
        this.isConnected = false;
      }
    }

    // In-memory fallback
    this.inMemorySessions.set(key, session);
    if (!this.inMemoryUserSessions.has(session.userId)) {
      this.inMemoryUserSessions.set(session.userId, new Set());
    }
    this.inMemoryUserSessions.get(session.userId)!.add(session.sessionId);
  }

  async getSession(userId: string, sessionId: string): Promise<UserSessionData | null> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.isConnected && this.client) {
      try {
        const data = await this.client.get(key);
        if (!data) return null;
        return JSON.parse(data) as UserSessionData;
      } catch (error) {
        this.logger.warn(`Redis session get failed: ${error.message}`);
        this.isConnected = false;
      }
    }

    // In-memory fallback
    return this.inMemorySessions.get(key) || null;
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.isConnected && this.client) {
      try {
        const exists = await this.client.exists(key);
        return exists === 1;
      } catch {
        this.isConnected = false;
      }
    }

    // In-memory fallback: active unless explicitly revoked / invalidated
    if (this.invalidatedSessions.has(key) || this.invalidatedUsers.has(userId)) {
      return false;
    }
    return true;
  }

  async touchSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.isConnected && this.client) {
      try {
        const data = await this.client.get(key);
        if (data) {
          const session: UserSessionData = JSON.parse(data);
          session.lastActiveAt = new Date().toISOString();
          await this.client.set(key, JSON.stringify(session), 'EX', this.sessionTtl);
          return;
        }
      } catch {
        this.isConnected = false;
      }
    }

    // In-memory fallback
    const session = this.inMemorySessions.get(key);
    if (session) {
      session.lastActiveAt = new Date().toISOString();
      this.inMemorySessions.set(key, session);
    }
  }

  async invalidateSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getSessionKey(userId, sessionId);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        await this.client.srem(`aegis:user_sessions:${userId}`, sessionId);
        this.logger.log(`Session ${sessionId} invalidated for user ${userId}`);
        return;
      } catch {
        this.isConnected = false;
      }
    }

    // In-memory fallback
    this.invalidatedSessions.add(key);
    this.inMemorySessions.delete(key);
    this.inMemoryUserSessions.get(userId)?.delete(sessionId);
    this.logger.log(`In-memory session ${sessionId} invalidated for user ${userId}`);
  }

  // Force Logout: Revoke ALL active sessions for a user
  async invalidateAllUserSessions(userId: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const sessionIds = await this.client.smembers(`aegis:user_sessions:${userId}`);
        for (const sid of sessionIds) {
          await this.client.del(this.getSessionKey(userId, sid));
        }
        await this.client.del(`aegis:user_sessions:${userId}`);
        this.logger.log(`All sessions revoked for user ${userId}`);
        return;
      } catch {
        this.isConnected = false;
      }
    }

    // In-memory fallback
    this.invalidatedUsers.add(userId);
    const sessionIds = this.inMemoryUserSessions.get(userId);
    if (sessionIds) {
      for (const sid of sessionIds) {
        this.invalidatedSessions.add(this.getSessionKey(userId, sid));
        this.inMemorySessions.delete(this.getSessionKey(userId, sid));
      }
      this.inMemoryUserSessions.delete(userId);
    }
    this.logger.log(`All in-memory sessions revoked for user ${userId}`);
  }

  async getUserSessions(userId: string): Promise<UserSessionData[]> {
    if (this.isConnected && this.client) {
      try {
        const sessionIds = await this.client.smembers(`aegis:user_sessions:${userId}`);
        const sessions: UserSessionData[] = [];
        for (const sid of sessionIds) {
          const sess = await this.getSession(userId, sid);
          if (sess) {
            sessions.push(sess);
          } else {
            await this.client.srem(`aegis:user_sessions:${userId}`, sid);
          }
        }
        return sessions;
      } catch {
        this.isConnected = false;
      }
    }

    // In-memory fallback
    const sessionIds = this.inMemoryUserSessions.get(userId);
    if (!sessionIds) return [];

    const sessions: UserSessionData[] = [];
    for (const sid of sessionIds) {
      const sess = this.inMemorySessions.get(this.getSessionKey(userId, sid));
      if (sess) {
        sessions.push(sess);
      }
    }
    return sessions;
  }
}
