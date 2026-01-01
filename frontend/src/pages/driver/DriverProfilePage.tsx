import { useAuth } from "../../auth/AuthContext";

const DriverProfilePage = () => {
  const { user, company, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error || "Unable to load profile."}</div>
        </div>
      </div>
    );
  }

  const userName = (user as { name?: string; fullName?: string }).name || (user as { fullName?: string }).fullName;
  const displayName = userName || user.username || null;

  return (
    <div className="page">
      <div className="card">
        <h1>My profile</h1>
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
      </div>
    </div>
  );
};

export default DriverProfilePage;
