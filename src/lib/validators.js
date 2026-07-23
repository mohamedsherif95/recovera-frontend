import { z } from "zod";
import { CLINIC_PROFILE_CODES } from "@/lib/clinicProfiles";

const optionalNumberField = (schema) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "number" && Number.isNaN(val)) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    return typeof val === "number" ? val : Number(val);
  }, schema.optional());

const optionalStringField = (schema) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) {
      return undefined;
    }
    return val;
  }, schema.optional());

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const joinUsSchema = z.object({
  name: z.string().min(2, "joinUs.validation.name").max(160),
  phone: z.string().min(5, "joinUs.validation.phone").max(40),
  whatsappNumber: z
    .string()
    .min(5, "joinUs.validation.whatsapp")
    .max(40),
  email: optionalStringField(z.string().email("joinUs.validation.email").max(255)),
  clinicType: z.enum(CLINIC_PROFILE_CODES, {
    errorMap: () => ({ message: "joinUs.validation.clinicType" }),
  }),
});

export const firstLoginSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/\d/, "Password must include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Patient validation schema
export const patientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  age: optionalNumberField(
    z
      .number({ invalid_type_error: "Age must be a number" })
      .int("Age must be an integer")
      .min(0, "Age must be at least 0")
      .max(120, "Age must be at most 120"),
  ),
  phone: optionalStringField(
    z
      .string()
      .min(5, "Phone number must be at least 5 digits")
      .max(20, "Phone number must be at most 20 digits"),
  ),
  address: optionalStringField(
    z.string().max(255, "Address must be at most 255 characters"),
  ),
  job: optionalStringField(
    z.string().max(255, "Job must be at most 255 characters"),
  ),
  referral: optionalStringField(
    z.string().max(255, "Referral must be at most 255 characters"),
  ),
  categoryId: optionalNumberField(
    z.number().int("Category must be an integer"),
  ),
  defaultSessionCost: optionalNumberField(
    z
      .number({ invalid_type_error: "Default session cost must be a number" })
      .int("Default session cost must be an integer")
      .min(0, "Default session cost must be 0 or greater"),
  ),
  reassessmentCycleLength: optionalNumberField(
    z
      .number({
        invalid_type_error: "Reassessment cycle length must be a number",
      })
      .int("Reassessment cycle length must be an integer")
      .min(0, "Reassessment cycle length must be 0 or greater"),
  ),
});

// Session validation schema
export const sessionSchema = z.object({
  doctorId: z.number({ required_error: "validation.sessions.doctorRequired" }),
  patientId: z.number({
    required_error: "validation.sessions.patientRequired",
  }),
  sessionDate: z.string().min(1, "validation.sessions.dateRequired"),
  sessionTime: z
    .string()
    .min(1, "validation.sessions.startedAtRequired")
    .refine((value) => {
      if (!value) return false;
      const [hStr, mStr] = value.split(":");
      const hour = Number(hStr);
      const minute = Number(mStr);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
      return hour >= 10 && hour <= 24 && minute === 0;
    }, "validation.sessions.timeRange"),
  cost: optionalNumberField(
    z.number().min(0, "validation.sessions.costPositive"),
  ),
  categoryId: z.number().optional().nullable(),
  categoryNotes: z.string().optional().nullable(),
  profile: z.enum(CLINIC_PROFILE_CODES).optional(),
  visitType: z.string().optional().nullable(),
  profileDetails: z.record(z.any()).optional(),
  isAssessment: z.boolean().optional(),
  isNewAssessment: z.boolean().optional(),
});

// Payment validation schema
export const paymentSchema = z.object({
  sessionId: z.number({ required_error: "Session is required" }),
  amount: z.number().min(1, "Amount must be greater than 0"),
  method: z.enum(["cash", "instapay", "e_wallet"], {
    required_error: "Payment method is required",
  }),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
});
