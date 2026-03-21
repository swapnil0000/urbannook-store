import { Routes, Route, Navigate } from "react-router-dom";
import AuthGuard from "./components/AuthGuard";
import Layout from "./components/Layout";
import {
  Login,
  Dashboard,
  Products,
  Waitlist,
  Orders,
  Coupons,
  AbandonedCarts,
  Shipments,
  CreateShipment,
  Testimonial,
} from "./pages/index.js";
import { Analytics } from "./pages/Analytics";

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
          <Route path="/admin/testimonials" element={<Testimonial />} />
          <Route path="/admin/abandoned-carts" element={<AbandonedCarts />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/shipments" element={<Shipments />} />
          <Route
            path="/admin/shipment/create/:orderId"
            element={<CreateShipment />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}

export default App;
