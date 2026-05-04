import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, FileText, Upload, CheckCircle2, XCircle, 
  AlertCircle, Clock, History, Edit3, Save, Trash2,
  ChevronRight, ChevronDown, FileCheck, Calendar, User, Play, Pause,
  TrendingUp, FileUp, X, Copy, Maximize2, Image as ImageIcon, LayoutGrid,
  FileSpreadsheet, Tag, Download, FlaskConical, Wind, Thermometer, Flame, Droplets, Database
} from 'lucide-react';
import { SampleRecord, SampleStatus, InitialTechnicalDatasheet, FileInfo, InspectionTimer, InfoRequest, Supplier, InspectionSection, CalculationRecord, ModuleId } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import HeaderFilterPopover from './HeaderFilterPopover';
import * as XLSX from 'xlsx';
import UserSelect from './UserSelect';
import InspectionModal from './InspectionModal';
import SamplesDashboard from './SamplesDashboard';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord, fetchCalculationRecords } from '../lib/api';
import { useSamples } from '../context/SamplesContext';
import { SupabaseService } from '../lib/SupabaseService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface SamplesProps {
  samples: SampleRecord[];
  suppliers: Supplier[];
  onUpdateSample: (id: string, updates: Partial<SampleRecord>) => void;
  onAddSample: (sample: SampleRecord) => void;
  onExportPPT?: () => void;
  onLoadRecord?: (moduleId: ModuleId, data: any) => void;
}

