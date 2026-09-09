import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { fetchSalesHistory, fetchSaleDetails, type Sale, type SaleDetail } from "../../services/sellsService";

export function History() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("Todos los pagos");

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleDetails, setSaleDetails] = useState<SaleDetail[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'error' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentFilter]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchSalesHistory();
        setSales(Array.isArray(data) ? data : []);
      } catch (error) {
        setToast({ msg: "Error al cargar el historial", type: "error" });
        setTimeout(() => setToast(null), 3500);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredSales = useMemo(() => {
    let result = sales;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.id.toString().includes(lower) || 
        (s.employeeName && s.employeeName.toLowerCase().includes(lower)) ||
        (s.date && s.date.includes(lower))
      );
    }
    if (paymentFilter === "Efectivo") result = result.filter(s => s.cash);
    if (paymentFilter === "Tarjeta") result = result.filter(s => !s.cash);
    return result;
  }, [sales, searchTerm, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenDetails = async (sale: Sale) => {
    setLoading(true);
    try {
      const details = await fetchSaleDetails(sale.id);
      setSaleDetails(Array.isArray(details) ? details : []);
      setSelectedSale(sale);
      setIsModalOpen(true);
    } catch (error) {
      setToast({ msg: "Error al cargar detalles del ticket", type: "error" });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  const renderPagination = () => {
    if (filteredSales.length === 0) return null;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, filteredSales.length);

    return (
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 shrink-0 gap-2">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-2 sm:px-4 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
          <span className="hidden sm:inline">Anterior</span><span className="sm:hidden">◀</span>
        </button>
        <span className="text-[10px] sm:text-xs font-bold text-gray-500 text-center">
          Mostrando {start} - {end} de {filteredSales.length}
        </span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-2 sm:px-4 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
          <span className="hidden sm:inline">Siguiente</span><span className="sm:hidden">▶</span>
        </button>
      </div>
    );
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-gray-900 z-20 bg-gray-50/50" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Admin</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Historial de Ventas</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 rounded-xl bg-white border border-gray-200 p-3 shadow-sm shrink-0">
        <div className="flex-1 w-full min-w-0">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar por Folio de Ticket, fecha o cajero..." className="w-full rounded-lg bg-gray-50 px-4 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
        </div>
        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="w-full lg:w-48 rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 text-gray-700 outline-none cursor-pointer hover:border-gray-300 transition-colors">
          <option value="Todos los pagos">Todos los pagos</option>
          <option value="Efectivo">Efectivo 💵</option>
          <option value="Tarjeta">Tarjeta 💳</option>
        </select>
      </div>

      <section className="flex-col flex-1 rounded-2xl bg-gray-100/50 border border-gray-200 p-3 lg:p-4 overflow-hidden flex">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 flex-1 custom-scrollbar content-start">
          {isLoading ? (
            <div className="col-span-full p-4 text-center font-bold text-gray-500">Cargando historial...</div>
          ) : paginatedSales.length === 0 ? (
            <div className="col-span-full p-4 text-center font-bold text-gray-500">No se encontraron ventas.</div>
          ) : (
            paginatedSales.map((sale) => (
              <button key={sale.id} onClick={() => handleOpenDetails(sale)} className="group flex flex-col gap-2 rounded-xl bg-white p-3 text-left cursor-pointer overflow-hidden border border-gray-200 hover:border-primary/50 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">TICKET #{sale.id}</span>
                    <span className="font-bold text-sm text-gray-900">{sale.date}</span>
                  </div>
                  <span className="text-xl bg-gray-50 p-1.5 rounded-lg">{sale.cash ? "💵" : "💳"}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Cajero:</span>
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">{sale.employeeName}</span>
                  </div>
                  <span className="font-extrabold text-primary text-lg">${Number(sale.total).toFixed(2)}</span>
                </div>
              </button>
            ))
          )}
        </div>
        {renderPagination()}
      </section>

      {/* Modal del Ticket */}
      <AnimatePresence>
        {isModalOpen && selectedSale && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
              
              <div className="text-center border-b border-gray-200 pb-4 mb-4 shrink-0">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl shadow-sm">📄</div>
                <h3 className="text-xl font-extrabold text-gray-900 leading-tight">Ticket #{selectedSale.id}</h3>
                <p className="text-xs text-gray-500 font-bold mt-1">{selectedSale.date}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase tracking-wider">Cajero: {selectedSale.employeeName}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${selectedSale.cash ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {selectedSale.cash ? 'Pago Efectivo' : 'Pago Tarjeta'}
                    </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
                {saleDetails.map(detail => (
                  <div key={detail.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div className="flex flex-col flex-1 pr-3">
                      <span className="font-bold text-sm text-gray-900 leading-tight">{detail.productName}</span>
                      <span className="text-[10px] font-bold text-gray-400">Cant: {Number(detail.quantity).toString()}</span>
                    </div>
                    <span className="font-extrabold text-primary text-sm shrink-0">${Number(detail.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 shrink-0">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Cobrado</span>
                    <span className="text-2xl font-extrabold text-gray-900">${Number(selectedSale.total).toFixed(2)}</span>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors cursor-pointer shadow-lg">
                  Cerrar Ticket
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-50 left-1/2 -translate-x-1/2">
            <div className="px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 bg-red-500 text-white">
              ❌ {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}