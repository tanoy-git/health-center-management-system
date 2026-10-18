import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { AttendanceListener } from './attendance.listener';

@Module({
  controllers: [HrController],
  providers: [HrService, AttendanceListener],
  exports: [HrService],
})
export class HrModule {}
