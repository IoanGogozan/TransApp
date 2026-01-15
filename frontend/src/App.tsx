import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
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
import DriverTimesheetTodayPage from "./pages/driver/DriverTimesheetTodayPage";
import DriverProfilePage from "./pages/driver/DriverProfilePage";
import DriverDefectsPage from "./pages/driver/DriverDefectsPage";
import DriverDefectDetailsPage from "./pages/driver/DriverDefectDetailsPage";
import DefectsListPage from "./pages/DefectsListPage";
import DefectDetailsPage from "./pages/DefectDetailsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import TimesheetsAdminPage from "./pages/admin/TimesheetsAdminPage";
import RoutesPage from "./pages/admin/RoutesPage";
import AdminHelpPage from "./pages/admin/AdminHelpPage";
import CustomersPage from "./pages/admin/CustomersPage";
import AdminDocumentsPage from "./pages/admin/DocumentsPage";
import DriverDocumentsPage from "./pages/driver/DocumentsPage";
import BillingPage from "./pages/admin/BillingPage";
import VippsReturnPage from "./pages/admin/VippsReturnPage";
import PublicHelpPage from "./pages/PublicHelpPage";
import PublicPrivacyPage from "./pages/PublicPrivacyPage";
import PublicSecurityPage from "./pages/PublicSecurityPage";
import PublicTermsPage from "./pages/PublicTermsPage";
import ScrollToHash from "./components/ScrollToHash";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BackToTopButton from "./components/BackToTopButton";

const AdminAliasRoute = () => {
  const location = useLocation();
  const { companySlug } = useParams();
  const slugPrefix = companySlug ? `/c/${companySlug}` : "";
  const fromPrefix = `${slugPrefix}/admin`;
  const toPrefix = `${slugPrefix}/app/admin`;
  const targetPath = location.pathname.startsWith(fromPrefix)
    ? location.pathname.replace(fromPrefix, toPrefix)
    : location.pathname;
  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
};

function App() {
  return (
    <>
      <ScrollToHash />
      <BackToTopButton />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/help" element={<PublicHelpPage />} />
      <Route path="/privacy" element={<PublicPrivacyPage />} />
      <Route path="/security" element={<PublicSecurityPage />} />
      <Route path="/terms" element={<PublicTermsPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route
          path="app"
          element={
            <AdminRoute>
              <HomePage />
            </AdminRoute>
          }
        />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="driver" element={<Navigate to="driver/timesheet" replace />} />
        <Route
          path="driver/profile"
          element={
            <DriverRoute>
              <DriverProfilePage />
            </DriverRoute>
          }
        />
        <Route
          path="driver/checklist"
          element={
            <DriverRoute>
              <ChecklistPage />
            </DriverRoute>
          }
        />
        <Route
          path="driver/documents"
          element={
            <DriverRoute>
              <DriverDocumentsPage />
            </DriverRoute>
          }
        />
        <Route
          path="driver/defects"
          element={
            <DriverRoute>
              <DriverDefectsPage />
            </DriverRoute>
          }
        />
        <Route
          path="driver/defects/:id"
          element={
            <DriverRoute>
              <DriverDefectDetailsPage />
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
        <Route path="admin/*" element={<AdminAliasRoute />} />
        <Route path="app/admin" element={<Navigate to="app/admin/users" replace />} />
        <Route
          path="app/admin/vehicles"
          element={
            <AdminRoute>
              <VehiclesPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/vehicles/:vehicleId"
          element={
            <AdminRoute>
              <VehiclePage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/defects"
          element={
            <AdminRoute>
              <DefectsListPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/reports"
          element={
            <AdminRoute>
              <AdminReportsPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/routes"
          element={
            <AdminRoute>
              <RoutesPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/documents"
          element={
            <AdminRoute>
              <AdminDocumentsPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/billing"
          element={
            <AdminRoute>
              <BillingPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/customers"
          element={
            <AdminRoute>
              <CustomersPage />
            </AdminRoute>
          }
        />
        <Route
          path="app/admin/timesheets"
          element={
            <AdminRoute>
              <TimesheetsAdminPage />
            </AdminRoute>
          }
        />
        <Route path="app/help" element={<AdminHelpPage />} />
        <Route
          path="app/admin/defects/:defectId"
          element={
            <AdminRoute>
              <DefectDetailsPage />
            </AdminRoute>
          }
        />
        <Route
          path="billing"
          element={
            <AdminRoute>
              <BillingPage />
            </AdminRoute>
          }
        />
        <Route
          path="billing/vipps/return"
          element={
            <AdminRoute>
              <VippsReturnPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="/app" element={<Navigate to="/" replace />} />
      <Route path="/driver/*" element={<Navigate to="/" replace />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
