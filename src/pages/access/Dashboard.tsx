// src/pages/access/Dashboard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ActionCard, type ActionCardProps } from "../../components/ActionCard";

export function Dashboard() {
  const [userName] = useState("Abisai");
  const navigate = useNavigate();

  const menuActions: (Omit<ActionCardProps, "onClick"> & { route: string })[] = [
    { id: "ventas", title: "Realizar Ventas", description: "Cobro ágil en caja", iconBg: "bg-primary/20 text-primary", icon: "🛒", route: "/sells" },
    { id: "inventario", title: "Control de Inventario", description: "Altas, bajas y existencias", iconBg: "bg-secondary/30 text-on-bg", icon: "📦", route: "/inventory" },
    { id: "historial", title: "Historial de Ventas", description: "Consultas de tickets", iconBg: "bg-tertiary/25 text-on-bg", icon: "📄", route: "/history" },
    { id: "corte", title: "Cerrar Caja", description: "Arqueo de turnos", iconBg: "bg-primary/20 text-primary", icon: "🔒", route: "/endTurn" },
    { id: "personal", title: "Control de Personal", description: "Horarios y permisos", iconBg: "bg-surface-3 text-on-bg", icon: "👥", route: "/employees" },
    { id: "reportes", title: "Reportes", description: "Balance general", iconBg: "bg-secondary/30 text-on-bg", icon: "📊", route: "/reports" },
  ];

  return (
    <motion.div
      // absolute inset-0 es clave para que se encime perfectamente con Inventario durante la animación
      className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4 lg:p-5 gap-5 text-on-bg z-10"
      initial={{ y: "-100%" }} // Viene de arriba al volver
      animate={{ y: "0%" }}    // Posición central
      exit={{ y: "-100%" }}    // Se va hacia arriba al hacer clic
      transition={{ 
        duration: 0.28, 
        ease: [0.16, 1, 0.3, 1] // Curva easeOutExpo 
      }}
    >
      <header className="flex items-center justify-between rounded-2xl border border-white/50 bg-surface-1/85 px-5 py-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Abarrotes Janny • Punto de Venta
            </span>
            <h1 className="text-xl font-extrabold text-on-bg lg:text-2xl leading-none mt-0.5">
              ¡Hola, {userName}! 👋
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-on-bg/80">Turno Activo</span>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-surface-3 bg-surface-1 p-6 text-center shadow-md relative overflow-hidden select-none">
        <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-surface-3/80 p-6 flex flex-col items-center">
          <span className="mb-2 block text-3xl">🏷️</span>
          <div className="inline-block rounded-full bg-surface-3 px-3 py-1 text-xs font-bold text-on-bg/70 uppercase tracking-wider mb-2">
            Próximamente • Módulo Inhabilitado
          </div>
          <h3 className="text-lg font-bold text-on-bg">
            Espacio para Promociones y Avisos
          </h3>
          <p className="mt-1 text-xs text-on-bg/60 max-w-sm">
            Aquí se proyectarán ofertas especiales, listas de precios y avisos de temporada para los operadores.
          </p>
        </div>
      </section>

      <section className="w-full">
        <h2 className="mb-3 text-sm font-extrabold text-on-bg uppercase tracking-wider">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {menuActions.map((action) => (
            <ActionCard
              key={action.id}
              {...action}
              onClick={() => navigate(action.route)} // Navegación instantánea
            />
          ))}
        </div>
      </section>
    </motion.div>
  );
}