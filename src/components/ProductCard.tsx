export interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  code: string;
  price: number;
  stock: number;
  isSelected: boolean;
  onClick: () => void;
}

export function ProductCard({ name, category, code, price, stock, isSelected, onClick }: ProductCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-3 rounded-xl bg-white p-2 text-left cursor-pointer overflow-hidden transition-all border ${
        isSelected 
          ? "border-primary bg-primary/5 shadow-md" 
          : "border-gray-200 hover:border-primary/50 shadow-sm"
      }`}
    >
      <div className={`h-10 w-1.5 rounded-full shrink-0 transition-colors ${isSelected ? "bg-primary" : "bg-gray-300"}`} />
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-bold text-sm text-gray-900 truncate">{name}</p>
        <p className="text-[11px] text-gray-500 truncate">{category} • Código: {code}</p>
      </div>

      <div className="flex flex-col items-end justify-center px-4 shrink-0 border-l border-gray-200">
        <span className="font-bold text-primary text-sm">${price.toFixed(2)}</span>
        <span className="text-[11px] font-bold text-gray-500">Stock: {stock} u.</span>
      </div>
    </button>
  );
}