import { Link } from "react-router-dom";
import HelpContent from "../components/HelpContent";
import PublicHeader from "../components/PublicHeader";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const PublicHelpPage = () => {
  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="w-full max-w-3xl">
        <PublicHeader />
        <SectionHeader title="Help" />
        <HelpContent />
        <h3>More</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/security">Security</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </Card>
    </div>
  );
};

export default PublicHelpPage;



