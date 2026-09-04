// src/pages/access/Dashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ActionCard, type ActionCardProps } from "../../components/ActionCard";

interface UserSession {
  employeeId: number;
  name: string;
  isAdmin: boolean;
}

// 1. EXTRAÍDO: El componente estático debe vivir fuera del Dashboard para no colapsar la memoria
const PromoSection = () => (
  <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-surface-3 bg-surface-1 p-6 text-center shadow-md relative overflow-hidden select-none">
    <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-surface-3/80 p-6 flex flex-col items-center">
      <span className="mb-2 block text-3xl">🏷️</span>
      <div className="inline-block rounded-full bg-surface-3 px-3 py-1 text-xs font-bold text-on-bg/70 uppercase tracking-wider mb-2">
        Módulo En Espera
      </div>
      <h3 className="text-lg font-bold text-on-bg">Espacio para Promociones</h3>
      <p className="mt-1 text-xs text-on-bg/60 max-w-sm">
        Aquí se proyectarán ofertas especiales, listas de precios y avisos de temporada.
      </p>
    </div>
  </section>
);

export function Dashboard() {
  const navigate = useNavigate();
  
  // 2. Estado inicial seguro
  const [session, setSession] = useState<UserSession>({
    employeeId: 0,
    name: "Cargando...",
    isAdmin: false,
  });

  // 3. Lectura asíncrona segura para evitar bloquear el renderizado inicial
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("userSession");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSession({
          employeeId: parsed.employeeId || 0,
          name: parsed.name || "Usuario",
          isAdmin: Boolean(parsed.isAdmin ?? parsed.is_admin ?? false),
        });
      }
    } catch (error) {
      console.error("Error leyendo la sesión:", error);
    }
  }, []);

  const menuActions: (Omit<ActionCardProps, "onClick"> & { route: string; adminOnly?: boolean })[] = [
    { id: "ventas", title: "Realizar Ventas", description: "Cobro ágil en caja", iconBg: "bg-primary/20 text-primary", icon: "🛒", route: "/sells", adminOnly: false },
    { id: "inventario", title: "Control de Inventario", description: "Altas y existencias", iconBg: "bg-secondary/30 text-on-bg", icon: "📦", route: "/inventory", adminOnly: false },
    { id: "historial", title: "Historial de Ventas", description: "Tickets previos", iconBg: "bg-tertiary/25 text-on-bg", icon: "📄", route: "/history", adminOnly: true },
    { id: "corte", title: "Cerrar Caja", description: "Arqueo de turnos", iconBg: "bg-primary/20 text-primary", icon: "🔒", route: "/endTurn", adminOnly: false },
    { id: "personal", title: "Control de Personal", description: "Horarios y permisos", iconBg: "bg-surface-3 text-on-bg", icon: "👥", route: "/employees", adminOnly: true },
    { id: "reportes", title: "Reportes", description: "Balance general", iconBg: "bg-secondary/30 text-on-bg", icon: "📊", route: "/reports", adminOnly: true },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4 lg:p-5 gap-5 text-on-bg z-10"
      initial={{ y: "-100%" }}
      animate={{ y: "0%" }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex items-center justify-between rounded-2xl border border-white/50 bg-surface-1/85 px-5 py-3 shadow-sm backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                Abarrotes Janny
              </span>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-extrabold text-on-bg/70 uppercase">
                {session.isAdmin ? "Administrador" : "Cajero"}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-on-bg lg:text-2xl leading-none mt-0.5">
              ¡Hola, {session.name}! 👋
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-on-bg/80">Turno Activo</span>
        </div>
      </header>

      {session.isAdmin ? (
        <>
          <PromoSection />
          <section className="w-full shrink-0 mt-2">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {menuActions.map(({ route, adminOnly, ...cardProps }) => (
                <ActionCard
                  key={cardProps.id}
                  {...cardProps} // 4. Destructuración segura: pasamos solo lo que ActionCard necesita
                  onClick={() => navigate(route)}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
            <section className="flex flex-col gap-4 w-full lg:w-[280px] shrink-0 h-full">
              <div className="flex flex-col gap-4 flex-1 overflow-hidden pr-1 pb-1">
                {menuActions.filter((a) => !a.adminOnly).map(({ route, adminOnly, ...cardProps }) => (
                  <div key={cardProps.id} className="flex-1 flex">
                    <ActionCard
                      {...cardProps}
                      onClick={() => navigate(route)}
                    />
                  </div>
                ))}
              </div>
            </section>
            
            <PromoSection />
          </div>
        </>
      )}
    </motion.div>
  );
}