import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

import { AuthModule } from './modules/auth/auth.module';
import { CenterModule } from './modules/center/center.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { HrModule } from './modules/hr/hr.module';
import { PatientsModule } from './modules/patients/patients.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';

import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    CenterModule,
    RbacModule,
    HrModule,
    PatientsModule,
    BillingModule,
    ClinicalModule,
    DiagnosticsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
