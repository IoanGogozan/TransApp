import { Link } from "react-router-dom";
import HelpContent from "../components/HelpContent";
import PublicHeader from "../components/PublicHeader";

const PublicHelpPage = () => {
  return (
    <div className="page page-top">
      <PublicHeader />
      <div className="card" style={{ maxWidth: 820, width: "100%" }}>
<HelpContent />
        <h3>More</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/security">Security</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </div>
  );
};

export default PublicHelpPage;



