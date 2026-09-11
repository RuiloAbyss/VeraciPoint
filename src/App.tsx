import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import bgImage from "./assets/wallpaper-login.jpg";

import { Login } from "./pages/access/Login";
import { Dashboard } from "./pages/access/Dashboard";
import { Inventory } from "./pages/action/Inventory";
import { Sells } from "./pages/action/Sells";
import { History } from "./pages/action/History";
import { Staff } from "./pages/action/Staff";
import { Orders } from "./pages/action/Orders";
import { Reports } from "./pages/action/Reports";
import { ErrorBoundary } from "./components/ErrorBoundary"; 

const PlaceholderView = ({ title }: { title: string }) => (
  <div className="flex h-screen w-full items-center justify-center text-2xl font-bold text-on-bg">
    {title}
  </div>
);

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Actions */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sells" element={<Sells />} />
        <Route path="/history" element={<History />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<PlaceholderView title="404 - Page Not Found" />} />

      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div 
        className="relative min-h-screen w-full overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[3px]" />
        
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>

      </div>
    </BrowserRouter>
  );
}