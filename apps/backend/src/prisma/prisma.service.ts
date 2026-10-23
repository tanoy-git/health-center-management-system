import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant.context';

const TENANT_SCOPED_MODELS = [
  'User',
  'Employee',
  'Attendance',
  'Payroll',
  'Patient',
  'Invoice',
  'InvoiceItem',
  'InvoiceAuditLog',
  'Medicine',
  'Prescription',
  'PrescriptionItem',
  'DiagnosticReport',
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL Database via Prisma');

    // ---------------------------------------------------------
    // MIDDLEWARE: Soft Delete & Multi-Tenant Data Isolation
    // ---------------------------------------------------------
    this.$use(async (params, next) => {
      const model = params.model;
      const action = params.action;
      const tenant = TenantContext.get();
      const centerId = tenant?.centerId;
      const userId = tenant?.userId;
      const isSuperAdmin = tenant?.role === 'SUPER_ADMIN';

      // 1. SOFT DELETE ENFORCEMENT
      if (action === 'delete') {
        params.action = 'update';
        params.args['data'] = {
          deleted_at: new Date(),
          updated_by: userId || null,
        };
      }
      if (action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data !== undefined) {
          params.args.data['deleted_at'] = new Date();
          params.args.data['updated_by'] = userId || null;
        } else {
          params.args['data'] = {
            deleted_at: new Date(),
            updated_by: userId || null,
          };
        }
      }

      // Filter out soft-deleted records for reads
      if (
        ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(
          action,
        )
      ) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        // If not explicitly asking for deleted items
        if (params.args.where.deleted_at === undefined) {
          params.args.where.deleted_at = null;
        }
      }

      // 2. MULTI-TENANT CENTER_ID ISOLATION ENFORCEMENT
      if (model && TENANT_SCOPED_MODELS.includes(model)) {
        // Enforce center_id on creation
        if (action === 'create' && params.args?.data) {
          if (!params.args.data.center_id && centerId) {
            params.args.data.center_id = centerId;
          }
          if (userId && !params.args.data.created_by) {
            params.args.data.created_by = userId;
          }
        }

        if (action === 'createMany' && params.args?.data) {
          if (Array.isArray(params.args.data)) {
            params.args.data.forEach((item) => {
              if (!item.center_id && centerId) item.center_id = centerId;
              if (userId && !item.created_by) item.created_by = userId;
            });
          }
        }

        // Enforce updated_by on update
        if (
          ['update', 'updateMany'].includes(action) &&
          params.args?.data &&
          userId
        ) {
          params.args.data.updated_by = userId;
        }

        // Scope queries to center_id unless Super Admin explicitly requests all
        if (
          ['findFirst', 'findMany', 'count', 'update', 'updateMany'].includes(
            action,
          )
        ) {
          // If user is not super admin OR super admin has a specific center selected
          if (centerId && (!isSuperAdmin || params.args?.where?.center_id)) {
            if (!params.args) params.args = {};
            if (!params.args.where) params.args.where = {};
            // Auto-inject center_id into WHERE clause
            params.args.where.center_id = centerId;
          }
        }
      }

      return next(params);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
