import type { ReactNode } from "react";
import { motion } from "framer-motion";

export interface ActionCardProps {
  id: string;
  title: string;
  description: string;
  iconBg: string;
  icon: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  disabled?: boolean;
}

export function ActionCard({
  title,
  description,
  iconBg,
  icon,
  onClick,
  isSelected,
  disabled = false,
}: ActionCardProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`group relative flex w-full h-full flex-col items-center justify-center gap-2 rounded-2xl border outline-none p-4 shadow-md backdrop-blur-md transition-all duration-200 ${
        disabled
          ? "border-white/10 bg-surface-1/40 opacity-40 cursor-not-allowed filter grayscale"
          : "border-white/50 bg-surface-1/80 hover:border-primary hover:bg-surface-1 hover:shadow-xl cursor-pointer"
      } ${isSelected ? "pointer-events-none z-50 ring-2 ring-primary" : ""}`}
    >
      {disabled && (
        <span className="absolute top-2 right-2 rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-500/30">
          Bloqueado
        </span>
      )}

      <div
        className={`mb-2 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} text-3xl shadow-inner transition-transform duration-300 ${
          disabled ? "" : "group-hover:scale-110"
        }`}
      >
        {icon}
      </div>

      <div className="flex flex-col justify-center text-center">
        <h3 className={`text-sm font-bold transition-colors lg:text-base ${disabled ? "text-on-bg/50" : "text-on-bg group-hover:text-primary"}`}>
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-on-bg/60">
          {description}
        </p>
      </div>
    </motion.button>
  );
}