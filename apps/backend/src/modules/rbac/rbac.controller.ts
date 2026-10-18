import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RbacService, CreateRoleDto, UpdateRoleDto } from './rbac.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  async getPermissions() {
    return this.rbacService.getPermissions();
  }

  @Get('roles')
  async getRoles() {
    return this.rbacService.getRoles();
  }

  @Get('roles/:id')
  async getRoleById(@Param('id') id: string) {
    return this.rbacService.getRoleById(id);
  }

  @Post('roles')
  @RequirePermissions('iam:roles:manage')
  async createRole(
    @Body() body: CreateRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.rbacService.createRole(body, userId);
  }

  @Put('roles/:id')
  @RequirePermissions('iam:roles:manage')
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.rbacService.updateRole(id, body, userId);
  }

  @Delete('roles/:id')
  @RequirePermissions('iam:roles:manage')
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }
}
