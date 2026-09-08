import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { closeTurn } from "../../services/turnService";
import { useLoading } from "../../components/LoadingContext"; 

export function EndTurn() {
  const navigate = useNavigate();
  const { setLoading } = useLoading(); 
  
  const [endMoney, setEndMoney] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("userSession");
    if (!raw) navigate("/login");
  }, [navigate]);

  const handleCloseTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endMoney === "") return;
    
    setIsProcessing(true);
    setLoading(true); 
    
    try {
      const raw = localStorage.getItem("userSession");
      if (raw) {
        const session = JSON.parse(raw);
        if (session.activeTurnId) {
          // Llama al servicio de Rust para cerrar el turno en SQL Server
          await closeTurn(session.activeTurnId, Number(endMoney));
        }
      }
      
      // Borramos la sesión permanentemente
      localStorage.removeItem("userSession");
      
      setToast({ msg: "Caja cerrada correctamente", type: "success" });
      
      // Mantenemos la pantalla de carga durante la transición
      setTimeout(() => {
        setLoading(false);
        navigate("/login");
      }, 1500);
      
    } catch (error) {
      setLoading(false);
      setToast({ msg: "Error al cerrar la caja", type: "error" });
      setTimeout(() => setToast(null), 3000);
      setIsProcessing(false);
    } 
  };

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-gray-50/50 p-4 z-20 backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 w-full max-w-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
          <span className="text-4xl">🔒</span>
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">Cerrar Caja</h3>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Ingresa el monto total en efectivo que dejas en la caja. <br/> 
          <strong>Esto cerrará tu sesión activa.</strong>
        </p>
        
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
              onChange={e => setEndMoney(e.target.value)} 
              className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-4 text-3xl font-extrabold text-red-500 text-center outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/20 transition-all" 
              placeholder="0.00"
            />
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => navigate("/dashboard")}
              disabled={isProcessing}
              className="flex-1 rounded-2xl bg-gray-100 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="flex-1 rounded-2xl bg-red-500 px-4 py-4 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? "Cerrando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-50">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}