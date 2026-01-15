import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";

const PublicTermsPage = () => {
  return (
    <div className="page page-top">
      <PublicHeader />
      <div className="card" style={{ maxWidth: 720, width: "100%" }}>
<h1>Terms of Service</h1>
        <p className="muted">
          These terms govern the use of TransApp. By registering a company or using the service, you agree to these terms.
        </p>

        <h2>Using TransApp</h2>
        <p>
          TransApp is a multi-tenant web application for Norwegian transport companies for time tracking, vehicle check-ins,
          and admin review/exports.
        </p>

        <h2>Accounts and roles</h2>
        <ul>
          <li>Company admins manage users, drivers, vehicles, customers, routes, and documents.</li>
          <li>Drivers are created by company admins (drivers do not self-register).</li>
          <li>You are responsible for keeping login credentials secure and for actions taken in your workspace.</li>
        </ul>

        <h2>Subscription, trial and billing</h2>
        <ul>
          <li>14-day free trial is available for new company registrations.</li>
          <li>No credit card is required to start the trial.</li>
          <li>Paid subscriptions are billed monthly.</li>
          <li>Payments are processed via Vipps Recurring and Stripe.</li>
        </ul>

        <h2>Grace period</h2>
        <p>
          After a subscription ends or payment fails, TransApp provides a 7-day grace period to resolve billing and keep
          access to the workspace.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>Do not misuse the service or attempt to access other companies’ data.</li>
          <li>Do not upload malicious files or content.</li>
          <li>Do not overload the service (abuse protection such as rate limits may apply).</li>
        </ul>

        <h2>Data, documents and exports</h2>
        <ul>
          <li>Your company is responsible for the accuracy of data entered (time entries, check-ins, and records).</li>
          <li>
            Documents/uploads are provided by your company users; you should avoid uploading sensitive data unless
            necessary for operations.
          </li>
          <li>Exports are provided “as-is” to support payroll, billing, and audit workflows.</li>
        </ul>

        <h2>Availability and changes</h2>
        <p>We work to keep the service available and improve it over time. Features and limits may change as we evolve the product.</p>

        <h2>Termination</h2>
        <ul>
          <li>You may stop using the service at any time.</li>
          <li>We may suspend access in cases of abuse, security risks, or non-payment.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Support contact is coming soon. For now, please see the <Link to="/help">Help &amp; Getting Started</Link> page.
        </p>

        <p className="muted">Last updated: 2026-01-11</p>
      </div>
    </div>
  );
};

export default PublicTermsPage;



