import React, { useState, useMemo } from 'react';
import { EnergyEfficiencyRecord, SampleRecord, FileInfo, EnergyEfficiencyDocument } from '../types';
import { 
  Search, Plus, Filter, Download, Calendar, 
  FileText, Upload, Trash2, Edit2, X, Check,
  Zap, Eye, Link as LinkIcon, Image as ImageIcon, Tag,
  History as HistoryIcon, User, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { toast } from 'sonner';

interface EnergyEfficiencyProps {
  records: EnergyEfficiencyRecord[];
  samples: SampleRecord[];
  onAddRecord: (record: Omit<EnergyEfficiencyRecord, 'id' | 'createdAt'>) => void;
  onUpdateRecord: (record: EnergyEfficiencyRecord) => void;
  onDeleteRecord: (id: string) => void;
  onExportPPT?: () => void;
}

export default function EnergyEfficiency({ 
  records, 
  samples, 
  onAddRecord, 
  onUpdateRecord, 
  onDeleteRecord, 
  onExportPPT 
}: EnergyEfficiencyProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleGalleryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos: FileInfo[] = Array.from(files).map((f: File) => ({
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type,
        originalName: f.name
      }));
      setTempGalleryPhotos(prev => [...prev, ...newPhotos]);
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

      onUpdateRecord(updatedRecord);
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
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.codigoMT.toLowerCase().includes(lowerSearch) ||
        r.descripcion.toLowerCase().includes(lowerSearch) ||
        r.proveedor.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [records, searchTerm]);

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
    const [certificadoHistory, setCertificadoHistory] = useState<EnergyEfficiencyDocument[]>(record?.certificadoHistory || []);
    const [etiquetaHistory, setEtiquetaHistory] = useState<EnergyEfficiencyDocument[]>(record?.etiquetaHistory || []);
    const [gallery, setGallery] = useState<any[]>(record?.gallery || []);

    const handleFileUpload = (type: 'certificado' | 'etiqueta', e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const mockFile: FileInfo = {
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          originalName: file.name
        };
        
        if (type === 'certificado') {
          if (certificado) {
            const historyEntry: EnergyEfficiencyDocument = {
              ...certificado,
              version: certificadoHistory.length + 1,
              uploadDate: new Date().toISOString(),
              uploadedBy: user?.name || 'Sistema',
              changeDescription: 'Nueva versión cargada'
            };
            setCertificadoHistory(prev => [historyEntry, ...prev]);
          }
          setCertificado(mockFile);
        } else {
          if (etiqueta) {
            const historyEntry: EnergyEfficiencyDocument = {
              ...etiqueta,
              version: etiquetaHistory.length + 1,
              uploadDate: new Date().toISOString(),
              uploadedBy: user?.name || 'Sistema',
              changeDescription: 'Nueva versión cargada'
            };
            setEtiquetaHistory(prev => [historyEntry, ...prev]);
          }
          setEtiqueta(mockFile);
        }
        toast.success(`${type === 'certificado' ? 'Certificado' : 'Etiqueta'} cargado correctamente`);
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

    const handlePhotoUpload = (galleryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newPhotos: FileInfo[] = Array.from(files).map((f: File) => ({
          name: f.name,
          url: URL.createObjectURL(f),
          type: f.type
        }));

        setGallery(prev => prev.map(g => 
          g.id === galleryId 
            ? { ...g, photos: [...g.photos, ...newPhotos] }
            : g
        ));
        toast.success('Fotos añadidas a la galería');
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
            const data = {
              codigoMT: formData.get('codigoMT') as string,
              descripcion: formData.get('descripcion') as string,
              letra: formData.get('letra') as string,
              porcentajeEE: formData.get('porcentajeEE') as string,
              ocp: formData.get('ocp') as string,
              proveedor: formData.get('proveedor') as string,
              fechaEmision: formData.get('fechaEmision') as string,
              fechaVigilancia: formData.get('fechaVigilancia') as string,
              tipoProducto: formData.get('tipoProducto') as string,
              sampleId: formData.get('sampleId') as string || undefined,
              certificadoFile: certificado,
              certificadoHistory: certificadoHistory,
              etiquetaFile: etiqueta,
              etiquetaHistory: etiquetaHistory,
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
              <input name="proveedor" defaultValue={record?.proveedor} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Emisión</label>
              <input type="date" name="fechaEmision" defaultValue={record?.fechaEmision} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Vigilancia</label>
              <input type="date" name="fechaVigilancia" defaultValue={record?.fechaVigilancia} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Producto</label>
              <input name="tipoProducto" defaultValue={record?.tipoProducto} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
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
            
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificado (PDF/JPG)</label>
                <label className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${certificado ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}>
                  {certificado ? <FileText size={24} /> : <Upload size={24} />}
                  <span className="text-[10px] font-black uppercase">{certificado ? certificado.name : 'Subir Certificado'}</span>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload('certificado', e)} />
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta (PDF/JPG)</label>
                <label className={`w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${etiqueta ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'}`}>
                  {etiqueta ? <ImageIcon size={24} /> : <Upload size={24} />}
                  <span className="text-[10px] font-black uppercase">{etiqueta ? etiqueta.name : 'Subir Etiqueta'}</span>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload('etiqueta', e)} />
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
                            accept="image/*"
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
                        <div key={pIdx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                    <p className="text-sm font-bold text-slate-700">{record.tipoProducto}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigencia</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium tracking-tight">Emisión:</span>
                    <span className="font-bold text-slate-700">{record.fechaEmision}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium tracking-tight">Vigilancia:</span>
                    <span className="font-bold text-slate-700">{record.fechaVigilancia}</span>
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
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase">Etiqueta</p>
                          <p className="text-[10px] text-slate-400 font-medium">{record.etiquetaFile.name}</p>
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
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa</h4>
                <div className="aspect-video bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                  {record.etiquetaFile ? (
                    <img 
                      src={record.etiquetaFile.type.includes('image') ? record.etiquetaFile.url : "https://picsum.photos/seed/energy/800/450"} 
                      alt="Vista previa" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
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
      'Proveedor': r.proveedor,
      'Emisión': r.fechaEmision,
      'Vigilancia': r.fechaVigilancia,
      'Tipo': r.tipoProducto
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código MT / Descripción</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Letra / % EE</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor / OCP</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vigencia</th>
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
                      <span className="text-xs font-bold text-slate-700 uppercase">{record.proveedor}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase">{record.ocp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vence</span>
                      <span className="text-xs font-bold text-slate-700">{record.fechaVigilancia}</span>
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
                              onDeleteRecord(record.id);
                              setDeleteConfirm(null);
                              toast.success('Registro eliminado');
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
          title="Nuevo Registro de Eficiencia"
          onCancel={() => setShowAddModal(false)}
          onSubmit={(data) => {
            onAddRecord(data);
            setShowAddModal(false);
          }}
        />
      )}

      {editingRecord && (
        <RecordForm 
          title="Editar Registro de Eficiencia"
          record={editingRecord}
          onCancel={() => setEditingRecord(null)}
          onSubmit={(data) => {
            onUpdateRecord({ ...editingRecord, ...data });
            setEditingRecord(null);
          }}
        />
      )}

      {viewingRecord && <DetailModal record={viewingRecord} />}

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
                    <p className="text-[10px] font-medium text-slate-400 uppercase mt-1">JPG, PNG hasta 10MB</p>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
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
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
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
