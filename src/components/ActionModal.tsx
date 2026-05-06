import React, { useState, useRef } from 'react';
import { SupabaseService } from '../lib/SupabaseService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  X, 
  Tag, 
  Clock, 
  UploadCloud, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Eye, 
  ThumbsDown,
  Plus,
  Settings,
  ArrowLeft,
  Beaker
} from 'lucide-react';
import { 
  ProductRecord, 
  DocumentVersion, 
  ArtworkCategory, 
  ArtworkSubcategory, 
  FileInfo 
} from '../types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductRecord | null;
  type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  action: 'view' | 'upload' | 'approve' | null;
  version?: DocumentVersion;
  stage?: string;
  onSave: (data: any) => void;
}

const ARTWORK_CATEGORIES: ArtworkCategory[] = [
  'Manual', 'Carton box', 'Product Label', 'Carton Label', 'Logo Placement', 'Serial Number', 'Others'
];

const ARTWORK_SUBCATEGORIES: ArtworkSubcategory[] = ['Printing', 'Editable'];

export default function ActionModal({ isOpen, onClose, record, type, action, version, stage, onSave }: ActionModalProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [comments, setComments] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<ArtworkCategory>('Manual');
  const [subcategory, setSubcategory] = useState<ArtworkSubcategory>('Printing');
  const [changeDescription, setChangeDescription] = useState('');
  const [proformaNumber, setProformaNumber] = useState('');
  const [solpedNumber, setSolpedNumber] = useState('');
  const [estimatedShipmentDate, setEstimatedShipmentDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus | null>(null);
  const [withObservation, setWithObservation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<DocumentVersion | undefined>(version);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveVersion(version);
      // Reset form fields when modal opens
      setSelectedStatus(null);
      setWithObservation(false);
      setError(null);
      if (action === 'approve' && version) {
        setProformaNumber(version.proformaNumber || '');
        setSolpedNumber(version.solpedNumber || '');
        setEstimatedShipmentDate(version.estimatedShipmentDate || '');
      }
    }
  }, [isOpen, version, action]);

  if (!isOpen || !record) return null;

  const title = action === 'upload' 
    ? `Subir nueva versión de ${type === 'artwork' ? 'Artwork' : type === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial'}`
    : action === 'approve'
      ? `Aprobar/Rechazar ${type === 'artwork' ? 'Artwork' : type === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial'} - Etapa: ${stage}`
      : `Detalle de ${type === 'artwork' ? 'Artwork' : type === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial'}`;

  const docArrayKey = type === 'artwork' ? 'artworks' : 
                      type === 'technical_sheet' ? 'technicalSheets' : 'commercialSheets';
  
  const docArray = record[docArrayKey] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uploadAndSave = async () => {
      setIsUploading(true);
      try {
        let fileInfos: FileInfo[] = [];
        
        if (action === 'upload' && files.length > 0) {
          toast.loading(`Subiendo ${files.length} archivos...`);
          const uploadPromises = files.map(f => {
            const path = `products/${record.id}/${type}/${Date.now()}_${f.name}`;
            return SupabaseService.uploadFile('rd-files', path, f);
          });
          fileInfos = await Promise.all(uploadPromises);
          toast.dismiss();
          toast.success('Archivos subidos');
        }

        onSave({ 
          comments, 
          changeDescription,
          files: fileInfos, 
          category: category, 
          subcategory: subcategory,
          proformaNumber,
          solpedNumber,
          estimatedShipmentDate,
          status: stage === 'PLAN' 
            ? (withObservation ? 'approved_with_observation' : 'approved') 
            : (selectedStatus || 'approved'),
          targetVersion: activeVersion,
          userEmail: user?.email,
          userId: user?.id
        });
        
        onClose();
        setFiles([]);
        setComments('');
        setChangeDescription('');
        setProformaNumber('');
        setSolpedNumber('');
        setEstimatedShipmentDate('');
        setSelectedStatus(null);
        setError(null);
      } catch (err) {
        console.error('Error during upload/save:', err);
        toast.error('Error al procesar archivos');
      } finally {
        setIsUploading(false);
        toast.dismiss();
      }
    };

    uploadAndSave();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const acceptedTypes = '.jpg,.jpeg,.pdf,.ai';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="mb-6 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">Producto:</span> {record.codigoSAP} - {record.descripcionSAP}</p>
            <p className="text-sm text-gray-600"><span className="font-semibold text-gray-800">Marca:</span> {record.marca} | <span className="font-semibold text-gray-800">Línea:</span> {record.linea}</p>
            {activeVersion && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                  Versión V{activeVersion.version}
                </span>
                {activeVersion.category && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-medium">
                    <Tag size={12} />
                    {activeVersion.category}
                  </span>
                )}
                {activeVersion.subcategory && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                    {activeVersion.subcategory}
                  </span>
                )}
              </div>
            )}
          </div>

          <form id="action-form" onSubmit={handleSubmit} className="space-y-4">
            {action === 'upload' && type === 'artwork' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Categoría</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ArtworkCategory)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#52627e] outline-none"
                    >
                      {ARTWORK_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Subcategoría</label>
                    <select 
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value as ArtworkSubcategory)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#52627e] outline-none"
                    >
                      {ARTWORK_SUBCATEGORIES.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Show history for selected category */}
                {docArray.filter(v => v.category === category && v.subcategory === subcategory).length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Clock size={12} />
                      Última versión de esta categoría: V{Math.max(...docArray.filter(v => v.category === category && v.subcategory === subcategory).map(v => v.version))}
                    </p>
                    <div className="space-y-2">
                      {docArray
                        .filter(v => v.category === category && v.subcategory === subcategory)
                        .sort((a, b) => b.version - a.version)
                        .slice(0, 1)
                        .map((v, i) => (
                          <div key={i} className="text-xs text-slate-600 italic leading-relaxed">
                            "{v.changeDescription || 'Sin descripción de cambios'}"
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
              </>
            )}

            {action === 'upload' && (
              <>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <UploadCloud size={32} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Haz clic para seleccionar o arrastra los archivos aquí</p>
                  <p className="text-xs text-gray-500 mt-1">Formatos permitidos: {acceptedTypes} (Máx. 25 MB)</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    multiple
                    accept={acceptedTypes}
                    onChange={handleFileChange} 
                  />
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Archivos seleccionados ({files.length})</p>
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-gray-400 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-black text-slate-700 mb-1 uppercase tracking-tighter">¿Qué se cambió o añadió en esta versión?</label>
                  <textarea 
                    className="w-full border-2 border-indigo-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] bg-indigo-50/30 font-medium"
                    placeholder="Describe detalladamente los cambios realizados respecto a la versión anterior..."
                    value={changeDescription}
                    onChange={(e) => setChangeDescription(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">* Esta información será visible en el historial de versiones.</p>
                </div>
              </>
            )}

            {(action === 'view' || action === 'approve') && activeVersion && (
              <div className="space-y-6">
                {/* Version Selector Dropdowns */}
                {stage !== 'PLAN' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {type === 'artwork' && (
                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Categoría</label>
                      <select 
                        value={activeVersion.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          const versions = docArray.filter(v => v.category === cat).sort((a, b) => b.version - a.version);
                          if (versions.length > 0) setActiveVersion(versions[0]);
                        }}
                        className="w-full bg-white border-2 border-indigo-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {Array.from(new Set(docArray.map(v => v.category))).sort().map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={`${type === 'artwork' ? '' : 'col-span-2'} bg-indigo-50/50 p-3 rounded-xl border border-indigo-100`}>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Versión Disponible</label>
                    <select 
                      value={activeVersion.version}
                      onChange={(e) => {
                        const ver = parseInt(e.target.value);
                        const found = docArray.find(v => (type !== 'artwork' || v.category === activeVersion.category) && v.version === ver);
                        if (found) setActiveVersion(found);
                      }}
                      className="w-full bg-white border-2 border-indigo-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {docArray
                        .filter(v => type !== 'artwork' || v.category === activeVersion.category)
                        .sort((a, b) => b.version - a.version)
                        .map(v => (
                          <option key={v.version} value={v.version}>Versión V{v.version}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
                )}

                {action === 'approve' && (
                  <>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg animate-shake">
                        {error}
                      </div>
                    )}
                    {stage === 'PLAN' ? (
                      <div className="mb-6 flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                            <CheckCircle size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Aprobación de Planeamiento</p>
                            <p className="text-xs text-gray-600">Llena los campos amarillos para confirmar</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={withObservation}
                              onChange={(e) => setWithObservation(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">¿Con Observación?</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-4 mb-6">
                        <button 
                          type="button" 
                          onClick={() => setSelectedStatus('approved')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors border ${
                            selectedStatus === 'approved' 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle size={20} />
                          Aprobar
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setSelectedStatus('rejected')}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors border ${
                            selectedStatus === 'rejected' 
                              ? (stage === 'PROV' || stage === 'PLAN' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-red-600 text-white border-red-600 shadow-md')
                              : (stage === 'PROV' || stage === 'PLAN' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100')
                          }`}
                        >
                          {stage === 'PROV' || stage === 'PLAN' ? <Eye size={20} /> : <ThumbsDown size={20} />}
                          {stage === 'PROV' || stage === 'PLAN' ? 'Observación' : 'Rechazar'}
                        </button>
                      </div>
                    )}

                    {stage === 'PLAN' && (
                      <div className="space-y-4 mb-4 bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700">Número de Proforma</label>
                            <input 
                              type="text"
                              value={proformaNumber}
                              onChange={(e) => setProformaNumber(e.target.value)}
                              placeholder="Ej: PRF-2024-001"
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#52627e] outline-none bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700">Número de Solped</label>
                            <input 
                              type="text"
                              value={solpedNumber}
                              onChange={(e) => setSolpedNumber(e.target.value)}
                              placeholder="Ej: SLP-987654"
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#52627e] outline-none bg-white"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-semibold text-gray-700">Fecha Estimada de Embarque</label>
                          <input 
                            type="date"
                            value={estimatedShipmentDate}
                            onChange={(e) => setEstimatedShipmentDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#52627e] outline-none bg-white"
                          />
                          <p className="text-[10px] text-amber-700 font-medium italic">* La fecha es referencial</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios / Observaciones</label>
                      <textarea 
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#52627e] outline-none min-h-[100px]"
                        placeholder="Escribe aquí tus observaciones..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                        <Tag size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {type === 'artwork' ? 'Categoría / Subcategoría' : 'Tipo de Documento'}
                        </p>
                        <h5 className="font-black text-slate-800 uppercase">
                          {type === 'artwork' 
                            ? `${activeVersion.category} - ${activeVersion.subcategory}` 
                            : type === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial'}
                        </h5>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Versión</p>
                      <h5 className="font-black text-indigo-600 text-xl">V{activeVersion.version}</h5>
                    </div>
                  </div>

                  {activeVersion.changeDescription && (
                    <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Eye size={12} />
                        Descripción de cambios:
                      </p>
                      <p className="text-xs text-blue-700 font-medium leading-relaxed italic">
                        "{activeVersion.changeDescription}"
                      </p>
                    </div>
                  )}
                  {(activeVersion.proformaNumber || activeVersion.solpedNumber || activeVersion.estimatedShipmentDate) && (
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                      {activeVersion.proformaNumber && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proforma</p>
                          <p className="text-sm font-bold text-slate-700">{activeVersion.proformaNumber}</p>
                        </div>
                      )}
                      {activeVersion.solpedNumber && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solped</p>
                          <p className="text-sm font-bold text-slate-700">{activeVersion.solpedNumber}</p>
                        </div>
                      )}
                      {activeVersion.estimatedShipmentDate && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Embarque</p>
                          <p className="text-sm font-bold text-slate-700">{activeVersion.estimatedShipmentDate}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Archivos adjuntos ({activeVersion.files.length})</p>
                  <div className="grid grid-cols-1 gap-2">
                    {activeVersion.files.map((f, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="text-slate-400 group-hover:text-indigo-500 shrink-0" size={24} />
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-800 truncate" title={f.name}>{f.name}</p>
                            <p className="text-[10px] text-slate-500">Subido por {activeVersion.uploadedBy || 'Sistema'} el {activeVersion.uploadDate || 'N/A'}</p>
                          </div>
                        </div>
                        <a href={f.url} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Descargar</a>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Historial de Aprobaciones</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'I+D', approval: activeVersion.idApproval },
                      { label: 'MKT', approval: activeVersion.mktApproval },
                      { label: 'PLAN', approval: activeVersion.planApproval },
                      { label: 'PROV', approval: activeVersion.provApproval }
                    ].map((item, idx) => {
                      if (!item.approval || item.approval.status === 'not_required') return null;
                      if (type !== 'artwork' && item.label !== 'I+D') return null;
                      
                      const statusColor = item.approval.status === 'approved' 
                        ? 'text-emerald-600' 
                        : item.approval.status === 'rejected' 
                          ? 'text-red-600' 
                          : item.approval.status === 'approved_with_observation'
                            ? 'text-amber-600'
                            : 'text-slate-400';
                      
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded border border-gray-100">
                          <span className="font-medium">{item.label}</span>
                          <span className={`${statusColor} flex items-center gap-1 font-bold`}>
                            {item.approval.status === 'approved' ? <CheckCircle size={14}/> : (item.approval.status === 'rejected' || item.approval.status === 'approved_with_observation') ? (item.label === 'PROV' || item.label === 'PLAN' ? <Eye size={14}/> : <ThumbsDown size={14}/>) : <Clock size={14}/>}
                            {item.approval.status === 'approved' 
                              ? `Aprobado por ${item.approval.user}` 
                              : item.approval.status === 'approved_with_observation'
                                ? `Aprobado con observación por ${item.approval.user}`
                                : item.approval.status === 'rejected' 
                                  ? `${item.label === 'PROV' || item.label === 'PLAN' ? 'Observado' : 'Rechazar'} por ${item.approval.user}` 
                                  : 'Pendiente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
            Cancelar
          </button>
          {action !== 'view' && (
            <button 
              type="submit" 
              form="action-form" 
              disabled={isUploading || (action === 'upload' && files.length === 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-[#52627e] hover:bg-[#3d4a60] rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
