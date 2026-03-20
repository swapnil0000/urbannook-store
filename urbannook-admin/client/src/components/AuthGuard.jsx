import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthGuard() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isAuthenticated && isLoginPage) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
