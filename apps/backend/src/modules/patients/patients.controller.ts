import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  PatientsService,
  CreatePatientDto,
  UpdatePatientDto,
} from './patients.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentTenant,
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators';

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @RequirePermissions('patients:read')
  async getPatients(
    @CurrentTenant() centerId: string,
    @Query('search') search?: string,
  ) {
    return this.patientsService.getPatients(centerId, search);
  }

  @Get('marketing-officers')
  @RequirePermissions('patients:read')
  async getMarketingOfficers(@CurrentTenant() centerId: string) {
    return this.patientsService.getMarketingOfficers(centerId);
  }

  @Get(':id')
  @RequirePermissions('patients:read')
  async getPatientById(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.patientsService.getPatientById(id, centerId);
  }

  @Post()
  @RequirePermissions('patients:write')
  async createPatient(
    @CurrentTenant() centerId: string,
    @Body() body: CreatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.patientsService.createPatient(centerId, body, userId);
  }

  @Put(':id')
  @RequirePermissions('patients:write')
  async updatePatient(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @Body() body: UpdatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.patientsService.updatePatient(id, centerId, body, userId);
  }

  @Delete(':id')
  @RequirePermissions('patients:write')
  async deletePatient(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.patientsService.deletePatient(id, centerId, userId);
  }
}
