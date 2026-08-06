import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CreditCard, CheckCircle2, Zap, Building2, Star,
  AlertTriangle, ExternalLink, Download, RefreshCw,
  ShieldCheck, Clock, XCircle, ArrowUpCircle, Sparkles
} from 'lucide-react'
import { billingAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import styles from './BillingPage.module.css'

// ── Plan config (mirrors server) ───────────────────────────
const PLAN_ICONS = {
  free:       <Zap size={18} />,
  starter:    <Star size={18} />,
  pro:        <Sparkles size={18} />,
  enterprise: <Building2 size={18} />,
}

const STATUS_CONFIG = {
  active:     { label: 'Active',     badge: 'badge-green',  icon: <CheckCircle2 size={13} /> },
  trialing:   { label: 'Trial',      badge: 'badge-blue',   icon: <Clock size={13} /> },
  past_due:   { label: 'Past Due',   badge: 'badge-red',    icon: <AlertTriangle size={13} /> },
  canceled:   { label: 'Canceled',   badge: 'badge-gray',   icon: <XCircle size={13} /> },
  incomplete: { label: 'Incomplete', badge: 'badge-yellow', icon: <AlertTriangle size={13} /> },
  none:       { label: 'Free Plan',  badge: 'badge-gray',   icon: <Zap size={13} /> },
}

const fmtCurrency = (cents, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function BillingPage() {
  const { tenant, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [plans, setPlans]         = useState([])
  const [status, setStatus]       = useState(null)
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // plan id or 'cancel'/'reactivate'/'portal'

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, statusRes, invoicesRes] = await Promise.all([
        billingAPI.plans(),
        billingAPI.status(),
        billingAPI.invoices(),
      ])
      setPlans(plansRes.data.data.plans)
      setStatus(statusRes.data.data)
      setInvoices(invoicesRes.data.data.invoices)
    } catch (err) {
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Handle Stripe redirect callbacks
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Your plan will update shortly.')
      setSearchParams({})
      setTimeout(loadAll, 3000) // allow webhook to process
    }
    if (searchParams.get('canceled') === 'true') {
      toast('Checkout canceled — no charge was made.', { icon: 'ℹ️' })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, loadAll])

  const handleSubscribe = async (planId) => {
    if (planId === 'free') return
    setActionLoading(planId)
    try {
      const { data } = await billingAPI.checkout(planId)
      window.location.href = data.data.url
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start checkout'
      toast.error(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePortal = async () => {
    setActionLoading('portal')
    try {
      const { data } = await billingAPI.portal()
      window.open(data.data.url, '_blank')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open billing portal')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return
    setActionLoading('cancel')
    try {
      await billingAPI.cancel()
      toast.success('Subscription will cancel at period end')
      await loadAll()
    } catch { toast.error('Failed to cancel subscription') }
    finally { setActionLoading(null) }
  }

  const handleReactivate = async () => {
    setActionLoading('reactivate')
    try {
      await billingAPI.reactivate()
      toast.success('Subscription reactivated!')
      await loadAll()
    } catch { toast.error('Failed to reactivate subscription') }
    finally { setActionLoading(null) }
  }

  const currentPlan = status?.plan || tenant?.plan || 'free'
  const isActive    = status?.subscriptionStatus === 'active' || status?.subscriptionStatus === 'trialing'

  if (loading) return (
    <div className={styles.loadingPage}><div className="spinner spinner-lg" /></div>
  )

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Billing & Plans</h1>
          <p className={styles.pageSubtitle}>Manage your subscription, invoices, and payment methods</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAll}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Current plan card ── */}
      <div className={styles.currentPlanCard}>
        <div className={styles.currentPlanLeft}>
          <div className={styles.currentPlanIcon}>
            {PLAN_ICONS[currentPlan] || <CreditCard size={18} />}
          </div>
          <div>
            <div className={styles.currentPlanName}>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
            </div>
            <div className={styles.currentPlanMeta}>
              {status?.subscriptionStatus && (
                <span className={`badge ${STATUS_CONFIG[status.subscriptionStatus]?.badge || 'badge-gray'}`}>
                  {STATUS_CONFIG[status.subscriptionStatus]?.icon}
                  {STATUS_CONFIG[status.subscriptionStatus]?.label}
                </span>
              )}
              {status?.currentPeriodEnd && isActive && (
                <span className={styles.renewalDate}>
                  <Clock size={12} />
                  {status.cancelAtPeriodEnd ? 'Access until' : 'Renews'} {fmtDate(status.currentPeriodEnd)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.currentPlanActions}>
          {status?.cancelAtPeriodEnd && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleReactivate}
              disabled={actionLoading === 'reactivate'}
            >
              {actionLoading === 'reactivate'
                ? <><span className="spinner spinner-sm" /> Reactivating…</>
                : <><ArrowUpCircle size={14} /> Reactivate</>
              }
            </button>
          )}
          {isActive && !status.cancelAtPeriodEnd && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
            >
              {actionLoading === 'cancel'
                ? <><span className="spinner spinner-sm" /> Canceling…</>
                : 'Cancel plan'
              }
            </button>
          )}
          {status?.stripeCustomerId && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePortal}
              disabled={actionLoading === 'portal'}
            >
              {actionLoading === 'portal'
                ? <><span className="spinner spinner-sm" /> Opening…</>
                : <><ExternalLink size={14} /> Manage billing</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Past due warning */}
      {status?.subscriptionStatus === 'past_due' && (
        <div className="alert alert-error">
          <AlertTriangle size={16} />
          Your payment is past due. Please update your payment method to avoid service interruption.
          <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={handlePortal}>
            Update payment
          </button>
        </div>
      )}

      {/* Cancellation notice */}
      {status?.cancelAtPeriodEnd && status?.currentPeriodEnd && (
        <div className="alert alert-warning">
          <AlertTriangle size={16} />
          Your subscription is set to cancel on {fmtDate(status.currentPeriodEnd)}. After that your workspace moves to the Free plan.
        </div>
      )}

      {/* ── Plans grid ── */}
      <div className={styles.plansSection}>
        <h2 className={styles.sectionTitle}>Choose a plan</h2>
        <div className={styles.plansGrid}>
          {plans.map((plan) => {
            const isCurrent   = plan.id === currentPlan
            const isProcessing = actionLoading === plan.id

            return (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.highlighted ? styles.planHighlighted : ''} ${isCurrent ? styles.planCurrent : ''}`}
              >
                {plan.highlighted && (
                  <div className={styles.popularBadge}>
                    <Star size={10} /> Most Popular
                  </div>
                )}
                {isCurrent && !plan.highlighted && (
                  <div className={styles.currentBadge}>Current plan</div>
                )}

                <div className={styles.planHeader}>
                  <div className={styles.planIcon}>{PLAN_ICONS[plan.id]}</div>
                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.planDesc}>{plan.description}</div>
                </div>

                <div className={styles.planPricing}>
                  <span className={styles.planPrice}>{plan.priceDisplay}</span>
                  <span className={styles.planPeriod}>{plan.period}</span>
                </div>

                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`btn btn-block ${plan.highlighted && !isCurrent ? 'btn-primary' : 'btn-secondary'} ${isCurrent ? styles.currentBtn : ''}`}
                  onClick={() => !isCurrent && handleSubscribe(plan.id)}
                  disabled={isCurrent || plan.id === 'free' || isProcessing || !!actionLoading}
                >
                  {isProcessing
                    ? <><span className="spinner spinner-sm" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Redirecting…</>
                    : isCurrent
                      ? <><CheckCircle2 size={14} /> Current plan</>
                      : plan.id === 'free'
                        ? 'Free forever'
                        : plan.price > (plans.find(p => p.id === currentPlan)?.price || 0)
                          ? <><ArrowUpCircle size={14} /> Upgrade</>
                          : 'Downgrade'
                  }
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Security note ── */}
      <div className={styles.securityNote}>
        <ShieldCheck size={15} />
        Payments are processed securely by Stripe. We never store your card details.
      </div>

      {/* ── Invoice history ── */}
      <div className={styles.invoicesSection}>
        <h2 className={styles.sectionTitle}>Invoice History</h2>

        {invoices.length === 0 ? (
          <div className={styles.emptyInvoices}>
            <CreditCard size={40} strokeWidth={1} />
            <p>No invoices yet. They will appear here after your first payment.</p>
          </div>
        ) : (
          <div className={styles.invoiceTable}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id || inv.stripeInvoiceId}>
                      <td>{fmtDate(inv.createdAt)}</td>
                      <td className={styles.invoiceDesc}>{inv.description || `Invoice`}</td>
                      <td>
                        <span className="badge badge-purple">
                          {inv.plan || '—'}
                        </span>
                      </td>
                      <td className={styles.invoiceAmount}>
                        {fmtCurrency(inv.amountPaid, inv.currency)}
                      </td>
                      <td>
                        <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.invoiceActions}>
                          {inv.invoiceUrl && (
                            <a
                              href={inv.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs"
                            >
                              <ExternalLink size={12} /> View
                            </a>
                          )}
                          {inv.invoicePdf && (
                            <a
                              href={inv.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs"
                            >
                              <Download size={12} /> PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
