import { Routes, Route, Navigate } from "react-router-dom";
import Banner from "./components/Banner.jsx";
import NavBar from "./components/NavBar.jsx";
import BedsideDashboard from "./screens/BedsideDashboard.jsx";
import PatientSetup from "./screens/PatientSetup.jsx";
import FeedSetup from "./screens/FeedSetup.jsx";
import InsulinSetup from "./screens/InsulinSetup.jsx";
import AlertsView from "./screens/AlertsView.jsx";
import AuditDashboard from "./screens/AuditDashboard.jsx";

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Banner />
      <div className="flex flex-1 flex-col md:flex-row">
        <NavBar />
        <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/bedside" replace />} />
            <Route path="/bedside" element={<BedsideDashboard />} />
            <Route path="/patient" element={<PatientSetup />} />
            <Route path="/feed" element={<FeedSetup />} />
            <Route path="/insulin" element={<InsulinSetup />} />
            <Route path="/alerts" element={<AlertsView />} />
            <Route path="/audit" element={<AuditDashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}