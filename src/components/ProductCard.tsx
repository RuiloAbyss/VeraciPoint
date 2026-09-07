export interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  code: string;
  price: number;
  stock: number;
  minStock?: number | null;
  status?: number;
  isSelected: boolean;
  onClick: () => void;
}

export function ProductCard({ name, category, code, price, stock, minStock, status, isSelected, onClick }: ProductCardProps) {
  const isOutOfStock = stock <= 0;
  const isLowStock = minStock !== null && minStock !== undefined && stock < minStock && stock > 0;
  const stockColor = isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-500" : "text-gray-500";

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-3 rounded-xl bg-white p-2 text-left cursor-pointer overflow-hidden transition-all border ${status === 0 ? "opacity-60 grayscale" : ""} ${
        isSelected ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 hover:border-primary/50 shadow-sm"
      }`}
    >
      <div className={`h-10 w-1.5 rounded-full shrink-0 transition-colors ${isSelected ? "bg-primary" : "bg-gray-300"}`} />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-bold text-sm text-gray-900 truncate">{status === 0 && "⛔ "}{name}</p>
        <p className="text-[11px] text-gray-500 truncate">{category} • Código: {code}</p>
      </div>
      <div className="flex flex-col items-end justify-center px-4 shrink-0 border-l border-gray-200">
        <span className="font-bold text-primary text-sm">${price.toFixed(2)}</span>
        <span className={`text-[11px] font-bold ${stockColor}`}>Stock: {stock} u.</span>
      </div>
    </button>
  );
}