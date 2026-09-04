import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";
import { fetchProducts, restockProduct, deactivateProduct, uploadPhoto, type Product } from "../../services/productService";

export function Inventory() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas las Categorías");
  const [stockFilter, setStockFilter] = useState("Niveles de Stock");
  const [sortOrder, setSortOrder] = useState("Ordenar: A-Z");
  const [selectedBulkId, setSelectedBulkId] = useState<number | null>(null);

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

  const uniqueCategories = useMemo(() => {
    return ["Todas las Categorías", ...Array.from(new Set(products.map(p => p.category)))].sort();
  }, [products]);

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
  const selectedBulkProduct = bulkProducts.find(p => p.id === selectedBulkId);

  // CONTROLADORES CRUD
  const handleRestock = async (id: number) => {
    const qty = parseFloat(prompt("Ingresa la cantidad a surtir (ej. 10.5):") || "0");
    if (qty > 0) {
      await restockProduct(id, qty);
      loadData();
    }
  };

  const handleDeactivate = async (id: number) => {
    if (confirm("¿Seguro que deseas dar de baja este producto? Desaparecerá del inventario activo.")) {
      await deactivateProduct(id);
      loadData();
    }
  };

  const triggerPhotoUpload = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedBulkId) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await uploadPhoto(selectedBulkId, base64);
        loadData();
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Limpiar input
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-5 gap-4 text-on-bg z-20" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      <header className="flex items-center justify-between rounded-2xl border border-gray-300/60 bg-gray-100/85 px-5 py-3 shadow-md backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary transition-colors text-lg px-2">Volver</button>
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <span className="text-xs font-bold tracking-wider text-secondary uppercase">Abarrotes Janny • Módulo</span>
            <h1 className="text-xl font-extrabold text-on-bg lg:text-2xl leading-none mt-0.5">Control de Inventario</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-wrap items-center gap-3 rounded-2xl border border-gray-300/60 bg-gray-100/85 px-5 py-3 shadow-md backdrop-blur-md shrink-0">
        <div className="w-full lg:flex-1 min-w-[250px]">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Buscar por nombre, código o categoría..." className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-gray-300/50 shadow-inner" />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 lg:flex-none rounded-xl bg-white px-3 py-2.5 text-sm outline-none border border-gray-300/50">
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="flex-1 lg:flex-none rounded-xl bg-white px-3 py-2.5 text-sm outline-none border border-gray-300/50">
            <option>Niveles de Stock</option><option>Bajo Stock</option><option>En Abundancia</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="flex-1 lg:flex-none rounded-xl bg-white px-3 py-2.5 text-sm outline-none border border-gray-300/50">
            <option>Ordenar: A-Z</option><option>Ordenar: Z-A</option><option>Menor Precio</option>
          </select>
        </div>
      </div>  

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        
        <section className="flex flex-col flex-1 rounded-3xl border border-gray-300/60 bg-gray-100/85 p-5 shadow-md overflow-hidden">
          <h2 className="text-lg font-bold text-on-bg mb-4 border-b border-gray-300/50 pb-2 flex items-center justify-between">
            Productos Registrados
            <span className="text-sm font-semibold text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">{regularProducts.length} items</span>
          </h2>
          <div className="overflow-y-auto pr-2 space-y-2.5 flex-1 custom-scrollbar">
            {isLoading ? <div className="p-4 text-center font-bold text-on-bg/60">Cargando inventario...</div> : 
              regularProducts.map((prod) => (
                <ProductCard key={prod.id} id={prod.id} name={prod.name} category={prod.category} code={prod.barcode?.toString() || "S/N"} price={prod.price} stock={prod.stock} isAdmin={isAdmin} onRestock={handleRestock} onEdit={() => alert("Módulo de edición en desarrollo")} onDeactivate={handleDeactivate} />
              ))}
          </div>
        </section>

        <section className="flex flex-col lg:w-[45%] rounded-3xl border border-gray-300/60 bg-gray-100/85 p-5 shadow-md overflow-hidden">
          <div className="mb-4 border-b border-gray-300/50 pb-2 flex flex-col gap-3">
            <h2 className="text-lg font-bold text-on-bg flex justify-between items-center">Sin Clave (Pesaje) <span className="text-xl">⚖️</span></h2>
            
            <div className={`flex items-center gap-2 transition-opacity ${selectedBulkProduct ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <button onClick={() => selectedBulkId && handleRestock(selectedBulkId)} className="rounded-md bg-primary/20 hover:bg-primary hover:text-white px-3 py-2 text-xs font-bold text-primary transition-colors flex-1 shadow-sm">+ Surtir</button>
              <button disabled={!isAdmin} onClick={triggerPhotoUpload} className={`rounded-md px-3 py-2 text-xs font-bold transition-colors flex-1 shadow-sm ${isAdmin ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white" : "bg-gray-200 text-gray-400"}`}>📷 Foto</button>
              <button disabled={!isAdmin} onClick={() => selectedBulkId && handleDeactivate(selectedBulkId)} className={`rounded-md px-3 py-2 text-xs font-bold transition-colors flex-1 shadow-sm ${isAdmin ? "bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white" : "bg-gray-200 text-gray-400"}`}>🗑️ Baja</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-2 flex-1 custom-scrollbar content-start">
            {isLoading ? <div className="col-span-full p-4 text-center font-bold text-on-bg/60">Cargando...</div> :
              bulkProducts.map((prod) => (
                <BulkProductCard key={prod.id} name={prod.name} pricePerKg={prod.price} photo={prod.photo} isSelected={selectedBulkId === prod.id} onClick={() => setSelectedBulkId(selectedBulkId === prod.id ? null : prod.id)} />
              ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}