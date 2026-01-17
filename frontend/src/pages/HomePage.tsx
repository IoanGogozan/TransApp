import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { tenantPath } from "../utils/tenantPath";
import Button from "../components/ui/Button";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import ListState from "../components/ui/ListState";

const HomePage = () => {
  const { user, company, loading, error, logout } = useAuth();
  const { companySlug } = useParams();
  const slug = companySlug || company?.slug;

  const errorMessage = error || (!user || !company ? "Unable to load profile." : null);
  const navButtonClass =
    "w-full justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 " +
    "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <ListState
            loading={loading}
            hasItems={true}
            errorMessage={errorMessage}
          >
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Admin hub</h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage users, vehicles, routes, customers and timesheets.
              </p>
            </div>
          {(user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") && (
            <>
              <div className="mt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/users")}>
                    Users
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/vehicles")}>
                    Vehicles
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/routes")}>
                    Routes
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/customers")}>
                    Customers
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/defects")}>
                    Defects
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/timesheets")}>
                    Timesheets
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/admin/reports")}>
                    Reports / Export
                  </ButtonLink>
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/app/help")}>
                    Help
                  </ButtonLink>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-semibold text-slate-900">Personal</h2>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ButtonLink className={navButtonClass} variant="secondary" to={tenantPath(slug, "/driver/timesheet")}>
                    My Timesheet
                  </ButtonLink>
                </div>
              </div>
            </>
          )}
          </ListState>
          {errorMessage ? (
            <div className="mt-3">
              <Button onClick={logout}>Go to login</Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
