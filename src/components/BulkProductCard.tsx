export interface BulkProductCardProps {
  name: string;
  pricePerKg: number;
  stock: number;
  minStock?: number | null;
  status?: number;
  photo?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export function BulkProductCard({ name, pricePerKg, stock, minStock, status, photo, isSelected, onClick }: BulkProductCardProps) {
  const cleanPhoto = photo ? photo.replace(/\s+/g, '') : null;
  const isOutOfStock = stock <= 0;
  const isLowStock = minStock !== null && minStock !== undefined && stock < minStock && stock > 0;
  const stockColor = isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-500" : "text-gray-500";

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center rounded-xl bg-white p-2 transition-all text-center cursor-pointer border ${status === 0 ? "opacity-60 grayscale" : ""} ${
        isSelected ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 hover:border-primary/50 shadow-sm"
      }`}
    >
      <div className="w-full h-28 bg-gray-50 rounded-lg flex items-center justify-center mb-2 overflow-hidden shrink-0 border border-gray-100">
        {cleanPhoto ? <img src={`data:image/jpeg;base64,${cleanPhoto}`} alt={name} className="w-full h-full object-cover" /> : <span className="text-3xl opacity-30">📷</span>}
      </div>
      <p className="font-bold text-xs text-gray-900 w-full line-clamp-2 leading-tight min-h-[2rem] flex items-center justify-center">
        {status === 0 && "⛔ "}{name}
      </p>
      <div className="flex flex-col items-center mt-1">
        <p className="font-bold text-sm text-primary">${pricePerKg.toFixed(2)}/kg</p>
        <p className={`font-bold text-[10px] uppercase tracking-wide ${stockColor}`}>Aprox. {stock.toFixed(3)} Kg.</p>
      </div>
    </button>
  );
}