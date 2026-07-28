import { z } from "zod";

/**
 * Express middleware factory — validates req.body against a Zod schema.
 * Returns a standardised error response on failure.
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error?.issues?.map((e) => ({
        field: e.path.join(".") || "body",
        message: e.message,
      })) ?? [];
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }
    req.body = result.data; // use parsed + coerced data
    next();
  } catch (err) {
    next(err);
  }
};

// ─── Standard error response helper ──────────────────────────────────────────
export const apiError = (res, statusCode, message, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

// ─── Standard success response helper ─────────────────────────────────────────
export const apiSuccess = (res, statusCode, data, message = "Success") => {
  return res.status(statusCode).json({ success: true, message, data });
};
