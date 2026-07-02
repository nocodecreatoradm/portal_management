import React, { useState, useMemo, useEffect } from 'react';
import SearchableSelect from './SearchableSelect';
import { 
  TrendingUp, AlertCircle, FileText, Download, CheckCircle2, Clock, HelpCircle,
  Plus, Search, ChevronRight, Info, Trash2, ArrowRight, RefreshCw, Printer, AlertTriangle, ShieldCheck, Upload,
  Calendar, User, Home, Wrench, Edit, X, Save, Paperclip, MapPin, Globe
} from 'lucide-react';
import { HiyariHattoReport, ProductRecord, ActionPlanItem, FiveWhys, IshikawaData, Supplier, InvolvedPerson, FileInfo } from '../types';
import { format, parseISO } from 'date-fns';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';
import { REGIONS, PERU_DISTRICTS, PERU_SVG_PATHS, getNormalizeKey, REGION_COORDINATES } from '../data/peruGeo';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapController: React.FC<{ selectedRegion: string | null }> = ({ selectedRegion }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedRegion && REGION_COORDINATES[selectedRegion]) {
      const { lat, lng } = REGION_COORDINATES[selectedRegion];
      map.setView([lat, lng], 7, { animate: true, duration: 1.2 });
    } else {
      map.setView([-9.19, -75.0152], 5, { animate: true, duration: 1.2 });
    }
  }, [selectedRegion, map]);
  return null;
};





interface HiyariHattoModuleProps {
  products: ProductRecord[];
  brands?: any[];
  productLines?: any[];
  categories?: any[];
  suppliers?: Supplier[];
}

interface ChecklistItem {
  id: string;
  point: string;
  checked: boolean;
  comment: string;
  attachments: FileInfo[];
}

