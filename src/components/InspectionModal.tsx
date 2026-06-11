import React, { useState, useEffect, useRef } from 'react';
import { 
  XCircle, Save, Play, Pause, CheckCircle2, AlertCircle, 
  Plus, Trash2, Camera, ChevronDown, ChevronUp, Clock,
  FileText, Image as ImageIcon, Loader2, Eye, EyeOff, ExternalLink
} from 'lucide-react';
import { SampleRecord, InspectionSection, WorkflowStage, FileInfo, InspectionTimer, InspectionTemplate, Supplier } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { isBusinessTime, getBusinessMsBetween } from '../utils/businessHours';
import { openFileUrl } from '../utils/fileViewer';

function normalizeWorkflow(rawWorkflow: any): any[] {
  if (!rawWorkflow) return [];
  if (Array.isArray(rawWorkflow)) {
    if (rawWorkflow.length === 0) return [];
    if (rawWorkflow[0] && (rawWorkflow[0].stages !== undefined || 'title' in rawWorkflow[0])) {
      return rawWorkflow.map((sec: any) => ({
        id: sec.id || `wf_sec_${Math.random().toString(36).substr(2, 9)}`,
        title: sec.title || 'Sección de Trabajo',
        stages: (sec.stages || []).map((s: any) => ({
          id: s.id || `stg_${Math.random().toString(36).substr(2, 9)}`,
          stage: s.stage || s.name || '',
          status: s.status || 'pending',
          comment: s.comment || '',
          files: s.files || [],
          description: s.description || s.text || '',
          acceptanceCriteria: s.acceptanceCriteria || '',
          referencePhotos: s.referencePhotos || []
        }))
      }));
    }
    return [
      {
        id: 'wf_sec_legacy',
        title: 'Checklist de Procedimiento',
        stages: rawWorkflow.map((s: any) => ({
          id: s.id || `stg_${Math.random().toString(36).substr(2, 9)}`,
          stage: s.stage || s.name || '',
          status: s.status || 'pending',
          comment: s.comment || '',
          files: s.files || [],
          description: s.description || s.text || '',
          acceptanceCriteria: s.acceptanceCriteria || '',
          referencePhotos: s.referencePhotos || []
        }))
      }
    ];
  }
  return [];
}

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sample: SampleRecord;
  onSave: (id: string, updates: Partial<SampleRecord>) => void;
  suppliers: Supplier[];
}

