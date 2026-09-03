// src/components/ProductCard.tsx
export interface ProductCardProps {
  name: string;
  category: string;
  code: string;
  price: number;
  stock: number;
}

export function ProductCard({ name, category, code, price, stock }: ProductCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-1 p-3 hover:bg-surface-3 transition-colors border border-white/40 shadow-sm">
      <div>
        <p className="font-bold text-sm text-on-bg">{name}</p>
        <p className="text-xs text-on-bg/60">{category} • Código: {code}</p>
      </div>
      <div className="text-right">
        <p className="font-bold text-primary">${price.toFixed(2)}</p>
        <p className="text-xs text-on-bg/60">Stock: {stock} u.</p>
      </div>
    </div>
  );
}