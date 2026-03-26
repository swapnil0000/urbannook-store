import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { EnvProvider } from "./context/EnvContext";
import { ThemeProvider } from "./context/ThemeContext";
import OrdersSyncProvider from "./providers/OrdersSyncProvider";
import store from "./store/index";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <EnvProvider>
                <OrdersSyncProvider>
                  <App />
                </OrdersSyncProvider>
              </EnvProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
