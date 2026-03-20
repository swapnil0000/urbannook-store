import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { EnvProvider } from "./context/EnvContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <CookiesProvider>
        <ToastProvider>
          <AuthProvider>
            <EnvProvider>
              <App />
            </EnvProvider>
          </AuthProvider>
        </ToastProvider>
      </CookiesProvider>
    </BrowserRouter>
  </StrictMode>
);
