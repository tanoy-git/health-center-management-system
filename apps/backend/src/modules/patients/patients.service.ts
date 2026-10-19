import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dob?: string;
  gender: string; // MALE, FEMALE, OTHER
  bloodGroup?: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  referredById?: string;
}

export interface UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  referredById?: string;
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  private async generateUhid(centerId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Count existing patients across system or center to produce sequence
    const totalCount = await this.prisma.patient.count();
    const sequence = String(totalCount + 1).padStart(6, '0');

    return `UHID-${year}-${month}-${sequence}`;
  }

  async getPatients(centerId: string, search?: string) {
    const where: any = {
      center_id: centerId, // Strict Center Isolation
    };

    if (search && search.trim().length > 0) {
      where.OR = [
        { uhid: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.patient.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        referred_by: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            invoices: true,
            prescriptions: true,
            diagnostic_reports: true,
          },
        },
      },
    });
  }

  async getPatientById(id: string, centerId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        center_id: centerId, // Strict Center Isolation check
      },
      include: {
        referred_by: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        prescriptions: {
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            items: true,
          },
        },
        diagnostic_reports: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
        invoices: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!patient) {
      // Check if patient exists in another center to give clear security notice
      const existsElsewhere = await this.prisma.patient.findUnique({
        where: { id },
      });
      if (existsElsewhere) {
        throw new ForbiddenException(
          'Security Violation: Patient belongs to another center. Cross-center access denied.',
        );
      }
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async getMarketingOfficers(centerId?: string) {
    const baseWhere: any = {
      status: 'ACTIVE',
      user: {
        status: 'ACTIVE',
        role: {
          name: {
            equals: 'MARKETING_OFFICER',
            mode: 'insensitive',
          },
        },
      },
    };

    if (centerId) {
      const centerOfficers = await this.prisma.employee.findMany({
        where: { ...baseWhere, center_id: centerId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone: true,
              email: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { employee_code: 'asc' },
      });
      if (centerOfficers.length > 0) {
        return centerOfficers;
      }
    }

    return this.prisma.employee.findMany({
      where: baseWhere,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { employee_code: 'asc' },
    });
  }

  async createPatient(
    centerId: string,
    dto: CreatePatientDto,
    creatorId?: string,
  ) {
    const uhid = await this.generateUhid(centerId);

    return this.prisma.patient.create({
      data: {
        center_id: centerId,
        uhid,
        first_name: dto.firstName.trim(),
        last_name: dto.lastName.trim(),
        dob: dto.dob ? new Date(dto.dob) : null,
        gender: dto.gender,
        blood_group: dto.bloodGroup,
        phone: dto.phone.trim(),
        email: dto.email?.trim() || null,
        address: dto.address,
        emergency_contact: dto.emergencyContact,
        referred_by_id: dto.referredById?.trim() || null,
        created_by: creatorId,
      },
      include: {
        referred_by: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async updatePatient(
    id: string,
    centerId: string,
    dto: UpdatePatientDto,
    updaterId?: string,
  ) {
    await this.getPatientById(id, centerId);

    return this.prisma.patient.update({
      where: { id },
      data: {
        first_name: dto.firstName ? dto.firstName.trim() : undefined,
        last_name: dto.lastName ? dto.lastName.trim() : undefined,
        dob: dto.dob ? new Date(dto.dob) : dto.dob === '' ? null : undefined,
        gender: dto.gender,
        blood_group: dto.bloodGroup,
        phone: dto.phone ? dto.phone.trim() : undefined,
        email: dto.email ? dto.email.trim() : dto.email === '' ? null : undefined,
        address: dto.address,
        emergency_contact: dto.emergencyContact,
        referred_by_id:
          dto.referredById !== undefined
            ? dto.referredById?.trim() || null
            : undefined,
        updated_by: updaterId,
      },
      include: {
        referred_by: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async deletePatient(id: string, centerId: string, deleterId?: string) {
    await this.getPatientById(id, centerId);

    return this.prisma.patient.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: deleterId,
      },
    });
  }
}
