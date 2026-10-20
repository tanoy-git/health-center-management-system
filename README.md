# SYSTEM BLUEPRINT: Health Center Management System v2.0
**ATTENTION AGENTIC AI (ANTIGRAVITY):** This document is your absolute source of truth and execution specification for generating the Health Center Management System. You are to read, parse, and execute the creation of this system strictly according to the architecture, constraints, and requirements defined below.

---

## 1. PROJECT OVERVIEW
**System:** Multi-Center Clinic & Hospital Management ERP.
**Architecture:** Domain-Driven Design (DDD) Modular Monolith.
**Deployment Target:** Dockerized (Local Development) -> Cloud (Production).
**User Interface:** Professional, clinical-grade UI, Fully Responsive (Web & Mobile), Native Light/Dark theme support.

---

## 2. TECHNOLOGY STACK
You must strictly adhere to the following stack:
*   **Monorepo Tooling:** npm workspaces or TurboRepo.
*   **Backend:** NestJS (Node 18+), TypeScript.
*   **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Shadcn UI (for professional clinical themes).
*   **Database:** PostgreSQL 16.
*   **ORM:** Prisma ORM.
*   **Caching/Queues:** Redis 7 (Session management) & BullMQ (Background jobs/PDFs).
*   **Storage:** MinIO (Local) / AWS S3 (Production) for Medical Imaging & PDFs.
*   **Containerization:** Docker & Docker Compose.

---

## 3. CORE ARCHITECTURE & CONSTRAINTS

### 3.1 Multi-Tenant Data Isolation (CRITICAL)
*   **Concept:** The system manages multiple centers/branches.
*   **Rule:** EVERY operational database table (Users, Patients, Invoices, Prescriptions, Attendance) MUST have a `center_id` foreign key.
*   **Enforcement:** You must implement a NestJS global interceptor or Prisma middleware that automatically scopes all read/write queries to the authenticated user's `center_id`. Cross-center data leakage is a critical security failure.

### 3.2 Audit & Soft-Delete (CRITICAL)
*   **Rule:** NEVER hard-delete records.
*   **Fields:** Every Prisma model must include: `created_at` (DateTime), `updated_at` (DateTime), `deleted_at` (DateTime?), `created_by` (UUID?), `updated_by` (UUID?).

### 3.3 Authentication & Authorization
*   **Mechanism:** JWT & OAuth2 via NestJS Passport.
*   **Session:** Maintain active sessions in Redis. Allow forced logouts.
*   **Dynamic RBAC:** Roles and Permissions must be database-driven, not hardcoded enums. The Super Admin must be able to create new roles (e.g., "Junior Nurse") and assign specific UI/API permissions dynamically from the frontend admin panel.

---

## 4. FUNCTIONAL MODULES TO BUILD

### Module A: IAM & Center Management
*   **Authentication Pages:** Professional Login/Logout pages with session handling.
*   **Center Registry:** CRUD interface for physical centers (Name, Location, Active/Inactive status).
*   **RBAC Configurator:** UI to map permissions to roles.

### Module B: HR, Attendance & Payroll
*   **Employee Registry:** Bind employees to specific centers.
*   **Automated Attendance:** When an employee successfully authenticates (Login), the backend must fire an event to create an `Attendance` record with a timestamp for that day.
*   **Salary System:** Module to generate monthly salary slips based on attendance and base pay.

### Module C: Patient Master Index
*   **Registration:** Center-based patient entry.
*   **Rule:** An employee logged into Center A can ONLY see and manage patients registered at Center A.
*   **UHID:** Generate a unique ID (e.g., `UHID-YYYY-MM-XXXXXX`) upon creation.

### Module D: Service & Billing POS
*   **Service Catalog:** Global or center-specific list of billable items (Consultation fees, Lab tests, USG).
*   **Point of Sale (POS):** A streamlined UI to add services to a cart, apply discounts, and generate an Invoice.
*   **Invoicing:** View, modify (with strict audit logs), and print standard A4 and thermal receipt formats.

### Module E: Clinical & Diagnostics
*   **Pharmacy/Medicine Catalog:** CRUD for medicines.
*   **Prescription Engine:** UI for Doctors to select medicines, write dosages, add clinical notes, and generate a printable PDF prescription.
*   **Lab & USG Reports:** Data entry interfaces with rich-text capabilities. Support for uploading DICOM/Images to MinIO/S3. Must support Pathologist digital sign-off.

---

## 5. EXECUTION PLAN FOR AGENT

**Agentic Instructions:** Execute the project generation in the following sequential phases. Do not proceed to the next phase until the previous is fully implemented and tested in your internal execution loop.

*   **Phase 1: Infrastructure & Schema.** 
    *   Initialize the monorepo workspace.
    *   Generate `docker-compose.yml` for Postgres, Redis, and MinIO.
    *   Write the complete `schema.prisma` enforcing `center_id` isolation and audit fields on all models.
*   **Phase 2: Backend Core (NestJS).**
    *   Implement IAM (JWT Auth), Redis session management, and the automated Attendance trigger upon login.
    *   Implement the Dynamic RBAC guards and Center-isolation middleware.
*   **Phase 3: Backend Modules (NestJS).**
    *   Build REST APIs/GraphQL endpoints for HR, Patients, Services, Billing, and Diagnostics.
*   **Phase 4: Frontend Core (Next.js).**
    *   Setup Tailwind, Shadcn UI, and ThemeProvider (Light/Dark mode toggle).
    *   Build the persistent layout: Sidebar navigation based on user permissions, Header with Center context indicator.
*   **Phase 5: Frontend Workflows (Next.js).**
    *   Build the POS/Billing screen.
    *   Build the Prescription generation UI.
    *   Build the multi-center configuration and RBAC matrix UI.