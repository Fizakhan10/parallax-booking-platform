import { Router } from "express";
import { detectTenant } from "../middleware/tenantMiddleware.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { findAllUsersByTenant } from "../models/user.model.js";

const router = Router();

// All dashboard routes require tenant + auth
router.use(detectTenant);
router.use(authenticate);

// GET /api/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const users = await findAllUsersByTenant(req.tenant.id);
    return res.status(200).json({
      success: true,
      data: {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.is_active).length,
        tenant: {
          name: req.tenant.name,
          slug: req.tenant.slug,
          plan: req.tenant.plan,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
});

// GET /api/dashboard/users (admin/owner only)
router.get("/users", authorize("owner", "admin"), async (req, res) => {
  try {
    const users = await findAllUsersByTenant(req.tenant.id);
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
});

export default router;
