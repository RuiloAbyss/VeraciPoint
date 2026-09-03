// src/components/BulkProductCard.tsx
export interface BulkProductCardProps {
  name: string;
  pricePerKg: number;
  icon?: string;
}

export function BulkProductCard({ name, pricePerKg, icon = "📷" }: BulkProductCardProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface-1 border border-white/50 p-2 text-center hover:shadow-md transition-shadow cursor-pointer hover:border-primary shadow-sm">
      <div className="h-24 w-full rounded-xl bg-surface-3 flex items-center justify-center text-3xl mb-2 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xs font-bold leading-tight mb-1 text-on-bg">{name}</h3>
      <p className="text-xs font-semibold text-primary mt-auto">${pricePerKg.toFixed(2)}/kg</p>
    </div>
  );
}