// src/pages/access/Dashboard.tsx
import { useState } from "react";

interface ActionCard {
  id: string;
  title: string;
  description: string;
  iconBg: string;
  // Puedes reemplazar este placeholder por componentes de íconos (como Lucide-React) o etiquetas <img>
  iconPlaceholder: string;
}

export function Dashboard() {
  // Estado local para el nombre del usuario (ideal para conectar a Rust o context de auth más adelante)
  const [userName] = useState("Abisai");

  const menuActions: ActionCard[] = [
    {
      id: "ventas",
      title: "Realizar Ventas",
      description: "Cobro ágil en caja y escaneo de productos",
      iconBg: "bg-primary/20 text-primary",
      iconPlaceholder: "🛒",
    },
    {
      id: "inventario",
      title: "Control de Inventario",
      description: "Altas, bajas, existencias y costos",
      iconBg: "bg-secondary/30 text-on-bg",
      iconPlaceholder: "📦",
    },
    {
      id: "historial",
      title: "Historial de Ventas",
      description: "Consultas de tickets y ventas previas",
      iconBg: "bg-tertiary/25 text-on-bg",
      iconPlaceholder: "📄",
    },
    {
      id: "corte",
      title: "Cerrar Caja",
      description: "Arqueo de turnos, efectivo y balances",
      iconBg: "bg-primary/20 text-primary",
      iconPlaceholder: "🔒",
    },
    {
      id: "personal",
      title: "Control de Personal",
      description: "Horarios, permisos y roles de empleados",
      iconBg: "bg-surface-3 text-on-bg",
      iconPlaceholder: "👥",
    },
    {
      id: "reportes",
      title: "Reportes",
      description: "Estadísticas y balance general",
      iconBg: "bg-secondary/30 text-on-bg",
      iconPlaceholder: "📊",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-surface-2 p-6 lg:p-10 text-on-bg">
      {/* 1. Header: Saludo dinámico y marca */}
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

      {/* 2. Gran contenedor superior reservado para el "Resumen de Ventas" */}
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

      {/* 3. Grid de tarjetas tipo cápsula */}
      <section>
        <h2 className="mb-5 text-xl font-bold text-on-bg">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {menuActions.map((action) => (
            <button
              key={action.id}
              onClick={() => console.log(`Acción seleccionada: ${action.title}`)}
              className="group flex flex-col items-center justify-between rounded-3xl border border-white/60 bg-surface-1 p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 text-center cursor-pointer hover:-translate-y-1.5"
            >
              {/* Espacio superior redondeado para alojar ícono o imagen */}
              <div
                className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${action.iconBg} text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300`}
              >
                {action.iconPlaceholder}
              </div>

              {/* Textos informativos de la cápsula */}
              <div className="flex flex-col flex-grow justify-center">
                <h3 className="text-base font-bold text-on-bg group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="mt-1.5 text-xs text-on-bg/60 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}