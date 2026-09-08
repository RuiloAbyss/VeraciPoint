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

export function ProductFormModal({ isOpen, product, categories, onClose, onSave }: { isOpen: boolean, product: Product | null, categories: string[], onClose: () => void, onSave: (data: any) => void }) {
  const isEdit = !!product;
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
      setQuantity(isEdit ? (product?.stock?.toString() || "") : "");
      setMinStock(product?.minStock !== null && product?.minStock !== undefined ? product.minStock.toString() : "");
      setMaxStock(product?.maxStock !== null && product?.maxStock !== undefined ? product.maxStock.toString() : "");
      setHasBarcode(product ? product.barcode !== null : false);
      setBarcode(product?.barcode ? product.barcode.toString() : "");
      setPhotoPreview(product?.photo ? `data:image/jpeg;base64,${product.photo.replace(/\s+/g, '')}` : null);
      setNewPhotoBase64(null);
    }
  }, [product, isOpen, categories]);

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

  return (
    <ModalWrapper>
      <h3 className="text-xl font-extrabold text-gray-900 mb-4 border-b pb-2">{isEdit ? "Editar Producto" : "Nuevo Producto"}</h3>
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
              <input type="number" step={sellformat === "Pieza" ? "1" : "0.01"} required min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stock Mínimo (Opc.)</label>
            <input type="number" step={sellformat === "Pieza" ? "1" : "0.01"} min="0" value={minStock} onChange={e => setMinStock(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Stock Máximo (Opc.)</label>
            <input type="number" step={sellformat === "Pieza" ? "1" : "0.01"} min="0" value={maxStock} onChange={e => setMaxStock(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-white text-gray-900 font-medium transition-colors" />
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
          <button type="submit" className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 cursor-pointer transition-all">Guardar</button>
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
        <input type="number" step={isPieza ? "1" : "0.01"} min={isPieza ? "1" : "0.01"} required value={qty} onChange={handleInput} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-lg outline-none focus:border-primary mb-4 text-center font-bold text-primary transition-colors" placeholder={isPieza ? "Cantidad de piezas..." : "Cantidad a granel..."} />
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
                <input type="number" step={isPieza ? "1" : "0.01"} min={isPieza ? "1" : "0.01"} max={product.stock} required value={qty} onChange={handleInput} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors" placeholder={isPieza ? "Cantidad de piezas perdidas..." : "Cantidad en Kg perdida..."} />
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

  const handleQty = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = isPieza ? e.target.value.replace(/[^0-9]/g, '') : e.target.value;
    if (val !== "" && parseFloat(val) > product.stock) val = product.stock.toString();
    setQty(val);
  };

  return (
    <ModalWrapper>
      <div className="text-left">
        <h3 className="text-xl font-extrabold text-orange-600 mb-2 border-b border-orange-100 pb-2">Generar Oferta / Merma</h3>
        <p className="text-sm text-gray-600 mb-4">Transferir stock de <strong className="text-gray-900">{product.name}</strong> a la categoría de Ofertas.</p>

        <form onSubmit={(e) => {
          e.preventDefault();
          const numQty = parseFloat(qty);
          const numPrice = parseFloat(price);
          if (numQty > 0 && numPrice >= 0) onConfirm(numQty, numPrice);
        }}>
          <div className="space-y-4 mb-6">
             <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Cantidad a separar</label>
                <input type="number" step={isPieza ? "1" : "0.01"} min={isPieza ? "1" : "0.01"} max={product.stock} required value={qty} onChange={handleQty} className="w-full rounded-xl border border-orange-200 bg-orange-50/30 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:bg-white font-bold transition-colors" placeholder={isPieza ? "Piezas a ofertar..." : "Kg a ofertar..."} />
                <div className="flex justify-between items-center mt-1.5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Stock origen: {product.stock}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Precio original: <span className="text-gray-700">${product.price.toFixed(2)}</span></p>
                </div>
             </div>
             <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Precio Especial de Oferta ($)</label>
                <input type="number" step="0.01" min="0" required value={price} onChange={e => setPrice(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 font-bold transition-colors" placeholder="Ej. 15.50" />
             </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-md shadow-orange-500/20">Generar Oferta</button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}