export interface BulkProductCardProps {
  name: string;
  pricePerKg: number;
  photo?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export function BulkProductCard({ name, pricePerKg, photo, isSelected, onClick }: BulkProductCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center rounded-xl bg-white p-2 border shadow-sm transition-all text-center cursor-pointer overflow-hidden ${
        isSelected ? "border-primary ring-2 ring-primary bg-primary/5" : "border-gray-300/60 hover:border-primary/50"
      }`}
    >
      {/* Contenedor de Imagen Rígido para evitar que se rompa el Grid */}
      <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-2 overflow-hidden shrink-0">
        {photo ? (
          <img src={`data:image/jpeg;base64,${photo}`} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-50">📷</span>
        )}
      </div>
      
      <p className="font-bold text-[11px] text-on-bg w-full truncate leading-tight">{name}</p>
      <p className="font-bold text-xs text-primary mt-0.5">${pricePerKg.toFixed(2)}/kg</p>
    </button>
  );
}