import React, { useState, useEffect, useRef } from 'react';
import { 
  XCircle, Save, Play, Pause, CheckCircle2, AlertCircle, 
  Plus, Trash2, Camera, ChevronDown, ChevronUp, Clock,
  FileText, Image as ImageIcon, Loader2
} from 'lucide-react';
import { SampleRecord, InspectionSection, WorkflowStage, FileInfo, InspectionTimer, InspectionTemplate } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { isBusinessTime, getBusinessMsBetween } from '../utils/businessHours';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: SampleRecord;
  onSave: (id: string, updates: Partial<SampleRecord>) => void;
}

export default function InspectionModal({ isOpen, onClose, sample, onSave }: InspectionModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'workflow'>('form');
  const [form, setForm] = useState<InspectionSection[]>(sample.inspectionForm || [
    {
      id: 'sec1',
      title: 'Vistas Generales',
      fields: [
        { id: 'f1', label: 'Vista frontal', value: '', photos: [] },
        { id: 'f2', label: 'Vista lateral', value: '', photos: [] },
        { id: 'f3', label: 'Vista posterior', value: '', photos: [] },
        { id: 'f4', label: 'Vista interior', value: '', photos: [] },
      ]
    },
    {
      id: 'sec2',
      title: 'Mesa Panel',
      fields: [
        { id: 'f5', label: 'Mesa de Cocción', value: '', photos: [] },
        { id: 'f6', label: 'Espesor de mesa', value: '', photos: [] },
        { id: 'f7', label: 'Material Parrillas', value: '', photos: [] },
      ]
    }
  ]);

  const [workflow, setWorkflow] = useState<WorkflowStage[]>(sample.workflow || [
    { id: 'w1', stage: 'Inspección visual externa', status: 'pending' },
    { id: 'w2', stage: 'Inspección de componentes internos', status: 'pending' },
    { id: 'w3', stage: 'Evaluación de Capacidad', status: 'pending' },
    { id: 'w4', stage: 'Evaluación de sistemas de seguridad', status: 'pending' },
  ]);

  const [timer, setTimer] = useState<InspectionTimer>(sample.inspectionTimer || {
    accumulatedTimeMs: 0,
    idleTimeMs: 0,
    isPaused: sample.inspectionProgress !== 'in_progress',
    firstStartTime: sample.inspectionProgress === 'in_progress' ? new Date().toISOString() : undefined,
    lastStartTime: sample.inspectionProgress === 'in_progress' ? new Date().toISOString() : undefined
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      if (!sample.categoryId) return;
      
      setLoadingTemplate(true);
      try {
        const tpt = await SupabaseService.getInspectionTemplateByCategory(sample.categoryId);
        if (tpt) {
          setTemplate(tpt);
          
          // If the sample doesn't have a form or workflow yet, use the template ones
          if (!sample.inspectionForm || sample.inspectionForm.length === 0) {
            setForm(tpt.formStructure.sections);
          }
          if (!sample.workflow || sample.workflow.length === 0) {
            setWorkflow(tpt.workflowStructure.stages.map(s => ({
              id: Math.random().toString(36).substr(2, 9),
              stage: s.name,
              status: 'pending'
            })));
          }
        }
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Error al cargar la plantilla de inspección');
      } finally {
        setLoadingTemplate(false);
      }
    };

    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen, sample.categoryId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // On mount, catch up the time spent while the modal was closed
    const now = new Date();
    setTimer(prev => {
      const lastStart = prev.lastStartTime ? new Date(prev.lastStartTime) : null;
      const businessMs = lastStart ? (now.getTime() - lastStart.getTime()) : 0;
      
      // If it's the very first time opening (no accumulated time yet),
      // the time spent "opening" the modal is Administrative time.
      // Otherwise, it's Inspection time (time spent while modal was closed).
      const isFirstStart = prev.accumulatedTimeMs === 0 && prev.idleTimeMs === 0;
      
      return {
        ...prev,
        isPaused: false, // Auto-resume into Administrative mode (if visible)
        accumulatedTimeMs: isFirstStart ? prev.accumulatedTimeMs + businessMs : prev.accumulatedTimeMs,
        idleTimeMs: isFirstStart ? prev.idleTimeMs : prev.idleTimeMs + businessMs,
        lastStartTime: now.toISOString(),
        firstStartTime: prev.firstStartTime || now.toISOString()
      };
    });

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const nowMs = now.getTime();
      
      setTimer(prev => {
        if (!prev.lastStartTime) return { ...prev, lastStartTime: now.toISOString() };
        
        const start = new Date(prev.lastStartTime).getTime();
        const delta = nowMs - start;

        // Administrative Time (Red): Modal open AND Tab visible
        if (!prev.isPaused && isVisible) {
          return {
            ...prev,
            accumulatedTimeMs: prev.accumulatedTimeMs + delta,
            lastStartTime: now.toISOString()
          };
        } 
        // Inspection Time (Blue): Modal open but Tab hidden OR Manual pause (if any)
        else {
          return {
            ...prev,
            idleTimeMs: prev.idleTimeMs + delta,
            lastStartTime: now.toISOString()
          };
        }
      });
    };

    timerInterval.current = setInterval(update, 1000);

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [timer.isPaused, isVisible]);

  useEffect(() => {
    setElapsedTime(timer.accumulatedTimeMs + timer.idleTimeMs);
  }, [timer.accumulatedTimeMs, timer.idleTimeMs]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTo, setUploadingTo] = useState<{ 
    type: 'form' | 'workflow', 
    sectionId?: string, 
    fieldId?: string,
    stageId?: string 
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingTo) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFile: FileInfo = {
          name: file.name,
          url: reader.result as string,
          type: file.type
        };

        if (uploadingTo.type === 'form') {
          setForm(prev => prev.map(sec => {
            if (sec.id === uploadingTo.sectionId) {
              return {
                ...sec,
                fields: sec.fields.map(f => {
                  if (f.id === uploadingTo.fieldId) {
                    return { ...f, photos: [...f.photos, newFile] };
                  }
                  return f;
                })
              };
            }
            return sec;
          }));
        } else if (uploadingTo.type === 'workflow') {
          setWorkflow(prev => prev.map(w => {
            if (w.id === uploadingTo.stageId) {
              return { ...w, files: [...(w.files || []), newFile] };
            }
            return w;
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    
    setUploadingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = (sectionId: string, fieldId: string) => {
    setUploadingTo({ type: 'form', sectionId, fieldId });
    fileInputRef.current?.click();
  };

  const triggerWorkflowUpload = (stageId: string) => {
    setUploadingTo({ type: 'workflow', stageId });
    fileInputRef.current?.click();
  };

  const handleAddSection = () => {
    setForm(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        title: 'Nueva Sección',
        fields: []
      }
    ]);
  };

  const handleUpdateSectionTitle = (sectionId: string, title: string) => {
    setForm(prev => prev.map(sec => sec.id === sectionId ? { ...sec, title } : sec));
  };

  const handleRemoveSection = (sectionId: string) => {
    setForm(prev => prev.filter(sec => sec.id !== sectionId));
  };

  const handleAddField = (sectionId: string) => {
    setForm(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          fields: [...sec.fields, { id: Math.random().toString(36).substr(2, 9), label: 'Nuevo Campo', value: '', photos: [] }]
        };
      }
      return sec;
    }));
  };

  const handleRemoveField = (sectionId: string, fieldId: string) => {
    setForm(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          fields: sec.fields.filter(f => f.id !== fieldId)
        };
      }
      return sec;
    }));
  };

  const handleUpdateField = (sectionId: string, fieldId: string, updates: Partial<any>) => {
    setForm(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          fields: sec.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        };
      }
      return sec;
    }));
  };

  const handleAddWorkflowStage = () => {
    setWorkflow(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), stage: 'Nuevo Procedimiento', status: 'pending' }
    ]);
  };

  const handleUpdateWorkflow = (stageId: string, updates: Partial<WorkflowStage>) => {
    setWorkflow(prev => prev.map(w => w.id === stageId ? { ...w, ...updates } : w));
  };

  const handleRemoveWorkflowStage = (stageId: string) => {
    setWorkflow(prev => prev.filter(w => w.id !== stageId));
  };

  const handleSaveDraft = () => {
    const now = new Date().toISOString();
    const nowMs = new Date().getTime();
    let finalTimer = { ...timer };

    if (!timer.isPaused && timer.lastStartTime) {
      // Pause it now if it was running
      const start = new Date(timer.lastStartTime).getTime();
      finalTimer = {
        ...timer,
        isPaused: true,
        accumulatedTimeMs: timer.accumulatedTimeMs + (nowMs - start),
        lastStartTime: now
      };
    } else if (timer.isPaused && !timer.firstStartTime) {
      // If it was never started, start it now but in paused state (dead time starts)
      finalTimer = {
        ...timer,
        isPaused: true,
        firstStartTime: now,
        lastStartTime: now,
        accumulatedTimeMs: 0,
        idleTimeMs: 0
      };
    }

    onSave(sample.id, {
      inspectionForm: form,
      workflow: workflow,
      inspectionTimer: finalTimer,
      inspectionProgress: 'paused',
      history: [
        ...sample.history,
        { date: now.split('T')[0], status: 'Borrador Guardado', user: 'Técnico' }
      ]
    });
    onClose();
  };

  const handleFinalize = () => {
    const nowMs = new Date().getTime();
    let finalTimer = { ...timer };
    
    if (!timer.isPaused && timer.lastStartTime) {
      const start = new Date(timer.lastStartTime).getTime();
      finalTimer.accumulatedTimeMs += (nowMs - start);
    } else if (timer.isPaused && timer.lastStartTime) {
      const pauseStart = new Date(timer.lastStartTime).getTime();
      finalTimer.idleTimeMs += (nowMs - pauseStart);
    }

    finalTimer.isPaused = true;
    finalTimer.lastStartTime = undefined;

    onSave(sample.id, {
      inspectionForm: form,
      workflow: workflow,
      inspectionTimer: finalTimer,
      inspectionProgress: 'completed',
      inspectionCompletedDate: new Date().toISOString(),
      inspectionStatus: workflow.every(w => w.status === 'approved') ? 'Aprobado' : 'Observado',
      history: [
        ...sample.history,
        { date: new Date().toISOString().split('T')[0], status: 'Inspección Finalizada', user: 'Técnico' }
      ]
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple
          onChange={handleFileUpload}
        />

        {loadingTemplate && (
          <div className="absolute inset-0 z-[110] bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Cargando Plantilla...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Inspección de Muestra {template && <span className="text-indigo-600 ml-2">(Dinámica: {template.name})</span>}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {sample.descripcionSAP} | Técnico: {sample.technician || 'No asignado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Timer Display */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
              <Clock size={18} className="text-indigo-500 animate-pulse" />
              <span className="text-lg font-mono font-black text-slate-700">{formatTime(elapsedTime)}</span>
              <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                En Curso
              </div>
            </div>

            <button 
              onClick={handleSaveDraft}
              className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

          <div className="flex border-b border-slate-100 px-8 bg-white justify-between items-center">
            <div className="flex">
              <button 
                onClick={() => setActiveTab('form')}
                className={`px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'form' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Formato de Inspección
              </button>
              <button 
                onClick={() => setActiveTab('workflow')}
                className={`px-6 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'workflow' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Flujo de Trabajo
              </button>
            </div>
            
            {activeTab === 'form' ? (
              <button 
                onClick={handleAddSection}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <Plus size={16} />
                Añadir Sección
              </button>
            ) : (
              <button 
                onClick={handleAddWorkflowStage}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <Plus size={16} />
                Añadir Procedimiento
              </button>
            )}
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          {activeTab === 'form' ? (
            <div className="space-y-8">
              {form.map((section) => (
                <div key={section.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <input 
                      type="text"
                      value={section.title}
                      onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                      className="text-sm font-black text-slate-800 uppercase tracking-widest bg-transparent outline-none focus:text-indigo-600"
                    />
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleAddField(section.id)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                      >
                        <Plus size={14} />
                        Añadir Fila
                      </button>
                      <button 
                        onClick={() => handleRemoveSection(section.id)}
                        className="text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {section.fields.map((field) => (
                      <div key={field.id} className="grid grid-cols-12 gap-6 p-6 items-start hover:bg-slate-50/50 transition-colors">
                        <div className="col-span-3">
                          <input 
                            type="text" 
                            value={field.label}
                            onChange={(e) => handleUpdateField(section.id, field.id, { label: e.target.value })}
                            className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none focus:text-indigo-600"
                          />
                        </div>
                        <div className="col-span-4">
                          <textarea 
                            value={field.value}
                            onChange={(e) => handleUpdateField(section.id, field.id, { value: e.target.value })}
                            placeholder="Ingresar descripción o valor..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none min-h-[120px] resize-none shadow-inner"
                          />
                        </div>
                        <div className="col-span-5 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {field.photos.map((photo, idx) => (
                              <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    onClick={() => {
                                      const newPhotos = field.photos.filter((_, i) => i !== idx);
                                      handleUpdateField(section.id, field.id, { photos: newPhotos });
                                    }}
                                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button 
                              onClick={() => triggerUpload(section.id, field.id)}
                              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all bg-slate-50 group"
                            >
                              <Camera size={20} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[8px] font-bold uppercase mt-1">Subir</span>
                            </button>
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button 
                            onClick={() => handleRemoveField(section.id, field.id)}
                            className="text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-indigo-500" size={24} />
                  Checklist de Procedimiento
                </h4>
                <div className="space-y-4">
                  {workflow.map((stage) => (
                    <div key={stage.id} className="space-y-3 p-6 bg-slate-50 rounded-3xl border border-slate-100 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            stage.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                            stage.status === 'observed' ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-300'
                          }`}>
                            {stage.status === 'approved' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                          </div>
                          <input 
                            type="text"
                            value={stage.stage}
                            onChange={(e) => handleUpdateWorkflow(stage.id, { stage: e.target.value })}
                            className="text-sm font-bold text-slate-700 bg-transparent outline-none focus:text-indigo-600 flex-1"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdateWorkflow(stage.id, { status: 'approved' })}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              stage.status === 'approved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            Aprobado
                          </button>
                          <button 
                            onClick={() => handleUpdateWorkflow(stage.id, { status: 'observed' })}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              stage.status === 'observed' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                          >
                            Observado
                          </button>
                          <button 
                            onClick={() => handleRemoveWorkflowStage(stage.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4 pl-14">
                        <div className="flex-1">
                          <textarea 
                            placeholder="Añadir comentario u observación..."
                            value={stage.comment || ''}
                            onChange={(e) => handleUpdateWorkflow(stage.id, { comment: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 min-h-[120px] resize-none shadow-inner"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {stage.files?.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl group relative">
                              <FileText size={14} className="text-indigo-500" />
                              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                              <div className="flex items-center gap-1">
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase"
                                >
                                  Ver
                                </a>
                                <button 
                                  onClick={() => {
                                    const newFiles = stage.files?.filter((_, i) => i !== idx);
                                    handleUpdateWorkflow(stage.id, { files: newFiles });
                                  }}
                                  className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => triggerWorkflowUpload(stage.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all border-dashed"
                          >
                            <Plus size={14} />
                            Añadir Doc / Foto
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                <AlertCircle className="text-indigo-500 shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold text-indigo-900">Validación de Flujo</p>
                  <p className="text-xs font-medium text-indigo-700 mt-1 leading-relaxed">
                    Asegúrese de completar todos los ensayos requeridos según el procedimiento estándar para esta categoría de producto.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Inspección</span>
              <span className="text-sm font-bold text-slate-700">
                {isVisible ? 'En Pantalla (Admin)' : 'Fuera de Pantalla (Insp)'}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiempo Administrativo</span>
              <span className="text-sm font-bold text-red-600">{formatTime(timer.accumulatedTimeMs)}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiempo de Inspección</span>
              <span className="text-sm font-bold text-blue-600">
                {formatTime(timer.idleTimeMs)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSaveDraft}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
            >
              Guardar Borrador
            </button>
            <button 
              onClick={handleFinalize}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <CheckCircle2 size={18} />
              Finalizar Ciclo de Inspección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
