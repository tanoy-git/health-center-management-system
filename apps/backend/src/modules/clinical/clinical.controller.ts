import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ClinicalService,
  CreateMedicineDto,
  CreatePrescriptionDto,
} from './clinical.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentTenant,
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators';

@Controller('clinical')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClinicalController {
  constructor(private readonly clinicalService: ClinicalService) {}

  @Get('medicines')
  @RequirePermissions('clinical:prescription:read')
  async getMedicines(
    @CurrentTenant() centerId: string,
    @Query('search') search?: string,
  ) {
    return this.clinicalService.getMedicines(centerId, search);
  }

  @Post('medicines')
  @RequirePermissions('clinical:medicines:manage')
  async createMedicine(
    @CurrentTenant() centerId: string,
    @Body() body: CreateMedicineDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.clinicalService.createMedicine(centerId, body, userId);
  }

  @Get('queue')
  @RequirePermissions('clinical:prescription:read')
  async getPatientQueue(
    @CurrentTenant() centerId: string,
    @Query('category') category?: string,
  ) {
    return this.clinicalService.getPatientQueue(centerId, category);
  }

  @Post('queue/:itemId/complete')
  @RequirePermissions('clinical:prescription:write')
  async completeQueueItem(
    @Param('itemId') itemId: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.clinicalService.completeQueueItem(itemId, centerId);
  }

  @Post('prescriptions')
  @RequirePermissions('clinical:prescription:write')
  async createPrescription(
    @CurrentTenant() centerId: string,
    @CurrentUser('id') doctorId: string,
    @Body() body: CreatePrescriptionDto,
  ) {
    return this.clinicalService.createPrescription(centerId, doctorId, body);
  }

  @Get('prescriptions')
  @RequirePermissions('clinical:prescription:read')
  async getPrescriptions(
    @CurrentTenant() centerId: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinicalService.getPrescriptions(centerId, patientId);
  }

  @Get('prescriptions/:id')
  @RequirePermissions('clinical:prescription:read')
  async getPrescriptionById(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.clinicalService.getPrescriptionById(id, centerId);
  }

  @Get('prescriptions/:id/pdf')
  @RequirePermissions('clinical:prescription:read')
  async downloadPrescriptionPdf(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @Res() res: Response,
  ) {
    const pdfBytes = await this.clinicalService.generatePrescriptionPdf(
      id,
      centerId,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="prescription-${id}.pdf"`,
    );
    res.send(Buffer.from(pdfBytes));
  }
}
