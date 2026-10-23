import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  DiagnosticsService,
  CreateDiagnosticReportDto,
  SignOffReportDto,
  CreateServiceTestAttributeDto,
  UpdateServiceTestAttributeDto,
} from './diagnostics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentTenant,
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators';

@Controller('diagnostics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) { }

  // ---------------------------------------------
  // SERVICE TEST ATTRIBUTES (MASTER-DETAILS)
  // ---------------------------------------------
  @Get('services')
  @RequirePermissions('diagnostics:reports:read')
  async getDiagnosticServices(
    @Query('search') search?: string,
  ) {
    return this.diagnosticsService.getDiagnosticServices(search);
  }

  @Get('services/:serviceId/attributes')
  @RequirePermissions('diagnostics:reports:read')
  async getServiceAttributes(
    @Param('serviceId') serviceId: string,
  ) {
    return this.diagnosticsService.getServiceAttributes(serviceId);
  }

  @Post('services/:serviceId/attributes')
  @RequirePermissions('diagnostics:reports:write')
  async createServiceAttribute(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() body: CreateServiceTestAttributeDto,
  ) {
    return this.diagnosticsService.createServiceAttribute(
      serviceId,
      userId,
      body,
    );
  }

  @Put('attributes/:id')
  @RequirePermissions('diagnostics:reports:write')
  async updateServiceAttribute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateServiceTestAttributeDto,
  ) {
    return this.diagnosticsService.updateServiceAttribute(
      id,
      userId,
      body,
    );
  }

  @Delete('attributes/:id')
  @RequirePermissions('diagnostics:reports:write')
  async deleteServiceAttribute(
    @Param('id') id: string,
  ) {
    return this.diagnosticsService.deleteServiceAttribute(id);
  }

  @Post('services/:serviceId/attributes/batch')
  @RequirePermissions('diagnostics:reports:write')
  async batchSaveServiceAttributes(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { attributes: CreateServiceTestAttributeDto[] },
  ) {
    return this.diagnosticsService.batchSaveServiceAttributes(
      serviceId,
      userId,
      body.attributes || [],
    );
  }

  // ---------------------------------------------
  // PATIENT QUEUE
  // ---------------------------------------------
  @Get('queue')
  @RequirePermissions('diagnostics:reports:read')
  async getDiagnosticsQueue(
    @CurrentTenant() centerId: string,
    @Query('testType') testType?: string,
  ) {
    return this.diagnosticsService.getDiagnosticsQueue(centerId, testType);
  }

  @Post('queue/:itemId/complete')
  @RequirePermissions('diagnostics:reports:write')
  async completeQueueItem(
    @Param('itemId') itemId: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.diagnosticsService.completeQueueItem(itemId, centerId);
  }

  // ---------------------------------------------
  // DIAGNOSTIC REPORTS
  // ---------------------------------------------
  @Get('reports')
  @RequirePermissions('diagnostics:reports:read')
  async getReports(
    @CurrentTenant() centerId: string,
    @Query('testType') testType?: string,
    @Query('status') status?: string,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.diagnosticsService.getReports(
      centerId,
      testType,
      status,
      doctorId,
      search,
      startDate,
      endDate,
    );
  }

  @Get('reports/:id')
  @RequirePermissions('diagnostics:reports:read')
  async getReportById(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.diagnosticsService.getReportById(id, centerId);
  }

  @Post('reports')
  @RequirePermissions('diagnostics:reports:write')
  async createReport(
    @CurrentTenant() centerId: string,
    @CurrentUser('id') doctorId: string,
    @Body() body: CreateDiagnosticReportDto,
  ) {
    return this.diagnosticsService.createReport(centerId, doctorId, body);
  }

  @Patch('reports/:id/signoff')
  @RequirePermissions('diagnostics:reports:signoff')
  async signOffReport(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') pathologistId: string,
    @Body() body: SignOffReportDto,
  ) {
    return this.diagnosticsService.signOffReport(
      id,
      centerId,
      pathologistId,
      body,
    );
  }

  @Put('reports/:id')
  @RequirePermissions('diagnostics:reports:write')
  async updateReport(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    return this.diagnosticsService.updateReport(id, centerId, userId, body);
  }
}
