import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface CreateEmployeeDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  employeeCode: string;
  designation: string;
  department: string;
  baseSalary: number;
  centerId?: string;
}

export interface ManualPunchDto {
  employeeId: string;
  date?: string;
  status: string; // PRESENT, LATE, HALF_DAY, ABSENT
  punchIn?: string;
  punchOut?: string;
}

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  async getEmployees(centerId?: string) {
    const whereClause: any = {};
    if (centerId) {
      whereClause.center_id = centerId;
    }

    return this.prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            status: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        center: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createEmployee(centerId: string, dto: CreateEmployeeDto, creatorId?: string) {
    const targetCenterId = dto.centerId || centerId;

    // Check if user email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException(`Email ${dto.email} is already in use`);
    }

    // Check if employee code exists
    const existingEmpCode = await this.prisma.employee.findUnique({
      where: { employee_code: dto.employeeCode },
    });
    if (existingEmpCode) {
      throw new BadRequestException(
        `Employee code ${dto.employeeCode} already exists`,
      );
    }

    const defaultPassword = dto.password || 'Staff@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create user and employee in a transaction
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password_hash: passwordHash,
          first_name: dto.firstName,
          last_name: dto.lastName,
          phone: dto.phone,
          center_id: targetCenterId,
          role_id: dto.roleId,
          status: 'ACTIVE',
          created_by: creatorId,
        },
      });

      const employee = await tx.employee.create({
        data: {
          user_id: user.id,
          center_id: targetCenterId,
          employee_code: dto.employeeCode,
          designation: dto.designation,
          department: dto.department,
          base_salary: new Prisma.Decimal(dto.baseSalary),
          status: 'ACTIVE',
          created_by: creatorId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              phone: true,
              role: true,
            },
          },
        },
      });

      return employee;
    });
  }

  async getDailyAttendance(centerId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const utcDate = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
      ),
    );

    const attendances = await this.prisma.attendance.findMany({
      where: {
        center_id: centerId,
        date: utcDate,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { punch_in: 'asc' },
    });

    return attendances;
  }

  async recordManualAttendance(
    centerId: string,
    dto: ManualPunchDto,
    creatorId?: string,
  ) {
    const targetDate = dto.date ? new Date(dto.date) : new Date();
    const utcDate = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
      ),
    );

    const punchInDate = dto.punchIn ? new Date(dto.punchIn) : new Date();
    const punchOutDate = dto.punchOut ? new Date(dto.punchOut) : null;

    return this.prisma.attendance.upsert({
      where: {
        center_id_employee_id_date: {
          center_id: centerId,
          employee_id: dto.employeeId,
          date: utcDate,
        },
      },
      update: {
        status: dto.status,
        punch_in: punchInDate,
        punch_out: punchOutDate,
        trigger_source: 'MANUAL_OVERRIDE',
        updated_by: creatorId,
      },
      create: {
        center_id: centerId,
        employee_id: dto.employeeId,
        date: utcDate,
        punch_in: punchInDate,
        punch_out: punchOutDate,
        status: dto.status,
        trigger_source: 'MANUAL_OVERRIDE',
        created_by: creatorId,
      },
    });
  }

  // Monthly Payroll Slip Generation Engine
  async generateMonthlyPayroll(centerId: string, monthYear: string, creatorId?: string) {
    // Validate format "YYYY-MM"
    if (!/^\d{4}-\d{2}$/.test(monthYear)) {
      throw new BadRequestException('monthYear must be in format YYYY-MM');
    }

    const [yearStr, monthStr] = monthYear.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed

    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Fetch active employees for this center
    const employees = await this.prisma.employee.findMany({
      where: {
        center_id: centerId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    const results = [];

    for (const emp of employees) {
      // Count present attendances for this month
      const presentDays = await this.prisma.attendance.count({
        where: {
          center_id: centerId,
          employee_id: emp.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ['PRESENT', 'LATE'],
          },
        },
      });

      // Calculate salary based on attendance and base pay
      const baseSalaryNum = Number(emp.base_salary);
      // Prorated daily salary: (baseSalary / daysInMonth) * presentDays
      // If presentDays is 0, give standard minimum or 0
      const attendanceRatio = presentDays > 0 ? Math.min(presentDays / (daysInMonth - 4), 1.0) : 0.8; 
      const calculatedSalary = baseSalaryNum * attendanceRatio;
      const netSalary = Math.round(calculatedSalary * 100) / 100;

      const payroll = await this.prisma.payroll.upsert({
        where: {
          center_id_employee_id_month_year: {
            center_id: centerId,
            employee_id: emp.id,
            month_year: monthYear,
          },
        },
        update: {
          base_salary: emp.base_salary,
          total_present_days: presentDays,
          net_salary: new Prisma.Decimal(netSalary),
          updated_by: creatorId,
        },
        create: {
          center_id: centerId,
          employee_id: emp.id,
          month_year: monthYear,
          base_salary: emp.base_salary,
          total_present_days: presentDays,
          deductions: new Prisma.Decimal(0.0),
          bonuses: new Prisma.Decimal(0.0),
          net_salary: new Prisma.Decimal(netSalary),
          status: 'DRAFT',
          created_by: creatorId,
        },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      });

      results.push(payroll);
    }

    return results;
  }

  async getPayrolls(centerId: string, monthYear?: string) {
    const whereClause: any = { center_id: centerId };
    if (monthYear) {
      whereClause.month_year = monthYear;
    }

    return this.prisma.payroll.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async markPayrollPaid(id: string, centerId: string, userId?: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, center_id: centerId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll slip not found');
    }

    return this.prisma.payroll.update({
      where: { id },
      data: {
        status: 'PAID',
        payment_date: new Date(),
        updated_by: userId,
      },
    });
  }
}
