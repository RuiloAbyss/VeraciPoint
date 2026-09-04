import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";
import { fetchProducts, restockProduct, deactivateProduct, uploadPhoto, editProduct, type Product } from "../../services/productService";

export function Inventory() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas las Categorías");
  const [stockFilter, setStockFilter] = useState("Niveles de Stock");
  const [sortOrder, setSortOrder] = useState("Ordenar: A-Z");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Modal de Edición Unificado
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", price: 0, barcode: "" as string });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try { setProducts(await fetchProducts()); } 
    catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("userSession");
    if (raw) setIsAdmin(Boolean(JSON.parse(raw).isAdmin ?? JSON.parse(raw).is_admin));
    loadData();
  }, []);

  const uniqueCategories = useMemo(() => ["Todas las Categorías", ...Array.from(new Set(products.map(p => p.category)))].sort(), [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lower) || (p.barcode && p.barcode.toString().includes(lower)) || p.category.toLowerCase().includes(lower));
    }
    if (categoryFilter !== "Todas las Categorías") result = result.filter(p => p.category === categoryFilter);
    if (stockFilter === "Bajo Stock") result = result.filter(p => p.stock < 10);
    else if (stockFilter === "En Abundancia") result = result.filter(p => p.stock >= 10);
    if (sortOrder === "Ordenar: A-Z") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOrder === "Ordenar: Z-A") result.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOrder === "Menor Precio") result.sort((a, b) => a.price - b.price);
    return result;
  }, [products, searchTerm, categoryFilter, stockFilter, sortOrder]);

  const regularProducts = filteredProducts.filter(p => p.barcode !== null);
  const bulkProducts = filteredProducts.filter(p => p.barcode === null);
  const selectedProduct = products.find(p => p.id === selectedId);

  // Acciones Rápidas
  const handleRestock = async () => {
    if (!selectedId) return;
    const qty = parseFloat(prompt(`Surtir: ${selectedProduct?.name}\nIngresa la cantidad a añadir:`) || "0");
    if (qty > 0) { await restockProduct(selectedId, qty); loadData(); }
  };

  const handleDeactivate = async () => {
    if (!selectedId) return;
    if (confirm(`¿Dar de baja: ${selectedProduct?.name}?`)) { await deactivateProduct(selectedId); setSelectedId(null); loadData(); }
  };

  // Preparación del Modal
  const handleOpenEdit = () => {
    if (!selectedProduct) return;
    
    const productHasCode = selectedProduct.barcode !== null;
    setHasBarcode(productHasCode);
    
    setEditForm({ 
      name: selectedProduct.name, 
      price: selectedProduct.price, 
      barcode: productHasCode ? selectedProduct.barcode!.toString() : "" 
    });
    
    setPhotoPreview(selectedProduct.photo ? `data:image/jpeg;base64,${selectedProduct.photo.replace(/\s+/g, '')}` : null);
    setNewPhotoBase64(null);
    setIsEditModalOpen(true);
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setNewPhotoBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    
    // Si no está el check activado, forzamos null en base de datos
    const code = (hasBarcode && editForm.barcode.trim() !== "") ? parseInt(editForm.barcode) : null;
    
    await editProduct(selectedId, editForm.name, editForm.price, code);
    if (newPhotoBase64) {
      await uploadPhoto(selectedId, newPhotoBase64);
    }
    
    setIsEditModalOpen(false);
    loadData();
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-5 gap-3 text-on-bg z-20 bg-gray-50/50" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      {/* HEADER SUPERIOR */}
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-5 py-3 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-8 w-1.5 rounded-full bg-primary" />
          <div>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Abarrotes Janny • Módulo</span>
            <h1 className="text-xl font-extrabold text-gray-900 leading-none">Control de Inventario</h1>
          </div>
        </div>
        {isAdmin && <button className="rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-secondary cursor-pointer">REGISTRAR NUEVO PRODUCTO</button>}
      </header>

      {/* BARRA UNIFICADA Y ADAPTATIVA */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-gray-200 px-3 py-2.5 shadow-sm shrink-0">
        
        <div className="flex-1 min-w-[200px]">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar nombre o código..." className="w-full rounded-lg bg-gray-50 px-4 py-2 text-sm outline-none border border-gray-200 focus:border-primary transition-colors" />
        </div>
        
        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />
        
        <div className="flex flex-wrap gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg bg-white px-3 py-2 text-sm outline-none border border-gray-200 text-gray-700">
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="rounded-lg bg-white px-3 py-2 text-sm outline-none border border-gray-200 text-gray-700 hidden sm:block">
            <option>Niveles de Stock</option><option>Bajo Stock</option><option>En Abundancia</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="rounded-lg bg-white px-3 py-2 text-sm outline-none border border-gray-200 text-gray-700 hidden sm:block">
            <option>Ordenar: A-Z</option><option>Ordenar: Z-A</option><option>Menor Precio</option>
          </select>
        </div>

        <div className="hidden lg:block w-px h-8 bg-gray-200 mx-1" />

        {/* ACCIONES */}
        <div className={`flex items-center gap-2 transition-opacity duration-300 ${selectedProduct ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <button onClick={handleRestock} className="rounded-lg bg-primary/10 hover:bg-primary hover:text-white px-4 py-2 text-xs font-bold text-primary transition-colors shadow-sm cursor-pointer">+ Surtir</button>
          <button disabled={!isAdmin} onClick={handleOpenEdit} className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors shadow-sm ${isAdmin ? "bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400"}`}>✏️ Editar</button>
          <button disabled={!isAdmin} onClick={handleDeactivate} className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors shadow-sm ${isAdmin ? "bg-red-50 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400"}`}>🗑️ Baja</button>
        </div>
      </div>  

      {/* LISTAS */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <section className="flex flex-col flex-1 rounded-2xl bg-gray-100/50 border border-gray-200 p-4 overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 flex justify-between">Productos Registrados <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-0.5 rounded-full">{regularProducts.length}</span></h2>
          <div className="overflow-y-auto pr-2 space-y-2 flex-1 custom-scrollbar">
            {isLoading ? <div className="p-4 text-center font-bold text-gray-500">Cargando...</div> : 
              regularProducts.map((prod) => (
                <ProductCard key={prod.id} {...prod} code={prod.barcode?.toString() || "S/N"} isSelected={selectedId === prod.id} onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} />
              ))}
          </div>
        </section>

        <section className="flex flex-col lg:w-[45%] xl:w-[40%] rounded-2xl bg-gray-100/50 border border-gray-200 p-4 overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2 flex justify-between">Sin Clave (Pesaje) <span className="text-xl">⚖️</span></h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-2 flex-1 custom-scrollbar content-start">
            {isLoading ? <div className="col-span-full p-4 text-center font-bold text-gray-500">Cargando...</div> :
              bulkProducts.map((prod) => (
                <BulkProductCard key={prod.id} name={prod.name} pricePerKg={prod.price} photo={prod.photo} isSelected={selectedId === prod.id} onClick={() => setSelectedId(selectedId === prod.id ? null : prod.id)} />
              ))}
          </div>
        </section>
      </div>

      {/* MODAL UNIFICADO (FOTO ANCHA + CHECKBOX) */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 w-full max-w-sm">
              <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b pb-2">Editar Producto</h3>
              
              <form onSubmit={submitEdit} className="space-y-4">
                
                {/* Selector de Imagen Ancho */}
                <div 
                  className="w-full h-40 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative group cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center opacity-40">
                      <span className="text-4xl mb-1">📷</span>
                      <span className="text-xs font-bold text-gray-500">Clic para añadir foto</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded-full">Cambiar Imagen</span>
                  </div>
                </div>
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleModalFileChange} />

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                  <input type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white transition-colors text-gray-900 font-medium" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
                  <input type="number" step="0.01" required value={editForm.price} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white transition-colors text-gray-900 font-medium" />
                </div>

                {/* Checkbox Dinámico */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <input 
                      type="checkbox" 
                      checked={hasBarcode} 
                      onChange={(e) => setHasBarcode(e.target.checked)} 
                      className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
                    />
                    <span className="text-sm font-bold text-gray-700 select-none">El producto tiene código de barras</span>
                  </label>
                </div>

                {/* Input de código condicionado al checkbox */}
                {hasBarcode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej. 7501020555305"
                      value={editForm.barcode} 
                      onChange={e => setEditForm({...editForm, barcode: e.target.value})} 
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white transition-colors font-mono text-gray-900 mt-1" 
                    />
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">Cancelar</button>
                  <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-secondary transition-colors shadow-md cursor-pointer">Guardar Cambios</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}