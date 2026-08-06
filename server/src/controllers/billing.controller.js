import stripe, { PLAN_PRICE_MAP, PLANS } from "../config/stripe.js";
import Tenant from "../models/tenant.model.js";
import { BillingEvent, Invoice } from "../models/billing.model.js";
import { apiError, apiSuccess } from "../utils/zodValidate.js";
import env from "../config/env.js";

// ── Helper: plan name from priceId ────────────────────────
const planFromPriceId = (priceId) => {
  for (const [plan, pid] of Object.entries(PLAN_PRICE_MAP)) {
    if (pid && pid === priceId) return plan;
  }
  return "free";
};

// ─────────────────────────────────────────────────────────
// GET /api/billing/plans   — public plan list
// ─────────────────────────────────────────────────────────
export const getPlans = (_req, res) => {
  return apiSuccess(res, 200, { plans: PLANS });
};

// ─────────────────────────────────────────────────────────
// GET /api/billing/status  — current subscription status
// ─────────────────────────────────────────────────────────
export const getBillingStatus = async (req, res) => {
  const tenant = await Tenant.findById(req.tenant.id).lean();
  if (!tenant) return apiError(res, 404, "Tenant not found");

  return apiSuccess(res, 200, {
    plan:                 tenant.plan,
    subscriptionStatus:   tenant.subscriptionStatus || "none",
    currentPeriodEnd:     tenant.currentPeriodEnd   || null,
    cancelAtPeriodEnd:    tenant.cancelAtPeriodEnd  || false,
    stripeCustomerId:     tenant.stripeCustomerId   || null,
    stripeSubscriptionId: tenant.stripeSubscriptionId || null,
  });
};

