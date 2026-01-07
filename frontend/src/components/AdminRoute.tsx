import { ReactElement, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  children: ReactElement;
};

const AdminRoute = ({ children }: Props) => {
  const { user, loading, error } = useAuth();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug?: string }>();
  const [subscriptionInactive, setSubscriptionInactive] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string | null }>).detail;
      setSubscriptionInactive(detail?.status ?? null);
    };
    window.addEventListener("subscription-inactive", handler);
    return () => window.removeEventListener("subscription-inactive", handler);
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="card">
          <div className="error">{error || "Unable to load user"}</div>
          <Link className="button" to="/" style={{ width: "auto" }}>
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "PLATFORM_ADMIN") {
    return (
      <div className="page">
        <div className="card">
          <div className="error">Not authorized</div>
          <Link className="button" to="/" style={{ width: "auto" }}>
            Go to home
          </Link>
        </div>
      </div>
    );
  }

  if (subscriptionInactive) {
    const slug = companySlug || "";
    const billingPath = slug ? `/c/${slug}/app/admin/billing` : "/billing";
    const altBillingPath = slug ? `/c/${slug}/billing` : "/billing";
    const changePasswordPath = slug ? `/c/${slug}/change-password` : "/change-password";
    const profilePath = slug ? `/c/${slug}/driver/profile` : "/driver/profile";
    const appProfilePath = slug ? `/c/${slug}/app/profile` : "/app/profile";

    const currentPath = location.pathname;
    const isAllowed =
      currentPath === billingPath ||
      currentPath === altBillingPath ||
      currentPath === changePasswordPath ||
      currentPath === profilePath ||
      currentPath === appProfilePath ||
      currentPath.startsWith(`${billingPath}/`);

    if (!isAllowed && currentPath.startsWith(`/c/${slug}/app/admin`)) {
      return <Navigate to={billingPath} replace />;
    }
  }

  return children;
};

export default AdminRoute;
