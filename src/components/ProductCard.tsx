// src/components/ProductCard.tsx
export interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  code: string;
  price: number;
  stock: number;
  isAdmin?: boolean;
  onRestock: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
}

export function ProductCard({
  name,
  category,
  code,
  price,
  stock,
  isAdmin = false,
  onRestock,
  onEdit,
  onDeactivate,
}: ProductCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-surface-1 p-3 border border-white/40 shadow-sm transition-colors hover:border-secondary">
      <div>
        <p className="font-bold text-sm text-on-bg">{name}</p>
        <p className="text-xs text-on-bg/60">{category} • Código: {code}</p>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-bold text-primary text-sm">${price.toFixed(2)}</span>
          <span className="text-xs font-semibold text-secondary">Stock: {stock} u.</span>
        </div>
      </div>

      {/* Barra de Acciones */}
      <div className="flex items-center gap-2 self-end sm:self-center">
        {/* Abastecer: Permitido para todos */}
        <button
          onClick={onRestock}
          className="rounded-lg bg-primary/20 hover:bg-primary hover:text-white px-2.5 py-1 text-xs font-bold text-primary transition-colors cursor-pointer"
          title="Reabastecer existencias"
        >
          + Surtir
        </button>

        {/* Editar / Reducir: Solo Admin */}
        <button
          disabled={!isAdmin}
          onClick={isAdmin ? onEdit : undefined}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
            isAdmin
              ? "bg-surface-3 text-on-bg hover:bg-secondary/40 cursor-pointer"
              : "bg-surface-3/30 text-on-bg/30 cursor-not-allowed"
          }`}
          title={isAdmin ? "Editar o merma" : "Requiere permisos de administrador"}
        >
          ✏️ Editar
        </button>

        {/* Dar de baja: Solo Admin */}
        <button
          disabled={!isAdmin}
          onClick={isAdmin ? onDeactivate : undefined}
          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
            isAdmin
              ? "bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white cursor-pointer"
              : "bg-surface-3/30 text-on-bg/30 cursor-not-allowed"
          }`}
          title={isAdmin ? "Suspender producto" : "Requiere permisos de administrador"}
        >
          🗑️ Baja
        </button>
      </div>
    </div>
  );
}