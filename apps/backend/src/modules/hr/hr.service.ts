import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface CreateEmployeeDto {
  userName?: string;
  username?: string;
  email?: string;
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

export interface UpdateEmployeeDto {
  userName?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  baseSalary?: number;
  status?: string;
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
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

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
            userName: true,
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

    const userName = (dto.userName || dto.username || (dto.email ? dto.email.split('@')[0] : '')).trim().toLowerCase();
    if (!userName) {
      throw new BadRequestException('Username (userName) is required');
    }

    // Disallow creating "admin" via system
    if (
      userName === 'admin' ||
      (dto.email && dto.email.trim().toLowerCase() === 'admin') ||
      dto.firstName.trim().toLowerCase() === 'admin' ||
      dto.employeeCode.trim().toLowerCase() === 'admin'
    ) {
      throw new BadRequestException(
        'The "admin" account cannot be created through the system. It can only be created directly in the database.',
      );
    }

    // Check if userName already exists
    const existingUserName = await this.prisma.user.findFirst({
      where: { userName: { equals: userName, mode: 'insensitive' } },
    });
    if (existingUserName) {
      throw new BadRequestException(`Username "${userName}" is already in use`);
    }

    // Check if email already exists (if provided)
    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    if (email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (existingUser) {
        throw new BadRequestException(`Email "${email}" is already in use`);
      }
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
          userName: userName,
          email: email,
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
              userName: true,
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

  async updateEmployeeStatus(employeeId: string, status: string, updaterId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: {
          status,
          updated_by: updaterId,
        },
        include: {
          user: true,
          center: true,
        },
      });

      // Synchronize associated user status
      const userStatus = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
      if (employee.user_id) {
        await tx.user.update({
          where: { id: employee.user_id },
          data: {
            status: userStatus,
            updated_by: updaterId,
          },
        });
      }

      return emp;
    });

    // Invalidate user sessions if status is changed to inactive/terminated
    if (status !== 'ACTIVE' && employee.user_id) {
      await this.redisService.invalidateAllUserSessions(employee.user_id);
    }

    return updated;
  }

  async updateEmployee(employeeId: string, dto: UpdateEmployeeDto, updaterId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.employeeCode && dto.employeeCode !== employee.employee_code) {
      const existing = await this.prisma.employee.findUnique({
        where: { employee_code: dto.employeeCode },
      });
      if (existing) {
        throw new BadRequestException(`Employee code ${dto.employeeCode} already exists`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update user fields
      if (employee.user_id) {
        const userUpdateData: any = {
          updated_by: updaterId,
        };
        if (dto.firstName) userUpdateData.first_name = dto.firstName.trim();
        if (dto.lastName) userUpdateData.last_name = dto.lastName.trim();
        if (dto.userName || dto.username) userUpdateData.userName = (dto.userName || dto.username)!.trim().toLowerCase();
        if (dto.email !== undefined) userUpdateData.email = dto.email ? dto.email.trim().toLowerCase() : null;
        if (dto.phone !== undefined) userUpdateData.phone = dto.phone;
        if (dto.roleId) userUpdateData.role_id = dto.roleId;
        if (dto.status) {
          userUpdateData.status = dto.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
        }
        if (dto.centerId) userUpdateData.center_id = dto.centerId;

        await tx.user.update({
          where: { id: employee.user_id },
          data: userUpdateData,
        });
      }

      // 2. Update employee fields
      const empUpdateData: any = {
        updated_by: updaterId,
      };
      if (dto.employeeCode) empUpdateData.employee_code = dto.employeeCode.trim();
      if (dto.designation) empUpdateData.designation = dto.designation.trim();
      if (dto.department) empUpdateData.department = dto.department.trim();
      if (dto.baseSalary !== undefined) empUpdateData.base_salary = new Prisma.Decimal(dto.baseSalary);
      if (dto.status) empUpdateData.status = dto.status;
      if (dto.centerId) empUpdateData.center_id = dto.centerId;

      return tx.employee.update({
        where: { id: employeeId },
        data: empUpdateData,
        include: {
          user: {
            select: {
              id: true,
              userName: true,
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
      });
    });

    // Invalidate sessions if employee status is deactivated
    if (dto.status && dto.status !== 'ACTIVE' && employee.user_id) {
      await this.redisService.invalidateAllUserSessions(employee.user_id);
    }

    return updated;
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
