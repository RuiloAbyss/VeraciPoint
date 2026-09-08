import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";
import { ProductFormModal, RestockModal, DeactivateModal, OfferModal, DeleteConfirmModal } from "../../components/InventoryModals";
import { fetchProducts, restockProduct, deactivateProduct, activateProduct, discardStock, uploadPhoto, editProduct, createProduct, type Product } from "../../services/productService";
import { useLoading } from "../../components/LoadingContext"; 

export function Inventory() {
  const navigate = useNavigate();
  const { setLoading } = useLoading(); 
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [activeTab, setActiveTab] = useState<'regular' | 'bulk'>('regular');
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'cancel' | 'delete' | 'error' } | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; details: string }>({ isOpen: false, title: "", details: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Categoría");
  const [stockFilter, setStockFilter] = useState("Niveles de Stock");
  const [sortOrder, setSortOrder] = useState("Ordenar: A-Z");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalState, setModalState] = useState<'none' | 'edit' | 'create' | 'restock' | 'deactivate' | 'offer'>('none');

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [currentRegularPage, setCurrentRegularPage] = useState(1);
  const [currentBulkPage, setCurrentBulkPage] = useState(1);
  const itemsPerPage = 30; // Ajustado a 30 elementos por página

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
      setCurrentRegularPage(1); 
      setCurrentBulkPage(1);
      setSelectedId(null);
  }, [searchTerm, categoryFilter, stockFilter, sortOrder, activeTab]);

  const showToast = (msg: string, type: 'success' | 'cancel' | 'delete' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try { 
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []); 
    } 
    catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error al cargar inventario", details: String(error) }); 
    } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const raw = localStorage.getItem("userSession");
    if (raw) setIsAdmin(Boolean(JSON.parse(raw).isAdmin ?? JSON.parse(raw).is_admin));
    loadData();
  }, []);

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
  
  const formCategories = uniqueCategories.filter(c => c !== "Categoría" && c !== "Ofertas");
  if (!formCategories.includes("Ofertas")) formCategories.push("Ofertas");

  const filteredProducts = useMemo(() => {
    let result = safeProducts;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name && p.name.toLowerCase().includes(lower)) || 
        (p.barcode && p.barcode.toString().includes(lower)) || 
        (p.category && p.category.toLowerCase().includes(lower))
      );
    }
    
    if (stockFilter === "Descontinuado") {
        result = result.filter(p => p.status === 0);
    } else {
        result = result.filter(p => p.status !== 0);
        if (stockFilter === "Sin stock") {
            result = result.filter(p => Number(p.stock) <= 0);
        } else if (stockFilter === "Bajo") {
            result = result.filter(p => Number(p.stock) > 0 && (p.minStock !== null && Number(p.stock) <= Number(p.minStock)));
        }
    }

    if (categoryFilter !== "Categoría") result = result.filter(p => p.category === categoryFilter);
    
    if (sortOrder === "Ordenar: A-Z") result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortOrder === "Ordenar: Z-A") result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    else if (sortOrder === "Menor Precio") result.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortOrder === "Código de Barras") {
      result.sort((a, b) => Number(a.barcode || 0) - Number(b.barcode || 0));
    }
    
    return result;
  }, [safeProducts, searchTerm, categoryFilter, stockFilter, sortOrder]);

  const regularProducts = filteredProducts.filter(p => p.barcode !== null && p.barcode !== undefined);
  const bulkProducts = filteredProducts.filter(p => p.barcode === null || p.barcode === undefined);
  
  const rawSelectedProduct = safeProducts.find(p => p.id === selectedId) || null;
  const selectedProduct = rawSelectedProduct ? {
    ...rawSelectedProduct,
    price: Number(rawSelectedProduct.price) || 0,
    stock: Number(rawSelectedProduct.stock) || 0
  } : null;

  const totalRegularPages = Math.max(1, Math.ceil(regularProducts.length / itemsPerPage));
  const totalBulkPages = Math.max(1, Math.ceil(bulkProducts.length / itemsPerPage));
  
  const paginatedRegular = regularProducts.slice((currentRegularPage - 1) * itemsPerPage, currentRegularPage * itemsPerPage);
  const paginatedBulk = bulkProducts.slice((currentBulkPage - 1) * itemsPerPage, currentBulkPage * itemsPerPage);

  const executeRestock = async (qty: number) => {
    if (!selectedId) return;
    setLoading(true); 
    try {
      await restockProduct(selectedId, qty);
      showToast("Se sumaron existencias", "success");
      setModalState('none');
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error al surtir", details: String(error) }); 
    }
    finally { setLoading(false); } 
  };

  const executeOffer = async (qty: number, newPrice: number) => {
    if (!selectedId || !selectedProduct) return;
    setLoading(true);
    try {
      await discardStock(selectedId, qty);
      const existingOffer = safeProducts.find(p => p.name === selectedProduct.name && p.category === "Ofertas" && p.status === 0);

      if (existingOffer) {
        await editProduct(existingOffer.id, existingOffer.name, newPrice, existingOffer.barcode, "Ofertas", existingOffer.sellformat, existingOffer.minStock, existingOffer.maxStock);
        await restockProduct(existingOffer.id, qty);
        await activateProduct(existingOffer.id);
        if (selectedProduct.photo && !existingOffer.photo) {
           await uploadPhoto(existingOffer.id, selectedProduct.photo);
        }
      } else {
        const newCode = selectedProduct.sellformat === "Pieza" ? selectedProduct.barcode : null;
        const newId = await createProduct(selectedProduct.name, newPrice, "Ofertas", newCode, selectedProduct.sellformat, qty, null, null);
        if (selectedProduct.photo) {
           await uploadPhoto(newId, selectedProduct.photo);
        }
      }

      showToast("Oferta generada", "success");
      setModalState('none');
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error al generar oferta", details: String(error) }); 
    }
    finally { setLoading(false); }
  };

  const executeActivate = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await activateProduct(selectedId);
      setSelectedId(null);
      showToast("Producto reactivado exitosamente", "success");
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error al activar", details: String(error) }); 
    }
    finally { setLoading(false); }
  };

  const executeHardDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await invoke("delete_item_hard", { id: selectedId });
      setSelectedId(null);
      setIsDeleteModalOpen(false);
      showToast("Producto borrado definitivamente", "delete");
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Fallo al borrar definitivamente", details: String(error) }); 
    }
    finally { setLoading(false); }
  };

  const executeFormSave = async (data: any) => {
    setLoading(true);
    try {
      const code = data.barcode ? parseInt(data.barcode) : null;
      if (modalState === 'create') {
        const newId = await createProduct(data.name, data.price, data.category, code, data.sellformat, data.quantity, data.minStock, data.maxStock);
        if (data.newPhotoBase64) await uploadPhoto(newId, data.newPhotoBase64);
        showToast("Producto registrado exitosamente", "success");
      } else {
        if (!selectedId || !selectedProduct) return;
        const currentCode = selectedProduct.barcode ? selectedProduct.barcode.toString() : null;
        
        const prevMin = selectedProduct.minStock ?? null;
        const prevMax = selectedProduct.maxStock ?? null;
        const hasChanges = data.name !== selectedProduct.name || data.price !== selectedProduct.price || data.barcode !== currentCode || data.category !== selectedProduct.category || data.sellformat !== selectedProduct.sellformat || data.minStock !== prevMin || data.maxStock !== prevMax || data.newPhotoBase64 !== null;

        if (!hasChanges) {
          setModalState('none');
          showToast("No se detectaron cambios", "cancel");
          setLoading(false);
          return;
        }
        await editProduct(selectedId, data.name, data.price, code, data.category, data.sellformat, data.minStock, data.maxStock);
        if (data.newPhotoBase64) await uploadPhoto(selectedId, data.newPhotoBase64);
        showToast("Producto actualizado", "success");
      }
      setModalState('none');
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error al guardar el formulario", details: String(error) }); 
    }
    finally { setLoading(false); }
  };

  const executeDeactivate = async (mode: 'full' | 'partial', qty?: number) => {
    if (!selectedId || !selectedProduct) return;
    setLoading(true);
    try {
      if (mode === 'full') {
        await deactivateProduct(selectedId);
        setSelectedId(null);
        showToast("Producto inhabilitado", "cancel");
      } else if (qty && qty > 0) {
        await discardStock(selectedId, qty);
        showToast("Merma registrada", "success");
      }
      setModalState('none');
      await loadData();
    } catch (error: any) { 
      setErrorModal({ isOpen: true, title: "Error en la operación de baja", details: String(error) }); 
    }
    finally { setLoading(false); }
  };

  const closeModals = () => {
    setModalState('none');
    showToast("Acción cancelada", "cancel");
  };

  const renderPagination = (currentPage: number, totalPages: number, setPage: React.Dispatch<React.SetStateAction<number>>, totalItems: number) => {
    if (totalItems === 0) return null;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 shrink-0 gap-2">
        <button disabled={currentPage === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-2 sm:px-4 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
          <span className="hidden sm:inline">Anterior</span><span className="sm:hidden">◀</span>
        </button>
        <span className="text-[10px] sm:text-xs font-bold text-gray-500 text-center">
          Mostrando {start} - {end} de {totalItems}
        </span>
        <button disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-2 sm:px-4 bg-white border border-gray-200 rounded-lg text-xs font-bold disabled:opacity-50 text-gray-700 hover:ring-2 hover:ring-primary hover:border-transparent cursor-pointer transition-all shadow-sm">
          <span className="hidden sm:inline">Siguiente</span><span className="sm:hidden">▶</span>
        </button>
      </div>
    );
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
        
        {isAdmin && stockFilter === "Descontinuado" ? (
          <button 
            onClick={() => setIsDeleteModalOpen(true)} 
            disabled={!selectedId}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ${selectedId ? 'bg-red-600 hover:brightness-90 cursor-pointer' : 'bg-red-300 cursor-not-allowed'}`}
          >
            ELIMINAR DEFINITIVO
          </button>
        ) : isAdmin ? (
          <button 
            onClick={() => setModalState('create')} 
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-90 transition-all cursor-pointer"
          >
            NUEVO PRODUCTO
          </button>
        ) : null}
      </header>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 rounded-xl bg-white border border-gray-200 p-3 shadow-sm shrink-0">
        <div className="flex-1 w-full min-w-0">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar nombre o código..." className="w-full rounded-lg bg-gray-50 px-4 py-2 text-sm outline-none border border-gray-200 focus:border-primary" />
        </div>
        
        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          <div className="relative col-span-2 sm:col-span-1" ref={categoryDropdownRef}>
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
              <div className="absolute top-full left-0 mt-1.5 w-full sm:w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1.5">
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

          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="w-full rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 text-gray-700 outline-none cursor-pointer">
            <option value="Niveles de Stock">Niveles de Stock</option>
            <option value="Bajo">Bajo</option>
            <option value="Sin stock">Sin stock</option>
            <option value="Descontinuado">Descontinuado</option>
          </select>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full rounded-lg bg-white px-2 py-2 text-sm border border-gray-200 text-gray-700 outline-none cursor-pointer">
            <option value="Ordenar: A-Z">Ordenar: A-Z</option>
            <option value="Ordenar: Z-A">Ordenar: Z-A</option>
            <option value="Menor Precio">Menor Precio</option>
            <option value="Código de Barras">Código de Barras</option>
          </select>
        </div>

        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        
        <div className={`grid ${selectedProduct?.status === 0 ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"} gap-2 w-full lg:w-auto transition-opacity duration-300 ${selectedProduct ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          {selectedProduct?.status === 0 ? (
            <button onClick={executeActivate} className="w-full rounded-lg bg-green-100 hover:bg-green-500 hover:text-white py-2 px-6 text-xs font-bold text-green-700 shadow-sm cursor-pointer transition-colors">⬆️ Dar de Alta</button>
          ) : (
            <>
              <button onClick={() => setModalState('restock')} className="w-full rounded-lg bg-primary/10 hover:bg-primary hover:text-white py-2 text-xs font-bold text-primary shadow-sm cursor-pointer">+ Surtir</button>
              <button disabled={!isAdmin} onClick={() => setModalState('offer')} className={`w-full rounded-lg py-2 text-xs font-bold shadow-sm ${isAdmin ? "bg-white border border-orange-200 text-orange-600 hover:ring-2 hover:ring-orange-400 cursor-pointer transition-all" : "bg-gray-100 text-gray-400"}`}>🏷️ Ofertar</button>
              <button disabled={!isAdmin} onClick={() => setModalState('edit')} className={`w-full rounded-lg py-2 text-xs font-bold shadow-sm ${isAdmin ? "bg-white border border-gray-300 text-gray-700 hover:ring-2 hover:ring-gray-400 cursor-pointer transition-all" : "bg-gray-100 text-gray-400"}`}>✏️ Editar</button>
              <button disabled={!isAdmin} onClick={() => setModalState('deactivate')} className={`w-full rounded-lg py-2 text-xs font-bold shadow-sm ${isAdmin ? "bg-white border border-red-200 text-red-600 hover:ring-2 hover:ring-red-400 cursor-pointer transition-all" : "bg-gray-100 text-gray-400"}`}>🗑️ Baja</button>
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
          <h2 className="hidden lg:flex text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 justify-between items-center shrink-0">
            Productos Registrados
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wide">{regularProducts.length} Registrados</span>
          </h2>
          <div className="overflow-y-auto pr-1 space-y-2 flex-1 custom-scrollbar">
            {isLoading ? <div className="p-4 text-center font-bold text-gray-500">Cargando...</div> : 
              paginatedRegular.map((prod) => {
                const originalPrice = prod.category === "Ofertas" ? safeProducts.find(p => p.name === prod.name && p.category !== "Ofertas")?.price : undefined;
                return (
                  <ProductCard 
                    key={prod.id} 
                    {...prod} 
                    price={Number(prod.price) || 0}
                    stock={Number(prod.stock) || 0}
                    code={prod.barcode?.toString() || "S/N"} 
                    isSelected={selectedId === prod.id} 
                    originalPrice={originalPrice ? Number(originalPrice) : undefined} 
                    onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} 
                  />
                )
              })}
          </div>
          {totalRegularPages > 1 && renderPagination(currentRegularPage, totalRegularPages, setCurrentRegularPage, regularProducts.length)}
        </section>

        <section className={`flex-col lg:w-[45%] xl:w-[40%] rounded-2xl bg-gray-100/50 border border-gray-200 p-4 overflow-hidden ${activeTab === 'bulk' ? 'flex' : 'hidden lg:flex'}`}>
          <h2 className="hidden lg:flex text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 justify-between items-center shrink-0">
            Sin Clave (Pesaje)
            <span className="text-xs font-extrabold text-primary bg-orange-50 px-3 py-1 rounded-full uppercase tracking-wide">{bulkProducts.length} A Granel</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 flex-1 custom-scrollbar content-start">
            {isLoading ? <div className="col-span-full p-4 text-center font-bold text-gray-500">Cargando...</div> : 
              paginatedBulk.map((prod) => {
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
                    isSelected={selectedId === prod.id} 
                    originalPrice={originalPrice ? Number(originalPrice) : undefined} 
                    onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} 
                  />
                )
              })}
          </div>
          {totalBulkPages > 1 && renderPagination(currentBulkPage, totalBulkPages, setCurrentBulkPage, bulkProducts.length)}
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'cancel' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'}`}>{toast.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(modalState === 'edit' || modalState === 'create') && <ProductFormModal isOpen={true} product={selectedProduct} categories={formCategories} onClose={closeModals} onSave={executeFormSave} />}
        {modalState === 'restock' && <RestockModal isOpen={true} product={selectedProduct} onClose={closeModals} onConfirm={executeRestock} />}
        {modalState === 'deactivate' && <DeactivateModal isOpen={true} product={selectedProduct} onClose={closeModals} onConfirm={executeDeactivate} />}
        {modalState === 'offer' && <OfferModal isOpen={true} product={selectedProduct} onClose={closeModals} onConfirm={executeOffer} />}
        
        {isDeleteModalOpen && selectedProduct && (
          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            productName={selectedProduct.name}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={executeHardDelete}
          />
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