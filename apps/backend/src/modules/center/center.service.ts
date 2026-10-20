import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface CreateCenterDto {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface UpdateCenterDto {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

@Injectable()
export class CenterService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async findAll() {
    return this.prisma.center.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            invoices: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
            patients: true,
            invoices: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException(`Center with ID ${id} not found`);
    }

    return center;
  }

  async create(data: CreateCenterDto, userId?: string) {
    const existing = await this.prisma.center.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`Center with code ${data.code} already exists`);
    }

    return this.prisma.center.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        address: data.address,
        phone: data.phone,
        email: data.email,
        status: data.status || 'ACTIVE',
        created_by: userId,
      },
    });
  }

  async update(id: string, data: UpdateCenterDto, userId?: string) {
    await this.findById(id);

    const updated = await this.prisma.center.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });

    // If center is set to INACTIVE, immediately invalidate sessions for its users (except super admins)
    if (data.status && data.status !== 'ACTIVE') {
      const users = await this.prisma.user.findMany({
        where: { center_id: id },
        include: { role: true },
      });
      for (const u of users) {
        if (u.role?.name !== 'SUPER_ADMIN') {
          await this.redisService.invalidateAllUserSessions(u.id);
        }
      }
    }

    return updated;
  }

  async delete(id: string, userId?: string) {
    await this.findById(id);
    const updated = await this.prisma.center.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: userId,
      },
    });

    // Invalidate active sessions for users belonging to deleted center
    const users = await this.prisma.user.findMany({
      where: { center_id: id },
      include: { role: true },
    });
    for (const u of users) {
      if (u.role?.name !== 'SUPER_ADMIN') {
        await this.redisService.invalidateAllUserSessions(u.id);
      }
    }

    return updated;
  }
}
