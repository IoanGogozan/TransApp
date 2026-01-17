const HelpContent = () => {
  return (
    <div>
      <h1>Help & Getting Started</h1>
      <p className="muted">
        Admin-focused guidance for setting up your workspace and managing records. Drivers can find basics below.
      </p>

      <div style={{ marginTop: 16 }}>
        <h2>Quick links</h2>
        <ul className="pill-list">
          <li>
            <a className="pill-link" href="#admin-setup">
              Admin setup checklist
            </a>
          </li>
          <li>
            <a className="pill-link" href="#admin-users">
              Users & drivers
            </a>
          </li>
          <li>
            <a className="pill-link" href="#admin-master-data">
              Vehicles / customers / routes
            </a>
          </li>
          <li>
            <a className="pill-link" href="#admin-review">
              Review & corrections
            </a>
          </li>
          <li>
            <a className="pill-link" href="#admin-exports">
              Exports
            </a>
          </li>
          <li>
            <a className="pill-link" href="#admin-billing">
              Billing
            </a>
          </li>
          <li>
            <a className="pill-link" href="#driver-basics">
              Driver basics
            </a>
          </li>
          <li>
            <a className="pill-link" href="#login-password">
              Login & password
            </a>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-setup" className="scroll-mt-24">Admin: setup checklist</h2>
        <ul>
          <li>Add vehicles</li>
          <li>Create drivers</li>
          <li>Add customers and routes (optional)</li>
          <li>Ask a driver to log a test day</li>
          <li>Review the records and run a test export</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-users" className="scroll-mt-24">Admin: users & drivers</h2>
        <ul>
          <li>Drivers are created by company admins (drivers do not self-register)</li>
          <li>Assign roles (ADMIN or DRIVER)</li>
          <li>Deactivate users when needed</li>
          <li>Reset a user password from Admin → Users</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-master-data" className="scroll-mt-24">Admin: vehicles / customers / routes</h2>
        <ul>
          <li>Create vehicles used by drivers</li>
          <li>Add customers and routes if you use them for billing</li>
          <li>Keep naming consistent for clean exports</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-review" className="scroll-mt-24">Admin: review & corrections</h2>
        <ul>
          <li>Review daily entries submitted by drivers</li>
          <li>Correct records when needed</li>
          <li>Use notes/comments when available to keep changes auditable</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-exports" className="scroll-mt-24">Admin: exports</h2>
        <ul>
          <li>Generate CSV exports for payroll, billing, and audit</li>
          <li>Verify date range and filters</li>
          <li>If something is missing, check the driver's day entries first</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="admin-billing" className="scroll-mt-24">Admin: billing</h2>
        <ul>
          <li>Manage subscription in Admin → Billing</li>
          <li>Plans are billed monthly (prices eks. mva.)</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="driver-basics" className="scroll-mt-24">Driver: basics</h2>
        <ul>
          <li>Log daily work entries (DRIVING / OTHER WORK / BREAK / AVAILABILITY)</li>
          <li>Edit entries for a day and view weekly totals</li>
          <li>Complete daily vehicle check-in before driving</li>
        </ul>
        <hr className="divider" />
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 id="login-password" className="scroll-mt-24">Login & password</h2>
        <ul>
          <li>Company slug is provided by your company admin</li>
          <li>If you cannot sign in, verify the company slug and your credentials</li>
          <li>Drivers: ask your admin to reset your password</li>
          <li>Admins: use "Forgot password" if available, or contact support (coming soon)</li>
        </ul>
      </div>
    </div>
  );
};

export default HelpContent;
