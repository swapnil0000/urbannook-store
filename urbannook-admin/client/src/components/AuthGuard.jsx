import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCookies } from "react-cookie";

export default function AuthGuard() {
  const [cookies] = useCookies(["adminAccessToken"]);
  const location = useLocation();
  const isAuthenticated = !!cookies.adminAccessToken;
  const isLoginPage = location.pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isAuthenticated && isLoginPage) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
