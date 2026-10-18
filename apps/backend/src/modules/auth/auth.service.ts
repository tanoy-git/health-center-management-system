import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  async login(loginDto: LoginDto, clientInfo?: { userAgent?: string; ip?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        center: true,
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        employee: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Extract database-driven permissions
    const permissions =
      user.role?.name === 'SUPER_ADMIN'
        ? ['*']
        : user.role.role_permissions.map((rp) => rp.permission.code);

    // Create unique session ID
    const sessionId = uuidv4();

    // Store session in Redis
    const nowIso = new Date().toISOString();
    await this.redisService.createSession({
      userId: user.id,
      sessionId,
      email: user.email,
      role: user.role.name,
      centerId: user.center_id,
      userAgent: clientInfo?.userAgent || 'Unknown Agent',
      ipAddress: clientInfo?.ip || '127.0.0.1',
      createdAt: nowIso,
      lastActiveAt: nowIso,
    });

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      centerId: user.center_id,
      sessionId,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    // CRITICAL: Automated Attendance Trigger Event
    // "When an employee successfully authenticates (Login), the backend must fire an event to create an Attendance record with a timestamp for that day."
    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      employeeId: user.employee?.id,
      centerId: user.center_id,
      timestamp: new Date(),
    });

    this.logger.log(
      `User ${user.email} logged in successfully [Session: ${sessionId}] at Center ${user.center.name}`,
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role.name,
        center: {
          id: user.center.id,
          code: user.center.code,
          name: user.center.name,
        },
        employeeId: user.employee?.id,
        permissions,
        sessionId,
      },
    };
  }

  async logout(userId: string, sessionId: string) {
    await this.redisService.invalidateSession(userId, sessionId);
    return { success: true, message: 'Logged out successfully' };
  }

  async forceLogout(targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.redisService.invalidateAllUserSessions(targetUserId);
    return {
      success: true,
      message: `All sessions revoked for user ${user.email}`,
    };
  }

  async getActiveSessions(userId: string) {
    return this.redisService.getUserSessions(userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        center: true,
        role: {
          include: {
            role_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        employee: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions =
      user.role?.name === 'SUPER_ADMIN'
        ? ['*']
        : user.role.role_permissions.map((rp) => rp.permission.code);

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role.name,
      center: {
        id: user.center.id,
        code: user.center.code,
        name: user.center.name,
        address: user.center.address,
      },
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeCode: user.employee.employee_code,
            designation: user.employee.designation,
            department: user.employee.department,
          }
        : null,
      permissions,
    };
  }
}
