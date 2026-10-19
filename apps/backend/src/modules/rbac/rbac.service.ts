import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async getPermissions() {
    return this.prisma.permission.findMany({
      where: {
        status: 'ACTIVE',
        is_active: true,
      },
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { created_at: 'asc' },
      include: {
        role_permissions: {
          where: {
            permission: {
              status: 'ACTIVE',
              is_active: true,
            },
          },
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async getRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        role_permissions: {
          where: {
            permission: {
              status: 'ACTIVE',
              is_active: true,
            },
          },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async createRole(dto: CreateRoleDto, userId?: string) {
    const roleName = dto.name.toUpperCase().replace(/\s+/g, '_').trim();

    const existing = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (existing) {
      throw new BadRequestException(`Role ${roleName} already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: roleName,
        description: dto.description,
        is_system: false,
        created_by: userId,
      },
    });

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      for (const permId of dto.permissionIds) {
        await this.prisma.rolePermission.create({
          data: {
            role_id: role.id,
            permission_id: permId,
            created_by: userId,
          },
        });
      }
    }

    return this.getRoleById(role.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto, userId?: string) {
    const role = await this.getRoleById(id);

    const updateData: any = {
      description: dto.description,
      updated_by: userId,
    };

    // System roles like SUPER_ADMIN should retain their canonical names
    if (dto.name && !role.is_system) {
      updateData.name = dto.name.toUpperCase().replace(/\s+/g, '_').trim();
    }

    await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    // Update dynamic permissions matrix
    if (dto.permissionIds !== undefined) {
      // Clear old permissions
      await this.prisma.rolePermission.deleteMany({
        where: { role_id: id },
      });

      // Insert new permissions
      for (const permId of dto.permissionIds) {
        await this.prisma.rolePermission.create({
          data: {
            role_id: id,
            permission_id: permId,
            created_by: userId,
          },
        });
      }
    }

    return this.getRoleById(id);
  }

  async deleteRole(id: string) {
    const role = await this.getRoleById(id);
    if (role.is_system) {
      throw new BadRequestException('System protected roles cannot be deleted');
    }

    const userCount = await this.prisma.user.count({
      where: { role_id: id },
    });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${userCount} active users are currently assigned to this role`,
      );
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }
}
