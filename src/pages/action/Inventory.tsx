// src/pages/access/Inventory.tsx
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductCard } from "../../components/ProductCard";
import { BulkProductCard } from "../../components/BulkProductCard";

export function Inventory() {
  const navigate = useNavigate();

  const regularProducts = Array.from({ length: 6 }).map((_, i) => ({
    id: i, name: `Coca-Cola 600ml ${i + 1}`, category: "Bebidas", code: "75012345678", price: 18.00, stock: 45,
  }));

  const bulkProducts = [
    { name: 'Jitomate Saladette', price: 24.50 }, { name: 'Cebolla Blanca', price: 18.00 },
    { name: 'Aguacate Hass', price: 85.00 }, { name: 'Plátano Macho', price: 22.50 },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col p-3 sm:p-4 lg:p-5 gap-5 text-on-bg z-20"
      initial={{ y: "100%" }} // Viene de abajo al entrar
      animate={{ y: "0%" }}   // Posición central
      exit={{ y: "100%" }}    // Se va hacia abajo al volver
      transition={{ 
        duration: 0.28, 
        ease: [0.16, 1, 0.3, 1] // Curva easeOutExpo 
      }}
    >
      <header className="flex items-center justify-between rounded-2xl border border-white/50 bg-surface-2/85 px-5 py-3 shadow-sm backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")} // Navegación instantánea
            className="font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer text-lg px-2"
          >
            Volver
          </button>
          <div className="h-10 w-2.5 rounded-full bg-primary" />
          <div>
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              Abarrotes Janny • Módulo
            </span>
            <h1 className="text-xl font-extrabold text-on-bg lg:text-2xl leading-none mt-0.5">
              Control de Inventario
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-wrap items-center gap-3 rounded-2xl border border-white/50 bg-surface-2/85 px-5 py-3 shadow-sm backdrop-blur-md shrink-0">
        <div className="w-full lg:flex-1 min-w-[250px]">
          <input
            type="text"
            placeholder="🔍 Buscar producto por nombre o código..."
            className="w-full rounded-xl bg-surface-1 px-4 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50 shadow-inner transition-shadow"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50">
            <option>Categorías / Marcas</option>
          </select>
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50">
            <option>Niveles de Stock</option>
          </select>
          <select className="flex-1 lg:flex-none rounded-xl bg-surface-1 px-3 py-2.5 text-sm text-on-bg outline-none focus:ring-2 focus:ring-secondary border border-surface-3/50">
            <option>Ordenar: A-Z</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
        <section className="flex flex-col flex-1 rounded-3xl border border-white/50 bg-surface-2/85 p-5 shadow-md overflow-hidden backdrop-blur-sm">
          <h2 className="text-lg font-bold text-on-bg mb-4 border-b border-surface-3 pb-2 flex items-center justify-between">
            Productos Registrados
            <span className="text-sm font-semibold text-primary bg-secondary/30 px-3 py-1 rounded-full">
              {regularProducts.length} items
            </span>
          </h2>
          <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
            {regularProducts.map((prod) => (
              <ProductCard key={prod.id} {...prod} />
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