// Timezone-agnostic local date formatter (expects YYYY-MM-DD or ISO string)
export const formatLocalDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper to render evidence list in the printable view
export const renderPrintEvidence = (files?: FileInfo[], label?: string) => {
  if (!files || files.length === 0) return null;
  return (
    <div className="mt-4 border border-slate-200 rounded-3xl p-4 bg-slate-50">
      <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">{label || 'Evidencias'}</div>
      <div className="flex flex-wrap gap-3">
        {files.map((file, idx) => {
          const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
          return (
            <div key={idx} className="evidence-card" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', width: '196px', textAlign: 'center', margin: '5px' }}>
              {isImage ? (
                <img src={file.url} alt={file.name} style={{ width: '180px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <div className="evidence-doc" style={{ width: '180px', height: '120px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                  <FileText size={24} style={{ marginBottom: '4px' }} />
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name.split('.').pop()}</span>
                </div>
              )}
              <span className="evidence-label" style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', marginTop: '6px', width: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.label || file.name}>{file.label || file.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const getDefaultChecklist = (categoryName: string, type: 'visit' | 'lab'): ChecklistItem[] => {
  const isTermas = (categoryName || '').toLowerCase().includes('terma') || 
                   (categoryName || '').toLowerCase().includes('calentador') || 
                   (categoryName || '').toLowerCase().includes('rapid');
  const isCocinas = (categoryName || '').toLowerCase().includes('cocina') || 
                    (categoryName || '').toLowerCase().includes('horn') || 
                    (categoryName || '').toLowerCase().includes('campana') ||
                    (categoryName || '').toLowerCase().includes('extractor');

  if (type === 'visit') {
    if (isTermas) {
      return [
        { id: 'v1', point: 'Verificación de presión de agua en red domiciliaria', checked: false, comment: '', attachments: [] },
        { id: 'v2', point: 'Verificación de ventilación y ducto de evacuación de gases', checked: false, comment: '', attachments: [] },
        { id: 'v3', point: 'Inspección de conexiones de agua (fría/caliente) y llaves de paso', checked: false, comment: '', attachments: [] },
        { id: 'v4', point: 'Inspección de conexión de gas (flexible, regulador y fugas con detector)', checked: false, comment: '', attachments: [] },
        { id: 'v5', point: 'Verificación de voltaje en toma y conexión eléctrica a tierra', checked: false, comment: '', attachments: [] },
      ];
    }
    if (isCocinas) {
      return [
        { id: 'v1', point: 'Inspección de distancias de seguridad a muebles/paredes inflamables', checked: false, comment: '', attachments: [] },
        { id: 'v2', point: 'Inspección de manguera de gas, abrazaderas y fecha de vencimiento', checked: false, comment: '', attachments: [] },
        { id: 'v3', point: 'Verificación de estabilidad, nivelación y anclaje de la cocina', checked: false, comment: '', attachments: [] },
        { id: 'v4', point: 'Inspección visual del estado de perillas, quemadores, chisperos y tapas', checked: false, comment: '', attachments: [] },
        { id: 'v5', point: 'Verificación de encendido eléctrico y chispeo en cada quemador', checked: false, comment: '', attachments: [] },
      ];
    }
    return [
      { id: 'v1', point: 'Inspección visual general del entorno donde se instaló el producto', checked: false, comment: '', attachments: [] },
      { id: 'v2', point: 'Verificación de las condiciones indicadas en el manual y garantía', checked: false, comment: '', attachments: [] },
      { id: 'v3', point: 'Entrevista al cliente sobre las fallas y síntomas reportados', checked: false, comment: '', attachments: [] },
    ];
  } else {
    if (isTermas) {
      return [
        { id: 'l1', point: 'Prueba de hermeticidad del tanque/serpentín (fugas de agua a alta presión)', checked: false, comment: '', attachments: [] },
        { id: 'l2', point: 'Medición de voltaje/resistencia del termostato y resistencia eléctrica', checked: false, comment: '', attachments: [] },
        { id: 'l3', point: 'Verificación de la válvula de seguridad de sobrepresión', checked: false, comment: '', attachments: [] },
        { id: 'l4', point: 'Análisis de gases de combustión (Monóxido de carbono O2/CO)', checked: false, comment: '', attachments: [] },
        { id: 'l5', point: 'Prueba de funcionamiento del sensor de ionización y termocupla', checked: false, comment: '', attachments: [] },
      ];
    }
    if (isCocinas) {
      return [
        { id: 'l1', point: 'Prueba de estanqueidad de la rampa de gas (fugas internas)', checked: false, comment: '', attachments: [] },
        { id: 'l2', point: 'Verificación de inyectores calibrados según el tipo de gas (GLP/GN)', checked: false, comment: '', attachments: [] },
        { id: 'l3', point: 'Prueba del dispositivo de seguridad cortagas (termocupla y válvula)', checked: false, comment: '', attachments: [] },
        { id: 'l4', point: 'Inspección del encendido electrónico y generador de chispa integrado', checked: false, comment: '', attachments: [] },
        { id: 'l5', point: 'Verificación del aislamiento térmico en paredes y empaques del horno', checked: false, comment: '', attachments: [] },
      ];
    }
    return [
      { id: 'l1', point: 'Inspección visual externa de componentes estructurales y golpes', checked: false, comment: '', attachments: [] },
      { id: 'l2', point: 'Prueba de encendido inicial y ciclo de trabajo estándar en banco de pruebas', checked: false, comment: '', attachments: [] },
      { id: 'l3', point: 'Desensamble e inspección de partes internas críticas', checked: false, comment: '', attachments: [] },
    ];
  }
};

const getChecklist = (
  fieldValue: any, 
  type: 'visit' | 'lab', 
  categoryName: string,
  categoriesList: any[] = []
): ChecklistItem[] => {
  if (!fieldValue) {
    const categoryObj = (categoriesList || []).find(c => c.name.toUpperCase() === categoryName.toUpperCase());
    if (categoryObj && type === 'visit' && categoryObj.hiyariVisitChecklist) {
      try {
        const parsed = typeof categoryObj.hiyariVisitChecklist === 'string'
          ? JSON.parse(categoryObj.hiyariVisitChecklist)
          : categoryObj.hiyariVisitChecklist;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    if (categoryObj && type === 'lab' && categoryObj.hiyariLabChecklist) {
      try {
        const parsed = typeof categoryObj.hiyariLabChecklist === 'string'
          ? JSON.parse(categoryObj.hiyariLabChecklist)
          : categoryObj.hiyariLabChecklist;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return getDefaultChecklist(categoryName, type);
  }

  // Handle case where fieldValue is already parsed (Array of ChecklistItems)
  if (Array.isArray(fieldValue)) {
    if (fieldValue.length > 0 && typeof fieldValue[0] === 'object' && fieldValue[0] !== null && 'point' in fieldValue[0]) {
      return fieldValue as ChecklistItem[];
    }
    // If it's an array but not checklist items, convert it to a comment string to avoid React Error #31
    return [{
      id: 'legacy',
      point: type === 'visit' ? 'Informe Técnico General' : 'Pruebas Generales',
      checked: true,
      comment: JSON.stringify(fieldValue),
      attachments: []
    }];
  }

  // Handle case where fieldValue is a string
  if (typeof fieldValue === 'string') {
    try {
      const parsed = JSON.parse(fieldValue);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null && 'point' in parsed[0]) {
        return parsed;
      }
      return [{
        id: 'legacy',
        point: type === 'visit' ? 'Informe Técnico General' : 'Pruebas Generales',
        checked: true,
        comment: fieldValue,
        attachments: []
      }];
    } catch (e) {
      return [{
        id: 'legacy',
        point: type === 'visit' ? 'Informe Técnico General' : 'Pruebas Generales',
        checked: true,
        comment: fieldValue,
        attachments: []
      }];
    }
  }

  // Handle other object types (e.g. legacy non-array objects)
  return [{
    id: 'legacy',
    point: type === 'visit' ? 'Informe Técnico General' : 'Pruebas Generales',
    checked: true,
    comment: typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue),
    attachments: []
  }];
};

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

export default function HiyariHattoModule({ 
  products, 
  brands = [], 
  productLines = [], 
  categories = [],
  suppliers = []
}: HiyariHattoModuleProps) {
  const [reports, setReports] = useState<HiyariHattoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [selectedMapRegion, setSelectedMapRegion] = useState<string | null>(null);
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  
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

  // Supplier autocomplete state (for quality report section)
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Auto-detect supplier from SAP code matching products / pm records
  const detectedSupplier = useMemo(() => {
    const sap = editingReport?.sapCode?.trim();
    if (!sap || !products?.length) return null;
    const match = products.find(p => p.codigoSAP === sap);
    if (!match) return null;
    // Try to resolve supplier from the suppliers prop using supplierId
    const suppId = (match as any).supplierId;
    if (suppId && suppliers.length) {
      const sup = suppliers.find(s => s.id === suppId);
      if (sup) return sup;
    }
    // Fallback: match by name
    const supName = match.proveedor;
    if (supName && suppliers.length) {
      const sup = suppliers.find(s =>
        s.legalName?.toLowerCase() === supName.toLowerCase() ||
        s.commercialAlias?.toLowerCase() === supName.toLowerCase()
      );
      if (sup) return sup;
    }
    // Return a pseudo-supplier with just the name
    return supName ? { id: '', legalName: supName, commercialAlias: supName } as any : null;
  }, [editingReport?.sapCode, products, suppliers]);

  // Filtered suppliers for combobox
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase();
    if (!q) return suppliers.slice(0, 20);
    return suppliers.filter(s =>
      s.legalName?.toLowerCase().includes(q) ||
      s.commercialAlias?.toLowerCase().includes(q) ||
      s.erpCode?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [suppliers, supplierSearch]);

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
      if (selectedCategory !== 'all') {
        if ((r.categoryName || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      if (selectedSupplier !== 'all') {
        if ((r.supplierName || '').toLowerCase() !== selectedSupplier.toLowerCase()) return false;
      }
      return true;
    });
  }, [reports, selectedYear, selectedMonth, selectedBrand, selectedCategory, selectedSupplier, products]);

  // General Filtered Reports List
  const filteredReportsList = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = 
        r.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.sapCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.categoryName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    
    // Classify reports for metrics using the lineName field stored in the report
    // Water Heaters  → line "AGUA CALIENTE"
    // Kitchen Appliance → line "LÍNEA BLANCA"
    // Others → all remaining lines (CLIMATIZACIÓN, PURIFICACIÓN, REFRIGERACIÓN, etc.)
    let waterHeatersCount = 0;
    let kitchenApplianceCount = 0;
    let othersCount = 0;

    filteredReportsForDashboard.forEach(r => {
      // Prefer the lineName stored directly in the report; fall back to the product catalogue
      const prod = products.find(p => p.codigoSAP === r.sapCode);
      const rawLine = (r.lineName || prod?.linea || prod?.line?.name || '').toUpperCase().trim();

      if (rawLine === 'AGUA CALIENTE') {
        waterHeatersCount++;
      } else if (rawLine === 'LÍNEA BLANCA' || rawLine === 'LINEA BLANCA') {
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

  // Heatmap Geo Stats Data
  const geoStats = useMemo(() => {
    const regionMap: Record<string, { count: number; districts: Record<string, number> }> = {};
    let totalWithRegion = 0;

    filteredReportsForDashboard.forEach(r => {
      if (!r.region) return;
      const reg = r.region.toUpperCase().trim();
      const dist = (r.district || 'NO ESPECIFICADO').toUpperCase().trim();
      
      if (!regionMap[reg]) {
        regionMap[reg] = { count: 0, districts: {} };
      }
      regionMap[reg].count += 1;
      regionMap[reg].districts[dist] = (regionMap[reg].districts[dist] || 0) + 1;
      totalWithRegion += 1;
    });

    const sortedRegions = Object.entries(regionMap)
      .map(([region, data]) => {
        const sortedDistricts = Object.entries(data.districts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        return {
          region,
          count: data.count,
          percentage: totalWithRegion > 0 ? (data.count / totalWithRegion) * 100 : 0,
          districts: sortedDistricts
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      regions: sortedRegions,
      total: totalWithRegion
    };
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
        region: '',
        district: '',
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
    const suppId = (prod as any).supplierId || (prod as any).proveedor_id;
    let suppName = (prod as any).proveedor || '';
    if (suppId && suppliers?.length) {
      const found = suppliers.find(s => s.id === suppId);
      if (found) {
        suppName = found.commercialAlias || found.legalName;
      }
    } else if (suppName && suppliers?.length) {
      const found = suppliers.find(s =>
        s.legalName?.toLowerCase() === suppName.toLowerCase() ||
        s.commercialAlias?.toLowerCase() === suppName.toLowerCase()
      );
      if (found) {
        suppName = found.commercialAlias || found.legalName;
      }
    }

    setEditingReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sapCode: prod.codigoSAP,
        productName: prod.descripcionSAP,
        brandName: prod.marca || '',
        lineName: prod.linea || '',
        categoryName: prod.categoria || '',
        supplierName: suppName || '',
        supplierId: suppId || ''
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

    // Helper: wrap text into lines of maxLen chars
    const wrapText = (text: string, maxLen = 22): string[] => {
      if (!text) return [];
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        if ((current + (current ? ' ' : '') + word).length <= maxLen) {
          current += (current ? ' ' : '') + word;
        } else {
          if (current) lines.push(current);
          // If single word too long, hard-break it
          if (word.length > maxLen) {
            for (let s = 0; s < word.length; s += maxLen) lines.push(word.slice(s, s + maxLen));
            current = '';
          } else {
            current = word;
          }
        }
      }
      if (current) lines.push(current);
      return lines.slice(0, 3); // max 3 lines per factor in SVG
    };

    // Render stacked tspan lines for a factor
    const renderFactorText = (text: string, x: number, y: number, anchor: 'start' | 'middle' = 'start') => {
      const lines = wrapText(text);
      return (
        <text x={x} y={y} fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor={anchor}>
          {lines.map((line, li) => (
            <tspan key={li} x={x} dy={li === 0 ? 0 : 11}>{line}</tspan>
          ))}
        </text>
      );
    };
    
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
        {ishikawa.metodo.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 220 + i * 15, 85 + i * 35)}
            <line x1={215 + i * 15} y1={100 + i * 35} x2={255 + i * 15} y2={100 + i * 35} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Mano de Obra */}
        <line x1="380" y1="50" x2="480" y2="225" stroke="#f59e0b" strokeWidth="3" strokeDasharray="3 3" />
        <text x="380" y="40" fill="#f59e0b" fontSize="12" fontWeight="black" textAnchor="middle">MANO DE OBRA</text>
        {ishikawa.mano_obra.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 400 + i * 15, 85 + i * 35)}
            <line x1={395 + i * 15} y1={100 + i * 35} x2={435 + i * 15} y2={100 + i * 35} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Máquina / Producto */}
        <line x1="560" y1="50" x2="660" y2="225" stroke="#3b82f6" strokeWidth="3" strokeDasharray="3 3" />
        <text x="560" y="40" fill="#3b82f6" fontSize="12" fontWeight="black" textAnchor="middle">MÁQUINA/PROD</text>
        {ishikawa.maquina_producto.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 580 + i * 15, 85 + i * 35)}
            <line x1={575 + i * 15} y1={100 + i * 35} x2={615 + i * 15} y2={100 + i * 35} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Ribs (Lower half) */}
        {/* Materiales */}
        <line x1="150" y1="400" x2="250" y2="225" stroke="#10b981" strokeWidth="3" strokeDasharray="3 3" />
        <text x="150" y="415" fill="#10b981" fontSize="12" fontWeight="black" textAnchor="middle">MATERIALES</text>
        {ishikawa.materiales.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 190 + i * 15, 355 - i * 35)}
            <line x1={185 + i * 15} y1={368 - i * 35} x2={225 + i * 15} y2={368 - i * 35} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Medición */}
        <line x1="330" y1="400" x2="430" y2="225" stroke="#6366f1" strokeWidth="3" strokeDasharray="3 3" />
        <text x="330" y="415" fill="#6366f1" fontSize="12" fontWeight="black" textAnchor="middle">MEDICIÓN</text>
        {ishikawa.medicion.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 370 + i * 15, 355 - i * 35)}
            <line x1={365 + i * 15} y1={368 - i * 35} x2={405 + i * 15} y2={368 - i * 35} stroke="#475569" strokeWidth="1" />
          </g>
        ))}

        {/* Medio Ambiente */}
        <line x1="510" y1="400" x2="610" y2="225" stroke="#ec4899" strokeWidth="3" strokeDasharray="3 3" />
        <text x="510" y="415" fill="#ec4899" fontSize="12" fontWeight="black" textAnchor="middle">MEDIO AMBIENTE</text>
        {ishikawa.medio_ambiente.slice(0, 4).map((f, i) => (
          <g key={i}>
            {renderFactorText(f, 550 + i * 15, 355 - i * 35)}
            <line x1={545 + i * 15} y1={368 - i * 35} x2={585 + i * 15} y2={368 - i * 35} stroke="#475569" strokeWidth="1" />
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
                  {(brands || []).map(b => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm"
                >
                  <option value="all">Todas las categorías</option>
                  {(categories || []).map(c => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Proveedor</span>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700 text-sm max-w-[200px]"
                >
                  <option value="all">Todos los proveedores</option>
                  {Array.from(new Set(reports.map(r => r.supplierName).filter(Boolean))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
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

          {/* Geographical Heatmap Section */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 mb-6">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={18} className="text-blue-500" />
              Mapa de Calor Geográfico de Incidentes (Perú)
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Distribución de incidencias críticas reportadas a nivel nacional por región y distrito/localidad.
            </p>

            {geoStats.regions.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-slate-200/60 rounded-2xl text-slate-400 font-semibold text-xs italic">
                No hay incidentes con región y distrito registrados.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left side: Region List */}
                <div className="lg:col-span-2 space-y-3 max-h-[520px] overflow-y-auto pr-2">
                  {/* Info hint when map region selected */}
                  {selectedMapRegion && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 mb-1">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-wider">
                        Filtrando: {PERU_SVG_PATHS.find(p => p.key === selectedMapRegion)?.name || selectedMapRegion}
                      </span>
                      <button
                        onClick={() => setSelectedMapRegion(null)}
                        className="text-blue-400 hover:text-blue-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {(selectedMapRegion
                    ? geoStats.regions.filter(r => getNormalizeKey(r.region) === selectedMapRegion)
                    : geoStats.regions
                  ).map((reg) => {
                    const normKey = getNormalizeKey(reg.region);
                    const isExpanded = expandedRegion === reg.region || selectedMapRegion === normKey;
                    
                    return (
                      <div 
                        key={reg.region} 
                        className={`border rounded-2xl p-4 transition-all duration-200 ${
                          isExpanded 
                            ? 'bg-slate-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div 
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => setExpandedRegion(isExpanded ? null : reg.region)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${
                              reg.count >= 5 ? 'bg-red-50 text-red-500' :
                              reg.count >= 2 ? 'bg-amber-50 text-amber-500' :
                              'bg-blue-50 text-blue-500'
                            }`}>
                              <MapPin size={16} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-800 uppercase block">{reg.region}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {reg.districts.length} {reg.districts.length === 1 ? 'distrito' : 'distritos'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                              reg.count >= 5 ? 'bg-red-100 text-red-700' :
                              reg.count >= 2 ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {reg.count} {reg.count === 1 ? 'caso' : 'casos'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Heat Indicator */}
                        <div className="mt-3">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                reg.count >= 5 ? 'bg-red-500' :
                                reg.count >= 2 ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${reg.percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Expandable Districts List */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Desglose de Distritos</div>
                            {reg.districts.map(dist => (
                              <div key={dist.name} className="flex justify-between items-center text-xs font-bold text-slate-600 pl-2">
                                <span className="uppercase text-slate-700 font-semibold">• {dist.name}</span>
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">
                                  {dist.count} {dist.count === 1 ? 'caso' : 'casos'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right side: Real Peru SVG Map */}
                <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden shadow-inner">
                  {/* Header */}
                  <div className="w-full flex items-center justify-between mb-2 z-10">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <Globe size={12} className="text-blue-400" />
                      Mapa Nacional — Haz clic en una región
                    </div>
                    {selectedMapRegion && (
                      <button
                        onClick={() => setSelectedMapRegion(null)}
                        className="text-slate-500 hover:text-slate-200 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                      >
                        <X size={11} /> Limpiar filtro
                      </button>
                    )}
                  </div>

                  {/* Real Peru Leaflet Map */}
                  <div className="w-full flex-1 min-h-[440px] rounded-2xl overflow-hidden relative z-0 mt-2">
                    <MapContainer
                      center={[-9.19, -75.0152]}
                      zoom={5}
                      zoomControl={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      <MapController selectedRegion={selectedMapRegion} />
                      
                      {geoStats.regions.map(reg => {
                        const normKey = getNormalizeKey(reg.region);
                        const coords = REGION_COORDINATES[normKey];
                        if (!coords) return null;
                        
                        const isSelected = selectedMapRegion === normKey;
                        const count = reg.count;
                        
                        // Color logic
                        const color = count >= 5 ? '#ef4444' : count >= 2 ? '#f59e0b' : '#3b82f6';
                        const fillColor = count >= 5 ? '#ef4444' : count >= 2 ? '#f59e0b' : '#3b82f6';
                        const radius = count >= 5 ? 16 : count >= 2 ? 12 : 8;
                        
                        return (
                          <CircleMarker
                            key={normKey}
                            center={[coords.lat, coords.lng]}
                            radius={radius}
                            fillColor={fillColor}
                            color={isSelected ? '#ffffff' : color}
                            weight={isSelected ? 3 : 1.5}
                            fillOpacity={0.65}
                            eventHandlers={{
                              click: () => {
                                setSelectedMapRegion(prev => prev === normKey ? null : normKey);
                              }
                            }}
                          >
                            <LeafletTooltip direction="top" offset={[0, -5]} opacity={0.95}>
                              <div className="p-2 font-sans bg-slate-950 text-white rounded-xl shadow-lg border border-slate-800 text-left min-w-[150px]">
                                <h4 className="text-xs font-black uppercase text-blue-400 tracking-wider mb-1">
                                  {reg.region}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-200 uppercase mb-2">
                                  {count} {count === 1 ? 'incidente' : 'incidentes'}
                                </p>
                                <div className="border-t border-slate-800 my-1 pt-1">
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Desglose de Distritos</div>
                                  <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                                    {reg.districts.map(dist => (
                                      <div key={dist.name} className="flex justify-between items-center text-[10px] text-slate-300 font-semibold">
                                        <span className="uppercase">• {dist.name}</span>
                                        <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-400">
                                          {dist.count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </LeafletTooltip>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mt-3 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
                      <span>Alto (&ge;5)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                      <span>Moderado (2-4)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" />
                      <span>Bajo (1)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                  {(() => {
                    const rows = filteredReportsForDashboard.flatMap(r => 
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
                                {formatLocalDate(action.maxDate)}
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
                    );
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                            Sin planes de acción registrados en este periodo
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })()}
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
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">TICKET</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">PRODUCTO</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">CÓDIGO SAP</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">CATEGORÍA</th>
                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">PROVEEDOR</th>
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
                      <td colSpan={10} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
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
                        <td className="px-6 py-5 text-sm font-semibold text-slate-600">{report.categoryName || '-'}</td>
                        <td className="px-6 py-5 text-sm font-semibold text-slate-600">{report.supplierName || '-'}</td>
                        <td className="px-6 py-5 font-mono text-xs font-bold text-slate-600">
                          {formatLocalDate(report.incidentDate)}
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
                { step: 2, name: '2. Protocolo Visita de Calidad' },
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
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Número de Ticket *</label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Marca *</label>
                      <select
                        value={editingReport.brandName || ''}
                        onChange={(e) => updateField('brandName', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      >
                        <option value="">Selecciona marca...</option>
                        {brands.map(b => (
                          <option key={b.id || b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Línea *</label>
                      <select
                        value={editingReport.lineName || ''}
                        onChange={(e) => updateField('lineName', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      >
                        <option value="">Selecciona línea...</option>
                        {productLines.map(l => (
                          <option key={l.id || l.name} value={l.name}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría *</label>
                      <select
                        value={editingReport.categoryName || ''}
                        onChange={(e) => updateField('categoryName', e.target.value)}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      >
                        <option value="">Selecciona categoría...</option>
                        {categories
                          .filter(c => {
                            if (!editingReport.lineName) return true;
                            const selectedLine = productLines.find(l => l.name === editingReport.lineName);
                            return !selectedLine || c.productLineId === selectedLine.id;
                          })
                          .map(c => (
                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Proveedor / Fabricante</label>
                      <SearchableSelect
                        options={suppliers.map(s => ({ value: s.id, label: s.commercialAlias || s.legalName }))}
                        value={editingReport.supplierId || ''}
                        onChange={(val) => {
                          const found = suppliers.find(s => s.id === val);
                          updateField('supplierId', val);
                          updateField('supplierName', found ? (found.commercialAlias || found.legalName) : '');
                        }}
                        placeholder="Buscar proveedor..."
                        inputClassName="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
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

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex flex-col md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Cliente</label>
                      <input
                        type="text"
                        value={editingReport.customerName || ''}
                        onChange={(e) => updateField('customerName', e.target.value)}
                        placeholder="Ej. Mirtha Soledad Uribe"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">DNI del Cliente</label>
                      <input
                        type="text"
                        value={editingReport.customerDni || ''}
                        onChange={(e) => updateField('customerDni', e.target.value)}
                        placeholder="DNI (8 dígitos)"
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Región */}
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Región del Evento</label>
                      <select
                        value={editingReport.region || ''}
                        onChange={(e) => {
                          updateField('region', e.target.value);
                          updateField('district', '');
                        }}
                        className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm bg-white"
                      >
                        <option value="">Seleccione región...</option>
                        {REGIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    {/* Distrito — se filtra según la región seleccionada */}
                    <div className="flex flex-col">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Distrito / Localidad
                        {editingReport.region && (
                          <span className="ml-2 normal-case text-blue-400 font-semibold">— {editingReport.region}</span>
                        )}
                      </label>
                      {editingReport.region ? (
                        <select
                          value={editingReport.district || ''}
                          onChange={(e) => updateField('district', e.target.value)}
                          className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm bg-white"
                        >
                          <option value="">Seleccione distrito...</option>
                          {(PERU_DISTRICTS[getNormalizeKey(editingReport.region)] || []).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-400 text-sm font-medium italic">
                          Primero seleccione una región
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 border-2 border-dashed border-slate-200 p-6 rounded-3xl bg-slate-50/30">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Personas Involucradas / Afectadas (Con DNI)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const list = editingReport.affectedPeople || [];
                          updateField('affectedPeople', [...list, { name: '', dni: '' }]);
                        }}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                      >
                        <Plus size={14} />
                        Agregar Persona
                      </button>
                    </div>

                    {(!editingReport.affectedPeople || editingReport.affectedPeople.length === 0) ? (
                      <div className="text-xs text-slate-400 font-semibold italic text-center py-4 bg-white border border-slate-200 rounded-2xl">
                        Ninguna persona registrada como afectada o involucrada. Haz clic en "Agregar Persona" para añadir.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editingReport.affectedPeople.map((person, idx) => (
                          <div key={idx} className="flex gap-4 items-center bg-white p-3 border border-slate-200 rounded-2xl animate-in fade-in duration-200">
                            <div className="flex-1 flex flex-col md:flex-row gap-4">
                              <input
                                type="text"
                                value={person.name}
                                onChange={(e) => {
                                  const list = [...(editingReport.affectedPeople || [])];
                                  list[idx].name = e.target.value;
                                  updateField('affectedPeople', list);
                                }}
                                placeholder="Nombre completo"
                                className="flex-1 px-3 py-2 border border-slate-250 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-500"
                              />
                              <input
                                type="text"
                                value={person.dni}
                                onChange={(e) => {
                                  const list = [...(editingReport.affectedPeople || [])];
                                  list[idx].dni = e.target.value;
                                  updateField('affectedPeople', list);
                                }}
                                placeholder="DNI"
                                className="w-40 px-3 py-2 border border-slate-250 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...(editingReport.affectedPeople || [])];
                                updateField('affectedPeople', list.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-slate-450 hover:text-red-650 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                      <span>Protocolo de Inspección Técnica (Checklist por Categoría)</span>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg">
                        Formato: {editingReport.categoryName || 'General'}
                      </span>
                    </label>
                    <div className="space-y-4">
                      {getChecklist(editingReport.visitTechnicalReport, 'visit', editingReport.categoryName || '', categories).map((item, idx) => (
                        <div key={item.id || idx} className="p-5 border-2 border-slate-100 rounded-3xl bg-white shadow-sm space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => {
                                const list = getChecklist(editingReport.visitTechnicalReport, 'visit', editingReport.categoryName || '', categories);
                                list[idx].checked = e.target.checked;
                                updateField('visitTechnicalReport', JSON.stringify(list));
                              }}
                              className="mt-1 w-5 h-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-bold text-slate-800 flex-1">{item.point}</span>
                          </div>

                          <div className="flex flex-col md:flex-row gap-4 pl-8 items-center">
                            <input
                              type="text"
                              value={item.comment || ''}
                              onChange={(e) => {
                                const list = getChecklist(editingReport.visitTechnicalReport, 'visit', editingReport.categoryName || '', categories);
                                list[idx].comment = e.target.value;
                                updateField('visitTechnicalReport', JSON.stringify(list));
                              }}
                              placeholder="Observaciones o comentarios sobre este punto..."
                              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-xs font-bold text-slate-800 focus:border-blue-500"
                            />
                            
                            <div className="flex items-center gap-2">
                              {item.attachments && item.attachments.map((file, fIdx) => {
                                const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                return (
                                  <div key={fIdx} className="relative group w-14 h-14 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm">
                                    {file.url && isImg ? (
                                      <img src={file.url} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="flex flex-col items-center p-1 text-center">
                                        <FileText size={16} className="text-slate-400" />
                                        <span className="text-[7px] truncate w-10 font-bold uppercase">{file.name.split('.').pop()}</span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = getChecklist(editingReport.visitTechnicalReport, 'visit', editingReport.categoryName || '', categories);
                                        list[idx].attachments = list[idx].attachments.filter((_, i) => i !== fIdx);
                                        updateField('visitTechnicalReport', JSON.stringify(list));
                                      }}
                                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={async () => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*,application/pdf';
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      toast.loading('Subiendo evidencia...', { id: 'upload-check-visit' });
                                      const uploaded = await SupabaseService.uploadFile('rd-files', `hiyari_hatto_checklists/${Date.now()}_${file.name}`, file);
                                      toast.success('Evidencia subida', { id: 'upload-check-visit' });
                                      
                                      const list = getChecklist(editingReport.visitTechnicalReport, 'visit', editingReport.categoryName || '', categories);
                                      list[idx].attachments = [...(list[idx].attachments || []), { name: file.name, url: uploaded.publicUrl, type: file.type }];
                                      updateField('visitTechnicalReport', JSON.stringify(list));
                                    } catch (err) {
                                      toast.error('Error al subir archivo', { id: 'upload-check-visit' });
                                    }
                                  };
                                  input.click();
                                }}
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                              >
                                <Paperclip size={14} />
                                Evidencia
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {renderAttachmentsSection('visitAttachments', 'Evidencias del Protocolo de Visita de Calidad / Recepción')}
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

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                      <span>Pruebas Realizadas en el Laboratorio (Checklist por Categoría)</span>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg">
                        Formato: {editingReport.categoryName || 'General'}
                      </span>
                    </label>
                    <div className="space-y-4">
                      {getChecklist(editingReport.qualityReportTests, 'lab', editingReport.categoryName || '', categories).map((item, idx) => (
                        <div key={item.id || idx} className="p-5 border-2 border-slate-100 rounded-3xl bg-white shadow-sm space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(e) => {
                                const list = getChecklist(editingReport.qualityReportTests, 'lab', editingReport.categoryName || '', categories);
                                list[idx].checked = e.target.checked;
                                updateField('qualityReportTests', JSON.stringify(list));
                              }}
                              className="mt-1 w-5 h-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-bold text-slate-800 flex-1">{item.point}</span>
                          </div>

                          <div className="flex flex-col md:flex-row gap-4 pl-8 items-center">
                            <input
                              type="text"
                              value={item.comment || ''}
                              onChange={(e) => {
                                const list = getChecklist(editingReport.qualityReportTests, 'lab', editingReport.categoryName || '', categories);
                                list[idx].comment = e.target.value;
                                updateField('qualityReportTests', JSON.stringify(list));
                              }}
                              placeholder="Observaciones o comentarios sobre este punto..."
                              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-2xl outline-none text-xs font-bold text-slate-800 focus:border-blue-500"
                            />
                            
                            <div className="flex items-center gap-2">
                              {item.attachments && item.attachments.map((file, fIdx) => {
                                const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                return (
                                  <div key={fIdx} className="relative group w-14 h-14 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm">
                                    {file.url && isImg ? (
                                      <img src={file.url} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="flex flex-col items-center p-1 text-center">
                                        <FileText size={16} className="text-slate-400" />
                                        <span className="text-[7px] truncate w-10 font-bold uppercase">{file.name.split('.').pop()}</span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const list = getChecklist(editingReport.qualityReportTests, 'lab', editingReport.categoryName || '', categories);
                                        list[idx].attachments = list[idx].attachments.filter((_, i) => i !== fIdx);
                                        updateField('qualityReportTests', JSON.stringify(list));
                                      }}
                                      className="absolute inset-0 bg-red-650/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={async () => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*,application/pdf';
                                  input.onchange = async (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      toast.loading('Subiendo evidencia...', { id: 'upload-check-lab' });
                                      const uploaded = await SupabaseService.uploadFile('rd-files', `hiyari_hatto_checklists/${Date.now()}_${file.name}`, file);
                                      toast.success('Evidencia subida', { id: 'upload-check-lab' });
                                      
                                      const list = getChecklist(editingReport.qualityReportTests, 'lab', editingReport.categoryName || '', categories);
                                      list[idx].attachments = [...(list[idx].attachments || []), { name: file.name, url: uploaded.publicUrl, type: file.type }];
                                      updateField('qualityReportTests', JSON.stringify(list));
                                    } catch (err) {
                                      toast.error('Error al subir archivo', { id: 'upload-check-lab' });
                                    }
                                  };
                                  input.click();
                                }}
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
                              >
                                <Paperclip size={14} />
                                Evidencia
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  {/* ── COMUNICACIÓN CON EL PROVEEDOR ────────────────── */}
                  <div className="pt-5 border-t border-slate-100">
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <AlertTriangle size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">¿Aplica Comunicación con el Proveedor?</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Marcar si se debe notificar al fabricante / proveedor del producto</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateField('supplierCommunication', !editingReport.supplierCommunication)}
                          className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${editingReport.supplierCommunication ? 'bg-amber-500' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${editingReport.supplierCommunication ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {editingReport.supplierCommunication && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proveedor</label>

                          {detectedSupplier && !editingReport.supplierName ? (
                            <div className="flex items-center gap-3 bg-white border border-amber-300 rounded-2xl px-4 py-3">
                              <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{detectedSupplier.commercialAlias || detectedSupplier.legalName}</p>
                                {detectedSupplier.commercialAlias && detectedSupplier.legalName !== detectedSupplier.commercialAlias && (
                                  <p className="text-[10px] text-slate-500 truncate">{detectedSupplier.legalName}</p>
                                )}
                              </div>
                              <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-lg uppercase tracking-wider whitespace-nowrap">Detectado por SAP</span>
                              <button type="button" title="Cambiar proveedor" onClick={() => { setSupplierSearch(''); setShowSupplierDropdown(true); updateField('supplierName', ' '); }} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                                <Edit size={13} />
                              </button>
                            </div>
                          ) : editingReport.supplierName && editingReport.supplierName.trim() ? (
                            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
                              <User size={16} className="text-slate-400 flex-shrink-0" />
                              <span className="flex-1 text-sm font-bold text-slate-800">{editingReport.supplierName.trim()}</span>
                              <button type="button" onClick={() => { updateField('supplierName', ''); updateField('supplierId', ''); setSupplierSearch(''); }} className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"><X size={13} /></button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="flex items-center gap-2 bg-white border border-slate-200 focus-within:border-amber-400 rounded-2xl px-4 py-3 transition-colors">
                                <Search size={14} className="text-slate-400 flex-shrink-0" />
                                <input
                                  type="text"
                                  value={supplierSearch}
                                  onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                                  onFocus={() => setShowSupplierDropdown(true)}
                                  onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                  placeholder="Buscar proveedor por nombre o código..."
                                  className="flex-1 outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent"
                                />
                                {supplierSearch && <button type="button" onClick={() => { setSupplierSearch(''); setShowSupplierDropdown(false); }} className="text-slate-400 hover:text-slate-600"><X size={13} /></button>}
                              </div>
                              {showSupplierDropdown && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                  {filteredSuppliers.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-slate-500 text-center">No se encontraron proveedores.</div>
                                  ) : (
                                    filteredSuppliers.map(sup => (
                                      <button key={sup.id} type="button" onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => { updateField('supplierName', sup.commercialAlias || sup.legalName); updateField('supplierId', sup.id); setSupplierSearch(''); setShowSupplierDropdown(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-slate-50 last:border-0">
                                        <p className="text-sm font-bold text-slate-900">{sup.commercialAlias || sup.legalName}</p>
                                        {sup.commercialAlias && sup.legalName !== sup.commercialAlias && <p className="text-[10px] text-slate-500">{sup.legalName}</p>}
                                      </button>
                                    ))
                                  )}
                                  {supplierSearch && !filteredSuppliers.some(s => (s.commercialAlias || s.legalName)?.toLowerCase() === supplierSearch.toLowerCase()) && (
                                    <button type="button" onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => { updateField('supplierName', supplierSearch); updateField('supplierId', ''); setSupplierSearch(''); setShowSupplierDropdown(false); }}
                                      className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                                      <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Usar: "{supplierSearch}"</p>
                                      <p className="text-[10px] text-slate-500">No encontrado en maestro – se guardará como texto libre</p>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                      <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 w-full md:w-auto">
                        <select
                          value={ishikawaTargetCategory}
                          onChange={(e) => setIshikawaTargetCategory(e.target.value as any)}
                          className="px-3 py-2 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-700 bg-white self-start"
                        >
                          <option value="metodo">Método</option>
                          <option value="mano_obra">Mano de Obra (Instalación)</option>
                          <option value="maquina_producto">Máquina/Producto</option>
                          <option value="materiales">Materiales</option>
                          <option value="medicion">Medición</option>
                          <option value="medio_ambiente">Medio Ambiente</option>
                        </select>
                        <textarea
                          value={newIshikawaFactor}
                          onChange={(e) => setNewIshikawaFactor(e.target.value)}
                          placeholder="Describe el factor (sin límite de texto)..."
                          rows={2}
                          className="px-3 py-2 flex-1 min-w-[220px] rounded-xl border border-slate-200 outline-none text-xs bg-white font-semibold resize-none focus:border-blue-400"
                        />
                        <button
                          onClick={addIshikawaFactor}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all self-start whitespace-nowrap"
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
                                      <div key={idx} className="flex items-start justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 text-xs gap-2">
                                        <span className="font-medium text-slate-700 break-words whitespace-pre-wrap flex-1">{item}</span>
                                        <button 
                                          onClick={() => removeIshikawaFactor(cat.key as keyof IshikawaData, idx)}
                                          className="text-slate-400 hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
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
                        `);
                        
                        // Copy all styles from the main page to the print window
                        const headStyles = document.querySelectorAll('link[rel="stylesheet"], style');
                        headStyles.forEach(style => {
                          printWindow.document.write(style.outerHTML);
                        });

                        printWindow.document.write(`
                              <style>
                                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                                body { font-family: sans-serif; padding: 30px; color: #1e293b; background: #ffffff !important; }
                                svg { max-width: 100%; height: auto; display: block; margin: 15px auto; }
                                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                                th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; }
                                th { background: #f8fafc; font-weight: bold; text-align: left; }
                                .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; background: #e2e8f0; }
                                
                                /* Custom Checklist and Evidence Annex Print Layout Styles */
                                .evidence-card { display: inline-flex !important; flex-direction: column !important; align-items: center !important; background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important; padding: 8px !important; width: 196px !important; text-align: center !important; margin: 5px !important; page-break-inside: avoid; }
                                .evidence-card img { width: 180px !important; height: 120px !important; object-fit: cover !important; border-radius: 8px !important; }
                                .evidence-doc { width: 180px !important; height: 120px !important; background: #f1f5f9 !important; border-radius: 8px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; color: #3b82f6 !important; }
                                .evidence-label { font-size: 10px !important; font-weight: bold !important; color: #475569 !important; margin-top: 6px !important; width: 180px !important; display: block !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
                                
                                @media print {
                                  body { padding: 0 !important; margin: 0 !important; }
                                  #printable-area { padding: 0 !important; }
                                  .section { page-break-inside: avoid; }
                                }
                              </style>
                            </head>
                            <body>
                              <div id="printable-area">
                                ${printable.innerHTML}
                              </div>
                              <script>
                                window.onload = function() {
                                  setTimeout(function() {
                                    window.print();
                                    window.close();
                                  }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
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
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Nombre del Cliente / DNI / Dirección</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {printingReport.customerName} {printingReport.customerDni ? `(DNI: ${printingReport.customerDni})` : ''} - {printingReport.customerAddress}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha Incidente / ATC Reporte</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {formatLocalDate(printingReport.incidentDate)} / {formatLocalDate(printingReport.reportDate)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Daños Reportados</div>
                    <div className="flex gap-2 mt-1">
                      {printingReport.hasProductDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño de Producto</span>}
                      {printingReport.hasHomeDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño Domicilio</span>}
                      {printingReport.hasClientDamage && <span className="bg-slate-100 px-2 py-0.5 text-xs font-bold rounded">Daño al Cliente</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Personas Involucradas / Afectadas</div>
                    <div className="font-semibold mt-1 text-slate-700 leading-relaxed">
                      {(!printingReport.affectedPeople || printingReport.affectedPeople.length === 0) ? (
                        <span>Ninguna persona reportada</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {printingReport.affectedPeople.map((p, idx) => (
                            <div key={idx} className="font-bold">• {p.name} {p.dni ? `(DNI: ${p.dni})` : ''}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Descripción del Accidente</div>
                  <div className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{printingReport.incidentDescription || '-'}</div>
                </div>
                {renderPrintEvidence(printingReport.flashAttachments, 'Evidencias de Flash Report')}
              </div>

              {/* Step 2 data */}
              <div className="section mb-6">
                <div className="section-title bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg border-l-4 border-blue-500 mb-4">
                  2. Protocolo Visita de Calidad
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha de Visita al Domicilio</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {formatLocalDate(printingReport.visitDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Fecha Recepción en MTI (Falla)</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {formatLocalDate(printingReport.receivedDate)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Informe Técnico de la Visita</div>
                  {(() => {
                    const check = getChecklist(printingReport.visitTechnicalReport, 'visit', printingReport.categoryName || '', categories);
                    if (check.length === 1 && check[0].id === 'legacy') {
                      return <div className="text-sm font-semibold text-slate-700 leading-relaxed">{check[0].comment || '-'}</div>;
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {check.map((item) => (
                          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', color: item.checked ? '#065f46' : '#991b1b', backgroundColor: item.checked ? '#d1fae5' : '#fee2e2' }}>
                                {item.checked ? 'OK' : 'NO REALIZADO'}
                              </span>
                              <span style={{ color: '#1e293b' }}>{item.point}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '6px', alignItems: 'flex-start' }}>
                              {item.comment && (
                                <div style={{ flex: 1, fontSize: '11px', fontWeight: '600', color: '#475569', paddingLeft: '12px', borderLeft: '2px solid #cbd5e1' }}>
                                  <strong>Comentario:</strong> {item.comment}
                                </div>
                              )}
                              {item.attachments && item.attachments.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                                  {item.attachments.map((file, fIdx) => {
                                    const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                    if (isImg) {
                                      return (
                                        <img key={fIdx} src={file.url} alt={file.name} style={{ width: '90px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                      );
                                    }
                                    return (
                                      <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#2563eb', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                        <Paperclip size={10} />
                                        <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {renderPrintEvidence(printingReport.visitAttachments, 'Evidencias de Protocolo Visita de Calidad / Recepción')}
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
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Comunicación con Proveedor</div>
                    <div className="font-bold mt-0.5 text-slate-800">
                      {printingReport.supplierCommunication ? (
                        <span className="text-amber-600 font-bold">APLICA NOTIFICACIÓN</span>
                      ) : (
                        <span className="text-slate-500 font-medium">No aplica</span>
                      )}
                    </div>
                  </div>
                  {printingReport.supplierCommunication && (
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Proveedor / Fabricante</div>
                      <div className="font-bold mt-0.5 text-slate-800">
                        {printingReport.supplierName || 'No especificado'} {printingReport.supplierId ? `(ID: ${printingReport.supplierId})` : ''}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">Pruebas en Laboratorio</div>
                  {(() => {
                    const check = getChecklist(printingReport.qualityReportTests, 'lab', printingReport.categoryName || '', categories);
                    if (check.length === 1 && check[0].id === 'legacy') {
                      return <div className="text-sm font-semibold text-slate-700 leading-relaxed">{check[0].comment || '-'}</div>;
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {check.map((item) => (
                          <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '900', color: item.checked ? '#065f46' : '#991b1b', backgroundColor: item.checked ? '#d1fae5' : '#fee2e2' }}>
                                {item.checked ? 'OK' : 'NO REALIZADO'}
                              </span>
                              <span style={{ color: '#1e293b' }}>{item.point}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '6px', alignItems: 'flex-start' }}>
                              {item.comment && (
                                <div style={{ flex: 1, fontSize: '11px', fontWeight: '600', color: '#475569', paddingLeft: '12px', borderLeft: '2px solid #cbd5e1' }}>
                                  <strong>Comentario:</strong> {item.comment}
                                </div>
                              )}
                              {item.attachments && item.attachments.length > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                                  {item.attachments.map((file, fIdx) => {
                                    const isImg = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                    if (isImg) {
                                      return (
                                        <img key={fIdx} src={file.url} alt={file.name} style={{ width: '90px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                      );
                                    }
                                    return (
                                      <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#2563eb', fontWeight: 'bold', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                                        <Paperclip size={10} />
                                        <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {renderPrintEvidence(printingReport.qualityAttachments, 'Evidencias de Informe de Calidad')}
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
                {renderPrintEvidence(printingReport.rootCauseAttachments, 'Evidencias de Causa Raíz / Ishikawa')}
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
                          {formatLocalDate(action.maxDate)}
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
