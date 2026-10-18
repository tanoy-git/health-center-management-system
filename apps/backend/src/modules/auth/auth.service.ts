import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { InitialSetupDto } from './dto/setup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  async getSetupStatus() {
    const userCount = await this.prisma.user.count();
    return {
      setupRequired: userCount === 0,
      userCount,
    };
  }

  async initialSetup(
    dto: InitialSetupDto,
    clientInfo?: { userAgent?: string; ip?: string },
  ) {
    const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      throw new BadRequestException(
        'Initial setup has already been completed. New users can only be provisioned by a Super Admin.',
      );
    }

    // 1. Find or create SUPER_ADMIN role
    let role = await this.prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: {
          name: 'SUPER_ADMIN',
          description: 'Full administrative access across all centers',
          is_system: true,
        },
      });
    }

    // 2. Find or create default Center
    let center = await this.prisma.center.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!center) {
      center = await this.prisma.center.create({
        data: {
          code: 'CTR-MAIN',
          name: dto.centerName?.trim() || 'Central Hospital & Health Center',
          address: '100 Healthcare Boulevard, Suite 100',
          phone: dto.phone || '+1 555-0100',
          email: dto.email,
          status: 'ACTIVE',
        },
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. Create the initial Super Admin user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: dto.firstName.trim(),
        last_name: dto.lastName.trim(),
        phone: dto.phone || null,
        center_id: center.id,
        role_id: role.id,
        status: 'ACTIVE',
      },
      include: {
        center: true,
        role: true,
      },
    });

    // 5. Create employee profile for Super Admin
    const employeeCode = 'EMP-0001';
    let employee = await this.prisma.employee.findUnique({
      where: { employee_code: employeeCode },
    });
    if (!employee) {
      await this.prisma.employee.create({
        data: {
          user_id: user.id,
          center_id: center.id,
          employee_code: employeeCode,
          designation: 'Chief Administrator',
          department: 'Administration',
          base_salary: 10000.0,
          status: 'ACTIVE',
        },
      });
    }

    this.logger.log(
      `Initial Super Admin (${user.email}) successfully provisioned via setup wizard.`,
    );

    // 6. Automatically log in and return active session
    return this.login(
      { email: dto.email, password: dto.password },
      clientInfo,
    );
  }

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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Verify current password
    const isMatch = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match. Please verify your current password.');
    }

    // 2. Prevent setting the same password
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password cannot be the same as your current password.');
    }

    // 3. Hash new password
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    // 4. Update password in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: newHash,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Password successfully updated for user ${user.email}`);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async adminResetPassword(targetUserId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        password_hash: newHash,
        updated_at: new Date(),
      },
    });

    // Invalidate existing sessions for the target user
    await this.redisService.invalidateAllUserSessions(targetUserId);

    this.logger.log(`Admin reset password for user ${user.email}`);

    return {
      success: true,
      message: `Password reset successfully for ${user.email}`,
    };
  }
}
