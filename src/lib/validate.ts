import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────
// Minimal validation primitives (no external deps needed;
// keeps Edge-runtime compatible and avoids adding zod if absent)
// ─────────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

// ── Field validators ──────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): v is string {
  return isString(v) && v.trim().length > 0;
}

function isEmail(v: unknown): boolean {
  if (!isString(v)) return false;
  // RFC 5322-simplified pattern
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isOptionalString(v: unknown): boolean {
  return v === undefined || v === null || isString(v);
}

function isOptionalDate(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (!isString(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function isOptionalNumber(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  return typeof v === "number" && isFinite(v) && v >= 0;
}

// ── Schema types ──────────────────────────────────────────────

export interface ParticipantInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  status?: string | null;
  groupId?: string | null;
}

export interface EventInput {
  title: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
}

export interface EmailInput {
  subject: string;
  body: string;
  templateId?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ── Validators ────────────────────────────────────────────────

export function validateParticipant(raw: unknown): ValidationResult<ParticipantInput> {
  const errors: string[] = [];
  const obj = raw as Record<string, unknown>;

  if (!isNonEmptyString(obj?.firstName)) errors.push("firstName: stringa non vuota richiesta");
  if (!isNonEmptyString(obj?.lastName))  errors.push("lastName: stringa non vuota richiesta");
  if (!isEmail(obj?.email))              errors.push("email: indirizzo email non valido");
  if (!isOptionalString(obj?.phone))     errors.push("phone: stringa opzionale");
  if (!isOptionalString(obj?.company))   errors.push("company: stringa opzionale");
  if (!isOptionalString(obj?.jobTitle))  errors.push("jobTitle: stringa opzionale");
  if (!isOptionalString(obj?.status))    errors.push("status: stringa opzionale");
  if (!isOptionalString(obj?.groupId))   errors.push("groupId: stringa opzionale");

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    data: {
      firstName: (obj.firstName as string).trim(),
      lastName:  (obj.lastName  as string).trim(),
      email:     (obj.email     as string).toLowerCase().trim(),
      phone:     isString(obj.phone)    ? obj.phone    : null,
      company:   isString(obj.company)  ? obj.company  : null,
      jobTitle:  isString(obj.jobTitle) ? obj.jobTitle : null,
      status:    isString(obj.status)   ? obj.status   : null,
      groupId:   isString(obj.groupId)  ? obj.groupId  : null,
    },
  };
}

export function validateEvent(raw: unknown): ValidationResult<EventInput> {
  const errors: string[] = [];
  const obj = raw as Record<string, unknown>;

  if (!isNonEmptyString(obj?.title))    errors.push("title: stringa non vuota richiesta");
  if (!isOptionalString(obj?.description)) errors.push("description: stringa opzionale");
  if (!isOptionalDate(obj?.startDate))  errors.push("startDate: data ISO opzionale");
  if (!isOptionalDate(obj?.endDate))    errors.push("endDate: data ISO opzionale");
  if (!isOptionalNumber(obj?.capacity)) errors.push("capacity: numero positivo opzionale");

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    data: {
      title:       (obj.title as string).trim(),
      description: isString(obj.description) ? obj.description : null,
      startDate:   isString(obj.startDate)   ? obj.startDate   : null,
      endDate:     isString(obj.endDate)      ? obj.endDate     : null,
      capacity:    typeof obj.capacity === "number" ? obj.capacity : null,
    },
  };
}

export function validateEmail(raw: unknown): ValidationResult<EmailInput> {
  const errors: string[] = [];
  const obj = raw as Record<string, unknown>;

  if (!isNonEmptyString(obj?.subject))   errors.push("subject: stringa non vuota richiesta");
  if (!isNonEmptyString(obj?.body))      errors.push("body: stringa non vuota richiesta");
  if (!isOptionalString(obj?.templateId)) errors.push("templateId: stringa opzionale");

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    data: {
      subject:    (obj.subject as string).trim(),
      body:       obj.body as string,
      templateId: isString(obj.templateId) ? obj.templateId : null,
    },
  };
}

export function validateLogin(raw: unknown): ValidationResult<LoginInput> {
  const errors: string[] = [];
  const obj = raw as Record<string, unknown>;

  if (!isEmail(obj?.email))    errors.push("email: indirizzo email non valido");
  if (!isString(obj?.password) || (obj.password as string).length < 8)
    errors.push("password: minimo 8 caratteri");

  if (errors.length) return { success: false, errors };

  return {
    success: true,
    data: {
      email:    (obj.email as string).toLowerCase().trim(),
      password: obj.password as string,
    },
  };
}

// ── Helper per API routes ─────────────────────────────────────

/**
 * Validates `body` against the given validator.
 * Returns `{ data }` on success, `{ error: NextResponse }` on failure.
 */
export function validateBody<T>(
  validator: (raw: unknown) => ValidationResult<T>,
  body: unknown
): { data: T } | { error: NextResponse } {
  const result = validator(body);
  if (result.success) return { data: result.data };
  return {
    error: NextResponse.json(
      { error: "Dati non validi", details: result.errors },
      { status: 400 }
    ),
  };
}
