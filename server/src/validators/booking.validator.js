import { z } from "zod";

// ── Shared field definitions ───────────────────────────────
const isoDate = z
  .string({ required_error: "Date is required" })
  .datetime({ message: "Must be a valid ISO 8601 datetime string" });

const STATUS_VALUES = ["pending", "confirmed", "cancelled", "completed", "no_show"];

// ── Create booking ─────────────────────────────────────────
export const createBookingSchema = z
  .object({
    title: z
      .string({ required_error: "Title is required" })
      .min(2, "Title must be at least 2 characters")
      .max(150, "Title must be at most 150 characters")
      .trim(),

    description: z.string().max(1000).trim().optional().default(""),

    clientName: z
      .string({ required_error: "Client name is required" })
      .min(2, "Client name must be at least 2 characters")
      .max(100)
      .trim(),

    clientEmail: z
      .string({ required_error: "Client email is required" })
      .email("Must be a valid email address")
      .toLowerCase(),

    clientPhone: z.string().max(30).trim().optional().default(""),

    startTime: isoDate,
    endTime:   isoDate,

    timezone: z.string().max(50).optional().default("UTC"),
    location: z.string().max(200).trim().optional().default(""),

    serviceType: z.string().max(80).trim().optional().default(""),
    notes:       z.string().max(2000).trim().optional().default(""),

    idempotencyKey: z
      .string()
      .uuid("idempotencyKey must be a valid UUID v4")
      .optional(),
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    { message: "End time must be after start time", path: ["endTime"] }
  );

// ── Update booking ─────────────────────────────────────────
export const updateBookingSchema = z
  .object({
    title:       z.string().min(2).max(150).trim().optional(),
    description: z.string().max(1000).trim().optional(),
    clientName:  z.string().min(2).max(100).trim().optional(),
    clientEmail: z.string().email().toLowerCase().optional(),
    clientPhone: z.string().max(30).trim().optional(),
    startTime:   isoDate.optional(),
    endTime:     isoDate.optional(),
    timezone:    z.string().max(50).optional(),
    location:    z.string().max(200).trim().optional(),
    serviceType: z.string().max(80).trim().optional(),
    notes:       z.string().max(2000).trim().optional(),
    status:      z.enum(STATUS_VALUES).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

// ── Update status only ─────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUS_VALUES.join(", ")}` }),
  }),
});

// ── Query params schema (list bookings) ────────────────────
export const listQuerySchema = z.object({
  status:    z.enum([...STATUS_VALUES, "all"]).optional().default("all"),
  from:      z.string().datetime().optional(),
  to:        z.string().datetime().optional(),
  search:    z.string().max(100).trim().optional(),
  page:      z.coerce.number().int().min(1).optional().default(1),
  limit:     z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy:    z.enum(["startTime", "createdAt", "clientName", "title"]).optional().default("startTime"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});
