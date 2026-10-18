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
}

export interface SignOffReportDto {
  digitalSignature: string;
  impression?: string;
}

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) {}

  private async generateReportNumber(centerId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.diagnosticReport.count();
    const seq = String(count + 1).padStart(5, '0');
    return `DIAG-${year}-${month}-${seq}`;
  }

  async getReports(centerId: string, testType?: string, status?: string) {
    const where: any = { center_id: centerId };
    if (testType) where.test_type = testType;
    if (status) where.status = status;

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

    return this.prisma.diagnosticReport.create({
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
