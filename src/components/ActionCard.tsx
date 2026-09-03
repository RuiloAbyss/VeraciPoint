// src/components/ActionCard.tsx
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
}

export function ActionCard({
  id,
  title,
  description,
  iconBg,
  icon,
  onClick,
  isSelected,
}: ActionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group flex w-full flex-col items-center justify-between rounded-2xl border border-white/50 bg-surface-1/80 p-4 shadow-md backdrop-blur-md transition-colors duration-200 hover:border-primary hover:bg-surface-1 hover:shadow-xl cursor-pointer ${
        isSelected ? "pointer-events-none z-50 ring-2 ring-primary" : ""
      }`}
    >
      <div
        className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${iconBg} text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110`}
      >
        {icon}
      </div>

      <div className="flex flex-grow flex-col justify-center text-center">
        <h3 className="text-sm font-bold text-on-bg transition-colors group-hover:text-primary lg:text-base">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-on-bg/70">
          {description}
        </p>
      </div>
    </motion.button>
  );
}