// ─────────────────────────────────────────────────────────
// POST /api/billing/checkout  — create Stripe Checkout session
// ─────────────────────────────────────────────────────────
export const createCheckoutSession = async (req, res) => {
  const { plan } = req.body;
  if (!plan || plan === "free") return apiError(res, 400, "Invalid plan selected");

  const priceId = PLAN_PRICE_MAP[plan];
  if (!priceId) {
    return apiError(res, 400, `Stripe price ID not configured for plan: ${plan}. Add STRIPE_PRICE_${plan.toUpperCase()} to .env`);
  }

  const tenant = await Tenant.findById(req.tenant.id);
  if (!tenant) return apiError(res, 404, "Tenant not found");

  try {
    // Ensure Stripe customer exists
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    req.user.email,
        name:     tenant.name,
        metadata: { tenantId: tenant._id.toString(), tenantSlug: tenant.slug },
      });
      customerId = customer.id;
      await Tenant.findByIdAndUpdate(tenant._id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.CLIENT_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${env.CLIENT_URL}/dashboard/billing?canceled=true`,
      metadata: {
        tenantId: tenant._id.toString(),
        plan,
      },
      subscription_data: {
        metadata: { tenantId: tenant._id.toString(), plan },
      },
      allow_promotion_codes: true,
    });

    return apiSuccess(res, 200, { url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return apiError(res, 500, err.message || "Failed to create checkout session");
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/billing/portal  — customer billing portal
// ─────────────────────────────────────────────────────────
export const createPortalSession = async (req, res) => {
  const tenant = await Tenant.findById(req.tenant.id).lean();
  if (!tenant?.stripeCustomerId) {
    return apiError(res, 400, "No Stripe customer found. Please subscribe to a plan first.");
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   tenant.stripeCustomerId,
      return_url: `${env.CLIENT_URL}/dashboard/billing`,
    });
    return apiSuccess(res, 200, { url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err.message);
    return apiError(res, 500, "Failed to open billing portal");
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/billing/cancel  — cancel subscription at period end
// ─────────────────────────────────────────────────────────
export const cancelSubscription = async (req, res) => {
  const tenant = await Tenant.findById(req.tenant.id).lean();
  if (!tenant?.stripeSubscriptionId) {
    return apiError(res, 400, "No active subscription found");
  }

  try {
    await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await Tenant.findByIdAndUpdate(tenant._id, { cancelAtPeriodEnd: true });
    return apiSuccess(res, 200, { cancelAtPeriodEnd: true }, "Subscription will cancel at period end");
  } catch (err) {
    return apiError(res, 500, "Failed to cancel subscription");
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/billing/reactivate  — undo cancellation
// ─────────────────────────────────────────────────────────
export const reactivateSubscription = async (req, res) => {
  const tenant = await Tenant.findById(req.tenant.id).lean();
  if (!tenant?.stripeSubscriptionId) {
    return apiError(res, 400, "No subscription found");
  }

  try {
    await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await Tenant.findByIdAndUpdate(tenant._id, { cancelAtPeriodEnd: false });
    return apiSuccess(res, 200, { cancelAtPeriodEnd: false }, "Subscription reactivated");
  } catch (err) {
    return apiError(res, 500, "Failed to reactivate subscription");
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/billing/invoices  — invoice history
// ─────────────────────────────────────────────────────────
export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ tenantId: req.tenant.id })
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();

    return apiSuccess(res, 200, { invoices });
  } catch (err) {
    return apiError(res, 500, "Failed to fetch invoices");
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/billing/webhook  — Stripe webhook handler
// MUST use raw body — registered BEFORE express.json()
// ─────────────────────────────────────────────────────────
export const handleWebhook = async (req, res) => {
  const sig     = req.headers["stripe-signature"];
  const rawBody = req.body; // raw Buffer

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // ── Idempotency: skip already-processed events ─────────
  const existing = await BillingEvent.findOne({ stripeEventId: event.id });
  if (existing) {
    console.log(`Duplicate webhook ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  const obj = event.data.object;

  try {
    switch (event.type) {

      // ── Subscription created / updated ──────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const tenant = await Tenant.findOne({ stripeCustomerId: obj.customer });
        if (!tenant) break;

        const priceId = obj.items?.data?.[0]?.price?.id;
        const plan    = planFromPriceId(priceId) || tenant.plan;

        await Tenant.findByIdAndUpdate(tenant._id, {
          plan,
          stripeSubscriptionId: obj.id,
          stripePriceId:        priceId,
          subscriptionStatus:   obj.status,
          currentPeriodEnd:     new Date(obj.current_period_end * 1000),
          cancelAtPeriodEnd:    obj.cancel_at_period_end,
        });
        console.log(`Subscription ${event.type} — tenant ${tenant.slug} → ${plan}`);
        break;
      }

      // ── Subscription deleted (canceled) ─────────────────
      case "customer.subscription.deleted": {
        const tenant = await Tenant.findOne({ stripeCustomerId: obj.customer });
        if (!tenant) break;

        await Tenant.findByIdAndUpdate(tenant._id, {
          plan:                 "free",
          stripeSubscriptionId: null,
          stripePriceId:        null,
          subscriptionStatus:   "canceled",
          cancelAtPeriodEnd:    false,
          currentPeriodEnd:     null,
        });
        console.log(`Subscription canceled — tenant ${tenant.slug} → free`);
        break;
      }

      // ── Invoice paid ─────────────────────────────────────
      case "invoice.payment_succeeded": {
        const tenant = await Tenant.findOne({ stripeCustomerId: obj.customer });
        if (!tenant) break;

        await Invoice.findOneAndUpdate(
          { stripeInvoiceId: obj.id },
          {
            tenantId:        tenant._id,
            stripeInvoiceId: obj.id,
            amountPaid:      obj.amount_paid,
            amountDue:       obj.amount_due,
            currency:        obj.currency,
            status:          obj.status,
            invoiceUrl:      obj.hosted_invoice_url,
            invoicePdf:      obj.invoice_pdf,
            periodStart:     obj.period_start ? new Date(obj.period_start * 1000) : null,
            periodEnd:       obj.period_end   ? new Date(obj.period_end   * 1000) : null,
            plan:            tenant.plan,
            description:     obj.description || `Invoice ${obj.number}`,
          },
          { upsert: true, new: true }
        );
        console.log(`Invoice paid — tenant ${tenant.slug} $${(obj.amount_paid / 100).toFixed(2)}`);
        break;
      }

      // ── Invoice payment failed ────────────────────────────
      case "invoice.payment_failed": {
        const tenant = await Tenant.findOne({ stripeCustomerId: obj.customer });
        if (!tenant) break;
        await Tenant.findByIdAndUpdate(tenant._id, { subscriptionStatus: "past_due" });
        console.warn(`Payment failed — tenant ${tenant.slug}`);
        break;
      }

      // ── Checkout completed ────────────────────────────────
      case "checkout.session.completed": {
        // Subscription state is updated via subscription.created/updated above
        console.log(`Checkout completed — session ${obj.id}`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    // Record the processed event for idempotency
    await BillingEvent.create({
      tenantId:      (await Tenant.findOne({ stripeCustomerId: obj.customer }))?._id || null,
      stripeEventId: event.id,
      type:          event.type,
      payload:       event.data.object,
    });

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
