import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  BillingService,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  CreateServiceCatalogDto,
  UpdateServiceCatalogDto,
  CreateDiscountCampaignDto,
  UpdateDiscountCampaignDto,
  EvaluateDiscountDto,
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

  // ---------------------------------------------
  // DYNAMIC SERVICE CATEGORIES
  // ---------------------------------------------
  @Get('categories')
  @RequirePermissions('billing:pos:access')
  async getCategories(@Query('status') status?: string) {
    return this.billingService.getCategories(status);
  }

  @Post('categories')
  @RequirePermissions('billing:services:manage')
  async createCategory(
    @Body() body: CreateServiceCategoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.createCategory(body, userId);
  }

  @Put('categories/:id')
  @RequirePermissions('billing:services:manage')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: UpdateServiceCategoryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.updateCategory(id, body, userId);
  }

  @Delete('categories/:id')
  @RequirePermissions('billing:services:manage')
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.deleteCategory(id, userId);
  }

  // ---------------------------------------------
  // SERVICE CATALOG
  // ---------------------------------------------
  @Get('services')
  @RequirePermissions('billing:pos:access')
  async getServices(
    @CurrentTenant() centerId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.billingService.getServices(centerId, category, search, status);
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

  @Put('services/:id')
  @RequirePermissions('billing:services:manage')
  async updateService(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @Body() body: UpdateServiceCatalogDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.updateService(id, centerId, body, userId);
  }

  @Delete('services/:id')
  @RequirePermissions('billing:services:manage')
  async deleteService(
    @Param('id') id: string,
    @CurrentTenant() centerId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.deleteService(id, centerId, userId);
  }

  // ---------------------------------------------
  // DISCOUNT CAMPAIGN MODULE
  // ---------------------------------------------
  @Get('discount-campaigns')
  @RequirePermissions('billing:pos:access')
  async getDiscountCampaigns(
    @CurrentTenant() centerId: string,
    @Query('status') status?: string,
  ) {
    return this.billingService.getDiscountCampaigns(centerId, status);
  }

  @Post('discount-campaigns')
  @RequirePermissions('billing:services:manage')
  async createDiscountCampaign(
    @Body() body: CreateDiscountCampaignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.createDiscountCampaign(body, userId);
  }

  @Put('discount-campaigns/:id')
  @RequirePermissions('billing:services:manage')
  async updateDiscountCampaign(
    @Param('id') id: string,
    @Body() body: UpdateDiscountCampaignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.updateDiscountCampaign(id, body, userId);
  }

  @Delete('discount-campaigns/:id')
  @RequirePermissions('billing:services:manage')
  async deleteDiscountCampaign(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.billingService.deleteDiscountCampaign(id, userId);
  }

  @Post('discount-campaigns/evaluate')
  @RequirePermissions('billing:pos:access')
  async evaluateDiscountCampaigns(
    @CurrentTenant() centerId: string,
    @Body() body: EvaluateDiscountDto,
  ) {
    return this.billingService.evaluateDiscountCampaigns(centerId, body);
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
