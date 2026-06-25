import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Login from "./components/Login.jsx";
import { AuthProvider, useAuth } from "./store/AuthContext.jsx";
import { PatientProvider } from "./store/PatientContext.jsx";
import "./index.css";

function Root() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-neutral-400 text-sm">Loading…</div>;
  }
  if (!user) return <Login />;
  return (
    <PatientProvider>
      <App />
    </PatientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
