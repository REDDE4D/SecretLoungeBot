import { z } from "zod";

/**
 * Telegram authentication data schema
 */
export const telegramAuthSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().length(64), // SHA256 hex string
});

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * User ID parameter schema
 */
export const userIdSchema = z.string().regex(/^\d+$/, "User ID must be numeric string");

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Validate request body against schema
 *
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} - { success: boolean, data?: any, error?: string }
 */
export function validateSchema(schema, data) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join(".")}: ${e.message}`);
      return { success: false, error: messages.join(", ") };
    }
    return { success: false, error: "Validation failed" };
  }
}
