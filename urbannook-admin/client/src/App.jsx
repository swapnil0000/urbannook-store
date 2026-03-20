import { Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Waitlist from "./pages/Waitlist";
import Orders from "./pages/Orders";
import Coupons from "./pages/Coupons";
import Shipments from "./pages/Shipments";
import CreateShipment from "./pages/CreateShipment";

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
          <Route path="/admin/coupons" element={<Coupons />} />
          <Route path="/admin/shipments" element={<Shipments />} />
          <Route path="/admin/shipment/create/:orderId" element={<CreateShipment />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
