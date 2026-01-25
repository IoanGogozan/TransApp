import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PublicLayout from "../components/layout/PublicLayout";
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
    <PublicLayout>
      <Card className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
                <div className="flex-1">
                  <SectionHeader title="TransApp" />
                  <p className="mt-2 text-base leading-relaxed text-slate-600">
                    Time tracking, vehicle check-ins, and audit-ready exports for transport companies.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ButtonLink className="w-full sm:w-auto shadow-sm hover:shadow-md" to="/register">
                      Start free trial
                    </ButtonLink>
                    <ButtonLink variant="secondary" className="w-full sm:w-auto" to="/login">
                      Sign in
                    </ButtonLink>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    14-day free trial &bull; No credit card &bull; Fast setup &bull; Low monthly price (eks. mva.)
                  </p>

                  {user && company ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
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
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white text-sm text-slate-500">
              <div className="absolute inset-x-0 top-0 h-10 border-b border-slate-200 bg-white/70" />
              <div className="absolute left-4 top-1/2 flex -translate-y-1/2 gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>
              <div className="absolute left-6 top-16 h-3 w-40 rounded bg-slate-200/70" />
              <div className="absolute left-6 top-22 h-3 w-56 rounded bg-slate-200/70" />
              <div className="absolute left-6 right-6 top-32 h-24 rounded-xl bg-slate-200/40" />
              <div className="relative z-10">Screenshot preview (coming soon)</div>
            </div>
          </div>
        </div>
        </div>
      </Card>

      <Card>
              <h2 className="text-lg font-semibold text-slate-900">Why TransApp</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                      className="h-5 w-5 text-slate-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Driver time entries</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Structured activities: DRIVING, OTHER WORK, BREAK, AVAILABILITY.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                      className="h-5 w-5 text-slate-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 3h2l3 5v6h-2" />
                      <path d="M7 3h7l3 5H7Z" />
                      <path d="M5 9h12v6H5z" />
                      <circle cx="7" cy="17" r="2" />
                      <circle cx="15" cy="17" r="2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Daily vehicle check-in</h3>
                  <p className="mt-2 text-sm text-slate-600">Quick pre-drive check-in, valid ~24 hours.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                      className="h-5 w-5 text-slate-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Admin review &amp; corrections</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Audit-friendly records with corrections in one place.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                      className="h-5 w-5 text-slate-700"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">CSV exports</h3>
                  <p className="mt-2 text-sm text-slate-600">Payroll, billing, and audit-ready exports.</p>
                </div>
              </div>
            </Card>

      <Card id="pricing">
              <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
              <p className="mt-1 text-sm text-slate-600">Billed monthly. Prices are eks. mva.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Basic</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>Up to 5 drivers</li>
                    <li>
                      <span className="text-lg font-bold text-slate-900">299 NOK / month</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Standard</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>Up to 10 drivers</li>
                    <li>Includes up to 2 admins</li>
                    <li>
                      <span className="text-lg font-bold text-slate-900">499 NOK / month</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Pro</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>Up to 20 drivers</li>
                    <li>Includes up to 3 admins</li>
                    <li>
                      <span className="text-lg font-bold text-slate-900">699 NOK / month</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Custom</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    <li>20+ drivers</li>
                    <li>Contact us (coming soon)</li>
                  </ul>
                </div>
              </div>
            </Card>

      <Card>
              <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
              {faqs.map((faq) => (
                <div key={faq.q} className="pt-4 pb-4 first:pt-0 border-t border-slate-200 first:border-t-0">
                  <strong className="block text-sm font-semibold text-slate-900">{faq.q}</strong>
                  <div className="mt-2 text-sm text-slate-600">{faq.a}</div>
                </div>
              ))}
      </Card>

      <Card className="p-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/help">
                  Help
                </Link>
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/privacy">
                  Privacy
                </Link>
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/security">
                  Security
                </Link>
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/terms">
                  Terms
                </Link>
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/login">
                  Sign in
                </Link>
                <Link className="transition-colors hover:text-slate-900 hover:underline" to="/register">
                  Register
                </Link>
              </div>
              <p className="mt-3 mb-0 text-sm text-slate-500">(c) {currentYear} TransApp.</p>
      </Card>
    </PublicLayout>
  );
};

export default LandingPage;





