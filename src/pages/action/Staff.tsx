import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLoading } from "../../components/LoadingContext";
import { 
  getEmployees, getShifts, saveEmployee, toggleEmployee, saveShift, 
  getAttendance, toggleDayOff, type Employee, type Shift, type Attendance 
} from "../../services/employeeService";

const DAYS_OF_WEEK = [
  { key: 'L', label: 'Lunes' }, { key: 'M', label: 'Martes' }, { key: 'X', label: 'Miércoles' },
  { key: 'J', label: 'Jueves' }, { key: 'V', label: 'Viernes' }, { key: 'S', label: 'Sábado' }, { key: 'D', label: 'Domingo' }
];

export function Staff() {
  const navigate = useNavigate();
  const { setLoading } = useLoading();
  const [activeTab, setActiveTab] = useState<'employees' | 'shifts'>('employees');
  
  const [activeEmployeeId, setActiveEmployeeId] = useState<number>(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<{ msg: string } | null>(null);

  const [empModal, setEmpModal] = useState<{ isOpen: boolean; data: Partial<Employee> }>({ isOpen: false, data: {} });
  const [shiftModal, setShiftModal] = useState<{ isOpen: boolean; data: Partial<Shift> }>({ isOpen: false, data: {} });
  const [deactivateModal, setDeactivateModal] = useState<{ isOpen: boolean; id: number, currentStatus: boolean, name: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState("");

  const [sidebar, setSidebar] = useState<{ isOpen: boolean; emp: Employee | null }>({ isOpen: false, emp: null });
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      setEmployees(await getEmployees());
      setShifts(await getShifts());
    } catch (e) {
      setToast({ msg: "Error al cargar la base de datos" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    const raw = localStorage.getItem("userSession");
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            setActiveEmployeeId(parsed.employeeId || parsed.employee_id || 0);
        } catch (e) {}
    }
    loadData(); 
  }, []);

  const filteredEmployees = useMemo(() => employees.filter(e => showInactive ? !e.status : e.status), [employees, showInactive]);

  useEffect(() => {
    if (sidebar.isOpen && sidebar.emp) {
      const fetchAtt = async () => {
        const today = new Date();
        const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
        setAttendance(await getAttendance(sidebar.emp!.id, start, end));
      };
      fetchAtt();
    }
  }, [sidebar.isOpen, sidebar.emp]);

  const handleToggleStatus = async () => {
    if (!deactivateModal) return;
    
    // VALIDACIÓN: No auto-baja
    if (deactivateModal.id === activeEmployeeId && deactivateModal.currentStatus) {
        setToast({ msg: "Acción Denegada: No puedes darte de baja a ti mismo." });
        setTimeout(() => setToast(null), 3500);
        setDeactivateModal(null);
        return;
    }

    setLoading(true);
    try {
      await toggleEmployee(deactivateModal.id, !deactivateModal.currentStatus);
      setDeactivateModal(null);
      await loadData();
    } catch (e) {
      setToast({ msg: "Error al actualizar estado" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDACIÓN: No cambiar rol propio
    const originalEmp = employees.find(emp => emp.id === empModal.data.id);
    let finalIsAdmin = empModal.data.isAdmin || false;
    
    if (empModal.data.id === activeEmployeeId && originalEmp) {
        if (originalEmp.isAdmin !== empModal.data.isAdmin) {
            setToast({ msg: "Acción Denegada: No puedes cambiar tu propio cargo." });
            setTimeout(() => setToast(null), 3500);
            return;
        }
    }

    setLoading(true);
    try {
      await saveEmployee({
        id: empModal.data.id || 0,
        name: empModal.data.name || "",
        lastname: empModal.data.lastname || "",
        user: empModal.data.username || "",
        pass: passwordInput || "",
        isAdmin: finalIsAdmin 
      });
      setEmpModal({ isOpen: false, data: {} });
      setPasswordInput("");
      await loadData();
    } catch (error) {
      setToast({ msg: "Error al guardar el empleado" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftModal.data.employeeId || !shiftModal.data.daysCovered) {
        setToast({ msg: "Selecciona un empleado y al menos un día" });
        setTimeout(() => setToast(null), 3000);
        return;
    }
    setLoading(true);
    try {
      await saveShift({
        shiftId: shiftModal.data.shiftId || 0,
        empId: shiftModal.data.employeeId,
        start: shiftModal.data.startTime || "",
        end: shiftModal.data.endTime || "",
        days: shiftModal.data.daysCovered
      });
      setShiftModal({ isOpen: false, data: {} });
      await loadData();
    } catch (error) {
      setToast({ msg: "Error al guardar el turno" });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayKey: string) => {
    const currentDays = shiftModal.data.daysCovered ? shiftModal.data.daysCovered.split(',') : [];
    const newDays = currentDays.includes(dayKey) ? currentDays.filter(d => d !== dayKey) : [...currentDays, dayKey];
    setShiftModal(prev => ({ ...prev, data: { ...prev.data, daysCovered: newDays.join(',') } }));
  };

  const handleInteractiveDayOff = async (dateStr: string) => {
      if (!sidebar.emp) return;
      setLoading(true);
      try {
          await toggleDayOff(sidebar.emp.id, dateStr);
          const today = new Date();
          const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
          const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
          setAttendance(await getAttendance(sidebar.emp.id, start, end));
      } finally {
          setLoading(false);
      }
  };

  const currentMonthDays = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dayMap = ['D','L','M','X','J','V','S'];

    if (!sidebar.emp) return { days: [], stats: { onTime: 0, late: 0, absent: 0, dayOff: 0 } };
    
    const empCreatedAt = sidebar.emp.createdAt ? new Date(sidebar.emp.createdAt + "T00:00:00").toISOString().split('T')[0] : "2000-01-01";
    const empShift = shifts.find(s => s.employeeId === sidebar.emp!.id);

    let onTime = 0, late = 0, absent = 0, dayOffCount = 0;

    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const att = attendance.find(a => a.date === dateStr);
        const isScheduled = empShift ? empShift.daysCovered.split(',').includes(dayMap[new Date(y, m, d).getDay()]) : false;

        let status = 'future'; 
        
        if (dateStr < empCreatedAt) {
            status = 'inactive'; 
        }
        else if (att?.isDayOff) {
            status = 'dayoff'; 
            if (dateStr <= todayStr) dayOffCount++;
        } 
        else if (dateStr > todayStr) {
            status = 'future';
        }
        else if (!isScheduled) {
            status = 'future'; 
        }
        else if (!att?.clockIn) {
            if (dateStr < todayStr) {
                status = 'absent'; 
                absent++;
            } else {
                status = 'future'; 
            }
        }
        else {
            const [sH, sM] = empShift!.startTime.split(':').map(Number);
            const [cH, cM] = att.clockIn.split(':').map(Number);
            const diffMins = (cH * 60 + cM) - (sH * 60 + sM);

            if (diffMins <= 15) {
                status = 'ontime'; 
                onTime++;
            } else {
                status = 'late'; 
                late++;
            }
        }

        return { day: d, dateStr, status, clockIn: att?.clockIn };
    });

    return { days, stats: { onTime, late, absent, dayOff: dayOffCount } };
  }, [sidebar.emp, attendance, shifts]);

  const isEditingSelf = empModal.data.id === activeEmployeeId;

  return (
    <motion.div className="absolute inset-0 flex flex-col p-2 sm:p-4 lg:p-5 gap-3 text-gray-900 z-20 bg-gray-50/50 backdrop-blur-sm" initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }} transition={{ duration: 0.28 }}>
      
      <header className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-4 py-3 shadow-sm shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="font-extrabold text-primary hover:text-secondary text-base sm:text-lg px-2 cursor-pointer">Volver</button>
          <div className="h-6 sm:h-8 w-1.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-gray-400 uppercase hidden sm:block">Abarrotes Janny • Admin</span>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-none">Recursos Humanos</h1>
          </div>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'employees' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-800'}`}>Directorio</button>
          <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'shifts' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-800'}`}>Turnos y Horarios</button>
        </div>
      </header>

      <section className="flex-1 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-extrabold text-gray-900">{activeTab === 'employees' ? 'Plantilla de Personal' : 'Asignación de Horarios'}</h2>
                {activeTab === 'employees' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                        Mostrar Inactivos
                    </label>
                )}
            </div>
            <button onClick={() => activeTab === 'employees' ? setEmpModal({ isOpen: true, data: { isAdmin: false } }) : setShiftModal({ isOpen: true, data: { startTime: '08:00', endTime: '16:00', daysCovered: 'L,M,X,J,V' } })} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-gray-800 transition-colors cursor-pointer">
                + Registrar {activeTab === 'employees' ? 'Empleado' : 'Turno'}
            </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar border border-gray-100 rounded-xl bg-gray-50/50">
          {activeTab === 'employees' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr><th className="p-4">Nombre Completo</th><th className="p-4">Usuario</th><th className="p-4">Rol</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-bold">No hay registros.</td></tr>}
                {filteredEmployees.map(e => (
                  <tr key={e.id} className="hover:bg-white transition-colors group">
                    <td className="p-4 font-extrabold text-gray-900 flex items-center gap-2">
                        {e.name} {e.lastname} 
                        {e.id === activeEmployeeId && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md uppercase font-bold tracking-widest">Tú</span>}
                    </td>
                    <td className="p-4 text-gray-500 font-medium">@{e.username}</td>
                    <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border tracking-wider ${e.isAdmin ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {e.isAdmin ? 'ADMINISTRADOR' : 'CAJERO'}
                        </span>
                    </td>
                    <td className="p-4 text-right gap-4 flex justify-end items-center">
                      <button onClick={() => setSidebar({isOpen: true, emp: e})} className="text-gray-500 font-bold hover:text-primary transition-colors cursor-pointer bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs">Revisar Asistencia</button>
                      <div className="w-px h-4 bg-gray-200" />
                      <button onClick={() => setEmpModal({ isOpen: true, data: e })} className="text-blue-500 font-bold hover:underline cursor-pointer">Editar</button>
                      <button 
                        onClick={() => {
                            if (e.id === activeEmployeeId && e.status) {
                                setToast({ msg: "No puedes darte de baja a ti mismo." });
                                setTimeout(() => setToast(null), 3000);
                                return;
                            }
                            setDeactivateModal({ isOpen: true, id: e.id, currentStatus: e.status, name: e.name });
                        }} 
                        className={`${e.status ? 'text-red-500' : 'text-green-600'} font-bold hover:underline cursor-pointer ${e.id === activeEmployeeId && e.status ? 'opacity-40 cursor-not-allowed hover:no-underline' : ''}`}
                      >
                        {e.status ? 'Dar de Baja' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10">
                <tr><th className="p-4">Empleado</th><th className="p-4">Horario</th><th className="p-4">Días Cubiertos</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400 font-bold">No hay turnos registrados.</td></tr>}
                {shifts.map(s => (
                  <tr key={s.shiftId} className="hover:bg-white transition-colors">
                    <td className="p-4 font-extrabold text-gray-900">{s.employeeName}</td>
                    <td className="p-4 text-primary font-extrabold">{s.startTime} - {s.endTime}</td>
                    <td className="p-4">
                        <div className="flex gap-1">
                            {DAYS_OF_WEEK.map(d => {
                                const isCovered = s.daysCovered.split(',').includes(d.key);
                                return <span key={d.key} className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${isCovered ? 'bg-primary text-white shadow-sm' : 'bg-gray-200 text-gray-400'}`}>{d.key}</span>
                            })}
                        </div>
                    </td>
                    <td className="p-4 text-right">
                        <button onClick={() => setShiftModal({ isOpen: true, data: s })} className="text-primary font-bold hover:underline cursor-pointer">Modificar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* PANEL LATERAL DE ASISTENCIA */}
      <AnimatePresence>
        {sidebar.isOpen && sidebar.emp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 z-[60] backdrop-blur-sm" onClick={() => setSidebar({isOpen: false, emp: null})} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl z-[70] flex flex-col border-l border-gray-200">
              
              <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                  <div>
                      <h2 className="text-xl font-extrabold text-gray-900 leading-none">{sidebar.emp.name}</h2>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1 block">Control de Asistencia • Mes Actual</span>
                  </div>
                  <button onClick={() => setSidebar({isOpen: false, emp: null})} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-sm font-bold">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center shrink-0">
                    <div className="flex flex-col"><span className="text-xl font-extrabold text-green-600">{currentMonthDays.stats.onTime}</span><span className="text-[9px] font-bold text-gray-500 uppercase">A Tiempo</span></div>
                    <div className="flex flex-col border-l border-gray-200"><span className="text-xl font-extrabold text-yellow-500">{currentMonthDays.stats.late}</span><span className="text-[9px] font-bold text-gray-500 uppercase">Retardo</span></div>
                    <div className="flex flex-col border-l border-gray-200"><span className="text-xl font-extrabold text-red-500">{currentMonthDays.stats.absent}</span><span className="text-[9px] font-bold text-gray-500 uppercase">Faltas</span></div>
                    <div className="flex flex-col border-l border-gray-200"><span className="text-xl font-extrabold text-blue-500">{currentMonthDays.stats.dayOff}</span><span className="text-[9px] font-bold text-gray-500 uppercase">Libres</span></div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs font-bold text-blue-800 text-center">
                    💡 Selecciona cualquier día en el calendario para alternar el estatus de "Día Libre".
                </div>

                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Historial e Interacción</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {currentMonthDays.days.map((d, i) => {
                            const colorClass = 
                                d.status === 'inactive' ? 'bg-gray-100 text-gray-300 border-transparent opacity-50' :
                                d.status === 'ontime' ? 'bg-green-500 text-white shadow-sm border-green-600' :
                                d.status === 'late' ? 'bg-yellow-400 text-yellow-900 shadow-sm border-yellow-500' :
                                d.status === 'absent' ? 'bg-red-500 text-white shadow-sm border-red-600' :
                                d.status === 'dayoff' ? 'bg-blue-500 text-white shadow-sm border-blue-600' :
                                'bg-gray-50 text-gray-400 border-gray-200 opacity-80 hover:border-blue-400';

                            return (
                                <button 
                                    key={i} 
                                    onClick={() => handleInteractiveDayOff(d.dateStr)}
                                    disabled={d.status === 'inactive'}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${d.status !== 'inactive' ? 'hover:scale-105 hover:shadow-md' : ''} ${colorClass}`}
                                    title={d.status === 'inactive' ? 'Antes de contratación' : 'Clic para alternar Día Libre'}
                                >
                                    <span className="text-sm font-extrabold leading-none">{d.day}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL EMPLEADO */}
      <AnimatePresence>
        {empModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.form initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onSubmit={handleSaveEmployee} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
                <h3 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b border-gray-100">{empModal.data.id ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Nombre</label><input required type="text" value={empModal.data.name || ''} onChange={e => setEmpModal(p => ({...p, data: {...p.data, name: e.target.value}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label><input required type="text" value={empModal.data.lastname || ''} onChange={e => setEmpModal(p => ({...p, data: {...p.data, lastname: e.target.value}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Usuario (Login)</label><input required type="text" value={empModal.data.username || ''} onChange={e => setEmpModal(p => ({...p, data: {...p.data, username: e.target.value}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Contraseña {empModal.data.id && '(Opcional)'}</label><input required={!empModal.data.id} type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center justify-between">
                            Rol en el Sistema
                            {isEditingSelf && <span className="text-[9px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded uppercase">No modificable</span>}
                        </label>
                        <div className="flex gap-2">
                            <label className={`flex-1 py-2 text-center rounded-lg text-xs font-bold border-2 transition-colors ${!empModal.data.isAdmin ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'} ${isEditingSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input type="radio" disabled={isEditingSelf} className="hidden" checked={!empModal.data.isAdmin} onChange={() => setEmpModal(p => ({...p, data: {...p.data, isAdmin: false}}))} /> Cajero
                            </label>
                            <label className={`flex-1 py-2 text-center rounded-lg text-xs font-bold border-2 transition-colors ${empModal.data.isAdmin ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'} ${isEditingSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input type="radio" disabled={isEditingSelf} className="hidden" checked={empModal.data.isAdmin} onChange={() => setEmpModal(p => ({...p, data: {...p.data, isAdmin: true}}))} /> Administrador
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setEmpModal({ isOpen: false, data: {} })} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer">Cancelar</button>
                    <button type="submit" className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-90 shadow-md cursor-pointer">Guardar</button>
                </div>
            </motion.form>
          </div>
        )}

        {/* MODAL TURNO */}
        {shiftModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.form initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onSubmit={handleSaveShift} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
                <h3 className="text-xl font-extrabold text-gray-900 mb-4 pb-2 border-b border-gray-100">{shiftModal.data.shiftId ? 'Modificar Turno' : 'Asignar Turno'}</h3>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Empleado</label>
                        <select required value={shiftModal.data.employeeId || ''} onChange={e => setShiftModal(p => ({...p, data: {...p.data, employeeId: Number(e.target.value)}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold cursor-pointer">
                            <option value="" disabled>Selecciona un empleado...</option>
                            {employees.filter(e => e.status).map(e => <option key={e.id} value={e.id}>{e.name} {e.lastname}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Entrada</label><input required type="time" value={shiftModal.data.startTime || ''} onChange={e => setShiftModal(p => ({...p, data: {...p.data, startTime: e.target.value}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Salida</label><input required type="time" value={shiftModal.data.endTime || ''} onChange={e => setShiftModal(p => ({...p, data: {...p.data, endTime: e.target.value}}))} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold" /></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Días Laborables</label>
                        <div className="flex justify-between gap-1">
                            {DAYS_OF_WEEK.map(day => {
                                const isSelected = shiftModal.data.daysCovered?.split(',').includes(day.key);
                                return <button key={day.key} type="button" onClick={() => toggleDay(day.key)} className={`w-10 h-10 rounded-xl font-extrabold text-sm border-2 transition-all cursor-pointer ${isSelected ? 'bg-primary border-primary text-white shadow-md' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'}`}>{day.key}</button>;
                            })}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setShiftModal({ isOpen: false, data: {} })} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 cursor-pointer">Cancelar</button>
                    <button type="submit" className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:brightness-90 shadow-md cursor-pointer">Guardar Turno</button>
                </div>
            </motion.form>
          </div>
        )}

        {/* Modal de Confirmación de Baja */}
        {deactivateModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${deactivateModal.currentStatus ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                        {deactivateModal.currentStatus ? '⚠️' : '✅'}
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 mb-2">
                        {deactivateModal.currentStatus ? '¿Dar de Baja?' : '¿Reactivar Empleado?'}
                    </h3>
                    <p className="text-sm font-bold text-gray-500 mb-6">
                        Estás a punto de cambiar el estado de <span className="text-gray-900">{deactivateModal.name}</span>.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeactivateModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">Cancelar</button>
                        <button onClick={handleToggleStatus} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md transition-colors cursor-pointer ${deactivateModal.currentStatus ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}>Confirmar</button>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 z-[90] left-1/2 -translate-x-1/2">
            <div className="px-6 py-3 rounded-full shadow-xl font-bold text-sm bg-gray-900 text-white border border-gray-700">AVISO: {toast.msg}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}