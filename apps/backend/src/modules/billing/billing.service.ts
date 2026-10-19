import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateServiceCatalogDto {
  code: string;
  name: string;
  category: string;
  price: number;
  taxRate?: number;
}

export interface InvoiceCartItemDto {
  serviceId?: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateInvoiceDto {
  patientId: string;
  items: InvoiceCartItemDto[];
  discountAmount?: number;
  discountPercent?: number;
  paymentMethod: string; // CASH, CARD, MOBILE_BANKING, INSURANCE
  paidAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceDto {
  discountAmount?: number;
  discountPercent?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  modificationReason: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------
  // SERVICE CATALOG
  // ---------------------------------------------
  async getServices(centerId: string, category?: string, search?: string) {
    const where: any = { center_id: centerId, status: 'ACTIVE' };
    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.serviceCatalog.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createService(centerId: string, dto: CreateServiceCatalogDto, userId?: string) {
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: {
        center_id_code: {
          center_id: centerId,
          code: dto.code.toUpperCase().trim(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Service code ${dto.code} already exists`);
    }

    return this.prisma.serviceCatalog.create({
      data: {
        center_id: centerId,
        code: dto.code.toUpperCase().trim(),
        name: dto.name.trim(),
        category: dto.category,
        price: new Prisma.Decimal(dto.price),
        tax_rate: new Prisma.Decimal(dto.taxRate || 0),
        status: 'ACTIVE',
        created_by: userId,
      },
    });
  }

  // ---------------------------------------------
  // INVOICING & POS COUNTER
  // ---------------------------------------------
  private async generateInvoiceNumber(centerId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.invoice.count();
    const seq = String(count + 1).padStart(5, '0');
    return `INV-${year}-${month}-${seq}`;
  }

  async createInvoice(centerId: string, cashierId: string, dto: CreateInvoiceDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cannot create invoice with an empty cart');
    }

    // Verify patient belongs to this center
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, center_id: centerId },
    });
    if (!patient) {
      throw new NotFoundException(
        'Patient not found or belongs to another center',
      );
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;

    const invoiceItemsData = dto.items.map((item) => {
      const lineTotal = item.unitPrice * item.quantity;
      subtotal += lineTotal;
      // standard tax calculation if applicable
      return {
        center_id: centerId,
        service_id: item.serviceId || null,
        item_name: item.itemName,
        category: item.category,
        unit_price: new Prisma.Decimal(item.unitPrice),
        quantity: item.quantity,
        total_price: new Prisma.Decimal(lineTotal),
        is_queued: true,
      };
    });

    let discountAmount = dto.discountAmount || 0;
    if (dto.discountPercent && dto.discountPercent > 0) {
      discountAmount = (subtotal * dto.discountPercent) / 100;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount + taxTotal);
    const paidAmount = dto.paidAmount !== undefined ? dto.paidAmount : totalAmount;
    const balanceAmount = Math.max(0, totalAmount - paidAmount);
    const paymentStatus =
      balanceAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'DUE';

    const invoiceNumber = await this.generateInvoiceNumber(centerId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          center_id: centerId,
          invoice_number: invoiceNumber,
          patient_id: dto.patientId,
          cashier_id: cashierId,
          subtotal: new Prisma.Decimal(subtotal),
          discount_amount: new Prisma.Decimal(discountAmount),
          discount_percent: new Prisma.Decimal(dto.discountPercent || 0),
          tax_amount: new Prisma.Decimal(taxTotal),
          total_amount: new Prisma.Decimal(totalAmount),
          paid_amount: new Prisma.Decimal(paidAmount),
          balance_amount: new Prisma.Decimal(balanceAmount),
          payment_method: dto.paymentMethod || 'CASH',
          payment_status: paymentStatus,
          notes: dto.notes,
          created_by: cashierId,
          items: {
            create: invoiceItemsData,
          },
        },
        include: {
          items: true,
          patient: true,
        },
      });

      // Strict Audit Log entry
      await tx.invoiceAuditLog.create({
        data: {
          center_id: centerId,
          invoice_id: invoice.id,
          action: 'CREATED',
          performed_by: cashierId,
          details: JSON.stringify({
            event: 'Invoice created at POS counter',
            invoiceNumber,
            totalAmount,
            paidAmount,
            paymentMethod: dto.paymentMethod,
            itemCount: invoiceItemsData.length,
          }),
          created_by: cashierId,
        },
      });

      return invoice;
    });
  }

  async getInvoices(centerId: string, search?: string, status?: string) {
    const where: any = { center_id: centerId };
    if (status) {
      where.payment_status = status;
    }
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { patient: { first_name: { contains: search, mode: 'insensitive' } } },
        { patient: { last_name: { contains: search, mode: 'insensitive' } } },
        { patient: { uhid: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.invoice.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            uhid: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
        items: true,
      },
    });
  }

  async getInvoiceById(id: string, centerId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, center_id: centerId },
      include: {
        patient: true,
        items: true,
        audit_logs: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async updateInvoice(
    id: string,
    centerId: string,
    userId: string,
    dto: UpdateInvoiceDto,
  ) {
    const existing = await this.getInvoiceById(id, centerId);

    const subtotal = Number(existing.subtotal);
    let discountAmount =
      dto.discountAmount !== undefined
        ? dto.discountAmount
        : Number(existing.discount_amount);

    if (dto.discountPercent !== undefined && dto.discountPercent > 0) {
      discountAmount = (subtotal * dto.discountPercent) / 100;
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const paidAmount = Number(existing.paid_amount);
    const balanceAmount = Math.max(0, totalAmount - paidAmount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          discount_amount: new Prisma.Decimal(discountAmount),
          discount_percent: new Prisma.Decimal(dto.discountPercent ?? Number(existing.discount_percent)),
          total_amount: new Prisma.Decimal(totalAmount),
          balance_amount: new Prisma.Decimal(balanceAmount),
          payment_method: dto.paymentMethod ?? existing.payment_method,
          payment_status: dto.paymentStatus ?? (balanceAmount === 0 ? 'PAID' : 'PARTIAL'),
          notes: dto.notes ?? existing.notes,
          updated_by: userId,
        },
        include: {
          items: true,
          patient: true,
        },
      });

      // Strict Audit Log Recording
      await tx.invoiceAuditLog.create({
        data: {
          center_id: centerId,
          invoice_id: id,
          action: 'MODIFIED',
          performed_by: userId,
          details: JSON.stringify({
            reason: dto.modificationReason || 'Invoice updated by authorized personnel',
            previousState: {
              total: Number(existing.total_amount),
              discount: Number(existing.discount_amount),
              status: existing.payment_status,
            },
            newState: {
              total: totalAmount,
              discount: discountAmount,
              status: updated.payment_status,
            },
          }),
          created_by: userId,
        },
      });

      return updated;
    });
  }

  // Print Receipt Generator (A4 standard and 80mm thermal receipt formats)
  async getReceiptData(id: string, centerId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, center_id: centerId },
      include: {
        center: true,
        patient: true,
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const center = invoice.center;
    const patient = invoice.patient;

    // Generate formatted Thermal Printer 80mm ESC/POS plain text preview
    const thermalWidth = 42;
    const centerAlign = (str: string) => {
      const pad = Math.max(0, Math.floor((thermalWidth - str.length) / 2));
      return ' '.repeat(pad) + str;
    };
    const row = (left: string, right: string) => {
      const space = Math.max(1, thermalWidth - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };
    const divider = '-'.repeat(thermalWidth);
    const doubleDivider = '='.repeat(thermalWidth);

    let thermalText = '';
    thermalText += centerAlign(center.name.toUpperCase()) + '\n';
    if (center.address) thermalText += centerAlign(center.address) + '\n';
    if (center.phone) thermalText += centerAlign(`Tel: ${center.phone}`) + '\n';
    thermalText += doubleDivider + '\n';
    thermalText += centerAlign('OFFICIAL PAYMENT RECEIPT') + '\n';
    thermalText += divider + '\n';
    thermalText += row(`Invoice: ${invoice.invoice_number}`, `Date: ${new Date(invoice.created_at).toISOString().split('T')[0]}`) + '\n';
    thermalText += row(`UHID: ${patient.uhid}`, `Patient: ${patient.first_name} ${patient.last_name}`) + '\n';
    if (patient.phone) thermalText += `Contact: ${patient.phone}\n`;
    thermalText += divider + '\n';
    thermalText += row('ITEM / SERVICE', 'QTY  PRICE  TOTAL') + '\n';
    thermalText += divider + '\n';

    invoice.items.forEach((item) => {
      const priceStr = Number(item.unit_price).toFixed(2);
      const totalStr = Number(item.total_price).toFixed(2);
      thermalText += `${item.item_name}\n`;
      thermalText += row('', `${item.quantity} x $${priceStr}  $${totalStr}`) + '\n';
    });

    thermalText += divider + '\n';
    thermalText += row('SUBTOTAL:', `$${Number(invoice.subtotal).toFixed(2)}`) + '\n';
    if (Number(invoice.discount_amount) > 0) {
      thermalText += row('DISCOUNT:', `-$${Number(invoice.discount_amount).toFixed(2)}`) + '\n';
    }
    thermalText += doubleDivider + '\n';
    thermalText += row('TOTAL AMOUNT:', `$${Number(invoice.total_amount).toFixed(2)}`) + '\n';
    thermalText += row('PAID AMOUNT:', `$${Number(invoice.paid_amount).toFixed(2)}`) + '\n';
    if (Number(invoice.balance_amount) > 0) {
      thermalText += row('BALANCE DUE:', `$${Number(invoice.balance_amount).toFixed(2)}`) + '\n';
    }
    thermalText += divider + '\n';
    thermalText += `Payment Mode: ${invoice.payment_method}  | Status: ${invoice.payment_status}\n`;
    thermalText += centerAlign('*** THANK YOU FOR VISITING ***') + '\n';
    thermalText += centerAlign('Aegis Enterprise HIS v2.0') + '\n';

    return {
      invoice,
      thermalReceiptText: thermalText,
    };
  }
}
