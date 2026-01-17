import HelpContent from "../../components/HelpContent";
import Card from "../../components/ui/Card";
import SectionHeader from "../../components/ui/SectionHeader";

const AdminHelpPage = () => {
  return (
    <div className="min-h-screen flex items-start justify-center p-5">
      <Card className="max-w-3xl w-full">
        <SectionHeader title="Help" />
        <HelpContent />
      </Card>
    </div>
  );
};

export default AdminHelpPage;
