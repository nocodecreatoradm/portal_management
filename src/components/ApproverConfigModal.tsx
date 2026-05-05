import { X, Save, AlertCircle, Building2, ChevronDown, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';

interface ApproverConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApprovers: { [key: string]: string };
  onSave: (newApprovers: { [key: string]: string }, reason: string) => void;
}

export default function ApproverConfigModal({ 
  isOpen, 
  onClose, 
  currentApprovers, 
  onSave 
}: ApproverConfigModalProps) {
  const [approvers, setApprovers] = useState(currentApprovers);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSelect, setActiveSelect] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadDepartments = async () => {
        try {
          setLoading(true);
          const data = await SupabaseService.getDepartments();
          setDepartments(data);
        } catch (err) {
          console.error('Error loading departments:', err);
        } finally {
          setLoading(false);
        }
      };
      loadDepartments();
      setApprovers(currentApprovers);
    }
  }, [isOpen, currentApprovers]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!reason.trim()) {
      setError('Debe proporcionar un motivo para el cambio.');
      return;
    }
    onSave(approvers, reason);
    setReason('');
    setError('');
    onClose();
  };

  const stages = [
    { id: 'I+D', label: 'Investigación y Desarrollo (I+D)' },
    { id: 'MKT', label: 'Marketing (MKT)' },
    { id: 'PLAN', label: 'Planeamiento (PLAN)' },
    { id: 'PROV', label: 'Proveedor (PROV)' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Configurar Áreas de Aprobación</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Flujo por Departamento</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          <div className="grid gap-6">
            {stages.map((stage) => (
              <div key={stage.id} className="space-y-2 relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {stage.label}
                </label>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveSelect(activeSelect === stage.id ? null : stage.id)}
                    className={`w-full flex items-center justify-between px-6 py-4 bg-slate-50 border rounded-2xl transition-all font-bold text-sm outline-none ${
                      activeSelect === stage.id ? 'border-blue-500 ring-4 ring-blue-500/10 bg-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeSelect === stage.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                        <Building2 size={16} />
                      </div>
                      <span className="truncate">{approvers[stage.id] || 'Seleccionar área...'}</span>
                    </div>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${activeSelect === stage.id ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {activeSelect === stage.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-2"
                      >
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                          {loading ? (
                            <div className="p-4 text-center">
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <span className="text-[10px] font-black text-slate-400 uppercase">Cargando Áreas...</span>
                            </div>
                          ) : departments.length > 0 ? (
                            departments.map((dept) => (
                              <button
                                key={dept}
                                onClick={() => {
                                  setApprovers({ ...approvers, [stage.id]: dept });
                                  setActiveSelect(null);
                                }}
                                className={`w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-all text-left ${
                                  approvers[stage.id] === dept ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'
                                }`}
                              >
                                <span className="text-sm font-bold">{dept}</span>
                                {approvers[stage.id] === dept && <Check size={16} strokeWidth={3} />}
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                              No hay áreas disponibles
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
              Motivo del cambio <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej: Reestructuración de flujo de aprobación..."
              className={`w-full border ${error ? 'border-red-500 bg-red-50/30' : 'border-slate-200 bg-slate-50'} rounded-3xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none h-28 resize-none`}
            />
            {error && (
              <p className="text-xs text-red-500 font-bold flex items-center gap-1.5 ml-2">
                <AlertCircle size={14} />
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest"
          >
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
}
