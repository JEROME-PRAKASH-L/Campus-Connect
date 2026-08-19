import { z } from 'zod';
import { dateSchema, emailSchema, moneySchema, nonEmpty, optionalText, phoneSchema, timeSchema } from '../common.js';
import { ROLES } from '../roles.js';

/**
 * Master-data contracts. Both ends validate with exactly these objects: the browser
 * for instant field-level feedback, the API again before anything reaches Prisma.
 *
 * Every object is `.strict()`, so a payload carrying an extra key — `role`,
 * `departmentId`, `status`, anything the caller should not be able to set — is
 * rejected outright rather than silently spread into a Prisma `data` argument.
 */

const code = (label: string, max = 24) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
    .trim()
    .toUpperCase()
    .min(1, `${label} is required.`)
    .max(max)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/, `${label} may use letters, digits and . _ - only.`);

export const institutionSchema = z
  .object({
    name: nonEmpty('Institution name'),
    shortName: nonEmpty('Short name', 40),
    affiliation: optionalText(160),
    addressLine1: optionalText(160),
    addressLine2: optionalText(160),
    city: optionalText(80),
    state: optionalText(80),
    postalCode: optionalText(16),
    phone: optionalText(20),
    email: z.union([emailSchema, z.literal('')]).default(''),
    website: optionalText(160),
    logoFileId: z.string().trim().max(60).optional(),
  })
  .strict();

export const departmentCreateSchema = z
  .object({
    code: code('Department code', 12),
    name: nonEmpty('Department name'),
    block: optionalText(60),
    hodUserId: z.string().trim().max(60).optional(),
    hodName: optionalText(120),
  })
  .strict();
export const departmentUpdateSchema = departmentCreateSchema.partial();

export const programmeCreateSchema = z
  .object({
    code: code('Programme code'),
    name: nonEmpty('Programme name'),
    degree: nonEmpty('Degree', 40),
    durationYears: z.coerce.number().int().min(1, 'At least one year.').max(8),
    departmentId: nonEmpty('Department', 60),
  })
  .strict();
export const programmeUpdateSchema = programmeCreateSchema.partial();

export const academicYearCreateSchema = z
  .object({
    number: z.coerce.number().int().min(1, 'Semester number starts at 1.').max(12),
    label: nonEmpty('Label', 80),
    academicYear: nonEmpty('Academic year', 40),
    isCurrent: z.coerce.boolean().default(false),
  })
  .strict();
export const academicYearUpdateSchema = academicYearCreateSchema.partial();

export const sectionCreateSchema = z
  .object({
    name: nonEmpty('Section name', 12),
    courseId: nonEmpty('Programme', 60),
    semesterId: nonEmpty('Semester', 60),
    advisorFacultyId: z.string().trim().max(60).optional(),
  })
  .strict();
export const sectionUpdateSchema = sectionCreateSchema.partial();

export const subjectCreateSchema = z
  .object({
    code: code('Subject code'),
    name: nonEmpty('Subject name'),
    shortName: nonEmpty('Short name', 40),
    credits: z.coerce.number().int().min(0).max(12),
    room: optionalText(40),
    kind: z.enum(['THEORY', 'PRACTICAL']),
    departmentId: nonEmpty('Department', 60),
    semesterId: nonEmpty('Semester', 60),
    facultyId: z.string().trim().max(60).optional(),
  })
  .strict();
export const subjectUpdateSchema = subjectCreateSchema.partial();

export const studentCreateSchema = z
  .object({
    name: nonEmpty('Full name'),
    email: emailSchema,
    registerNumber: code('Register number', 20),
    batch: nonEmpty('Batch', 20),
    dateOfBirth: dateSchema('Date of birth'),
    bloodGroup: optionalText(16),
    mobile: phoneSchema,
    residence: optionalText(40),
    admissionQuota: optionalText(40),
    mentorName: optionalText(120),
    departmentId: nonEmpty('Department', 60),
    courseId: nonEmpty('Programme', 60),
    sectionId: nonEmpty('Section', 60),
    photoFileId: z.string().trim().max(60).optional(),
  })
  .strict();
export const studentUpdateSchema = studentCreateSchema.partial();

/** The narrow slice a student may change on their own record. */
export const studentSelfUpdateSchema = z
  .object({
    mobile: phoneSchema.optional(),
    bloodGroup: optionalText(16).optional(),
    residence: optionalText(40).optional(),
    photoFileId: z.string().trim().max(60).optional(),
  })
  .strict();

