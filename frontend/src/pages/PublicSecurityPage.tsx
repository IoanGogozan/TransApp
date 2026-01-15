import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";

const PublicSecurityPage = () => {
  return (
    <div className="page page-top">
      <PublicHeader />
      <div className="card" style={{ maxWidth: 720, width: "100%" }}>
<h1>Security</h1>
        <p className="muted">A short overview of security practices used in TransApp.</p>

        <h2>Access control</h2>
        <ul>
          <li>Authentication required for workspace access</li>
          <li>Role-based access (Admin vs Driver)</li>
          <li>Drivers are created by company admins (no self-signup for drivers)</li>
        </ul>

        <h2>Multi-tenant isolation</h2>
        <ul>
          <li>Data access is scoped to the current company workspace (tenant)</li>
          <li>Admin actions are limited to their own company</li>
        </ul>

        <h2>Payments security</h2>
        <ul>
          <li>Vipps Recurring and Stripe subscriptions</li>
          <li>Only identifiers/status stored where possible</li>
          <li>Verified webhooks and conflict prevention logic</li>
        </ul>

        <h2>Uploads &amp; documents</h2>
        <ul>
          <li>Upload limits and request size limits</li>
          <li>File type/size checks (where implemented)</li>
          <li>Audit-friendly metadata (uploader + timestamps)</li>
        </ul>

        <h2>Operational hardening</h2>
        <ul>
          <li>Rate limiting</li>
          <li>CORS allowlist</li>
          <li>Monitoring and logging for abuse prevention</li>
        </ul>

        <h2>Report a security issue</h2>
        <p>
          Security contact is coming soon. Until then, please use the <Link to="/help">Help</Link> page.
        </p>

        <p className="muted">Last updated: 2026-01-11</p>
      </div>
    </div>
  );
};

export default PublicSecurityPage;



