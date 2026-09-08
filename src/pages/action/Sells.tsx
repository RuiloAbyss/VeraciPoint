import { useState, useEffect, useMemo, useRef } from "react";
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
  const [categoryFilter, setCategoryFilter] = useState("Categoría");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCash, setIsCash] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; 

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, activeTab]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try { 
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []); 
    } 
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

  const safeProducts = useMemo(() => Array.isArray(products) ? products : [], [products]);

  const uniqueCategories = useMemo(() => {
    const rawCats = Array.from(new Set(safeProducts.map(p => p.category || "Sin Categoría")))
      .filter(c => c !== "Categoría" && c !== "Todas las Categorías" && c !== "Ofertas")
      .sort((a, b) => a.localeCompare(b));
    return ["Categoría", "Ofertas", ...rawCats];
  }, [safeProducts]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return uniqueCategories;
    const lower = categorySearch.toLowerCase();
    return uniqueCategories.filter(c => c.toLowerCase().includes(lower) || c === "Categoría");
  }, [uniqueCategories, categorySearch]);

  const filteredProducts = useMemo(() => {
    let result = safeProducts.filter(p => p.status !== 0 && (Number(p.stock) || 0) > 0);
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(lower)) || 
        (p.barcode && p.barcode.toString().includes(lower)) || 
        (p.category && p.category.toLowerCase().includes(lower))
      );
    }
    if (categoryFilter !== "Categoría" && categoryFilter !== "Todas las Categorías") {
        result = result.filter(p => p.category === categoryFilter);
    }
    return result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [safeProducts, searchTerm, categoryFilter]);

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
        if (Number(existing.quantity) >= (Number(product.stock) || 0)) {
            showToast("Stock máximo alcanzado", "info");
            return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: Number(item.quantity) + 1 } : item);
      }
      return [...prev, { product, quantity: 1, finalPrice: Number(product.price) || 0 }];
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
        if (field === 'quantity' && typeof num === 'number' && num > (Number(item.product.stock) || 0)) {
            showToast(`Solo hay ${item.product.stock} disponibles`, "info");
            return { ...item, quantity: Number(item.product.stock) || 0 };
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
        productName: item.product.name,
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

  const renderPagination = (totalItems: number) => {
    if (totalItems === 0) return null;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex justify-between items-center mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200 shrink-0 gap-1">
        <button 
          disabled={currentPage === 1} 
          onClick={() => setCurrentPage(p => p - 1)} 
          className="px-2 py-1.5 lg:px-4 lg:py-2 bg-white border border-gray-200 rounded-lg text-[10px] lg:text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm"
        >
          <span className="hidden sm:inline">Anterior</span><span className="sm:hidden">◀</span>
        </button>
        <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-gray-500 text-center leading-tight">
          Mostrando {start} - {end} <br className="sm:hidden"/> de {totalItems} productos
        </span>
        <button 
          disabled={currentPage === totalPages} 
          onClick={() => setCurrentPage(p => p + 1)} 
          className="px-2 py-1.5 lg:px-4 lg:py-2 bg-white border border-gray-200 rounded-lg text-[10px] lg:text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm"
        >
          <span className="hidden sm:inline">Siguiente</span><span className="sm:hidden">▶</span>
        </button>
      </div>
    );
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

      <div className="flex flex-row gap-2 lg:gap-4 flex-1 min-h-0 w-full overflow-hidden">
        
        <div className="flex flex-col flex-1 min-w-[120px] gap-2 lg:gap-3 min-h-0">
            <div className="flex flex-col xl:flex-row items-center gap-2 rounded-xl bg-white border border-gray-200 p-2 shadow-sm shrink-0">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="🔍 Buscar..." autoFocus className="w-full rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
                
                <div className="relative w-full xl:w-1/3" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryOpen(prev => !prev)}
                    className="w-full flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 text-gray-700 outline-none hover:border-gray-300 cursor-pointer"
                  >
                    <span className={`truncate font-medium ${categoryFilter === "Ofertas" ? "text-orange-600 font-bold" : ""}`}>
                      {categoryFilter}
                    </span>
                    <span className="text-[10px] text-gray-400">▼</span>
                  </button>

                  {isCategoryOpen && (
                    <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Filtrar categoría..."
                        className="w-full rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs outline-none focus:border-primary"
                      />
                      <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col space-y-0.5">
                        {filteredCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategoryFilter(cat);
                              setIsCategoryOpen(false);
                              setCategorySearch("");
                            }}
                            className={`text-left px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                              categoryFilter === cat ? "bg-primary/10 text-primary" : "hover:bg-gray-100"
                            } ${cat === "Ofertas" ? "text-orange-600 font-bold hover:bg-orange-50" : "text-gray-700"}`}
                          >
                            {cat}
                          </button>
                        ))}
                        {filteredCategories.length === 0 && (
                          <span className="text-center text-xs text-gray-400 py-2">Sin coincidencias</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row bg-gray-200 rounded-xl p-1 shrink-0 gap-1 sm:gap-0">
                <button onClick={() => setActiveTab('regular')} className={`flex-1 py-1.5 lg:py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'regular' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Registrados</button>
                <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-1.5 lg:py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'bulk' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>A Granel</button>
            </div>

            <section className="flex-col flex-1 rounded-2xl bg-gray-100/50 border border-gray-200 p-2 lg:p-3 overflow-hidden flex">
                <div className="overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    {isLoading ? <div className="p-4 text-center font-bold text-gray-500">Cargando...</div> : 
                    activeTab === 'regular' ? (
                        <div className="space-y-2">
                            {paginatedList.map((prod) => {
                                const originalPrice = prod.category === "Ofertas" ? safeProducts.find(p => p.name === prod.name && p.category !== "Ofertas")?.price : undefined;
                                return (
                                  <ProductCard 
                                    key={prod.id} 
                                    {...prod} 
                                    price={Number(prod.price) || 0}
                                    stock={Number(prod.stock) || 0}
                                    code={prod.barcode?.toString() || "S/N"} 
                                    isSelected={false} 
                                    originalPrice={originalPrice ? Number(originalPrice) : undefined} 
                                    onClick={() => addToCart(prod)} 
                                  />
                                )
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 content-start">
                            {paginatedList.map((prod) => {
                                const originalPrice = prod.category === "Ofertas" ? safeProducts.find(p => p.name === prod.name && p.category !== "Ofertas")?.price : undefined;
                                return (
                                  <BulkProductCard 
                                    key={prod.id} 
                                    category={prod.category} 
                                    name={prod.name || ""} 
                                    pricePerKg={Number(prod.price) || 0} 
                                    stock={Number(prod.stock) || 0} 
                                    minStock={prod.minStock} 
                                    status={prod.status} 
                                    photo={prod.photo} 
                                    isSelected={false} 
                                    originalPrice={originalPrice ? Number(originalPrice) : undefined} 
                                    onClick={() => addToCart(prod)} 
                                  />
                                )
                            })}
                        </div>
                    )}
                </div>
                {totalPages > 1 && renderPagination(targetList.length)}
            </section>
        </div>

        <div className="flex flex-col w-[200px] sm:w-[280px] lg:w-[400px] shrink-0 rounded-2xl bg-white border border-gray-200 shadow-sm min-h-0 overflow-hidden">
          <div className="bg-gray-50 p-2 lg:p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h2 className="text-sm lg:text-lg font-bold text-gray-900 truncate">Lista de Cobro</h2>
            <span className="text-[10px] lg:text-xs font-extrabold text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <span className="text-4xl lg:text-5xl mb-2">🛒</span>
                    <p className="font-bold text-gray-500 text-xs lg:text-sm text-center">Vacío</p>
                </div>
            ) : (
                cart.map(item => {
                    const isPieza = item.product.sellformat?.toLowerCase() === 'pieza';
                    return (
                    <div key={item.product.id} className="flex flex-col gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border border-gray-200 bg-gray-50/50 relative group">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-5">
                                <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                    <p className="font-bold text-xs lg:text-sm text-gray-900 leading-tight truncate">{item.product.name}</p>
                                    <span className="text-[8px] lg:text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">{isPieza ? 'PZA' : 'KG'}</span>
                                </div>
                                <p className="text-[9px] lg:text-[10px] font-bold text-gray-400">P. Unit: ${(Number(item.product.price) || 0).toFixed(2)}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="absolute top-1 right-1 lg:top-2 lg:right-2 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-xs">✕</button>
                        </div>
                        
                        <div className="flex gap-1 lg:gap-2 items-center mt-1">
                            <div className="flex-[0.8] flex flex-col min-w-0">
                                <label className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase truncate">Cant</label>
                                <input type="number" min={isPieza ? "1" : "0"} step={isPieza ? "1" : "0.001"} value={item.quantity ?? ""} onChange={e => updateCartItem(item.product.id, 'quantity', e.target.value)} className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs font-bold text-center outline-none focus:border-primary min-w-0" />
                            </div>
                            <span className="text-gray-300 font-bold mt-3 lg:mt-4 text-xs">x</span>
                            <div className="flex-[0.8] flex flex-col min-w-0">
                                <label className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase truncate">P. Fin</label>
                                <input type="number" min="0" step="0.01" value={item.finalPrice ?? ""} onChange={e => updateCartItem(item.product.id, 'finalPrice', e.target.value)} disabled={!isAdmin} className="w-full rounded-md border border-gray-300 px-1 py-1 text-xs font-bold text-center outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:border-transparent min-w-0" />
                            </div>
                            <span className="text-gray-300 font-bold mt-3 lg:mt-4 text-xs">=</span>
                            <div className="flex-1 flex flex-col items-end pt-3 lg:pt-4 min-w-0">
                                <span className="font-extrabold text-primary text-xs lg:text-sm truncate">${((Number(item.quantity) || 0) * (Number(item.finalPrice) || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                )
                })
            )}
          </div>

          <div className="bg-gray-50 p-2 lg:p-4 border-t border-gray-200 shrink-0">
            <div className="flex justify-between items-center mb-2 lg:mb-4">
                <span className="text-xs lg:text-sm text-gray-500 font-bold">Total:</span>
                <span className="text-xl lg:text-3xl font-extrabold text-gray-900 truncate">${(cartTotal || 0).toFixed(2)}</span>
            </div>

            <div className="flex gap-1 lg:gap-2 mb-2 lg:mb-4">
                <label className={`flex-1 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border-2 cursor-pointer transition-colors ${isCash ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" checked={isCash} onChange={() => setIsCash(true)} className="hidden" />
                    <span className="text-sm lg:text-xl leading-none">💵</span> <span className="font-bold text-[10px] lg:text-sm">Efectivo</span>
                </label>
                <label className={`flex-1 flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 p-2 lg:p-3 rounded-xl border-2 cursor-pointer transition-colors ${!isCash ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                    <input type="radio" checked={!isCash} onChange={() => setIsCash(false)} className="hidden" />
                    <span className="text-sm lg:text-xl leading-none">💳</span> <span className="font-bold text-[10px] lg:text-sm">Tarjeta</span>
                </label>
            </div>

            <button disabled={cart.length === 0} onClick={handleCheckout} className="w-full rounded-xl bg-primary px-3 py-3 lg:px-4 lg:py-4 text-[10px] sm:text-xs lg:text-sm font-bold text-white hover:brightness-90 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider lg:tracking-widest">
              Cobrar
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