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
import { CenterService, CreateCenterDto, UpdateCenterDto } from './center.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller('centers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CenterController {
  constructor(private readonly centerService: CenterService) {}

  @Get()
  async findAll() {
    return this.centerService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.centerService.findById(id);
  }

  @Post()
  @RequirePermissions('center:manage')
  async create(@Body() body: CreateCenterDto, @CurrentUser('id') userId: string) {
    return this.centerService.create(body, userId);
  }

  @Put(':id')
  @RequirePermissions('center:manage')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCenterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.centerService.update(id, body, userId);
  }

  @Delete(':id')
  @RequirePermissions('center:manage')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.centerService.delete(id, userId);
  }
}
