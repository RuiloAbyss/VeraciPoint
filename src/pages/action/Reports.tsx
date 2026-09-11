import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { useLoading } from "../../components/LoadingContext";
import { getEmployees } from "../../services/employeeService";
import { fetchSaleDetails } from "../../services/sellsService";
import { fetchOrderDetails } from "../../services/orderService";

interface ReportEvent {
  id: number;
  description: string;
  type: string;
  employee: string;
  date: string;
  time: string;
  referenceId?: number;
}

// Extracción de fecha manual a prueba de zonas horarias
const getLocalToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// --- SUBCONSTRUCTOR: MODAL MULTI-DETALLE CON DISEÑO DE HISTORY ---
function EventDetailModal({ ev, onClose }: { ev: ReportEvent, onClose: () => void }) {
    const [details, setDetails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!ev.referenceId) return;
            try {
                if (ev.type === 'VENTA_REALIZADA' || ev.type === 'PAGO_PROVEEDOR') {
                    const data = await fetchSaleDetails(ev.referenceId);
                    setDetails(Array.isArray(data) ? data : []);
                } else if (ev.type.startsWith('ORDEN_')) {
                    const data = await fetchOrderDetails(ev.referenceId);
                    setDetails(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                console.error("Error obteniendo detalles:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [ev]);

    const totalCalculated = details.reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0);
    const isNegative = ev.type === 'PAGO_PROVEEDOR';
    const isOrder = ev.type.startsWith('ORDEN_');

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
                <div className="text-center border-b border-gray-200 pb-4 mb-4 shrink-0">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl shadow-sm ${isNegative ? 'bg-red-50 text-red-500' : isOrder ? 'bg-purple-50 text-purple-600' : 'bg-primary/10 text-primary'}`}>
                        {isNegative ? '📦' : isOrder ? '📋' : '📄'}
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
                        {isOrder ? 'Orden' : 'Ticket'} #{ev.referenceId}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold mt-1">{ev.date} • {ev.time} hrs</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase tracking-wider">
                            Operador: {ev.employee}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isNegative ? 'bg-red-100 text-red-700' : isOrder ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {ev.type.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
                    {loading ? <p className="text-center text-xs font-bold text-gray-400 py-4">Cargando desglose...</p> : details.length === 0 ? <p className="text-center text-xs font-bold text-gray-400 py-4">No hay desglose disponible.</p> :
                        details.map((d, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                <div className="flex flex-col flex-1 pr-3">
                                    <span className="font-bold text-sm text-gray-900 leading-tight">{d.productName || d.name}</span>
                                    <span className="text-[10px] font-bold text-gray-400">
                                        Cant: {Number(isOrder ? (d.receivedQty ?? d.expectedQty) : d.quantity).toString()}
                                    </span>
                                </div>
                                <span className="font-extrabold text-primary text-sm shrink-0">${Math.abs(Number(d.subtotal)).toFixed(2)}</span>
                            </div>
                        ))
                    }
                </div>

                <div className="border-t border-gray-200 pt-4 shrink-0">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Movimiento Total</span>
                        <span className={`text-2xl font-extrabold ${isNegative ? 'text-red-600' : 'text-gray-900'}`}>
                            {isNegative ? '-' : ''}${Math.abs(totalCalculated).toFixed(2)}
                        </span>
                    </div>
                    <button onClick={onClose} className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors cursor-pointer shadow-lg">Cerrar Detalle</button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function Reports() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  
  const [events, setEvents] = useState<ReportEvent[]>([]);
  const [activeEmployees, setActiveEmployees] = useState<string[]>(["Todos"]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos los Eventos");
  const [dateFilter, setDateFilter] = useState(getLocalToday()); 
  const [employeeFilter, setEmployeeFilter] = useState("Todos");

  const [selectedEvent, setSelectedEvent] = useState<ReportEvent | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, typeFilter, dateFilter, employeeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data: ReportEvent[] = await invoke("fetch_reports");
      setEvents(data || []);

      const empsData = await getEmployees();
      const active = (Array.isArray(empsData) ? empsData : [])
        .filter((e: any) => e.status === true || e.status === 1 || String(e.status) === "true")
        .map((e: any) => `${e.name} ${e.lastname}`);
      
      setActiveEmployees(["Todos", ...Array.from(new Set(active))]);
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
      const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
      result = result.filter(e => {
        const searchableText = `${e.description} ${e.employee} ${e.referenceId || ''}`.toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    if (employeeFilter !== "Todos") {
        result = result.filter(e => e.employee === employeeFilter);
    }

    // Filtrado por fecha estricto
    if (dateFilter) {
        result = result.filter(e => e.date?.trim() === dateFilter);
    }

    return result;
  }, [events, searchTerm, typeFilter, employeeFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStyleForType = (type: string) => {
    if (type.startsWith('PROD_')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type.startsWith('ORDEN_')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (type === 'VENTA_REALIZADA') return 'bg-green-50 text-green-700 border-green-200';
    if (type === 'PAGO_PROVEEDOR') return 'bg-red-50 text-red-700 border-red-200';
    if (type.startsWith('CAJA_')) return 'bg-teal-50 text-teal-700 border-teal-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleEventClick = (ev: ReportEvent) => {
      if (ev.referenceId && (ev.type === 'VENTA_REALIZADA' || ev.type === 'PAGO_PROVEEDOR' || ev.type.startsWith('ORDEN_'))) {
          setSelectedEvent(ev);
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl bg-white border border-gray-200 p-3 shadow-sm shrink-0 items-end">
        <div className="col-span-2 lg:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Buscar Información</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Folio o descripción..." className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
        </div>
        
        <div className="col-span-1 lg:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Día Exacto</label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
        </div>

        <div className="col-span-1 lg:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Operador (Activos)</label>
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 text-gray-700 outline-none hover:border-gray-300 cursor-pointer transition-colors">
             {activeEmployees.map((emp, idx) => <option key={idx} value={emp}>{emp}</option>)}
          </select>
        </div>

        <div className="col-span-1 lg:col-span-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Evento</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 text-gray-700 outline-none hover:border-gray-300 cursor-pointer transition-colors">
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>  

      <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm overflow-hidden flex">
        <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
          {paginatedEvents.length === 0 ? (
            <div className="p-8 text-center font-bold text-gray-400">No hay eventos registrados con estos filtros.</div>
          ) : (
            paginatedEvents.map((ev) => {
              const isClickable = ev.referenceId && (ev.type === 'VENTA_REALIZADA' || ev.type === 'PAGO_PROVEEDOR' || ev.type.startsWith('ORDEN_'));
              return (
              <div 
                key={ev.id} 
                onClick={() => handleEventClick(ev)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 transition-colors ${isClickable ? 'hover:border-primary cursor-pointer hover:shadow-sm' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold tracking-widest uppercase shrink-0 w-36 text-center shadow-sm ${getStyleForType(ev.type)}`}>
                    {ev.type.replace('PROD_', '').replace('_', ' ')}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-900 truncate">
                        {ev.description} 
                        {isClickable && <span className="ml-2 text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">Ver Detalle</span>}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">👤 Operador: {ev.employee}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0.5 shrink-0 pl-4 sm:border-l border-gray-200">
                  <span className="text-xs font-extrabold text-gray-700">{ev.date}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ev.time} hrs</span>
                </div>
              </div>
            )})
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

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal ev={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}