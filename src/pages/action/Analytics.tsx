import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { fetchSalesFlow, fetchTopProducts, type SaleFlow, type TopProduct } from "../../services/sellsService";

export function Analytics() {
  const { setLoading } = useLoading();

  const [referenceDate, setReferenceDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  
  const [rangeType, setRangeType] = useState<'day' | 'week' | 'month'>('day');
  const [topFilter, setTopFilter] = useState<'quantity' | 'revenue' | 'zero'>('quantity');

  const [salesFlow, setSalesFlow] = useState<SaleFlow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [toast, setToast] = useState<{ msg: string } | null>(null);

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

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const [flowData, topData] = await Promise.all([
          fetchSalesFlow(dateRange.startDate, dateRange.endDate),
          fetchTopProducts(dateRange.startDate, dateRange.endDate)
        ]);
        setSalesFlow(Array.isArray(flowData) ? flowData : []);
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

  const chartData = useMemo(() => {
    const hoursArray = Array.from({ length: 16 }, (_, i) => i + 6); 
    return hoursArray.map(hour => {
      const found = salesFlow.find(f => f.hour === hour);
      return {
        hour,
        label: hour > 12 ? `${hour - 12} PM` : hour === 12 ? `12 PM` : `${hour} AM`,
        count: found ? found.count : 0,
        total: found ? found.total : 0
      };
    });
  }, [salesFlow]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const totalSalesCount = chartData.reduce((acc, curr) => acc + curr.count, 0);
  const totalSalesAmount = chartData.reduce((acc, curr) => acc + curr.total, 0);

  const filteredTop = useMemo(() => {
    let list = [...topProducts];
    if (topFilter === 'quantity') {
      list = list.filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity);
    } else if (topFilter === 'revenue') {
      list = list.filter(p => p.total > 0).sort((a, b) => b.total - a.total);
    } else if (topFilter === 'zero') {
      list = list.filter(p => p.quantity === 0).sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [topProducts, topFilter]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
      
      <section className="flex-col flex-[2] rounded-2xl bg-white border border-gray-200 p-5 shadow-sm overflow-hidden flex">
        <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 shrink-0 flex-wrap gap-4">
          <div className="flex flex-col gap-3">
             <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 w-max">
                <button onClick={() => setRangeType('day')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'day' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Día</button>
                <button onClick={() => setRangeType('week')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Semana</button>
                <button onClick={() => setRangeType('month')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${rangeType === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}>Mes</button>
             </div>
             <div className="flex items-center gap-2">
                <input type="date" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm font-extrabold text-primary outline-none cursor-pointer" />
             </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingresos del Periodo</p>
             <p className="text-3xl font-extrabold text-primary leading-none">${totalSalesAmount.toFixed(2)}</p>
             <p className="text-xs font-bold text-gray-500 mt-1">{totalSalesCount} transacciones</p>
          </div>
        </div>

        <div className="flex-1 bg-gray-50 rounded-2xl p-4 flex flex-col overflow-hidden border border-gray-100 relative group">
          {totalSalesCount === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-400 z-10">No hay ventas en este periodo.</div>
          )}
          
          <div className="flex-1 flex items-end justify-between gap-2 overflow-x-auto custom-scrollbar pb-2 mt-8 px-2">
              {chartData.map((d, index) => {
              const heightPercent = (d.count / maxCount) * 100;
              const hasSales = d.count > 0;
              return (
                  <div key={d.hour} className="flex flex-col items-center flex-1 min-w-[32px] max-w-[60px] h-full justify-end relative group/bar">
                  
                  <div className="absolute -top-8 bg-gray-900 text-white text-[11px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md flex flex-col items-center">
                      <span>${d.total.toFixed(2)}</span>
                  </div>

                  <span className={`text-xs font-extrabold mb-1.5 transition-colors ${hasSales ? 'text-primary' : 'text-transparent'}`}>
                      {hasSales ? d.count : '0'}
                  </span>
                  
                  <div className="w-full bg-gray-200 rounded-t-lg relative overflow-hidden flex items-end group-hover/bar:bg-primary/20 transition-colors" style={{ height: '100%', maxHeight: '100%' }}>
                      <motion.div 
                          initial={{ height: 0 }} 
                          animate={{ height: `${heightPercent}%` }} 
                          transition={{ duration: 0.6, delay: index * 0.03, ease: "easeOut" }}
                          className={`w-full rounded-t-lg transition-colors ${hasSales ? 'bg-primary group-hover/bar:bg-primary/80 shadow-[inset_0_-4px_0_0_rgba(0,0,0,0.1)]' : 'bg-transparent'}`} 
                      />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 mt-2 truncate w-full text-center">{d.label.replace(' ', '')}</span>
                  </div>
              );
              })}
          </div>
        </div>
      </section>

      <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm overflow-hidden flex min-w-[300px]">
        <div className="mb-4 border-b border-gray-100 pb-4 shrink-0 flex flex-col gap-3">
            <h2 className="text-lg font-extrabold text-gray-900 leading-none">Rendimiento de Inventario</h2>
            <select value={topFilter} onChange={(e) => setTopFilter(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 outline-none cursor-pointer">
              <option value="quantity">Top: Más Vendidos (Volumen)</option>
              <option value="revenue">Top: Más Ganancia (Ingresos)</option>
              <option value="zero">Alerta: Cero Ventas (Estancados)</option>
            </select>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {filteredTop.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm font-bold text-gray-400">Sin datos para mostrar.</div>
          ) : (
              filteredTop.slice(0, 50).map((p, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden flex-1 pr-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-extrabold shrink-0 shadow-sm ${topFilter !== 'zero' && index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : topFilter !== 'zero' && index === 1 ? 'bg-gray-200 text-gray-700 border border-gray-300' : topFilter !== 'zero' && index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-white border border-gray-200 text-gray-500'}`}>{index + 1}</span>
                        <div className="flex flex-col truncate w-full">
                          <span className="font-bold text-sm text-gray-900 truncate">{p.name}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                            {topFilter === 'zero' ? 'SIN MOVIMIENTO' : `Volumen: ${p.quantity}`}
                          </span>
                        </div>
                    </div>
                    {topFilter !== 'zero' && (
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