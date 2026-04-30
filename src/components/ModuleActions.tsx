import React, { useState, useMemo } from 'react';
import { Save, FileDown, FileSpreadsheet, X, Search, Check, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useSamples } from '../context/SamplesContext';

interface ModuleActionsProps {
  onSave?: (details: { projectName: string; sampleId: string; description: string }) => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportPPT?: () => void;
  title?: string;
}

const ModuleActions: React.FC<ModuleActionsProps> = ({ 
  onSave, 
  onExportPDF, 
  onExportExcel,
  onExportPPT,
  title = "Módulo"
}) => {
  const { samples } = useSamples();
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [description, setDescription] = useState('');
  const [isSampleDropdownOpen, setIsSampleDropdownOpen] = useState(false);
  const [sampleSearch, setSampleSearch] = useState('');

  const filteredSamples = useMemo(() => {
    if (!sampleSearch) return samples;
    return samples.filter(s => 
      s.correlativeId.toLowerCase().includes(sampleSearch.toLowerCase()) ||
      s.descripcionSAP.toLowerCase().includes(sampleSearch.toLowerCase())
    );
  }, [samples, sampleSearch]);

  const handleSaveClick = () => {
    if (onSave) {
      setIsSaveModalOpen(true);
    } else {
      toast.success('Datos guardados correctamente');
    }
  };

  const handleConfirmSave = () => {
    if (!projectName.trim()) {
      toast.error('El nombre del proyecto es obligatorio');
      return;
    }

    if (onSave) {
      onSave({ projectName, sampleId, description });
      setIsSaveModalOpen(false);
      // Reset fields
      setProjectName('');
      setSampleId('');
      setDescription('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleSaveClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
      >
        <Save size={14} />
        Guardar
      </button>

      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsSaveModalOpen(false);
                setIsSampleDropdownOpen(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Save size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Guardar Registro</h3>
                    <p className="text-xs text-slate-500 font-medium">{title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Proyecto *</label>
                  <input 
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ej: Proyecto Termas Sole 2024"
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Muestra (Opcional)</label>
                  <div 
                    onClick={() => setIsSampleDropdownOpen(!isSampleDropdownOpen)}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span className={sampleId ? 'text-slate-900' : 'text-slate-400'}>
                      {sampleId ? samples.find(s => s.id === sampleId)?.correlativeId || sampleId : 'Seleccionar muestra...'}
                    </span>
                    <Search size={14} className="text-slate-400" />
                  </div>

                  <AnimatePresence>
                    {isSampleDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-[110] left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-60 flex flex-col"
                      >
                        <div className="p-2 border-b border-slate-50">
                          <input 
                            type="text"
                            value={sampleSearch}
                            onChange={(e) => setSampleSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Buscar muestra..."
                            className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSampleId('');
                              setIsSampleDropdownOpen(false);
                            }}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50"
                          >
                            <span className="text-xs font-bold text-slate-500 italic">Sin muestra</span>
                            {sampleId === '' && <Check size={14} className="text-blue-600" />}
                          </div>
                          {filteredSamples.length > 0 ? (
                            filteredSamples.map((sample) => (
                              <div 
                                key={sample.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSampleId(sample.id);
                                  setIsSampleDropdownOpen(false);
                                }}
                                className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-900">{sample.correlativeId}</span>
                                  <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{sample.descripcionSAP}</span>
                                </div>
                                {sampleId === sample.id && <Check size={14} className="text-blue-600" />}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-slate-400 text-center italic">
                              No se encontraron muestras
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles adicionales sobre este cálculo..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="flex-1 py-2.5 text-sm font-bold text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmSave}
                  className="flex-1 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  Confirmar Guardado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

      {onExportPDF && (
        <button
          onClick={onExportPDF}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <FileDown size={14} className="text-red-500" />
          PDF
        </button>
      )}

      {onExportExcel && (
        <button
          onClick={onExportExcel}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <FileSpreadsheet size={14} className="text-green-600" />
          Excel
        </button>
      )}

      {onExportPPT && (
        <button
          onClick={onExportPPT}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <Presentation size={14} className="text-orange-600" />
          PPT
        </button>
      )}
    </div>
  );
};

export default ModuleActions;
