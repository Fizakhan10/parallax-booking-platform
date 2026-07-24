import { Link } from 'react-router-dom'
import {
  Building2, Shield, Globe, Zap, BarChart3, Server,
  ChevronRight, Check, ArrowRight, Users, Lock,
  Layers, Star, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import styles from './LandingPage.module.css'

const features = [
  {
    icon: Building2,
    title: 'Multi-Tenant Architecture',
    desc: 'Complete tenant isolation using MongoDB RBAC. Every workspace\'s data is completely private and scoped.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    desc: 'JWT auth with refresh token rotation, bcrypt hashing, rate limiting, Helmet.js headers, and CORS.',
  },
  {
    icon: Globe,
    title: 'Subdomain Routing',
    desc: 'Each tenant gets their own subdomain. Automatic tenant detection middleware on every API request.',
  },
  {
    icon: Zap,
    title: 'Instant Onboarding',
    desc: 'Set up your workspace in under 60 seconds. Choose a slug, configure your plan, invite your team.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    desc: 'Real-time stats, team management, and workspace insights — all in a clean responsive interface.',
  },
  {
    icon: Server,
    title: 'Production Ready',
    desc: 'Docker Compose, .env validation with envalid, structured logging, and MERN stack best practices.',
  },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    badge: null,
    desc: 'Perfect to get started',
    features: ['Up to 3 users', '1 workspace', 'Basic analytics', 'Community support'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    badge: 'Most Popular',
    desc: 'For growing teams',
    features: ['Unlimited users', 'Custom subdomain', 'Advanced analytics', 'Priority support', 'Full API access'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    badge: null,
    desc: 'Scale without limits',
    features: ['Everything in Pro', 'Custom domain', 'SSO / SAML', 'SLA guarantee', 'Dedicated support'],
    cta: 'Contact sales',
    highlight: false,
  },
]

const stats = [
  { value: '10,000+', label: 'Active workspaces' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 50ms', label: 'API response time' },
  { value: '256-bit', label: 'AES Encryption' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoMark}>
              <Layers size={18} strokeWidth={2.5} />
            </div>
            TenantHub
          </Link>

          <div className={`${styles.navLinks} ${menuOpen ? styles.navOpen : ''}`}>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
            <div className={styles.navDivider} />
            <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link to="/onboard" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
              Get started
            </Link>
          </div>

          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Star size={12} strokeWidth={2.5} />
            Multi-tenant SaaS — Built on MERN Stack
          </div>

          <h1 className={styles.heroTitle}>
            The platform for
            <br />
            <span className={styles.heroGradient}>multi-tenant SaaS</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Launch isolated, secure, and scalable SaaS products with
            subdomain routing, role-based access control, and production-grade
            authentication — all out of the box.
          </p>

          <div className={styles.heroCtas}>
            <Link to="/onboard" className={`btn btn-primary btn-lg ${styles.heroCtaPrimary}`}>
              Start building free
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign in to workspace
            </Link>
          </div>

          <div className={styles.heroMeta}>
            {['No credit card required', 'Free plan available', 'Deploy in minutes'].map((t) => (
              <span key={t} className={styles.heroMetaItem}>
                <Check size={13} strokeWidth={2.5} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className={styles.heroVisual}>
          <div className={styles.browserMock}>
            <div className={styles.browserBar}>
              <div className={styles.browserDots}>
                <span /><span /><span />
              </div>
              <div className={styles.browserUrl}>
                <Lock size={10} />
                acme.tenanthub.app
              </div>
            </div>
            <div className={styles.browserContent}>
              <div className={styles.mockSidebar}>
                <div className={styles.mockLogo}>TH</div>
                {['Dashboard', 'Users', 'Settings'].map((item, i) => (
                  <div key={item} className={`${styles.mockNavItem} ${i === 0 ? styles.mockNavActive : ''}`}>
                    <div className={styles.mockNavDot} />
                    {item}
                  </div>
                ))}
              </div>
              <div className={styles.mockMain}>
                <div className={styles.mockTopBar}>
                  <div className={styles.mockTitle}>Dashboard</div>
                  <div className={styles.mockAvatar}>JS</div>
                </div>
                <div className={styles.mockCards}>
                  {[
                    { v: '142', l: 'Total Users' },
                    { v: '98%', l: 'Active' },
                    { v: 'Pro', l: 'Plan' },
                  ].map((c) => (
                    <div key={c.l} className={styles.mockCard}>
                      <div className={styles.mockCardVal}>{c.v}</div>
                      <div className={styles.mockCardLabel}>{c.l}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.mockTable}>
                  {[1,2,3].map(i => (
                    <div key={i} className={styles.mockRow}>
                      <div className={styles.mockRowAvatar} />
                      <div className={styles.mockRowLines}>
                        <div className={styles.mockLine} style={{width: `${60+i*10}%`}} />
                        <div className={styles.mockLine} style={{width: `${40+i*5}%`, opacity: 0.4}} />
                      </div>
                      <div className={styles.mockBadge} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.heroGlow} />
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statItem}>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>
            <Layers size={14} />
            Platform Features
          </div>
          <h2 className={styles.sectionTitle}>
            Everything you need to ship
            <br />
            multi-tenant SaaS
          </h2>
          <p className={styles.sectionDesc}>
            Batteries included. Start with a solid foundation and focus on what makes your product unique.
          </p>

          <div className={styles.featuresGrid}>
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.howSection}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>
            <Zap size={14} />
            Quick Start
          </div>
          <h2 className={styles.sectionTitle}>Up and running in 3 steps</h2>

          <div className={styles.stepsGrid}>
            {[
              {
                n: '01',
                title: 'Create your workspace',
                desc: 'Pick a subdomain slug, choose your plan, and your isolated tenant is provisioned instantly.',
              },
              {
                n: '02',
                title: 'Invite your team',
                desc: 'Add members with role-based access. Owners, admins, and members each have scoped permissions.',
              },
              {
                n: '03',
                title: 'Build your product',
                desc: 'Use the dashboard, REST API, or extend the codebase. Your data is always isolated and secure.',
              },
            ].map((s, i) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNumber}>{s.n}</div>
                {i < 2 && <div className={styles.stepConnector} />}
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className={styles.securitySection}>
        <div className={styles.container}>
          <div className={styles.securityGrid}>
            <div className={styles.securityContent}>
              <div className={styles.sectionLabel}>
                <Shield size={14} />
                Security
              </div>
              <h2>Built secure, from the ground up</h2>
              <p>
                Tenant isolation is enforced at every layer — from the database
                to the API to the frontend. No tenant can ever access another's data.
              </p>
              <div className={styles.securityList}>
                {[
                  'MongoDB role-based access control per tenant',
                  'JWT access + refresh token rotation',
                  'bcrypt password hashing (12 rounds)',
                  'Rate limiting & Helmet.js security headers',
                  '.env validation — server won\'t start with missing config',
                  'Unique (tenantId, email) constraint in database',
                ].map((item) => (
                  <div key={item} className={styles.securityItem}>
                    <Check size={15} strokeWidth={2.5} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.securityVisual}>
              <div className={styles.securityCard}>
                <div className={styles.securityCardHeader}>
                  <Shield size={16} />
                  <span>Tenant Isolation</span>
                  <span className="badge badge-green" style={{marginLeft:'auto'}}>Active</span>
                </div>
                <div className={styles.securityCardBody}>
                  {[
                    { label: 'RBAC Middleware', status: 'Enforced' },
                    { label: 'JWT Verification', status: 'Active' },
                    { label: 'Token Rotation', status: 'Enabled' },
                    { label: 'Data Scoping', status: 'Strict' },
                    { label: 'Rate Limiting', status: '100/15min' },
                    { label: 'CORS Policy', status: 'Configured' },
                  ].map(({ label, status }) => (
                    <div key={label} className={styles.securityRow}>
                      <span>{label}</span>
                      <span className="badge badge-green">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>
            <BarChart3 size={14} />
            Pricing
          </div>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionDesc}>Start free. Scale as you grow. No hidden fees.</p>

          <div className={styles.plansGrid}>
            {plans.map((p) => (
              <div key={p.name} className={`${styles.planCard} ${p.highlight ? styles.planHighlight : ''}`}>
                {p.badge && (
                  <div className={styles.planBadge}>
                    <Star size={10} />
                    {p.badge}
                  </div>
                )}
                <div className={styles.planHeader}>
                  <div className={styles.planName}>{p.name}</div>
                  <div className={styles.planDesc}>{p.desc}</div>
                </div>
                <div className={styles.planPrice}>
                  {p.price}
                  <span>{p.period}</span>
                </div>
                <ul className={styles.planFeatures}>
                  {p.features.map((f) => (
                    <li key={f}>
                      <Check size={14} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/onboard"
                  className={`btn btn-block ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p.cta}
                  <ChevronRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <div className={styles.ctaContent}>
              <h2>Ready to build your SaaS?</h2>
              <p>Join thousands of developers launching on TenantHub.</p>
            </div>
            <div className={styles.ctaActions}>
              <Link to="/onboard" className="btn btn-primary btn-lg">
                Create free workspace
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <Link to="/" className={styles.logo} style={{ color: '#fff' }}>
              <div className={styles.logoMark}>
                <Layers size={16} strokeWidth={2.5} />
              </div>
              TenantHub
            </Link>
            <p>Multi-tenant SaaS platform built on MERN stack.</p>
            <p style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--gray-600)' }}>
              Paralax Lab Internship · Week 1
            </p>
          </div>
          <div className={styles.footerLinks}>
            <div>
              <div className={styles.footerLinkTitle}>Product</div>
              <Link to="/onboard">Get Started</Link>
              <Link to="/login">Sign In</Link>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <div className={styles.footerLinkTitle}>Security</div>
              <a href="#security">Overview</a>
              <a href="#features">Features</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2024 TenantHub. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
