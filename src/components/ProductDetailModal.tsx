import React, { useState } from 'react';
import { X, FileText, CheckCircle, ThumbsDown, Clock, Minus, Eye, Image as ImageIcon, Tag, Plus, Upload, Beaker, Wind, FlaskConical, Droplets, Thermometer, Flame, Database, ChevronRight, MessageSquare } from 'lucide-react';
import { ProductRecord, DocumentVersion, Approval, Supplier, SampleRecord, FileInfo, CalculationRecord, ModuleId, PDFComment } from '../types';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import PDFReviewer from './PDFReviewer';
import { SupabaseService } from '../lib/SupabaseService';

interface ProductDetailModalProps {
  record: ProductRecord | null;
  suppliers: Supplier[];
  samples: SampleRecord[];
  calculationRecords?: CalculationRecord[];
  onClose: () => void;
  onUpdateRecord?: (id: string, updates: Partial<ProductRecord>) => void;
  onLoadRecord?: (moduleId: ModuleId, data: any) => void;
}

export default function ProductDetailModal({ 
  record, 
  suppliers, 
  samples, 
  calculationRecords = [], 
  onClose, 
  onUpdateRecord,
  onLoadRecord
}: ProductDetailModalProps) {
  const [isGalleryUploadModalOpen, setIsGalleryUploadModalOpen] = React.useState(false);
  const [tempGalleryPhotos, setTempGalleryPhotos] = React.useState<FileInfo[]>([]);
  const [galleryCategory, setGalleryCategory] = React.useState('');
  
  // State for Reviewer
  const [reviewingVersion, setReviewingVersion] = useState<{version: DocumentVersion, type: string} | null>(null);

  if (!record) return null;

  const handleUpdateComments = (newComments: PDFComment[]) => {
    if (!reviewingVersion || !onUpdateRecord) return;

    const listKey = reviewingVersion.type === 'artwork' ? 'artworks' : 
                    reviewingVersion.type === 'technical_sheet' ? 'technicalSheets' : 
                    'commercialSheets';

    const currentList = (record as any)[listKey] as DocumentVersion[];
    const updatedList = currentList.map(v => 
      v.version === reviewingVersion.version.version ? { ...v, pdfComments: newComments } : v
    );

    onUpdateRecord(record.id, { [listKey]: updatedList });
    setReviewingVersion(prev => prev ? { ...prev, version: { ...prev.version, pdfComments: newComments } } : null);
  };

  const handleGalleryPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      toast.loading('Subiendo fotos...');
      try {
        const uploadedPhotos: FileInfo[] = [];
        for (const f of Array.from(files) as File[]) {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `products/gallery/${Date.now()}_${f.name}`, f) as any;
          uploadedPhotos.push({
            name: f.name,
            url: fileInfo.url,
            type: f.type
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
    if (!record || !galleryCategory || tempGalleryPhotos.length === 0 || !onUpdateRecord) return;

    const newGalleryItem = {
      id: `GAL-${Date.now()}`,
      category: galleryCategory,
      photos: tempGalleryPhotos,
      uploadDate: new Date().toISOString()
    };

    onUpdateRecord(record.id, {
      gallery: [...(record.gallery || []), newGalleryItem]
    });

    setIsGalleryUploadModalOpen(false);
    setTempGalleryPhotos([]);
    setGalleryCategory('');
  };

  const getSupplierLogo = (codProv: string) => {
    const supplier = suppliers.find(s => s.erpCode === codProv);
    return supplier?.logoUrl;
  };

  const getSampleInfo = (sampleId?: string) => {
    if (!sampleId) return null;
    return samples.find(s => s.id === sampleId);
  };

  const getCalcIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'absorption_calculation': return <Wind size={18} className="text-blue-500" />;
      case 'gas_heater_experimental': return <FlaskConical size={18} className="text-emerald-500" />;
      case 'water_demand': return <Droplets size={18} className="text-cyan-500" />;
      case 'oven_experimental': return <Flame size={18} className="text-orange-500" />;
      case 'temperature_loss': return <Thermometer size={18} className="text-rose-500" />;
      case 'cr_ni_coating_analysis': return <Database size={18} className="text-slate-500" />;
      default: return <Beaker size={18} className="text-indigo-500" />;
    }
  };

  const linkedSample = getSampleInfo(record.sampleId);

  // Filter calculation records related to this sample
  const relatedCalculations = record.sampleId 
    ? calculationRecords.filter(calc => calc.sample_id === record.sampleId || (linkedSample && calc.sample_id === linkedSample.correlativeId))
    : [];

  const renderApprovalStatus = (approval: Approval, label: string, isArtwork: boolean = true) => {
    let icon = <Minus size={16} className="text-gray-400" />;
    let textClass = 'text-gray-500';
    let statusText = 'No aplica';

    if (approval.status === 'approved') {
      icon = <CheckCircle size={16} className="text-emerald-500" />;
      textClass = 'text-emerald-700';
      statusText = `Aprobado por ${approval.user || 'Usuario'} el ${approval.date || ''}`;
    } else if (approval.status === 'rejected') {
      const isObservation = isArtwork && (label === 'Proveedor' || label === 'Planeamiento');
      icon = isObservation ? <Eye size={16} className="text-blue-500" /> : <ThumbsDown size={16} className="text-red-500" />;
      textClass = isObservation ? 'text-blue-700' : 'text-red-700';
      statusText = `${isObservation ? 'Observado' : 'Rechazar'} por ${approval.user || 'Usuario'} el ${approval.date || ''}`;
    } else if (approval.status === 'pending') {
      icon = <Clock size={16} className="text-amber-500" />;
      textClass = 'text-amber-700';
      statusText = 'Pendiente de aprobación';
    }

    return (
      <div className="flex flex-col gap-1 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</span>
        </div>
        <p className={`text-xs ${textClass} font-medium`}>{statusText}</p>
        {approval.comments && (
          <p className="text-xs text-gray-600 mt-1 italic bg-gray-50 p-2 rounded border border-gray-100">
            "{approval.comments}"
          </p>
        )}
      </div>
    );
  };

  const renderVersionHistory = (versions: DocumentVersion[], title: string, type: 'artwork' | 'technical_sheet' | 'commercial_sheet' = 'artwork') => {
    if (!versions || versions.length === 0) {
      return null;
    }

    const isArtwork = type === 'artwork';

    // Group versions by category and subcategory
    const groupedVersions: Record<string, DocumentVersion[]> = {};
    versions.forEach(v => {
      const key = isArtwork ? `${v.category || 'General'} - ${v.subcategory || 'General'}` : 'Documento';
      if (!groupedVersions[key]) groupedVersions[key] = [];
      groupedVersions[key].push(v);
    });

    return (
      <div className="space-y-8">
        <h4 className="text-lg font-black text-slate-900 border-b-2 border-slate-100 pb-3 flex items-center gap-2">
          <Clock size={20} className="text-slate-400" />
          {title}
        </h4>
        
        {Object.entries(groupedVersions).map(([groupName, groupVersions]) => (
          <div key={groupName} className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-indigo-500" />
              <h5 className="text-sm font-black text-slate-700 uppercase tracking-wider">{groupName}</h5>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {groupVersions.sort((a, b) => b.version - a.version).map((v, idx) => (
                <div key={idx} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl border border-indigo-100">
                        <FileText size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h6 className="font-black text-slate-900">Versión V{v.version}</h6>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                            {v.uploadDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Subido por <span className="text-slate-700 font-bold">{v.uploadedBy}</span></p>
                      </div>
                    </div>
                    {v.aplicaA && (
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                        Aplica a: {v.aplicaA}
                      </span>
                    )}
                  </div>

                  {v.changeDescription && (
                    <div className="mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Eye size={12} />
                        Cambios realizados:
                      </p>
                      <p className="text-xs text-blue-700 font-medium leading-relaxed">
                        {v.changeDescription}
                      </p>
                    </div>
                  )}

                  <div className={`grid grid-cols-1 gap-3 mb-4 ${isArtwork ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-1'}`}>
                    {renderApprovalStatus(v.idApproval, 'I+D', isArtwork)}
                    {isArtwork && (
                      <>
                        {renderApprovalStatus(v.mktApproval, 'Marketing', true)}
                        {renderApprovalStatus(v.planApproval, 'Planeamiento', true)}
                        {renderApprovalStatus(v.provApproval, 'Proveedor', true)}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-50 items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {v.files.map((f, fIdx) => (
                        <a 
                          key={fIdx}
                          href={f.url}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors group"
                        >
                          <FileText size={14} className="text-slate-400 group-hover:text-indigo-500" />
                          <span className="text-[11px] font-bold truncate max-w-[150px]">{f.name}</span>
                        </a>
                      ))}
                    </div>

                    <button 
                      onClick={() => setReviewingVersion({ version: v, type: type })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl border border-blue-100 transition-all text-[11px] font-black uppercase tracking-tighter shadow-sm"
                    >
                      <MessageSquare size={14} />
                      Revisar y Comentar
                      {v.pdfComments && v.pdfComments.length > 0 && (
                        <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-1 shadow-sm font-black">
                          {v.pdfComments.filter(c => !c.resolved).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detalle de Aprobaciones</h2>
            <p className="text-sm text-gray-500 mt-1">Historial completo de documentos</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* Product Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código SAP</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{record.codigoSAP}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código EAN</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{record.codigoEAN}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm font-semibold text-slate-900">{record.descripcionSAP}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Marca</p>
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold tracking-wide ${record.marca === 'SOLE' ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-800'}`}>
                  {record.marca}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Línea</p>
                <p className="text-sm font-semibold text-slate-900">{record.linea}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Muestra Vinculada</p>
                {linkedSample ? (
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <Beaker size={14} className="text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-emerald-700 uppercase leading-none">
                        {linkedSample.correlativeId}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-medium truncate max-w-[100px]">
                        {linkedSample.descripcionSAP}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">Sin vincular</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proveedor</p>
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100 shrink-0">
                    {getSupplierLogo(record.codProv) ? (
                      <img 
                        src={getSupplierLogo(record.codProv)} 
                        alt={record.proveedor}
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(record.proveedor)}&background=f1f5f9&color=64748b&bold=true`;
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase">{record.proveedor}</p>
                    <p className="text-xs font-bold text-red-600">{record.codProv}</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Correos de Proveedor</p>
                <div className="flex flex-wrap gap-2">
                  {record.correoProveedor.map(email => (
                    <span key={email} className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Related Calculations Section */}
          {relatedCalculations.length > 0 && (
            <div className="mb-10 mt-8 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Beaker size={18} className="text-blue-500" />
                  Ensayos / Cálculos Relacionados
                </h4>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                    {relatedCalculations.length} {relatedCalculations.length === 1 ? 'Ensayo' : 'Ensayos'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedCalculations.map((calc) => (
                  <div 
                    key={calc.id} 
                    className="group relative flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer"
                    onClick={() => {
                      if (onLoadRecord) {
                        try {
                          const data = JSON.parse(calc.record_data);
                          onLoadRecord(calc.module_id, data);
                          onClose(); // Close modal on navigation
                        } catch (e) {
                          toast.error('Error al cargar los datos del ensayo');
                        }
                      }
                    }}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      {getCalcIcon(calc.module_id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 uppercase truncate group-hover:text-blue-600 transition-colors">
                        {calc.project_name || 'Cálculo Técnico'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {calc.module_id.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histories */}
          <div className="space-y-6">
            {record.artworks && record.artworks.length > 0 ? (
              renderVersionHistory(record.artworks, 'Historial de Artworks', 'artwork')
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Historial de Artworks</p>
                <p className="text-[11px] font-medium mt-0.5">No hay artworks registrados para este producto.</p>
              </div>
            )}
            
            {record.technicalSheets && record.technicalSheets.length > 0 ? (
              renderVersionHistory(record.technicalSheets, 'Historial de Fichas Técnicas', 'technical_sheet')
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Historial de Fichas Técnicas</p>
                <p className="text-[11px] font-medium mt-0.5">No hay fichas técnicas registradas para este producto.</p>
              </div>
            )}
            
            {record.commercialSheets && record.commercialSheets.length > 0 ? (
              renderVersionHistory(record.commercialSheets, 'Historial de Fichas Comerciales', 'commercial_sheet')
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Historial de Fichas Comerciales</p>
                <p className="text-[11px] font-medium mt-0.5">No hay fichas comerciales registradas para este producto.</p>
              </div>
            )}
          </div>

          {/* Gallery Section */}
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <ImageIcon size={20} className="text-indigo-500" />
                Galería de Imágenes de Inspección I+D
              </h4>
              {onUpdateRecord && (
                <button 
                  onClick={() => setIsGalleryUploadModalOpen(true)}
                  className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  <Plus size={16} className="text-indigo-500" />
                  Añadir a Galería
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {record.gallery && record.gallery.length > 0 ? (
                record.gallery.map((item) => (
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
                              <Eye size={16} />
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
                  <p className="text-[10px] font-medium text-slate-400 mt-1">Añade imágenes para documentar visualmente la inspección</p>
                </div>
              )}
            </div>
          </div>
        </div>

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
                    onClick={() => document.getElementById('gallery-file-input-product')?.click()}
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
                      id="gallery-file-input-product"
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
      </div>

      {reviewingVersion && (
        <PDFReviewer
          files={reviewingVersion.version.files}
          comments={reviewingVersion.version.pdfComments || []}
          title={`Revisión V${reviewingVersion.version.version} - ${record.descripcionSAP}`}
          onClose={() => setReviewingVersion(null)}
          onSaveComment={(comment) => {
            handleUpdateComments([...(reviewingVersion.version.pdfComments || []), comment]);
          }}
          onResolveComment={(id) => {
            const updated = (reviewingVersion.version.pdfComments || []).map(c => 
              c.id === id ? { ...c, resolved: true } : c
            );
            handleUpdateComments(updated);
          }}
        />
      )}
    </div>
  );
}
