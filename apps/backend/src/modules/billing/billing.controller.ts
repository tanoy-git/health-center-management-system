import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  BillingService,
  CreateServiceCatalogDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
} from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentTenant,
  CurrentUser,
  RequirePermissions,
} from '../../common/decorators';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('services')
  @RequirePermissions('billing:pos:access')
  async getServices(
    @CurrentTenant() centerId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.billingService.getServices(centerId, category, search);
  }

  @Post('services')
  @RequirePermissions('billing:services:manage')
  async createService(
    @CurrentTenant() centerId: string,
    @Body() body: CreateServiceCatalogDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.createService(centerId, body, userId);
  }

  @Post('invoices')
  @RequirePermissions('billing:invoices:create')
  async createInvoice(
    @CurrentTenant() centerId: string,
    @CurrentUser('id') cashierId: string,
    @Body() body: CreateInvoiceDto,
  ) {
    return this.billingService.createInvoice(centerId, cashierId, body);
  }

  @Get('invoices')
  @RequirePermissions('billing:invoices:read')
  async getInvoices(
    @CurrentTenant() centerId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getInvoices(centerId, search, status, startDate, endDate);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:invoices:read')
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.billingService.getInvoiceById(id, centerId);
  }

  @Put('invoices/:id')
  @RequirePermissions('billing:invoices:override')
  async updateInvoice(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
    @Body() body: UpdateInvoiceDto,
  ) {
    return this.billingService.updateInvoice(id, centerId, userId, body);
  }

  @Post('invoices/:id/items/:itemId/refund')
  @RequirePermissions('billing:refund:manage')
  async refundInvoiceItem(
    @Param('id') invoiceId: string,
    @Param('itemId') itemId: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { reason: string },
  ) {
    return this.billingService.refundInvoiceItem(
      invoiceId,
      itemId,
      centerId,
      userId,
      body.reason,
    );
  }

  @Get('refunds')
  @RequirePermissions('billing:invoices:read')
  async getRefunds(
    @CurrentTenant() centerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingService.getRefunds(centerId, startDate, endDate);
  }

  @Get('invoices/:id/receipt')
  @RequirePermissions('billing:invoices:read')
  async getReceiptData(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
  ) {
    return this.billingService.getReceiptData(id, centerId);
  }
}
