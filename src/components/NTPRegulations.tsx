import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  ExternalLink, 
  Trash2, 
  Filter,
  MoreVertical,
  BookOpen,
  X,
  Edit2,
  Loader2
} from 'lucide-react';
import { NTPRegulation } from '../types';
import { format, parseISO } from 'date-fns';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';

interface NTPRegulationsProps {
  initialData?: any;
  onExportPPT?: () => void;
  onLoadRecord?: (record: any) => void;
}

export default function NTPRegulations({ initialData, onExportPPT, onLoadRecord }: NTPRegulationsProps) {
  const { user } = useAuth();
  const [regulations, setRegulations] = useState<NTPRegulation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReg, setEditingReg] = useState<NTPRegulation | null>(null);

  const [loading, setLoading] = useState(true);

  // Load regulations from Supabase
  useEffect(() => {
    loadRegulations();
  }, []);

  const loadRegulations = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getNTPRegulations();
      data.sort((a, b) => a.code.localeCompare(b.code));
      setRegulations(data);
    } catch (error) {
      console.error('Error loading NTP regulations:', error);
      toast.error('Error al cargar normativas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    try {
      await saveCalculationRecord(
        'ntp_regulations', 
        'save', 
        regulations, 
        user?.email || 'unknown',
        details.projectName,
        details.sampleId,
        details.description
      );
      toast.success('Registro de consulta guardado');
    } catch (error) {
      console.error('Error saving calculation record:', error);
      toast.error('Error al guardar registro');
    }
  };

  const handleExportExcel = () => {
    const exportData = regulations.map(r => ({
      'Código': r.code,
      'Título': r.title,
      'Categoría': r.category,
      'Fecha de Carga': format(parseISO(r.uploadDate), 'dd/MM/yyyy'),
      'Archivo': r.file.name
    }));

    exportToExcel(exportData, `Normativas_NTP_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('ntp_regulations', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'ntp-stats', title: 'Estadísticas de Normativas' },
      { contentId: 'ntp-grid', title: 'Listado de Normativas Técnicas Peruanas' }
    ];

    await generateReportPDF(sections, `Informe_Normativas_NTP_${format(new Date(), 'yyyyMMdd')}`, 'Informe de Normativas Técnicas Peruanas');
    saveCalculationRecord('ntp_regulations', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  const filteredRegulations = regulations.filter(reg => 
    reg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveReg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
    const selectedFile = fileInput?.files?.[0];

    const regData: Partial<NTPRegulation> = {
      code: formData.get('code') as string,
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      description: formData.get('description') as string
    };
    
    try {
      setLoading(true);
      let fileInfo = editingReg?.file || { name: 'documento.pdf', url: '#', type: 'application/pdf' };

      if (selectedFile) {
        const toastId = toast.loading('Subiendo archivo...');
        try {
          fileInfo = await SupabaseService.uploadFile(
            'ntp-regulations',
            `docs/${Date.now()}_${selectedFile.name}`,
            selectedFile
          );
          toast.success('Archivo subido correctamente', { id: toastId });
        } catch (uploadError: any) {
          toast.error(`Error al subir archivo: ${uploadError.message}`, { id: toastId });
          setLoading(false);
          return;
        }
      }

      regData.file = fileInfo;

      const isUUID = editingReg && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingReg.id);

      if (editingReg && isUUID) {
        const result = await SupabaseService.updateNTPRegulation(editingReg.id, regData);
        setRegulations(regulations.map(r => r.id === result.id ? result : r));
        toast.success('Normativa actualizada');
      } else {
        const newReg: Partial<NTPRegulation> = {
          ...regData,
          uploadDate: editingReg?.uploadDate || new Date().toISOString(),
        };
        const result = await SupabaseService.createNTPRegulation(newReg);
        
        if (editingReg && !isUUID) {
          setRegulations(regulations.map(r => r.id === editingReg.id ? result : r));
        } else {
          setRegulations([result, ...regulations]);
        }
        toast.success('Normativa guardada correctamente');
      }
      setShowAddModal(false);
      setEditingReg(null);
    } catch (error) {
      console.error('Error saving regulation:', error);
      toast.error('Error al guardar normativa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await SupabaseService.deleteNTPRegulation(id);
      setRegulations(prev => prev.filter(r => r.id !== id));
      toast.success('Normativa eliminada');
    } catch (error) {
      console.error('Error deleting regulation:', error);
      toast.error('Error al eliminar normativa');
    }
  };

  const handleDownload = (reg: NTPRegulation) => {
    const link = document.createElement('a');
    if (reg.file?.url && reg.file.url !== '#') {
      link.href = reg.file.url;
    } else {
      link.href = 'data:application/pdf;base64,JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvQ291bnQgMQogIC9LaWRzIFszIDAgUl0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KICAvQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8CiAgL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKICAvRjEgMjQgVGYKICA3MiA3MjAgVGQKICAoRG9jdW1lbnRvIE5UUCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjExIDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA1CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI3NQolJUVPRgo=';
    }
    link.download = reg.file?.name || 'documento.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpen = (reg: NTPRegulation) => {
    if (reg.file?.url && reg.file.url !== '#') {
      // Support for old records with data URLs and new records with public URLs
      if (reg.file.url.startsWith('data:')) {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(
            `<html><body style="margin:0"><iframe src="${reg.file.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe></body></html>`
          );
          newWindow.document.close();
        } else {
          handleDownload(reg);
        }
      } else {
        window.open(reg.file.url, '_blank');
      }
    } else {
      window.open('https://salalecturavirtual.inacal.gob.pe', '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">NTP Regulations</h2>
          <p className="text-slate-500 font-medium mt-1">Gestión de normativas técnicas peruanas aplicadas en R&D</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={20} />
            Añadir Normativa
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div id="ntp-stats" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por código, título o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
          />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Normativas</p>
            <p className="text-2xl font-black text-slate-900">{regulations.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
        </div>
      </div>

      {/* Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando normativas...</p>
        </div>
      ) : (
      <div id="ntp-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegulations.map((reg) => (
          <div key={reg.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all group border-b-4 border-b-blue-600/10 hover:border-b-blue-600">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {reg.category}
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingReg(reg);
                        setShowAddModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('¿Está seguro de eliminar esta normativa?')) {
                          handleDelete(reg.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-tight mb-1">{reg.code}</h3>
                <p className="text-slate-900 font-bold leading-snug line-clamp-3 h-[3.3rem]">
                  {reg.title}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subido el</p>
                    <p className="text-xs font-bold text-slate-700">{format(new Date(reg.uploadDate), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpen(reg)}
                  className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:gap-3 transition-all"
                >
                  Abrir
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {editingReg ? 'Editar Normativa' : 'Añadir Normativa'}
                </h3>
                <p className="text-slate-500 text-sm font-medium">
                  {editingReg ? 'Actualiza los datos de la NTP' : 'Registra una nueva NTP en el sistema'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingReg(null);
                }} 
                className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveReg} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código NTP</label>
                <input 
                  name="code" 
                  required 
                  defaultValue={editingReg?.code}
                  placeholder="Ej: NTP 111.011" 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Descripción</label>
                <textarea 
                  name="title" 
                  required 
                  rows={3} 
                  defaultValue={editingReg?.title}
                  placeholder="Nombre completo de la normativa..." 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 resize-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                  <select 
                    name="category" 
                    defaultValue={editingReg?.category || 'Gas Natural'}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
                  >
                    <option>Gas Natural</option>
                    <option>Electricidad</option>
                    <option>Agua Potable</option>
                    <option>Eficiencia Energética</option>
                    <option>Otros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {editingReg ? 'Actualizar Archivo PDF' : 'Archivo PDF'}
                  </label>
                  <input type="file" name="file" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingReg(null);
                  }} 
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button type="submit" className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                  {editingReg ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
