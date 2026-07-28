import Booking from "../models/booking.model.js";
import { listQuerySchema } from "../validators/booking.validator.js";
import { apiError, apiSuccess } from "../utils/zodValidate.js";

// ── Serialise a booking document for API response ─────────
const serialize = (b) => ({
  id:             b._id.toString(),
  title:          b.title,
  description:    b.description,
  clientName:     b.clientName,
  clientEmail:    b.clientEmail,
  clientPhone:    b.clientPhone,
  startTime:      b.startTime,
  endTime:        b.endTime,
  timezone:       b.timezone,
  location:       b.location,
  status:         b.status,
  serviceType:    b.serviceType,
  notes:          b.notes,
  idempotencyKey: b.idempotencyKey,
  createdBy: b.createdBy?._id
    ? { id: b.createdBy._id.toString(), fullName: b.createdBy.fullName, email: b.createdBy.email }
    : b.createdBy?.toString(),
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

// ──────────────────────────────────────────────────────────
// POST /api/bookings   — Create (idempotent)
// ──────────────────────────────────────────────────────────
export const createBooking = async (req, res) => {
  const { idempotencyKey, ...rest } = req.body;
  const tenantId = req.tenant.id;

  try {
    // Idempotency check
    if (idempotencyKey) {
      const existing = await Booking.findOne({ tenantId, idempotencyKey });
      if (existing) {
        return apiSuccess(res, 200, serialize(existing), "Booking already exists (idempotent)");
      }
    }

    const booking = await Booking.create({
      ...rest,
      tenantId,
      createdBy: req.user.id,
      idempotencyKey: idempotencyKey || undefined,
    });

    return apiSuccess(res, 201, serialize(booking), "Booking created");
  } catch (err) {
    // MongoDB duplicate key on idempotencyKey index
    if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const existing = await Booking.findOne({ tenantId, idempotencyKey });
      if (existing) return apiSuccess(res, 200, serialize(existing), "Booking already exists (idempotent)");
    }
    console.error("createBooking error:", err);
    return apiError(res, 500, "Failed to create booking");
  }
};

// ──────────────────────────────────────────────────────────
// GET /api/bookings   — List with filters, pagination, search
// ──────────────────────────────────────────────────────────
export const listBookings = async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return apiError(res, 422, "Invalid query parameters", parsed.error.errors.map(e => ({ field: e.path.join("."), message: e.message })));
  }

  const { status, from, to, search, page, limit, sortBy, sortOrder } = parsed.data;
  const tenantId = req.tenant.id;

  const filter = { tenantId };

  if (status !== "all") filter.status = status;
  if (from || to) {
    filter.startTime = {};
    if (from) filter.startTime.$gte = new Date(from);
    if (to)   filter.startTime.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { title:       { $regex: search, $options: "i" } },
      { clientName:  { $regex: search, $options: "i" } },
      { clientEmail: { $regex: search, $options: "i" } },
      { serviceType: { $regex: search, $options: "i" } },
    ];
  }

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
  const skip = (page - 1) * limit;

  try {
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "fullName email")
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return apiSuccess(res, 200, {
      bookings: bookings.map(serialize),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("listBookings error:", err);
    return apiError(res, 500, "Failed to fetch bookings");
  }
};

// ──────────────────────────────────────────────────────────
// GET /api/bookings/:id   — Get single booking
// ──────────────────────────────────────────────────────────
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      tenantId: req.tenant.id,
    }).populate("createdBy", "fullName email");

    if (!booking) return apiError(res, 404, "Booking not found");
    return apiSuccess(res, 200, serialize(booking));
  } catch (err) {
    if (err.name === "CastError") return apiError(res, 400, "Invalid booking ID");
    return apiError(res, 500, "Failed to fetch booking");
  }
};

// ──────────────────────────────────────────────────────────
// PUT /api/bookings/:id   — Full update
// ──────────────────────────────────────────────────────────
export const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate("createdBy", "fullName email");

    if (!booking) return apiError(res, 404, "Booking not found");
    return apiSuccess(res, 200, serialize(booking), "Booking updated");
  } catch (err) {
    if (err.name === "CastError") return apiError(res, 400, "Invalid booking ID");
    return apiError(res, 500, "Failed to update booking");
  }
};

// ──────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/status   — Update status only
// ──────────────────────────────────────────────────────────
export const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant.id },
      { $set: { status: req.body.status } },
      { new: true }
    ).populate("createdBy", "fullName email");

    if (!booking) return apiError(res, 404, "Booking not found");
    return apiSuccess(res, 200, serialize(booking), "Status updated");
  } catch (err) {
    if (err.name === "CastError") return apiError(res, 400, "Invalid booking ID");
    return apiError(res, 500, "Failed to update status");
  }
};

// ──────────────────────────────────────────────────────────
// DELETE /api/bookings/:id   — Soft-cancel or hard delete
// ──────────────────────────────────────────────────────────
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenant.id,
    });

    if (!booking) return apiError(res, 404, "Booking not found");
    return apiSuccess(res, 200, { id: req.params.id }, "Booking deleted");
  } catch (err) {
    if (err.name === "CastError") return apiError(res, 400, "Invalid booking ID");
    return apiError(res, 500, "Failed to delete booking");
  }
};

// ──────────────────────────────────────────────────────────
// GET /api/bookings/stats   — Calendar stats
// ──────────────────────────────────────────────────────────
export const getBookingStats = async (req, res) => {
  const tenantId = req.tenant.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  try {
    const [total, thisMonth, byStatus, upcoming] = await Promise.all([
      Booking.countDocuments({ tenantId }),
      Booking.countDocuments({ tenantId, startTime: { $gte: startOfMonth, $lte: endOfMonth } }),
      Booking.aggregate([
        { $match: { tenantId: booking_objectId(tenantId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Booking.countDocuments({ tenantId, startTime: { $gte: now }, status: { $in: ["pending", "confirmed"] } }),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    return apiSuccess(res, 200, {
      total,
      thisMonth,
      upcoming,
      byStatus: {
        pending:   statusMap.pending   || 0,
        confirmed: statusMap.confirmed || 0,
        cancelled: statusMap.cancelled || 0,
        completed: statusMap.completed || 0,
        no_show:   statusMap.no_show   || 0,
      },
    });
  } catch (err) {
    console.error("getBookingStats error:", err);
    return apiError(res, 500, "Failed to fetch stats");
  }
};

// Helper to convert string id to ObjectId for aggregation
import mongoose from "mongoose";
const booking_objectId = (id) => new mongoose.Types.ObjectId(id);
