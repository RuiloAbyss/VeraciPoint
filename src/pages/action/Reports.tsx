import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useLoading } from "../../components/LoadingContext";

interface ReportEvent {
  id: number;
  description: string;
  type: string;
  employee: string;
  date: string;
  time: string;
}

export function Reports() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos los Eventos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const loadData = async () => {
    setLoading(true);
    try {
      // Reemplaza con tu comando de Tauri real
      const data: ReportEvent[] = await invoke("fetch_reports");
      setEvents(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uniqueTypes = useMemo(() => {
    const types = Array.from(new Set(events.map(e => e.type)));
    return ["Todos los Eventos", ...types];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (typeFilter !== "Todos los Eventos") {
      result = result.filter(e => e.type === typeFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.description.toLowerCase().includes(lower) || 
        e.employee.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [events, searchTerm, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStyleForType = (type: string) => {
    switch(type) {
      case 'PRECIO': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ALTA': return 'bg-green-50 text-green-700 border-green-200';
      case 'BAJA': return 'bg-red-50 text-red-700 border-red-200';
      case 'STOCK_CERO': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'NUEVO_PEDIDO': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MOD_PEDIDO': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CAJA_ABIERTA': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CAJA_CERRADA': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-gray-900 z-20 bg-gray-50/50 backdrop-blur-sm" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer transition-colors">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Auditoría</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Visor de Eventos</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 rounded-xl bg-white border border-gray-200 p-3 shadow-sm shrink-0">
        <div className="flex-1 w-full min-w-0">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar en la descripción o empleado..." className="w-full rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium outline-none border border-gray-200 focus:border-primary transition-colors" />
        </div>
        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full lg:w-64 rounded-lg bg-white px-3 py-2 text-sm font-bold border border-gray-200 text-gray-700 outline-none hover:border-gray-300 cursor-pointer transition-colors">
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>  

      <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm overflow-hidden flex">
        <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
          {paginatedEvents.length === 0 ? (
            <div className="p-8 text-center font-bold text-gray-400">No hay eventos registrados con estos filtros.</div>
          ) : (
            paginatedEvents.map((ev) => (
              <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold tracking-widest uppercase shrink-0 w-32 text-center shadow-sm ${getStyleForType(ev.type)}`}>
                    {ev.type.replace('_', ' ')}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">{ev.description}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">👤 Operador: {ev.employee}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 shrink-0 pl-4 sm:border-l border-gray-200">
                  <span className="text-xs font-extrabold text-gray-700">{ev.date}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ev.time} hrs</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 shrink-0 gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
              Anterior
            </button>
            <span className="text-xs font-bold text-gray-500">Página {currentPage} de {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
              Siguiente
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
}