export default function Samples({ suppliers, onExportPPT, onLoadRecord }: Omit<SamplesProps, 'samples' | 'onUpdateSample' | 'onAddSample'>) {
  const { user } = useAuth();
  const { samples, addSample, updateSample, deleteSample } = useSamples();
  const onUpdateSample = updateSample;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSample, setSelectedSample] = useState<SampleRecord | null>(null);
  const [isDatasheetModalOpen, setIsDatasheetModalOpen] = useState(false);
  const [isNewSampleModalOpen, setIsNewSampleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isProviderDocsModalOpen, setIsProviderDocsModalOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedSamplesForComparison, setSelectedSamplesForComparison] = useState<string[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFullComparisonOpen, setIsFullComparisonOpen] = useState(false);
  const [selectedSampleForDetail, setSelectedSampleForDetail] = useState<SampleRecord | null>(null);
  const [isGalleryUploadModalOpen, setIsGalleryUploadModalOpen] = useState(false);
  const [receptionPhoto, setReceptionPhoto] = useState<FileInfo | null>(null);
  const [tempGalleryPhotos, setTempGalleryPhotos] = useState<FileInfo[]>([]);
  const [galleryCategory, setGalleryCategory] = useState('');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'specs' | 'summary' | 'comparison'>('specs');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
  const [allCalculationRecords, setAllCalculationRecords] = useState<CalculationRecord[]>([]);
  const [isAddCalculationModalOpen, setIsAddCalculationModalOpen] = useState(false);

  // Load calculations
  useEffect(() => {
    const loadCalculations = async () => {
      try {
        const data = await fetchCalculationRecords();
        setAllCalculationRecords(data);
      } catch (error) {
        console.error('Error fetching calculations:', error);
      }
    };
    loadCalculations();
  }, []);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveData = (details: { projectName: string; sampleId: string; description: string }) => {
    // In a real app, this would be a backend call.
    // For now, we save to localStorage as a backup.
    localStorage.setItem('samples_data_backup', JSON.stringify(samples));
    saveCalculationRecord(
      'samples', 
      'save', 
      samples, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Listado de muestras guardado correctamente');
  };

  const handleExportExcel = () => {
    const exportData = filteredSamples.map(s => ({
      'ID': s.correlativeId,
      'Proveedor': s.proveedor,
      'Descripción': s.descripcionSAP,
      'Categoría': s.categoria,
      'Versión': s.version || 1,
      'Línea': s.linea,
      'Marca': s.marca,
      'Técnico': s.technician || 'No asignado',
      'Estado': s.inspectionStatus,
      'Fecha Recepción': s.warehouseEntryDate,
      'Fecha Informe': s.reportDate || '-'
    }));

    exportToExcel(exportData, `Muestras_R&D_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('samples', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'samples-table', title: 'Listado Maestro de Muestras' }
    ];

    await generateReportPDF(sections, `Reporte_Muestras_${format(new Date(), 'yyyyMMdd')}`, 'Reporte Maestro de Muestras R&D');
    saveCalculationRecord('samples', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  // Sync scrollbars
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    const handleTableScroll = () => {
      if (topScroll.scrollLeft !== tableContainer.scrollLeft) {
        topScroll.scrollLeft = tableContainer.scrollLeft;
      }
    };

    const handleTopScroll = () => {
      if (tableContainer.scrollLeft !== topScroll.scrollLeft) {
        tableContainer.scrollLeft = topScroll.scrollLeft;
      }
    };

    tableContainer.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    // Initial sync of width
    const updateWidth = () => {
      if (tableContainer && topScroll) {
        const table = tableContainer.querySelector('table');
        if (table) {
          const innerDiv = topScroll.querySelector('div');
          if (innerDiv) {
            innerDiv.style.width = `${table.offsetWidth}px`;
          }
        }
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScroll.removeEventListener('scroll', handleTopScroll);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredSamples = useMemo(() => {
    let result = [...samples];

    // Apply global search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.descripcionSAP.toLowerCase().includes(lowerSearch) ||
        s.proveedor.toLowerCase().includes(lowerSearch) ||
        s.correlativeId.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.inspectionStatus === statusFilter);
    }

    // Apply column filters
    (Object.entries(columnFilters) as [string, string][]).forEach(([key, value]) => {
      if (!value) return;
      const lowerValue = value.toLowerCase();
      result = result.filter(item => {
        const itemValue = String((item as any)[key] || '').toLowerCase();
        return itemValue.includes(lowerValue);
      });
    });

    // Sort by sortConfig or fallback to createdAt descending
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.column] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.column] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [samples, searchTerm, statusFilter, columnFilters, sortConfig]);

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };

  const getStatusIcon = (status: SampleStatus | string) => {
    switch (status) {
      case 'Aprobado': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'Rechazado': return <XCircle className="text-red-500" size={18} />;
      case 'Pasó a Comité': return <AlertCircle className="text-blue-500" size={18} />;
      case 'Observado': return <AlertCircle className="text-amber-500" size={18} />;
      case 'Tolerado': return <CheckCircle2 className="text-emerald-400" size={18} />;
      case 'Inspeccionado sin informe': return <Clock className="text-slate-400" size={18} />;
      default: return <Clock className="text-slate-400" size={18} />;
    }
  };

  const getStatusColor = (status: SampleStatus | string) => {
    switch (status) {
      case 'Aprobado': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rechazado': return 'bg-red-50 text-red-700 border-red-100';
      case 'Pasó a Comité': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Observado': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Tolerado': return 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50';
      case 'Inspeccionado sin informe': return 'bg-slate-50 text-slate-600 border-slate-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getSupplierLogo = (codProv: string) => {
    const supplier = suppliers.find(s => s.erpCode === codProv);
    return supplier?.logoUrl;
  };

  const getProgressColor = (progress: string) => {
    switch (progress) {
      case 'completed': return 'bg-emerald-500';
      case 'in_progress': return 'bg-blue-500 animate-pulse';
      case 'paused': return 'bg-amber-500';
      default: return 'bg-slate-200';
    }
  };

  const calculateTimeline = (inspectionDate: string, reportDate?: string) => {
    if (!reportDate) return null;
    const start = parseISO(inspectionDate);
    const end = parseISO(reportDate);
    return differenceInDays(end, start);
  };

  const handleStatusChange = (id: string, newStatus: SampleStatus) => {
    updateSample(id, { 
      inspectionStatus: newStatus,
      history: [
        ...samples.find(s => s.id === id)!.history,
        { date: new Date().toISOString().split('T')[0], status: newStatus, user: user?.name || 'Sistema' }
      ]
    });
  };

  const handleNewSample = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nextNumber = samples.length + 1;
    const correlativeId = `M-${nextNumber.toString().padStart(3, '0')}`;
    const selectedSupplierName = formData.get('proveedor') as string;
    const selectedSupplier = suppliers.find(s => s.commercialAlias === selectedSupplierName);

    const newSample: SampleRecord = {
      id: `UID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      correlativeId,
      createdAt: new Date().toISOString(),
      version: 1,
      descripcionSAP: formData.get('descripcion') as string,
      marca: formData.get('marca') as string,
      proveedor: selectedSupplierName,
      codProv: selectedSupplier?.erpCode,
      linea: formData.get('linea') as string,
      categoria: formData.get('categoria') as string,
      tipoSuestra: formData.get('tipo') as string,
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectionStatus: 'Inspeccionado sin informe',
      inspectionProgress: 'pending',
      receivedBy: formData.get('receivedBy') as string,
      warehouseEntryDate: formData.get('warehouseEntryDate') as string,
      receptionPhoto: receptionPhoto || undefined,
      history: [
        { date: new Date().toISOString().split('T')[0], status: 'Inspeccionado sin informe', user: 'Carlos H.', comment: 'Muestra registrada y recepcionada' }
      ]
    };
    addSample(newSample);
    setIsNewSampleModalOpen(false);
    setReceptionPhoto(null);
  };

  const handleAssign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSample) return;
    const formData = new FormData(e.currentTarget);
    updateSample(selectedSample.id, {
      technician: formData.get('technician') as string,
      plannedStartDate: formData.get('startDate') as string,
      history: [
        ...selectedSample.history,
        { date: new Date().toISOString().split('T')[0], status: 'Inspeccionado sin informe', user: user?.name || 'Sistema', comment: `Asignado a ${formData.get('technician')}` }
      ]
    });
    setIsAssignModalOpen(false);
  };

  const handleStartInspection = (sample: SampleRecord) => {
    const now = new Date().toISOString();
    const updatedSample: Partial<SampleRecord> = {
      inspectionProgress: 'in_progress',
      inspectionTimer: {
        lastStartTime: now,
        firstStartTime: now,
        accumulatedTimeMs: 0,
        idleTimeMs: 0,
        isPaused: false
      },
      history: [
        ...sample.history,
        { date: now.split('T')[0], status: 'Inspección Iniciada', user: 'Técnico' }
      ]
    };
    
    updateSample(sample.id, updatedSample);
    setSelectedSample({ ...sample, ...updatedSample });
    setIsInspectionModalOpen(true);
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>, sampleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Subiendo informe...');
      const newReport = await SupabaseService.uploadFile('rd-files', `samples/${sampleId}/reports/${Date.now()}_${file.name}`, file);
      
      updateSample(sampleId, {
        reportFile: newReport,
        reportDate: new Date().toISOString().split('T')[0],
        history: [
          ...samples.find(s => s.id === sampleId)!.history,
          { date: new Date().toISOString().split('T')[0], status: 'Aprobado', user: user?.name || 'Sistema', comment: `Informe subido: ${file.name}` }
        ]
      });
      toast.dismiss();
      toast.success('Informe subido');
    } catch (error) {
      console.error('Error uploading report:', error);
      toast.error('Error al subir informe');
    }
  };

  const handleProviderDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, sampleId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    toast.loading(`Subiendo ${files.length} documentos...`);
    try {
      const uploadPromises = Array.from(files).map((file: File) => 
        SupabaseService.uploadFile('rd-files', `samples/${sampleId}/provider-docs/${Date.now()}_${file.name}`, file)
      );
      
      const uploadedDocs = await Promise.all(uploadPromises);
      const updatedDocs = [...(sample.providerDocuments || []), ...uploadedDocs];
      
      updateSample(sampleId, {
        providerDocuments: updatedDocs,
        history: [
          ...sample.history,
          { 
            date: new Date().toISOString().split('T')[0], 
            status: sample.inspectionStatus, 
            user: user?.name || 'Sistema', 
            comment: `Documentos de proveedor subidos: ${uploadedDocs.map(d => d.name).join(', ')}` 
          }
        ]
      });
      
      // Update states for modals
      if (selectedSample?.id === sampleId) {
        setSelectedSample(prev => prev ? { ...prev, providerDocuments: updatedDocs } : null);
      }
      if (selectedSampleForDetail?.id === sampleId) {
        setSelectedSampleForDetail(prev => prev ? { ...prev, providerDocuments: updatedDocs } : null);
      }
      
      toast.dismiss();
      toast.success(`${uploadedDocs.length} documento(s) subido(s) correctamente`);
    } catch (error) {
      console.error('Error uploading docs:', error);
      toast.error('Error al subir documentos');
    }
  };

  const handleNewInspectionCycle = (sample: SampleRecord) => {
    const newVersion = (sample.version || 1) + 1;
    const nextNumber = samples.length + 1;
    const correlativeId = `M-${nextNumber.toString().padStart(3, '0')}`;
    const newSample: SampleRecord = {
      ...sample,
      id: `UID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      correlativeId,
      createdAt: new Date().toISOString(),
      version: newVersion,
      inspectionDate: new Date().toISOString().split('T')[0],
      inspectionStatus: 'Inspeccionado sin informe',
      inspectionProgress: 'pending',
      reportDate: undefined,
      reportFile: undefined,
      inspectionTimer: undefined,
      // Keep inspectionForm and workflow from previous cycle as base
      history: [
        { 
          date: new Date().toISOString().split('T')[0], 
          status: 'Nuevo Ciclo de Inspección', 
          user: 'Carlos H.', 
          comment: `Iniciado ciclo de inspección Versión ${newVersion} basado en Versión ${sample.version || 1}` 
        }
      ]
    };
    addSample(newSample);
  };

  const handleReceptionPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        toast.loading('Subiendo foto de recepción...');
        const fileInfo = await SupabaseService.uploadFile('rd-files', `samples/reception/${Date.now()}_${file.name}`, file);
        setReceptionPhoto(fileInfo);
        toast.dismiss();
        toast.success('Foto subida');
      } catch (error) {
        console.error('Error uploading reception photo:', error);
        toast.error('Error al subir foto');
      }
    }
  };

  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const handleGalleryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setGalleryFiles(prev => [...prev, ...Array.from(files)]);
      const newPhotos: FileInfo[] = Array.from(files).map((f: File) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type
      }));
      setTempGalleryPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handleConfirmGalleryUpload = async () => {
    if (!selectedSampleForDetail || !galleryCategory || galleryFiles.length === 0) return;

    setIsGalleryUploading(true);
    toast.loading(`Subiendo ${galleryFiles.length} fotos a la galería...`);
    try {
      const uploadPromises = galleryFiles.map(file => 
        SupabaseService.uploadFile('rd-files', `samples/${selectedSampleForDetail.id}/gallery/${galleryCategory}/${Date.now()}_${file.name}`, file)
      );
      
      const uploadedPhotos = await Promise.all(uploadPromises);

      const newGalleryItem = {
        id: `GAL-${Date.now()}`,
        category: galleryCategory,
        photos: uploadedPhotos,
        uploadDate: new Date().toISOString()
      };

      updateSample(selectedSampleForDetail.id, {
        gallery: [...(selectedSampleForDetail.gallery || []), newGalleryItem]
      });

      setSelectedSampleForDetail(prev => prev ? {
        ...prev,
        gallery: [...(prev.gallery || []), newGalleryItem]
      } : null);

      setIsGalleryUploadModalOpen(false);
      setTempGalleryPhotos([]);
      setGalleryFiles([]);
      setGalleryCategory('');
      toast.dismiss();
      toast.success('Galería actualizada');
    } catch (error) {
      console.error('Error uploading gallery photos:', error);
      toast.error('Error al subir fotos de galería');
    } finally {
      setIsGalleryUploading(false);
    }
  };

  const handleExportComparison = () => {
    const selectedSamples = samples.filter(s => comparisonIds.includes(s.id));
    if (selectedSamples.length === 0) return;

    const data: any[] = [];
    
    // Header row
    const header = ['Campo', ...selectedSamples.map(s => `${s.correlativeId} - ${s.descripcionSAP}`)];
    data.push(header);
    
    // Basic Info
    data.push(['Proveedor', ...selectedSamples.map(s => s.proveedor)]);
    data.push(['Marca', ...selectedSamples.map(s => s.marca)]);
    data.push(['Línea', ...selectedSamples.map(s => s.linea)]);
    data.push(['Estado', ...selectedSamples.map(s => s.inspectionStatus)]);
    data.push(['Versión', ...selectedSamples.map(s => s.version || 1)]);

    // Technical Data (Inspection Form)
    const allSections = new Set<string>();
    selectedSamples.forEach(s => {
      s.inspectionForm?.forEach(sec => allSections.add(sec.title));
    });

    allSections.forEach(sectionTitle => {
      data.push(['']); // Empty row for spacing
      data.push([`--- SECCIÓN: ${sectionTitle} ---`]);
      
      const allFields = new Set<string>();
      selectedSamples.forEach(s => {
        const section = s.inspectionForm?.find(sec => sec.title === sectionTitle);
        section?.fields.forEach(f => allFields.add(f.label));
      });

      allFields.forEach(fieldLabel => {
        const row = [fieldLabel];
        selectedSamples.forEach(s => {
          const section = s.inspectionForm?.find(sec => sec.title === sectionTitle);
          const field = section?.fields.find(f => f.label === fieldLabel);
          row.push(field?.value || '-');
        });
        data.push(row);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativo");
    XLSX.writeFile(wb, `Comparativo_Muestras_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  if (showDashboard) {
    return <SamplesDashboard samples={samples} onBack={() => setShowDashboard(false)} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Muestras (Samples)</h2>
          <p className="text-slate-500 font-medium mt-1">Gestión de inspecciones e informes</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDashboard(true)}
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <TrendingUp size={20} className="text-indigo-500" />
            Dashboard
          </button>
          <button 
            onClick={() => {
              setIsComparisonMode(!isComparisonMode);
              if (isComparisonMode) setSelectedSamplesForComparison([]);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
              isComparisonMode 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Copy size={20} className={isComparisonMode ? 'text-white' : 'text-indigo-500'} />
            {isComparisonMode ? 'Cancelar Comparación' : 'Comparar'}
          </button>
          {isComparisonMode && selectedSamplesForComparison.length >= 2 && (
            <button 
              onClick={() => {
                setComparisonIds(selectedSamplesForComparison);
                setIsFullComparisonOpen(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 animate-bounce"
            >
              <Maximize2 size={20} />
              Ver Comparativo ({selectedSamplesForComparison.length})
            </button>
          )}
          <button 
            onClick={() => setIsNewSampleModalOpen(true)}
            className="flex items-center gap-2 bg-[#1e293b] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus size={20} />
            Nueva Muestra
          </button>
          <ModuleActions 
            onSave={handleSaveData}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={onExportPPT}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descripción o proveedor..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
          <Filter size={16} className="text-slate-400" />
          <select 
            className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los Estados</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Pasó a Comité">Pasó a Comité</option>
            <option value="Observado">Observado</option>
            <option value="Tolerado">Tolerado</option>
            <option value="Inspeccionado sin informe">Inspeccionado sin informe</option>
          </select>
        </div>
      </div>

      {/* Samples Table */}
      <div id="samples-table" className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto h-3 bg-slate-50 border-b border-slate-100"
        >
          <div style={{ width: '1500px', height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto min-h-[420px] hide-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {isComparisonMode && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-12 sticky top-0 z-20">
                    Sel.
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  ID
                  <HeaderFilterPopover 
                    column="correlativeId" 
                    label="ID" 
                    currentFilter={columnFilters.correlativeId || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Proveedor
                  <HeaderFilterPopover 
                    column="proveedor" 
                    label="Proveedor" 
                    currentFilter={columnFilters.proveedor || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Descripción / Categoría / Versión
                  <HeaderFilterPopover 
                    column="descripcionSAP" 
                    label="Descripción" 
                    currentFilter={columnFilters.descripcionSAP || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Línea
                  <HeaderFilterPopover 
                    column="linea" 
                    label="Línea" 
                    currentFilter={columnFilters.linea || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Marca
                  <HeaderFilterPopover 
                    column="marca" 
                    label="Marca" 
                    currentFilter={columnFilters.marca || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Técnico Asignado
                  <HeaderFilterPopover 
                    column="technician" 
                    label="Técnico" 
                    currentFilter={columnFilters.technician || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Progreso
                  <HeaderFilterPopover 
                    column="inspectionProgress" 
                    label="Progreso" 
                    currentFilter={columnFilters.inspectionProgress || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">
                  Estado
                  <HeaderFilterPopover 
                    column="inspectionStatus" 
                    label="Estado" 
                    currentFilter={columnFilters.inspectionStatus || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">Informe</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">Timeline</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center sticky top-0 z-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.map((sample) => {
                const timeline = calculateTimeline(sample.inspectionDate, sample.reportDate);
                const canUploadReport = sample.inspectionStatus !== 'Rechazado';
                
                return (
                  <tr key={sample.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedSamplesForComparison.includes(sample.id) ? 'bg-indigo-50/50' : ''}`}>
                    {isComparisonMode && (
                      <td className="px-6 py-5 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedSamplesForComparison.includes(sample.id)}
                          onChange={() => {
                            setSelectedSamplesForComparison(prev => 
                              prev.includes(sample.id) 
                                ? prev.filter(id => id !== sample.id)
                                : [...prev, sample.id]
                            );
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => {
                          setSelectedSampleForDetail(sample);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-all"
                      >
                        {sample.correlativeId}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded border border-slate-100 flex items-center justify-center p-0.5 shrink-0">
                          {getSupplierLogo(sample.codProv || '') ? (
                            <img 
                              src={getSupplierLogo(sample.codProv || '')} 
                              alt={sample.proveedor}
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sample.proveedor)}&background=f1f5f9&color=64748b&bold=true`;
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-slate-300" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{sample.proveedor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {sample.infoRequests?.some(r => !r.response) && (
                            <div className="relative group/alert">
                              <AlertCircle size={14} className="text-orange-500 animate-pulse" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/alert:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-50">
                                Solicitud de información pendiente
                              </div>
                            </div>
                          )}
                          <span className="text-sm font-black text-slate-800 uppercase leading-tight">{sample.descripcionSAP}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 border border-slate-200">V{sample.version || 1}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-indigo-500 uppercase">{sample.categoria || 'Sin Categoría'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-[10px] font-bold text-slate-500 uppercase">
                      {sample.linea}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        sample.marca === 'SOLE' 
                          ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {sample.marca}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {sample.technician ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-lg text-[11px] font-bold text-indigo-700 border border-indigo-100">
                            <User size={12} />
                            {sample.technician}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Inicio: {sample.plannedStartDate}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedSample(sample);
                            setIsAssignModalOpen(true);
                          }}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 mx-auto"
                        >
                          <Plus size={14} />
                          Asignar
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${getProgressColor(sample.inspectionProgress)}`} style={{ width: sample.inspectionProgress === 'completed' ? '100%' : (sample.inspectionProgress === 'in_progress' || sample.inspectionProgress === 'paused') ? '50%' : '0%' }} />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {sample.inspectionProgress === 'completed' ? 'Finalizado' : sample.inspectionProgress === 'in_progress' ? 'En Curso' : sample.inspectionProgress === 'paused' ? 'Pausado' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="relative inline-block">
                        <select 
                          className={`appearance-none pl-8 pr-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer outline-none ${getStatusColor(sample.inspectionStatus)}`}
                          value={sample.inspectionStatus}
                          onChange={(e) => handleStatusChange(sample.id, e.target.value as SampleStatus)}
                        >
                          <option value="Aprobado">Aprobado</option>
                          <option value="Pasó a Comité">Pasó a Comité</option>
                          <option value="Rechazado">Rechazado</option>
                          <option value="Observado">Observado</option>
                          <option value="Tolerado">Tolerado</option>
                          <option value="Inspeccionado sin informe">Sin Informe</option>
                        </select>
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          {getStatusIcon(sample.inspectionStatus)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {sample.reportFile ? (
                        <div className="flex flex-col items-center gap-1">
                          <a 
                            href={sample.reportFile.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" 
                            title="Ver Informe"
                          >
                            <FileText size={20} />
                          </a>
                          <span className="text-[9px] font-bold text-slate-400">{sample.reportDate}</span>
                        </div>
                      ) : (
                        <button 
                          disabled={!canUploadReport}
                          onClick={() => {
                            setSelectedSample(sample);
                            fileInputRef.current?.click();
                          }}
                          className={`p-2 rounded-lg transition-all ${canUploadReport ? 'text-slate-300 hover:text-blue-500 hover:bg-blue-50' : 'text-slate-200 cursor-not-allowed'}`}
                          title={canUploadReport ? "Subir Informe (PDF/PPT)" : "No requiere informe por rechazo"}
                        >
                          <Upload size={20} />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      {timeline !== null ? (
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-black ${timeline > 7 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {timeline} días
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Respuesta</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-bold">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sample.technician && (
                          <>
                            {sample.inspectionProgress !== 'completed' && (
                              <button 
                                onClick={() => {
                                  if (sample.inspectionProgress === 'pending') {
                                    handleStartInspection(sample);
                                  } else {
                                    setSelectedSample(sample);
                                    setIsInspectionModalOpen(true);
                                  }
                                }}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                title={sample.inspectionProgress === 'pending' ? "Iniciar Inspección" : "Continuar Inspección"}
                              >
                                <Play size={18} fill="currentColor" />
                              </button>
                            )}
                            {sample.inspectionProgress === 'completed' && (
                              <button 
                                onClick={() => handleNewInspectionCycle(sample)}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Nuevo Ciclo de Inspección (V2+)"
                              >
                                <Plus size={18} />
                              </button>
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => {
                            if (window.confirm('¿Está seguro de eliminar esta muestra?')) {
                              deleteSample(sample.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden File Input for Report Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf,.ppt,.pptx"
        onChange={(e) => selectedSample && handleReportUpload(e, selectedSample.id)}
      />

      {/* Provider Documents Modal */}
      {isProviderDocsModalOpen && selectedSample && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <FileUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Documentos de Proveedor</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de archivos asociados a la muestra</p>
                </div>
              </div>
              <button onClick={() => setIsProviderDocsModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Archivos Subidos</h4>
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.onchange = (e) => handleProviderDocUpload(e as any, selectedSample.id);
                    input.click();
                  }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={16} />
                  Subir Documentos
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {selectedSample.providerDocuments && selectedSample.providerDocuments.length > 0 ? (
                  selectedSample.providerDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-blue-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 truncate max-w-[300px]">{doc.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento de Proveedor</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => {
                            const updatedDocs = selectedSample.providerDocuments?.filter((_, i) => i !== idx);
                            onUpdateSample(selectedSample.id, { providerDocuments: updatedDocs });
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <FileUp size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay documentos subidos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Sample Modal */}
      {isNewSampleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nueva Muestra</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Registro inicial de producto</p>
                </div>
              </div>
              <button onClick={() => setIsNewSampleModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleNewSample} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                  <input name="descripcion" required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                  <select 
                    name="proveedor" 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  >
                    <option value="">Seleccionar Proveedor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.commercialAlias}>{s.commercialAlias}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select name="categoria" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                    <option value="Encimera">Encimera</option>
                    <option value="Calentador a Gas">Calentador a Gas</option>
                    <option value="Termas Eléctricas">Termas Eléctricas</option>
                    <option value="Campanas">Campanas</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Muestra</label>
                  <select name="tipo" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                    <option value="1">Muestra 1</option>
                    <option value="2">Muestra 2</option>
                    <option value="3">Muestra 3</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                  <select name="marca" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                    <option value="SOLE">SOLE</option>
                    <option value="S-Collection">S-Collection</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea</label>
                  <select name="linea" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                    <option value="LÍNEA BLANCA">LÍNEA BLANCA</option>
                    <option value="AGUA CALIENTE">AGUA CALIENTE</option>
                    <option value="CLIMATIZACIÓN">CLIMATIZACIÓN</option>
                    <option value="PURIFICACIÓN">PURIFICACIÓN</option>
                  </select>
                </div>
                  <UserSelect
                    label="Persona que Recepcionó"
                    name="receivedBy"
                    value=""
                    onChange={() => {}}
                    required
                  />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Ingreso Almacén</label>
                  <input name="warehouseEntryDate" required type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                </div>
              </div>

              {/* Reception Photo Upload */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto de Recepción (Confirmación)</label>
                <div 
                  onClick={() => document.getElementById('reception-photo-input')?.click()}
                  className={`border-2 border-dashed rounded-[24px] p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group ${
                    receptionPhoto ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                  }`}
                >
                  {receptionPhoto ? (
                    <div className="relative w-full max-w-[200px] aspect-video rounded-xl overflow-hidden shadow-md">
                      <img src={receptionPhoto.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar Foto</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                        <ImageIcon size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Subir foto de recepción</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Click para seleccionar archivo</p>
                      </div>
                    </>
                  )}
                  <input
                    id="reception-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleReceptionPhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsNewSampleModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Registrar Muestra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && selectedSample && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Asignar Técnico</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Programación de inspección</p>
                </div>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-8 space-y-6">
                <UserSelect
                  label="Técnico"
                  name="technician"
                  value={selectedSample?.technician || ''}
                  onChange={() => {}}
                  required
                />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Inicio Planeada</label>
                <input name="startDate" required type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
              <div className="flex items-center justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Confirmar Asignación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {isInspectionModalOpen && selectedSample && (
        <InspectionModal 
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          sample={selectedSample}
          onSave={onUpdateSample}
        />
      )}

      {/* Initial Technical Datasheet Modal */}
      {isDatasheetModalOpen && selectedSample && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <FileCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ficha Técnica Inicial</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {selectedSample.descripcionSAP} | V{selectedSample.initialTechnicalDatasheet?.version || 1}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveTab('specs')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'specs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Especificaciones
                  </button>
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Resumen Inspección
                  </button>
                  <button 
                    onClick={() => setActiveTab('comparison')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'comparison' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Comparativa
                  </button>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <Download size={16} />
                  Exportar PDF
                </button>
                <button 
                  onClick={() => {
                    setIsDatasheetModalOpen(false);
                    setComparisonIds([]);
                    setActiveTab('specs');
                  }}
                  className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'specs' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                      <input type="text" readOnly value={selectedSample.marca} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código SAP (Interno)</label>
                      <input type="text" value={selectedSample.codigoSAP || ''} placeholder="Pendiente..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                      <input type="text" readOnly value={selectedSample.proveedor} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Edit3 size={16} className="text-blue-500" />
                      Especificaciones Técnicas
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      {[
                        'Dimensiones', 'Peso', 'Potencia', 'Voltaje', 'Frecuencia', 
                        'Material', 'Color', 'Capacidad', 'Eficiencia Energética', 'Certificaciones'
                      ].map(field => (
                        <div key={field} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                          <span className="text-xs font-bold text-slate-500 w-32">{field}</span>
                          <input 
                            type="text" 
                            placeholder={`Ingresar ${field.toLowerCase()}...`}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                            defaultValue={selectedSample.initialTechnicalDatasheet?.data[field] || ''}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'summary' && (
                <div className="space-y-8">
                  {/* Timer Summary */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tiempo Administrativo</span>
                      <div className="flex items-center gap-3">
                        <Clock className="text-red-500" size={20} />
                        <span className="text-2xl font-black text-slate-900">
                          {selectedSample.inspectionTimer ? formatTime(selectedSample.inspectionTimer.accumulatedTimeMs) : '00:00:00'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tiempo de Inspección</span>
                      <div className="flex items-center gap-3">
                        <Pause className="text-blue-500" size={20} />
                        <span className="text-2xl font-black text-slate-900">
                          {selectedSample.inspectionTimer ? formatTime(selectedSample.inspectionTimer.idleTimeMs) : '00:00:00'}
                        </span>
                      </div>
                    </div>
                    <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-600/20 text-white">
                      <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Eficiencia</span>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} />
                        <span className="text-2xl font-black">
                          {selectedSample.inspectionTimer && selectedSample.inspectionTimer.accumulatedTimeMs > 0 
                            ? Math.round((selectedSample.inspectionTimer.accumulatedTimeMs / (selectedSample.inspectionTimer.accumulatedTimeMs + selectedSample.inspectionTimer.idleTimeMs)) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form Summary with Photos */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      Hallazgos y Evidencia Fotográfica
                    </h4>
                    <div className="space-y-4">
                      {selectedSample.inspectionForm?.map(section => (
                        <div key={section.id} className="border border-slate-100 rounded-3xl overflow-hidden">
                          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{section.title}</span>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {section.fields.map(field => (
                              <div key={field.id} className="p-6 flex gap-6">
                                <div className="w-1/3">
                                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">{field.label}</span>
                                  <p className="text-sm font-bold text-slate-700">{field.value || 'Sin observaciones'}</p>
                                </div>
                                <div className="flex-1 flex gap-2 overflow-x-auto pb-2">
                                  {field.photos.map((photo, i) => (
                                    <img 
                                      key={i} 
                                      src={photo.url} 
                                      alt="Evidencia" 
                                      className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                                      referrerPolicy="no-referrer"
                                    />
                                  ))}
                                  {field.photos.length === 0 && (
                                    <div className="w-24 h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">
                                      Sin fotos
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Summary */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      Estado de Procedimientos
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSample.workflow?.map(stage => (
                        <div key={stage.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              stage.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                              stage.status === 'observed' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-50 text-slate-400'
                            }`}>
                              {stage.status === 'approved' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{stage.stage}</p>
                              {stage.comment && <p className="text-[10px] text-slate-400 font-medium">{stage.comment}</p>}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            stage.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            stage.status === 'observed' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {stage.status === 'approved' ? 'Aprobado' : stage.status === 'observed' ? 'Observado' : 'Pendiente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comparison' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Plus size={16} className="text-blue-500" />
                      Añadir Inspecciones para Comparar
                    </h4>
                    <div className="flex gap-2">
                      {samples
                        .filter(s => s.id !== selectedSample.id && !comparisonIds.includes(s.id))
                        .slice(0, 3)
                        .map(s => (
                          <button 
                            key={s.id}
                            onClick={() => setComparisonIds([...comparisonIds, s.id])}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all"
                          >
                            + {s.descripcionSAP}
                          </button>
                        ))
                      }
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex gap-6 min-w-max pb-4">
                      {/* Main Sample */}
                      <div className="w-80 shrink-0 space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Muestra Actual</span>
                          <p className="text-sm font-black text-blue-900 uppercase">{selectedSample.descripcionSAP}</p>
                          <p className="text-[10px] font-bold text-blue-600">{selectedSample.proveedor}</p>
                        </div>
                        {selectedSample.inspectionForm?.map(section => (
                          <div key={section.id} className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{section.title}</h5>
                            {section.fields.map(field => (
                              <div key={field.id} className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{field.label}</span>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-xs font-bold text-slate-700">{field.value || '-'}</p>
                                  {field.photos.length > 0 && (
                                    <div className="flex gap-1 mt-2 overflow-x-auto">
                                      {field.photos.map((p, i) => (
                                        <img key={i} src={p.url} className="w-10 h-10 object-cover rounded-md border border-slate-200" referrerPolicy="no-referrer" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        {/* Gallery Comparison */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon size={14} className="text-indigo-500" />
                            Galería de Imágenes
                          </h5>
                          {selectedSample.gallery && selectedSample.gallery.length > 0 ? (
                            <div className="space-y-4">
                              {selectedSample.gallery.map(item => (
                                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                  <p className="text-[9px] font-black text-slate-900 uppercase">{item.category}</p>
                                  <div className="grid grid-cols-3 gap-1">
                                    {item.photos.map((p, i) => (
                                      <img key={i} src={p.url} className="w-full aspect-square object-cover rounded-md border border-slate-200" referrerPolicy="no-referrer" />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-slate-400 italic">Sin imágenes en galería</p>
                          )}
                        </div>
                      </div>

                      {/* Comparison Samples */}
                      {comparisonIds.map(id => {
                        const compSample = samples.find(s => s.id === id);
                        if (!compSample) return null;
                        return (
                          <div key={id} className="w-80 shrink-0 space-y-6 border-l border-slate-100 pl-6">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                              <button 
                                onClick={() => setComparisonIds(comparisonIds.filter(cid => cid !== id))}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Comparativa</span>
                              <p className="text-sm font-black text-slate-800 uppercase">{compSample.descripcionSAP}</p>
                              <p className="text-[10px] font-bold text-slate-500">{compSample.proveedor}</p>
                            </div>
                            {compSample.inspectionForm?.map(section => (
                              <div key={section.id} className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">{section.title}</h5>
                                {section.fields.map(field => (
                                  <div key={field.id} className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{field.label}</span>
                                    <div className="p-3 bg-white rounded-xl border border-slate-100">
                                      <p className="text-xs font-bold text-slate-700">{field.value || '-'}</p>
                                      {field.photos.length > 0 && (
                                        <div className="flex gap-1 mt-2 overflow-x-auto">
                                          {field.photos.map((p, i) => (
                                            <img key={i} src={p.url} className="w-10 h-10 object-cover rounded-md border border-slate-200" referrerPolicy="no-referrer" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}

                            {/* Gallery Comparison for Comp Sample */}
                            <div className="space-y-4 pt-6 border-t border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={14} className="text-indigo-500" />
                                Galería de Imágenes
                              </h5>
                              {compSample.gallery && compSample.gallery.length > 0 ? (
                                <div className="space-y-4">
                                  {compSample.gallery.map(item => (
                                    <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                                      <p className="text-[9px] font-black text-slate-900 uppercase">{item.category}</p>
                                      <div className="grid grid-cols-3 gap-1">
                                        {item.photos.map((p, i) => (
                                          <img key={i} src={p.url} className="w-full aspect-square object-cover rounded-md border border-slate-200" referrerPolicy="no-referrer" />
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-400 italic">Sin imágenes en galería</p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {comparisonIds.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <Plus className="text-slate-300" size={32} />
                          </div>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Añade otras inspecciones para comparar resultados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Clock size={14} />
                Última modificación: {selectedSample.initialTechnicalDatasheet?.lastModified || 'Hoy'} por {selectedSample.initialTechnicalDatasheet?.modifiedBy || 'Carlos H.'}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setIsDatasheetModalOpen(false);
                    setComparisonIds([]);
                    setActiveTab('specs');
                  }}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
                >
                  Cerrar
                </button>
                {activeTab === 'specs' && (
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                    <Save size={18} />
                    Guardar Cambios
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sample Detail Modal */}
      {isDetailModalOpen && selectedSampleForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <LayoutGrid size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                    Resumen de Muestra: {selectedSampleForDetail.correlativeId}
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-black border border-indigo-200">V{selectedSampleForDetail.version || 1}</span>
                  </h3>
                  <p className="text-slate-500 font-medium">{selectedSampleForDetail.descripcionSAP}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Proveedor</span>
                  <p className="text-sm font-black text-slate-800 uppercase">{selectedSampleForDetail.proveedor}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Código: {selectedSampleForDetail.codProv || '-'}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Línea / Marca</span>
                  <p className="text-sm font-black text-slate-800 uppercase">{selectedSampleForDetail.linea}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Marca: {selectedSampleForDetail.marca}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estado de Inspección</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedSampleForDetail.inspectionStatus)}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(selectedSampleForDetail.inspectionStatus)}`}>
                      {selectedSampleForDetail.inspectionStatus}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 md:col-span-3 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FileCheck size={16} className="text-emerald-500" />
                      Datos de Recepción
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Recepcionado por</span>
                        <p className="text-sm font-bold text-slate-700">{selectedSampleForDetail.receivedBy || 'No registrado'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha Ingreso Almacén</span>
                        <p className="text-sm font-bold text-slate-700">{selectedSampleForDetail.warehouseEntryDate ? format(parseISO(selectedSampleForDetail.warehouseEntryDate), 'dd/MM/yyyy') : 'No registrada'}</p>
                      </div>
                    </div>
                  </div>
                  {selectedSampleForDetail.receptionPhoto && (
                    <div className="w-full md:w-48 space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Foto de Recepción</span>
                      <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500/20 transition-all">
                        <img 
                          src={selectedSampleForDetail.receptionPhoto.url} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          onClick={() => window.open(selectedSampleForDetail.receptionPhoto?.url, '_blank')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon size={20} className="text-indigo-500" />
                    Galería de Imágenes
                  </h4>
                  <button 
                    onClick={() => setIsGalleryUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <Plus size={16} />
                    Añadir a Galería
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedSampleForDetail.gallery && selectedSampleForDetail.gallery.length > 0 ? (
                    selectedSampleForDetail.gallery.map((item) => (
                      <div key={item.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm group">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.category}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{format(parseISO(item.uploadDate), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-2">
                          {item.photos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group/photo">
                              <img 
                                src={photo.url} 
                                alt={photo.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                <a href={photo.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-all">
                                  <Maximize2 size={16} />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                        <ImageIcon className="text-slate-300" size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay imágenes en la galería</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Añade imágenes para documentar visualmente la muestra</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inspection Form Summary */}
              {selectedSampleForDetail.inspectionForm && (
                <div className="space-y-6">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FileCheck size={20} className="text-emerald-500" />
                    Resumen de Inspección Técnica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedSampleForDetail.inspectionForm.map((section) => (
                      <div key={section.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">{section.title}</h5>
                        <div className="space-y-3">
                          {section.fields.map(field => (
                            <div key={field.id} className="flex items-start justify-between gap-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{field.label}</span>
                              <span className="text-[10px] font-black text-slate-700 text-right">{field.value || '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider Documents Section */}
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FileUp size={20} className="text-blue-600" />
                    Documentos del Proveedor
                  </h4>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.onchange = (e) => handleProviderDocUpload(e as any, selectedSampleForDetail.id);
                      input.click();
                    }}
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <Plus size={16} />
                    Añadir Documentos
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedSampleForDetail.providerDocuments && selectedSampleForDetail.providerDocuments.length > 0 ? (
                    selectedSampleForDetail.providerDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner text-blue-500">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 uppercase truncate">
                              {doc.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Archivo adjunto
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            onClick={() => {
                              const updatedDocs = selectedSampleForDetail.providerDocuments?.filter((_, i) => i !== idx);
                              onUpdateSample(selectedSampleForDetail.id, { providerDocuments: updatedDocs });
                              setSelectedSampleForDetail(prev => prev ? { ...prev, providerDocuments: updatedDocs } : null);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                      <FileUp className="text-slate-200 mb-2" size={32} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay documentos cargados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Calculations Section */}
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <FlaskConical size={20} className="text-blue-500" />
                    Ensayos / Cálculos Relacionados
                  </h4>
                  <button 
                    onClick={() => setIsAddCalculationModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all border border-blue-100"
                  >
                    <Plus size={16} />
                    Vincular Ensayo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSampleForDetail.calculationIds && selectedSampleForDetail.calculationIds.length > 0 ? (
                    selectedSampleForDetail.calculationIds.map(calcId => {
                      const record = allCalculationRecords.find(r => r.id === calcId);
                      if (!record) return null;
                      
                      const getCalcIcon = (modId: string) => {
                        if (modId.includes('absorption')) return <Wind size={18} className="text-blue-500" />;
                        if (modId.includes('gas_heater')) return <FlaskConical size={18} className="text-emerald-500" />;
                        if (modId.includes('water_demand')) return <Droplets size={18} className="text-indigo-500" />;
                        if (modId.includes('oven')) return <Flame size={18} className="text-orange-500" />;
                        if (modId.includes('temperature')) return <Thermometer size={18} className="text-rose-500" />;
                        return <Database size={18} className="text-slate-500" />;
                      };

                      return (
                        <div key={calcId} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                          <div 
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => {
                              if (onLoadRecord && record.record_data) {
                                try {
                                  const data = JSON.parse(record.record_data);
                                  onLoadRecord(record.module_id, data);
                                } catch (e) {
                                  toast.error('Error al analizar los datos del ensayo');
                                }
                              } else {
                                toast.error('No se pudieron cargar los datos de este ensayo');
                              }
                            }}
                          >
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-blue-50 transition-colors">
                              {getCalcIcon(record.module_id)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase truncate max-w-[200px] group-hover:text-blue-600 transition-colors">
                                {record.project_name || 'Cálculo sin nombre'}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {record.module_id.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-lg uppercase">
                              {format(parseISO(record.timestamp), 'dd/MM/yy')}
                            </span>
                            <button 
                              onClick={() => {
                                const updatedIds = selectedSampleForDetail.calculationIds?.filter(id => id !== calcId);
                                onUpdateSample(selectedSampleForDetail.id, { calculationIds: updatedIds });
                                setSelectedSampleForDetail(prev => prev ? { ...prev, calculationIds: updatedIds } : null);
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                      <Database className="text-slate-200 mb-2" size={32} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay ensayos vinculados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-indigo-600 text-white px-12 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Comparison View */}
      {isFullComparisonOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[200] flex flex-col animate-in fade-in duration-300">
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Copy size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Comparativo de Muestras</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Análisis detallado de {comparisonIds.length} inspecciones</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleExportComparison}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                <FileSpreadsheet size={20} />
                Exportar Excel
              </button>
              <button 
                onClick={() => setIsFullComparisonOpen(false)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8">
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-6 text-left text-xs font-black uppercase tracking-widest border-r border-white/10 w-[250px] sticky left-0 top-0 z-30 bg-slate-900">
                      Campo / Especificación
                    </th>
                    {comparisonIds.map((id, idx) => {
                      const sample = samples.find(s => s.id === id);
                      return (
                        <th key={id} className="p-6 text-center border-r border-white/10 min-w-[350px] sticky top-0 z-20 bg-slate-900">
                          <div className="flex flex-col items-center gap-2">
                            <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-xs font-black">
                              {idx + 1}
                            </span>
                            <h4 className="text-lg font-black uppercase tracking-tight leading-none">{sample?.correlativeId}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Versión {sample?.version || 1}</p>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Basic Info Section */}
                  <tr className="bg-indigo-50/50">
                    <td colSpan={comparisonIds.length + 1} className="px-6 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest sticky left-0 z-10 bg-indigo-50/50">
                      Información General
                    </td>
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Descripción SAP</td>
                    {comparisonIds.map(id => (
                      <td key={id} className="p-6 text-sm font-black text-slate-800 uppercase text-center border-r border-slate-100">
                        {samples.find(s => s.id === id)?.descripcionSAP}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Proveedor</td>
                    {comparisonIds.map(id => (
                      <td key={id} className="p-6 text-xs font-bold text-slate-700 uppercase text-center border-r border-slate-100">
                        {samples.find(s => s.id === id)?.proveedor}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Marca</td>
                    {comparisonIds.map(id => (
                      <td key={id} className="p-6 text-xs font-bold text-slate-700 uppercase text-center border-r border-slate-100">
                        {samples.find(s => s.id === id)?.marca}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Línea</td>
                    {comparisonIds.map(id => (
                      <td key={id} className="p-6 text-xs font-bold text-slate-700 uppercase text-center border-r border-slate-100">
                        {samples.find(s => s.id === id)?.linea || '-'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Estado</td>
                    {comparisonIds.map(id => {
                      const sample = samples.find(s => s.id === id);
                      return (
                        <td key={id} className="p-6 text-center border-r border-slate-100">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(sample?.inspectionStatus || '')}`}>
                            {sample?.inspectionStatus}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Gallery Section */}
                  <tr className="bg-indigo-50/50">
                    <td colSpan={comparisonIds.length + 1} className="px-6 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest sticky left-0 z-10 bg-indigo-50/50">
                      Galería de Imágenes
                    </td>
                  </tr>
                  <tr>
                    <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">Evidencia Visual</td>
                    {comparisonIds.map(id => {
                      const sample = samples.find(s => s.id === id);
                      return (
                        <td key={id} className="p-6 border-r border-slate-100">
                          {sample?.gallery && sample.gallery.length > 0 ? (
                            <div className="flex flex-wrap gap-4 justify-center">
                              {sample.gallery.map(item => (
                                <div key={item.id} className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-500 uppercase text-center bg-slate-100 py-1 px-2 rounded-md">{item.category}</p>
                                  <div className="flex gap-2 justify-center">
                                    {item.photos.slice(0, 3).map((p, i) => (
                                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm group relative">
                                        <img src={p.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <Maximize2 size={12} className="text-white" />
                                        </a>
                                      </div>
                                    ))}
                                    {item.photos.length > 3 && (
                                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        +{item.photos.length - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-slate-300 uppercase text-center italic">Sin imágenes</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Technical Sections */}
                  {(() => {
                    const selectedSamples = samples.filter(s => comparisonIds.includes(s.id));
                    const allSections = new Set<string>();
                    selectedSamples.forEach(s => {
                      s.inspectionForm?.forEach(sec => allSections.add(sec.title));
                    });

                    return Array.from(allSections).map(sectionTitle => {
                      const allFields = new Set<string>();
                      selectedSamples.forEach(s => {
                        const section = s.inspectionForm?.find(sec => sec.title === sectionTitle);
                        section?.fields.forEach(f => allFields.add(f.label));
                      });

                      return (
                        <React.Fragment key={sectionTitle}>
                          <tr className="bg-indigo-50/50">
                            <td colSpan={comparisonIds.length + 1} className="px-6 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest sticky left-0 z-10 bg-indigo-50/50">
                              {sectionTitle}
                            </td>
                          </tr>
                          {Array.from(allFields).map(fieldLabel => (
                            <tr key={fieldLabel} className="hover:bg-slate-50 transition-colors">
                              <td className="p-6 text-xs font-bold text-slate-500 uppercase bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">{fieldLabel}</td>
                              {comparisonIds.map(id => {
                                const sample = samples.find(s => s.id === id);
                                const section = sample?.inspectionForm?.find(sec => sec.title === sectionTitle);
                                const field = section?.fields.find(f => f.label === fieldLabel);
                                return (
                                  <td key={id} className="p-6 text-[11px] font-black text-slate-700 text-center border-r border-slate-100">
                                    {field?.value || <span className="text-slate-300">-</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Gallery Upload Modal */}
      {isGalleryUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Añadir a Galería</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sube fotos y asígnalas a una categoría</p>
              </div>
              <button 
                onClick={() => {
                  setIsGalleryUploadModalOpen(false);
                  setTempGalleryPhotos([]);
                  setGalleryCategory('');
                }}
                className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Category Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría de la Galería</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Tag size={18} />
                  </div>
                  <input
                    type="text"
                    value={galleryCategory}
                    onChange={(e) => setGalleryCategory(e.target.value)}
                    placeholder="Ej: Empaque, Producto, Defectos, Manuales..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Empaque', 'Producto', 'Defectos', 'Manuales', 'Etiquetas'].map(cat => (
                    <button
                      key={cat}
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

              {/* Photo Upload Area */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotos para subir</label>
                <div 
                  onClick={() => document.getElementById('gallery-file-input')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Seleccionar fotos</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Puedes subir múltiples archivos a la vez</p>
                  </div>
                  <input
                    id="gallery-file-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryPhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Preview Area */}
              {tempGalleryPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa ({tempGalleryPhotos.length})</label>
                    <button 
                      onClick={() => setTempGalleryPhotos([])}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                    >
                      Limpiar Todo
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 max-h-[240px] overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {tempGalleryPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                        <img src={photo.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setTempGalleryPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => {
                  setIsGalleryUploadModalOpen(false);
                  setTempGalleryPhotos([]);
                  setGalleryCategory('');
                }}
                className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmGalleryUpload}
                disabled={!galleryCategory || tempGalleryPhotos.length === 0}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Confirmar Subida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Calculation Modal */}
      {isAddCalculationModalOpen && selectedSampleForDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Vincular un Ensayo</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Filtrado por: {selectedSampleForDetail.categoria || selectedSampleForDetail.linea}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddCalculationModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-white rounded-xl transition-all"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-4">
              {(() => {
                const category = selectedSampleForDetail.categoria?.toLowerCase() || '';
                const linea = selectedSampleForDetail.linea?.toLowerCase() || '';
                const relevantModules: string[] = [];

                if (category.includes('campana') || category.includes('ventilación') || linea.includes('ventilación')) {
                  relevantModules.push('absorption_calculation');
                }
                if (category.includes('calentador') || category.includes('agua caliente') || linea.includes('agua caliente') || category.includes('termas')) {
                  relevantModules.push('gas_heater_experimental', 'water_demand');
                }
                if (category.includes('horno') || category.includes('encimera') || category.includes('empotre')) {
                  relevantModules.push('oven_experimental');
                }
                if (category.includes('grifería') || category.includes('purificación') || linea.includes('purificación')) {
                  relevantModules.push('temperature_loss', 'cr_ni_coating_analysis');
                }

                const filtered = allCalculationRecords.filter(r => 
                  (relevantModules.length === 0 || relevantModules.includes(r.module_id)) &&
                  !selectedSampleForDetail.calculationIds?.includes(r.id)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                      <Database size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No se encontraron ensayos adicionales relevantes</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-2">Los cálculos deben ser registrados previamente en el Panel de Cálculos</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-4">Selecciona los ensayos para vincular:</p>
                    {filtered.map(record => {
                      const getIcon = (modId: string) => {
                        if (modId.includes('absorption')) return <Wind size={20} />;
                        if (modId.includes('gas_heater')) return <FlaskConical size={20} />;
                        if (modId.includes('water_demand')) return <Droplets size={20} />;
                        if (modId.includes('oven')) return <Flame size={20} />;
                        if (modId.includes('temperature')) return <Thermometer size={20} />;
                        return <Database size={20} />;
                      };

                      return (
                        <button
                          key={record.id}
                          onClick={() => {
                            const currentIds = selectedSampleForDetail.calculationIds || [];
                            const updatedIds = [...currentIds, record.id];
                            onUpdateSample(selectedSampleForDetail.id, { calculationIds: updatedIds });
                            setSelectedSampleForDetail(prev => prev ? { ...prev, calculationIds: updatedIds } : null);
                            toast.success('Ensayo vinculado correctamente');
                          }}
                          className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                              {getIcon(record.module_id)}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                                {record.project_name || 'Cálculo sin nombre'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.module_id.replace(/_/g, ' ')}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(record.timestamp), "d MMM yyyy", { locale: es })}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setIsAddCalculationModalOpen(false)}
                className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
