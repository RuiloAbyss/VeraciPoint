import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";
import { fetchProducts, type Product } from "../../services/productService";
import { registerSale, type SaleDetailInput } from "../../services/sellsService";
import { useLoading } from "../../components/LoadingContext"; 

interface CartItem {
  product: Product;
  quantity: number | string;
  finalPrice: number | string;
}

export function Sells() {
  const navigate = useNavigate();
  const { setLoading } = useLoading(); 
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; details: string }>({ isOpen: false, title: "", details: "" });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'regular' | 'bulk'>('regular');
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas las Categorías");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCash, setIsCash] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; 

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, activeTab]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try { setProducts(await fetchProducts() || []); } 
    catch (error) { showToast("Error al cargar inventario", "error"); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem("userSession");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setIsAdmin(Boolean(parsed.isAdmin ?? parsed.is_admin));
        setEmployeeId(parsed.employeeId || 0);
      } catch { navigate("/login"); }
    } else { navigate("/login"); }
    loadData();
  }, [navigate]);

  const uniqueCategories = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    const sortedCats = Array.from(new Set(safeProducts.map(p => p.category || "Sin Categoría"))).sort();
    return ["Todas las Categorías", ...sortedCats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let result = safeProducts.filter(p => p.status !== 0 && (p.stock || 0) > 0);
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => (p.name && p.name.toLowerCase().includes(lower)) || (p.barcode && p.barcode.toString().includes(lower)) || (p.category && p.category.toLowerCase().includes(lower)));
    }
    if (categoryFilter !== "Todas las Categorías") {
        result = result.filter(p => p.category === categoryFilter);
    }
    return result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products, searchTerm, categoryFilter]);

  const regularProducts = filteredProducts.filter(p => p.barcode !== null && p.barcode !== undefined);
  const bulkProducts = filteredProducts.filter(p => p.barcode === null || p.barcode === undefined);

  const targetList = activeTab === 'regular' ? regularProducts : bulkProducts;
  const totalPages = Math.max(1, Math.ceil(targetList.length / itemsPerPage));
  const paginatedList = targetList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const cartTotal = cart.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.finalPrice) || 0)), 0);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (targetList.length > 0) {
            addToCart(targetList[0]);
            setSearchTerm("");
        } else {
            showToast("No se encontró el producto", "error");
        }
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (Number(existing.quantity) >= (product.stock || 0)) {
            showToast("Stock máximo alcanzado", "info");
            return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      }
      return [...prev, { product, quantity: 1, finalPrice: product.price || 0 }];
    });
  };

  const updateCartItem = (productId: number, field: 'quantity' | 'finalPrice', value: string) => {
    const targetItem = cart.find(i => i.product.id === productId);
    if (!targetItem) return;

    if (value === "") {
      setCart(prev => prev.map(item => item.product.id === productId ? { ...item, [field]: "" } : item));
      return;
    }

    const isPieza = targetItem.product.sellformat?.toLowerCase() === 'pieza';
    const num = value.endsWith('.') ? value : (field === 'quantity' && isPieza ? parseInt(value, 10) : parseFloat(value));
    
    if (typeof num === 'number' && (isNaN(num) || num < 0)) return;

    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        if (field === 'quantity' && typeof num === 'number' && num > (item.product.stock || 0)) {
            showToast(`Solo hay ${item.product.stock} disponibles`, "info");
            return { ...item, quantity: item.product.stock || 0 };
        }
        return { ...item, [field]: num };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || employeeId === 0) return;
    setLoading(true); 
    try {
      const details: SaleDetailInput[] = cart.map(item => ({
        productId: item.product.id,
        quantity: Number(item.quantity) || 0,
        subtotal: (Number(item.quantity) || 0) * (Number(item.finalPrice) || 0)
      }));

      await registerSale(employeeId, isCash, cartTotal, details);
      showToast("Venta registrada exitosamente", "success");
      setCart([]);
      await loadData(); 
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Error desconocido";
      const errorDetails = error?.response?.data?.details || error?.response?.data || JSON.stringify(error, null, 2);
      setErrorModal({ isOpen: true, title: "Error al registrar la venta", details: `Mensaje: ${errorMessage}\n\nDetalles técnicos:\n${errorDetails}` });
    } finally {
      setLoading(false); 
    }
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-2 lg:gap-3 text-gray-900 z-20 bg-gray-50/50" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • POS</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Punto de Venta</h1>
          </div>
        </div>
      </header>

      {/* Contenedor divisor: flex-col en móviles (mitad y mitad), flex-row en escritorio */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 flex-1 min-h-0">
        
        {/* PANEL IZQUIERDO: CATÁLOGO (Peso 0.8 en móvil para dejar más espacio al carrito, Peso 1.5 en PC) */}
        <div className="flex flex-col flex-[0.8] lg:flex-[1.5] gap-2 lg:gap-3 min-h-0">
            <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 p-2 shadow-sm shrink-0">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="🔍 Código o nombre... (Enter)" autoFocus className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-1/3 rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 outline-none cursor-pointer">
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            
            <div className="flex bg-gray-200 rounded-xl p-1 shrink-0">
                <button onClick={() => setActiveTab('regular')} className={`flex-1 py-1.5 lg:py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'regular' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Registrados ({regularProducts.length})</button>
                <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-1.5 lg:py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'bulk' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>A Granel ({bulkProducts.length})</button>
            </div>

            <section className="flex-col flex-1 rounded-2xl bg-gray-100/50 border border-gray-200 p-2 lg:p-3 overflow-hidden flex">
                <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    {isLoading ? <div className="p-4 text-center font-bold text-gray-500">Cargando...</div> : 
                    activeTab === 'regular' ? (
                        <div className="space-y-2">
                            {paginatedList.map((prod) => (
                                <ProductCard key={prod.id} {...prod} code={prod.barcode?.toString() || "S/N"} isSelected={false} onClick={() => addToCart(prod)} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-3 content-start">
                            {paginatedList.map((prod) => (
                                <BulkProductCard key={prod.id} name={prod.name || ""} pricePerKg={prod.price || 0} stock={prod.stock || 0} minStock={prod.minStock} status={prod.status} photo={prod.photo} isSelected={false} onClick={() => addToCart(prod)} />
                            ))}
                        </div>
                    )}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200 shrink-0">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="px-3 py-1.5 lg:px-4 lg:py-2 bg-gray-100 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:bg-gray-200 transition-colors">Anterior</button>
                    <span className="text-[10px] lg:text-xs font-bold text-gray-500">Pág {currentPage} / {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="px-3 py-1.5 lg:px-4 lg:py-2 bg-gray-100 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:bg-gray-200 transition-colors">Siguiente</button>
                  </div>
                )}
            </section>
        </div>

        {/* PANEL DERECHO: CARRITO DE COMPRAS (Peso 1.2 en móvil para darle prioridad, Peso 1 en PC) */}
        <div className="flex flex-col flex-[1.2] lg:flex-1 w-full rounded-2xl bg-white border border-gray-200 shadow-sm min-h-0 overflow-hidden">
          <div className="bg-gray-50 p-2 lg:p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h2 className="text-base lg:text-lg font-bold text-gray-900">Lista de Cobro</h2>
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <span className="text-4xl lg:text-5xl mb-2">🛒</span>
                    <p className="font-bold text-gray-500 text-sm">El carrito está vacío</p>
                </div>
            ) : (
                cart.map(item => {
                    const isPieza = item.product.sellformat?.toLowerCase() === 'pieza';
                    return (
                    <div key={item.product.id} className="flex flex-col gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border border-gray-200 bg-gray-50/50 relative group">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-6">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-bold text-xs lg:text-sm text-gray-900 leading-tight">{item.product.name}</p>
                                    <span className="text-[8px] lg:text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                        {isPieza ? 'PZA' : 'KG'}
                                    </span>
                                </div>
                                <p className="text-[9px] lg:text-[10px] font-bold text-gray-400">P. Unit: ${(item.product.price || 0).toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="absolute top-2 right-2 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-xs">✕</button>
                        </div>
                        
                        <div className="flex gap-1 lg:gap-2 items-center mt-1">
                            <div className="flex-1 flex flex-col">
                                <label className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase">Cantidad</label>
                                <input type="number" min={isPieza ? "1" : "0"} step={isPieza ? "1" : "0.001"} value={item.quantity ?? ""} onChange={e => updateCartItem(item.product.id, 'quantity', e.target.value)} className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs font-bold text-center outline-none focus:border-primary" />
                            </div>
                            <span className="text-gray-300 font-bold mt-3 lg:mt-4">x</span>
                            <div className="flex-1 flex flex-col">
                                <label className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase">P. Final ($)</label>
                                <input type="number" min="0" step="0.01" value={item.finalPrice ?? ""} onChange={e => updateCartItem(item.product.id, 'finalPrice', e.target.value)} disabled={!isAdmin} className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs font-bold text-center outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:border-transparent" />
                            </div>
                            <span className="text-gray-300 font-bold mt-3 lg:mt-4">=</span>
                            <div className="flex-[1.2] flex flex-col items-end pt-3 lg:pt-4">
                                <span className="font-extrabold text-primary text-xs lg:text-sm">${((Number(item.quantity) || 0) * (Number(item.finalPrice) || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )
                })
            )}
          </div>

          <div className="bg-gray-50 p-2 lg:p-4 border-t border-gray-200 shrink-0">
            <div className="flex justify-between items-center mb-2 lg:mb-4">
                <span className="text-xs lg:text-sm text-gray-500 font-bold">Total a cobrar:</span>
                <span className="text-2xl lg:text-3xl font-extrabold text-gray-900">${(cartTotal || 0).toFixed(2)}</span>
            </div>

            <div className="flex gap-2 mb-2 lg:mb-4">
                <label className={`flex-1 flex items-center justify-center gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border-2 cursor-pointer transition-colors ${isCash ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" checked={isCash} onChange={() => setIsCash(true)} className="hidden" />
                    <span className="text-lg lg:text-xl">💵</span> <span className="font-bold text-xs lg:text-sm">Efectivo</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border-2 cursor-pointer transition-colors ${!isCash ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" checked={!isCash} onChange={() => setIsCash(false)} className="hidden" />
                    <span className="text-lg lg:text-xl">💳</span> <span className="font-bold text-xs lg:text-sm">Tarjeta</span>
                </label>
            </div>

            <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full rounded-xl bg-primary px-3 py-3 lg:px-4 lg:py-4 text-xs lg:text-sm font-bold text-white hover:brightness-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-widest">
              Aplicar Compra
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'info' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col gap-4 border border-gray-100">
              <div className="flex items-center gap-3 text-red-500 border-b border-gray-100 pb-3">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-xl font-extrabold text-gray-900">{errorModal.title}</h3>
              </div>
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 max-h-64 overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono break-words">{errorModal.details}</pre>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setErrorModal({ isOpen: false, title: "", details: "" })} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg cursor-pointer">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}