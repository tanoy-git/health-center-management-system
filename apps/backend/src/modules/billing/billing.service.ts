import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateServiceCategoryDto {
  code: string;
  name: string;
  description?: string;
  status?: string;
}

export interface UpdateServiceCategoryDto {
  code?: string;
  name?: string;
  description?: string;
  status?: string;
}

export interface CreateServiceCatalogDto {
  code: string;
  name: string;
  category: string;
  categoryId?: string;
  price: number;
  taxRate?: number;
  status?: string;
}

export interface UpdateServiceCatalogDto {
  code?: string;
  name?: string;
  category?: string;
  categoryId?: string;
  price?: number;
  taxRate?: number;
  status?: string;
}

export interface CreateDiscountCampaignDto {
  name: string;
  code?: string;
  description?: string;
  discountType: string; // PERCENTAGE, FIXED_AMOUNT
  discountValue: number;
  minAge?: number;
  maxAge?: number;
  gender?: string; // MALE, FEMALE, OTHER, ALL
  centerId?: string;
  serviceId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface UpdateDiscountCampaignDto {
  name?: string;
  code?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  minAge?: number;
  maxAge?: number;
  gender?: string;
  centerId?: string;
  serviceId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface EvaluateDiscountDto {
  patientId?: string;
  patientAge?: number;
  patientGender?: string;
  items: Array<{
    serviceId?: string;
    itemName?: string;
    category?: string;
    categoryId?: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface InvoiceCartItemDto {
  serviceId?: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  discountCampaignId?: string;
  discountAmount?: number;
}

export interface CreateInvoiceDto {
  patientId: string;
  items: InvoiceCartItemDto[];
  discountAmount?: number;
  discountPercent?: number;
  paymentMethod: string; // CASH, CARD, MOBILE_BANKING, INSURANCE
  paidAmount?: number;
  notes?: string;
  referredById?: string;
}

export interface UpdateInvoiceItemDto {
  id?: string;
  serviceId?: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export interface UpdateInvoiceDto {
  discountAmount?: number;
  discountPercent?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  modificationReason: string;
  items?: UpdateInvoiceItemDto[];
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------
  // DYNAMIC SERVICE CATEGORIES
  // ---------------------------------------------
  async getCategories(status?: string) {
    const where: any = { deleted_at: null };
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      where.status = 'ACTIVE';
    }
    return this.prisma.serviceCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateServiceCategoryDto, userId?: string) {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { code },
    });
    if (existing) {
      throw new BadRequestException(`Category code ${dto.code} already exists`);
    }
    return this.prisma.serviceCategory.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        status: dto.status || 'ACTIVE',
        created_by: userId,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateServiceCategoryDto, userId?: string) {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    const data: any = { updated_by: userId };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code.toUpperCase().trim();
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.serviceCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string, userId?: string) {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }

  // ---------------------------------------------
  // SERVICE CATALOG
  // ---------------------------------------------
  async getServices(
    centerId: string,
    category?: string,
    search?: string,
    status?: string,
  ) {
    const where: any = { center_id: centerId, deleted_at: null };
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      where.status = 'ACTIVE';
    }
    if (category && category !== 'ALL') {
      where.category = { equals: category, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.serviceCatalog.findMany({
      where,
      include: {
        category_rel: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createService(centerId: string, dto: CreateServiceCatalogDto, userId?: string) {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.serviceCatalog.findUnique({
      where: {
        center_id_code: {
          center_id: centerId,
          code,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Service code ${dto.code} already exists`);
    }

    return this.prisma.serviceCatalog.create({
      data: {
        center_id: centerId,
        code,
        name: dto.name.trim(),
        category: dto.category.trim(),
        category_id: dto.categoryId || null,
        price: new Prisma.Decimal(dto.price),
        tax_rate: new Prisma.Decimal(dto.taxRate || 0),
        status: dto.status || 'ACTIVE',
        created_by: userId,
      },
      include: { category_rel: true },
    });
  }

  async updateService(
    id: string,
    centerId: string,
    dto: UpdateServiceCatalogDto,
    userId?: string,
  ) {
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: { id, center_id: centerId },
    });
    if (!existing) {
      throw new NotFoundException('Service not found at this center');
    }

    const data: any = { updated_by: userId };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code.toUpperCase().trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.categoryId !== undefined) data.category_id = dto.categoryId || null;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.taxRate !== undefined) data.tax_rate = new Prisma.Decimal(dto.taxRate);
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.serviceCatalog.update({
      where: { id },
      data,
      include: { category_rel: true },
    });
  }

  async deleteService(id: string, centerId: string, userId?: string) {
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: { id, center_id: centerId },
    });
    if (!existing) {
      throw new NotFoundException('Service not found at this center');
    }

    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }

  // ---------------------------------------------
  // DISCOUNT CAMPAIGN MODULE
  // ---------------------------------------------
  async getDiscountCampaigns(centerId?: string, status?: string) {
    const where: any = { deleted_at: null };
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (centerId) {
      where.OR = [
        { center_id: null },
        { center_id: centerId },
      ];
    }
    return this.prisma.discountCampaign.findMany({
      where,
      include: {
        service: true,
        category: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createDiscountCampaign(dto: CreateDiscountCampaignDto, userId?: string) {
    return this.prisma.discountCampaign.create({
      data: {
        name: dto.name.trim(),
        code: dto.code?.toUpperCase().trim() || null,
        description: dto.description?.trim() || null,
        discount_type: dto.discountType || 'PERCENTAGE',
        discount_value: new Prisma.Decimal(dto.discountValue),
        min_age: dto.minAge !== undefined && dto.minAge !== null ? Number(dto.minAge) : null,
        max_age: dto.maxAge !== undefined && dto.maxAge !== null ? Number(dto.maxAge) : null,
        gender: dto.gender && dto.gender !== 'ALL' ? dto.gender.toUpperCase() : null,
        center_id: dto.centerId || null,
        service_id: dto.serviceId || null,
        category_id: dto.categoryId || null,
        start_date: dto.startDate ? new Date(dto.startDate) : null,
        end_date: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status || 'ACTIVE',
        created_by: userId,
      },
      include: {
        service: true,
        category: true,
        center: true,
      },
    });
  }

  async updateDiscountCampaign(id: string, dto: UpdateDiscountCampaignDto, userId?: string) {
    const existing = await this.prisma.discountCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Discount campaign not found');
    }

    const data: any = { updated_by: userId };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code ? dto.code.toUpperCase().trim() : null;
    if (dto.description !== undefined) data.description = dto.description?.trim();
    if (dto.discountType !== undefined) data.discount_type = dto.discountType;
    if (dto.discountValue !== undefined) data.discount_value = new Prisma.Decimal(dto.discountValue);
    if (dto.minAge !== undefined) data.min_age = dto.minAge !== null ? Number(dto.minAge) : null;
    if (dto.maxAge !== undefined) data.max_age = dto.maxAge !== null ? Number(dto.maxAge) : null;
    if (dto.gender !== undefined) data.gender = dto.gender && dto.gender !== 'ALL' ? dto.gender.toUpperCase() : null;
    if (dto.centerId !== undefined) data.center_id = dto.centerId || null;
    if (dto.serviceId !== undefined) data.service_id = dto.serviceId || null;
    if (dto.categoryId !== undefined) data.category_id = dto.categoryId || null;
    if (dto.startDate !== undefined) data.start_date = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) data.end_date = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.discountCampaign.update({
      where: { id },
      data,
      include: {
        service: true,
        category: true,
      },
    });
  }

  async deleteDiscountCampaign(id: string, userId?: string) {
    const existing = await this.prisma.discountCampaign.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Discount campaign not found');
    }
    return this.prisma.discountCampaign.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }

  async evaluateDiscountCampaigns(centerId: string, dto: EvaluateDiscountDto) {
    const now = new Date();
    const where: any = {
      status: 'ACTIVE',
      deleted_at: null,
      OR: [
        { center_id: null },
        { center_id: centerId },
      ],
    };

    const campaigns = await this.prisma.discountCampaign.findMany({
      where,
      include: {
        service: true,
        category: true,
      },
    });

    const evaluatedItems = dto.items.map((item) => {
      let bestCampaign: any = null;
      let maxDiscount = 0;

      for (const camp of campaigns) {
        // Date check
        if (camp.start_date && now < new Date(camp.start_date)) continue;
        if (camp.end_date && now > new Date(camp.end_date)) continue;

        // Age check
        if (dto.patientAge !== undefined && dto.patientAge !== null) {
          if (camp.min_age !== null && dto.patientAge < camp.min_age) continue;
          if (camp.max_age !== null && dto.patientAge > camp.max_age) continue;
        } else if (camp.min_age !== null || camp.max_age !== null) {
          continue;
        }

        // Gender check
        if (camp.gender && camp.gender !== 'ALL') {
          if (!dto.patientGender || dto.patientGender.toUpperCase() !== camp.gender.toUpperCase()) {
            continue;
          }
        }

        // Service check
        if (camp.service_id && item.serviceId && camp.service_id !== item.serviceId) {
          continue;
        }

        // Category check
        if (camp.category_id) {
          if (item.categoryId && camp.category_id !== item.categoryId) {
            continue;
          }
          if (!item.categoryId && camp.category?.code) {
            if (item.category?.toUpperCase() !== camp.category.code.toUpperCase()) {
              continue;
            }
          }
        }

        // Calculate discount
        const lineTotal = item.unitPrice * item.quantity;
        let discount = 0;
        if (camp.discount_type === 'PERCENTAGE') {
          discount = (lineTotal * Number(camp.discount_value)) / 100;
        } else {
          discount = Math.min(lineTotal, Number(camp.discount_value));
        }

        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestCampaign = camp;
        }
      }

      return {
        ...item,
        appliedCampaign: bestCampaign ? {
          id: bestCampaign.id,
          name: bestCampaign.name,
          code: bestCampaign.code,
          discountType: bestCampaign.discount_type,
          discountValue: Number(bestCampaign.discount_value),
        } : null,
        discountAmount: maxDiscount,
        finalPrice: Math.max(0, (item.unitPrice * item.quantity) - maxDiscount),
      };
    });

    const totalSavings = evaluatedItems.reduce((acc, it) => acc + it.discountAmount, 0);

    return {
      items: evaluatedItems,
      totalSavings,
    };
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
    let totalItemCampaignDiscounts = 0;

    const invoiceItemsData = dto.items.map((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount || 0;
      totalItemCampaignDiscounts += itemDiscount;
      const lineTotal = Math.max(0, lineSubtotal - itemDiscount);
      subtotal += lineSubtotal;

      return {
        center_id: centerId,
        service_id: item.serviceId || null,
        discount_campaign_id: item.discountCampaignId || null,
        item_name: item.itemName,
        category: item.category,
        unit_price: new Prisma.Decimal(item.unitPrice),
        quantity: item.quantity,
        discount_amount: new Prisma.Decimal(itemDiscount),
        total_price: new Prisma.Decimal(lineTotal),
        is_queued: true,
      };
    });

    let extraDiscount = dto.discountAmount || 0;
    if (dto.discountPercent && dto.discountPercent > 0) {
      extraDiscount = (subtotal * dto.discountPercent) / 100;
    }
    const finalTotalDiscount = totalItemCampaignDiscounts + extraDiscount;

    const totalAmount = Math.max(0, subtotal - finalTotalDiscount + taxTotal);
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
          discount_amount: new Prisma.Decimal(finalTotalDiscount),
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
          items: {
            include: {
              discount_campaign: true,
            },
          },
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
            campaignDiscounts: totalItemCampaignDiscounts,
            paymentMethod: dto.paymentMethod,
            itemCount: invoiceItemsData.length,
          }),
          created_by: cashierId,
        },
      });

      // Automatic Referral Commission Evaluation & Database Recording
      const patient = await tx.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true, referred_by_id: true },
      });

      const referringEmployeeId = dto.referredById || patient?.referred_by_id;

      if (referringEmployeeId) {
        const activeRules = await tx.referralCommissionRule.findMany({
          where: {
            center_id: centerId,
            status: 'ACTIVE',
            deleted_at: null,
          },
        });

        const allCategories = await tx.serviceCategory.findMany({
          select: { id: true, code: true },
        });
        const catMap = new Map(allCategories.map((c) => [c.code.toUpperCase(), c.id]));

        for (const createdItem of invoice.items) {
          const itemPrice = Number(createdItem.total_price);
          let categoryId: string | undefined = catMap.get((createdItem.category || '').toUpperCase());
          if (createdItem.service_id) {
            const srv = await tx.serviceCatalog.findUnique({
              where: { id: createdItem.service_id },
              select: { category_id: true },
            });
            if (srv?.category_id) categoryId = srv.category_id;
          }

          // Rule priority matching:
          // 1. Employee-specific + Service-specific
          // 2. Any Employee + Service-specific
          // 3. Employee-specific + Category-specific
          // 4. Any Employee + Category-specific
          // 5. Employee-specific default
          // 6. Global default
          let matchedRule = activeRules.find(
            (r) => r.employee_id === referringEmployeeId && r.service_id === createdItem.service_id,
          );
          if (!matchedRule && createdItem.service_id) {
            matchedRule = activeRules.find(
              (r) => !r.employee_id && r.service_id === createdItem.service_id,
            );
          }
          if (!matchedRule && categoryId) {
            matchedRule = activeRules.find(
              (r) => r.employee_id === referringEmployeeId && r.category_id === categoryId,
            );
          }
          if (!matchedRule && categoryId) {
            matchedRule = activeRules.find(
              (r) => !r.employee_id && r.category_id === categoryId,
            );
          }
          if (!matchedRule) {
            matchedRule = activeRules.find(
              (r) => r.employee_id === referringEmployeeId && !r.service_id && !r.category_id,
            );
          }
          if (!matchedRule) {
            matchedRule = activeRules.find(
              (r) => !r.employee_id && !r.service_id && !r.category_id,
            );
          }

          if (matchedRule) {
            const rate = Number(matchedRule.commission_value);
            let commAmount = 0;
            if (matchedRule.commission_type === 'PERCENTAGE') {
              commAmount = (itemPrice * rate) / 100;
            } else {
              commAmount = rate * (createdItem.quantity || 1);
            }

            if (commAmount > 0) {
              await tx.referralCommission.create({
                data: {
                  center_id: centerId,
                  invoice_id: invoice.id,
                  invoice_item_id: createdItem.id,
                  patient_id: dto.patientId,
                  employee_id: referringEmployeeId,
                  service_id: createdItem.service_id || null,
                  category_id: categoryId || null,
                  service_name: createdItem.item_name,
                  service_category: createdItem.category,
                  service_amount: new Prisma.Decimal(itemPrice),
                  commission_type: matchedRule.commission_type,
                  commission_rate: new Prisma.Decimal(rate),
                  commission_amount: new Prisma.Decimal(commAmount),
                  status: 'EARNED',
                },
              });
            }
          }
        }
      }

      return invoice;
    });
  }

  async getInvoices(
    centerId: string,
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { center_id: centerId };
    if (status) {
      where.payment_status = status;
    }
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
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
        items: {
          include: {
            discount_campaign: true,
          },
        },
      },
    });
  }

  async getInvoiceById(id: string, centerId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, center_id: centerId },
      include: {
        patient: true,
        items: {
          include: {
            discount_campaign: true,
          },
        },
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

    // Enforce 3-day edit rule
    const ageInMs = Date.now() - new Date(existing.created_at).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    if (ageInDays > 3) {
      throw new BadRequestException(
        'Invoice edit locked: Invoices can only be edited within 3 days of purchase.',
      );
    }

    let subtotal = Number(existing.subtotal);

    // Requirement 1: Category of service can be edited (prescription, eye prescription, other tests)
    // BUT after final submission cannot be edited!
    if (dto.items && Array.isArray(dto.items)) {
      for (const oldItem of existing.items) {
        // is_queued === false means clinical final submission was already executed
        if (!oldItem.is_queued) {
          const matchingUpdated = dto.items.find((it) => it.id === oldItem.id);
          if (!matchingUpdated) {
            throw new BadRequestException(
              `Cannot remove item "${oldItem.item_name}": Final clinical submission has already been completed.`,
            );
          }
          if (
            matchingUpdated.category !== oldItem.category ||
            matchingUpdated.itemName !== oldItem.item_name
          ) {
            throw new BadRequestException(
              `Cannot change category or service for "${oldItem.item_name}": Final clinical submission has already been completed.`,
            );
          }
        }
      }

      // Re-calculate subtotal
      subtotal = dto.items.reduce(
        (sum, it) => sum + Number(it.unitPrice) * (it.quantity || 1),
        0,
      );
    }

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
      // Process items if provided
      if (dto.items && Array.isArray(dto.items)) {
        // Delete items that were removed (only queued/pending items can be removed)
        const keptIds = dto.items.map((it) => it.id).filter(Boolean) as string[];
        await tx.invoiceItem.deleteMany({
          where: {
            invoice_id: id,
            id: { notIn: keptIds },
            is_queued: true,
          },
        });

        // Update existing pending items or create new items
        for (const it of dto.items) {
          const lineTotal = Number(it.unitPrice) * (it.quantity || 1);
          if (it.id) {
            const ex = existing.items.find((e) => e.id === it.id);
            if (ex && ex.is_queued) {
              await tx.invoiceItem.update({
                where: { id: it.id },
                data: {
                  service_id: it.serviceId || null,
                  item_name: it.itemName,
                  category: it.category,
                  unit_price: new Prisma.Decimal(it.unitPrice),
                  quantity: it.quantity || 1,
                  total_price: new Prisma.Decimal(lineTotal),
                },
              });
            }
          } else {
            // New service item added within 3-day window
            await tx.invoiceItem.create({
              data: {
                center_id: centerId,
                invoice_id: id,
                service_id: it.serviceId || null,
                item_name: it.itemName,
                category: it.category,
                unit_price: new Prisma.Decimal(it.unitPrice),
                quantity: it.quantity || 1,
                total_price: new Prisma.Decimal(lineTotal),
                is_queued: true,
              },
            });
          }
        }
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
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
              itemCount: existing.items.length,
            },
            newState: {
              total: totalAmount,
              discount: discountAmount,
              status: updated.payment_status,
              itemCount: updated.items.length,
            },
          }),
          created_by: userId,
        },
      });

      return updated;
    });
  }

  // ---------------------------------------------
  // SAME-DAY UNFULFILLED ITEM REFUND ENGINE
  // ---------------------------------------------
  async refundInvoiceItem(
    invoiceId: string,
    itemId: string,
    centerId: string,
    userId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A reason must be provided for the refund.');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, center_id: centerId },
      include: {
        items: true,
        patient: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found at this center');
    }

    const item = invoice.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Invoice item not found on this invoice');
    }

    if (item.is_refunded) {
      throw new BadRequestException('This service item has already been refunded.');
    }

    // Rule 1: Same calendar day only
    const invoiceDate = new Date(invoice.created_at);
    const today = new Date();
    const isSameDay =
      invoiceDate.getFullYear() === today.getFullYear() &&
      invoiceDate.getMonth() === today.getMonth() &&
      invoiceDate.getDate() === today.getDate();

    if (!isSameDay) {
      throw new BadRequestException(
        'Refund policy violation: Service items are strictly refundable ONLY on the same calendar day the bill was paid.',
      );
    }

    // Rule 2: Cannot be refunded if report or prescription has already been created/fulfilled
    if (!item.is_queued) {
      throw new BadRequestException(
        'Refund policy violation: Cannot refund this item because the clinical report, test, or prescription has already been generated.',
      );
    }

    const refundAmount = Number(item.total_price);
    const currentSubtotal = Number(invoice.subtotal);
    const newSubtotal = Math.max(0, currentSubtotal - refundAmount);

    let discountAmount = Number(invoice.discount_amount);
    const discountPercent = Number(invoice.discount_percent);
    if (discountPercent > 0) {
      discountAmount = (newSubtotal * discountPercent) / 100;
    } else {
      discountAmount = Math.min(discountAmount, newSubtotal);
    }

    const newTotal = Math.max(0, newSubtotal - discountAmount);
    const currentPaid = Number(invoice.paid_amount);
    const newPaid = Math.max(0, currentPaid - refundAmount);
    const newBalance = Math.max(0, newTotal - newPaid);
    const newPaymentStatus = newBalance === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'DUE';

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark item refunded and remove from queue
      const updatedItem = await tx.invoiceItem.update({
        where: { id: itemId },
        data: {
          is_refunded: true,
          refund_reason: reason.trim(),
          refunded_at: new Date(),
          refunded_by: userId,
          is_queued: false,
        },
      });

      // 2. Adjust invoice totals
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal: new Prisma.Decimal(newSubtotal),
          discount_amount: new Prisma.Decimal(discountAmount),
          total_amount: new Prisma.Decimal(newTotal),
          paid_amount: new Prisma.Decimal(newPaid),
          balance_amount: new Prisma.Decimal(newBalance),
          payment_status: newPaymentStatus,
          updated_by: userId,
        },
        include: {
          items: true,
          patient: true,
        },
      });

      // 3. Strict Audit Log
      await tx.invoiceAuditLog.create({
        data: {
          center_id: centerId,
          invoice_id: invoiceId,
          action: 'REFUNDED',
          performed_by: userId,
          details: JSON.stringify({
            event: 'Item refunded',
            itemId: item.id,
            itemName: item.item_name,
            refundAmount,
            reason: reason.trim(),
            refundedAt: new Date().toISOString(),
            previousTotal: Number(invoice.total_amount),
            newTotal,
          }),
          created_by: userId,
        },
      });

      return {
        refundedItem: updatedItem,
        invoice: updatedInvoice,
        refundAmount,
      };
    });
  }

  async getRefunds(centerId: string, startDate?: string, endDate?: string) {
    const where: any = {
      center_id: centerId,
      is_refunded: true,
    };

    if (startDate && endDate) {
      where.refunded_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.invoiceItem.findMany({
      where,
      orderBy: { refunded_at: 'desc' },
      include: {
        invoice: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  // Print Receipt Generator (A4 standard and 80mm thermal receipt formats)
  async getReceiptData(id: string, centerId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, center_id: centerId },
      include: {
        center: true,
        patient: true,
        items: {
          include: {
            discount_campaign: true,
          },
        },
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
      let lineSub = `${item.quantity} x tk ${priceStr}  tk ${totalStr}`;
      if (item.discount_campaign) {
        lineSub += ` [${item.discount_campaign.name}]`;
      }
      thermalText += row('', lineSub) + '\n';
    });

    thermalText += divider + '\n';
    thermalText += row('SUBTOTAL:', `tk ${Number(invoice.subtotal).toFixed(2)}`) + '\n';
    if (Number(invoice.discount_amount) > 0) {
      thermalText += row('DISCOUNT:', `-tk ${Number(invoice.discount_amount).toFixed(2)}`) + '\n';
    }
    thermalText += doubleDivider + '\n';
    thermalText += row('TOTAL AMOUNT:', `tk ${Number(invoice.total_amount).toFixed(2)}`) + '\n';
    thermalText += row('PAID AMOUNT:', `tk ${Number(invoice.paid_amount).toFixed(2)}`) + '\n';
    if (Number(invoice.balance_amount) > 0) {
      thermalText += row('BALANCE DUE:', `tk ${Number(invoice.balance_amount).toFixed(2)}`) + '\n';
    }
    thermalText += divider + '\n';
    thermalText += `Payment Mode: ${invoice.payment_method}  | Status: ${invoice.payment_status}\n`;
    thermalText += centerAlign('*** THANK YOU FOR VISITING ***') + '\n';
    thermalText += centerAlign('CareWave HIS v2.0') + '\n';

    return {
      invoice,
      thermalReceiptText: thermalText,
    };
  }

  // ---------------------------------------------
  // REFERRAL COMMISSION RULES & COMMISSIONS
  // ---------------------------------------------
  async getCommissionRules(centerId: string) {
    return this.prisma.referralCommissionRule.findMany({
      where: { center_id: centerId, deleted_at: null },
      include: {
        employee: {
          include: {
            user: { select: { first_name: true, last_name: true, email: true, phone: true } },
          },
        },
        service: { select: { id: true, name: true, code: true, price: true } },
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createCommissionRule(centerId: string, userId: string, dto: any) {
    return this.prisma.referralCommissionRule.create({
      data: {
        center_id: centerId,
        employee_id: dto.employeeId || null,
        service_id: dto.serviceId || null,
        category_id: dto.categoryId || null,
        commission_type: dto.commissionType || 'PERCENTAGE',
        commission_value: new Prisma.Decimal(dto.commissionValue || 0),
        status: dto.status || 'ACTIVE',
        created_by: userId,
      },
      include: {
        employee: { include: { user: true } },
        service: true,
        category: true,
      },
    });
  }

  async updateCommissionRule(id: string, centerId: string, userId: string, dto: any) {
    const existing = await this.prisma.referralCommissionRule.findFirst({
      where: { id, center_id: centerId, deleted_at: null },
    });
    if (!existing) {
      throw new NotFoundException('Commission rule not found');
    }
    return this.prisma.referralCommissionRule.update({
      where: { id },
      data: {
        employee_id: dto.employeeId !== undefined ? (dto.employeeId || null) : existing.employee_id,
        service_id: dto.serviceId !== undefined ? (dto.serviceId || null) : existing.service_id,
        category_id: dto.categoryId !== undefined ? (dto.categoryId || null) : existing.category_id,
        commission_type: dto.commissionType || existing.commission_type,
        commission_value: dto.commissionValue !== undefined ? new Prisma.Decimal(dto.commissionValue) : existing.commission_value,
        status: dto.status || existing.status,
        updated_by: userId,
      },
      include: {
        employee: { include: { user: true } },
        service: true,
        category: true,
      },
    });
  }

  async deleteCommissionRule(id: string, centerId: string) {
    return this.prisma.referralCommissionRule.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'INACTIVE' },
    });
  }

  async getCommissions(
    centerId: string,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { center_id: centerId, deleted_at: null };
    if (employeeId && employeeId !== 'ALL') {
      where.employee_id = employeeId;
    }
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    return this.prisma.referralCommission.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { first_name: true, last_name: true, phone: true } },
          },
        },
        patient: {
          select: { id: true, uhid: true, first_name: true, last_name: true, phone: true },
        },
        invoice: {
          select: { id: true, invoice_number: true, created_at: true, total_amount: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
