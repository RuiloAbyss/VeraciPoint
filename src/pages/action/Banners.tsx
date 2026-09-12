import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { fetchBanners, createBanner, editBanner, deleteBanner, type Banner } from "../../services/bannerService";

export function Banners() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  // Modal de Error Técnico
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; details: string }>({ isOpen: false, title: "", details: "" });

  // Estados del Formulario
  const [editingId, setEditingId] = useState<number | null>(null);
  const [existingPhoto, setExistingPhoto] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await fetchBanners(false); 
      setBanners(data || []);
    } catch (e) {
      setErrorModal({ isOpen: true, title: "Fallo al cargar catálogo", details: String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewPhoto(base64String.split(",")[1]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (b: Banner) => {
    setEditingId(b.id);
    setNewTitle(b.title);
    setNewStart(b.startDate);
    setNewEnd(b.endDate);
    setExistingPhoto(b.photo);
    setNewPhoto("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
    setNewPhoto("");
    setExistingPhoto("");
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await editBanner(editingId, newTitle, newStart, newEnd, newPhoto || null);
        showToast("Banner actualizado exitosamente", "success");
      } else {
        if (!newPhoto) {
            showToast("Debes subir una imagen", "error");
            setLoading(false);
            return;
        }
        await createBanner(newTitle, newStart, newEnd, newPhoto);
        showToast("Banner publicado exitosamente", "success");
      }
      cancelEdit();
      await loadBanners();
    } catch (e: any) {
      setErrorModal({ isOpen: true, title: "Error crítico al guardar", details: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await deleteBanner(id);
      showToast("Banner eliminado", "success");
      if (editingId === id) cancelEdit();
      await loadBanners();
    } catch (e: any) {
      setErrorModal({ isOpen: true, title: "Error crítico al eliminar", details: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-gray-900 z-20 bg-gray-50/50 backdrop-blur-sm" initial={{ x: "100%" }} animate={{ x: "0%" }} exit={{ x: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer transition-colors">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Admin</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Gestor de Promociones</h1>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden gap-3">
        
        {/* FORMULARIO DE ALTA / EDICIÓN */}
        <section className={`w-full md:w-1/3 border p-5 rounded-2xl shadow-sm overflow-y-auto custom-scrollbar transition-colors ${editingId ? 'bg-orange-50/30 border-orange-200' : 'bg-white border-gray-200'}`}>
            <h3 className="font-extrabold text-lg text-gray-900 mb-1">
                {editingId ? 'Editar Anuncio' : 'Nuevo Anuncio'}
            </h3>
            <p className="text-xs font-bold text-gray-500 mb-4 pb-4 border-b border-gray-100">
                {editingId ? 'Modifica los datos o sube una nueva imagen para reemplazar la actual.' : 'La imagen se mostrará automáticamente en el Dashboard durante las fechas indicadas.'}
            </p>
            
            <form onSubmit={handleSaveBanner} className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Título (Referencia Interna)</label>
                    <input required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ej. Ofertas Verano..." className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-bold mt-1 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha Inicio</label>
                        <input required type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-primary font-bold mt-1 transition-colors cursor-pointer" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha Fin</label>
                        <input required type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2.5 text-xs outline-none focus:border-primary font-bold mt-1 transition-colors cursor-pointer" />
                    </div>
                </div>
                
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Fotografía (Panorámica 16:9) {editingId && <span className="text-orange-500 ml-1">(Opcional)</span>}
                    </label>
                    <div className="mt-1 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-4 text-center hover:border-primary/50 transition-colors">
                        <input required={!editingId} type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:uppercase file:font-extrabold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer" />
                    </div>
                </div>
                
                {/* PREVIEW EN FORMATO PANORÁMICO EXACTO AL DASHBOARD */}
                {(newPhoto || existingPhoto) && (
                    <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        src={`data:image/jpeg;base64,${newPhoto || existingPhoto}`} 
                        alt="Preview" 
                        className="w-full aspect-[21/9] object-cover object-center rounded-xl border border-gray-200 shadow-sm" 
                    />
                )}
                
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="flex-1 bg-white border border-gray-200 text-gray-600 font-extrabold text-xs py-3.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
                            Cancelar
                        </button>
                    )}
                    <button type="submit" className={`flex-1 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md hover:brightness-90 transition-colors uppercase tracking-widest cursor-pointer ${editingId ? 'bg-orange-500' : 'bg-primary'}`}>
                        {editingId ? 'Guardar Cambios' : 'Subir y Publicar'}
                    </button>
                </div>
            </form>
        </section>

        {/* LISTADO DE BANNERS */}
        <section className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-extrabold text-lg text-gray-900 mb-4">Catálogo de Banners</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {banners.map(b => {
                    const dStart = new Date(b.startDate + 'T00:00:00');
                    const dEnd = new Date(b.endDate + 'T23:59:59');
                    const isCurrent = new Date() >= dStart && new Date() <= dEnd;
                    
                    return (
                    <div key={b.id} className={`rounded-2xl border p-2 flex flex-col gap-2 relative transition-all shadow-sm ${isCurrent ? 'border-green-400 bg-green-50/50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                        
                        {/* MINIATURA EN FORMATO PANORÁMICO */}
                        <div className="relative rounded-xl overflow-hidden bg-gray-200 aspect-[21/9]">
                            <img src={`data:image/jpeg;base64,${b.photo}`} alt={b.title} className="w-full h-full object-cover object-center" />
                            {isCurrent && <span className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded shadow-sm">Activo</span>}
                        </div>
                        
                        <div className="px-1 flex justify-between items-center pb-1">
                            <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-sm text-gray-900 truncate">{b.title}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{b.startDate} al {b.endDate}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => handleEditClick(b)} className="bg-white border border-gray-200 text-blue-500 w-8 h-8 rounded-full flex items-center justify-center text-xs hover:bg-blue-50 hover:border-blue-200 hover:scale-105 transition-all cursor-pointer shadow-sm" title="Editar Banner">
                                    ✏️
                                </button>
                                <button onClick={() => handleDelete(b.id)} className="bg-white border border-gray-200 text-red-500 w-8 h-8 rounded-full flex items-center justify-center text-xs hover:bg-red-50 hover:border-red-200 hover:scale-105 transition-all cursor-pointer shadow-sm" title="Eliminar definitivamente">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                )})}
                {banners.length === 0 && <div className="col-span-full text-center text-gray-400 font-bold py-10">No hay promociones registradas en el sistema.</div>}
            </div>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-[90] left-1/2 -translate-x-1/2">
            <div className={`px-6 py-3 rounded-full shadow-xl font-bold text-sm text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col gap-4 border border-gray-100">
              <div className="flex items-center gap-3 text-red-500 border-b border-gray-100 pb-3">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-xl font-extrabold text-gray-900">{errorModal.title}</h3>
              </div>
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 max-h-64 overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono break-words">{errorModal.details}</pre>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setErrorModal({ isOpen: false, title: "", details: "" })} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg cursor-pointer">Cerrar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}