export default function InspectionModal({ isOpen, onClose, sample, onSave, suppliers }: InspectionModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'workflow'>('form');
  const [showProcedure, setShowProcedure] = useState(false);

  const supplier = suppliers?.find(s => 
    (sample.proveedor && (
      s.id === sample.proveedor || 
      s.legalName === sample.proveedor || 
      s.commercialAlias === sample.proveedor
    )) ||
    (sample.codProv && s.erpCode === sample.codProv)
  );
  const supplierName = supplier?.commercialAlias || sample.proveedor || 'Sin Proveedor';
  const supplierLogo = supplier?.logoUrl;

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

  const [workflow, setWorkflow] = useState<any[]>(() => {
    const norm = normalizeWorkflow(sample.workflow);
    if (norm.length > 0) return norm;
    return [
      {
        id: 'wf_sec_default',
        title: 'Checklist de Procedimiento',
        stages: [
          { id: 'w1', stage: 'Inspección visual externa', status: 'pending', comment: '', files: [], description: '', acceptanceCriteria: '', referencePhotos: [] },
          { id: 'w2', stage: 'Inspección de componentes internos', status: 'pending', comment: '', files: [], description: '', acceptanceCriteria: '', referencePhotos: [] },
          { id: 'w3', stage: 'Evaluación de Capacidad', status: 'pending', comment: '', files: [], description: '', acceptanceCriteria: '', referencePhotos: [] },
          { id: 'w4', stage: 'Evaluación de sistemas de seguridad', status: 'pending', comment: '', files: [], description: '', acceptanceCriteria: '', referencePhotos: [] },
        ]
      }
    ];
  });

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
          if (tpt.procedureFile) setShowProcedure(true);
          
          // If the sample doesn't have a form or workflow yet, use the template ones
          if (!sample.inspectionForm || sample.inspectionForm.length === 0) {
            setForm((tpt.formStructure.sections || []).map((sec: any) => ({
              id: sec.id || `sec_${Math.random().toString(36).substr(2, 9)}`,
              title: sec.title || 'Sección de Inspección',
              fields: (sec.fields || []).map((f: any) => ({
                id: f.id || `fld_${Math.random().toString(36).substr(2, 9)}`,
                label: f.label || '',
                type: f.type || 'textarea',
                required: f.required || false,
                options: f.options || [],
                value: f.value || '',
                photos: f.photos || []
              }))
            })));
          }
          if (!sample.workflow || sample.workflow.length === 0) {
            if (tpt.workflowStructure.sections) {
              setWorkflow(tpt.workflowStructure.sections.map((sec: any) => ({
                id: sec.id || `wf_sec_${Math.random().toString(36).substr(2, 9)}`,
                title: sec.title,
                stages: (sec.stages || []).map((s: any) => ({
                  id: s.id || `stg_${Math.random().toString(36).substr(2, 9)}`,
                  stage: s.name || s.stage || '',
                  status: 'pending',
                  comment: '',
                  files: [],
                  description: s.text || s.description || '',
                  acceptanceCriteria: s.acceptanceCriteria || '',
                  referencePhotos: s.referencePhotos || []
                }))
              })));
            } else if (tpt.workflowStructure.stages) {
              setWorkflow([
                {
                  id: 'wf_sec_default',
                  title: 'Checklist de Procedimiento',
                  stages: tpt.workflowStructure.stages.map((s: any) => ({
                    id: s.id || `stg_${Math.random().toString(36).substr(2, 9)}`,
                    stage: s.name || s.stage || '',
                    status: 'pending',
                    comment: '',
                    files: [],
                    description: s.text || s.description || '',
                    acceptanceCriteria: s.acceptanceCriteria || '',
                    referencePhotos: s.referencePhotos || []
                  }))
                }
              ]);
            }
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
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !uploadingTo) return;

    // Capture files into a plain array BEFORE resetting the input,
    // because clearing fileInputRef.current.value also clears the FileList reference.
    const fileList = Array.from(files);
    const capturedUploadingTo = { ...uploadingTo };
    setUploadingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    const toastId = toast.loading(`Subiendo ${fileList.length} archivo(s)...`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of fileList) {
      try {
        const folder = capturedUploadingTo.type === 'form'
          ? `inspections/${sample.id}/form/${capturedUploadingTo.sectionId}/${capturedUploadingTo.fieldId}`
          : `inspections/${sample.id}/workflow/${capturedUploadingTo.sectionId}/${capturedUploadingTo.stageId}`;
        const path = `${folder}/${Date.now()}_${file.name}`;

        const uploaded = await SupabaseService.uploadFile('rd-files', path, file);
        const newFile: FileInfo = { name: uploaded.name, url: uploaded.url, type: uploaded.type || file.type };

        if (capturedUploadingTo.type === 'form') {
          setForm(prev => prev.map(sec => {
            if (sec.id === capturedUploadingTo.sectionId) {
              return {
                ...sec,
                fields: sec.fields.map(f => {
                  if (f.id === capturedUploadingTo.fieldId) {
                    return { ...f, photos: [...f.photos, newFile] };
                  }
                  return f;
                })
              };
            }
            return sec;
          }));
        } else if (capturedUploadingTo.type === 'workflow') {
          setWorkflow(prev => prev.map(sec => {
            if (sec.id === capturedUploadingTo.sectionId) {
              return {
                ...sec,
                stages: sec.stages.map((w: any) => {
                  if (w.id === capturedUploadingTo.stageId) {
                    return { ...w, files: [...(w.files || []), newFile] };
                  }
                  return w;
                })
              };
            }
            return sec;
          }));
        }
        successCount++;
      } catch (err: any) {
        console.error('Error subiendo archivo de inspección:', err);
        errorCount++;
      }
    }

    setIsUploading(false);
    if (errorCount === 0) {
      toast.success(`${successCount} archivo(s) subido(s) correctamente`, { id: toastId });
    } else if (successCount > 0) {
      toast.warning(`${successCount} subido(s), ${errorCount} con error`, { id: toastId });
    } else {
      toast.error('Error al subir los archivos', { id: toastId });
    }
  };

  const triggerUpload = (sectionId: string, fieldId: string) => {
    setUploadingTo({ type: 'form', sectionId, fieldId });
    fileInputRef.current?.click();
  };

  const triggerWorkflowUpload = (sectionId: string, stageId: string) => {
    setUploadingTo({ type: 'workflow', sectionId, stageId });
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

  const handleAddWorkflowSection = () => {
    setWorkflow(prev => [
      ...prev,
      {
        id: `wf_sec_${Date.now()}`,
        title: 'NUEVA SECCIÓN DE TRABAJO',
        stages: []
      }
    ]);
  };

  const handleUpdateWorkflowSectionTitle = (sectionId: string, title: string) => {
    setWorkflow(prev => prev.map(sec => sec.id === sectionId ? { ...sec, title: title.toUpperCase() } : sec));
  };

  const handleRemoveWorkflowSection = (sectionId: string) => {
    setWorkflow(prev => prev.filter(sec => sec.id !== sectionId));
  };

  const handleAddWorkflowStage = (sectionId: string) => {
    setWorkflow(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          stages: [
            ...sec.stages,
            { id: `stg_${Date.now()}`, stage: 'NUEVO PROCEDIMIENTO', status: 'pending', comment: '', files: [], description: '', acceptanceCriteria: '', referencePhotos: [] }
          ]
        };
      }
      return sec;
    }));
  };

  const handleUpdateWorkflow = (sectionId: string, stageId: string, updates: Partial<WorkflowStage>) => {
    setWorkflow(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          stages: sec.stages.map((w: any) => w.id === stageId ? { ...w, ...updates } : w)
        };
      }
      return sec;
    }));
  };

  const handleRemoveWorkflowStage = (sectionId: string, stageId: string) => {
    setWorkflow(prev => prev.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          stages: sec.stages.filter((w: any) => w.id !== stageId)
        };
      }
      return sec;
    }));
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

    const allStages = workflow.flatMap((sec: any) => sec.stages || []);
    const isAllApproved = allStages.length > 0 && allStages.every((w: any) => w.status === 'approved');

    onSave(sample.id, {
      inspectionForm: form,
      workflow: workflow,
      inspectionTimer: finalTimer,
      inspectionProgress: 'completed',
      inspectionCompletedDate: new Date().toISOString(),
      inspectionStatus: isAllApproved ? 'Aprobado' : 'Observado',
      history: [
        ...sample.history,
        { date: new Date().toISOString().split('T')[0], status: 'Inspección Finalizada', user: 'Técnico' }
      ]
    });
    onClose();
  };

  const renderFieldInput = (sectionId: string, field: any) => {
    const type = field.type || 'textarea';
    const options = field.options || [];

    switch (type) {
      case 'text':
        return (
          <input 
            type="text"
            value={field.value || ''}
            onChange={(e) => handleUpdateField(sectionId, field.id, { value: e.target.value })}
            placeholder="Ingresar valor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none shadow-inner"
          />
        );
      case 'select':
        return (
          <select
            value={field.value || ''}
            onChange={(e) => handleUpdateField(sectionId, field.id, { value: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none shadow-inner"
          >
            <option value="">-- Seleccionar --</option>
            {options.map((opt: string, idx: number) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="flex flex-wrap gap-4 py-2">
            {options.map((opt: string, idx: number) => (
              <label key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                  type="radio"
                  name={`field_${field.id}`}
                  value={opt}
                  checked={field.value === opt}
                  onChange={() => handleUpdateField(sectionId, field.id, { value: opt })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        const selectedValues = field.value ? field.value.split(', ') : [];
        const handleCheckboxChange = (opt: string, checked: boolean) => {
          let newValues;
          if (checked) {
            newValues = [...selectedValues, opt];
          } else {
            newValues = selectedValues.filter((v: string) => v !== opt);
          }
          handleUpdateField(sectionId, field.id, { value: newValues.join(', ') });
        };
        return (
          <div className="flex flex-col gap-2 py-1">
            {options.map((opt: string, idx: number) => (
              <label key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input 
                  type="checkbox"
                  value={opt}
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => handleCheckboxChange(opt, e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      case 'photo':
        return (
          <p className="text-xs text-slate-500 font-bold italic py-2">
            Usar cargador de evidencias a la derecha para adjuntar fotografías.
          </p>
        );
      case 'signature':
        return (
          <p className="text-xs text-slate-500 font-bold italic py-2">
            Usar cargador de evidencias a la derecha para adjuntar firma escaneada.
          </p>
        );
      case 'textarea':
      default:
        return (
          <textarea 
            value={field.value || ''}
            onChange={(e) => handleUpdateField(sectionId, field.id, { value: e.target.value })}
            placeholder="Ingresar descripción o valor..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 outline-none min-h-[120px] resize-none shadow-inner"
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[90vh] transition-all duration-500 ${showProcedure && template?.procedureFile ? 'max-w-[95vw] w-full' : 'max-w-6xl w-full'}`}>
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
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden shrink-0">
              {supplierLogo ? (
                <img src={supplierLogo} alt={supplierName} className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm uppercase">
                  {supplierName.substring(0, 2)}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Inspección de Muestra {template && <span className="text-indigo-600 ml-2">({template.name})</span>}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {sample.descripcionSAP} | <span className="text-indigo-600 font-extrabold">{supplierName}</span> | Técnico: {sample.technician || 'No asignado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {template?.procedureFile && (
              <button 
                onClick={() => setShowProcedure(!showProcedure)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  showProcedure ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showProcedure ? <EyeOff size={16} /> : <Eye size={16} />}
                {showProcedure ? 'Ocultar Procedimiento' : 'Ver Procedimiento'}
              </button>
            )}

            {/* Timer Display */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
              <Clock size={18} className="text-indigo-500 animate-pulse" />
              <span className="text-lg font-mono font-black text-slate-700">{formatTime(elapsedTime)}</span>
            </div>

            <button 
              onClick={handleSaveDraft}
              disabled={isUploading}
              className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={isUploading ? 'Subiendo archivos...' : 'Guardar borrador y cerrar'}
            >
              {isUploading ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <XCircle size={24} />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500`}>
            <div className="flex border-b border-slate-100 px-8 bg-white justify-between items-center shrink-0">
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
                  onClick={handleAddWorkflowSection}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                >
                  <Plus size={16} />
                  Añadir Sección de Trabajo
                </button>
              )}
            </div>

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
                        {(section.fields || []).map((field) => (
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
                              {renderFieldInput(section.id, field)}
                            </div>
                            <div className="col-span-5 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {(field.photos || []).map((photo, idx) => (
                                  <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                    <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button 
                                        onClick={() => {
                                          const newPhotos = (field.photos || []).filter((_, i) => i !== idx);
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
                <div className="space-y-8">
                  {workflow.map((section) => (
                    <div key={section.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <input 
                          type="text"
                          value={section.title}
                          onChange={(e) => handleUpdateWorkflowSectionTitle(section.id, e.target.value)}
                          className="text-sm font-black text-slate-800 uppercase tracking-widest bg-transparent outline-none focus:text-indigo-600 w-64"
                        />
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleAddWorkflowStage(section.id)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                          >
                            <Plus size={14} />
                            Añadir Fila
                          </button>
                          <button 
                            onClick={() => handleRemoveWorkflowSection(section.id)}
                            className="text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {(section.stages || []).map((stage: any) => (
                          <div key={stage.id} className="p-6 space-y-4 hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  stage.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                  stage.status === 'observed' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {stage.status === 'approved' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                </div>
                                <input 
                                  type="text"
                                  value={stage.stage}
                                  onChange={(e) => handleUpdateWorkflow(section.id, stage.id, { stage: e.target.value })}
                                  className="text-sm font-bold text-slate-700 bg-transparent outline-none focus:text-indigo-600 flex-1 uppercase"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleUpdateWorkflow(section.id, stage.id, { status: 'approved' })}
                                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    stage.status === 'approved' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600'
                                  }`}
                                >
                                  Aprobado
                                </button>
                                <button 
                                  onClick={() => handleUpdateWorkflow(section.id, stage.id, { status: 'observed' })}
                                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    stage.status === 'observed' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:bg-amber-50 hover:text-amber-600'
                                  }`}
                                >
                                  Observado
                                </button>
                                <button 
                                  onClick={() => handleRemoveWorkflowStage(section.id, stage.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Technical Guide Panel (Read-only reference) */}
                            {(stage.description || stage.acceptanceCriteria || (stage.referencePhotos && stage.referencePhotos.length > 0)) && (
                              <div className="ml-14 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30 space-y-3">
                                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                                  <FileText size={14} className="text-indigo-500" />
                                  Guía Técnica de Evaluación
                                </div>
                                {stage.description && (
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Instrucciones del Procedimiento</span>
                                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{stage.description}</p>
                                  </div>
                                )}
                                {stage.acceptanceCriteria && (
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Criterios de Aceptación</span>
                                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{stage.acceptanceCriteria}</p>
                                  </div>
                                )}
                                {stage.referencePhotos && stage.referencePhotos.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Fotos Referenciales</span>
                                    <div className="flex flex-wrap gap-2">
                                      {stage.referencePhotos.map((photo: any, pIdx: number) => (
                                        <a 
                                          key={pIdx} 
                                          href={photo.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          onClick={(e) => {
                                            e.preventDefault();
                                            openFileUrl(photo.url);
                                          }}
                                          className="block w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-white hover:opacity-90 transition-opacity shrink-0"
                                        >
                                          <img src={photo.url} alt="Referencial" className="w-full h-full object-cover" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Tech Inputs (Comment, Evidence Uploads) */}
                            <div className="ml-14 flex flex-col gap-4">
                              <div className="flex-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 mb-1">Comentarios y Observaciones del Avance</span>
                                <textarea 
                                  placeholder="Añadir comentarios, desvíos u observaciones registradas durante el ensayo..."
                                  value={stage.comment || ''}
                                  onChange={(e) => handleUpdateWorkflow(section.id, stage.id, { comment: e.target.value })}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 min-h-[80px] resize-none shadow-inner"
                                />
                              </div>
                              
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Evidencias Adjuntas</span>
                                <div className="flex flex-wrap gap-2">
                                  {stage.files?.map((file: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl group relative">
                                      <FileText size={14} className="text-indigo-500" />
                                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                                      <div className="flex items-center gap-1">
                                        <a 
                                          href={file.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            openFileUrl(file.url);
                                          }}
                                          className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase"
                                        >
                                          Ver
                                        </a>
                                        <button 
                                          onClick={() => {
                                            const newFiles = stage.files?.filter((_: any, i: number) => i !== idx);
                                            handleUpdateWorkflow(section.id, stage.id, { files: newFiles });
                                          }}
                                          className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <button 
                                    onClick={() => triggerWorkflowUpload(section.id, stage.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-slate-50 transition-all border-dashed"
                                  >
                                    <Plus size={14} />
                                    Añadir Doc / Foto
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

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
          </div>

          {/* Procedure Viewer Panel */}
          {showProcedure && template?.procedureFile && (
            <div className="w-1/2 border-l border-slate-200 bg-slate-100/50 flex flex-col animate-in slide-in-from-right duration-500">
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{template.procedureFile.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Procedimiento de Inspección</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={template.procedureFile.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openFileUrl(template.procedureFile.url);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => setShowProcedure(false)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-200 relative">
                {template.procedureFile.type?.includes('pdf') ? (
                  <iframe 
                    src={`${template.procedureFile.url}#toolbar=0`} 
                    className="w-full h-full border-none"
                    title="Procedimiento PDF"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl">
                      <FileText size={40} className="text-slate-300" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Documento Word</h5>
                      <p className="text-xs font-medium text-slate-500 mt-2">
                        Los documentos Word no se pueden previsualizar directamente. 
                        Por favor, descárgalo para revisarlo.
                      </p>
                      <a 
                        href={template.procedureFile.url} 
                        download
                        className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                      >
                        Descargar Documento
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Inspección</span>
              <span className="text-sm font-bold text-slate-700">
                {isVisible ? 'En Pantalla (T. Administrativo)' : 'Fuera de Pantalla (T. Inspección)'}
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
            {isUploading && (
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                Subiendo archivos...
              </div>
            )}
            <button 
              onClick={handleSaveDraft}
              disabled={isUploading}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar Borrador
            </button>
            <button 
              onClick={handleFinalize}
              disabled={isUploading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
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
