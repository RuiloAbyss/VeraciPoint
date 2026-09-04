export interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  code: string;
  price: number;
  stock: number;
  isAdmin?: boolean;
  onRestock: (id: number) => void;
  onEdit: (id: number) => void;
  onDeactivate: (id: number) => void;
}

export function ProductCard({
  id, name, category, code, price, stock,
  isAdmin = false, onRestock, onEdit, onDeactivate,
}: ProductCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2 border border-gray-300/60 shadow-sm transition-colors hover:border-primary">
      
      {/* LED Verde Lateral */}
      <div className="h-10 w-1.5 rounded-full bg-primary shrink-0" />
      
      {/* Nombre y Categoría (Alineado a la Izquierda) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-bold text-sm text-on-bg truncate">{name}</p>
        <p className="text-[11px] text-on-bg/60 truncate">{category} • Código: {code}</p>
      </div>

      {/* Precio y Stock (Alineado a la Derecha, separador vertical) */}
      <div className="flex flex-col items-end justify-center px-4 shrink-0 border-r border-gray-200">
        <span className="font-bold text-primary text-sm">${price.toFixed(2)}</span>
        <span className="text-[11px] font-semibold text-secondary">Stock: {stock} u.</span>
      </div>

      {/* Botonera Compacta */}
      <div className="flex items-center gap-1.5 shrink-0 pr-1">
        <button
          onClick={() => onRestock(id)}
          className="rounded-md bg-primary/10 hover:bg-primary hover:text-white px-2 py-1.5 text-[11px] font-bold text-primary transition-colors cursor-pointer"
        >
          + Surtir
        </button>
        <button
          disabled={!isAdmin}
          onClick={isAdmin ? () => onEdit(id) : undefined}
          className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
            isAdmin ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          ✏️ Editar
        </button>
        <button
          disabled={!isAdmin}
          onClick={isAdmin ? () => onDeactivate(id) : undefined}
          className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors ${
            isAdmin ? "bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          🗑️ Baja
        </button>
      </div>
    </div>
  );
}