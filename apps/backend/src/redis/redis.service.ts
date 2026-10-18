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
  private client: Redis;
  private readonly sessionTtl = 86400; // 24 hours in seconds

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
    } else {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
    }

    this.client
      .connect()
      .then(() => {
        if (redisUrl) {
          this.logger.log('Connected to Redis via REDIS_URL');
        } else {
          this.logger.log(`Connected to Redis at ${host}:${port}`);
        }
      })
      .catch((err) => {
        this.logger.warn(`Redis connection warning: ${err.message}. Using in-memory fallback.`);
      });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // Session Management Key Pattern: aegis:session:{userId}:{sessionId}
  private getSessionKey(userId: string, sessionId: string): string {
    return `aegis:session:${userId}:${sessionId}`;
  }

  async createSession(session: UserSessionData): Promise<void> {
    try {
      const key = this.getSessionKey(session.userId, session.sessionId);
      await this.client.set(key, JSON.stringify(session), 'EX', this.sessionTtl);
      
      // Also register session in user's active session set
      await this.client.sadd(`aegis:user_sessions:${session.userId}`, session.sessionId);
    } catch (error) {
      this.logger.error(`Error creating session: ${error.message}`);
    }
  }

  async getSession(userId: string, sessionId: string): Promise<UserSessionData | null> {
    try {
      const key = this.getSessionKey(userId, sessionId);
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as UserSessionData;
    } catch (error) {
      this.logger.error(`Error fetching session: ${error.message}`);
      return null;
    }
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    try {
      const key = this.getSessionKey(userId, sessionId);
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      // In case Redis is temporarily down, fail safe or log
      this.logger.warn(`Redis isSessionActive error: ${error.message}`);
      return true;
    }
  }

  async touchSession(userId: string, sessionId: string): Promise<void> {
    try {
      const key = this.getSessionKey(userId, sessionId);
      const data = await this.client.get(key);
      if (data) {
        const session: UserSessionData = JSON.parse(data);
        session.lastActiveAt = new Date().toISOString();
        await this.client.set(key, JSON.stringify(session), 'EX', this.sessionTtl);
      }
    } catch (error) {
      this.logger.error(`Error touching session: ${error.message}`);
    }
  }

  async invalidateSession(userId: string, sessionId: string): Promise<void> {
    try {
      const key = this.getSessionKey(userId, sessionId);
      await this.client.del(key);
      await this.client.srem(`aegis:user_sessions:${userId}`, sessionId);
      this.logger.log(`Session ${sessionId} invalidated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error invalidating session: ${error.message}`);
    }
  }

  // Force Logout: Revoke ALL active sessions for a user
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      const sessionIds = await this.client.smembers(`aegis:user_sessions:${userId}`);
      for (const sid of sessionIds) {
        await this.client.del(this.getSessionKey(userId, sid));
      }
      await this.client.del(`aegis:user_sessions:${userId}`);
      this.logger.log(`All sessions revoked (Forced Logout) for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error revoking all user sessions: ${error.message}`);
    }
  }

  async getUserSessions(userId: string): Promise<UserSessionData[]> {
    try {
      const sessionIds = await this.client.smembers(`aegis:user_sessions:${userId}`);
      const sessions: UserSessionData[] = [];
      for (const sid of sessionIds) {
        const sess = await this.getSession(userId, sid);
        if (sess) {
          sessions.push(sess);
        } else {
          // Clean up orphaned session ID
          await this.client.srem(`aegis:user_sessions:${userId}`, sid);
        }
      }
      return sessions;
    } catch (error) {
      this.logger.error(`Error getting user sessions: ${error.message}`);
      return [];
    }
  }
}
