import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { tenantPath } from "../utils/tenantPath";
import Button from "../components/ui/Button";
import ButtonLink from "../components/ui/ButtonLink";
import Card from "../components/ui/Card";
import ListState from "../components/ui/ListState";
import SectionHeader from "../components/ui/SectionHeader";

const HomePage = () => {
  const { user, company, loading, error, logout } = useAuth();
  const { companySlug } = useParams();
  const slug = companySlug || company?.slug;

  const errorMessage = error || (!user || !company ? "Unable to load profile." : null);

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <ListState
          loading={loading}
          hasItems={true}
          errorMessage={errorMessage}
        >
          <SectionHeader
            title="Admin hub"
            subtitle="Manage users, vehicles, routes, customers and timesheets."
          />
          {(user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") && (
            <>
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/users")}>
                    Users
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/vehicles")}>
                    Vehicles
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/routes")}>
                    Routes
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/customers")}>
                    Customers
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/defects")}>
                    Defects
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/timesheets")}>
                    Timesheets
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/admin/reports")}>
                    Reports / Export
                  </ButtonLink>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/app/help")}>
                    Help
                  </ButtonLink>
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <h2 style={{ marginBottom: "8px" }}>Personal</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <ButtonLink variant="secondary" to={tenantPath(slug, "/driver/timesheet")}>
                    My Timesheet
                  </ButtonLink>
                </div>
              </div>
            </>
          )}
        </ListState>
        {errorMessage ? (
          <div style={{ marginTop: "12px" }}>
            <Button onClick={logout}>Go to login</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default HomePage;