export const facultyCreateSchema = z
  .object({
    name: nonEmpty('Full name'),
    email: emailSchema,
    staffId: code('Staff ID', 20),
    designation: nonEmpty('Designation', 80),
    qualification: optionalText(120),
    experienceYears: z.coerce.number().int().min(0).max(60),
    cabin: optionalText(60),
    mobile: phoneSchema,
    joinedOn: dateSchema('Date of joining'),
    departmentId: nonEmpty('Department', 60),
    isHead: z.coerce.boolean().default(false),
  })
  .strict();
export const facultyUpdateSchema = facultyCreateSchema.partial();

export const parentCreateSchema = z
  .object({
    name: nonEmpty('Full name'),
    email: emailSchema,
    relation: nonEmpty('Relation', 30),
    mobile: phoneSchema,
    wardId: nonEmpty('Ward', 60),
  })
  .strict();
export const parentUpdateSchema = parentCreateSchema.partial();

export const userCreateSchema = z
  .object({
    name: nonEmpty('Full name'),
    email: emailSchema,
    role: z.enum(ROLES),
    departmentCode: z.string().trim().max(12).optional(),
    extra: optionalText(120),
  })
  .strict();
export const userUpdateSchema = z
  .object({
    name: nonEmpty('Full name').optional(),
    email: emailSchema.optional(),
    role: z.enum(ROLES).optional(),
    departmentCode: z.string().trim().max(12).optional(),
    extra: optionalText(120).optional(),
  })
  .strict();

export const timetableEntryCreateSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    period: z.coerce.number().int().min(1).max(10),
    startTime: timeSchema,
    endTime: timeSchema,
    room: optionalText(40),
    label: optionalText(60),
    sectionId: nonEmpty('Section', 60),
    semesterId: nonEmpty('Semester', 60),
    subjectId: z.string().trim().max(60).optional(),
    facultyId: z.string().trim().max(60).optional(),
  })
  .strict()
  .refine((v) => v.endTime > v.startTime, { message: 'The end time must be after the start time.', path: ['endTime'] });
export const timetableEntryUpdateSchema = timetableEntryCreateSchema.innerType().partial();

export const feeCategoryCreateSchema = z
  .object({
    code: code('Category code'),
    name: nonEmpty('Category name'),
    defaultAmount: moneySchema,
    academicYear: nonEmpty('Academic year', 40),
    description: optionalText(240),
  })
  .strict();
export const feeCategoryUpdateSchema = feeCategoryCreateSchema.partial();

export const feeCreateSchema = z
  .object({
    studentId: nonEmpty('Student', 60),
    categoryId: z.string().trim().max(60).optional(),
    head: nonEmpty('Head of fee', 80),
    amount: moneySchema,
    dueDate: dateSchema('Due date'),
    academicYear: nonEmpty('Academic year', 40),
  })
  .strict();
export const feeUpdateSchema = feeCreateSchema.partial();

export const paymentCreateSchema = z
  .object({
    feeId: nonEmpty('Fee record', 60),
    mode: z.enum(['UPI', 'NEFT', 'CARD', 'CASH', 'CHEQUE', 'DD']),
    referenceName: optionalText(120),
    paidOn: dateSchema('Payment date').optional(),
  })
  .strict();

export const examCreateSchema = z
  .object({
    title: nonEmpty('Examination title'),
    subjectId: nonEmpty('Subject', 60),
    date: dateSchema('Examination date'),
    session: z.enum(['Forenoon', 'Afternoon']),
    hall: optionalText(40),
    seatNo: optionalText(20),
    strength: z.coerce.number().int().min(0).max(2000).default(0),
  })
  .strict();
export const examUpdateSchema = examCreateSchema.partial();

export const eventCreateSchema = z
  .object({
    title: nonEmpty('Event title'),
    date: dateSchema('Event date'),
    tag: nonEmpty('Tag', 40),
    tone: z.enum(['OK', 'WARN', 'BAD', 'ACCENT']).default('ACCENT'),
  })
  .strict();
export const eventUpdateSchema = eventCreateSchema.partial();

