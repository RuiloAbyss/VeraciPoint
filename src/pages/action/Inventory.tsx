import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";
import { ProductFormModal, RestockModal, DeactivateModal } from "../../components/InventoryModals";
import { fetchProducts, restockProduct, deactivateProduct, activateProduct, discardStock, uploadPhoto, editProduct, createProduct, type Product } from "../../services/productService";

export function Inventory() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'regular' | 'bulk'>('regular');
  
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'cancel' | 'delete' | 'error' } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas las Categorías");
  const [stockFilter, setStockFilter] = useState("Niveles de Stock");
  const [sortOrder, setSortOrder] = useState("Ordenar: A-Z");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [modalState, setModalState] = useState<'none' | 'edit' | 'create' | 'restock' | 'deactivate'>('none');

  const showToast = (msg: string, type: 'success' | 'cancel' | 'delete' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try { setProducts(await fetchProducts()); } 
    catch (error) { showToast("Error al cargar datos", "error"); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem("userSession");
    if (raw) setIsAdmin(Boolean(JSON.parse(raw).isAdmin ?? JSON.parse(raw).is_admin));
    loadData();
  }, []);

  const uniqueCategories = useMemo(() => {
    const sortedCats = Array.from(new Set(products.map(p => p.category))).sort();
    return ["Todas las Categorías", ...sortedCats];
  }, [products]);
  
  const formCategories = uniqueCategories.filter(c => c !== "Todas las Categorías");

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower) || (p.barcode && p.barcode.toString().includes(lower)) || p.category.toLowerCase().includes(lower));
    }
    
    // Filtro por Estado y Topes
    if (stockFilter === "Inactivos (Bajas)") {
        result = result.filter(p => p.status === 0);
    } else {
        result = result.filter(p => p.status !== 0);
        if (stockFilter === "Bajo Stock") {
            result = result.filter(p => p.stock <= 0 || (p.minStock !== null && p.stock <= p.minStock));
        } else if (stockFilter === "En Abundancia") {
            result = result.filter(p => p.stock > 0 && (p.minStock === null || p.stock > p.minStock));
        }
    }

    if (categoryFilter !== "Todas las Categorías") result = result.filter(p => p.category === categoryFilter);
    
    if (sortOrder === "Ordenar: A-Z") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === "Ordenar: Z-A") result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === "Menor Precio") result.sort((a, b) => a.price - b.price);
    
    return result;
  }, [products, searchTerm, categoryFilter, stockFilter, sortOrder]);

  const regularProducts = filteredProducts.filter(p => p.barcode !== null);
  const bulkProducts = filteredProducts.filter(p => p.barcode === null);
  const selectedProduct = products.find(p => p.id === selectedId) || null;

  const executeRestock = async (qty: number) => {
    if (!selectedId) return;
    try {
      await restockProduct(selectedId, qty);
      showToast("Se sumaron existencias correctamente", "success");
      setModalState('none');
      loadData();
    } catch { showToast("Error al surtir inventario", "error"); }
  };

  const executeActivate = async () => {
    if (!selectedId) return;
    try {
      await activateProduct(selectedId);
      setSelectedId(null);
      showToast("Producto reactivado exitosamente", "success");
      loadData();
    } catch { showToast("Error al dar de alta", "error"); }
  };

  const executeFormSave = async (data: any) => {
    try {
      const code = data.barcode ? parseInt(data.barcode) : null;
      if (modalState === 'create') {
        const newId = await createProduct(data.name, data.price, data.category, code, data.sellformat, data.quantity, data.minStock, data.maxStock);
        if (data.newPhotoBase64) await uploadPhoto(newId, data.newPhotoBase64);
        showToast("Producto registrado exitosamente", "success");
      } else {
        if (!selectedId || !selectedProduct) return;
        const currentCode = selectedProduct.barcode ? selectedProduct.barcode.toString() : null;
        
        // Normalizamos a null para evitar falsos negativos en la detección de cambios
        const prevMin = selectedProduct.minStock ?? null;
        const prevMax = selectedProduct.maxStock ?? null;
        
        const hasChanges = 
            data.name !== selectedProduct.name || 
            data.price !== selectedProduct.price || 
            data.barcode !== currentCode || 
            data.category !== selectedProduct.category || 
            data.sellformat !== selectedProduct.sellformat ||
            data.minStock !== prevMin ||
            data.maxStock !== prevMax ||
            data.newPhotoBase64 !== null;

        if (!hasChanges) {
          setModalState('none');
          showToast("No se detectaron cambios", "cancel");
          return;
        }
        
        await editProduct(selectedId, data.name, data.price, code, data.category, data.sellformat, data.minStock, data.maxStock);
        if (data.newPhotoBase64) await uploadPhoto(selectedId, data.newPhotoBase64);
        showToast("Producto actualizado", "success");
      }
      setModalState('none');
      loadData();
    } catch { showToast("Error en el servidor", "error"); }
  };

  const executeDeactivate = async (mode: 'full' | 'partial', qty?: number) => {
    if (!selectedId) return;
    try {
      if (mode === 'full') {
        await deactivateProduct(selectedId);
        setSelectedId(null);
        showToast("Producto eliminado del inventario", "delete");
      } else if (qty && qty > 0) {
        await discardStock(selectedId, qty);
        showToast("Merma registrada correctamente", "success");
      }
      setModalState('none');
      loadData();
    } catch { showToast("Error procesando solicitud", "error"); }
  };

  const closeModals = () => {
    setModalState('none');
    showToast("Acción cancelada", "cancel");
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-on-bg z-20 bg-gray-50/50" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Módulo</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Control de Inventario</h1>
          </div>
        </div>
        {isAdmin && <button onClick={() => setModalState('create')} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-90 transition-all cursor-pointer">NUEVO PRODUCTO</button>}
      </header>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 rounded-xl bg-white border border-gray-200 p-3 shadow-sm shrink-0">
        <div className="flex-1 w-full min-w-0">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar nombre o código..." className="w-full rounded-lg bg-gray-50 px-4 py-2 text-sm outline-none border border-gray-200 focus:border-primary" />
        </div>
        
        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 text-gray-700 col-span-2 sm:col-span-1">
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="w-full rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 text-gray-700">
            <option value="Niveles de Stock">Niveles de Stock</option>
            <option value="Bajo Stock">Bajo Stock</option>
            <option value="En Abundancia">En Abundancia</option>
            <option value="Inactivos (Bajas)">Inactivos (Bajas)</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 text-gray-700">
            <option value="Ordenar: A-Z">Ordenar: A-Z</option>
            <option value="Ordenar: Z-A">Ordenar: Z-A</option>
            <option value="Menor Precio">Menor Precio</option>
          </select>
        </div>

        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />

        <div className={`grid ${selectedProduct?.status === 0 ? "grid-cols-1" : "grid-cols-3"} gap-2 w-full lg:w-auto transition-opacity duration-300 ${selectedProduct ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          {selectedProduct?.status === 0 ? (
            <button onClick={executeActivate} className="w-full rounded-lg bg-green-100 hover:bg-green-500 hover:text-white py-2 px-6 text-xs font-bold text-green-700 shadow-sm cursor-pointer transition-colors">
              ⬆️ Dar de Alta
            </button>
          ) : (
            <>
              <button onClick={() => setModalState('restock')} className="w-full rounded-lg bg-primary/10 hover:bg-primary hover:text-white py-2 text-xs font-bold text-primary shadow-sm cursor-pointer">+ Surtir</button>
              <button disabled={!isAdmin} onClick={() => setModalState('edit')} className={`w-full rounded-lg py-2 text-xs font-bold shadow-sm ${isAdmin ? "bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400"}`}>✏️ Editar</button>
              <button disabled={!isAdmin} onClick={() => setModalState('deactivate')} className={`w-full rounded-lg py-2 text-xs font-bold shadow-sm ${isAdmin ? "bg-red-50 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400"}`}>🗑️ Baja</button>
            </>
          )}
        </div>
      </div>  

      <div className="flex lg:hidden bg-gray-200 rounded-xl p-1 shrink-0">
        <button onClick={() => setActiveTab('regular')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'regular' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Registrados ({regularProducts.length})</button>
        <button onClick={() => setActiveTab('bulk')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${activeTab === 'bulk' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>A Granel ({bulkProducts.length})</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <section className={`flex-col flex-1 rounded-2xl bg-gray-100/50 border border-gray-200 p-4 overflow-hidden ${activeTab === 'regular' ? 'flex' : 'hidden lg:flex'}`}>
          <h2 className="hidden lg:flex text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 justify-between items-center">
            Productos Registrados
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wide">
              {regularProducts.length} Registrados
            </span>
          </h2>
          <div className="overflow-y-auto pr-1 space-y-2 flex-1 custom-scrollbar">
            {isLoading ? <div className="p-4 text-center font-bold text-gray-500">Cargando...</div> : 
              regularProducts.map((prod) => (
                <ProductCard key={prod.id} {...prod} code={prod.barcode?.toString() || "S/N"} isSelected={selectedId === prod.id} onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} />
              ))}
          </div>
        </section>

        <section className={`flex-col lg:w-[45%] xl:w-[40%] rounded-2xl bg-gray-100/50 border border-gray-200 p-4 overflow-hidden ${activeTab === 'bulk' ? 'flex' : 'hidden lg:flex'}`}>
          <h2 className="hidden lg:flex text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 justify-between items-center">
            Sin Clave (Pesaje)
            <span className="text-xs font-extrabold text-primary bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wide">
              {bulkProducts.length} A Granel
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 flex-1 custom-scrollbar content-start">
            {isLoading ? <div className="col-span-full p-4 text-center font-bold text-gray-500">Cargando...</div> :
              bulkProducts.map((prod) => (
                <BulkProductCard key={prod.id} name={prod.name} pricePerKg={prod.price} stock={prod.stock} minStock={prod.minStock} status={prod.status} photo={prod.photo} isSelected={selectedId === prod.id} onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} />
              ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'cancel' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(modalState === 'edit' || modalState === 'create') && <ProductFormModal isOpen={true} product={modalState === 'edit' ? selectedProduct : null} categories={formCategories} onClose={closeModals} onSave={executeFormSave} />}
        {modalState === 'restock' && <RestockModal isOpen={true} product={selectedProduct} onClose={closeModals} onConfirm={executeRestock} />}
        {modalState === 'deactivate' && <DeactivateModal isOpen={true} product={selectedProduct} onClose={closeModals} onConfirm={executeDeactivate} />}
      </AnimatePresence>
    </motion.div>
  );
}