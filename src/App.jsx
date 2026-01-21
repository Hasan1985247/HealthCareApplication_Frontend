import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./components/Login";
import Register from "./components/Register";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import Unauthorized from "./components/Unauthorized";
import Home from "./components/Home";
import RequireAuth from "./components/RequireAuth";
import GlobalStyle from "./styles/GlobalStyle";
import Availability from "./components/Availabilty";
import Hub from "./components/Hub";
import Appointment from "./components/Appointment";

// AuthProvider must wrap Router to ensure auth state is available to all routes
function App() {
  return (
    <AuthProvider>
      <GlobalStyle />
      <div className="content">
        <Router>
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes - require authentication and specific roles */}
            <Route
              path="/user/dashboard"
              element={
                <RequireAuth allowedRoles={["PATIENT"]}>
                  <UserDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/provider/availability"
              element={
                <RequireAuth allowedRoles={["PROVIDER", "ADMIN"]}>
                  <Availability />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAuth allowedRoles={["ADMIN"]}>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/hub"
              element={
                <RequireAuth allowedRoles={["PATIENT", "PROVIDER", "ADMIN"]}>
                  <Hub />
                </RequireAuth>
              }
            />
            <Route
              path="/appointment"
              element={
                <RequireAuth allowedRoles={["PATIENT", "PROVIDER", "ADMIN"]}>
                  <Appointment />
                </RequireAuth>
              }
            />

            {/* Fallback route - redirects unknown paths to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
