import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";

const PublicPrivacyPage = () => {
  return (
    <div className="page page-top">
      <PublicHeader />
      <div className="card" style={{ maxWidth: 720, width: "100%" }}>
<h1>Privacy</h1>
        <p className="muted">A short plain-language overview of how TransApp processes data.</p>

        <h2>What data we process</h2>
        <ul>
          <li>Account data (name, email, phone, username)</li>
          <li>Company and tenant identifiers (company slug, company settings)</li>
          <li>Work time entries (date, activity type, durations, optional customer/route/vehicle)</li>
          <li>Vehicle check-ins (driver, vehicle, timestamp, answers/notes if any)</li>
          <li>Documents/uploads metadata (file name, type, size, uploader, timestamps)</li>
          <li>Technical logs (timestamps, IP address, user agent) for security and troubleshooting</li>
        </ul>

        <h2>Why we process it</h2>
        <ul>
          <li>Provide the service (time tracking, check-ins, admin review)</li>
          <li>Generate exports (payroll/billing/audit CSV)</li>
          <li>Security and abuse prevention (rate limits, monitoring)</li>
          <li>Support and troubleshooting</li>
        </ul>

        <h2>Payments</h2>
        <p>
          Subscriptions are handled via Vipps Recurring and Stripe. TransApp stores only payment identifiers and
          subscription status where possible. Webhooks are verified to prevent tampering.
        </p>

        <h2>Retention</h2>
        <ul>
          <li>We retain records as required for the service and company audit needs.</li>
          <li>Company admins control operational data (e.g. driver records, exports).</li>
          <li>We may retain logs for security and troubleshooting for a limited period.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Support contact is coming soon. For now, please use the <Link to="/help">Help</Link> page.
        </p>

        <p className="muted">Last updated: 2026-01-11</p>
      </div>
    </div>
  );
};

export default PublicPrivacyPage;



