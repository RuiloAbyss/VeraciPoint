// src/contexts/LoadingContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading: setIsLoading }}>
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-gray-100">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
              <span className="text-sm font-extrabold text-gray-700 tracking-wide">Procesando...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
}

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error("useLoading debe usarse dentro de LoadingProvider");
  return context;
};