export const companyCreateSchema = z
  .object({
    name: nonEmpty('Company name'),
    sector: optionalText(80),
    website: optionalText(160),
    contactName: optionalText(120),
    contactEmail: z.union([emailSchema, z.literal('')]).default(''),
    contactPhone: z.union([phoneSchema, z.literal('')]).default(''),
  })
  .strict();
export const companyUpdateSchema = companyCreateSchema.partial();

export const placementDriveCreateSchema = z
  .object({
    company: nonEmpty('Company'),
    companyId: z.string().trim().max(60).optional(),
    role: nonEmpty('Role', 120),
    ctc: nonEmpty('CTC', 40),
    driveDate: dateSchema('Drive date'),
    eligibility: optionalText(240),
    minCgpa: z.coerce.number().min(0).max(10),
    noArrears: z.coerce.boolean().default(false),
  })
  .strict();
export const placementDriveUpdateSchema = placementDriveCreateSchema.partial();

export const supportRequestCreateSchema = z
  .object({
    kind: z.enum(['SUPPORT', 'CONTACT_UPDATE', 'ACKNOWLEDGEMENT', 'RECORD_CORRECTION']),
    subject: nonEmpty('Subject', 160),
    body: nonEmpty('Message', 2000),
  })
  .strict();

export const supportRequestResolveSchema = z
  .object({
    resolution: nonEmpty('Resolution', 2000),
    status: z.enum(['RESOLVED', 'REJECTED']),
  })
  .strict();

export const studentRemarkCreateSchema = z
  .object({
    studentId: nonEmpty('Student', 60),
    subjectId: z.string().trim().max(60).optional(),
    category: z.enum(['ACADEMIC', 'BEHAVIOUR', 'ATTENDANCE', 'COMMENDATION']),
    body: nonEmpty('Remark', 1000),
  })
  .strict();

export const internalMarksSchema = z
  .object({
    subjectId: nonEmpty('Subject', 60),
    marks: z
      .array(
        z
          .object({
            studentId: nonEmpty('Student', 60),
            internal1: z.coerce.number().int().min(0).max(50).nullable().optional(),
            internal2: z.coerce.number().int().min(0).max(50).nullable().optional(),
            assignment: z.coerce.number().int().min(0).max(20).nullable().optional(),
            practical: z.coerce.number().int().min(0).max(50).nullable().optional(),
          })
          .strict(),
      )
      .min(1, 'Enter a mark for at least one student.'),
  })
  .strict();

export const certificateCreateSchema = z
  .object({
    title: nonEmpty('Certificate title'),
    reference: nonEmpty('Reference', 60),
    issuedOn: dateSchema('Issue date').optional(),
    fileId: z.string().trim().max(60).optional(),
  })
  .strict();

export const attendanceCorrectionSchema = z
  .object({
    subjectId: nonEmpty('Subject', 60),
    studentId: nonEmpty('Student', 60),
    date: dateSchema('Session date'),
    period: z.coerce.number().int().min(1).max(10),
    mark: z.enum(['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE']),
    reason: nonEmpty('Reason', 400),
  })
  .strict();

export type InstitutionInput = z.input<typeof institutionSchema>;
export type DepartmentInput = z.input<typeof departmentCreateSchema>;
export type ProgrammeInput = z.input<typeof programmeCreateSchema>;
export type AcademicYearInput = z.input<typeof academicYearCreateSchema>;
export type SectionInput = z.input<typeof sectionCreateSchema>;
export type SubjectInput = z.input<typeof subjectCreateSchema>;
export type StudentInput = z.input<typeof studentCreateSchema>;
export type FacultyInput = z.input<typeof facultyCreateSchema>;
export type ParentInput = z.input<typeof parentCreateSchema>;
export type UserInput = z.input<typeof userCreateSchema>;
export type TimetableEntryInput = z.input<typeof timetableEntryCreateSchema>;
export type FeeCategoryInput = z.input<typeof feeCategoryCreateSchema>;
export type FeeInput = z.input<typeof feeCreateSchema>;
export type PaymentInput = z.input<typeof paymentCreateSchema>;
export type ExamInput = z.input<typeof examCreateSchema>;
export type EventInput = z.input<typeof eventCreateSchema>;
export type CompanyInput = z.input<typeof companyCreateSchema>;
export type PlacementDriveInput = z.input<typeof placementDriveCreateSchema>;
export type SupportRequestInput = z.input<typeof supportRequestCreateSchema>;
export type StudentRemarkInput = z.input<typeof studentRemarkCreateSchema>;
