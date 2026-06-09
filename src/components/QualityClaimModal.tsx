import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, Upload, Trash2, Calendar, FileText, User } from 'lucide-react';
import { ProductRecord, QualityClaim, FileInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';

interface QualityClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductRecord | null;
  qualityClaims: QualityClaim[];
  onSaveClaim: (claim: Omit<QualityClaim, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateClaim: (id: string, updates: Partial<QualityClaim>) => Promise<void>;
  onDeleteClaim?: (id: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function QualityClaimModal({
  isOpen,
  onClose,
  record,
  qualityClaims,
  onSaveClaim,
  onUpdateClaim,
  onDeleteClaim,
  isSubmitting = false
}: QualityClaimModalProps) {
  const { profile } = useAuth();
  
  // Form states
  const [responsibleName, setResponsibleName] = useState('');
  const [defectType, setDefectType] = useState<'Estético' | 'Funcional' | 'Dimensional'>('Estético');
  const [documentCategory, setDocumentCategory] = useState('');
  const [comments, setComments] = useState('');
  const [claimStartDate, setClaimStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachments, setAttachments] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);

  // Subsanación states
  const [resolvingClaimId, setResolvingClaimId] = useState<string | null>(null);
  const [resolutionComments, setResolutionComments] = useState('');

  // Set default inspector name to logged-in user
  useEffect(() => {
    if (isOpen && profile) {
      setResponsibleName(profile.full_name || '');
    }
  }, [isOpen, profile]);

  if (!isOpen || !record) return null;

  // Filter claims for this specific product
  const recordClaims = qualityClaims.filter(c => c.productId === record.id);

  // Permissions check: Quality Manager, R&D Coordinators, R&D Technicians, Admins can log claims.
  const canLogClaim = profile?.role?.toLowerCase() === 'admin' ||
                       profile?.role?.toLowerCase() === 'administrador' ||
                       profile?.role?.toLowerCase() === 'gerente de innovación y calidad' ||
                       profile?.role?.toLowerCase() === 'coordinador de i+d' ||
                       profile?.role?.toLowerCase() === 'técnico de i+d';

  // Designers and Admins can resolve claims
  const canResolveClaim = profile?.role?.toLowerCase() === 'admin' ||
                          profile?.role?.toLowerCase() === 'administrador' ||
                          profile?.role?.toLowerCase() === 'diseñadora_gráfica';

  // Dynamically build list of document categories based on record type
  const getCategoriesList = () => {
    if (record.trackingType === 'artwork') {
      return [
        'Manual', 'Carton box', 'Product Label', 'Carton Label', 
        'Logo Placement', 'Serial Number', 'Energy Efficiency Label', 
        'Installation Label', 'Label positioning', 'Others'
      ];
    } else if (record.trackingType === 'technical') {
      return ['Technical Sheet', 'Others'];
    } else {
      return ['Commercial Sheet', 'Others'];
    }
  };

  const categories = getCategoriesList();

  // Handle files upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    toast.loading('Subiendo evidencias...');

    try {
      const newAttachments: FileInfo[] = [];
      for (const file of Array.from(files)) {
        const path = `claims/${record.codigoSAP}/${Date.now()}_${file.name}`;
        const fileRes = await SupabaseService.uploadFile('rd-files', path, file) as any;
        newAttachments.push({
          name: file.name,
          url: fileRes.url,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      toast.dismiss();
      toast.success('Evidencias cargadas con éxito');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Error al subir archivos: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (name: string) => {
    setAttachments(prev => prev.filter(f => f.name !== name));
  };

  // Submit Claim
  const handleRegisterClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName || !documentCategory || !comments.trim()) {
      toast.error('Por favor completa todos los campos del reclamo.');
      return;
    }

    try {
      await onSaveClaim({
        productId: record.id,
        sapCode: record.codigoSAP,
        trackingType: record.trackingType || 'artwork',
        responsibleName,
        responsibleEmail: profile?.email || '',
        defectType,
        documentCategory,
        comments,
        claimStartDate,
        status: 'open',
        attachments
      });

      // Reset Form
      setComments('');
      setAttachments([]);
      const selectCat = categories[0] || '';
      setDocumentCategory(selectCat);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Resolve Claim
  const handleResolveClaim = async (claimId: string) => {
    if (!resolutionComments.trim()) {
      toast.error('Por favor escribe un comentario sobre la subsanación.');
      return;
    }

    try {
      await onUpdateClaim(claimId, {
        status: 'resolved',
        claimEndDate: new Date().toISOString().split('T')[0],
        resolutionComments,
        resolvedBy: profile?.full_name || profile?.email || 'Diseño'
      });
      setResolvingClaimId(null);
      setResolutionComments('');
      toast.success('Reclamo marcado como subsanado.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: 'open' | 'resolved') => {
    if (status === 'open') {
      return (
        <span className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100 uppercase tracking-wider">
          <AlertCircle size={12} />
          Abierto
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100 uppercase tracking-wider">
        <CheckCircle2 size={12} />
        Subsanado
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Control de Calidad: Código {record.codigoSAP}
            </h3>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">
              {record.descripcionSAP} | Módulo: <span className="uppercase font-bold text-blue-600">{record.trackingType === 'artwork' ? 'Artes' : record.trackingType === 'technical' ? 'Ficha Técnica' : 'Ficha Comercial'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Active / Past Claims List */}
          <div className="space-y-4">
            <h4 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-slate-500" />
              Historial de Observaciones ({recordClaims.length})
            </h4>

            {recordClaims.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200/60">
                <CheckCircle2 className="text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No se registran reclamos de calidad</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordClaims.map((claim) => (
                  <div key={claim.id} className={`p-6 rounded-2xl border transition-all ${
                    claim.status === 'open' 
                      ? 'bg-red-50/20 border-red-200/50 hover:bg-red-50/30' 
                      : 'bg-slate-50/40 border-slate-200/60 hover:bg-slate-50/70'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl flex items-center justify-center ${
                          claim.status === 'open' ? 'bg-red-100/50 text-red-600' : 'bg-slate-200 text-slate-600'
                        }`}>
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{claim.documentCategory}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <User size={12} />
                            Reclama: {claim.responsibleName} ({claim.defectType})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(claim.status)}
                        {canLogClaim && onDeleteClaim && (
                          <button
                            onClick={() => {
                              if (window.confirm('¿Seguro que deseas eliminar este reclamo de calidad?')) {
                                onDeleteClaim(claim.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar Reclamo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-slate-700 bg-white/60 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                      {claim.comments}
                    </div>

                    {/* Evidences / Attachments */}
                    {claim.attachments && claim.attachments.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evidencias Adjuntas:</p>
                        <div className="flex flex-wrap gap-2">
                          {claim.attachments.map((file) => (
                            <a
                              key={file.name}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 text-xs font-bold text-slate-600 px-3 py-1.5 rounded-xl transition-all"
                            >
                              <FileText size={14} />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution Section */}
                    {claim.status === 'open' && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                        {resolvingClaimId === claim.id ? (
                          <div className="space-y-3">
                            <textarea
                              placeholder="Comentarios sobre la subsanación (ej. Se corrigió el logo y se subió nueva versión)..."
                              value={resolutionComments}
                              onChange={(e) => setResolutionComments(e.target.value)}
                              rows={2}
                              className="w-full text-sm border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setResolvingClaimId(null)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleResolveClaim(claim.id)}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all"
                              >
                                Confirmar Subsanación
                              </button>
                            </div>
                          </div>
                        ) : (
                          canResolveClaim && (
                            <button
                              onClick={() => setResolvingClaimId(claim.id)}
                              className="text-xs font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1"
                            >
                              + Marcar como Subsanado / Resolver
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {/* Resolution Metadata */}
                    {claim.status === 'resolved' && (
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200 text-xs text-slate-500 flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="font-bold text-slate-700">Subsanado por {claim.resolvedBy}</span>
                          <span>el {claim.claimEndDate}</span>
                        </div>
                        {claim.resolutionComments && (
                          <div className="italic bg-emerald-50/20 text-emerald-800 p-3 rounded-lg border border-emerald-100/50">
                            "{claim.resolutionComments}"
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Log New Claim */}
          {canLogClaim && (
            <div className="pt-6 border-t border-slate-200/80 space-y-4">
              <h4 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Plus size={18} className="text-slate-500" />
                Registrar Nueva Observación de Calidad
              </h4>

              <form onSubmit={handleRegisterClaim} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Inspector Responsable</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={responsibleName}
                        onChange={(e) => setResponsibleName(e.target.value)}
                        className="w-full text-sm border-2 border-slate-200 rounded-xl pl-4 pr-4 py-2.5 focus:border-blue-500 outline-none transition-all font-semibold"
                        placeholder="Nombre del inspector"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Defecto</label>
                    <select
                      value={defectType}
                      onChange={(e) => setDefectType(e.target.value as any)}
                      className="w-full text-sm border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                    >
                      <option value="Estético">Estético</option>
                      <option value="Funcional">Funcional</option>
                      <option value="Dimensional">Dimensional</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría / Documento</label>
                    <select
                      value={documentCategory}
                      onChange={(e) => setDocumentCategory(e.target.value)}
                      className="w-full text-sm border-2 border-slate-200 rounded-xl px-4 py-2.5 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                      required
                    >
                      <option value="">Seleccione categoría...</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Comentarios y Detalles del Defecto</label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full text-sm border-2 border-slate-200 rounded-xl p-4 focus:border-blue-500 outline-none transition-all leading-relaxed"
                    placeholder="Detalla las observaciones del defecto (ej. Error en el código de barras, textos corridos, etc.)..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Imágenes / Archivos de Evidencia</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl cursor-pointer text-xs font-black uppercase tracking-wider transition-all select-none">
                      <Upload size={16} />
                      Subir Archivos
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {uploading && <span className="text-xs text-slate-400 font-medium animate-pulse">Subiendo...</span>}
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      {attachments.map((file) => (
                        <div
                          key={file.name}
                          className="flex items-center gap-2 bg-white text-xs font-bold text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200"
                        >
                          <FileText size={14} className="text-slate-400" />
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.name)}
                            className="p-0.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || uploading}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-600/10 disabled:opacity-50"
                  >
                    Registrar Reclamo
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
