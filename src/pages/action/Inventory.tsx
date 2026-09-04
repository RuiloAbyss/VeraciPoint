// src/pages/action/Inventory.tsx (fragmento principal)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";

export function Inventory() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("userSession");
    if (raw) {
      const session = JSON.parse(raw);
      setIsAdmin(session.is_admin);
    }
  }, []);

  const handleRestock = (name: string) => alert(`Abasteciendo: ${name}`);
  const handleEdit = (name: string) => alert(`Editando producto / reduciendo merma: ${name}`);
  const handleDeactivate = (name: string) => alert(`Dando de baja: ${name}`);

  const regularProducts = [
    { id: 1, name: "Coca-Cola 600ml", category: "Bebidas", code: "75012345678", price: 18.00, stock: 45 },
    { id: 2, name: "Galletas Marías 170g", category: "Abarrotes", code: "75010001112", price: 16.50, stock: 12 },
  ];

  const bulkProducts = [
    { name: 'Jitomate Saladette', price: 24.50 },
    { name: 'Cebolla Blanca', price: 18.00 },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-5 gap-5 text-on-bg z-20"
      initial={{ y: "100%" }}
      animate={{ y: "0%" }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex items-center justify-between rounded-2xl border border-white/50 bg-surface-2/85 px-5 py-3 shadow-sm backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="font-extrabold text-primary hover:text-secondary transition-colors cursor-pointer text-lg px-2"
          >
            Volver
          </button>
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <span className="text-xs font-bold tracking-wider text-secondary uppercase">
              Abarrotes Janny • Módulo
            </span>
            <h1 className="text-xl font-extrabold text-on-bg lg:text-2xl leading-none mt-0.5">
              Control de Inventario
            </h1>
          </div>
        </div>

        {/* Solo el Administrador puede registrar productos nuevos */}
        {isAdmin && (
          <button
            onClick={() => alert("Abrir formulario de nuevo producto")}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-color shadow-sm hover:bg-secondary hover:text-on-bg transition-colors cursor-pointer"
          >
            + Nuevo Producto
          </button>
        )}
      </header>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col lg:flex-row flex-wrap items-center gap-3 rounded-2xl border border-white/50 bg-surface-2/85 px-5 py-3 shadow-sm backdrop-blur-md shrink-0">
        <div className="w-full lg:flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="🔍 Buscar producto por nombre o código..."
            className="w-full rounded-xl bg-surface-1 px-4 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50 shadow-inner transition-shadow"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50 transition-shadow">
            <option>Todas las Categorías</option>
            <option>Lácteos</option>
            <option>Abarrotes</option>
            <option>Limpieza</option>
          </select>
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50 transition-shadow">
            <option>Niveles de Stock</option>
            <option>Bajo Stock</option>
            <option>En Abundancia</option>
          </select>
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50 transition-shadow">
            <option>Ordenar: A-Z</option>
            <option>Ordenar: Z-A</option>
            <option>Menor Precio</option>
          </select>
        </div>
      </div>  

      {/* Contenedor de listas */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        <section className="flex flex-col flex-1 rounded-3xl border border-white/50 bg-surface-2/85 p-5 shadow-md overflow-hidden backdrop-blur-sm">
          <h2 className="text-lg font-bold text-on-bg mb-4 border-b border-surface-3 pb-2 flex items-center justify-between">
            Productos Registrados
            <span className="text-sm font-semibold text-secondary bg-secondary/10 px-3 py-1 rounded-full">
              {regularProducts.length} items
            </span>
          </h2>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
            {regularProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                {...prod}
                isAdmin={isAdmin}
                onRestock={() => handleRestock(prod.name)}
                onEdit={() => handleEdit(prod.name)}
                onDeactivate={() => handleDeactivate(prod.name)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col lg:w-1/3 rounded-3xl border border-white/50 bg-surface-2/85 p-5 shadow-md overflow-hidden backdrop-blur-sm">
          <h2 className="text-lg font-bold text-on-bg mb-4 border-b border-surface-3 pb-2 flex justify-between items-center">
            Sin Clave (Pesaje)
            <span className="text-xl text-secondary drop-shadow-sm">⚖️</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 flex-1 custom-scrollbar content-start">
            {bulkProducts.map((prod, idx) => (
              <BulkProductCard key={idx} name={prod.name} pricePerKg={prod.price} />
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}