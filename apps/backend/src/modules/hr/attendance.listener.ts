import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

export interface LoginEventPayload {
  userId: string;
  employeeId?: string;
  centerId: string;
  timestamp: Date;
}

@Injectable()
export class AttendanceListener {
  private readonly logger = new Logger(AttendanceListener.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('auth.login')
  async handleUserLoginEvent(payload: LoginEventPayload) {
    try {
      this.logger.log(
        `Received auth.login event for User ${payload.userId} at Center ${payload.centerId}`,
      );

      // Find associated employee record
      let employeeId = payload.employeeId;
      if (!employeeId) {
        const employee = await this.prisma.employee.findUnique({
          where: { user_id: payload.userId },
        });
        if (!employee) {
          this.logger.debug(
            `No employee record found for user ${payload.userId}. Skipping automated attendance punch.`,
          );
          return;
        }
        employeeId = employee.id;
      }

      // Format today's date as YYYY-MM-DD
      const now = new Date(payload.timestamp);
      const todayDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );

      // Check if attendance already recorded today for this employee
      const existingAttendance = await this.prisma.attendance.findFirst({
        where: {
          employee_id: employeeId,
          date: todayDate,
        },
      });

      if (existingAttendance) {
        this.logger.log(
          `Attendance already logged today for employee ${employeeId} at ${existingAttendance.punch_in.toISOString()}`,
        );
        return;
      }

      // Automated Attendance Record creation upon login
      const attendance = await this.prisma.attendance.create({
        data: {
          center_id: payload.centerId,
          employee_id: employeeId,
          date: todayDate,
          punch_in: now,
          status: 'PRESENT',
          trigger_source: 'LOGIN_EVENT',
          created_by: payload.userId,
        },
      });

      this.logger.log(
        `AUTOMATED ATTENDANCE RECORDED: Employee ${employeeId} marked PRESENT for ${todayDate.toISOString().split('T')[0]} at ${now.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record automated attendance on login: ${error.message}`,
        error.stack,
      );
    }
  }
}
