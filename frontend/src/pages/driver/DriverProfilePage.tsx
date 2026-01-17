import { useAuth } from "../../auth/AuthContext";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

const DriverProfilePage = () => {
  const { user, company, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <p>Loading profile...</p>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-start justify-center p-5">
        <Card>
          <div className="error">{error || "Unable to load profile."}</div>
        </Card>
      </div>
    );
  }

  const userName = (user as { name?: string; fullName?: string }).name || (user as { fullName?: string }).fullName;
  const displayName = userName || user.username || null;

  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card>
        <SectionHeader title="My profile" />
        <div style={{ display: "grid", gap: "12px" }}>
          {displayName ? (
            <div>
              <div className="muted">Full name</div>
              <div>{displayName}</div>
            </div>
          ) : null}
          {user.phone ? (
            <div>
              <div className="muted">Phone</div>
              <div>{user.phone}</div>
            </div>
          ) : null}
          {company?.name || company?.slug ? (
            <div>
              <div className="muted">Company</div>
              <div>
                {company.name}
                {company.slug ? ` (${company.slug})` : ""}
              </div>
            </div>
          ) : null}
          {user.role ? (
            <div>
              <div className="muted">Role</div>
              <div>{user.role}</div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};

export default DriverProfilePage;
