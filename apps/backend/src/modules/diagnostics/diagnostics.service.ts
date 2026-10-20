import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDiagnosticReportDto {
  patientId: string;
  testType: string; // LAB, USG, XRAY, ECG
  testName: string;
  findings: string; // Rich-text formatted HTML / Markdown
  impression?: string;
  attachments?: string[]; // Array of uploaded URLs from MinIO/S3
  invoiceItemId?: string; // queue item linkage
}

export interface SignOffReportDto {
  digitalSignature: string;
  impression?: string;
}

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) { }

  private async generateReportNumber(centerId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.diagnosticReport.count();
    const seq = String(count + 1).padStart(5, '0');
    return `DIAG-${year}-${month}-${seq}`;
  }

  // ---------------------------------------------
  // DIAGNOSTICS PATIENT QUEUE (USG, LAB, XRAY, ECG)
  // ---------------------------------------------
  async getDiagnosticsQueue(centerId: string, testType?: string) {
    const where: any = {
      center_id: centerId,
      is_queued: true,
      is_refunded: false, // exclude refunded items
      invoice: {
        deleted_at: null,
      },
    };

    const typeUpper = (testType || '').toUpperCase().trim();

    if (typeUpper === 'USG') {
      where.OR = [
        { category: { equals: 'USG', mode: 'insensitive' } },
        { item_name: { contains: 'USG', mode: 'insensitive' } },
        { item_name: { contains: 'Ultrasound', mode: 'insensitive' } },
      ];
    } else if (typeUpper === 'LAB' || typeUpper === 'LAB_TEST') {
      where.OR = [
        { category: { equals: 'LAB_TEST', mode: 'insensitive' } },
        { category: { equals: 'LAB', mode: 'insensitive' } },
        { item_name: { contains: 'Blood', mode: 'insensitive' } },
        { item_name: { contains: 'Panel', mode: 'insensitive' } },
        { item_name: { contains: 'Test', mode: 'insensitive' } },
        { item_name: { contains: 'CBC', mode: 'insensitive' } },
        { item_name: { contains: 'Lipid', mode: 'insensitive' } },
        { item_name: { contains: 'HbA1c', mode: 'insensitive' } },
      ];
    } else if (typeUpper === 'XRAY' || typeUpper === 'RADIOLOGY') {
      where.OR = [
        { category: { equals: 'RADIOLOGY', mode: 'insensitive' } },
        { category: { equals: 'XRAY', mode: 'insensitive' } },
        { item_name: { contains: 'X-Ray', mode: 'insensitive' } },
        { item_name: { contains: 'XRay', mode: 'insensitive' } },
      ];
    } else if (typeUpper === 'ECG') {
      where.OR = [
        { category: { equals: 'ECG', mode: 'insensitive' } },
        { item_name: { contains: 'ECG', mode: 'insensitive' } },
        { item_name: { contains: 'Electrocardiogram', mode: 'insensitive' } },
      ];
    } else if (!typeUpper || typeUpper === 'ALL') {
      // Return all diagnostic categories
      where.OR = [
        { category: { in: ['USG', 'LAB_TEST', 'LAB', 'RADIOLOGY', 'XRAY', 'ECG'] } },
        { item_name: { contains: 'USG', mode: 'insensitive' } },
        { item_name: { contains: 'Ultrasound', mode: 'insensitive' } },
        { item_name: { contains: 'X-Ray', mode: 'insensitive' } },
        { item_name: { contains: 'XRay', mode: 'insensitive' } },
        { item_name: { contains: 'ECG', mode: 'insensitive' } },
        { item_name: { contains: 'Electrocardiogram', mode: 'insensitive' } },
        { item_name: { contains: 'Blood', mode: 'insensitive' } },
        { item_name: { contains: 'CBC', mode: 'insensitive' } },
        { item_name: { contains: 'Lipid', mode: 'insensitive' } },
        { item_name: { contains: 'HbA1c', mode: 'insensitive' } },
      ];
    }

    return this.prisma.invoiceItem.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoice_number: true,
            created_at: true,
            payment_status: true,
            paid_amount: true,
            patient: {
              select: {
                id: true,
                uhid: true,
                first_name: true,
                last_name: true,
                gender: true,
                blood_group: true,
                phone: true,
                dob: true,
                referred_by: {
                  include: {
                    user: {
                      select: {
                        first_name: true,
                        last_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            price: true,
          },
        },
      },
    });
  }

  async completeQueueItem(itemId: string, centerId: string) {
    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, center_id: centerId },
    });
    if (!item) {
      throw new NotFoundException('Queue item not found or does not belong to this center');
    }
    return this.prisma.invoiceItem.update({
      where: { id: itemId },
      data: { is_queued: false },
    });
  }

  async getReports(
    centerId: string,
    testType?: string,
    status?: string,
    doctorId?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { center_id: centerId };
    if (testType && testType !== 'ALL') where.test_type = testType;
    if (status) where.status = status;
    if (doctorId) where.doctor_id = doctorId;
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (search) {
      where.OR = [
        { report_number: { contains: search, mode: 'insensitive' } },
        { test_name: { contains: search, mode: 'insensitive' } },
        { patient: { first_name: { contains: search, mode: 'insensitive' } } },
        { patient: { last_name: { contains: search, mode: 'insensitive' } } },
        { patient: { uhid: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.diagnosticReport.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            uhid: true,
            first_name: true,
            last_name: true,
            gender: true,
            dob: true,
            phone: true,
          },
        },
      },
    });
  }

  async getReportById(id: string, centerId: string) {
    const report = await this.prisma.diagnosticReport.findFirst({
      where: { id, center_id: centerId },
      include: {
        patient: true,
        center: true,
      },
    });

    if (!report) {
      throw new NotFoundException(`Diagnostic report ${id} not found`);
    }

    return report;
  }

  async createReport(
    centerId: string,
    doctorId: string,
    dto: CreateDiagnosticReportDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, center_id: centerId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found at this center');
    }

    const reportNumber = await this.generateReportNumber(centerId);

    const report = await this.prisma.diagnosticReport.create({
      data: {
        center_id: centerId,
        report_number: reportNumber,
        patient_id: dto.patientId,
        doctor_id: doctorId,
        test_type: dto.testType,
        test_name: dto.testName,
        findings: dto.findings,
        impression: dto.impression || null,
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        status: 'PENDING',
        created_by: doctorId,
      },
      include: {
        patient: true,
      },
    });

    // Mark invoice item as out of queue (is_queued: false)
    if (dto.invoiceItemId) {
      await this.prisma.invoiceItem.updateMany({
        where: { id: dto.invoiceItemId, center_id: centerId },
        data: { is_queued: false },
      });
    } else {
      // Find oldest active queue item for this patient matching this test type or category
      const oldestQueue = await this.prisma.invoiceItem.findFirst({
        where: {
          center_id: centerId,
          is_queued: true,
          invoice: { patient_id: dto.patientId, deleted_at: null },
        },
        orderBy: { created_at: 'asc' },
      });
      if (oldestQueue) {
        await this.prisma.invoiceItem.update({
          where: { id: oldestQueue.id },
          data: { is_queued: false },
        });
      }
    }

    return report;
  }

  async signOffReport(
    id: string,
    centerId: string,
    pathologistId: string,
    dto: SignOffReportDto,
  ) {
    const report = await this.getReportById(id, centerId);

    if (report.status === 'SIGNED_OFF') {
      throw new BadRequestException('Report has already been signed off');
    }

    return this.prisma.diagnosticReport.update({
      where: { id },
      data: {
        status: 'SIGNED_OFF',
        pathologist_id: pathologistId,
        signed_off_at: new Date(),
        digital_signature: dto.digitalSignature,
        impression: dto.impression || report.impression,
        updated_by: pathologistId,
      },
      include: {
        patient: true,
      },
    });
  }
}
