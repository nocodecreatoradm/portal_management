import React, { useState, useMemo, useEffect } from 'react';
import { EnergyEfficiencyRecord, SampleRecord, FileInfo, EnergyEfficiencyDocument, ProductLine, Category } from '../types';
import { 
  Search, Plus, Filter, Download, Calendar, 
  FileText, Upload, Trash2, Edit2, X, Check,
  Zap, Eye, Link as LinkIcon, Image as ImageIcon, Tag,
  History as HistoryIcon, User, Clock, ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { Loader2 } from 'lucide-react';
import HeaderFilterPopover from './HeaderFilterPopover';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';


interface EnergyEfficiencyProps {
  onExportPPT?: () => void;
}

export default function EnergyEfficiency({ 
  onExportPPT 
}: EnergyEfficiencyProps) {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<EnergyEfficiencyRecord[]>([]);
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    codigoMT: '',
    descripcion: '',
    letra: '',
    porcentajeEE: '',
    proveedor: '',
    ocp: '',
    fechaVigilancia: '',
    linea: ''
  });
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({
    column: '',
    direction: null
  });

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EnergyEfficiencyRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<EnergyEfficiencyRecord | null>(null);
  const [viewingHistory, setViewingHistory] = useState<{
    title: string;
    history: EnergyEfficiencyDocument[];
  } | null>(null);
  const [isGalleryUploadModalOpen, setIsGalleryUploadModalOpen] = useState(false);
  const [tempGalleryPhotos, setTempGalleryPhotos] = useState<FileInfo[]>([]);
  const [galleryCategory, setGalleryCategory] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    id: string; 
    type: 'record' | 'category'; 
    title: string;
    onConfirm: () => void;
  } | null>(null);
  const [showLabelGenerator, setShowLabelGenerator] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsData, samplesData, suppliersData, linesData, categoriesData] = await Promise.all([
        SupabaseService.getEnergyEfficiencyRecords(),
        SupabaseService.getSamples(),
        SupabaseService.getSuppliers(),
        SupabaseService.getProductLines(),
        SupabaseService.getCategories()
      ]);
      setRecords(recordsData);
      setSamples(samplesData);
      setSuppliers(suppliersData);
      setProductLines(linesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading EE data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (record: Omit<EnergyEfficiencyRecord, 'id' | 'createdAt'>) => {
    try {
      const result = await SupabaseService.createEERecord(record);
      setRecords(prev => [result, ...prev]);
      toast.success('Registro creado');
    } catch (error) {
      console.error('Error adding EE record:', error);
      toast.error('Error al crear registro');
    }
  };

  const handleUpdateRecord = async (updatedRecord: EnergyEfficiencyRecord) => {
    try {
      const isUUIDVal = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedRecord.id);
      let result;
      if (isUUIDVal) {
        result = await SupabaseService.updateEERecord(updatedRecord.id, updatedRecord);
      } else {
        const { id, createdAt, ...recordWithoutId } = updatedRecord;
        result = await SupabaseService.createEERecord(recordWithoutId);
      }
      if (result) {
        setRecords(prev => prev.map(r => r.id === updatedRecord.id ? result! : r));
        toast.success('Registro actualizado');
      }
    } catch (error) {
      console.error('Error updating EE record:', error);
      toast.error('Error al actualizar registro');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await SupabaseService.deleteEERecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Registro eliminado');
    } catch (error) {
      console.error('Error deleting EE record:', error);
      toast.error('Error al eliminar registro');
    }
  };

  const handleGalleryPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      toast.loading('Subiendo fotos...');
      try {
        const uploadedPhotos: FileInfo[] = [];
        for (const f of Array.from(files) as File[]) {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `ee/gallery/${Date.now()}_${f.name}`, f) as any;
          uploadedPhotos.push({
            name: f.name,
            url: fileInfo.url,
            type: f.type,
            originalName: f.name
          });
        }
        setTempGalleryPhotos(prev => [...prev, ...uploadedPhotos]);
        toast.dismiss();
      } catch (err) {
        toast.dismiss();
        toast.error('Error al subir fotos');
      }
    }
  };

  const handleConfirmGalleryUpload = () => {
    if (!galleryCategory || tempGalleryPhotos.length === 0) {
      toast.error('Por favor seleccione una categoría y al menos una foto');
      return;
    }

    const newGalleryItem = {
      id: `GAL-${Date.now()}`,
      category: galleryCategory,
      photos: tempGalleryPhotos,
      uploadDate: new Date().toISOString()
    };

    if (viewingRecord) {
      // We are in the Detail View
      const existingCategory = (viewingRecord.gallery || []).find(g => g.category === galleryCategory);
      let updatedRecord;
      
      if (existingCategory) {
        updatedRecord = {
          ...viewingRecord,
          gallery: (viewingRecord.gallery || []).map(g => 
            g.category === galleryCategory 
              ? { ...g, photos: [...g.photos, ...tempGalleryPhotos] }
              : g
          )
        };
      } else {
        updatedRecord = {
          ...viewingRecord,
          gallery: [...(viewingRecord.gallery || []), newGalleryItem]
        };
      }

      handleUpdateRecord(updatedRecord);
      setViewingRecord(updatedRecord);
      toast.success('Fotos añadidas a la galería');
    }

    setIsGalleryUploadModalOpen(false);
    setTempGalleryPhotos([]);
    setGalleryCategory('');
  };

  const DocumentHistoryModal = ({ 
    title, 
    history, 
    onClose 
  }: { 
    title: string, 
    history: EnergyEfficiencyDocument[], 
    onClose: () => void 
  }) => {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Historial de Versiones</h4>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
            {history.length > 0 ? (
              history.map((version, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-tight">Versión {version.version}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {format(new Date(version.uploadDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate mb-1">{version.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                      <User size={10} />
                      <span>{version.uploadedBy}</span>
                    </div>
                    {version.changeDescription && (
                      <p className="mt-2 text-[10px] text-slate-400 italic">"{version.changeDescription}"</p>
                    )}
                  </div>
                  <a 
                    href={version.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all self-center"
                  >
                    <Download size={18} />
                  </a>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto text-slate-300 mb-2 opacity-20" />
                <p className="text-[10px] font-black text-slate-400 uppercase">No hay versiones anteriores</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.codigoMT?.toLowerCase().includes(lowerSearch) ||
        r.descripcion?.toLowerCase().includes(lowerSearch) ||
        r.proveedor?.toLowerCase().includes(lowerSearch)
      );
    }

    Object.keys(columnFilters).forEach(col => {
      const filterVal = columnFilters[col]?.toLowerCase();
      if (filterVal) {
        result = result.filter(r => {
          if (col === 'codigoMT') {
            return r.codigoMT?.toLowerCase().includes(filterVal) || r.descripcion?.toLowerCase().includes(filterVal);
          }
          if (col === 'letra') {
            return r.letra?.toLowerCase().includes(filterVal) || r.porcentajeEE?.toLowerCase().includes(filterVal);
          }
          if (col === 'proveedor') {
            return r.proveedor?.toLowerCase().includes(filterVal) || r.ocp?.toLowerCase().includes(filterVal);
          }
          if (col === 'fechaVigilancia') {
            return r.fechaVigilancia?.toLowerCase().includes(filterVal);
          }
          if (col === 'linea') {
            const lineName = productLines.find(l => l.id === r.lineId || l.name === r.linea)?.name || r.linea || '';
            const catName = categories.find(c => c.id === r.categoryId || c.name.toLowerCase() === r.categoria?.toLowerCase())?.name || r.categoria || '';
            return lineName.toLowerCase().includes(filterVal) || catName.toLowerCase().includes(filterVal);
          }
          return false;
        });
      }
    });

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = '';
        let valB = '';
        if (sortConfig.column === 'codigoMT') {
          valA = a.codigoMT || '';
          valB = b.codigoMT || '';
        } else if (sortConfig.column === 'letra') {
          valA = a.letra || '';
          valB = b.letra || '';
        } else if (sortConfig.column === 'proveedor') {
          valA = a.proveedor || '';
          valB = b.proveedor || '';
        } else if (sortConfig.column === 'fechaVigilancia') {
          valA = a.fechaVigilancia || '';
          valB = b.fechaVigilancia || '';
        } else if (sortConfig.column === 'linea') {
          valA = productLines.find(l => l.id === a.lineId || l.name === a.linea)?.name || a.linea || '';
          valB = productLines.find(l => l.id === b.lineId || l.name === b.linea)?.name || b.linea || '';
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [records, searchTerm, columnFilters, sortConfig, productLines, categories]);

  const RecordForm = ({ 
    record, 
    onSubmit, 
    onCancel, 
    title 
  }: { 
    record?: EnergyEfficiencyRecord, 
    onSubmit: (data: any) => void, 
    onCancel: () => void, 
    title: string 
  }) => {
    const [certificado, setCertificado] = useState<FileInfo | undefined>(record?.certificadoFile);
    const [etiqueta, setEtiqueta] = useState<FileInfo | undefined>(record?.etiquetaFile);
    const [testReport, setTestReport] = useState<FileInfo | undefined>(record?.testReportFile);
    const [certificadoHistory, setCertificadoHistory] = useState<EnergyEfficiencyDocument[]>(record?.certificadoHistory || []);
    const [etiquetaHistory, setEtiquetaHistory] = useState<EnergyEfficiencyDocument[]>(record?.etiquetaHistory || []);
    const [testReportHistory, setTestReportHistory] = useState<EnergyEfficiencyDocument[]>(record?.testReportHistory || []);
    const [gallery, setGallery] = useState<any[]>(record?.gallery || []);

    const [selectedLine, setSelectedLine] = useState<string>(() => {
      if (record?.lineId) return record.lineId;
      if (record?.linea) {
        const lineObj = productLines.find(l => l.name.toLowerCase() === record.linea?.toLowerCase());
        if (lineObj) return lineObj.id;
      }
      return '';
    });

    const [selectedCategory, setSelectedCategory] = useState<string>(() => {
      if (record?.categoryId) return record.categoryId;
      if (record?.categoria) {
        const catObj = categories.find(c => c.name.toLowerCase() === record.categoria?.toLowerCase());
        if (catObj) return catObj.id;
      }
      return '';
    });

    const filteredCategories = useMemo(() => {
      if (!selectedLine) return [];
      return categories.filter(c => c.productLineId === selectedLine);
    }, [selectedLine, categories]);

    useEffect(() => {
      if (selectedLine) {
        const isValid = categories.some(c => c.id === selectedCategory && c.productLineId === selectedLine);
        if (!isValid) {
          setSelectedCategory('');
        }
      } else {
        setSelectedCategory('');
      }
    }, [selectedLine, categories]);

    const handleFileUpload = async (type: 'certificado' | 'etiqueta' | 'testReport', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const typeNames = {
          certificado: 'Certificado',
          etiqueta: 'Etiqueta',
          testReport: 'Test Report'
        };
        toast.loading(`Subiendo ${typeNames[type]}...`);
        try {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `ee/${Date.now()}_${file.name}`, file);
          const mockFile: FileInfo = {
            name: file.name,
            url: fileInfo.url,
            type: file.type,
            originalName: file.name
          };
          
          if (type === 'certificado') {
            if (certificado) {
              const historyEntry: EnergyEfficiencyDocument = {
                ...certificado,
                version: certificadoHistory.length + 1,
                uploadDate: new Date().toISOString(),
                uploadedBy: profile?.full_name || 'Sistema',
                changeDescription: 'Nueva versión cargada'
              };
              setCertificadoHistory(prev => [historyEntry, ...prev]);
            }
            setCertificado(mockFile);
          } else if (type === 'etiqueta') {
            if (etiqueta) {
              const historyEntry: EnergyEfficiencyDocument = {
                ...etiqueta,
                version: etiquetaHistory.length + 1,
                uploadDate: new Date().toISOString(),
                uploadedBy: profile?.full_name || 'Sistema',
                changeDescription: 'Nueva versión cargada'
              };
              setEtiquetaHistory(prev => [historyEntry, ...prev]);
            }
            setEtiqueta(mockFile);
          } else {
            if (testReport) {
              const historyEntry: EnergyEfficiencyDocument = {
                ...testReport,
                version: testReportHistory.length + 1,
                uploadDate: new Date().toISOString(),
                uploadedBy: profile?.full_name || 'Sistema',
                changeDescription: 'Nueva versión cargada'
              };
              setTestReportHistory(prev => [historyEntry, ...prev]);
            }
            setTestReport(mockFile);
          }
          toast.dismiss();
          toast.success(`${typeNames[type]} cargado correctamente`);
        } catch (err) {
          toast.dismiss();
          toast.error(`Error al subir ${typeNames[type]}`);
        }
      }
    };

    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);

    const handleAddGalleryCategory = (name?: string) => {
      const category = name || newCategoryName || 'General';
      setGallery(prev => [
        ...prev,
        {
          id: `GAL-${Date.now()}`,
          category,
          photos: [],
          uploadDate: new Date().toISOString()
        }
      ]);
      setNewCategoryName('');
      setIsAddingNewCategory(false);
    };

    const handleEditGalleryCategory = (id: string) => {
      const group = gallery.find(g => g.id === id);
      if (!group) return;
      const newName = prompt('Nuevo nombre para la categoría:', group.category);
      if (newName && newName !== group.category) {
        setGallery(prev => prev.map(g => g.id === id ? { ...g, category: newName } : g));
      }
    };

    const handlePhotoUpload = async (galleryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        toast.loading('Subiendo fotos...');
        try {
          const uploadedPhotos: FileInfo[] = [];
          for (const f of Array.from(files) as File[]) {
            const fileInfo = await SupabaseService.uploadFile('rd-files', `ee/gallery/${Date.now()}_${f.name}`, f) as any;
            uploadedPhotos.push({
              name: f.name,
              url: fileInfo.url,
              type: f.type
            });
          }

          setGallery(prev => prev.map(g => 
            g.id === galleryId 
              ? { ...g, photos: [...g.photos, ...uploadedPhotos] }
              : g
          ));
          toast.dismiss();
          toast.success('Fotos añadidas a la galería');
        } catch (err) {
          toast.dismiss();
          toast.error('Error al subir fotos');
        }
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
              <p className="text-slate-500 text-sm font-medium">Completa los datos de eficiencia energética</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);

            const codigoMT = (formData.get('codigoMT') as string || '').trim();
            const isDuplicate = records.some(r => 
              r.codigoMT?.trim().toLowerCase() === codigoMT.toLowerCase() && 
              (!record || r.id !== record.id)
            );

            if (isDuplicate) {
              toast.error(`El Código MT "${codigoMT}" ya está registrado en Eficiencia Energética.`);
              return;
            }

            const providerName = formData.get('proveedor') as string;
            const selectedSupplier = suppliers.find(s => s.legalName === providerName || s.commercialAlias === providerName);
            
            const data = {
              codigoMT,
              descripcion: formData.get('descripcion') as string,
              letra: formData.get('letra') as string,
              porcentajeEE: formData.get('porcentajeEE') as string,
              ocp: formData.get('ocp') as string,
              proveedor: selectedSupplier ? selectedSupplier.id : providerName,
              fechaEmision: formData.get('fechaEmision') as string,
              fechaVigilancia: formData.get('fechaVigilancia') as string,
              tipoProducto: '', // Cleaned up
              lineId: selectedLine,
              linea: productLines.find(l => l.id === selectedLine)?.name || '',
              categoryId: selectedCategory,
              categoria: categories.find(c => c.id === selectedCategory)?.name || '',
              sampleId: formData.get('sampleId') as string || undefined,
              certificadoFile: certificado,
              certificadoHistory: certificadoHistory,
              etiquetaFile: etiqueta,
              etiquetaHistory: etiquetaHistory,
              testReportFile: testReport,
              testReportHistory: testReportHistory,
              gallery: gallery,
            };
            onSubmit(data);
          }} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código MT</label>
              <input name="codigoMT" defaultValue={record?.codigoMT} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
              <input name="descripcion" defaultValue={record?.descripcion} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Letra</label>
              <select name="letra" defaultValue={record?.letra || 'A'} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">% EE</label>
              <input name="porcentajeEE" defaultValue={record?.porcentajeEE} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">OCP</label>
              <input name="ocp" defaultValue={record?.ocp} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
              <input 
                name="proveedor" 
                defaultValue={record?.proveedor} 
                list="suppliers-list" 
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
              />
              <datalist id="suppliers-list">
                {suppliers.map(s => (
                  <option key={s.id} value={s.legalName}>{s.legalName}</option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Emisión</label>
              <input type="date" name="fechaEmision" defaultValue={record?.fechaEmision ? record.fechaEmision.split('T')[0] : ''} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Vigilancia</label>
              <input type="date" name="fechaVigilancia" defaultValue={record?.fechaVigilancia ? record.fechaVigilancia.split('T')[0] : ''} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea</label>
              <select 
                value={selectedLine} 
                onChange={(e) => setSelectedLine(e.target.value)} 
                required
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              >
                <option value="">Seleccionar línea</option>
                {productLines.map(line => (
                  <option key={line.id} value={line.id}>{line.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                required
                disabled={!selectedLine}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 disabled:opacity-50"
              >
                <option value="">Seleccionar categoría</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular Muestra</label>
              <select name="sampleId" defaultValue={record?.sampleId || ''} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700">
                <option value="">Sin muestra</option>
                {samples.map(s => (
                  <option key={s.id} value={s.id}>{s.correlativeId} - {s.descripcionSAP}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificado (PDF/JPG/ZIP) (Máx. 1 GB)</label>
                <label className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${certificado ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}>
                  {certificado ? <FileText size={24} /> : <Upload size={24} />}
                  <span className="text-[10px] font-black uppercase text-center line-clamp-1">{certificado ? certificado.name : 'Subir Certificado'}</span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.dwg7,.html,.zip,.rar,.7z" onChange={(e) => handleFileUpload('certificado', e)} />
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta (PDF/JPG/ZIP) (Máx. 1 GB)</label>
                <label className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${etiqueta ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}>
                  {etiqueta ? <ImageIcon size={24} /> : <Upload size={24} />}
                  <span className="text-[10px] font-black uppercase text-center line-clamp-1">{etiqueta ? etiqueta.name : 'Subir Etiqueta'}</span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.dwg7,.html,.zip,.rar,.7z" onChange={(e) => handleFileUpload('etiqueta', e)} />
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Report (PDF/JPG/ZIP) (Máx. 1 GB)</label>
                <label className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${testReport ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}>
                  {testReport ? <ClipboardList size={24} /> : <Upload size={24} />}
                  <span className="text-[10px] font-black uppercase text-center line-clamp-1">{testReport ? testReport.name : 'Subir Test Report'}</span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.dwg7,.html,.zip,.rar,.7z" onChange={(e) => handleFileUpload('testReport', e)} />
                </label>
              </div>
            </div>

            {/* Gallery Section */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={18} className="text-indigo-500" />
                  Galería de Inspección I+D
                </h4>
                <div className="flex items-center gap-3">
                  {isAddingNewCategory ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                      <input 
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nombre cat..."
                        className="text-[10px] font-bold px-3 py-1.5 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddGalleryCategory();
                          if (e.key === 'Escape') setIsAddingNewCategory(false);
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleAddGalleryCategory()}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingNewCategory(false)}
                        className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => {
                          if (gallery.length === 0) {
                            // If no category, create a default one and then trigger upload
                            const newId = `GAL-${Date.now()}`;
                            setGallery(prev => [
                              ...prev,
                              {
                                id: newId,
                                category: 'General',
                                photos: [],
                                uploadDate: new Date().toISOString()
                              }
                            ]);
                            
                            // Small delay to ensure state update before triggering input
                            setTimeout(() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.accept = 'image/*';
                              input.onchange = (e: any) => handlePhotoUpload(newId, e);
                              input.click();
                            }, 50);
                          } else {
                            const firstGroupId = gallery[gallery.length - 1].id;
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.multiple = true;
                            input.accept = 'image/*';
                            input.onchange = (e: any) => handlePhotoUpload(firstGroupId, e);
                            input.click();
                          }
                        }}
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl transition-all border border-blue-200"
                      >
                        <Upload size={14} />
                        Subir Fotos
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingNewCategory(true)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl transition-all border border-indigo-200"
                      >
                        <Plus size={14} />
                        Añadir Categoría
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {gallery.map((group) => (
                  <div key={group.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{group.category}</h5>
                        <button 
                          type="button"
                          onClick={() => handleEditGalleryCategory(group.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5">
                          <Plus size={12} />
                          Añadir Fotos
                          <input 
                            type="file" 
                            multiple 
                            accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.dwg7,.html,.zip,.rar,.7z"
                            className="hidden" 
                            onChange={(e) => handlePhotoUpload(group.id, e)}
                          />
                        </label>
                        <button 
                          type="button"
                          onClick={() => {
                            setDeleteConfirm({
                              id: group.id,
                              type: 'category',
                              title: group.category,
                              onConfirm: () => {
                                setGallery(prev => prev.filter(g => g.id !== group.id));
                                setDeleteConfirm(null);
                                toast.success('Categoría eliminada');
                              }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {group.photos.map((photo: FileInfo, pIdx: number) => (
                        <div key={pIdx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group bg-white">
                          <img src={photo.url} alt="" className="w-full h-full object-contain p-1" />
                          <button 
                            type="button"
                            onClick={() => {
                              setGallery(prev => prev.map(g => 
                                g.id === group.id 
                                  ? { ...g, photos: g.photos.filter((_: any, i: number) => i !== pIdx) }
                                  : g
                              ));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {group.photos.length === 0 && (
                        <div className="col-span-full py-4 text-center text-[10px] font-black text-slate-400 uppercase italic">
                          No hay fotos en esta categoría
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {gallery.length === 0 && (
                  <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon size={32} className="mb-2 opacity-20" />
                    <p className="text-[10px] font-black uppercase">No hay categorías de galería</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex gap-4 pt-4">
              <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
              <button type="submit" className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DetailModal = ({ record }: { record: EnergyEfficiencyRecord }) => {
    const linkedSample = samples.find(s => s.id === record.sampleId);

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Detalles de Eficiencia Energética</h3>
              <p className="text-slate-500 text-sm font-medium">{record.codigoMT} - {record.descripcion}</p>
            </div>
            <button onClick={() => setViewingRecord(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Técnica</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Letra</p>
                    <p className="text-lg font-black text-indigo-600">{record.letra}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">% EE</p>
                    <p className="text-sm font-bold text-slate-700">{record.porcentajeEE}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">OCP</p>
                    <p className="text-sm font-bold text-slate-700">{record.ocp}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                    <p className="text-sm font-bold text-slate-700">
                      {suppliers.find(s => record.proveedor && (s.id === record.proveedor || s.commercialAlias === record.proveedor || s.legalName === record.proveedor))?.commercialAlias || record.proveedor}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Línea</p>
                    <p className="text-sm font-bold text-slate-700">
                      {productLines.find(l => l.id === record.lineId || l.name === record.linea)?.name || record.linea}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</p>
                    <p className="text-sm font-bold text-slate-700">
                      {categories.find(c => c.id === record.categoryId || c.name.toLowerCase() === record.categoria?.toLowerCase())?.name || record.categoria}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigencia</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium tracking-tight">Emisión:</span>
                    <span className="font-bold text-slate-700">{record.fechaEmision ? record.fechaEmision.split('T')[0] : ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium tracking-tight">Vigilancia:</span>
                    <span className="font-bold text-slate-700">{record.fechaVigilancia ? record.fechaVigilancia.split('T')[0] : ''}</span>
                  </div>
                </div>
              </div>

              {linkedSample && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muestra Vinculada</h4>
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <LinkIcon size={16} className="text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-indigo-900 uppercase">{linkedSample.correlativeId}</p>
                      <p className="text-[10px] font-medium text-indigo-400 uppercase">{linkedSample.descripcionSAP}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos</h4>
                <div className="space-y-3">
                  {record.certificadoFile ? (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase">Certificado</p>
                          <p className="text-[10px] text-slate-400 font-medium">{record.certificadoFile.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {record.certificadoHistory && record.certificadoHistory.length > 0 && (
                          <button 
                            onClick={() => setViewingHistory({ title: 'Certificado', history: record.certificadoHistory || [] })}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                            title="Ver versiones anteriores"
                          >
                            <HistoryIcon size={16} />
                          </button>
                        )}
                        <a 
                          href={record.certificadoFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-center text-[10px] font-black text-slate-400 uppercase">Sin Certificado</div>
                  )}

                  {record.etiquetaFile ? (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <ImageIcon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 uppercase">Etiqueta</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate" title={record.etiquetaFile.name}>{record.etiquetaFile.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {record.etiquetaHistory && record.etiquetaHistory.length > 0 && (
                          <button 
                            onClick={() => setViewingHistory({ title: 'Etiqueta', history: record.etiquetaHistory || [] })}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                            title="Ver versiones anteriores"
                          >
                            <HistoryIcon size={16} />
                          </button>
                        )}
                        <a 
                          href={record.etiquetaFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-center text-[10px] font-black text-slate-400 uppercase">Sin Etiqueta</div>
                  )}

                  {record.testReportFile ? (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <ClipboardList size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 uppercase">Test Report</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate" title={record.testReportFile.name}>{record.testReportFile.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {record.testReportHistory && record.testReportHistory.length > 0 && (
                          <button 
                            onClick={() => setViewingHistory({ title: 'Test Report', history: record.testReportHistory || [] })}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                            title="Ver versiones anteriores"
                          >
                            <HistoryIcon size={16} />
                          </button>
                        )}
                        <a 
                          href={record.testReportFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-center text-[10px] font-black text-slate-400 uppercase">Sin Test Report</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa</h4>
                <div className="aspect-[1/1.414] bg-white rounded-[32px] border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden p-6 shadow-inner">
                  {record.etiquetaFile ? (
                    record.etiquetaFile.type.includes('image') ? (
                      <img 
                        src={record.etiquetaFile.url} 
                        alt="Vista previa" 
                        className="w-full h-full object-contain" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <iframe 
                        src={`${record.etiquetaFile.url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} 
                        className="w-full h-full border-none rounded-2xl"
                        title="Vista previa etiqueta"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Eye size={32} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase">Vista previa no disponible</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery View */}
              <div className="md:col-span-2 space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={18} className="text-indigo-500" />
                    Galería de Inspección I+D
                  </h4>
                  <button 
                    onClick={() => setIsGalleryUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    <Plus size={14} />
                    Añadir a Galería
                  </button>
                </div>
                
                {record.gallery && record.gallery.length > 0 ? (
                  <div className="space-y-8">
                    {record.gallery.map((group) => (
                      <div key={group.id} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                              <Tag size={14} />
                            </div>
                            <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{group.category}</h5>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                            {group.photos.length} {group.photos.length === 1 ? 'foto' : 'fotos'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {group.photos.map((photo, idx) => (
                            <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative">
                              <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="text-white" size={24} />
                              </div>
                              <div className="absolute bottom-2 left-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-[8px] font-black uppercase text-slate-600 truncate">
                                  {photo.name}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                      <ImageIcon size={32} className="opacity-20" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">No hay fotos en la galería</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase">Pulsa el botón superior para añadir fotos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    try {
      const recordName = await generateModuleCorrelative('energy_efficiency', details.projectName);
      
      await saveCalculationRecord(
        'energy_efficiency',
        'save',
        { records, recordName },
        user?.email || 'unknown',
        recordName,
        details.sampleId,
        details.description
      );
      toast.success('Datos guardados correctamente');
    } catch (error) {
      console.error('Error saving energy efficiency record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleExportExcel = () => {
    const data = records.map(r => ({
      'Código MT': r.codigoMT,
      'Descripción': r.descripcion,
      'Letra': r.letra,
      '% EE': r.porcentajeEE,
      'OCP': r.ocp,
      'Proveedor': suppliers.find(s => r.proveedor && (s.id === r.proveedor || s.commercialAlias === r.proveedor || s.legalName === r.proveedor))?.commercialAlias || r.proveedor,
      'Emisión': r.fechaEmision ? r.fechaEmision.split('T')[0] : '',
      'Vigilancia': r.fechaVigilancia ? r.fechaVigilancia.split('T')[0] : '',
      'Línea': productLines.find(l => l.id === r.lineId || l.name === r.linea)?.name || r.linea || '',
      'Categoría': categories.find(c => c.id === r.categoryId || c.name.toLowerCase() === r.categoria?.toLowerCase())?.name || r.categoria || ''
    }));
    exportToExcel(data, 'Eficiencia_Energetica');
    toast.success('Excel exportado correctamente');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'ee-table', title: 'Eficiencia Energética' }
    ];
    await generateReportPDF(sections, 'Reporte_Eficiencia_Energetica', 'Reporte de Eficiencia Energética');
    toast.success('PDF exportado correctamente');
  };

  const handleExportPPT = async () => {
    toast.promise(
      exportToPPT('energy-efficiency-container', 'Reporte_Eficiencia_Energetica', 'Módulo de Eficiencia Energética'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('energy_efficiency', 'export_ppt', { module: 'energy_efficiency' }, user?.email || 'unknown');
  };

  const toggleSort = (column: string) => {
    let nextDirection: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.column === column) {
      if (sortConfig.direction === 'asc') {
        nextDirection = 'desc';
      } else if (sortConfig.direction === 'desc') {
        nextDirection = null;
      }
    }
    handleSortChange(column, nextDirection);
  };

  const uniqueCodigoMTs = useMemo(() => Array.from(new Set(records.map(r => r.codigoMT || '').filter(Boolean))), [records]);
  const uniqueLetras = useMemo(() => Array.from(new Set(records.map(r => r.letra || '').filter(Boolean))), [records]);
  const uniqueLineas = useMemo(() => Array.from(new Set(records.map(r => productLines.find(l => l.id === r.lineId || l.name === r.linea)?.name || r.linea || '').filter(Boolean))), [records, productLines]);
  const uniqueProveedores = useMemo(() => Array.from(new Set(records.map(r => r.proveedor || '').filter(Boolean))), [records]);
  const uniqueFechas = useMemo(() => Array.from(new Set(records.map(r => r.fechaVigilancia || '').filter(Boolean))), [records]);

  return (
    <div id="energy-efficiency-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto bg-white p-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl md:rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-slate-200 shrink-0">
            <Zap size={28} className="md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Eficiencia Energética</h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium tracking-wide uppercase mt-1">Gestión de Certificados y Etiquetas</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ModuleActions 
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={handleExportPPT}
          />
          <button 
            onClick={() => setShowLabelGenerator(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <FileText size={20} />
            Generar Etiqueta
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
          >
            <Plus size={20} />
            Nuevo Registro
          </button>
        </div>

      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por código MT, descripción o proveedor..."
            className="w-full pl-12 pr-4 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-[24px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-600 shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div id="ee-table" className="bg-white rounded-2xl md:rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  onClick={() => toggleSort('codigoMT')}
                >
                  <div className="flex items-center justify-between">
                    <span>Código MT / Descripción</span>
                    <HeaderFilterPopover 
                      column="codigoMT" 
                      label="Código MT / Descripción" 
                      currentFilter={columnFilters.codigoMT || ''}
                      onFilterChange={handleFilterChange}
                      currentSort={sortConfig}
                      onSortChange={handleSortChange}
                      uniqueValues={uniqueCodigoMTs}
                    />
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  onClick={() => toggleSort('letra')}
                >
                  <div className="flex items-center justify-center">
                    <span>Letra / % EE</span>
                    <HeaderFilterPopover 
                      column="letra" 
                      label="Letra / % EE" 
                      currentFilter={columnFilters.letra || ''}
                      onFilterChange={handleFilterChange}
                      currentSort={sortConfig}
                      onSortChange={handleSortChange}
                      uniqueValues={uniqueLetras}
                    />
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  onClick={() => toggleSort('linea')}
                >
                  <div className="flex items-center justify-between">
                    <span>Línea / Categoría</span>
                    <HeaderFilterPopover 
                      column="linea" 
                      label="Línea / Categoría" 
                      currentFilter={columnFilters.linea || ''}
                      onFilterChange={handleFilterChange}
                      currentSort={sortConfig}
                      onSortChange={handleSortChange}
                      uniqueValues={uniqueLineas}
                    />
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  onClick={() => toggleSort('proveedor')}
                >
                  <div className="flex items-center justify-between">
                    <span>Proveedor / OCP</span>
                    <HeaderFilterPopover 
                      column="proveedor" 
                      label="Proveedor / OCP" 
                      currentFilter={columnFilters.proveedor || ''}
                      onFilterChange={handleFilterChange}
                      currentSort={sortConfig}
                      onSortChange={handleSortChange}
                      uniqueValues={uniqueProveedores}
                    />
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  onClick={() => toggleSort('fechaVigilancia')}
                >
                  <div className="flex items-center justify-between">
                    <span>Vigencia</span>
                    <HeaderFilterPopover 
                      column="fechaVigilancia" 
                      label="Vigencia" 
                      currentFilter={columnFilters.fechaVigilancia || ''}
                      onFilterChange={handleFilterChange}
                      currentSort={sortConfig}
                      onSortChange={handleSortChange}
                      uniqueValues={uniqueFechas}
                    />
                  </div>
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Docs</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setViewingRecord(record)}>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase leading-tight">{record.codigoMT}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{record.descripcion}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black text-indigo-600">{record.letra}</span>
                      <span className="text-[10px] font-bold text-slate-400">{record.porcentajeEE}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 uppercase">
                        {productLines.find(l => l.id === record.lineId || l.name === record.linea)?.name || record.linea}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">
                        {categories.find(c => c.id === record.categoryId || c.name.toLowerCase() === record.categoria?.toLowerCase())?.name || record.categoria}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 uppercase">
                        {suppliers.find(s => record.proveedor && (s.id === record.proveedor || s.commercialAlias === record.proveedor || s.legalName === record.proveedor))?.commercialAlias || record.proveedor}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{record.ocp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vence</span>
                      <span className="text-xs font-bold text-slate-700">
                        {record.fechaVigilancia ? record.fechaVigilancia.split('T')[0] : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2">
                      {record.certificadoFile && <FileText size={16} className="text-indigo-400" />}
                      {record.etiquetaFile && <ImageIcon size={16} className="text-emerald-400" />}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setEditingRecord(record)}
                        className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setDeleteConfirm({
                            id: record.id,
                            type: 'record',
                            title: record.codigoMT,
                            onConfirm: () => {
                              handleDeleteRecord(record.id);
                              setDeleteConfirm(null);
                            }
                          });
                        }}
                        className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewingHistory && (
        <DocumentHistoryModal 
          title={viewingHistory.title}
          history={viewingHistory.history}
          onClose={() => setViewingHistory(null)}
        />
      )}

      {showAddModal && (
        <RecordForm 
          title="Añadir Registro"
          onSubmit={(data) => {
            handleAddRecord(data);
            setShowAddModal(false);
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {editingRecord && (
        <RecordForm 
          title="Editar Registro"
          record={editingRecord}
          onSubmit={(data) => {
            handleUpdateRecord({ ...editingRecord, ...data });
            setEditingRecord(null);
          }}
          onCancel={() => setEditingRecord(null)}
        />
      )}

      {viewingRecord && <DetailModal record={viewingRecord} />}

      {showLabelGenerator && (
        <LabelGeneratorModal onClose={() => setShowLabelGenerator(false)} />
      )}


      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center text-red-600 mx-auto mb-6 shadow-lg shadow-red-100">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">¿Estás seguro?</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Estás a punto de eliminar {deleteConfirm.type === 'record' ? 'el registro' : 'la categoría'} <span className="font-black text-slate-900">"{deleteConfirm.title}"</span>. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-8 bg-slate-50 flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={deleteConfirm.onConfirm}
                className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Upload Modal */}
      {isGalleryUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Subir a Galería</h3>
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">Añade fotos a la inspección</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsGalleryUploadModalOpen(false);
                  setTempGalleryPhotos([]);
                  setGalleryCategory('');
                }}
                className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría de Inspección</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    list="gallery-categories-ee"
                    value={galleryCategory}
                    onChange={(e) => setGalleryCategory(e.target.value)}
                    placeholder="Ej: Empaque, Componentes, Producto Final..."
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                  />
                  <datalist id="gallery-categories-ee">
                    {(viewingRecord?.gallery || []).map(g => (
                      <option key={g.id} value={g.category} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(new Set([
                    ...(viewingRecord?.gallery || []).map(g => g.category),
                    'Empaque', 'Producto', 'Defectos', 'Manuales', 'Etiquetas'
                  ])).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGalleryCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        galleryCategory === cat 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Fotos</label>
                <label className="w-full aspect-[2/1] border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-600 uppercase tracking-tight">Haz clic para subir fotos</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase mt-1">Formatos de diseño y web (Máx. 1 GB)</p>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.dwg7,.html,.zip,.rar,.7z" 
                    className="hidden" 
                    onChange={handleGalleryPhotoSelect}
                  />
                </label>
              </div>

              {tempGalleryPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista previa ({tempGalleryPhotos.length})</p>
                    <button 
                      onClick={() => setTempGalleryPhotos([])}
                      className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600"
                    >
                      Limpiar todo
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto p-1">
                    {tempGalleryPhotos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group bg-white">
                        <img src={photo.url} alt="" className="w-full h-full object-contain p-1" />
                        <button 
                          onClick={() => setTempGalleryPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setIsGalleryUploadModalOpen(false);
                    setTempGalleryPhotos([]);
                    setGalleryCategory('');
                  }}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-xs text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmGalleryUpload}
                  disabled={!galleryCategory || tempGalleryPhotos.length === 0}
                  className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Confirmar Subida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_LEGAL_TEXT = `Compare este producto con otros de similares características

Los resultados se obtienen aplicando los métodos de ensayo descritos en las Normas Técnicas Peruanas e Internacionales correspondientes

Esta etiqueta no debe retirarse del artefacto hasta que este haya sido adquirido por el consumidor final`;

const ARROWS = [
  { letter: 'A', color: '#00A859', width: '38%' },
  { letter: 'B', color: '#3BB54A', width: '46%' },
  { letter: 'C', color: '#8DC63F', width: '54%' },
  { letter: 'D', color: '#FFF200', width: '62%' },
  { letter: 'E', color: '#F7931E', width: '70%' },
  { letter: 'F', color: '#F15A24', width: '78%' },
  { letter: 'G', color: '#ED1C24', width: '86%' },
];

function LabelGeneratorModal({ onClose }: { onClose: () => void }) {
  const [tipo, setTipo] = useState<'instantaneo' | 'acumulacion'>('instantaneo');
  const [fabricante, setFabricante] = useState('SOLE');
  const [modelo, setModelo] = useState('SOLRD3000C');
  const [letra, setLetra] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'>('B');
  const [ducha, setDucha] = useState(false);
  const [grifo, setGrifo] = useState(false);
  const [calentador, setCalentador] = useState(true);
  const [eficiencia, setEficiencia] = useState('98');
  const [variableValue, setVariableValue] = useState('3');
  const [potencia, setPotencia] = useState('3.0');
  const [showDecimalVariable, setShowDecimalVariable] = useState(false);
  const [showDecimalPotencia, setShowDecimalPotencia] = useState(true);
  const [certificador, setCertificador] = useState<'lenor1' | 'lenor2' | 'dekra' | 'custom'>('lenor1');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [legalText, setLegalText] = useState(DEFAULT_LEGAL_TEXT);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (tipo === 'instantaneo') {
      setVariableValue('3');
      setPotencia('3.0');
      setShowDecimalVariable(false);
      setShowDecimalPotencia(true);
    } else {
      setVariableValue('250');
      setPotencia('4.5');
      setShowDecimalVariable(false);
      setShowDecimalPotencia(true);
    }
  }, [tipo]);

  const handleCustomLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatValue = (valStr: string, forceDecimal: boolean) => {
    if (!valStr) return '';
    const num = parseFloat(valStr.replace(',', '.'));
    if (isNaN(num)) return valStr;
    if (forceDecimal) {
      return num.toFixed(1).replace('.', ',');
    } else {
      return Math.round(num).toString();
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('energy-label-card');
    if (!element) {
      toast.error('No se pudo encontrar la etiqueta para exportar');
      return;
    }

    setIsGenerating(true);
    toast.loading('Generando etiqueta en formato PDF...');

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Etiqueta_EE_${fabricante.replace(/\s+/g, '_')}_${modelo.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss();
      toast.success('Etiqueta PDF descargada correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Error al generar el archivo PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-6xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Generador de Etiquetas de Eficiencia Energética</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-0.5">Crea, previsualiza y descarga etiquetas PDF listas para imprimir</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">Información del Artefacto</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Calentador</label>
                  <select 
                    value={tipo} 
                    onChange={e => setTipo(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  >
                    <option value="instantaneo">Calentador Eléctrico Instantáneo</option>
                    <option value="acumulacion">Calentador Eléctrico de Acumulación</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fabricante</label>
                  <input 
                    type="text" 
                    value={fabricante} 
                    onChange={e => setFabricante(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo</label>
                  <input 
                    type="text" 
                    value={modelo} 
                    onChange={e => setModelo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
              </div>

              {tipo === 'instantaneo' && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Aplicaciones (Checkboxes)</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={ducha} onChange={e => setDucha(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500/20" />
                      <span className="text-xs font-bold text-slate-600">Ducha</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={grifo} onChange={e => setGrifo(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500/20" />
                      <span className="text-xs font-bold text-slate-600">Grifo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={calentador} onChange={e => setCalentador(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500/20" />
                      <span className="text-xs font-bold text-slate-600">Calentador</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">Rendimiento y Eficiencia</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Letra de Eficiencia</label>
                  <select 
                    value={letra} 
                    onChange={e => setLetra(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiencia energética (%)</label>
                  <input 
                    type="text" 
                    value={eficiencia} 
                    onChange={e => setEficiencia(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {tipo === 'instantaneo' ? 'Caudal (litros/minuto)' : 'Capacidad (litros)'}
                  </label>
                  <input 
                    type="text" 
                    value={variableValue} 
                    onChange={e => setVariableValue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer mt-1 select-none">
                    <input type="checkbox" checked={showDecimalVariable} onChange={e => setShowDecimalVariable(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500/20" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mostrar con decimal</span>
                  </label>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Potencia (kW)</label>
                  <input 
                    type="text" 
                    value={potencia} 
                    onChange={e => setPotencia(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                  <label className="flex items-center gap-1.5 cursor-pointer mt-1 select-none">
                    <input type="checkbox" checked={showDecimalPotencia} onChange={e => setShowDecimalPotencia(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500/20" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mostrar con decimal</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">Certificación y Textos Legales</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificador</label>
                  <select 
                    value={certificador} 
                    onChange={e => setCertificador(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  >
                    <option value="lenor1">LENOR (L Verde)</option>
                    <option value="lenor2">LENOR (Cruz Azul)</option>
                    <option value="dekra">DEKRA</option>
                    <option value="custom">Subir Logo Personalizado</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  {certificador === 'custom' ? (
                    <>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargar Imagen Logo</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomLogoSelect}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full pt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logo vectorial integrado</span>
                    </div>
                  )}
                </div>

                <div className="col-span-2 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Textos Legales / Aclaraciones</label>
                    <button 
                      type="button" 
                      onClick={() => setLegalText(DEFAULT_LEGAL_TEXT)}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-700"
                    >
                      Restaurar por defecto
                    </button>
                  </div>
                  <textarea 
                    value={legalText} 
                    onChange={e => setLegalText(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold text-slate-600 text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-100 p-6 rounded-[24px] border border-slate-200/50 min-h-[600px] overflow-hidden">
            <div className="mb-4 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vista Previa Real</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase">La etiqueta se exportará exactamente como se muestra aquí</span>
            </div>
            
            {/* Label Container (Strictly styled according to Peru regulation layout) */}
            <div 
              id="energy-label-card" 
              className="w-[495px] h-[700px] bg-white border-[3px] border-black p-4 flex flex-col justify-between shadow-lg select-none"
              style={{ contentVisibility: 'auto' }}
            >
              {/* Header */}
              <div className="flex flex-col border-b-[3px] border-black pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h1 className="text-[34px] font-black tracking-tight leading-none">ENERGIA</h1>
                    <span className="text-[11px] font-bold text-slate-700 mt-1 leading-none">Fabricante</span>
                    <span className="text-[11px] font-bold text-slate-700 mt-2 leading-none">Modelo</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[18px] font-black tracking-tight leading-none mb-1">{fabricante.toUpperCase()}</span>
                    <span className="text-[16px] font-black tracking-tight leading-none mt-1">{modelo.toUpperCase()}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2 pt-1 border-t border-slate-100">
                  <div className="flex flex-col pr-2 max-w-[280px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Artefacto</span>
                    <span className="text-[13px] font-extrabold leading-tight text-slate-900 mt-0.5">
                      {tipo === 'instantaneo' ? 'Calentador de agua eléctrico instantáneo' : 'Calentador de agua eléctrico tipo acumulación'}
                    </span>
                  </div>
                  {tipo === 'instantaneo' && (
                    <div className="flex flex-col text-[11px] font-bold border border-black p-1 bg-slate-50 rounded-lg min-w-[120px]">
                      <div className="flex items-center gap-1.5 py-0.5">
                        <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black bg-white">
                          {ducha ? 'X' : ''}
                        </div>
                        <span>Ducha</span>
                      </div>
                      <div className="flex items-center gap-1.5 py-0.5">
                        <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black bg-white">
                          {grifo ? 'X' : ''}
                        </div>
                        <span>Grifo</span>
                      </div>
                      <div className="flex items-center gap-1.5 py-0.5">
                        <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black bg-white">
                          {calentador ? 'X' : ''}
                        </div>
                        <span>Calentador</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Letter Scale Section */}
              <div className="grid grid-cols-12 gap-1 py-3 border-b-[3px] border-black flex-1 min-h-[220px]">
                {/* Left Scale */}
                <div className="col-span-8 flex flex-col justify-between pr-2 border-r-2 border-black">
                  <span className="text-[10px] font-extrabold text-black uppercase tracking-tight">Más eficiente (Menor consumo)</span>
                  <div className="flex flex-col gap-[5px] my-1">
                    {ARROWS.map(arrow => (
                      <div key={arrow.letter} className="h-[24px] flex items-center relative" style={{ width: arrow.width }}>
                        <svg viewBox="0 0 100 20" width="100%" height="20" preserveAspectRatio="none" className="absolute inset-0">
                          <path d="M 0,0 L 92,0 L 100,10 L 92,20 L 0,20 Z" fill={arrow.color} />
                        </svg>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white font-black text-[13px] pointer-events-none">
                          {arrow.letter}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-extrabold text-black uppercase tracking-tight">Menos eficiente (Mayor consumo)</span>
                </div>

                {/* Right selected arrow */}
                <div className="col-span-4 flex flex-col justify-center items-start pl-3 relative overflow-visible">
                  <div className="flex flex-col gap-[5px] my-1 w-full justify-center">
                    {ARROWS.map(arrow => {
                      const isSelected = letra === arrow.letter;
                      return (
                        <div key={arrow.letter} className="h-[24px] flex items-center justify-start overflow-visible">
                          {isSelected && (
                            <div className="relative w-[70px] h-[34px] overflow-visible">
                              <svg viewBox="0 0 70 34" width="70" height="34" className="absolute inset-0 overflow-visible">
                                <path d="M 70,0 L 12,0 L 0,17 L 12,34 L 70,34 Z" fill="black" />
                              </svg>
                              <span className="absolute left-[41px] top-1/2 -translate-y-1/2 text-white font-black text-[18px] -translate-x-1/2 pointer-events-none">
                                {arrow.letter}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Technical Data Section */}
              <div className="flex flex-col border-b-[3px] border-black">
                {/* Eficiencia Row */}
                <div className="flex border-b border-black py-1.5">
                  <div className="w-[70%] pr-2">
                    <span className="text-[13px] font-black block leading-none">Eficiencia energética(%)</span>
                    <span className="text-[9px] text-slate-800 leading-tight block mt-1">
                      El desempeño energético depende de las condiciones de uso del calentador y su localización
                    </span>
                  </div>
                  <div className="w-[30%] flex items-center justify-end">
                    <span className="text-[34px] font-black tracking-tighter leading-none pr-1">
                      {eficiencia}
                    </span>
                  </div>
                </div>
                
                {/* Variable Row */}
                <div className="flex border-b border-black py-2.5">
                  <div className="w-[70%]">
                    <span className="text-[12px] font-bold block leading-none">
                      {tipo === 'instantaneo' ? 'Caudal de agua litros/minuto' : 'Capacidad litros'}
                    </span>
                  </div>
                  <div className="w-[30%] flex items-center justify-end">
                    <span className="text-[20px] font-black tracking-tight leading-none pr-1">
                      {formatValue(variableValue, showDecimalVariable)}
                    </span>
                  </div>
                </div>
                
                {/* Potencia Row */}
                <div className="flex py-2.5">
                  <div className="w-[70%]">
                    <span className="text-[12px] font-bold block leading-none">Potencia kW</span>
                  </div>
                  <div className="w-[30%] flex items-center justify-end">
                    <span className="text-[20px] font-black tracking-tight leading-none pr-1">
                      {formatValue(potencia, showDecimalPotencia)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal and Certifier */}
              <div className="grid grid-cols-12 gap-2 pt-3 flex-1 min-h-[140px] items-center">
                <div className="col-span-8 text-[8px] text-slate-800 leading-tight space-y-1.5 pr-2">
                  {legalText.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="m-0 font-medium">{paragraph}</p>
                  ))}
                </div>
                <div className="col-span-0.5 border-l border-black self-stretch my-1"></div>
                <div className="col-span-3.5 flex flex-col items-center justify-center pr-1 select-none">
                  {certificador === 'lenor1' && (
                    <div className="flex flex-col items-center justify-center">
                      <svg viewBox="0 0 100 60" className="w-18 h-10" fill="none" stroke="#008060" strokeWidth="13" strokeLinecap="butt" strokeLinejoin="miter">
                        <path d="M 68 12 L 34 46 L 76 46" />
                      </svg>
                      <span className="font-sans font-black text-slate-900 text-[12px] tracking-widest mt-1">LENOR</span>
                    </div>
                  )}
                  {certificador === 'lenor2' && (
                    <div className="flex flex-col items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-14 h-14">
                        <circle cx="50" cy="50" r="32" fill="none" stroke="#0070c0" strokeWidth="4.5" />
                        <path d="M 50,22 L 50,78 M 22,50 L 78,50" stroke="#00a0e9" strokeWidth="4.5" strokeLinecap="square" />
                        <path id="curve-top-modal" d="M 20,45 A 30,30 0 0,1 80,45" fill="none" />
                        <text fontSize="7.5" fontWeight="bold" fill="#0070c0" letterSpacing="0.8">
                          <textPath href="#curve-top-modal" startOffset="50%" textAnchor="middle">
                            CERTIFICADO
                          </textPath>
                        </text>
                        <text x="50" y="93" fontSize="12" fontWeight="900" fill="#0070c0" textAnchor="middle" letterSpacing="0.8">
                          LENOR
                        </text>
                      </svg>
                    </div>
                  )}
                  {certificador === 'dekra' && (
                    <div className="flex items-center justify-center gap-1">
                      <svg viewBox="0 0 60 60" className="w-7 h-7" fill="none" stroke="#2c853c" strokeWidth="9" strokeLinecap="butt" strokeLinejoin="miter">
                        <path d="M 16 12 L 44 30 L 16 48" />
                      </svg>
                      <span className="font-sans font-black text-[#2c853c] text-[16px] tracking-tighter">DEKRA</span>
                    </div>
                  )}
                  {certificador === 'custom' && customLogoUrl && (
                    <img src={customLogoUrl} alt="Logo Certificador" className="max-h-[80px] max-w-[100px] object-contain" />
                  )}
                  {certificador === 'custom' && !customLogoUrl && (
                    <div className="border border-dashed border-slate-300 rounded-lg p-2 text-center text-[9px] text-slate-400 font-bold uppercase">
                      Sin Logo
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose} 
            disabled={isGenerating}
            className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-100 transition-all bg-white disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating && <Loader2 className="w-5 h-5 animate-spin" />}
            Descargar PDF de Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}

