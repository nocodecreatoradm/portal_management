import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, AlertCircle, FileText, Download, CheckCircle2, Clock, HelpCircle,
  Plus, Search, ChevronRight, Info, Trash2, ArrowRight, RefreshCw, Printer, AlertTriangle, ShieldCheck, Upload,
  Calendar, User, Home, Wrench, Edit, X, Save
} from 'lucide-react';
import { HiyariHattoReport, ProductRecord, ActionPlanItem, FiveWhys, IshikawaData } from '../types';
import { format, parseISO } from 'date-fns';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';

interface HiyariHattoModuleProps {
  products: ProductRecord[];
}

const DEFAULT_FIVE_WHYS: FiveWhys = {
  why1: '',
  why2: '',
  why3: '',
  why4: '',
  why5: ''
};

const DEFAULT_ISHIKAWA: IshikawaData = {
  metodo: [],
  mano_obra: [],
  maquina_producto: [],
  materiales: [],
  medicion: [],
  medio_ambiente: []
};

// Default action plan templates
const createDefaultActionPlan = (): ActionPlanItem[] => [
  { area: 'producto', responsible: 'Cristhian Sevillano / Carlos Hoyos / Patricia Terzano', action: '', maxDate: '', status: 'pendiente' },
  { area: 'marketing', responsible: 'Jessica Alva', action: '', maxDate: '', status: 'pendiente' },
  { area: 'capacitacion', responsible: 'Cristhian Sevillano / Teresa Haro', action: '', maxDate: '', status: 'pendiente' },
  { area: 'atc', responsible: 'Sergio Gonzales', action: '', maxDate: '', status: 'pendiente' }
];

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

