import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.center.update({
      where: { id },
      data: {
        ...data,
        updated_by: userId,
      },
    });
  }

  async delete(id: string, userId?: string) {
    await this.findById(id);
    return this.prisma.center.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }
}
