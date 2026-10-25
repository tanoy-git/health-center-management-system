import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReportAttributeResultDto {
  attributeId?: string;
  attributeName: string;
  attributeUnit?: string;
  referenceRange?: string;
  value: string;
  flag?: string; // NORMAL, HIGH, LOW, ABNORMAL
  displayOrder?: number;
}

export interface CreateDiagnosticReportDto {
  patientId: string;
  serviceId?: string;
  testType: string; // LAB, USG, XRAY, ECG
  testName: string;
  findings: string; // Rich-text formatted HTML / Markdown
  impression?: string;
  attachments?: string[]; // Array of uploaded URLs from MinIO/S3
  invoiceItemId?: string; // queue item linkage
  attributeResults?: ReportAttributeResultDto[];
}

export interface SignOffReportDto {
  digitalSignature: string;
  impression?: string;
}

export interface UpdateDiagnosticReportDto {
  serviceId?: string;
  testType?: string;
  testName?: string;
  findings?: string;
  impression?: string;
  attachments?: string[];
  attributeResults?: ReportAttributeResultDto[];
}

export interface CreateServiceTestAttributeDto {
  name: string;
  unit?: string;
  reference_range?: string;
  display_order?: number;
  status?: string;
}

export interface UpdateServiceTestAttributeDto {
  name?: string;
  unit?: string;
  reference_range?: string;
  display_order?: number;
  status?: string;
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
        service: {
          select: {
            id: true,
            name: true,
            code: true,
            category: true,
          },
        },
        attribute_results: {
          orderBy: { display_order: 'asc' },
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
        service: true,
        attribute_results: {
          orderBy: { display_order: 'asc' },
        },
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
        service_id: dto.serviceId || null,
        test_type: dto.testType,
        test_name: dto.testName,
        findings: dto.findings,
        impression: dto.impression || null,
        attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
        status: 'PENDING',
        created_by: doctorId,
        attribute_results:
          dto.attributeResults && dto.attributeResults.length > 0
            ? {
                create: dto.attributeResults.map((attr, idx) => ({
                  attribute_id: attr.attributeId || null,
                  attribute_name: attr.attributeName,
                  attribute_unit: attr.attributeUnit || null,
                  reference_range: attr.referenceRange || null,
                  value: attr.value || '',
                  flag: attr.flag || null,
                  display_order:
                    attr.displayOrder !== undefined ? attr.displayOrder : idx,
                })),
              }
            : undefined,
      },
      include: {
        patient: true,
        service: true,
        attribute_results: {
          orderBy: { display_order: 'asc' },
        },
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
        service: true,
        attribute_results: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async updateReport(
    id: string,
    centerId: string,
    userId: string,
    dto: UpdateDiagnosticReportDto,
  ) {
    const report = await this.prisma.diagnosticReport.findFirst({
      where: { id, center_id: centerId },
    });
    if (!report) {
      throw new NotFoundException(`Diagnostic report ${id} not found at this center`);
    }

    const updateData: any = {
      updated_by: userId,
    };

    if (dto.serviceId !== undefined) updateData.service_id = dto.serviceId || null;
    if (dto.testType !== undefined) updateData.test_type = dto.testType;
    if (dto.testName !== undefined) updateData.test_name = dto.testName;
    if (dto.findings !== undefined) updateData.findings = dto.findings;
    if (dto.impression !== undefined) updateData.impression = dto.impression || null;
    if (dto.attachments !== undefined) {
      updateData.attachments = dto.attachments ? JSON.stringify(dto.attachments) : null;
    }

    if (dto.attributeResults !== undefined) {
      // Re-create attribute results
      await this.prisma.diagnosticReportAttributeResult.deleteMany({
        where: { report_id: id },
      });

      if (dto.attributeResults.length > 0) {
        await this.prisma.diagnosticReportAttributeResult.createMany({
          data: dto.attributeResults.map((attr, idx) => ({
            report_id: id,
            attribute_id: attr.attributeId || null,
            attribute_name: attr.attributeName,
            attribute_unit: attr.attributeUnit || null,
            reference_range: attr.referenceRange || null,
            value: attr.value || '',
            flag: attr.flag || null,
            display_order:
              attr.displayOrder !== undefined ? attr.displayOrder : idx,
          })),
        });
      }
    }

    await this.prisma.diagnosticReport.update({
      where: { id },
      data: updateData,
    });

    return this.prisma.diagnosticReport.findFirst({
      where: { id },
      include: {
        patient: true,
        service: true,
        attribute_results: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  // ---------------------------------------------
  // ---------------------------------------------
  // SERVICE TEST ATTRIBUTES (MASTER-DETAILS, GLOBAL)
  // ---------------------------------------------
  async getDiagnosticServices(search?: string) {
    const where: any = {
      deleted_at: null,
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.serviceCatalog.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            attributes: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });
  }

  async getServiceAttributes(serviceId: string) {
    const service = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceId, deleted_at: null },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.serviceTestAttribute.findMany({
      where: {
        service_id: serviceId,
        deleted_at: null,
      },
      orderBy: { display_order: 'asc' },
    });
  }

  async createServiceAttribute(
    serviceId: string,
    userId: string,
    dto: CreateServiceTestAttributeDto,
  ) {
    const service = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceId, deleted_at: null },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const currentCount = await this.prisma.serviceTestAttribute.count({
      where: { service_id: serviceId, deleted_at: null },
    });

    return this.prisma.serviceTestAttribute.create({
      data: {
        service_id: serviceId,
        name: dto.name.trim(),
        unit: dto.unit?.trim() || null,
        reference_range: dto.reference_range?.trim() || null,
        display_order:
          dto.display_order !== undefined ? dto.display_order : currentCount,
        status: dto.status || 'ACTIVE',
        created_by: userId,
      },
    });
  }

  async updateServiceAttribute(
    attributeId: string,
    userId: string,
    dto: UpdateServiceTestAttributeDto,
  ) {
    const attribute = await this.prisma.serviceTestAttribute.findFirst({
      where: { id: attributeId, deleted_at: null },
    });
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    return this.prisma.serviceTestAttribute.update({
      where: { id: attributeId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        unit: dto.unit !== undefined ? dto.unit.trim() || null : undefined,
        reference_range:
          dto.reference_range !== undefined
            ? dto.reference_range.trim() || null
            : undefined,
        display_order:
          dto.display_order !== undefined ? dto.display_order : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        updated_by: userId,
      },
    });
  }

  async deleteServiceAttribute(attributeId: string) {
    const attribute = await this.prisma.serviceTestAttribute.findFirst({
      where: { id: attributeId, deleted_at: null },
    });
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    return this.prisma.serviceTestAttribute.update({
      where: { id: attributeId },
      data: {
        deleted_at: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  async batchSaveServiceAttributes(
    serviceId: string,
    userId: string,
    attributes: CreateServiceTestAttributeDto[],
  ) {
    const service = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceId, deleted_at: null },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Soft delete existing attributes
    await this.prisma.serviceTestAttribute.updateMany({
      where: { service_id: serviceId, deleted_at: null },
      data: { deleted_at: new Date(), status: 'INACTIVE' },
    });

    // Create new list
    for (let i = 0; i < attributes.length; i++) {
      const a = attributes[i];
      if (!a.name || !a.name.trim()) continue;
      await this.prisma.serviceTestAttribute.create({
        data: {
          service_id: serviceId,
          name: a.name.trim(),
          unit: a.unit?.trim() || null,
          reference_range: a.reference_range?.trim() || null,
          display_order: a.display_order !== undefined ? a.display_order : i,
          status: 'ACTIVE',
          created_by: userId,
        },
      });
    }

    return this.getServiceAttributes(serviceId);
  }
}