export default function HiyariHattoModule({ products }: HiyariHattoModuleProps) {
  const [reports, setReports] = useState<HiyariHattoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
  const [uploading, setUploading] = useState(false);

  // Handle file uploads for various steps
  const handleStepFileUpload = async (
    stepField: 'flashAttachments' | 'visitAttachments' | 'qualityAttachments' | 'rootCauseAttachments',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingReport) return;

    setUploading(true);
    toast.loading('Subiendo evidencias...');

    try {
      const currentList = editingReport[stepField] || [];
      const newAttachments: any[] = [...currentList];
      
      const folderName = editingReport.ticketNumber || 'temp';
      for (const file of Array.from(files)) {
        const path = `hiyari_hatto/${folderName}/${Date.now()}_${file.name}`;
        const fileRes = await SupabaseService.uploadFile('rd-files', path, file) as any;
        newAttachments.push({
          name: file.name,
          url: fileRes.url,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }
      
      updateField(stepField, newAttachments);
      toast.dismiss();
      toast.success('Archivos cargados correctamente');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Error al subir archivos: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveStepAttachment = (
    stepField: 'flashAttachments' | 'visitAttachments' | 'qualityAttachments' | 'rootCauseAttachments',
    name: string
  ) => {
    if (!editingReport) return;
    const currentList = editingReport[stepField] || [];
    updateField(stepField, currentList.filter(f => f.name !== name));
  };

  const handleUpdateStepAttachmentLabel = (
    stepField: 'flashAttachments' | 'visitAttachments' | 'qualityAttachments' | 'rootCauseAttachments',
    fileName: string,
    newLabel: string
  ) => {
    if (!editingReport) return;
    const currentList = editingReport[stepField] || [];
    const updatedList = currentList.map(f => f.name === fileName ? { ...f, label: newLabel } : f);
    updateField(stepField, updatedList);
  };

  const renderAttachmentsSection = (
    stepField: 'flashAttachments' | 'visitAttachments' | 'qualityAttachments' | 'rootCauseAttachments',
    label = "Archivos de Evidencia / Fotos"
  ) => {
    if (!editingReport) return null;
    const attachments = editingReport[stepField] || [];

    return (
      <div className="space-y-3 mt-6 border-t border-slate-100 pt-6">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{label}</label>
        
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-black uppercase tracking-wider transition-all select-none">
            <Upload size={16} />
            Subir Archivos
            <input
              type="file"
              multiple
              onChange={(e) => handleStepFileUpload(stepField, e)}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {uploading && <span className="text-xs text-slate-400 font-medium animate-pulse">Subiendo...</span>}
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
            {attachments.map((file, idx) => {
              const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
              return (
                <div key={idx} className="relative group bg-white border border-slate-200 rounded-2xl overflow-hidden p-2 flex flex-col items-center justify-between text-center min-h-[140px] shadow-sm">
                  {isImage ? (
                    <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      <a href={file.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        Ver Imagen
                      </a>
                    </div>
                  ) : (
                    <div className="w-full h-20 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-2">
                      <FileText size={32} className="text-blue-500 mb-1" />
                      <span className="text-[10px] font-mono text-slate-500 truncate w-full">{file.name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  )}

                  <div className="w-full mt-2 px-1 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-700 truncate w-full" title={file.name}>
                      {file.name}
                    </span>
                    <input
                      type="text"
                      value={file.label || ''}
                      onChange={(e) => handleUpdateStepAttachmentLabel(stepField, file.name, e.target.value)}
                      placeholder="Etiqueta (ej. Falla perilla)..."
                      className="px-2 py-1 border border-slate-200 rounded-lg outline-none text-[9px] font-bold text-slate-700 w-full mt-1.5 focus:border-blue-500"
                    />
                    <a href={file.url} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline mt-1">
                      Descargar
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStepAttachment(stepField, file.name)}
                    className="absolute top-1 right-1 p-1 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  // Dashboard state
  const [monthlyVolume, setMonthlyVolume] = useState<number>(20000);
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  
  // Incident Records state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Editor Modal / Sheet State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<HiyariHattoReport> | null>(null);
  const [editorStep, setEditorStep] = useState<number>(1);
  const [productSearch, setProductSearch] = useState('');

  // Ishikawa Temp Inputs
  const [newIshikawaFactor, setNewIshikawaFactor] = useState('');
  const [ishikawaTargetCategory, setIshikawaTargetCategory] = useState<keyof IshikawaData>('metodo');

  // Print Preview state
  const [printingReport, setPrintingReport] = useState<HiyariHattoReport | null>(null);

  // Fetch reports on mount
  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getHiyariHattoReports();
      setReports(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar reportes Hiyari Hatto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter reports for dashboard
  const filteredReportsForDashboard = useMemo(() => {
    return reports.filter(r => {
      if (selectedYear !== 'all') {
        const date = r.incidentDate ? new Date(r.incidentDate) : null;
        if (date && date.getFullYear().toString() !== selectedYear) return false;
      }
      if (selectedMonth !== 'all') {
        const date = r.incidentDate ? new Date(r.incidentDate) : null;
        if (date && (date.getMonth() + 1).toString() !== selectedMonth) return false;
      }
      if (selectedBrand !== 'all') {
        // Find product to check brand
        const prod = products.find(p => p.codigoSAP === r.sapCode);
        const brandName = prod?.brand?.name || '';
        if (!brandName.toLowerCase().includes(selectedBrand.toLowerCase())) return false;
      }
      return true;
    });
  }, [reports, selectedYear, selectedMonth, selectedBrand, products]);

  // General Filtered Reports List
  const filteredReportsList = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = 
        r.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.sapCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  // Dashboard Stats & KPI Calculations
  const stats = useMemo(() => {
    const total = filteredReportsForDashboard.length;
    const open = filteredReportsForDashboard.filter(r => r.status !== 'completed').length;
    const completed = total - open;
    const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    
    // Classify reports for metrics
    let waterHeatersCount = 0;
    let kitchenApplianceCount = 0;
    let othersCount = 0;

    filteredReportsForDashboard.forEach(r => {
      const prod = products.find(p => p.codigoSAP === r.sapCode);
      const lineName = (prod?.line_name || prod?.line?.name || '').toLowerCase();
      
      if (lineName.includes('terma') || lineName.includes('calentador') || lineName.includes('rápida') || lineName.includes('instantáneo') || lineName.includes('water heater')) {
        waterHeatersCount++;
      } else if (lineName.includes('cocina') || lineName.includes('horn') || lineName.includes('campana') || lineName.includes('encimera') || lineName.includes('kitchen') || lineName.includes('appliance')) {
        kitchenApplianceCount++;
      } else {
        othersCount++;
      }
    });

    // Real failure rates
    const realOverallRate = total > 0 ? (total / monthlyVolume) * 100 : 0;
    const realWaterHeatersRate = (waterHeatersCount / (monthlyVolume * 0.40)) * 100; // Assume 40% of sales volume is Water Heaters
    const realKitchenRate = (kitchenApplianceCount / (monthlyVolume * 0.50)) * 105; // Adjust weights
    const realOthersRate = (othersCount / (monthlyVolume * 0.10)) * 100; // Assume 10% of sales volume is Others

    // Conclusion categories counts
    const conclProduct = filteredReportsForDashboard.filter(r => r.qualityReportConclusion === 'producto').length;
    const conclInstall = filteredReportsForDashboard.filter(r => r.qualityReportConclusion === 'instalacion').length;
    const conclClient = filteredReportsForDashboard.filter(r => r.qualityReportConclusion === 'cliente').length;

    // Action plan statistics
    let pendingActions = 0;
    let completedActions = 0;
    let totalActions = 0;

    filteredReportsForDashboard.forEach(r => {
      (r.actionPlan || []).forEach(action => {
        if (action.status === 'pendiente') pendingActions++;
        else if (action.status === 'completado') completedActions++;
        if (action.status !== 'no_aplica') totalActions++;
      });
    });

    return {
      total,
      open,
      completed,
      resolutionRate,
      waterHeatersCount,
      kitchenApplianceCount,
      othersCount,
      realOverallRate: parseFloat(realOverallRate.toFixed(3)),
      realWaterHeatersRate: parseFloat(realWaterHeatersRate.toFixed(3)),
      realKitchenRate: parseFloat(realKitchenRate.toFixed(3)),
      realOthersRate: parseFloat(realOthersRate.toFixed(3)),
      conclProduct,
      conclInstall,
      conclClient,
      pendingActions,
      completedActions,
      totalActions
    };
  }, [filteredReportsForDashboard, monthlyVolume, products]);

  // Recharts Chart Data
  const causeChartData = useMemo(() => [
    { name: 'Falla Producto', value: stats.conclProduct, color: '#ef4444' },
    { name: 'Mala Instalación', value: stats.conclInstall, color: '#3b82f6' },
    { name: 'Manipulación Cliente', value: stats.conclClient, color: '#f59e0b' }
  ].filter(d => d.value > 0), [stats]);

  const monthlyHistoryData = useMemo(() => {
    // Generate months array
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((name, index) => {
      const count = filteredReportsForDashboard.filter(r => {
        const date = r.incidentDate ? new Date(r.incidentDate) : null;
        return date && date.getMonth() === index;
      }).length;
      return { name, Incidencias: count };
    });
  }, [filteredReportsForDashboard]);

  // Open Editor for new or existing report
  const handleOpenEditor = (report?: HiyariHattoReport) => {
    if (report) {
      setEditingReport({
        ...report,
        fiveWhys: report.fiveWhys || { ...DEFAULT_FIVE_WHYS },
        ishikawa: report.ishikawa || { ...DEFAULT_ISHIKAWA },
        actionPlan: report.actionPlan || createDefaultActionPlan()
      });
      setEditorStep(1);
    } else {
      setEditingReport({
        ticketNumber: '',
        sapCode: '',
        productName: '',
        serialNumber: '',
        incidentDate: new Date().toISOString().split('T')[0],
        reportDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        affectedPerson: '',
        incidentDescription: '',
        hasProductDamage: false,
        hasHomeDamage: false,
        hasClientDamage: false,
        status: 'flash_report',
        fiveWhys: { ...DEFAULT_FIVE_WHYS },
        ishikawa: { ...DEFAULT_ISHIKAWA },
        actionPlan: createDefaultActionPlan()
      });
      setEditorStep(1);
    }
    setProductSearch('');
    setIsEditorOpen(true);
  };

  // Save report (inserts or updates)
  const handleSaveReport = async () => {
    if (!editingReport) return;
    if (!editingReport.ticketNumber) {
      toast.error('El número de Ticket es requerido');
      return;
    }

    try {
      let saved: HiyariHattoReport;
      if (editingReport.id) {
        const res = await SupabaseService.updateHiyariHattoReport(editingReport.id, editingReport);
        saved = res as HiyariHattoReport;
        setReports(prev => prev.map(r => r.id === saved.id ? saved : r));
        toast.success('Incidente actualizado correctamente');
      } else {
        const res = await SupabaseService.createHiyariHattoReport(editingReport);
        saved = res as HiyariHattoReport;
        setReports(prev => [saved, ...prev]);
        toast.success('Flash Report registrado con éxito');
      }
      setIsEditorOpen(false);
      setEditingReport(null);
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar el reporte');
    }
  };

  // Delete report
  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este reporte de incidente de forma permanente?')) return;
    try {
      await SupabaseService.deleteHiyariHattoReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Reporte eliminado correctamente');
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar el reporte');
    }
  };

  // Update a single field in editing report
  const updateField = (key: keyof HiyariHattoReport, value: any) => {
    setEditingReport(prev => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
  };

  // Select product from search
  const handleSelectProduct = (prod: ProductRecord) => {
    setEditingReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sapCode: prod.codigoSAP,
        productName: prod.descripcionSAP
      };
    });
    setProductSearch('');
  };

  // Filter products for dropdown search
  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.codigoSAP.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.descripcionSAP.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);
  }, [products, productSearch]);

  // Ishikawa actions
  const addIshikawaFactor = () => {
    if (!newIshikawaFactor.trim() || !editingReport) return;
    const cat = ishikawaTargetCategory;
    const currentList = editingReport.ishikawa?.[cat] || [];
    
    const updatedIshikawa = {
      ...editingReport.ishikawa || DEFAULT_ISHIKAWA,
      [cat]: [...currentList, newIshikawaFactor.trim()]
    };

    setEditingReport(prev => prev ? { ...prev, ishikawa: updatedIshikawa } : null);
    setNewIshikawaFactor('');
  };

  const removeIshikawaFactor = (category: keyof IshikawaData, index: number) => {
    if (!editingReport) return;
    const currentList = editingReport.ishikawa?.[category] || [];
    const updatedList = currentList.filter((_, idx) => idx !== index);

    const updatedIshikawa = {
      ...editingReport.ishikawa || DEFAULT_ISHIKAWA,
      [category]: updatedList
    };

    setEditingReport(prev => prev ? { ...prev, ishikawa: updatedIshikawa } : null);
  };

  // Action plan toggles
  const updateActionPlanItem = (index: number, key: keyof ActionPlanItem, value: any) => {
    if (!editingReport || !editingReport.actionPlan) return;
    const list = [...editingReport.actionPlan];
    
    // Merge updates
    list[index] = {
      ...list[index],
      [key]: value
    };

    // Auto set completed date if completed
    if (key === 'status' && value === 'completado') {
      list[index].completedDate = new Date().toISOString().split('T')[0];
    } else if (key === 'status' && value !== 'completado') {
      delete list[index].completedDate;
    }

    setEditingReport(prev => prev ? { ...prev, actionPlan: list } : null);
  };

  // Check if action date is overdue
  const isOverdue = (dateStr?: string, status?: string) => {
    if (!dateStr || status !== 'pendiente') return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const maxDate = new Date(dateStr);
    return maxDate < today;
  };

  // Render Ishikawa SVG dynamically
  const renderIshikawaSVG = (data?: IshikawaData) => {
    const ishikawa = data || DEFAULT_ISHIKAWA;
    
    return (
      <svg viewBox="0 0 800 450" className="w-full h-auto bg-slate-900 border border-slate-800 rounded-3xl p-4 text-white shadow-inner font-sans">
        {/* Main Spine */}
        <line x1="50" y1="225" x2="680" y2="225" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round" />
        {/* Spine Arrow Head */}
        <polygon points="680,215 710,225 680,235" fill="#3b82f6" />
        
        {/* Head Label box */}
        <rect x="710" y="195" width="80" height="60" rx="8" fill="#ef4444" opacity="0.9" />
        <text x="750" y="230" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">EFECTO</text>
        <text x="750" y="245" fill="white" fontSize="9" textAnchor="middle">Causa Raíz</text>

        {/* Ribs (Upper half) */}
        {/* Métodos */}
        <line x1="200" y1="50" x2="300" y2="225" stroke="#ef4444" strokeWidth="3" strokeDasharray="3 3" />
        <text x="200" y="40" fill="#ef4444" fontSize="12" fontWeight="black" textAnchor="middle">MÉTODO</text>
        {ishikawa.metodo.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={220 + i * 20} y={90 + i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={215 + i * 20} y1={95 + i * 40} x2={250 + i * 20} y2={95 + i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Mano de Obra */}
        <line x1="380" y1="50" x2="480" y2="225" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 3" />
        <text x="380" y="40" fill="#f59e0b" fontSize="12" fontWeight="black" textAnchor="middle">MANO DE OBRA</text>
        {ishikawa.mano_obra.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={400 + i * 20} y={90 + i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={395 + i * 20} y1={95 + i * 40} x2={430 + i * 20} y2={95 + i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Máquina / Producto */}
        <line x1="560" y1="50" x2="660" y2="225" stroke="#3b82f6" strokeWidth="3" strokeDasharray="3 3" />
        <text x="560" y="40" fill="#3b82f6" fontSize="12" fontWeight="black" textAnchor="middle">MÁQUINA/PROD</text>
        {ishikawa.maquina_producto.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={580 + i * 20} y={90 + i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={575 + i * 20} y1={95 + i * 40} x2={610 + i * 20} y2={95 + i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Ribs (Lower half) */}
        {/* Materiales */}
        <line x1="150" y1="400" x2="250" y2="225" stroke="#10b981" strokeWidth="3" strokeDasharray="3 3" />
        <text x="150" y="415" fill="#10b981" fontSize="12" fontWeight="black" textAnchor="middle">MATERIALES</text>
        {ishikawa.materiales.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={190 + i * 20} y={350 - i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={185 + i * 20} y1={355 - i * 40} x2={220 + i * 20} y2={355 - i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Medición */}
        <line x1="330" y1="400" x2="430" y2="225" stroke="#6366f1" strokeWidth="3" strokeDasharray="3 3" />
        <text x="330" y="415" fill="#6366f1" fontSize="12" fontWeight="black" textAnchor="middle">MEDICIÓN</text>
        {ishikawa.medicion.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={370 + i * 20} y={350 - i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={365 + i * 20} y1={355 - i * 40} x2={400 + i * 20} y2={355 - i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Medio Ambiente */}
        <line x1="510" y1="400" x2="610" y2="225" stroke="#ec4899" strokeWidth="3" strokeDasharray="3 3" />
        <text x="510" y="415" fill="#ec4899" fontSize="12" fontWeight="black" textAnchor="middle">MEDIO AMBIENTE</text>
        {ishikawa.medio_ambiente.slice(0, 3).map((f, i) => (
          <g key={i}>
            <text x={550 + i * 20} y={350 - i * 40} fill="#cbd5e1" fontSize="9" fontWeight="bold" textAnchor="start">{f.substring(0, 20)}</text>
            <line x1={545 + i * 20} y1={355 - i * 40} x2={580 + i * 20} y2={355 - i * 40} stroke="#475569" strokeWidth="1" />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-blue-600" size={32} />
            Análisis de Empresa & Hiyari Hatto
          </h2>
          <p className="text-slate-500 font-medium mt-1">Plataforma gerencial para la prevención de riesgos, análisis factorial e Ishikawa en fallas críticas</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Dashboard Comité
          </button>
          
          <button
            onClick={() => setActiveTab('records')}
            className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Historial de Casos
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Dashboard Control Filters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Año</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="all">Todos los años</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mes</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
                >
                  <option value="all">Todos los meses</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Marca</span>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
                >
                  <option value="all">Todas las marcas</option>
                  <option value="Sole">Sole</option>
                  <option value="Rinnai">Rinnai</option>
                  <option value="Mitusia">Mitusia</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                Volumen Ventas/Instalaciones (Mes)
                <Info size={12} className="text-slate-400" />
              </span>
              <input
                type="number"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Math.max(1, Number(e.target.value)))}
                className="px-4 py-2.5 w-44 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
              />
            </div>
          </div>

          {/* KPI Widget Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Incidentes</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Bajo análisis Hiyari Hatto</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tareas Pendientes</p>
                <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.pendingActions}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Planes de acción en curso</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planes Completados</p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.completedActions}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Medidas preventivas listas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa de Resolución</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.resolutionRate}%</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">De incidentes concluidos</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          {/* Gerencial Failures Rates Targets Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="text-blue-600" size={24} />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wider">Tasas de Fallas vs Objetivos Corporativos (CEO Goals)</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Overall Company Goal */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tasa Global Empresa</h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{stats.realOverallRate.toFixed(3)}%</span>
                    <span className="text-xs font-bold text-slate-400">meta: 0.90%</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        stats.realOverallRate <= 0.90 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.realOverallRate / 0.90) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 uppercase">
                    <span>Cumplimiento</span>
                    <span className={stats.realOverallRate <= 0.90 ? 'text-emerald-600' : 'text-red-600'}>
                      {stats.realOverallRate <= 0.90 ? 'DENTRO DE META' : 'ALERTA (EXCEDE)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Water Heaters Goal */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Water Heaters</h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{stats.realWaterHeatersRate.toFixed(3)}%</span>
                    <span className="text-xs font-bold text-slate-400">meta: 1.20%</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        stats.realWaterHeatersRate <= 1.20 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.realWaterHeatersRate / 1.20) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 uppercase">
                    <span>Cumplimiento</span>
                    <span className={stats.realWaterHeatersRate <= 1.20 ? 'text-emerald-600' : 'text-red-600'}>
                      {stats.realWaterHeatersRate <= 1.20 ? 'DENTRO DE META' : 'ALERTA (EXCEDE)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kitchen Appliances Goal */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Kitchen Appliance</h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{stats.realKitchenRate.toFixed(3)}%</span>
                    <span className="text-xs font-bold text-slate-400">meta: 3.00%</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        stats.realKitchenRate <= 3.00 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.realKitchenRate / 3.00) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 uppercase">
                    <span>Cumplimiento</span>
                    <span className={stats.realKitchenRate <= 3.00 ? 'text-emerald-600' : 'text-red-600'}>
                      {stats.realKitchenRate <= 3.00 ? 'DENTRO DE META' : 'ALERTA (EXCEDE)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Others Goal */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Others</h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{stats.realOthersRate.toFixed(3)}%</span>
                    <span className="text-xs font-bold text-slate-400">meta: 0.10%</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        stats.realOthersRate <= 0.10 ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (stats.realOthersRate / 0.10) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1.5 uppercase">
                    <span>Cumplimiento</span>
                    <span className={stats.realOthersRate <= 0.10 ? 'text-emerald-600' : 'text-red-600'}>
                      {stats.realOthersRate <= 0.10 ? 'DENTRO DE META' : 'ALERTA (EXCEDE)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cause root pie chart */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col h-[350px]">
              <h4 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                Causa Raíz Determinada en el Comité
              </h4>
              <div className="flex-1 min-h-0">
                {causeChartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                    Sin datos concluidos en el mes
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={causeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {causeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} casos`, 'Cantidad']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Incident timeline */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col h-[350px]">
              <h4 className="text-sm font-black text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                Historial de Incidentes Reportados
              </h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyHistoryData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Incidencias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Action Plans Control Center */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Acciones Preventivas & Correctivas Activas (Action Plans)</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">TICKET</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">ÁREA</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">RESPONSABLE</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">ACCIÓN PREVENTIVA</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">FECHA LÍMITE</th>
                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportsForDashboard.flatMap(r => 
                    (r.actionPlan || [])
                      .filter(action => action.status !== 'no_aplica')
                      .map((action, idx) => {
                        const overdue = isOverdue(action.maxDate, action.status);
                        return (
                          <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50/30 transition-colors group">
                            <td className="px-6 py-4.5 font-mono text-xs font-bold text-slate-900">{r.ticketNumber}</td>
                            <td className="px-6 py-4.5">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                {action.area === 'producto' ? 'G. Innovación y Calidad' :
                                 action.area === 'marketing' ? 'Gerencia Marketing' :
                                 action.area === 'capacitacion' ? 'Capacitaciones' :
                                 'G. Atención al Cliente'}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 font-semibold text-slate-700 text-sm">{action.responsible}</td>
                            <td className="px-6 py-4.5 text-slate-600 text-sm max-w-xs truncate" title={action.action}>
                              {action.action || <span className="text-slate-400 italic">No definida</span>}
                            </td>
                            <td className="px-6 py-4.5 font-mono text-xs font-bold text-slate-700">
                              {action.maxDate ? format(parseISO(action.maxDate), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                action.status === 'completado' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : overdue 
                                    ? 'bg-red-100 text-red-700 animate-pulse'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {action.status === 'completado' ? 'Completado' : overdue ? 'RETRASADO' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  ).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                        Sin planes de acción registrados en este periodo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-8">
          {/* Records Search and Filters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por ticket, SAP, producto o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
              >
                <option value="all">Todos los Estados</option>
                <option value="flash_report">Flash Reports</option>
                <option value="under_analysis">Bajo Análisis</option>
                <option value="quality_report">Informe de Calidad</option>
                <option value="completed">Completados</option>
              </select>

              <button
                onClick={() => handleOpenEditor()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus size={18} />
                Nuevo Reporte (Flash)
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">TICKET / VUELO</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">PRODUCTO</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">CÓDIGO SAP</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">FECHA INCIDENTE</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">CLIENTE</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">DAÑOS</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ESTADO</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                        No hay reportes de incidentes registrados
                      </td>
                    </tr>
                  ) : (
                    filteredReportsList.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5 font-mono text-sm font-black text-slate-900">{report.ticketNumber}</td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-bold text-slate-900">{report.productName || '-'}</p>
                          <p className="text-[10px] font-semibold text-slate-400">S/N: {report.serialNumber || 'No reg.'}</p>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs font-bold text-slate-500">{report.sapCode || '-'}</td>
                        <td className="px-6 py-5 font-mono text-xs font-bold text-slate-600">
                          {report.incidentDate ? format(parseISO(report.incidentDate), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-700">{report.customerName || '-'}</td>
                        <td className="px-6 py-5">
                          <div className="flex gap-1.5 flex-wrap">
                            {report.hasProductDamage && <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold">Producto</span>}
                            {report.hasHomeDamage && <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold">Domicilio</span>}
                            {report.hasClientDamage && <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold">Cliente</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider ${
                            report.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : report.status === 'quality_report'
                                ? 'bg-purple-100 text-purple-800'
                                : report.status === 'under_analysis'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-805'
                          }`}>
                            {report.status === 'completed' 
                              ? 'Completado' 
                              : report.status === 'quality_report'
                                ? 'Informe de Calidad'
                                : report.status === 'under_analysis'
                                  ? 'Bajo Análisis'
                                  : 'Flash Report'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditor(report)}
                              className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all"
                              title="Editar / Analizar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setPrintingReport(report)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all"
                              title="Ver Ficha de Impresión"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(report.id!)}
                              className="p-2 bg-slate-100 hover:bg-red-50 text-slate-650 hover:text-red-600 rounded-xl transition-all"
                              title="Eliminar Reporte"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal / Side Sheet (Paso a Paso) */}
      {isEditorOpen && editingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingReport.id ? 'Análisis y Trazabilidad del Incidente' : 'Registrar Nuevo Incidente Crítico'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Sigue las fases establecidas en el protocolo de calidad Sole</p>
              </div>
              <button 
                onClick={() => { setIsEditorOpen(false); setEditingReport(null); }}
                className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Wizard Progress */}
            <div className="flex border-b border-slate-100 bg-slate-50/40">
              {[
                { step: 1, name: '1. Flash Report' },
                { step: 2, name: '2. Protocolo Visita' },
                { step: 3, name: '3. Informe Calidad' },
                { step: 4, name: '4. Ishikawa & 5 Whys' },
                { step: 5, name: '5. Action Plan (Q5)' }
              ].map(item => (
                <button
                  key={item.step}
                  onClick={() => setEditorStep(item.step)}
                  className={`flex-1 py-4 border-b-4 text-xs font-black uppercase tracking-wider transition-all text-center ${
                    editorStep === item.step
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {/* Modal Content / Wizard Steps */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {/* STEP 1: FLASH REPORT */}
              {editorStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Número de Ticket / Vuelo *</label>
                      <input
                        type="text"
                        value={editingReport.ticketNumber || ''}
                        onChange={(e) => updateField('ticketNumber', e.target.value)}
                        placeholder="Ej. 1328072 o SOLHO007"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>

                    <div className="flex flex-col relative">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Buscar Producto (SAP)</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Escribe código SAP o descripción..."
                          className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                        />
                      </div>
                      
                      {/* Product Search Results Dropdown */}
                      {filteredProducts.length > 0 && (
                        <div className="absolute top-[75px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectProduct(p)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 flex flex-col"
                            >
                              <span className="font-bold text-slate-900 text-sm">{p.descripcionSAP}</span>
                              <span className="font-mono text-xs text-blue-600">SAP: {p.codigoSAP}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Código SAP Actual</label>
                      <input
                        type="text"
                        value={editingReport.sapCode || ''}
                        onChange={(e) => updateField('sapCode', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none font-bold text-slate-700 bg-slate-50 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción Producto</label>
                      <input
                        type="text"
                        value={editingReport.productName || ''}
                        onChange={(e) => updateField('productName', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 outline-none font-bold text-slate-700 bg-slate-50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Número de Serie (S/N)</label>
                      <input
                        type="text"
                        value={editingReport.serialNumber || ''}
                        onChange={(e) => updateField('serialNumber', e.target.value)}
                        placeholder="Ej. CP0432507000517"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha del Incidente</label>
                      <input
                        type="date"
                        value={editingReport.incidentDate ? editingReport.incidentDate.split('T')[0] : ''}
                        onChange={(e) => updateField('incidentDate', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-850 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de Reporte (ATC)</label>
                      <input
                        type="date"
                        value={editingReport.reportDate ? editingReport.reportDate.split('T')[0] : ''}
                        onChange={(e) => updateField('reportDate', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-850 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Cliente</label>
                      <input
                        type="text"
                        value={editingReport.customerName || ''}
                        onChange={(e) => updateField('customerName', e.target.value)}
                        placeholder="Ej. Mirtha Soledad Uribe"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <div className="flex flex-col md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Dirección del Cliente</label>
                      <input
                        type="text"
                        value={editingReport.customerAddress || ''}
                        onChange={(e) => updateField('customerAddress', e.target.value)}
                        placeholder="Ej. Calle César Vallejo 384, Surco"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Personas Involucradas / Afectadas</label>
                    <input
                      type="text"
                      value={editingReport.affectedPerson || ''}
                      onChange={(e) => updateField('affectedPerson', e.target.value)}
                      placeholder="Ej. Cliente sufrió quemaduras leves en el rostro..."
                      className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción de Cómo Ocurrió el Accidente</label>
                    <textarea
                      rows={4}
                      value={editingReport.incidentDescription || ''}
                      onChange={(e) => updateField('incidentDescription', e.target.value)}
                      placeholder="Detalle narrativo de lo ocurrido..."
                      className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                    />
                  </div>

                  {/* Damage Classification Checks */}
                  <div className="p-5 bg-red-50/50 rounded-2xl border border-red-100">
                    <h4 className="text-xs font-black text-red-950 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-red-600" />
                      Clasificación de Daños Afectados (Seleccione todos los que correspondan)
                    </h4>
                    <div className="flex gap-8 flex-wrap">
                      <label className="flex items-center gap-2.5 font-bold text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingReport.hasProductDamage || false}
                          onChange={(e) => updateField('hasProductDamage', e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Daños al Producto Sole
                      </label>
                      
                      <label className="flex items-center gap-2.5 font-bold text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingReport.hasHomeDamage || false}
                          onChange={(e) => updateField('hasHomeDamage', e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Daños en la Infraestructura/Domicilio
                      </label>

                      <label className="flex items-center gap-2.5 font-bold text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingReport.hasClientDamage || false}
                          onChange={(e) => updateField('hasClientDamage', e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Afectación Física / Daños a Personas
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Elaborado por (Flash Report)</label>
                      <input
                        type="text"
                        value={editingReport.flashReportBy || ''}
                        onChange={(e) => updateField('flashReportBy', e.target.value)}
                        placeholder="Ej. Sergio González"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Envío Flash Report</label>
                      <input
                        type="date"
                        value={editingReport.flashReportDate ? editingReport.flashReportDate.split('T')[0] : ''}
                        onChange={(e) => updateField('flashReportDate', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-850 text-sm"
                      />
                    </div>
                  </div>
                  {renderAttachmentsSection('flashAttachments', 'Archivos de Evidencia / Fotos (Flash Report)')}
                </div>
              )}

              {/* STEP 2: PROTOCOLO VISITA */}
              {editorStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 mb-6 flex items-start gap-3">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Protocolo de Calidad Gerencial</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        El protocolo exige: 1. Visita técnica en primera instancia al domicilio del cliente con servicio técnico calificado, 
                        y 2. Retorno y recepción del producto defectuoso a laboratorios Sole para el análisis de causa raíz.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de Visita Técnica al Domicilio</label>
                      <input
                        type="date"
                        value={editingReport.visitDate ? editingReport.visitDate.split('T')[0] : ''}
                        onChange={(e) => updateField('visitDate', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-850 text-sm"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Recepción Producto Defectuoso (MTI)</label>
                      <input
                        type="date"
                        value={editingReport.receivedDate ? editingReport.receivedDate.split('T')[0] : ''}
                        onChange={(e) => updateField('receivedDate', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-850 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Informe Técnico Inicial (Visita Domiciliaria)</label>
                    <textarea
                      rows={5}
                      value={editingReport.visitTechnicalReport || ''}
                      onChange={(e) => updateField('visitTechnicalReport', e.target.value)}
                      placeholder="Registrar detalles y observaciones del técnico durante la inspección física in-situ..."
                      className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                    />
                  </div>
                  {renderAttachmentsSection('visitAttachments', 'Evidencias del Protocolo de Visita / Recepción')}
                </div>
              )}

              {/* STEP 3: INFORME DE CALIDAD */}
              {editorStep === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Antecedentes Generales del Producto / Historial</label>
                    <textarea
                      rows={3}
                      value={editingReport.qualityReportAntecedents || ''}
                      onChange={(e) => updateField('qualityReportAntecedents', e.target.value)}
                      placeholder="Detalles sobre compras anteriores, instalaciones previas, revisiones o reclamos reportados..."
                      className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Pruebas Realizadas en el Laboratorio</label>
                    <textarea
                      rows={4}
                      value={editingReport.qualityReportTests || ''}
                      onChange={(e) => updateField('qualityReportTests', e.target.value)}
                      placeholder="Detalle de hermeticidad, verificación de componentes eléctricos, pruebas de encendido, análisis químico, etc..."
                      className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                    <div className="flex flex-col md:col-span-1">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Origen / Conclusión de la Falla *</label>
                      <select
                        value={editingReport.qualityReportConclusion || ''}
                        onChange={(e) => updateField('qualityReportConclusion', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      >
                        <option value="">Seleccione origen...</option>
                        <option value="producto">Falla de Producto (Diseño/Fabricación)</option>
                        <option value="instalacion">Mala Instalación (Contratista/Tercero)</option>
                        <option value="cliente">Mala Manipulación / Conducción Cliente</option>
                      </select>
                    </div>

                    <div className="flex flex-col md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Justificación de la Conclusión</label>
                      <input
                        type="text"
                        value={editingReport.conclusionDetails || ''}
                        onChange={(e) => updateField('conclusionDetails', e.target.value)}
                        placeholder="Detalle técnico específico que sustente la conclusión anterior"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                  </div>
                  {renderAttachmentsSection('qualityAttachments', 'Evidencias del Informe de Calidad / Pruebas')}
                </div>
              )}

              {/* STEP 4: ISHIKAWA & 5 WHYS */}
              {editorStep === 4 && (
                <div className="space-y-8">
                  {/* Part A: 5 Whys Visualizer */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">5</div>
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-wider">Causa Raíz - Método de los 5 Por Qués</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {[
                        { num: 1, key: 'why1', label: '1er Por qué' },
                        { num: 2, key: 'why2', label: '2do Por qué' },
                        { num: 3, key: 'why3', label: '3er Por qué' },
                        { num: 4, key: 'why4', label: '4to Por qué' },
                        { num: 5, key: 'why5', label: '5to Por qué (Causa Raíz)' }
                      ].map((item, idx) => (
                        <div key={item.key} className="flex flex-col bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</label>
                          <textarea
                            rows={3}
                            value={editingReport.fiveWhys?.[item.key as keyof FiveWhys] || ''}
                            onChange={(e) => {
                              const updatedFiveWhys = {
                                ...editingReport.fiveWhys || DEFAULT_FIVE_WHYS,
                                [item.key]: e.target.value
                              };
                              updateField('fiveWhys', updatedFiveWhys);
                            }}
                            placeholder="Escribe la respuesta causal..."
                            className="w-full bg-white p-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                          />
                          {idx < 4 && (
                            <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-400">
                              <ArrowRight size={12} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Part B: Ishikawa Fishbone Diagram Builder */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">I</div>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-wider">Causa Raíz - Diagrama de Ishikawa</h4>
                      </div>
                      
                      {/* Ishikawa Factor Adder Panel */}
                      <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                        <select
                          value={ishikawaTargetCategory}
                          onChange={(e) => setIshikawaTargetCategory(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-700 bg-white"
                        >
                          <option value="metodo">Método</option>
                          <option value="mano_obra">Mano de Obra (Instalación)</option>
                          <option value="maquina_producto">Máquina/Producto</option>
                          <option value="materiales">Materiales</option>
                          <option value="medicion">Medición</option>
                          <option value="medio_ambiente">Medio Ambiente</option>
                        </select>
                        <input
                          type="text"
                          value={newIshikawaFactor}
                          onChange={(e) => setNewIshikawaFactor(e.target.value)}
                          placeholder="Añadir factor a la espina..."
                          className="px-3 py-1.5 w-48 rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold"
                        />
                        <button
                          onClick={addIshikawaFactor}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* SVG Visualizer */}
                      <div className="lg:col-span-2">
                        {renderIshikawaSVG(editingReport.ishikawa)}
                      </div>

                      {/* Factor Manager List */}
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 max-h-[350px] overflow-y-auto custom-scrollbar">
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Administrar Factores Registrados</h5>
                        
                        <div className="space-y-4">
                          {[
                            { key: 'metodo', label: 'Método', color: 'text-red-500' },
                            { key: 'mano_obra', label: 'Mano de Obra', color: 'text-amber-500' },
                            { key: 'maquina_producto', label: 'Máquina/Producto', color: 'text-blue-500' },
                            { key: 'materiales', label: 'Materiales', color: 'text-emerald-500' },
                            { key: 'medicion', label: 'Medición', color: 'text-indigo-500' },
                            { key: 'medio_ambiente', label: 'Medio Ambiente', color: 'text-pink-500' }
                          ].map(cat => {
                            const list = editingReport.ishikawa?.[cat.key as keyof IshikawaData] || [];
                            return (
                              <div key={cat.key} className="space-y-1.5">
                                <h6 className={`text-[10px] font-black uppercase tracking-widest ${cat.color}`}>{cat.label}</h6>
                                {list.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 italic pl-2">Sin factores añadidos</p>
                                ) : (
                                  <div className="space-y-1 pl-2">
                                    {list.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-100 text-xs">
                                        <span className="font-medium text-slate-700 truncate max-w-[150px]">{item}</span>
                                        <button 
                                          onClick={() => removeIshikawaFactor(cat.key as keyof IshikawaData, idx)}
                                          className="text-slate-400 hover:text-red-500 transition-all"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part C: Text Predictives Questions */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        ¿Qué habría pasado si el usuario hubiera estado utilizando el producto en ese momento?
                      </label>
                      <textarea
                        rows={3}
                        value={editingReport.hiyariQ3 || ''}
                        onChange={(e) => updateField('hiyariQ3', e.target.value)}
                        placeholder="Análisis del riesgo si el cliente final hubiera estado interactuando con el equipo..."
                        className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        ¿Podría repetirse en otra instalación o con otro cliente?
                      </label>
                      <textarea
                        rows={3}
                        value={editingReport.hiyariQ4 || ''}
                        onChange={(e) => updateField('hiyariQ4', e.target.value)}
                        placeholder="Análisis de posibilidad de recurrencia en modelos similares, contratistas o lotes..."
                        className="p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                      />
                    </div>
                  </div>
                  {renderAttachmentsSection('rootCauseAttachments', 'Evidencias del Análisis Causa Raíz / Ishikawa')}
                </div>
              )}

              {/* STEP 5: ACTION PLAN (Q5) */}
              {editorStep === 5 && (
                <div className="space-y-6">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex items-start gap-3">
                    <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Plan de Acción - Acción Preventiva (Q5)</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Define los responsables (únicamente gerentes/jefes) y las fechas límite para las medidas preventivas. 
                        Marca las áreas que no aplican según la conclusión del informe.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(editingReport.actionPlan || []).map((action, index) => {
                      const overdue = isOverdue(action.maxDate, action.status);
                      const isNVar = action.status === 'no_aplica';

                      return (
                        <div key={action.area} className={`p-6 rounded-3xl border transition-all ${
                          isNVar 
                            ? 'bg-slate-50 border-slate-200 opacity-60' 
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                                {action.area === 'producto' ? 'Gerencia Innovación y Calidad' :
                                 action.area === 'marketing' ? 'Gerencia Marketing' :
                                 action.area === 'capacitacion' ? 'Área de Capacitaciones' :
                                 'Gerencia de Atención al Cliente'}
                              </span>
                              <span className="text-slate-400 font-bold text-xs">|</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsable:</span>
                                <input
                                  type="text"
                                  value={action.responsible}
                                  onChange={(e) => updateActionPlanItem(index, 'responsible', e.target.value)}
                                  className="px-3 py-1 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 w-64"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <select
                                value={action.status}
                                onChange={(e) => updateActionPlanItem(index, 'status', e.target.value as any)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-700"
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="completado">Completado</option>
                                <option value="no_aplica">No Aplica</option>
                              </select>

                              {overdue && (
                                <span className="px-2.5 py-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                  Retrasado
                                </span>
                              )}
                            </div>
                          </div>

                          {!isNVar && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-2 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                  Acción Preventiva / Mitigación
                                </label>
                                <input
                                  type="text"
                                  value={action.action}
                                  onChange={(e) => updateActionPlanItem(index, 'action', e.target.value)}
                                  placeholder="Ej. Realizar comunicación a clientes finales sobre encendido seguro..."
                                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-semibold text-slate-800 text-sm"
                                />
                              </div>

                              <div className="flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                  Fecha Máxima de Ejecución
                                </label>
                                <input
                                  type="date"
                                  value={action.maxDate || ''}
                                  onChange={(e) => updateActionPlanItem(index, 'maxDate', e.target.value)}
                                  className="px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
                                />
                              </div>
                            </div>
                          )}

                          {isNVar && (
                            <p className="text-xs text-slate-400 font-bold italic">Esta área no requiere plan de acción para este incidente.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex flex-col">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado Global del Reporte</label>
                    <select
                      value={editingReport.status || 'flash_report'}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm max-w-xs"
                    >
                      <option value="flash_report">1. Flash Report (Inicial)</option>
                      <option value="under_analysis">2. Bajo Análisis (Inspección)</option>
                      <option value="quality_report">3. Informe de Calidad (Comité)</option>
                      <option value="completed">4. Completado (Acciones cerradas)</option>
                    </select>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                {editorStep > 1 && (
                  <button
                    onClick={() => setEditorStep(prev => prev - 1)}
                    className="px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-sm transition-all"
                  >
                    Atrás
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setIsEditorOpen(false); setEditingReport(null); }}
                  className="px-5 py-3 text-slate-500 hover:text-slate-700 font-bold text-sm"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSaveReport}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                  <Save size={16} />
                  Guardar Avances
                </button>

                {editorStep < 5 ? (
                  <button
                    onClick={() => setEditorStep(prev => prev + 1)}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-all"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      updateField('status', 'completed');
                      // Force local state to wait for update field
                      const updatedReport = { ...editingReport, status: 'completed' as const };
                      try {
                        let saved;
                        if (updatedReport.id) {
                          saved = await SupabaseService.updateHiyariHattoReport(updatedReport.id, updatedReport);
                        } else {
                          saved = await SupabaseService.createHiyariHattoReport(updatedReport);
                        }
                        setReports(prev => prev.map(r => r.id === saved.id ? saved : r));
                        toast.success('Informe Finalizado y Guardado');
                        setIsEditorOpen(false);
                      } catch (e) {
                        toast.error('Error al finalizar el reporte');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/25"
                  >
                    Finalizar y Cerrar Caso
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW PREVIEW MODAL */}
      {printingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[95] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Control Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="text-base font-black text-slate-800">Ficha Técnica Gerencial - Hiyari Hatto</h4>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const printable = document.getElementById('printable-area');
                    if (printable) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Reporte Hiyari Hatto - ${printingReport.ticketNumber}</title>
                              <style>
                                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                body { font-family: sans-serif; padding: 30px; color: #1e293b; }
                                svg { max-width: 100%; height: auto; display: block; margin: 15px auto; }
                                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; margin-bottom: 25px; }
                                .title { font-size: 20px; font-weight: bold; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                                .section { margin-bottom: 25px; }
                                .section-title { font-size: 14px; font-weight: bold; background: #f1f5f9; padding: 6px 10px; margin-bottom: 10px; text-transform: uppercase; border-left: 4px solid #3b82f6; }
                                .label { font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; }
                                .value { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
                                .five-whys-chain { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
                                .why-item { display: flex; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; }
                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
                                th { background: #f8fafc; font-weight: bold; text-align: left; }
                                .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; }
                                .border { border: 1px solid #e2e8f0; }
                                .rounded-3xl { border-radius: 1.5rem; }
                                .p-2 { padding: 0.5rem; }
                                .bg-slate-50 { background-color: #f8fafc; }
                              </style>
                            </head>
                            <body>
                              ${printable.innerHTML}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  <Printer size={16} />
                  Imprimir Ficha
                </button>
                <button
                  onClick={() => setPrintingReport(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar" id="printable-area">
              {/* Header Letterhead Template */}
              <div className="print-header flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-6" style={{ width: '100%' }}>
                <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: '#0a3161', fontFamily: 'sans-serif', letterSpacing: '-0.025em' }}>Grupo Sole</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Rinnai Corporation</span>
                </div>
                <div style={{ flex: 1, borderBottom: '1px solid #cbd5e1', marginBottom: '4px', marginLeft: '20px' }}></div>
              </div>

              {/* Title of the report */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-950">INFORME DE INCIDENCIA DE PRODUCTO</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Control de Incidentes Críticos, Causa Raíz e Ishikawa
                  </p>
                </div>
                <div>
                  <span className="px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-800">
                    Ticket: {printingReport.ticketNumber}
                  </span>
                </div>
              </div>

              {/* Step 1 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  1. Antecedentes del Incidente (Flash Report)
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Código SAP / Producto</div>
                    <div className="font-bold mt-0.5 text-slate-800">{printingReport.sapCode} - {printingReport.productName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Número de Serie (S/N)</div>
                    <div className="font-bold mt-0.5 text-slate-800">{printingReport.serialNumber || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Nombre del Cliente / Dirección</div>
                    <div className="font-bold mt-0.5 text-slate-800">{printingReport.customerName} - {printingReport.customerAddress}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha Incidente / ATC Reporte</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {printingReport.incidentDate ? format(parseISO(printingReport.incidentDate), 'dd/MM/yyyy') : '-'} / {printingReport.reportDate ? format(parseISO(printingReport.reportDate), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Daños Reportados</div>
                  <div className="flex gap-2 mt-1">
                    {printingReport.hasProductDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño de Producto</span>}
                    {printingReport.hasHomeDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño Domicilio</span>}
                    {printingReport.hasClientDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño al Cliente</span>}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Descripción del Accidente</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{printingReport.incidentDescription || '-'}</div>
                </div>
              </div>

              {/* Step 2 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  2. Protocolo de Inspección Técnica
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha de Visita al Domicilio</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {printingReport.visitDate ? format(parseISO(printingReport.visitDate), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha Recepción en MTI (Falla)</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {printingReport.receivedDate ? format(parseISO(printingReport.receivedDate), 'dd/MM/yyyy') : '-'}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Informe Técnico de la Visita</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{printingReport.visitTechnicalReport || '-'}</div>
                </div>
              </div>

              {/* Step 3 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  3. Informe de Incidencia & Conclusión de Calidad
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Origen de Falla Determinado</div>
                    <div className="font-bold mt-0.5 text-red-600 uppercase">
                      {printingReport.qualityReportConclusion === 'producto' ? 'Falla de Producto (Diseño/Fabricación)' : 
                       printingReport.qualityReportConclusion === 'instalacion' ? 'Mala Instalación externa' : 
                       printingReport.qualityReportConclusion === 'cliente' ? 'Manipulación Incorrecta del Cliente' : 'Bajo análisis'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Justificación Conclusión</div>
                    <div className="font-bold mt-0.5 text-slate-800">{printingReport.conclusionDetails || '-'}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Pruebas en Laboratorio</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{printingReport.qualityReportTests || '-'}</div>
                </div>
              </div>

              {/* Step 4 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  4. Análisis Causa Raíz (Hiyari Hatto & 5 Por Qués)
                </div>
                
                <div className="five-whys-chain mt-2 space-y-2">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Cadena de Causalidad (5 Por qués)</div>
                  {printingReport.fiveWhys && Object.entries(printingReport.fiveWhys).map(([key, val], idx) => (
                    <div key={key} className="flex gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold">
                      <span className="text-blue-600 font-black">Por qué {idx + 1}:</span>
                      <span className="text-slate-700">{val || 'No definido'}</span>
                    </div>
                  ))}
                </div>

                {/* Diagrama de Ishikawa en la Ficha de Impresión */}
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Diagrama de Ishikawa Causa-Efecto</div>
                  <div className="border border-slate-200 rounded-3xl p-2 bg-slate-50">
                    {renderIshikawaSVG(printingReport.ishikawa, true)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Impacto si el usuario hubiese estado utilizando el producto</div>
                    <div className="font-semibold mt-1 text-slate-700 leading-relaxed">{printingReport.hiyariQ3 || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Riesgo de recurrencia en otras instalaciones</div>
                    <div className="font-semibold mt-1 text-slate-700 leading-relaxed">{printingReport.hiyariQ4 || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Step 5 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  5. Plan de Acción Preventivo (Action Plan)
                </div>
                
                <table>
                  <thead>
                    <tr>
                      <th>Área</th>
                      <th>Responsable</th>
                      <th>Acción Preventiva</th>
                      <th>Fecha Límite</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printingReport.actionPlan || []).map((action, idx) => (
                      <tr key={idx}>
                        <td className="font-bold text-xs uppercase">
                          {action.area === 'producto' ? 'G. Innovación y Calidad' :
                           action.area === 'marketing' ? 'Gerencia Marketing' :
                           action.area === 'capacitacion' ? 'Área de Capacitaciones' :
                           'G. Atención al Cliente'}
                        </td>
                        <td className="font-bold text-xs">{action.responsible}</td>
                        <td>{action.action || <span className="text-slate-400 italic">No requerida/No aplica</span>}</td>
                        <td className="font-mono text-xs">
                          {action.maxDate ? format(parseISO(action.maxDate), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td>
                          <span className="badge">
                            {action.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Anexo de Evidencias en PDF */}
              {((printingReport.flashAttachments && printingReport.flashAttachments.length > 0) ||
                (printingReport.visitAttachments && printingReport.visitAttachments.length > 0) ||
                (printingReport.qualityAttachments && printingReport.qualityAttachments.length > 0) ||
                (printingReport.rootCauseAttachments && printingReport.rootCauseAttachments.length > 0)) && (
                <div className="section mb-6">
                  <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                    6. Anexo de Evidencias Fotográficas y Documentos
                  </div>
                  <div className="grid gap-4">
                    {[
                      { title: 'Evidencias de Flash Report', files: printingReport.flashAttachments },
                      { title: 'Evidencias de Protocolo de Visita / Recepción', files: printingReport.visitAttachments },
                      { title: 'Evidencias de Informe de Calidad', files: printingReport.qualityAttachments },
                      { title: 'Evidencias de Causa Raíz / Ishikawa', files: printingReport.rootCauseAttachments }
                    ].map(group => {
                      if (!group.files || group.files.length === 0) return null;
                      return (
                        <div key={group.title} className="border border-slate-200 rounded-3xl p-4 bg-slate-50">
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">{group.title}</div>
                          <div className="flex flex-wrap gap-3">
                            {group.files.map((file, idx) => {
                              const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                              return (
                                <div key={idx} className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-2 w-32 text-center animate-in fade-in duration-200">
                                  {isImage ? (
                                    <img src={file.url} alt={file.name} className="w-28 h-20 object-cover rounded-lg" />
                                  ) : (
                                    <div className="w-28 h-20 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-blue-500 p-2">
                                      <FileText size={24} className="mb-1" />
                                      <span className="text-[9px] font-mono uppercase truncate w-full">{file.name.split('.').pop()}</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-slate-650 truncate w-full mt-1.5" title={file.label || file.name}>{file.label || file.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Letterhead Template */}
              <div className="print-footer mt-10 pt-6 border-t border-slate-200 flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '30px' }}>
                <div style={{ backgroundColor: '#f1f5f9', borderTopRightRadius: '15px', borderBottomRightRadius: '15px', padding: '10px 15px', fontSize: '9px', lineHeight: '1.4', fontWeight: '800', color: '#475569', fontFamily: 'sans-serif' }}>
                  Av. Argentina 2317 - Callao<br/>
                  Av. Camino Real 1281 - San Isidro<br/>
                  www.gruposole.com.pe/corporativo
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  sole &nbsp;&bull;&nbsp; S&middot;Collection &nbsp;&bull;&nbsp; Rinnai &nbsp;&bull;&nbsp; METUSA &nbsp;&bull;&nbsp; BRIKKEL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
