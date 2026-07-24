import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
} from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "../utils/jwt.js";

/**
 * POST /api/auth/register
 * Register a new user for the current tenant
 */
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { email, password, fullName } = req.body;
  const tenant = req.tenant;

  try {
    // Check if user already exists in this tenant
    const existing = await findUserByEmail(tenant.id, email);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await createUser({
      tenantId: tenant.id,
      email,
      passwordHash,
      fullName,
      role: "member",
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, tenant.id, user.role);
    const refreshToken = generateRefreshToken(user.id, tenant.id);
    const tokenHash = hashToken(refreshToken);
    await saveRefreshToken(user.id, tenant.id, tokenHash, getRefreshTokenExpiry());

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

/**
 * POST /api/auth/login
 * Login a user within the current tenant
 */
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const tenant = req.tenant;

  try {
    // Find user in this tenant
    const user = await findUserByEmail(tenant.id, email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    await updateLastLogin(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, tenant.id, user.role);
    const refreshToken = generateRefreshToken(user.id, tenant.id);
    const tokenHash = hashToken(refreshToken);
    await saveRefreshToken(user.id, tenant.id, tokenHash, getRefreshTokenExpiry());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          avatarUrl: user.avatar_url,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          settings: tenant.settings,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh the access token using a refresh token
 */
export const refreshTokens = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: "Refresh token required" });
  }

  try {
    // Verify token signature
    const decoded = verifyRefreshToken(refreshToken);

    // Check it's in DB and not expired
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshToken(tokenHash);
    if (!storedToken) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    // Fetch user
    const user = await findUserById(decoded.tenantId, decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Rotate tokens
    await deleteRefreshToken(tokenHash);
    const newAccessToken = generateAccessToken(user.id, decoded.tenantId, user.role);
    const newRefreshToken = generateRefreshToken(user.id, decoded.tenantId);
    const newTokenHash = hashToken(newRefreshToken);
    await saveRefreshToken(user.id, decoded.tenantId, newTokenHash, getRefreshTokenExpiry());

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

/**
 * POST /api/auth/logout
 * Invalidate the refresh token
 */
export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await deleteRefreshToken(tokenHash);
  }
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.full_name,
        role: req.user.role,
        avatarUrl: req.user.avatar_url,
      },
      tenant: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        plan: req.tenant.plan,
        settings: req.tenant.settings,
      },
    },
  });
};
