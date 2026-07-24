import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";

/**
 * Generate a JWT access token
 */
export const generateAccessToken = (userId, tenantId, role) => {
  return jwt.sign(
    { userId, tenantId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * Generate a JWT refresh token
 */
export const generateRefreshToken = (userId, tenantId) => {
  return jwt.sign(
    { userId, tenantId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Hash a refresh token for safe DB storage
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Calculate expiry date for refresh token
 */
export const getRefreshTokenExpiry = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7 days
  return date;
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};
