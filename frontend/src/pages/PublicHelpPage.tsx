import { Link } from "react-router-dom";
import HelpContent from "../components/HelpContent";
import PublicHeader from "../components/PublicHeader";
import Card from "../components/ui/Card";
import SectionHeader from "../components/ui/SectionHeader";

const PublicHelpPage = () => {
  return (
    <div className="min-h-screen w-full px-3 py-4 sm:px-6 sm:py-6">
      <style>
        {`
          .help-content h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .help-content p {
            margin-top: 4px;
            font-size: 0.875rem;
            color: #475569;
            line-height: 1.5;
          }
          .help-content h2 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #0f172a;
            margin: 0;
          }
          .help-content > div {
            margin-top: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: rgba(248, 250, 252, 0.3);
            padding: 16px;
          }
          .help-content ul {
            margin-top: 8px;
            padding-left: 18px;
            font-size: 0.875rem;
            color: #334155;
            line-height: 1.5;
          }
          .help-content .pill-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            list-style: none;
            padding-left: 0;
            margin: 8px 0 0;
          }
          .help-content .pill-link {
            display: inline-flex;
            align-items: center;
            border: 1px solid #e2e8f0;
            border-radius: 9999px;
            background: #fff;
            padding: 4px 12px;
            font-size: 0.875rem;
            color: #0f172a;
            text-decoration: none;
          }
          .help-content .pill-link:hover {
            background: #f8fafc;
          }
          .help-content .divider {
            border: 0;
            border-top: 1px solid #e2e8f0;
            margin: 12px 0 0;
          }
        `}
      </style>
      <div className="mx-auto w-full max-w-6xl">
        <Card className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <PublicHeader />
          <SectionHeader title="Help" />
          <div className="help-content">
            <HelpContent />
          </div>
          <h3 className="mt-6 text-sm font-semibold text-slate-900">More</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
              to="/privacy"
            >
              Privacy
            </Link>
            <Link
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
              to="/security"
            >
              Security
            </Link>
            <Link
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 hover:bg-slate-50"
              to="/terms"
            >
              Terms
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicHelpPage;



