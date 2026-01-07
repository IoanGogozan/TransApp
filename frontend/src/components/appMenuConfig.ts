export type AppMenuItem = { label: string; path: string };

export const adminMenuItems: AppMenuItem[] = [
  { label: "Dashboard", path: "/app" },
  { label: "Users", path: "/app/admin/users" },
  { label: "Vehicles", path: "/app/admin/vehicles" },
  { label: "Routes", path: "/app/admin/routes" },
  { label: "Customers", path: "/app/admin/customers" },
  { label: "Defects", path: "/app/admin/defects" },
  { label: "Timesheets", path: "/app/admin/timesheets" },
  { label: "Documents", path: "/app/admin/documents" },
  { label: "Billing", path: "/app/admin/billing" },
  { label: "Reports / Export", path: "/app/admin/reports" },
  { label: "Help", path: "/app/help" },
];

export const driverMenuItems: AppMenuItem[] = [
  { label: "Timesheet", path: "/driver/timesheet" },
  { label: "Documents", path: "/driver/documents" },
];
