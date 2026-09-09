import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { fetchSalesFlow, fetchSalesFlowByDay, fetchTopProducts, type SaleFlow, type SaleFlowByDay, type TopProduct } from "../../services/sellsService";

export function Analytics() {
  const { setLoading } = useLoading();

  // --- ESTADOS BASE ---
  const [referenceDate, setReferenceDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [rangeType, setRangeType] = useState<'day' | 'week' | 'month'>('day');
  
  // --- ESTADOS DE VISTA ---
  const [flowTab, setFlowTab] = useState<'hour' | 'day'>('hour');
  const [topFilterMode, setTopFilterMode] = useState<'quantity' | 'revenue' | 'zero'>('quantity');
  const [topSearch, setTopSearch] = useState("");
  const [topCategory, setTopCategory] = useState("Todas las Categorías");

  // --- DATOS ---
  const [salesFlowHour, setSalesFlowHour] = useState<SaleFlow[]>([]);
  const [salesFlowDay, setSalesFlowDay] = useState<SaleFlowByDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [toast, setToast] = useState<{ msg: string } | null>(null);

  // Calcula automáticamente el rango
  const dateRange = useMemo(() => {
    const d = new Date(referenceDate + "T00:00:00");
    let start = new Date(d);
    let end = new Date(d);

    if (rangeType === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (rangeType === 'month') {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    const format = (dt: Date) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayStr}`;
    };

    return { startDate: format(start), endDate: format(end) };
  }, [referenceDate, rangeType]);

  // Carga de datos unificada
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const [flowH, flowD, topData] = await Promise.all([
          fetchSalesFlow(dateRange.startDate, dateRange.endDate),
          fetchSalesFlowByDay(dateRange.startDate, dateRange.endDate),
          fetchTopProducts(dateRange.startDate, dateRange.endDate)
        ]);
        setSalesFlowHour(Array.isArray(flowH) ? flowH : []);
        setSalesFlowDay(Array.isArray(flowD) ? flowD : []);
        setTopProducts(Array.isArray(topData) ? topData : []);
      } catch (error) {
        setToast({ msg: "Error al cargar las estadísticas" });
        setTimeout(() => setToast(null), 3500);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [dateRange, setLoading]);

  // --- LÓGICA DE GRÁFICA POR HORA ---
  const chartDataHour = useMemo(() => {
    const hoursArray = Array.from({ length: 16 }, (_, i) => i + 6); 
    return hoursArray.map(hour => {
      const found = salesFlowHour.find(f => f.hour === hour);
      return {
        key: `h-${hour}`,
        label: hour > 12 ? `${hour - 12} PM` : hour === 12 ? `12 PM` : `${hour} AM`,
        count: found ? found.count : 0,
        total: found ? found.total : 0
      };
    });
  }, [salesFlowHour]);

  // --- LÓGICA DE GRÁFICA POR DÍA ---
  const chartDataDay = useMemo(() => {
    const daysArray = [];
    let curr = new Date(dateRange.startDate + "T00:00:00");
    const end = new Date(dateRange.endDate + "T00:00:00");
    
    while(curr <= end) {
      daysArray.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    return daysArray.map(dateStr => {
      const found = salesFlowDay.find(f => f.date === dateStr);
      const dtObj = new Date(dateStr + "T00:00:00");
      
      // Aislar los elementos de la fecha en 3 letras mayúsculas
      const dayName = new Intl.DateTimeFormat('es-MX', { weekday: 'short' }).format(dtObj).replace('.', '').toUpperCase();
      const dateNum = new Intl.DateTimeFormat('es-MX', { day: '2-digit' }).format(dtObj);
      const monthStr = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(dtObj).replace('.', '').toUpperCase();
      
      return {
        key: `d-${dateStr}`,
        dayName: dayName.slice(0, 3),
        dateString: `${dateNum}-${monthStr}`,
        count: found ? found.count : 0,
        total: found ? found.total : 0
      };
    });
  }, [salesFlowDay, dateRange]);

  // Variables activas de la gráfica seleccionada
  const isDayFlow = flowTab === 'day';
  const activeChartData = flowTab === 'hour' ? chartDataHour : chartDataDay;
  const maxVal = Math.max(...activeChartData.map(d => isDayFlow ? d.total : d.count), 1);
  const totalSalesCount = activeChartData.reduce((acc, curr) => acc + curr.count, 0);
  const totalSalesAmount = activeChartData.reduce((acc, curr) => acc + curr.total, 0);

  // --- LÓGICA TOP PRODUCTOS ---
  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(topProducts.map(p => p.category)));
    return ["Todas las Categorías", ...cats.sort()];
  }, [topProducts]);

  const filteredTop = useMemo(() => {
    let list = [...topProducts];
    
    if (topCategory !== "Todas las Categorías") {
        list = list.filter(p => p.category === topCategory);
    }

    if (topSearch.trim() !== "") {
        const lowerSearch = topSearch.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }

    if (topFilterMode === 'quantity') {
      list = list.filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity);
    } else if (topFilterMode === 'revenue') {
      list = list.filter(p => p.total > 0).sort((a, b) => b.total - a.total);
    } else if (topFilterMode === 'zero') {
      list = list.filter(p => p.quantity === 0).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return list;
  }, [topProducts, topFilterMode, topCategory, topSearch]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
      
      {/* ================= PANEL IZQUIERDO: GRÁFICAS ================= */}
      <section className="flex-col flex-[2] rounded-2xl bg-white border border-gray-200 p-5 shadow-sm overflow-hidden flex">
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 shrink-0 flex-wrap gap-4">
          <div className="flex flex-col gap-3">
             <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 w-max">
                <button onClick={() => { setRangeType('day'); setFlowTab('hour'); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'day' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Día</button>
                <button onClick={() => setRangeType('week')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Semana</button>
                <button onClick={() => setRangeType('month')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Mes</button>
             </div>
             <div className="flex items-center gap-2">
                <input type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm font-extrabold text-primary outline-none cursor-pointer" />
             </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">INGRESOS DEL PERIODO</p>
             <p className="text-3xl font-extrabold text-primary leading-none">${totalSalesAmount.toFixed(2)}</p>
             <p className="text-xs font-bold text-gray-500 mt-1">{totalSalesCount} transacciones</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 shrink-0 border-b border-gray-100 pb-4">
            <button onClick={() => setFlowTab('hour')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${flowTab === 'hour' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Flujo por Hora
            </button>
            <button onClick={() => setFlowTab('day')} disabled={rangeType === 'day'} className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${flowTab === 'day' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'}`}>
                Flujo por Día
            </button>
        </div>

        <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex flex-col overflow-hidden border border-gray-100 relative group">
          {totalSalesCount === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-400 z-10">Sin transacciones registradas.</div>
          )}
          
          <div className="flex-1 flex items-end justify-between gap-3 overflow-x-auto custom-scrollbar pb-2 mt-8 px-2">
              {activeChartData.map((d, index) => {
              const currentVal = isDayFlow ? d.total : d.count;
              const heightPercent = (currentVal / maxVal) * 100;
              const hasSales = d.count > 0;
              
              return (
                  <div key={d.key} className={`flex flex-col items-center flex-1 h-full justify-end relative group/bar ${isDayFlow ? 'min-w-[40px] max-w-[80px]' : 'min-w-[32px] max-w-[60px]'}`}>
                  
                  <div className="absolute -top-8 bg-gray-900 text-white text-[11px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md flex flex-col items-center">
                      <span>{isDayFlow ? `$${d.total.toFixed(2)} (${d.count} trans.)` : `$${d.total.toFixed(2)}`}</span>
                  </div>

                  <span className={`text-xs font-extrabold mb-1.5 transition-colors ${hasSales ? 'text-primary' : 'text-transparent'}`}>
                      {hasSales ? (isDayFlow ? `$${d.total.toFixed(0)}` : d.count) : '0'}
                  </span>
                  
                  <div className="w-full bg-gray-200 rounded-t-lg relative overflow-hidden flex items-end group-hover/bar:bg-primary/20 transition-colors" style={{ height: '100%', maxHeight: '100%' }}>
                      <motion.div 
                          initial={{ height: 0 }} 
                          animate={{ height: `${heightPercent}%` }} 
                          transition={{ duration: 0.6, delay: index * 0.02, ease: "easeOut" }}
                          className={`w-full rounded-t-lg transition-colors ${hasSales ? 'bg-primary group-hover/bar:bg-primary/80 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.1)]' : 'bg-transparent'}`} 
                      />
                  </div>
                  
                  {/* Etiqueta inferior separada en dos renglones: Día en verde y fecha en gris */}
                  <div className="mt-2 flex flex-col items-center leading-tight">
                    {isDayFlow ? (
                      <>
                        <span className="text-[10px] font-extrabold text-primary uppercase">{(d as any).dayName}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{(d as any).dateString}</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 uppercase truncate w-full text-center">{(d as any).label}</span>
                    )}
                  </div>
                  </div>
              );
              })}
          </div>
        </div>
      </section>

      {/* ================= PANEL DERECHO: RENDIMIENTO INVENTARIO ================= */}
      <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm overflow-hidden flex min-w-[300px]">
        <div className="mb-4 border-b border-gray-100 pb-4 shrink-0 flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-gray-900 leading-none">Rendimiento de Inventario</h2>
            
            <div className="flex flex-col gap-2">
                <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={topSearch}
                    onChange={(e) => setTopSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                />
                
                <div className="grid grid-cols-2 gap-2">
                    <select value={topCategory} onChange={(e) => setTopCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-[11px] font-bold text-gray-700 outline-none cursor-pointer">
                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select value={topFilterMode} onChange={(e) => setTopFilterMode(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-[11px] font-bold text-gray-700 outline-none cursor-pointer">
                        <option value="quantity">Top: Volumen</option>
                        <option value="revenue">Top: Ingresos</option>
                        <option value="zero">Alerta: Sin Movimiento</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {filteredTop.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">Sin datos para mostrar.</div>
          ) : (
              filteredTop.slice(0, 50).map((p, index) => (
                  <div key={`${p.name}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 pr-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-extrabold shrink-0 shadow-sm ${topFilterMode !== 'zero' && index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : topFilterMode !== 'zero' && index === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' : topFilterMode !== 'zero' && index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-white border border-gray-200 text-gray-500'}`}>{index + 1}</span>
                        <div className="flex flex-col truncate w-full">
                          <span className="font-bold text-sm text-gray-900 truncate">{p.name}</span>
                          <div className="flex gap-1.5 items-center mt-0.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide bg-gray-200 px-1.5 py-0.5 rounded-sm">{p.category}</span>
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                                {topFilterMode === 'zero' ? 'SIN VENTAS' : `CANT: ${p.quantity}`}
                            </span>
                          </div>
                        </div>
                    </div>
                    {topFilterMode !== 'zero' && (
                      <span className="font-extrabold text-primary text-sm shrink-0">${p.total.toFixed(2)}</span>
                    )}
                  </div>
              ))
          )}
        </div>
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-[90] left-1/2 -translate-x-1/2">
            <div className="px-6 py-3 rounded-full shadow-xl font-bold text-sm bg-gray-900 text-white border border-gray-700">
              AVISO: {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}