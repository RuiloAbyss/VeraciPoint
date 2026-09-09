import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import bgImage from "./assets/wallpaper-login.jpg";

import { Login } from "./pages/access/Login";
import { Dashboard } from "./pages/access/Dashboard";
import { Inventory } from "./pages/action/Inventory";
import { Sells } from "./pages/action/Sells";
import { History } from "./pages/action/History";
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
        
        {/* Componentes Reales Implementados */}
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sells" element={<Sells />} />
        <Route path="/history" element={<History />} />
        {/* Módulos en Espera (Placeholders) */}
        <Route path="/history" element={<PlaceholderView title="Historial de Ventas" />} />
        <Route path="/orders" element={<PlaceholderView title="Orden de Pedido" />} />
        <Route path="/employees" element={<PlaceholderView title="Control de Personal" />} />
        <Route path="/reports" element={<PlaceholderView title="Reportes" />} />
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