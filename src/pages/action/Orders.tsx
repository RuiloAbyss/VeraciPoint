import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { fetchProducts, createProduct, uploadPhoto, type Product } from "../../services/productService";
import { fetchTopProducts, type TopProduct } from "../../services/sellsService";
import { fetchOrders, fetchOrderDetails, registerOrder, updateOrderStatus, fetchProviders, addProvider, toggleProvider, editProvider, type Order, type OrderDetail, type Provider } from "../../services/orderService";
import { ProductFormModal } from "../../components/InventoryModals";

export function Orders() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  
  const [activeTab, setActiveTab] = useState<'providers' | 'history'>('providers');
  const [sessionEmpId, setSessionEmpId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [providersData, setProvidersData] = useState<Provider[]>([]);
  const [sales30Days, setSales30Days] = useState<TopProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<{ msg: string, type: 'success'|'error' } | null>(null);

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showInactiveProviders, setShowInactiveProviders] = useState(false);
  const [searchProd, setSearchProd] = useState("");
  const [cart, setCart] = useState<OrderDetail[]>([]);
  const [cartTotal, setCartTotal] = useState<string>("");

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeDetails, setActiveDetails] = useState<OrderDetail[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta'>('Efectivo');
  
  const [editTotal, setEditTotal] = useState<string>("");
  const [registerCash, setRegisterCash] = useState<string>("");
  const [externalFund, setExternalFund] = useState<string>(""); 
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Objeto completo para manejar el formulario del proveedor
  const [providerModal, setProviderModal] = useState({ isOpen: false, id: null as string | null, name: "", originalName: "", description: "", cellphone: "" });
  
  const [isExtraPanelOpen, setIsExtraPanelOpen] = useState(false);
  const [extraSearch, setExtraSearch] = useState("");

  const showToastMsg = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleNumericText = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
        val = val.replace(/^0+/, '');
    }
    setter(val);
  };

  const preventNegative = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords, provs] = await Promise.all([
          fetchProducts(),
          fetchOrders(),
          fetchProviders()
      ]);
      setProducts(prods);
      setOrders(ords);
      setProvidersData(provs);
      
      const d = new Date();
      const end = d.toISOString().split('T')[0];
      d.setDate(d.getDate() - 30);
      const start = d.toISOString().split('T')[0];
      setSales30Days(await fetchTopProducts(start, end));
    } catch (e) {
      showToastMsg("Error de conexión con la base de datos", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("userSession");
    if (raw) {
        const parsed = JSON.parse(raw);
        setSessionEmpId(parsed.employeeId || 0);
        setIsAdmin(Boolean(parsed.isAdmin ?? parsed.is_admin));
    }
    loadData();
  }, []);

  const visibleProviders = useMemo(() => {
    return providersData.filter(p => showInactiveProviders ? true : p.status);
  }, [providersData, showInactiveProviders]);

  const selectedProviderObj = useMemo(() => {
    return providersData.find(p => p.name === selectedProvider) || null;
  }, [providersData, selectedProvider]);

  const providerProducts = useMemo(() => {
    if (!selectedProvider) return [];
    let list = products.filter(p => p.category === selectedProvider);
    if (searchProd) list = list.filter(p => p.name.toLowerCase().includes(searchProd.toLowerCase()));
    return list;
  }, [products, selectedProvider, searchProd]);

  const availableProductsForActiveOrder = useMemo(() => {
    if (!activeOrder) return [];
    return products.filter(p => p.category === activeOrder.provider && !activeDetails.some(ad => ad.productId === p.id));
  }, [products, activeOrder, activeDetails]);

  const filteredExtraProducts = useMemo(() => {
    if (!extraSearch) return availableProductsForActiveOrder;
    return availableProductsForActiveOrder.filter(p => p.name.toLowerCase().includes(extraSearch.toLowerCase()));
  }, [availableProductsForActiveOrder, extraSearch]);

  const handleAddToCart = (p: Product) => {
    setCart(prev => {
      if (prev.find(i => i.productId === p.id)) return prev;
      let defaultQty = 1;
      if (p.maxStock !== null && p.maxStock !== undefined && p.maxStock > 0) {
          const diff = Number(p.maxStock) - Number(p.stock);
          if (diff > 0) defaultQty = diff;
      }
      return [...prev, { productId: p.id, name: p.name, expectedQty: defaultQty, receivedQty: null, unitCost: 0, subtotal: 0 }];
    });
  };

  const updateCart = (id: number, val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
    const num = cleanVal === "" ? 0 : parseFloat(cleanVal);
    setCart(prev => prev.map(i => i.productId === id ? { ...i, expectedQty: num } : i));
  };

  const submitDraft = async () => {
    if (cart.length === 0 || !selectedProvider) return;
    setLoading(true);
    try {
      const finalTotal = cartTotal === "" ? 0 : Number(cartTotal);
      await registerOrder(selectedProvider, sessionEmpId, finalTotal, cart);
      setCart([]);
      setCartTotal("");
      setSelectedProvider(null);
      setActiveTab('history');
      await loadData();
      showToastMsg("Orden generada en borrador", 'success');
    } catch (e) {
      showToastMsg("Error al generar orden", 'error');
    } finally { setLoading(false); }
  };

  const openOrder = async (o: Order) => {
    setLoading(true);
    try {
      const dets = await fetchOrderDetails(o.orderId);
      const mappedDets = dets.map(d => ({ ...d, receivedQty: d.receivedQty === null ? d.expectedQty : d.receivedQty }));
      setActiveDetails(mappedDets);
      setActiveOrder(o);
      setEditTotal(o.total > 0 ? o.total.toString() : "");
      setRegisterCash(o.total > 0 ? o.total.toString() : "");
      setExternalFund("0");
      setPaymentMethod('Efectivo');
      setExtraSearch("");
      setIsExtraPanelOpen(false);
    } finally { setLoading(false); }
  };

  const updateActiveDetail = (id: number, val: string) => {
    const cleanVal = val.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
    const num = cleanVal === "" ? 0 : parseFloat(cleanVal);
    setActiveDetails(prev => prev.map(i => i.productId === id ? { ...i, receivedQty: num } : i));
  };

  const removeActiveDetail = (id: number) => {
    setActiveDetails(prev => prev.filter(d => d.productId !== id));
  };

  const isMathAccurate = () => {
    if (activeDetails.length === 0) return false;
    if (paymentMethod === 'Tarjeta') return editTotal !== "" && Number(editTotal) >= 0;
    const tReq = Number(editTotal) || 0;
    const rC = Number(registerCash) || 0;
    const eF = Number(externalFund) || 0;
    if (tReq <= 0 && rC === 0 && eF === 0) return true;
    return Math.abs((rC + eF) - tReq) < 0.01;
  };

  const saveOrderState = async (newStatus: 'Pagada' | 'Cancelada') => {
    if (!activeOrder) return;
    if (newStatus === 'Pagada') {
        if (activeDetails.length === 0) {
            showToastMsg("Error: El pedido no puede estar vacío.", "error"); return;
        }
        if (!isMathAccurate()) {
            showToastMsg("Error: La caja y el fondo no suman el total.", "error"); return;
        }
    }
    setLoading(true);
    try {
      const finalDetails = activeDetails.map(d => ({
        ...d,
        receivedQty: newStatus === 'Pagada' ? (d.receivedQty || 0) : 0,
        subtotal: 0,
        unitCost: 0
      }));
      let total = activeOrder.total;
      let method = paymentMethod as string | null;
      let finalRegisterCash = 0;
      let finalExternalFund = 0;

      if (newStatus === 'Pagada') {
          if (paymentMethod === 'Efectivo') {
              finalRegisterCash = Number(registerCash) || 0;
              finalExternalFund = Number(externalFund) || 0;
              total = finalRegisterCash + finalExternalFund; 
              method = 'Efectivo';
          } else {
              total = Number(editTotal);
              method = 'Tarjeta';
          }
      } else {
          method = null;
      }

      await updateOrderStatus(activeOrder.orderId, sessionEmpId, newStatus, method, total, finalRegisterCash, finalExternalFund, finalDetails);
      setActiveOrder(null);
      setIsCancelModalOpen(false);
      await loadData();
      showToastMsg(`Orden finalizada correctamente`, 'success');
    } catch (e: any) {
      showToastMsg(typeof e === 'string' ? e : "Error interno al procesar.", 'error');
    } finally { setLoading(false); }
  };

  const handleCreateProduct = async (data: any) => {
    setLoading(true);
    try {
      const code = data.barcode ? parseInt(data.barcode) : null;
      const cat = selectedProvider || activeOrder?.provider || data.category;
      const newId = await createProduct(data.name, data.price, cat, code, data.sellformat, data.quantity, data.minStock, data.maxStock);
      if (data.newPhotoBase64) await uploadPhoto(newId, data.newPhotoBase64);
      setIsProductModalOpen(false);
      await loadData();
      showToastMsg("Producto añadido exitosamente", 'success');
    } catch (e) {
      showToastMsg("Error al crear producto", 'error');
    } finally { setLoading(false); }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = providerModal.name.trim();
    const cleanDesc = providerModal.description.trim() || null;
    const cleanCell = providerModal.cellphone.trim() || null;
    if (!cleanName) return;
    
    setLoading(true);
    try {
        if (providerModal.id) {
            await editProvider(providerModal.id, cleanName, cleanDesc, cleanCell);
            if (selectedProvider === providerModal.originalName) setSelectedProvider(cleanName);
            showToastMsg("Proveedor actualizado exitosamente", 'success');
        } else {
            await addProvider(cleanName, cleanDesc, cleanCell);
            showToastMsg("Proveedor creado exitosamente", 'success');
        }
        setProviderModal({ isOpen: false, id: null, name: "", originalName: "", description: "", cellphone: "" });
        await loadData();
    } catch (e) {
        showToastMsg("Error al guardar proveedor", 'error');
    } finally { setLoading(false); }
  };

  const handleToggleProviderStatus = async (name: string, currentStatus: boolean) => {
    setLoading(true);
    try {
        await toggleProvider(name, currentStatus);
        await loadData();
        showToastMsg(`Proveedor ${currentStatus ? 'ocultado' : 'activado'}`, 'success');
    } catch (e) {
        showToastMsg("Error al actualizar proveedor", 'error');
    } finally { setLoading(false); }
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-gray-900 z-20 bg-gray-50/50 backdrop-blur-sm" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Logística</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Reabastecimiento</h1>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button onClick={() => setActiveTab('providers')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'providers' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-800'}`}>Catálogo de Proveedores</button>
          <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'history' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-800'}`}>Control de Pedidos</button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {activeTab === 'providers' ? (
          <>
            <section className="flex-col w-full lg:w-1/3 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm overflow-hidden flex">
              <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                  <h2 className="text-lg font-extrabold text-gray-900">Proveedores ({visibleProviders.length})</h2>
                  {isAdmin && (
                      <button onClick={() => setProviderModal({ isOpen: true, id: null, name: "", originalName: "", description: "", cellphone: "" })} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 cursor-pointer transition-colors">+ Alta</button>
                  )}
              </div>
              
              {/* BARRA DE HERRAMIENTAS HORIZONTAL LIMPIA */}
              {isAdmin && (
                  <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 cursor-pointer uppercase tracking-wider ml-1">
                          <input type="checkbox" checked={showInactiveProviders} onChange={e => setShowInactiveProviders(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                          Mostrar inactivos
                      </label>
                      {selectedProviderObj && (
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => setProviderModal({ isOpen: true, id: selectedProviderObj.id, name: selectedProviderObj.name, originalName: selectedProviderObj.name, description: selectedProviderObj.description || "", cellphone: selectedProviderObj.cellphone || "" })} 
                                  className="text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer bg-white text-blue-600 border border-gray-200 hover:border-blue-200 hover:text-blue-700 shadow-sm uppercase tracking-wider"
                              >
                                  ✏️ Editar
                              </button>
                              <button 
                                  onClick={() => handleToggleProviderStatus(selectedProviderObj.name, selectedProviderObj.status)} 
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer uppercase tracking-wider bg-white border border-gray-200 shadow-sm ${selectedProviderObj.status ? 'text-red-500 hover:border-red-200 hover:text-red-600' : 'text-green-600 hover:border-green-200 hover:text-green-700'}`}
                              >
                                  {selectedProviderObj.status ? '👁️ Ocultar' : '👁️‍🗨️ Activar'}
                              </button>
                          </div>
                      )}
                  </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {visibleProviders.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProvider(p.name); setCart([]); setCartTotal(""); }} className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer flex justify-between items-center ${selectedProvider === p.name ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' : 'bg-gray-50 border-gray-200 hover:border-primary/50 text-gray-700'}`}>
                      <span className={`font-bold truncate ${!p.status ? 'text-gray-400 line-through' : ''}`}>{p.name}</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm text-gray-900 shrink-0 uppercase font-bold">{products.filter(pr => pr.category === p.name).length} Prod</span>
                  </button>
                ))}
              </div>
            </section>
            
            <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm overflow-hidden flex relative">
              {!selectedProviderObj ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><span className="text-4xl mb-2">📦</span><p className="font-bold">Selecciona un proveedor para ver su catálogo</p></div>
              ) : (
                <>
                  <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-3">
                    <div className="max-w-[60%]">
                        <h3 className="text-xl font-extrabold text-gray-900">{selectedProviderObj.name}</h3>
                        {(selectedProviderObj.cellphone || selectedProviderObj.description) && (
                            <p className="text-xs text-gray-500 mt-1.5 flex flex-col gap-0.5 leading-relaxed">
                                {selectedProviderObj.cellphone && <span>📞 Contacto: <strong className="text-gray-700">{selectedProviderObj.cellphone}</strong></span>}
                                {selectedProviderObj.description && <span>{selectedProviderObj.description}</span>}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 items-center flex-1 justify-end ml-4">
                        <input type="text" placeholder="Filtrar catálogo..." value={searchProd} onChange={e => setSearchProd(e.target.value)} className="w-full max-w-[200px] rounded-lg bg-gray-50 px-3 py-2 text-sm outline-none border border-gray-200 focus:border-primary" />
                        <button onClick={() => setIsProductModalOpen(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-gray-800 cursor-pointer whitespace-nowrap">+ Alta Producto</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4 grid grid-cols-1 md:grid-cols-2 gap-2 content-start">
                    {providerProducts.map(p => {
                      const salesInfo = sales30Days.find(s => s.name === p.name);
                      const isAdded = cart.some(c => c.productId === p.id);
                      return (
                        <div key={p.id} className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-colors ${isAdded ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}`}>
                          <div>
                            <div className="flex justify-between items-start"><p className="font-bold text-sm text-gray-900 truncate">{p.name}</p><span className="text-[10px] font-extrabold text-gray-500">Stock: {p.stock} {p.maxStock && `/ ${p.maxStock}`}</span></div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Ventas 30D: <span className={salesInfo ? 'text-green-600' : 'text-gray-400'}>{salesInfo ? salesInfo.quantity : 0} U</span></p>
                          </div>
                          <button disabled={isAdded} onClick={() => handleAddToCart(p)} className={`w-full py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${isAdded ? 'bg-primary text-white cursor-default' : 'bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary'}`}>
                            {isAdded ? 'En Pedido ✅' : 'Añadir a Pedido'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  {cart.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 shrink-0 bg-white">
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 mb-3 pr-2">
                        {cart.map(item => (
                          <div key={item.productId} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <button onClick={() => setCart(c => c.filter(x => x.productId !== item.productId))} className="text-red-500 font-bold px-2 cursor-pointer text-xs">✕</button>
                            <span className="flex-1 text-xs font-bold truncate">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Solicitar:</span>
                              <input type="text" inputMode="decimal" value={item.expectedQty === 0 ? "" : item.expectedQty} onChange={e => { let v = e.target.value.replace(/[^0-9.]/g, ''); updateCart(item.productId, v); }} onKeyDown={preventNegative} className="w-16 p-1 text-xs border rounded text-center outline-none focus:border-primary" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-1/2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Costo Estimado (Opcional)</label>
                          <input type="text" inputMode="decimal" value={cartTotal} onChange={handleNumericText(setCartTotal)} onKeyDown={preventNegative} className="w-full text-2xl font-extrabold text-gray-900 border-b-2 border-gray-300 outline-none focus:border-primary bg-transparent transition-colors" placeholder="0.00" />
                        </div>
                        <button onClick={submitDraft} className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:brightness-90 cursor-pointer text-sm">Generar Orden</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ) : (
          <section className="flex-col flex-1 rounded-2xl bg-white border border-gray-200 p-4 shadow-sm overflow-hidden flex">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr><th className="p-4">Folio</th><th className="p-4">Proveedor</th><th className="p-4">Creado</th><th className="p-4">Estado</th><th className="p-4 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-bold">No hay pedidos registrados.</td></tr>}
                {orders.map(o => (
                  <tr key={o.orderId} onClick={() => openOrder(o)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="p-4 font-extrabold text-gray-900">#{o.orderId}</td>
                    <td className="p-4 font-bold text-gray-700">{o.provider}</td>
                    <td className="p-4 text-gray-500">{o.createdAt.split(' ')[0]}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${o.status==='Generada'?'bg-blue-50 text-blue-600 border-blue-200':o.status==='Cancelada'?'bg-red-50 text-red-600 border-red-200':'bg-green-50 text-green-600 border-green-200'}`}>{o.status}</span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-gray-900">${o.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* MODAL GESTION DE ORDEN EXPANDIBLE */}
      <AnimatePresence>
        {activeOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }} 
              className={`bg-white rounded-3xl shadow-2xl p-6 flex flex-col border border-gray-100 max-h-[90vh] transition-all duration-300 ${isExtraPanelOpen ? 'w-[900px]' : 'w-[650px]'}`}
            >
              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">Pedido #{activeOrder.orderId} • {activeOrder.provider}</h3>
                  <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">
                    Estado: <span className={activeOrder.status === 'Pagada' ? 'text-green-600' : activeOrder.status === 'Cancelada' ? 'text-red-600' : 'text-primary'}>{activeOrder.status}</span>
                  </p>
                </div>
                <button onClick={() => setActiveOrder(null)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer font-bold">✕</button>
              </div>

              <div className="flex gap-6 flex-1 overflow-hidden">
                  <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 mb-2">
                        {activeDetails.length === 0 && activeOrder.status === 'Generada' && (
                            <div className="text-center py-4 text-gray-400 font-bold">El pedido está vacío. Añade productos o cancela el pedido.</div>
                        )}
                        {activeDetails.map(d => (
                          <div key={d.productId} className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                            {activeOrder.status === 'Generada' && (
                                <button onClick={() => removeActiveDetail(d.productId)} className="text-red-500 font-extrabold px-1 cursor-pointer text-xs hover:scale-125 transition-transform" title="Quitar producto">✕</button>
                            )}
                            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-900 truncate">{d.name}</p></div>
                            {d.expectedQty > 0 && (
                                <div className="flex flex-col items-center"><span className="text-[10px] text-gray-400 font-bold uppercase mb-1">Solicitado</span><span className="font-bold text-sm">{d.expectedQty}</span></div>
                            )}
                            {activeOrder.status === 'Generada' ? (
                              <div className="flex flex-col items-center w-24">
                                <span className="text-[10px] text-primary font-bold uppercase mb-1">Llegó</span>
                                <input type="text" inputMode="decimal" value={d.receivedQty === 0 ? "" : d.receivedQty} onChange={e => { let v = e.target.value.replace(/[^0-9.]/g, ''); updateActiveDetail(d.productId, v); }} onKeyDown={preventNegative} className="w-full border border-primary rounded p-1 text-center font-bold text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center w-24"><span className="text-[10px] text-gray-500 font-bold uppercase mb-1">Llegó</span><span className="font-bold text-sm text-gray-700">{d.receivedQty}</span></div>
                            )}
                          </div>
                        ))}
                      </div>

                      {activeOrder.status === 'Generada' && (
                        <button 
                            onClick={() => setIsExtraPanelOpen(!isExtraPanelOpen)} 
                            className={`w-full text-xs font-bold px-4 py-2.5 rounded-xl border transition-colors flex justify-between items-center shrink-0 mb-4 cursor-pointer ${isExtraPanelOpen ? 'bg-primary border-primary text-white' : 'bg-white border-primary/30 text-primary hover:bg-primary/5'}`}
                        >
                            <span>{isExtraPanelOpen ? 'Cerrar panel de catálogo' : '+ Añadir mercancía extra que trajo el proveedor...'}</span>
                            <span className="text-lg font-mono leading-none">{isExtraPanelOpen ? '<' : '>'}</span>
                        </button>
                      )}

                      <div className="border-t border-gray-100 pt-4 shrink-0 flex flex-col gap-4">
                        {activeOrder.status === 'Generada' ? (
                          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-2">
                            <div className="flex flex-col md:flex-row gap-6 mb-4">
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Costo Final Acordado ($)</span>
                                    <input type="text" inputMode="decimal" value={editTotal} onChange={handleNumericText(setEditTotal)} onKeyDown={preventNegative} className="w-full text-3xl font-extrabold text-gray-900 border-b-2 border-gray-300 outline-none focus:border-primary bg-transparent transition-colors" />
                                </div>
                                <div className="flex-1 flex flex-col justify-end gap-2">
                                    <label className={`px-4 py-2 flex items-center justify-center gap-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${paymentMethod === 'Efectivo' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                        <input type="radio" className="hidden" checked={paymentMethod === 'Efectivo'} onChange={() => setPaymentMethod('Efectivo')} /> 💵 Efectivo
                                    </label>
                                    <label className={`px-4 py-2 flex items-center justify-center gap-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${paymentMethod === 'Tarjeta' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                        <input type="radio" className="hidden" checked={paymentMethod === 'Tarjeta'} onChange={() => setPaymentMethod('Tarjeta')} /> 💳 Tarjeta / Transf.
                                    </label>
                                </div>
                            </div>
                            
                            {paymentMethod === 'Efectivo' && (
                                <div className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm mt-2">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Retirado de Caja ($)</span>
                                        <input type="text" inputMode="decimal" value={registerCash} onChange={handleNumericText(setRegisterCash)} onKeyDown={preventNegative} className="w-full text-xl font-extrabold text-primary border-b border-gray-200 outline-none focus:border-primary transition-colors" />
                                    </div>
                                    <div className="flex-1 border-l border-gray-100 pl-4">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Fondo Administrativo ($)</span>
                                        <input type="text" inputMode="decimal" value={externalFund} onChange={handleNumericText(setExternalFund)} onKeyDown={preventNegative} className="w-full text-xl font-extrabold text-blue-600 border-b border-gray-200 outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                </div>
                            )}
                          </div>
                        ) : activeOrder.status === 'Pagada' ? (
                          <div className="flex justify-between items-end mb-2">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                              Sello de Cierre: <span className="text-gray-900">{activeOrder.completedAt}</span><br/>
                              Pago: <span className={activeOrder.paymentMethod === 'Efectivo' ? 'text-primary' : 'text-blue-600'}>{activeOrder.paymentMethod}</span>
                              {activeOrder.paymentMethod === 'Efectivo' && (
                                  <div className="mt-1 font-bold text-[10px] text-gray-500 border-t border-gray-200 pt-1">
                                      Caja: <span className="text-primary">${activeOrder.cashRegisterAmount?.toFixed(2)}</span> | Fondo Admin: <span className="text-blue-600">${activeOrder.externalFundAmount?.toFixed(2)}</span>
                                  </div>
                              )}
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Pagado</span>
                                <span className="text-3xl font-extrabold text-gray-900">${activeOrder.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : activeOrder.status === 'Cancelada' ? (
                          <div className="text-center text-xs font-bold text-red-500 uppercase tracking-widest bg-red-50 py-3 rounded-xl border border-red-100">
                             Este pedido fue cancelado y no procesado.
                          </div>
                        ) : <div/>}

                        <div className="flex gap-3 items-center">
                          {isAdmin && activeOrder.status === 'Generada' && (
                              <button onClick={() => setIsCancelModalOpen(true)} className="bg-red-50 text-red-600 font-bold px-6 py-3 rounded-xl border border-red-100 hover:bg-red-100 hover:border-red-200 cursor-pointer transition-colors shadow-sm whitespace-nowrap text-sm">Cancelar Pedido</button>
                          )}
                          {activeOrder.status === 'Generada' && <button onClick={() => saveOrderState('Pagada')} disabled={!isMathAccurate()} className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-md hover:brightness-90 cursor-pointer disabled:opacity-50 transition-colors text-sm">Confirmar Recepción Física, Pago y Surtir</button>}
                          {(activeOrder.status === 'Pagada' || activeOrder.status === 'Cancelada') && <button onClick={() => setActiveOrder(null)} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 cursor-pointer transition-colors text-sm">Cerrar Detalle</button>}
                        </div>
                      </div>
                  </div>

                  <AnimatePresence>
                      {isExtraPanelOpen && activeOrder.status === 'Generada' && (
                          <motion.div 
                              initial={{ width: 0, opacity: 0 }} 
                              animate={{ width: 300, opacity: 1 }} 
                              exit={{ width: 0, opacity: 0 }} 
                              className="border-l border-gray-100 pl-6 flex flex-col shrink-0"
                          >
                              <h4 className="text-sm font-extrabold text-gray-900 mb-3 truncate">Catálogo de {activeOrder.provider}</h4>
                              <input 
                                  type="text" 
                                  placeholder="Buscar producto..." 
                                  value={extraSearch} 
                                  onChange={e => setExtraSearch(e.target.value)} 
                                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold mb-3 transition-colors" 
                              />
                              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                  {filteredExtraProducts.length > 0 ? (
                                      filteredExtraProducts.map(ap => (
                                          <button 
                                              key={ap.id} 
                                              type="button" 
                                              onClick={() => setActiveDetails(prev => [...prev, { productId: ap.id, name: ap.name, expectedQty: 0, receivedQty: 1, unitCost: 0, subtotal: 0 }])}
                                              className="w-full text-left px-3 py-2.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:border-primary hover:text-primary rounded-lg transition-colors cursor-pointer shadow-sm truncate"
                                          >
                                              {ap.name}
                                          </button>
                                      ))
                                  ) : (
                                      <div className="text-center text-xs text-gray-400 font-bold py-4">No se encontraron productos disponibles.</div>
                                  )}
                              </div>
                              <button 
                                  onClick={() => setIsProductModalOpen(true)} 
                                  className="mt-4 w-full bg-gray-900 text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-gray-800 transition-colors cursor-pointer"
                              >
                                  + Alta Producto
                              </button>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ALTA/EDICIÓN DE PROVEEDOR */}
      <AnimatePresence>
        {providerModal.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-gray-100">
                <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b border-gray-100 pb-2">{providerModal.id ? 'Editar Proveedor' : 'Alta de Proveedor'}</h3>
                <form onSubmit={handleSaveProvider} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nombre Comercial</label>
                        <input type="text" required value={providerModal.name} onChange={e => setProviderModal({ ...providerModal, name: e.target.value })} autoFocus className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Teléfono (Opcional)</label>
                        <input type="text" placeholder="Ej. 311-222-3344" value={providerModal.cellphone} onChange={e => setProviderModal({ ...providerModal, cellphone: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Descripción / Notas (Opcional)</label>
                        <textarea rows={3} placeholder="Días de visita, horarios, notas..." value={providerModal.description} onChange={e => setProviderModal({ ...providerModal, description: e.target.value })} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={() => setProviderModal({ isOpen: false, id: null, name: "", originalName: "", description: "", cellphone: "" })} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 cursor-pointer transition-all">Guardar</button>
                    </div>
                </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CANCELAR PEDIDO */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 text-center">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 bg-red-100 text-red-600 shadow-sm border border-red-200">
                    ⚠️
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Cancelar Pedido</h3>
                <p className="text-sm font-bold text-gray-500 mb-6 leading-relaxed">
                    Estás a punto de anular el pedido <strong className="text-gray-900">#{activeOrder?.orderId}</strong>. Esta acción detendrá su proceso de forma irreversible.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer border border-gray-200">Volver</button>
                    <button onClick={() => saveOrderState('Cancelada')} className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-colors bg-red-600 hover:bg-red-700 cursor-pointer">Confirmar Cancelación</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ALTA PRODUCTO */}
      <AnimatePresence>
        {isProductModalOpen && (
           <div className="relative z-[80]">
             <ProductFormModal isOpen={true} product={null} categories={[selectedProvider || activeOrder?.provider || "Categoría"]} onClose={() => setIsProductModalOpen(false)} onSave={handleCreateProduct} />
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-[90] left-1/2 -translate-x-1/2">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm bg-gray-900 text-white border border-gray-700`}>{toast.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}