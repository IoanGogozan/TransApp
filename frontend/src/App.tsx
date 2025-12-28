import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import VehiclesPage from "./pages/VehiclesPage";
import VehiclePage from "./pages/VehiclePage";
import ChecklistPage from "./pages/ChecklistPage";
import ShiftPage from "./pages/ShiftPage";
import TimesheetPage from "./pages/TimesheetPage";
import DefectsListPage from "./pages/DefectsListPage";
import DefectDetailsPage from "./pages/DefectDetailsPage";
import AdminUsersPage from "./pages/AdminUsersPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/driver/vehicles" element={<VehiclesPage />} />
        <Route path="/driver/vehicles/:vehicleId" element={<VehiclePage />} />
        <Route path="/driver/checklist" element={<ChecklistPage />} />
        <Route path="/driver/shift" element={<ShiftPage />} />
        <Route path="/driver/timesheet" element={<TimesheetPage />} />
        <Route
          path="/admin/defects"
          element={
            <AdminRoute>
              <DefectsListPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/defects/:defectId"
          element={
            <AdminRoute>
              <DefectDetailsPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
