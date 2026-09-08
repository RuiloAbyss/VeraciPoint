export interface BulkProductCardProps {
  name: string;
  category?: string;
  pricePerKg: number;
  stock: number;
  minStock?: number | null;
  status?: number;
  photo?: string | null;
  isSelected: boolean;
  originalPrice?: number;
  onClick: () => void;
}

export function BulkProductCard({ name, category, pricePerKg, stock, minStock, status, photo, isSelected, originalPrice, onClick }: BulkProductCardProps) {
  const cleanPhoto = photo ? photo.replace(/\s+/g, '') : null;
  const isOutOfStock = stock <= 0;
  const isLowStock = minStock !== null && minStock !== undefined && stock < minStock && stock > 0;
  const stockColor = isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-500" : "text-gray-500";

  const isOffer = category === "Ofertas";

  // Estética estrictamente original con inyección naranja solo para ofertas
  const cardClass = `group flex flex-col items-center rounded-xl p-2 transition-all text-center cursor-pointer border ${status === 0 ? "opacity-60 grayscale" : ""} ${
    isSelected 
      ? (isOffer ? "border-orange-500 bg-orange-50 shadow-md" : "border-primary bg-primary/5 shadow-md") 
      : (isOffer ? "border-orange-200 bg-orange-50/30 hover:border-orange-400 shadow-sm" : "border-gray-200 bg-white hover:border-primary/50 shadow-sm")
  }`;

  return (
    <button onClick={onClick} className={cardClass}>
      <div className="w-full h-28 bg-gray-50 rounded-lg flex items-center justify-center mb-2 overflow-hidden shrink-0 border border-gray-100 relative">
        {isOffer && <div className="absolute top-1 right-1 bg-orange-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shadow-sm z-10">Oferta</div>}
        {cleanPhoto ? <img src={`data:image/jpeg;base64,${cleanPhoto}`} alt={name} className="w-full h-full object-cover" /> : <span className="text-3xl opacity-30">📷</span>}
      </div>
      <p className="font-bold text-xs text-gray-900 w-full line-clamp-2 leading-tight min-h-[2rem] flex items-center justify-center">
        {status === 0 && "⛔ "}{name}
      </p>
      <div className="flex flex-col items-center mt-1">
        {isOffer && originalPrice && (
            <span className="text-[10px] text-gray-400 line-through">${originalPrice.toFixed(2)}/kg</span>
        )}
        <p className={`font-bold text-sm ${isOffer ? "text-orange-600" : "text-primary"}`}>${pricePerKg.toFixed(2)}/kg</p>
        <p className={`font-bold text-[10px] uppercase tracking-wide ${stockColor}`}>Aprox. {stock.toFixed(3)} Kg.</p>
      </div>
    </button>
  );
}