import { Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Waitlist from "./pages/Waitlist";
import Orders from "./pages/Orders";

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/waitlist" element={<Waitlist />} />
          <Route path="/admin/orders" element={<Orders />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
