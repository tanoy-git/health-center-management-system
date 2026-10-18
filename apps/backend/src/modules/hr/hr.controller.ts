import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  HrService,
  CreateEmployeeDto,
  ManualPunchDto,
} from './hr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  CurrentTenant,
  RequirePermissions,
} from '../../common/decorators';

@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  @RequirePermissions('hr:employees:read')
  async getEmployees(@CurrentTenant() centerId: string) {
    return this.hrService.getEmployees(centerId);
  }

  @Post('employees')
  @RequirePermissions('hr:employees:write')
  async createEmployee(
    @CurrentTenant() centerId: string,
    @Body() body: CreateEmployeeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hrService.createEmployee(centerId, body, userId);
  }

  @Get('attendance')
  @RequirePermissions('hr:attendance:read')
  async getAttendance(
    @CurrentTenant() centerId: string,
    @Query('date') date?: string,
  ) {
    return this.hrService.getDailyAttendance(centerId, date);
  }

  @Post('attendance/manual')
  @RequirePermissions('hr:attendance:manage')
  async recordManualAttendance(
    @CurrentTenant() centerId: string,
    @Body() body: ManualPunchDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.hrService.recordManualAttendance(centerId, body, userId);
  }

  @Post('payroll/generate')
  @RequirePermissions('hr:payroll:generate')
  async generatePayroll(
    @CurrentTenant() centerId: string,
    @Body('monthYear') monthYear: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.hrService.generateMonthlyPayroll(centerId, monthYear, userId);
  }

  @Get('payroll')
  @RequirePermissions('hr:payroll:read')
  async getPayrolls(
    @CurrentTenant() centerId: string,
    @Query('monthYear') monthYear?: string,
  ) {
    return this.hrService.getPayrolls(centerId, monthYear);
  }

  @Patch('payroll/:id/pay')
  @RequirePermissions('hr:payroll:generate')
  async markPayrollPaid(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.hrService.markPayrollPaid(id, centerId, userId);
  }
}
