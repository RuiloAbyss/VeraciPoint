import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ActionCard, type ActionCardProps } from "../../components/ActionCard";
import { checkActiveTurn, openTurn, closeTurn } from "../../services/turnService";

interface UserSession {
  employeeId: number;
  name: string;
  isAdmin: boolean;
  activeTurnId?: number | null;
}

const PromoSection = () => (
  <section className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-gray-300/60 bg-gray-100/85 p-6 text-center shadow-md relative overflow-hidden select-none backdrop-blur-md">
    <div className="w-full max-w-md rounded-2xl border-2 border-dashed border-gray-400/50 p-6 flex flex-col items-center">
      <span className="mb-2 block text-3xl">🏷️</span>
      <div className="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border border-gray-300/50">
        Módulo En Espera
      </div>
      <h3 className="text-lg font-bold text-gray-900">Espacio para Promociones</h3>
      <p className="mt-1 text-xs text-gray-500 max-w-sm">
        Aquí se proyectarán ofertas especiales, listas de precios y avisos de temporada.
      </p>
    </div>
  </section>
);

export function Dashboard() {
  const navigate = useNavigate();
  
  const [session, setSession] = useState<UserSession>({
    employeeId: 0,
    name: "Cargando...",
    isAdmin: false,
    activeTurnId: null,
  });

  const [isTurnModalOpen, setIsTurnModalOpen] = useState(false);
  const [isCloseTurnModalOpen, setIsCloseTurnModalOpen] = useState(false);
  
  const [startMoney, setStartMoney] = useState<number | "">("");
  const [endMoney, setEndMoney] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const raw = localStorage.getItem("userSession");
        if (raw) {
          const parsed = JSON.parse(raw);
          const empId = parsed.employeeId || 0;
          
          setSession({
            employeeId: empId,
            name: parsed.name || "Usuario",
            isAdmin: Boolean(parsed.isAdmin ?? parsed.is_admin ?? false),
            activeTurnId: parsed.activeTurnId || null
          });

          if (empId > 0 && !parsed.activeTurnId) {
            const hasTurn = await checkActiveTurn(empId);
            if (!hasTurn) {
              setIsTurnModalOpen(true);
            }
          }
        } else {
            navigate("/login");
        }
      } catch (error) {
        console.error("Error leyendo la sesión:", error);
      }
    };
    
    initializeDashboard();
  }, [navigate]);

  const handleOpenTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startMoney === "") return;
    
    setIsProcessing(true);
    try {
      const turnId = await openTurn(session.employeeId, Number(startMoney));
      
      const updatedSession = { ...session, activeTurnId: turnId };
      setSession(updatedSession);
      localStorage.setItem("userSession", JSON.stringify(updatedSession));
      
      setIsTurnModalOpen(false);
      showToast("Caja abierta exitosamente", "success");
    } catch (error) {
        showToast("Error al abrir caja", "error");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCloseTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endMoney === "") return;
    
    setIsProcessing(true);
    try {
      if (session.activeTurnId) {
        await closeTurn(session.activeTurnId, Number(endMoney));
      }
      
      localStorage.removeItem("userSession");
      showToast("Caja cerrada correctamente", "success");
      
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      showToast("Error al cerrar la caja", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const menuActions: (Omit<ActionCardProps, "onClick"> & { route: string; adminOnly?: boolean })[] = [
    { id: "ventas", title: "Realizar Ventas", description: "Cobro ágil en caja", iconBg: "bg-primary/20 text-primary", icon: "🛒", route: "/sells", adminOnly: false },
    { id: "inventario", title: "Control de Inventario", description: "Altas y existencias", iconBg: "bg-secondary/30 text-secondary", icon: "📦", route: "/inventory", adminOnly: false },
    { id: "historial", title: "Historial de Ventas", description: "Tickets previos", iconBg: "bg-tertiary/25 text-tertiary", icon: "📄", route: "/history", adminOnly: true },
    { id: "pedidos", title: "Orden de Pedido", description: "Solicitar mercancía", iconBg: "bg-blue-500/20 text-blue-600", icon: "📋", route: "/orders", adminOnly: false },
    { id: "personal", title: "Control de Personal", description: "Horarios y permisos", iconBg: "bg-gray-200 text-gray-700", icon: "👥", route: "/staff", adminOnly: true },
    { id: "reportes", title: "Reportes", description: "Balance general", iconBg: "bg-secondary/30 text-secondary", icon: "📊", route: "/reports", adminOnly: true },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-between p-3 sm:p-4 lg:p-5 gap-5 text-gray-900 z-10 bg-gray-50/50"
      initial={{ y: "-100%" }}
      animate={{ y: "0%" }}
      exit={{ y: "-100%" }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                Abarrotes Janny
              </span>
              <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-extrabold text-gray-500 uppercase">
                {session.isAdmin ? "Administrador" : "Cajero"}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 lg:text-2xl leading-none mt-0.5">
              ¡Hola, {session.name}! 👋
            </h1>
          </div>
        </div>
        
        <div className="flex items-center">
          {session.activeTurnId ? (
            <button 
              onClick={() => setIsCloseTurnModalOpen(true)} 
              className="group flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-sm cursor-pointer border border-primary/20 hover:border-red-500"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse group-hover:bg-white shadow-sm transition-colors" />
              <span>Cerrar Caja</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsTurnModalOpen(true)} 
              className="group flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm cursor-pointer border border-gray-200 hover:border-primary"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-gray-400 group-hover:bg-white shadow-sm transition-colors" />
              <span>Abrir Caja</span>
            </button>
          )}
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
                  {...cardProps}
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

      {/* Modal Obligatorio Apertura de Caja */}
      <AnimatePresence>
        {isTurnModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 w-full max-w-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                <span className="text-4xl">💰</span>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Apertura de Caja</h3>
              <p className="text-sm text-gray-500 mb-6 text-center">Debes declarar el efectivo inicial en caja para iniciar tu turno.</p>
              
              <form onSubmit={handleOpenTurn} className="w-full space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Efectivo Inicial ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required 
                    autoFocus
                    value={startMoney} 
                    onChange={e => setStartMoney(parseFloat(e.target.value) || "")} 
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-4 text-3xl font-extrabold text-primary text-center outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/20 transition-all" 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold text-white hover:brightness-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? "Procesando..." : "Iniciar Turno"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Cierre de Caja */}
      <AnimatePresence>
        {isCloseTurnModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 w-full max-w-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                <span className="text-4xl">🔒</span>
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Cerrar Caja</h3>
              <p className="text-sm text-gray-500 mb-6 text-center">Ingresa el monto total en efectivo que dejas en la caja. Esto cerrará tu sesión activa.</p>
              
              <form onSubmit={handleCloseTurn} className="w-full space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Efectivo Final ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    required 
                    autoFocus
                    value={endMoney} 
                    onChange={e => setEndMoney(parseFloat(e.target.value) || "")} 
                    className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-4 text-3xl font-extrabold text-red-500 text-center outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/20 transition-all" 
                  />
                </div>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsCloseTurnModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isProcessing} className="flex-1 rounded-2xl bg-red-500 px-4 py-4 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 cursor-pointer">
                    {isProcessing ? "Procesando..." : "Confirmar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificaciones (Toast) */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}