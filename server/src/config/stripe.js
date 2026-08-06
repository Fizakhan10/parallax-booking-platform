import Stripe from "stripe";
import env from "./env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  appInfo: { name: "TenantHub", version: "1.0.0" },
});

export default stripe;

// ── Plan → Price ID mapping ────────────────────────────────
export const PLAN_PRICE_MAP = {
  starter:    env.STRIPE_PRICE_STARTER,
  pro:        env.STRIPE_PRICE_PRO,
  enterprise: env.STRIPE_PRICE_ENTERPRISE,
};

// ── Plan metadata (for UI) ─────────────────────────────────
export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceDisplay: "$0",
    period: "/month",
    description: "For individuals getting started",
    features: [
      "Up to 3 users",
      "50 bookings/month",
      "Basic analytics",
      "Email support",
    ],
    highlighted: false,
    stripePriceId: null,
  },
  {
    id: "starter",
    name: "Starter",
    price: 9,
    priceDisplay: "$9",
    period: "/month",
    description: "For small teams",
    features: [
      "Up to 10 users",
      "500 bookings/month",
      "Advanced analytics",
      "Priority email support",
      "Calendar integrations",
    ],
    highlighted: false,
    stripePriceId: env.STRIPE_PRICE_STARTER,
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    priceDisplay: "$29",
    period: "/month",
    description: "For growing businesses",
    features: [
      "Unlimited users",
      "Unlimited bookings",
      "Custom subdomain",
      "API access",
      "Priority support",
      "Advanced reporting",
    ],
    highlighted: true,
    stripePriceId: env.STRIPE_PRICE_PRO,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    priceDisplay: "$99",
    period: "/month",
    description: "For large organisations",
    features: [
      "Everything in Pro",
      "Custom domain",
      "SSO / SAML",
      "SLA guarantee",
      "Dedicated account manager",
      "Custom integrations",
    ],
    highlighted: false,
    stripePriceId: env.STRIPE_PRICE_ENTERPRISE,
  },
];
