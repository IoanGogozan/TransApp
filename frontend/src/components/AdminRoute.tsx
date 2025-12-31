import { ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = {
  children: ReactElement;
};

const AdminRoute = ({ children }: Props) => {
  const { user, loading, error } = useAuth();

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

  return children;
};

export default AdminRoute;
