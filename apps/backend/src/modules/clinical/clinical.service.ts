import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface CreateMedicineDto {
  code: string;
  name: string;
  genericName?: string;
  form: string;
  strength: string;
  price: number;
  stockQuantity?: number;
}

export interface PrescriptionMedicineItemDto {
  medicineId?: string;
  medicineName: string;
  dosage: string;
  duration: string;
  instructions?: string;
}

export interface CreatePrescriptionDto {
  patientId: string;
  clinicalNotes?: string;
  diagnosis?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    weight?: string;
    spo2?: string;
  };
  followUpDate?: string;
  items: PrescriptionMedicineItemDto[];
}

@Injectable()
export class ClinicalService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------
  // MEDICINE CATALOG
  // ---------------------------------------------
  async getMedicines(centerId: string, search?: string) {
    const where: any = { center_id: centerId, status: 'ACTIVE' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { generic_name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.medicine.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createMedicine(centerId: string, dto: CreateMedicineDto, userId?: string) {
    const existing = await this.prisma.medicine.findUnique({
      where: {
        center_id_code: {
          center_id: centerId,
          code: dto.code.toUpperCase().trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Medicine code ${dto.code} already exists`);
    }

    return this.prisma.medicine.create({
      data: {
        center_id: centerId,
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        generic_name: dto.genericName?.trim(),
        form: dto.form,
        strength: dto.strength,
        price: new Prisma.Decimal(dto.price),
        stock_quantity: dto.stockQuantity || 0,
        status: 'ACTIVE',
        created_by: userId,
      },
    });
  }

  // ---------------------------------------------
  // PRESCRIPTION ENGINE
  // ---------------------------------------------
  private async generatePrescriptionNumber(centerId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.prescription.count();
    const seq = String(count + 1).padStart(5, '0');
    return `RX-${year}-${month}-${seq}`;
  }

  async createPrescription(
    centerId: string,
    doctorId: string,
    dto: CreatePrescriptionDto,
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Prescription must contain at least one medicine',
      );
    }

    // Verify patient belongs to center
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, center_id: centerId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found at this center');
    }

    const prescriptionNumber = await this.generatePrescriptionNumber(centerId);

    const prescription = await this.prisma.prescription.create({
      data: {
        center_id: centerId,
        prescription_number: prescriptionNumber,
        patient_id: dto.patientId,
        doctor_id: doctorId,
        clinical_notes: dto.clinicalNotes,
        diagnosis: dto.diagnosis,
        vitals: dto.vitals ? JSON.stringify(dto.vitals) : null,
        follow_up_date: dto.followUpDate ? new Date(dto.followUpDate) : null,
        created_by: doctorId,
        items: {
          create: dto.items.map((item) => ({
            center_id: centerId,
            medicine_id: item.medicineId || null,
            medicine_name: item.medicineName,
            dosage: item.dosage,
            duration: item.duration,
            instructions: item.instructions || null,
            created_by: doctorId,
          })),
        },
      },
      include: {
        items: true,
        patient: true,
      },
    });

    return prescription;
  }

  async getPrescriptions(centerId: string, patientId?: string) {
    const where: any = { center_id: centerId };
    if (patientId) {
      where.patient_id = patientId;
    }
    return this.prisma.prescription.findMany({
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
          },
        },
        items: true,
      },
    });
  }

  async getPrescriptionById(id: string, centerId: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, center_id: centerId },
      include: {
        patient: true,
        items: true,
        center: true,
      },
    });

    if (!rx) {
      throw new NotFoundException('Prescription not found');
    }

    // Fetch doctor profile
    const doctor = await this.prisma.user.findUnique({
      where: { id: rx.doctor_id },
      include: { employee: true },
    });

    return { ...rx, doctor };
  }

  // Generate Professional Clinical Prescription PDF
  async generatePrescriptionPdf(id: string, centerId: string): Promise<Uint8Array> {
    const rx = await this.getPrescriptionById(id, centerId);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const primaryColor = rgb(0.08, 0.38, 0.74); // Medical Royal Blue
    const darkGray = rgb(0.15, 0.15, 0.15);
    const lightGray = rgb(0.45, 0.45, 0.45);
    const borderGray = rgb(0.85, 0.88, 0.92);

    let y = height - 40;

    // Hospital Header Banner
    page.drawRectangle({
      x: 35,
      y: y - 55,
      width: width - 70,
      height: 65,
      color: rgb(0.96, 0.98, 1.0),
      borderColor: primaryColor,
      borderWidth: 1,
    });

    page.drawText(rx.center.name.toUpperCase(), {
      x: 45,
      y: y - 16,
      size: 16,
      font: fontBold,
      color: primaryColor,
    });

    page.drawText(
      `${rx.center.address || ''} | Tel: ${rx.center.phone || ''} | ${rx.center.email || ''}`,
      {
        x: 45,
        y: y - 32,
        size: 9,
        font: fontRegular,
        color: lightGray,
      },
    );

    page.drawText('CLINICAL OUTPATIENT PRESCRIPTION', {
      x: 45,
      y: y - 48,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= 75;

    // Doctor & Prescription Metadata Bar
    const docName = rx.doctor
      ? `Dr. ${rx.doctor.first_name} ${rx.doctor.last_name}`
      : 'Consulting Physician';
    const docDesignation = rx.doctor?.employee?.designation || 'Medical Officer';

    page.drawText(docName, { x: 35, y, size: 12, font: fontBold, color: darkGray });
    page.drawText(docDesignation, { x: 35, y: y - 14, size: 9, font: fontRegular, color: lightGray });

    page.drawText(`Prescription No: ${rx.prescription_number}`, {
      x: width - 230,
      y,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`Date: ${new Date(rx.created_at).toLocaleDateString()}`, {
      x: width - 230,
      y: y - 14,
      size: 9,
      font: fontRegular,
      color: darkGray,
    });

    y -= 35;
    page.drawLine({
      start: { x: 35, y },
      end: { x: width - 35, y },
      thickness: 1,
      color: borderGray,
    });

    y -= 15;

    // Patient Demographics Box
    page.drawText(`Patient: ${rx.patient.first_name} ${rx.patient.last_name}`, {
      x: 35,
      y,
      size: 11,
      font: fontBold,
      color: darkGray,
    });
    page.drawText(`UHID: ${rx.patient.uhid}`, {
      x: 230,
      y,
      size: 10,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(`Gender: ${rx.patient.gender} | Blood: ${rx.patient.blood_group || 'N/A'}`, {
      x: 380,
      y,
      size: 9,
      font: fontRegular,
      color: darkGray,
    });

    y -= 18;

    // Vitals Bar
    if (rx.vitals) {
      try {
        const vitalsObj = JSON.parse(rx.vitals);
        const vitalsStr = `Vitals: BP: ${vitalsObj.bp || '--'} mmHg | Pulse: ${vitalsObj.pulse || '--'} bpm | Temp: ${vitalsObj.temp || '--'} | Wt: ${vitalsObj.weight || '--'} | SpO2: ${vitalsObj.spo2 || '--'}%`;
        page.drawText(vitalsStr, {
          x: 35,
          y,
          size: 8.5,
          font: fontOblique,
          color: rgb(0.2, 0.4, 0.6),
        });
        y -= 18;
      } catch (e) {}
    }

    // Diagnosis & Notes
    if (rx.diagnosis) {
      page.drawText(`Diagnosis: ${rx.diagnosis}`, {
        x: 35,
        y,
        size: 9.5,
        font: fontBold,
        color: darkGray,
      });
      y -= 16;
    }
    if (rx.clinical_notes) {
      page.drawText(`Clinical Notes: ${rx.clinical_notes}`, {
        x: 35,
        y,
        size: 9,
        font: fontRegular,
        color: lightGray,
      });
      y -= 20;
    }

    page.drawLine({
      start: { x: 35, y },
      end: { x: width - 35, y },
      thickness: 1.5,
      color: primaryColor,
    });

    y -= 30;

    // Big Rx Symbol
    page.drawText('Rx', {
      x: 35,
      y,
      size: 26,
      font: fontBold,
      color: primaryColor,
    });

    y -= 15;

    // Medicine Items Table Header
    page.drawText('Medicine & Strength', { x: 65, y, size: 9, font: fontBold, color: primaryColor });
    page.drawText('Dosage', { x: 270, y, size: 9, font: fontBold, color: primaryColor });
    page.drawText('Duration', { x: 370, y, size: 9, font: fontBold, color: primaryColor });
    page.drawText('Instructions', { x: 440, y, size: 9, font: fontBold, color: primaryColor });

    y -= 8;
    page.drawLine({
      start: { x: 65, y },
      end: { x: width - 35, y },
      thickness: 0.5,
      color: borderGray,
    });
    y -= 16;

    // Table Rows
    rx.items.forEach((item, index) => {
      page.drawText(`${index + 1}. ${item.medicine_name}`, {
        x: 65,
        y,
        size: 10,
        font: fontBold,
        color: darkGray,
      });
      page.drawText(item.dosage || '--', {
        x: 270,
        y,
        size: 9,
        font: fontRegular,
        color: darkGray,
      });
      page.drawText(item.duration || '--', {
        x: 370,
        y,
        size: 9,
        font: fontRegular,
        color: darkGray,
      });
      page.drawText(item.instructions || 'As advised', {
        x: 440,
        y,
        size: 8.5,
        font: fontOblique,
        color: lightGray,
      });

      y -= 22;
    });

    // Follow up date
    if (rx.follow_up_date) {
      y -= 20;
      page.drawText(
        `Next Follow-up Date: ${new Date(rx.follow_up_date).toLocaleDateString()}`,
        {
          x: 65,
          y,
          size: 9.5,
          font: fontBold,
          color: rgb(0.7, 0.2, 0.2),
        },
      );
    }

    // Doctor Signature Area
    const sigY = 90;
    page.drawLine({
      start: { x: width - 200, y: sigY },
      end: { x: width - 50, y: sigY },
      thickness: 1,
      color: darkGray,
    });
    page.drawText('Authorized Doctor Signature', {
      x: width - 185,
      y: sigY - 14,
      size: 9,
      font: fontRegular,
      color: lightGray,
    });

    // Footer Watermark
    page.drawText(
      'Generated by Aegis Enterprise HIS v2.0 - Multi-Tenant Electronic Medical Record',
      {
        x: 120,
        y: 25,
        size: 8,
        font: fontOblique,
        color: rgb(0.65, 0.65, 0.65),
      },
    );

    return pdfDoc.save();
  }
}
