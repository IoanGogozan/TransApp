import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getCompanySlug, setCompanySlug } from "../auth/companySlug";
import { tenantPath } from "../utils/tenantPath";

type Props = {
  children: JSX.Element;
};

const ProtectedRoute = ({ children }: Props) => {
  const location = useLocation();
  const { user, company, loading } = useAuth();
  const { companySlug } = useParams();
  const loginPath = (() => {
    const slug = getCompanySlug();
    return slug ? `/c/${slug}/login` : "/login";
  })();
  const changePasswordPath = (() => {
    const slug = getCompanySlug();
    return slug ? `/c/${slug}/change-password` : "/change-password";
  })();
  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to={loginPath} replace />;
  const authSlug = company?.slug;
  const storedSlug = getCompanySlug();
  if (authSlug && storedSlug !== authSlug) {
    setCompanySlug(authSlug);
  }

  if (companySlug && authSlug && companySlug !== authSlug) {
    const prefix = `/c/${companySlug}`;
    if (location.pathname.startsWith(prefix)) {
      const remainder = location.pathname.slice(prefix.length);
      const suffix = remainder.startsWith("/") || remainder === "" ? remainder : `/${remainder}`;
      return <Navigate to={`/c/${authSlug}${suffix}${location.search}${location.hash}`} replace />;
    }
  }
  if (user.mustChangePassword && !location.pathname.includes("/change-password")) {
    return <Navigate to={changePasswordPath} replace />;
  }
  const tenantSlug = authSlug || storedSlug || companySlug;
  if (user.role === "DRIVER") {
    if (location.pathname.includes("/app/admin")) {
      return <Navigate to={tenantPath(tenantSlug, "/driver/timesheet")} replace />;
    }
    const appPath = tenantSlug ? `/c/${tenantSlug}/app` : "/app";
    if (location.pathname === appPath) {
      return <Navigate to={tenantPath(tenantSlug, "/driver/profile")} replace />;
    }
  }
  const slug = getCompanySlug();
  if (slug && !location.pathname.startsWith("/c/") && (location.pathname.startsWith("/admin") || location.pathname.startsWith("/driver") || location.pathname === "/app" || location.pathname.startsWith("/change-password"))) {
    return <Navigate to={tenantPath(slug, location.pathname)} replace />;
  }
  return children;
};

export default ProtectedRoute;
