import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PublicHeader from "../components/PublicHeader";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const LandingPage = () => {
  const { user, company } = useAuth();
  const identifier = user ? user.email || user.phone || user.username || `User ${user.id}` : null;
  const dashboardPath = user ? "/app" : null;
  const currentYear = new Date().getFullYear();
  const faqs = [
    {
      q: "What happens after the trial ends?",
      a: "To continue using the service, you subscribe to a plan. If you do not subscribe, access will be limited after the trial.",
    },
    {
      q: "Can I change plans later?",
      a: "Yes. You can upgrade or downgrade your plan as your team size changes.",
    },
    {
      q: "Do drivers create their own accounts?",
      a: "No. Drivers are created by admins within your company workspace.",
    },
    {
      q: "What is included in each plan?",
      a: "All plans include driver time entries, daily vehicle check-ins, admin review tools, and CSV exports. The difference is the number of drivers/admins supported.",
    },
  ];

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-3xl">
        <PublicHeader />
        <div className="stack">
          <Card className="w-full">
            <div className="landing-hero">
              <div className="landing-hero-left">
                <SectionHeader title="TransApp" />
                <p className="muted" style={{ fontSize: 16, lineHeight: 1.5 }}>
                  Time tracking, vehicle check-ins, and audit-ready exports for transport companies.
                </p>
                <div className="hero-actions">
                  <ButtonLink className="hero-button" to="/register">
                    Start free trial
                  </ButtonLink>
                  <ButtonLink variant="secondary" className="hero-button" to="/login">
                    Sign in
                  </ButtonLink>
                </div>
                <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
                  14-day free trial &bull; No credit card &bull; Fast setup &bull; Low monthly price (eks. mva.)
                </p>

                {user && company ? (
                  <div className="info" style={{ margin: "12px 0" }}>
                    You're logged in as <strong>{identifier}</strong> in <strong>{company.name}</strong>.{" "}
                    <ButtonLink
                      to={dashboardPath || "/app"}
                      variant="secondary"
                      size="sm"
                      className="w-auto ml-2"
                    >
                      Go to Dashboard
                    </ButtonLink>
                  </div>
                ) : null}
              </div>
              <div className="landing-hero-right">
                <div className="landing-hero-visual">
                  <div className="muted" style={{ fontSize: 14 }}>
                    Screenshot preview (coming soon)
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
          <h2 style={{ marginBottom: 8 }}>Why TransApp</h2>
          <div className="grid grid-2" style={{ marginTop: "12px" }}>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Driver time entries</h3>
              <p className="muted">Structured activities: DRIVING, OTHER WORK, BREAK, AVAILABILITY.</p>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Daily vehicle check-in</h3>
              <p className="muted">Quick pre-drive check-in, valid ~24 hours.</p>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Admin review &amp; corrections</h3>
              <p className="muted">Audit-friendly records with corrections in one place.</p>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>CSV exports</h3>
              <p className="muted">Payroll, billing, and audit-ready exports.</p>
            </div>
          </div>
          </Card>

          <Card id="pricing">
          <h2 style={{ marginBottom: 8 }}>Pricing</h2>
          <p className="muted">Billed monthly. Prices are eks. mva.</p>
          <div className="grid grid-2" style={{ marginTop: "12px" }}>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Basic</h3>
              <ul>
                <li>Up to 5 drivers</li>
                <li>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>299 NOK / month</span>
                </li>
              </ul>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Standard</h3>
              <ul>
                <li>Up to 10 drivers</li>
                <li>Includes up to 2 admins</li>
                <li>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>499 NOK / month</span>
                </li>
              </ul>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Pro</h3>
              <ul>
                <li>Up to 20 drivers</li>
                <li>Includes up to 3 admins</li>
                <li>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>699 NOK / month</span>
                </li>
              </ul>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "12px",
                background: "#fff",
              }}
            >
              <h3>Custom</h3>
              <ul>
                <li>20+ drivers</li>
                <li>Contact us (coming soon)</li>
              </ul>
            </div>
          </div>
          </Card>

          <Card>
          <h2 style={{ marginBottom: 8 }}>FAQ</h2>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ marginTop: "12px" }}>
              <strong>{faq.q}</strong>
              <div className="muted" style={{ marginTop: "4px" }}>
                {faq.a}
              </div>
            </div>
          ))}
          </Card>

          <Card className="p-3">
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link to="/help">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/security">Security</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Register</Link>
          </div>
          <p className="muted" style={{ marginTop: "8px", marginBottom: 0 }}>
            (c) {currentYear} TransApp.
          </p>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default LandingPage;



