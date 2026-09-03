// src/components/ActionCard.tsx
import type { ReactNode } from "react";

export interface ActionCardProps {
  id: string;
  title: string;
  description: string;
  iconBg: string;
  icon: ReactNode;
  onClick?: () => void;
}

export function ActionCard({
  title,
  description,
  iconBg,
  icon,
  onClick,
}: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-between rounded-3xl border border-white/60 bg-surface-1 p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 text-center cursor-pointer hover:-translate-y-1.5 w-full"
    >
      {/* Contenedor superior para el ícono o imagen */}
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${iconBg} text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>

      {/* Textos informativos */}
      <div className="flex flex-col flex-grow justify-center">
        <h3 className="text-base font-bold text-on-bg group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-xs text-on-bg/60 leading-relaxed">
          {description}
        </p>
      </div>
    </button>
  );
}