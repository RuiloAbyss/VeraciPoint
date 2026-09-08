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
  originalPrice?: number; 
  onClick: () => void;
}

export function ProductCard({ name, category, code, price, stock, minStock, status, isSelected, originalPrice, onClick }: ProductCardProps) {
  const isOutOfStock = stock <= 0;
  const isLowStock = minStock !== null && minStock !== undefined && stock < minStock && stock > 0;
  const stockColor = isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-500" : "text-gray-500";
  
  const isOffer = category === "Ofertas";

  // Estética estrictamente original con inyección naranja solo para ofertas
  const cardClass = `group w-full flex items-center gap-3 rounded-xl p-2 text-left cursor-pointer overflow-hidden transition-all border ${status === 0 ? "opacity-60 grayscale" : ""} ${
    isSelected 
      ? (isOffer ? "border-orange-500 bg-orange-50 shadow-md" : "border-primary bg-primary/5 shadow-md") 
      : (isOffer ? "border-orange-200 bg-orange-50/30 hover:border-orange-400 shadow-sm" : "border-gray-200 bg-white hover:border-primary/50 shadow-sm")
  }`;

  const pillColor = isSelected ? (isOffer ? "bg-orange-500" : "bg-primary") : (isOffer ? "bg-orange-300" : "bg-gray-300");

  return (
    <button onClick={onClick} className={cardClass}>
      <div className={`h-10 w-1.5 rounded-full shrink-0 transition-colors ${pillColor}`} />
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-sm text-gray-900 truncate">{status === 0 && "⛔ "}{name}</p>
            {isOffer && <span className="bg-orange-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase shadow-sm">Oferta</span>}
        </div>
        <p className="text-[11px] text-gray-500 truncate">{category} • Código: {code}</p>
      </div>
      <div className="flex flex-col items-end justify-center px-4 shrink-0 border-l border-gray-200">
        {isOffer && originalPrice && (
            <span className="text-[10px] text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
        )}
        <span className={`font-bold text-sm ${isOffer ? "text-orange-600" : "text-primary"}`}>${price.toFixed(2)}</span>
        <span className={`text-[11px] font-bold ${stockColor}`}>Stock: {stock} u.</span>
      </div>
    </button>
  );
}