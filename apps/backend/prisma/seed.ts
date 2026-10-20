import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Health Center Management System v2.0 Database ---');

  // 1. Create Centers
  const centerA = await prisma.center.upsert({
    where: { code: 'CTR-METRO' },
    update: {},
    create: {
      code: 'CTR-METRO',
      name: 'Metro Central Hospital',
      address: '742 Evergreen Terrace, Medical District, Springfield',
      phone: '+1 (555) 234-5678',
      email: 'metro@aegis.health',
      status: 'ACTIVE',
    },
  });

  const centerB = await prisma.center.upsert({
    where: { code: 'CTR-WEST' },
    update: {},
    create: {
      code: 'CTR-WEST',
      name: 'Westside Diagnostic & Wellness Center',
      address: '10880 Wilshire Blvd, Westside Plaza, Los Angeles',
      phone: '+1 (555) 876-5432',
      email: 'westside@aegis.health',
      status: 'ACTIVE',
    },
  });

  console.log(`Centers created: ${centerA.name} & ${centerB.name}`);

  // 2. Define Permissions
  const permissionsList = [
    // IAM & RBAC
    { code: 'iam:users:read', name: 'View Users', module: 'IAM', description: 'Can view user accounts' },
    { code: 'iam:users:write', name: 'Manage Users', module: 'IAM', description: 'Can create and edit users' },
    { code: 'iam:roles:manage', name: 'Manage Roles & RBAC', module: 'IAM', description: 'Can configure dynamic roles & permissions' },
    { code: 'center:manage', name: 'Manage Centers', module: 'IAM', description: 'Can register and configure physical hospital centers' },

    // HR & Attendance & Payroll
    { code: 'hr:employees:read', name: 'View Employees', module: 'HR', description: 'Can view employee registry' },
    { code: 'hr:employees:write', name: 'Manage Employees', module: 'HR', description: 'Can onboard and edit employee records' },
    { code: 'hr:attendance:read', name: 'View Attendance', module: 'HR', description: 'Can view daily attendance records' },
    { code: 'hr:attendance:manage', name: 'Manage Attendance', module: 'HR', description: 'Can manual punch / adjust attendance' },
    { code: 'hr:payroll:read', name: 'View Payroll', module: 'HR', description: 'Can view payroll summaries' },
    { code: 'hr:payroll:generate', name: 'Generate Payroll', module: 'HR', description: 'Can process and issue monthly salary slips' },

    // Patients
    { code: 'patients:read', name: 'View Patients', module: 'PATIENTS', description: 'Can view patient registry and search UHID' },
    { code: 'patients:write', name: 'Register Patients', module: 'PATIENTS', description: 'Can register and update patient demographics' },

    // Billing & POS
    { code: 'billing:pos:access', name: 'Access Billing POS', module: 'BILLING', description: 'Can use the Point of Sale counter' },
    { code: 'billing:invoices:read', name: 'View Invoices', module: 'BILLING', description: 'Can view invoices and receipts' },
    { code: 'billing:invoices:create', name: 'Create Invoices', module: 'BILLING', description: 'Can checkout cart and issue bills' },
    { code: 'billing:invoices:override', name: 'Override Discounts', module: 'BILLING', description: 'Can apply custom discount overrides' },
    { code: 'billing:services:manage', name: 'Manage Service Catalog', module: 'BILLING', description: 'Can add and update billable hospital services' },
    { code: 'billing:refund:manage', name: 'Manage Invoice Refunds', module: 'BILLING', description: 'Can process same-day invoice item refunds' },

    // Clinical & Prescription
    { code: 'clinical:prescription:read', name: 'View Prescriptions', module: 'CLINICAL', description: 'Can view patient prescriptions' },
    { code: 'clinical:prescription:write', name: 'Write Prescriptions', module: 'CLINICAL', description: 'Can generate doctor prescriptions with PDF' },
    { code: 'clinical:eye:prescription', name: 'Manage Eye Prescriptions', module: 'CLINICAL', description: 'Can perform eye examinations and generate eye prescriptions' },
    { code: 'clinical:medicines:manage', name: 'Manage Pharmacy Catalog', module: 'CLINICAL', description: 'Can update medicine inventory' },

    // Diagnostics & Reports
    { code: 'diagnostics:reports:read', name: 'View Diagnostic Reports', module: 'DIAGNOSTICS', description: 'Can view Lab/USG reports' },
    { code: 'diagnostics:reports:write', name: 'Create Lab/USG Reports', module: 'DIAGNOSTICS', description: 'Can enter test findings and upload DICOM/images' },
    { code: 'diagnostics:reports:signoff', name: 'Sign-off Reports', module: 'DIAGNOSTICS', description: 'Pathologist digital sign-off authority' },

    // Analytics & System Reports
    { code: 'reports:view', name: 'View System Analytics & Reports', module: 'REPORTS', description: 'Can view monthly financial, clinical and operational reports' },
  ];

  const dbPermissions = [];
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, description: p.description },
      create: p,
    });
    dbPermissions.push(perm);
  }

  // 3. Define Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Full unrestricted system-wide administrative access',
      is_system: true,
    },
  });

  const doctorRole = await prisma.role.upsert({
    where: { name: 'DOCTOR' },
    update: {},
    create: {
      name: 'DOCTOR',
      description: 'Physician with clinical, prescription, and patient diagnostic capabilities',
      is_system: true,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'CASHIER' },
    update: {},
    create: {
      name: 'CASHIER',
      description: 'Billing counter clerk with POS, invoicing, and receipt printing',
      is_system: true,
    },
  });

  const receptionistRole = await prisma.role.upsert({
    where: { name: 'RECEPTIONIST' },
    update: {},
    create: {
      name: 'RECEPTIONIST',
      description: 'Front-desk staff for patient registration and scheduling',
      is_system: true,
    },
  });

  const pathologistRole = await prisma.role.upsert({
    where: { name: 'PATHOLOGIST' },
    update: {},
    create: {
      name: 'PATHOLOGIST',
      description: 'Diagnostic laboratory specialist with digital sign-off authority',
      is_system: true,
    },
  });

  const marketingOfficerRole = await prisma.role.upsert({
    where: { name: 'MARKETING_OFFICER' },
    update: {},
    create: {
      name: 'MARKETING_OFFICER',
      description: 'Marketing officer who refers and brings patients to the center',
      is_system: false,
    },
  });

  // Assign All Permissions to Super Admin
  for (const perm of dbPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: superAdminRole.id,
          permission_id: perm.id,
        },
      },
      update: {},
      create: {
        role_id: superAdminRole.id,
        permission_id: perm.id,
      },
    });
  }

  // Assign Doctor Permissions
  const doctorPermCodes = [
    'patients:read',
    'patients:write',
    'clinical:prescription:read',
    'clinical:prescription:write',
    'diagnostics:reports:read',
    'hr:attendance:read',
  ];
  for (const code of doctorPermCodes) {
    const perm = dbPermissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: doctorRole.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: { role_id: doctorRole.id, permission_id: perm.id },
      });
    }
  }

  // Assign Cashier Permissions
  const cashierPermCodes = [
    'patients:read',
    'billing:pos:access',
    'billing:invoices:read',
    'billing:invoices:create',
    'hr:attendance:read',
  ];
  for (const code of cashierPermCodes) {
    const perm = dbPermissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: cashierRole.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: { role_id: cashierRole.id, permission_id: perm.id },
      });
    }
  }

  // 4. Create Users & Employees
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', 10);

  // Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@aegis.health' },
    update: {
      password_hash: passwordHash,
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@aegis.health',
      password_hash: passwordHash,
      first_name: 'Alexander',
      last_name: 'Vance',
      phone: '+1 555-0100',
      center_id: centerA.id,
      role_id: superAdminRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { user_id: adminUser.id },
    update: {},
    create: {
      user_id: adminUser.id,
      center_id: centerA.id,
      employee_code: 'EMP-0001',
      designation: 'Chief Medical Director & System Administrator',
      department: 'Executive Administration',
      base_salary: 12500.0,
      status: 'ACTIVE',
    },
  });

  // Doctor at Center A (Metro Central)
  const doctorMetroUser = await prisma.user.upsert({
    where: { email: 'dr.marcus@aegis.health' },
    update: {
      password_hash: staffPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      email: 'dr.marcus@aegis.health',
      password_hash: staffPasswordHash,
      first_name: 'Marcus',
      last_name: 'Sterling',
      phone: '+1 555-0101',
      center_id: centerA.id,
      role_id: doctorRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { user_id: doctorMetroUser.id },
    update: {},
    create: {
      user_id: doctorMetroUser.id,
      center_id: centerA.id,
      employee_code: 'EMP-0101',
      designation: 'Senior Cardiologist & General Physician',
      department: 'Clinical Medicine',
      base_salary: 9500.0,
      status: 'ACTIVE',
    },
  });

  // Cashier at Center A
  const cashierMetroUser = await prisma.user.upsert({
    where: { email: 'cashier.metro@aegis.health' },
    update: {
      password_hash: staffPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      email: 'cashier.metro@aegis.health',
      password_hash: staffPasswordHash,
      first_name: 'Elena',
      last_name: 'Reyes',
      phone: '+1 555-0102',
      center_id: centerA.id,
      role_id: cashierRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { user_id: cashierMetroUser.id },
    update: {},
    create: {
      user_id: cashierMetroUser.id,
      center_id: centerA.id,
      employee_code: 'EMP-0102',
      designation: 'Chief Billing Officer',
      department: 'Accounts & Billing',
      base_salary: 4200.0,
      status: 'ACTIVE',
    },
  });

  // Doctor at Center B (Westside)
  const doctorWestUser = await prisma.user.upsert({
    where: { email: 'dr.sarah@aegis.health' },
    update: {
      password_hash: staffPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      email: 'dr.sarah@aegis.health',
      password_hash: staffPasswordHash,
      first_name: 'Sarah',
      last_name: 'Chen',
      phone: '+1 555-0201',
      center_id: centerB.id,
      role_id: doctorRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.employee.upsert({
    where: { user_id: doctorWestUser.id },
    update: {},
    create: {
      user_id: doctorWestUser.id,
      center_id: centerB.id,
      employee_code: 'EMP-0201',
      designation: 'Lead Diagnostic Radiologist',
      department: 'Radiology & Imaging',
      base_salary: 9800.0,
      status: 'ACTIVE',
    },
  });

  // 5. Seed Dynamic Service Categories Table
  const sampleCategories = [
    { code: 'CONSULTATION', name: 'Doctor Consultation', description: 'General & specialist doctor OPD consultations' },
    { code: 'USG', name: 'Ultrasonography (USG)', description: 'Abdominal, pelvic, pregnancy, and vascular ultrasound scans' },
    { code: 'PROCEDURE', name: 'Clinical Procedures', description: 'ECG, dressing, minor OT procedures, catheterization' },
    { code: 'LAB_TEST', name: 'Laboratory Diagnostics', description: 'Clinical pathology, hematology, biochemistry, microbiology' },
    { code: 'RADIOLOGY', name: 'Radiology & Imaging', description: 'X-Ray, CT, fluoroscopy' },
    { code: 'EYE', name: 'Ophthalmology & Vision', description: 'Refraction test, slit lamp exam, eye pressure check' },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of sampleCategories) {
    const c = await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description, status: 'ACTIVE' },
      create: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
        status: 'ACTIVE',
      },
    });
    categoryMap.set(cat.code, c.id);
  }

  // 5.1 Seed Services Catalog for Center A & Center B
  const sampleServices = [
    { code: 'SRV-CONS-01', name: 'General Physician Consultation', category: 'CONSULTATION', price: 50.0, tax_rate: 0 },
    { code: 'SRV-CONS-02', name: 'Specialist Cardiology Consultation', category: 'CONSULTATION', price: 120.0, tax_rate: 0 },
    { code: 'SRV-LAB-01', name: 'Complete Blood Count (CBC) with Differential', category: 'LAB_TEST', price: 35.0, tax_rate: 5 },
    { code: 'SRV-LAB-02', name: 'Lipid Panel Profile (Cholesterol, HDL, LDL)', category: 'LAB_TEST', price: 45.0, tax_rate: 5 },
    { code: 'SRV-LAB-03', name: 'HbA1c Glycated Hemoglobin Test', category: 'LAB_TEST', price: 40.0, tax_rate: 5 },
    { code: 'SRV-RAD-01', name: 'Abdominal & Pelvic Ultrasound (USG)', category: 'USG', price: 130.0, tax_rate: 0 },
    { code: 'SRV-RAD-02', name: 'Digital Chest X-Ray (PA View)', category: 'RADIOLOGY', price: 75.0, tax_rate: 0 },
    { code: 'SRV-PROC-01', name: '12-Lead Electrocardiogram (ECG)', category: 'PROCEDURE', price: 55.0, tax_rate: 0 },
    { code: 'SRV-PROC-02', name: 'Wound Dressing & Minor Surgical Care', category: 'PROCEDURE', price: 65.0, tax_rate: 0 },
    { code: 'SRV-EYE-01', name: 'Comprehensive Eye Examination & Vision Test', category: 'EYE', price: 60.0, tax_rate: 0 },
    { code: 'SRV-EYE-02', name: 'Computerized Refraction & Glass Power Test', category: 'EYE', price: 40.0, tax_rate: 0 },
    { code: 'SRV-EYE-03', name: 'Slit Lamp Biomicroscopy & Retinal Exam', category: 'EYE', price: 90.0, tax_rate: 0 },
  ];

  for (const center of [centerA, centerB]) {
    for (const s of sampleServices) {
      await prisma.serviceCatalog.upsert({
        where: {
          center_id_code: {
            center_id: center.id,
            code: s.code,
          },
        },
        update: {
          name: s.name,
          category: s.category,
          category_id: categoryMap.get(s.category),
          price: s.price,
          tax_rate: s.tax_rate,
        },
        create: {
          center_id: center.id,
          code: s.code,
          name: s.name,
          category: s.category,
          category_id: categoryMap.get(s.category),
          price: s.price,
          tax_rate: s.tax_rate,
          status: 'ACTIVE',
        },
      });
    }
  }

  // 5.2 Seed Sample Discount Campaign (60+ Male Patient Discount)
  const usgCatId = categoryMap.get('USG');
  await prisma.discountCampaign.upsert({
    where: { id: 'campaign-senior-male-60' },
    update: {
      name: 'Senior Citizen Male Privilege (60+ Yrs)',
      code: 'SENIOR60',
      description: '15% automatic discount for all male patients aged 60 and above on USG and clinical consultations',
      discount_type: 'PERCENTAGE',
      discount_value: 15.0,
      min_age: 60,
      max_age: 120,
      gender: 'MALE',
      status: 'ACTIVE',
    },
    create: {
      id: 'campaign-senior-male-60',
      name: 'Senior Citizen Male Privilege (60+ Yrs)',
      code: 'SENIOR60',
      description: '15% automatic discount for all male patients aged 60 and above on USG and clinical consultations',
      discount_type: 'PERCENTAGE',
      discount_value: 15.0,
      min_age: 60,
      max_age: 120,
      gender: 'MALE',
      status: 'ACTIVE',
    },
  });

  // 6. Seed Medicines
  const sampleMedicines = [
    { code: 'MED-001', name: 'Amoxicillin + Clavulanate', generic_name: 'Augmentin', form: 'TABLET', strength: '625mg', price: 1.25, stock_quantity: 450 },
    { code: 'MED-002', name: 'Paracetamol', generic_name: 'Acetaminophen', form: 'TABLET', strength: '500mg', price: 0.15, stock_quantity: 1200 },
    { code: 'MED-003', name: 'Omeprazole Delayed-Release', generic_name: 'Prilosec', form: 'CAPSULE', strength: '20mg', price: 0.65, stock_quantity: 600 },
    { code: 'MED-004', name: 'Azithromycin Monohydrate', generic_name: 'Zithromax', form: 'TABLET', strength: '500mg', price: 2.10, stock_quantity: 300 },
    { code: 'MED-005', name: 'Metformin Hydrochloride', generic_name: 'Glucophage', form: 'TABLET', strength: '500mg', price: 0.30, stock_quantity: 800 },
    { code: 'MED-006', name: 'Salbutamol Sulfate Inhaler', generic_name: 'Ventolin', form: 'INHALER', strength: '100mcg/dose', price: 14.50, stock_quantity: 85 },
    { code: 'MED-007', name: 'Ciprofloxacin Eye/Ear Drops', generic_name: 'Ciloxan', form: 'DROPS', strength: '0.3% 5ml', price: 8.75, stock_quantity: 110 },
    { code: 'MED-008', name: 'Ibuprofen', generic_name: 'Advil / Motrin', form: 'TABLET', strength: '400mg', price: 0.25, stock_quantity: 950 },
  ];

  for (const center of [centerA, centerB]) {
    for (const m of sampleMedicines) {
      await prisma.medicine.upsert({
        where: {
          center_id_code: {
            center_id: center.id,
            code: m.code,
          },
        },
        update: { name: m.name, generic_name: m.generic_name, form: m.form, strength: m.strength, price: m.price, stock_quantity: m.stock_quantity },
        create: {
          center_id: center.id,
          code: m.code,
          name: m.name,
          generic_name: m.generic_name,
          form: m.form,
          strength: m.strength,
          price: m.price,
          stock_quantity: m.stock_quantity,
          status: 'ACTIVE',
        },
      });
    }
  }

  // 7. Seed Sample Patients for Center A and Center B
  const patientA1 = await prisma.patient.upsert({
    where: { uhid: 'UHID-2026-10-000001' },
    update: {},
    create: {
      center_id: centerA.id,
      uhid: 'UHID-2026-10-000001',
      first_name: 'Robert',
      last_name: 'Hawthorne',
      dob: new Date('1984-06-15'),
      gender: 'MALE',
      blood_group: 'O+',
      phone: '+1 555-432-1100',
      email: 'robert.hawthorne@example.com',
      address: '42 Pine Crest Road, Springfield',
      emergency_contact: 'Mary Hawthorne (+1 555-432-1101)',
    },
  });

  const patientA2 = await prisma.patient.upsert({
    where: { uhid: 'UHID-2026-10-000002' },
    update: {},
    create: {
      center_id: centerA.id,
      uhid: 'UHID-2026-10-000002',
      first_name: 'Eleanor',
      last_name: 'Rigby',
      dob: new Date('1991-11-23'),
      gender: 'FEMALE',
      blood_group: 'A+',
      phone: '+1 555-432-2200',
      email: 'eleanor.rigby@example.com',
      address: '15 Abbey Road, Springfield',
      emergency_contact: 'Father McKenzie (+1 555-432-2201)',
    },
  });

  const patientB1 = await prisma.patient.upsert({
    where: { uhid: 'UHID-2026-10-000003' },
    update: {},
    create: {
      center_id: centerB.id,
      uhid: 'UHID-2026-10-000003',
      first_name: 'Jonathan',
      last_name: 'Archer',
      dob: new Date('1978-02-19'),
      gender: 'MALE',
      blood_group: 'B+',
      phone: '+1 555-987-3300',
      email: 'j.archer@example.com',
      address: '88 Starfleet Way, Westside',
      emergency_contact: 'T’Pol (+1 555-987-3301)',
    },
  });

  console.log(`Patients seeded: ${patientA1.uhid}, ${patientA2.uhid} (Center A) and ${patientB1.uhid} (Center B)`);

  console.log('--- Database Seeding Complete ---');
  console.log('Login credentials:');
  console.log('  Super Admin: admin@aegis.health / Admin@123456');
  console.log('  Doctor (Metro): dr.marcus@aegis.health / Staff@123456');
  console.log('  Cashier (Metro): cashier.metro@aegis.health / Staff@123456');
  console.log('  Doctor (Westside): dr.sarah@aegis.health / Staff@123456');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
