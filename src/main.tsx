import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppStateProvider } from "./context/AppStateContext";
import { AuthProvider } from "./context/AuthContext";

// Import our global styles
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </AuthProvider>
  </React.StrictMode>
);
