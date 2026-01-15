import { Link } from "react-router-dom";

const PublicHeader = () => {
  return (
    <header className="public-header">
      <div className="public-header-inner container">
        <Link to="/" className="public-brand">
          TransApp
        </Link>
        <nav className="public-nav">
          <Link to="/#pricing" style={{ textDecoration: "none", color: "#2563eb" }}>
            Pricing
          </Link>
          <Link to="/help" style={{ textDecoration: "none", color: "#2563eb" }}>
            Help
          </Link>
          <Link to="/login" style={{ textDecoration: "none", color: "#2563eb" }}>
            Sign in
          </Link>
          <Link to="/register" style={{ textDecoration: "none", color: "#2563eb" }}>
            Register company
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
