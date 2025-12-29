import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getCompanySlug } from "../auth/companySlug";

type Props = {
  children: JSX.Element;
};

const ProtectedRoute = ({ children }: Props) => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const loginPath = (() => {
    const slug = getCompanySlug();
    return slug ? `/c/${slug}/login` : "/login";
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
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

export default ProtectedRoute;
