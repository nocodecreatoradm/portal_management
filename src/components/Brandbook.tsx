import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  FileText, 
  ChevronRight, 
  Search, 
  Share2, 
  Link as LinkIcon, 
  Filter,
  File as FileIcon,
  History,
  Upload,
  MoreVertical,
  ArrowLeft,
  ExternalLink,
  Download,
  Info,
  Eye,
  Pencil,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ModuleActions from './ModuleActions';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { Brand, BrandDocument } from '../types';

export default function Brandbook({ onExportPPT }: { onExportPPT?: () => void }) {
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<BrandDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pdf' | 'docx' | 'xlsx' | 'pptx'>('all');
  const [documents, setDocuments] = useState<BrandDocument[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTarget, setUploadingTarget] = useState<{ type: 'hero' | 'brand', id?: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [settingsData, brandsData, docsData] = await Promise.all([
        SupabaseService.getBrandbookSettings(),
        SupabaseService.getBrandbookBrands(),
        SupabaseService.getBrandbookDocuments()
      ]);
      
      if (settingsData?.hero_image) setHeroImage(settingsData.hero_image);
      setBrands(brandsData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error loading brandbook data:', error);
      toast.error('Error al cargar datos del Brandbook');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await SupabaseService.deleteBrandbookDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Elemento eliminado correctamente');
    } catch (error) {
      toast.error('Error al eliminar elemento');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const newFolder: Partial<BrandDocument> = {
        brandId: selectedBrand?.id || '',
        parentId: currentFolderId,
        name: newFolderName,
        type: 'folder',
        modifiedBy: 'Usuario Actual' // Should get from auth context
      };

      const createdFolder = await SupabaseService.createBrandbookDocument(newFolder);
      setDocuments(prev => [...prev, createdFolder]);
      setNewFolderName('');
      setIsCreateFolderModalOpen(false);
      toast.success('Carpeta creada');
    } catch (error) {
      toast.error('Error al crear carpeta');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const toastId = toast.loading('Subiendo archivo...');
      
      // Upload to storage
      const uploadedFile = await SupabaseService.uploadFile('brandbook', `docs/${Date.now()}_${file.name}`, file);

      const getFileType = (fileName: string): BrandDocument['type'] => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext || '')) return 'docx';
        if (['xls', 'xlsx'].includes(ext || '')) return 'xlsx';
        if (['ppt', 'pptx'].includes(ext || '')) return 'pptx';
        return 'pdf';
      };

      const newFile: Partial<BrandDocument> = {
        brandId: selectedBrand?.id || '',
        parentId: currentFolderId,
        name: file.name,
        type: getFileType(file.name),
        modifiedBy: 'Usuario Actual', // Should get from auth context
        versions: [{
          id: Math.random().toString(36).substr(2, 9),
          version: '1.0',
          date: new Date().toISOString().split('T')[0],
          modifiedBy: 'Usuario Actual',
          changeDescription: 'Versión inicial'
        }]
      };

      const createdDoc = await SupabaseService.createBrandbookDocument(newFile);
      setDocuments(prev => [...prev, createdDoc]);
      toast.success(`Archivo "${file.name}" subido correctamente`, { id: toastId });
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error('Error al subir archivo');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTarget) return;

    try {
      const toastId = toast.loading('Actualizando imagen...');
      const uploadedFile = await SupabaseService.uploadFile('brandbook', `images/${Date.now()}_${file.name}`, file);
      
      if (uploadingTarget.type === 'hero') {
        await SupabaseService.updateBrandbookSettings(uploadedFile.url);
        setHeroImage(uploadedFile.url);
        toast.success('Imagen de portada actualizada', { id: toastId });
      } else if (uploadingTarget.type === 'brand' && uploadingTarget.id) {
        const updatedBrand = await SupabaseService.updateBrand(uploadingTarget.id, { image: uploadedFile.url } as any);
        setBrands(prev => prev.map(b => b.id === uploadingTarget.id ? updatedBrand : b));
        toast.success('Imagen de marca actualizada', { id: toastId });
      }
      setUploadingTarget(null);
    } catch (error) {
      toast.error('Error al actualizar imagen');
    }
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const triggerImageUpload = (type: 'hero' | 'brand', id?: string) => {
    setUploadingTarget({ type, id });
    imageInputRef.current?.click();
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Brandbook Grupo Sole',
      text: 'Accede a los recursos de marca de Grupo Sole',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Enlace copiado al portapapeles');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleExportPDF = () => {
    exportToPDF('brandbook-library', `Brandbook_${selectedBrand?.name || 'General'}`, 'Brandbook - Repositorio de Marca');
  };

  const handleExportExcel = () => {
    const exportData = documents
      .filter(d => d.brandId === selectedBrand?.id && d.parentId === currentFolderId)
      .map(d => ({
        Nombre: d.name,
        Tipo: d.type,
        'Última Modificación': d.modified,
        'Modificado por': d.modifiedBy
      }));
    exportToExcel(exportData, `Brandbook_${selectedBrand?.name || 'General'}`, 'Documentos');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderLanding = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative h-[280px] rounded-[32px] overflow-hidden group shadow-xl shadow-slate-200/50">
        <img 
          src={heroImage} 
          alt="Brandbook Hero"
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/40 to-transparent flex flex-col justify-center px-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-black text-white mb-3 tracking-tighter leading-none uppercase">
              IDENTIDAD <br />
              <span className="text-blue-500">VISUAL</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-lg mb-6 leading-relaxed font-medium">
              Recursos y guías oficiales que definen nuestras marcas.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="https://gruposole.com.pe/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-600 hover:text-white transition-all group active:scale-95"
              >
                Explorar Corporativo
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button 
                onClick={() => triggerImageUpload('hero')}
                className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-all border border-white/20 group relative"
                title="Cambiar imagen de portada"
              >
                <Pencil size={18} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-700">
                  Recomendado: 2000x800px (2.5:1)
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {brands.map((brand, index) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="relative h-[260px] rounded-[24px] overflow-hidden cursor-pointer group shadow-lg shadow-slate-200/50 border border-slate-100"
          >
            <div 
              className="absolute inset-0 z-0"
              onClick={() => setSelectedBrand(brand)}
            >
              <img 
                src={brand.image || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000'} 
                alt={brand.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent flex flex-col justify-end p-6">
                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{brand.name}</h3>
                <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  {brand.description || 'Recursos de marca oficiales'}
                </p>
              </div>
            </div>
            
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  triggerImageUpload('brand', brand.id);
                }}
                className="w-8 h-8 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center text-white border border-white/20 hover:bg-white hover:text-slate-900 transition-all shadow-lg"
                title="Cambiar imagen"
              >
                <Upload size={14} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBrand(brand);
                }}
                className="w-8 h-8 bg-white/20 backdrop-blur-xl rounded-lg flex items-center justify-center text-white border border-white/20 hover:bg-blue-600 transition-all shadow-lg"
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderDocumentLibrary = (brand: Brand) => {
    const currentFolder = documents.find(d => d.id === currentFolderId);
    
    const docs = documents.filter(doc => {
      if (doc.brandId !== brand.id) return false;
      if (doc.parentId !== currentFolderId) return false;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchLower) ||
        doc.modified.toLowerCase().includes(searchLower) ||
        doc.modifiedBy.toLowerCase().includes(searchLower);
      const matchesFilter = activeFilter === 'all' || doc.type === activeFilter || (doc.type === 'folder' && activeFilter === 'all');
      return matchesSearch && matchesFilter;
    });

    return (
      <div id="brandbook-library" className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (currentFolderId) {
                    const parent = documents.find(d => d.id === currentFolderId)?.parentId || null;
                    setCurrentFolderId(parent);
                  } else {
                    setSelectedBrand(null);
                  }
                }}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-blue-600"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">
                  <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => setSelectedBrand(null)}>Marcas</span>
                  <ChevronRight size={10} />
                  <span 
                    className={`font-black hover:text-blue-600 cursor-pointer transition-colors ${!currentFolderId ? 'text-blue-600' : 'text-slate-400'}`}
                    onClick={() => setCurrentFolderId(null)}
                  >
                    {brand.name}
                  </span>
                  {currentFolder && (
                    <>
                      <ChevronRight size={10} />
                      <span className="font-black text-blue-600">{currentFolder.name}</span>
                    </>
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {currentFolder ? currentFolder.name : 'Repositorio de Marca'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsCreateFolderModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              >
                <Folder size={18} />
                Nueva Carpeta
              </button>
              <button 
                onClick={handleUploadFile}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
              >
                <Upload size={18} />
                Subir Archivo
              </button>
              <div className="w-px h-8 bg-slate-200 mx-2" />
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <Share2 size={18} />
                Compartir
              </button>
              <div className="w-px h-8 bg-slate-200 mx-2" />
              <ModuleActions 
                onSave={() => toast.success('Datos actualizados en tiempo real')} 
                onExportPDF={handleExportPDF} 
                onExportExcel={handleExportExcel}
                onExportPPT={onExportPPT}
                title="Brandbook"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar en el repositorio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Todos los documentos
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600"><Filter size={18} /></button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button 
                onClick={() => setActiveFilter('docx')}
                className={`p-2 rounded-lg transition-all ${activeFilter === 'docx' ? 'bg-blue-100 text-blue-600' : 'text-blue-500 hover:bg-blue-50'}`}
                title="Documentos Word"
              >
                <FileText size={18} />
              </button>
              <button 
                onClick={() => setActiveFilter('xlsx')}
                className={`p-2 rounded-lg transition-all ${activeFilter === 'xlsx' ? 'bg-green-100 text-green-600' : 'text-green-500 hover:bg-green-50'}`}
                title="Hojas de Cálculo Excel"
              >
                <FileIcon size={18} />
              </button>
              <button 
                onClick={() => setActiveFilter('pptx')}
                className={`p-2 rounded-lg transition-all ${activeFilter === 'pptx' ? 'bg-orange-100 text-orange-600' : 'text-orange-500 hover:bg-orange-50'}`}
                title="Presentaciones PowerPoint"
              >
                <FileIcon size={18} />
              </button>
              <button 
                onClick={() => setActiveFilter('pdf')}
                className={`p-2 rounded-lg transition-all ${activeFilter === 'pdf' ? 'bg-red-100 text-red-600' : 'text-red-500 hover:bg-red-50'}`}
                title="Archivos PDF"
              >
                <FileIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider w-12">
                  <FileIcon size={14} />
                </th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nombre</th>
                <th className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => (
                <tr 
                  key={doc.id} 
                  className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => {
                    if (doc.type === 'folder') {
                      setCurrentFolderId(doc.id);
                    }
                  }}
                >
                  <td className="px-6 py-2.5">
                    {doc.type === 'folder' ? (
                      <Folder className="text-amber-400 fill-amber-400/20" size={20} />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        doc.type === 'pdf' ? 'bg-red-50 text-red-500' :
                        doc.type === 'docx' ? 'bg-blue-50 text-blue-500' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        <FileText size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {doc.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                        {doc.modified} • Por {doc.modifiedBy}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info(`Visualizando: ${doc.name}`);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                        title="Visualizar"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 shadow-sm transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`Iniciando descarga de: ${doc.name}`);
                        }}
                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all"
                        title="Descargar"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Folder size={48} className="opacity-20" />
                      <p className="text-sm font-medium">Esta carpeta está vacía</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderHistoryModal = () => (
    <AnimatePresence>
      {selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDoc(null)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <History size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Historial de Versiones</h3>
                  <p className="text-sm text-slate-500 font-medium">{selectedDoc.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft size={20} className="rotate-90" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {selectedDoc.versions?.map((version, index) => (
                  <div key={version.id} className="relative pl-12">
                    <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                      index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className="text-[10px] font-black">v{version.version}</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Versión {version.version}</span>
                        <span className="text-xs text-slate-400 font-medium">{version.date}</span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed">
                        {version.changeDescription}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-100">
                            {version.modifiedBy.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-bold text-slate-500">{version.modifiedBy}</span>
                        </div>
                        <button className="flex items-center gap-2 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors">
                           <Download size={14} />
                           Descargar esta versión
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDoc(null)}
                className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-white rounded-xl transition-all"
              >
                Cerrar
              </button>
              <button className="flex items-center gap-2 px-6 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
                <Upload size={18} />
                Subir nueva versión
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderCreateFolderModal = () => (
    <AnimatePresence>
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCreateFolderModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
          >
            <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Nueva Carpeta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nombre de la carpeta</label>
                <input 
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej: Campaña 2024"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateFolder}
                  className="flex-1 py-3 text-sm font-bold bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  Crear Carpeta
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedBrand ? selectedBrand.id : 'landing'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {selectedBrand ? renderDocumentLibrary(selectedBrand) : renderLanding()}
        </motion.div>
      </AnimatePresence>
      {renderHistoryModal()}
      {renderCreateFolderModal()}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />
      <input 
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
