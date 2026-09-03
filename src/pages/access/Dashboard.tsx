// src/pages/access/Dashboard.tsx
import { useState } from "react";
import { ActionCard, type ActionCardProps } from "../../components/ActionCard";

export function Dashboard() {
  const [userName] = useState("Abisai");

  const menuActions: Omit<ActionCardProps, "onClick">[] = [
    {
      id: "ventas",
      title: "Realizar Ventas",
      description: "Cobro ágil en caja y escaneo de productos",
      iconBg: "bg-primary/20 text-primary",
      icon: "🛒",
    },
    {
      id: "inventario",
      title: "Control de Inventario",
      description: "Altas, bajas, existencias y costos",
      iconBg: "bg-secondary/30 text-on-bg",
      icon: "📦",
    },
    {
      id: "historial",
      title: "Historial de Ventas",
      description: "Consultas de tickets y ventas previas",
      iconBg: "bg-tertiary/25 text-on-bg",
      icon: "📄",
    },
    {
      id: "corte",
      title: "Cerrar Caja",
      description: "Arqueo de turnos, efectivo y balances",
      iconBg: "bg-primary/20 text-primary",
      icon: "🔒",
    },
    {
      id: "personal",
      title: "Control de Personal",
      description: "Horarios, permisos y roles de empleados",
      iconBg: "bg-surface-3 text-on-bg",
      icon: "👥",
    },
    {
      id: "reportes",
      title: "Reportes",
      description: "Estadísticas y balance general",
      iconBg: "bg-secondary/30 text-on-bg",
      icon: "📊",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-surface-2 p-6 lg:p-10 text-on-bg">
      {/* 1. Header */}
      <header className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <span className="text-sm font-semibold tracking-wider text-primary uppercase">
            Abarrotes Janny • Punto de Venta
          </span>
          <h1 className="text-3xl font-extrabold text-on-bg lg:text-4xl">
            ¡Hola, {userName}! 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-on-bg/70">Turno Activo</span>
        </div>
      </header>

      {/* 2. Resumen de Ventas */}
      <section className="mb-10 w-full min-h-[260px] lg:min-h-[320px] rounded-3xl border border-surface-3 bg-surface-1 p-8 shadow-sm flex flex-col justify-center items-center text-center">
        <div className="rounded-2xl border-2 border-dashed border-surface-3 p-8 max-w-md w-full">
          <span className="text-3xl block mb-2">📈</span>
          <h3 className="text-lg font-bold text-on-bg">
            Módulo de Resumen de Ventas
          </h3>
          <p className="mt-1 text-sm text-on-bg/60">
            Espacio reservado para gráficas de ingresos diarios, productos más vendidos y métricas en tiempo real.
          </p>
        </div>
      </section>

      {/* Grid de Acciones Rápidas */}
      <section>
        <h2 className="mb-5 text-xl font-bold text-on-bg">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {menuActions.map((action) => (
            <ActionCard
              key={action.id}
              id={action.id}
              title={action.title}
              description={action.description}
              iconBg={action.iconBg}
              icon={action.icon}
              onClick={() => console.log(`Navegando a: ${action.title}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}