import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import DriverRoute from "./components/DriverRoute";
import AppLayout from "./layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import RegisterCompanyPage from "./pages/RegisterCompanyPage";
import LoginPage from "./pages/LoginPage";
import LoginLandingPage from "./pages/LoginLandingPage";
import HomePage from "./pages/HomePage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import ChecklistPage from "./pages/ChecklistPage";
import TimesheetTodayPage from "./pages/driver/TimesheetTodayPage";
import DriverTimesheetTodayPage from "./pages/driver/DriverTimesheetTodayPage";
import DefectsListPage from "./pages/DefectsListPage";
import DefectDetailsPage from "./pages/DefectDetailsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import TimesheetsAdminPage from "./pages/admin/TimesheetsAdminPage";
import RoutesPage from "./pages/admin/RoutesPage";
import AdminHelpPage from "./pages/admin/AdminHelpPage";
import CustomersPage from "./pages/admin/CustomersPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterCompanyPage />} />
      <Route path="/login" element={<LoginLandingPage />} />
      <Route path="/c/:companySlug/login" element={<LoginPage />} />
      <Route
        path="/c/:companySlug"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="app" element={<HomePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="admin" element={<Navigate to="admin/users" replace />} />
        <Route path="driver" element={<Navigate to="driver/timesheet" replace />} />
        <Route
          path="driver/checklist"
          element={
            <DriverRoute>
              <ChecklistPage />
            </DriverRoute>
          }
        />
        <Route
          path="driver/timesheet"
          element={
            <DriverRoute>
              <DriverTimesheetTodayPage />
            </DriverRoute>
          }
        />
        <Route
          path="admin/vehicles"
          element={
            <AdminRoute>
              <VehiclesPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/vehicles/:vehicleId"
          element={
            <AdminRoute>
              <VehiclePage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/defects"
          element={
            <AdminRoute>
              <DefectsListPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/reports"
          element={
            <AdminRoute>
              <AdminReportsPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/routes"
          element={
            <AdminRoute>
              <RoutesPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/customers"
          element={
            <AdminRoute>
              <CustomersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/timesheets"
          element={
            <AdminRoute>
              <TimesheetsAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/help"
          element={
            <AdminRoute>
              <AdminHelpPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/defects/:defectId"
          element={
            <AdminRoute>
              <DefectDetailsPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="/app" element={<Navigate to="/" replace />} />
      <Route path="/driver/*" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
