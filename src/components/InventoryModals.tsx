import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Product } from "../services/productService";

const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar">
      {children}
    </motion.div>
  </motion.div>
);

export function ProductFormModal({ 
  isOpen, 
  mode = 'create', 
  product, 
  categories, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean, 
  mode?: 'create' | 'edit' | 'clone', 
  product: Product | null, 
  categories: string[], 
  onClose: () => void, 
  onSave: (data: any) => void 
}) {
  const isEdit = mode === 'edit';
  const isClone = mode === 'clone';
  
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [category, setCategory] = useState(categories[0] || "");
  const [sellformat, setSellformat] = useState("Pieza");
  const [quantity, setQuantity] = useState<string>("");
  const [minStock, setMinStock] = useState<string>("");
  const [maxStock, setMaxStock] = useState<string>("");
  const [hasBarcode, setHasBarcode] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(product?.name || "");
      setPrice(product?.price?.toString() || "");
      setCategory(product?.category || categories[0] || "");
      setSellformat(product?.sellformat || "Pieza");
      // Si estamos clonando, dejamos la cantidad vacía para que la capture como producto nuevo
      setQuantity(isEdit ? (product?.stock?.toString() || "") : "");
      setMinStock(product?.minStock !== null && product?.minStock !== undefined ? product.minStock.toString() : "");
      setMaxStock(product?.maxStock !== null && product?.maxStock !== undefined ? product.maxStock.toString() : "");
      
      // Si estamos clonando, el código de barras por defecto se quita
      setHasBarcode(product ? (isClone ? false : product.barcode !== null) : false);
      setBarcode(product?.barcode && !isClone ? product.barcode.toString() : "");
      
      setPhotoPreview(product?.photo ? `data:image/jpeg;base64,${product.photo.replace(/\s+/g, '')}` : null);
      
      // Si clonamos un producto con foto, pasamos la foto base64 como si fuera nueva
      setNewPhotoBase64(isClone && product?.photo ? product.photo : null);
    }
  }, [product, isOpen, categories, mode]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
        setNewPhotoBase64((reader.result as string).split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const titleStr = isEdit ? "Editar Producto" : isClone ? "Clonar Producto" : "Nuevo Producto";

  return (
    <ModalWrapper>
      <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b pb-2">{titleStr}</h3>
      <form onSubmit={(e) => { 
        e.preventDefault(); 
        onSave({ 
          name, 
          price: parseFloat(price) || 0, 
          category, 
          sellformat, 
          quantity: parseFloat(quantity) || 0, 
          barcode: hasBarcode && barcode.trim() !== "" ? barcode : null, 
          minStock: minStock !== "" ? parseFloat(minStock) : null,
          maxStock: maxStock !== "" ? parseFloat(maxStock) : null,
          newPhotoBase64 
        }); 
      }} className="space-y-4">
        
        <div className="w-full h-36 bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative group cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
          {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center opacity-40"><span className="text-4xl mb-1">📷</span><span className="text-xs font-bold text-gray-500">Añadir foto</span></div>}
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFile} />

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Formato</label>
            <select value={sellformat} onChange={e => setSellformat(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors">
              <option value="Pieza">Pieza</option><option value="Peso">Peso (Granel)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Precio ($)</label>
            <input type="number" step="0.01" required min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stock Inicial</label>
              <input type="number" step={sellformat === "Pieza" ? "1" : "0.001"} required min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stock Mínimo (Opc.)</label>
            <input type="number" step={sellformat === "Pieza" ? "1" : "0.001"} min="0" value={minStock} onChange={e => setMinStock(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stock Máximo (Opc.)</label>
            <input type="number" step={sellformat === "Pieza" ? "1" : "0.001"} min="0" value={maxStock} onChange={e => setMaxStock(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
          </div>
        </div>

        <div className="pt-1 border-t border-gray-200 mt-2">
          <label className="flex items-center gap-2 cursor-pointer w-max mt-2">
            <input type="checkbox" checked={hasBarcode} onChange={(e) => setHasBarcode(e.target.checked)} className="rounded text-primary w-4 h-4 cursor-pointer" />
            <span className="text-sm font-bold text-gray-700">Asignar código de barras</span>
          </label>
        </div>
        {hasBarcode && (
          <input type="text" required placeholder="Ej. 7501020555305" value={barcode} onChange={e => setBarcode(e.target.value.replace(/[^0-9]/g, ''))} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white font-mono text-gray-900 transition-colors" />
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">Cancelar</button>
          <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 cursor-pointer transition-all">
            {isClone ? 'Guardar Clon' : 'Guardar'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

export function RestockModal({ isOpen, product, onClose, onConfirm }: { isOpen: boolean, product: Product | null, onClose: () => void, onConfirm: (qty: number) => void }) {
  const [qty, setQty] = useState("");
  useEffect(() => { if (isOpen) setQty(""); }, [isOpen]);
  if (!isOpen || !product) return null;
  const isPieza = product.sellformat === "Pieza";
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => setQty(isPieza ? e.target.value.replace(/[^0-9]/g, '') : e.target.value);

  return (
    <ModalWrapper>
      <h3 className="text-xl font-extrabold text-gray-900 mb-2 border-b pb-2">Surtir Inventario</h3>
      <p className="text-sm text-gray-600 mb-4">Añadir existencias a: <strong className="text-gray-900">{product.name}</strong></p>
      <form onSubmit={(e) => { e.preventDefault(); const num = parseFloat(qty); if (num > 0) onConfirm(num); }}>
        <input type="number" step={isPieza ? "1" : "0.001"} min={isPieza ? "1" : "0.001"} required value={qty} onChange={handleInput} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-lg outline-none focus:border-primary mb-4 text-center font-bold text-primary transition-colors" placeholder={isPieza ? "Cantidad de piezas..." : "Cantidad a granel..."} />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">Cancelar</button>
          <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 cursor-pointer transition-all">Surtir</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

export function DeactivateModal({ isOpen, product, onClose, onConfirm }: { isOpen: boolean, product: Product | null, onClose: () => void, onConfirm: (mode: 'full' | 'partial', qty?: number) => void }) {
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [qty, setQty] = useState("");
  
  useEffect(() => { if (isOpen) { setMode('full'); setQty(""); } }, [isOpen]);
  if (!isOpen || !product) return null;
  const isPieza = product.sellformat === "Pieza";
  
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = isPieza ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
    if (val !== "" && parseFloat(val) > product.stock) {
      val = product.stock.toString();
    }
    setQty(val);
  };

  return (
    <ModalWrapper>
      <div className="text-left">
        <h3 className="text-xl font-extrabold text-gray-900 mb-2 border-b pb-2">Opciones de Baja</h3>
        <p className="text-sm text-gray-600 mb-4">Selecciona la acción para <strong className="text-gray-900">{product.name}</strong>:</p>
        
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          if (mode === 'full') onConfirm('full');
          else { const num = parseFloat(qty); if (num > 0) onConfirm('partial', num); }
        }}>
          <div className="space-y-3 mb-6">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'full' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="deactivateMode" checked={mode === 'full'} onChange={() => setMode('full')} className="text-red-500 focus:ring-red-500" />
              <div className="flex flex-col"><span className="font-bold text-gray-900 text-sm">Dar de baja temporalmente</span><span className="text-xs text-gray-500">Inhabilitará el producto del catálogo activo.</span></div>
            </label>
            
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mode === 'partial' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="deactivateMode" checked={mode === 'partial'} onChange={() => setMode('partial')} className="text-orange-500 focus:ring-orange-500" />
              <div className="flex flex-col"><span className="font-bold text-gray-900 text-sm">Registrar Merma / Pérdida</span><span className="text-xs text-gray-500">Descuenta una cantidad específica del stock.</span></div>
            </label>

            {mode === 'partial' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                <input type="number" step={isPieza ? "1" : "0.001"} min={isPieza ? "1" : "0.001"} max={product.stock} required value={qty} onChange={handleInput} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors" placeholder={isPieza ? "Cantidad de piezas perdidas..." : "Cantidad en Kg perdida..."} />
                <p className="text-[10px] text-gray-500 mt-1.5 font-bold uppercase tracking-wide">Stock disponible: <span className="text-orange-600">{product.stock}</span></p>
              </motion.div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">Cancelar</button>
            <button type="submit" className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all cursor-pointer ${mode === 'full' ? 'bg-red-500 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>{mode === 'full' ? 'Desactivar' : 'Descontar'}</button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}

export function OfferModal({ isOpen, product, onClose, onConfirm }: { isOpen: boolean, product: Product | null, onClose: () => void, onConfirm: (qty: number, newPrice: number) => void }) {
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (isOpen) {
      setQty("");
      setPrice("");
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;
  
  const isPieza = product.sellformat === "Pieza";
  const unitLabel = isPieza ? "pzas" : "kg";

  const handleQty = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = isPieza ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
    if (val !== "" && parseFloat(val) > product.stock) val = product.stock.toString();
    setQty(val);
  };

  return (
    <ModalWrapper>
      <div className="text-left">
        <h3 className="text-2xl font-extrabold text-orange-600 mb-2 border-b border-orange-100 pb-2 flex items-center gap-2">
          🏷️ Generar Oferta
        </h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          Estás a punto de crear una promoción para <strong className="text-gray-900 font-extrabold">{product.name}</strong>. Esto moverá una parte de tu inventario actual a la sección de ofertas.
        </p>

        {/* Cuadro Comparativo (Antes y Después) */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-inner flex flex-col justify-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Stock Original</span>
            <p className="font-extrabold text-xl text-gray-900">${product.price.toFixed(2)} <span className="text-xs text-gray-500 font-bold">/{isPieza ? 'pza' : 'kg'}</span></p>
            <p className="text-xs font-bold text-gray-500 mt-1">Disp: {product.stock} {unitLabel}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 text-6xl">🏷️</div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1 z-10">Nueva Oferta</span>
            <p className="font-extrabold text-xl text-orange-600 z-10">
              {price ? `$${parseFloat(price).toFixed(2)}` : "$0.00"} <span className="text-xs text-orange-400 font-bold">/{isPieza ? 'pza' : 'kg'}</span>
            </p>
            <p className="text-xs font-bold text-orange-600 mt-1 z-10">A mover: {qty || 0} {unitLabel}</p>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const numQty = parseFloat(qty);
          const numPrice = parseFloat(price);
          if (numQty > 0 && numPrice >= 0) onConfirm(numQty, numPrice);
        }}>
          <div className="space-y-5 mb-6">
             <div>
                <label className="block text-xs font-extrabold text-gray-700 uppercase mb-2">1. ¿Cuánto stock pondrás en oferta?</label>
                <div className="relative">
                  <input type="number" step={isPieza ? "1" : "0.001"} min={isPieza ? "1" : "0.001"} max={product.stock} required value={qty} onChange={handleQty} className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/30 px-4 py-3 text-lg outline-none focus:border-orange-500 focus:bg-white font-bold transition-colors" placeholder={isPieza ? "Ej. 5 piezas..." : "Ej. 2.5 kg..."} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 font-bold uppercase text-sm">{unitLabel}</span>
                </div>
             </div>
             <div>
                <label className="block text-xs font-extrabold text-gray-700 uppercase mb-2">2. Nuevo precio rebajado ($)</label>
                <input type="number" step="0.01" min="0" required value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg outline-none focus:border-orange-500 font-bold transition-colors" placeholder="Ej. 15.50" />
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 cursor-pointer">Confirmar Oferta</button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
export function DeleteConfirmModal({
  isOpen,
  productName,
  onClose,
  onConfirm
}: {
  isOpen: boolean;
  productName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <ModalWrapper>
      <div className="text-center p-2">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
          🗑️
        </div>
        <h3 className="text-xl font-extrabold text-gray-900 mb-2">Eliminar Producto</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          ¿Estás seguro de que deseas eliminar permanentemente <strong className="text-gray-900">"{productName}"</strong> de la base de datos? <br/>
          <span className="text-xs text-red-500 font-semibold">Esta acción no se puede deshacer. Su registro en ventas previas se preservará solo como texto.</span>
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-md shadow-red-600/30 cursor-pointer"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}