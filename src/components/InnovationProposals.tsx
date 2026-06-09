import React, { useState } from 'react';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Filter, 
  Image as ImageIcon, 
  FileText, 
  Map, 
  Tag, 
  MessageSquare, 
  Clock, 
  User, 
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Layers,
  Beaker,
  Settings
} from 'lucide-react';
import { InnovationProposal, FileInfo } from '../types';

import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';

const INITIAL_CATEGORIES = [
  'Eficiencia Energética',
  'Nuevos Materiales',
  'Diseño Ergonómico',
  'Automatización',
  'Sostenibilidad',
  'Seguridad',
  'Optimización de Procesos',
  'Otros'
];

const STATUS_COLORS = {
  'Borrador': 'bg-slate-100 text-slate-600',
  'En Evaluación': 'bg-blue-100 text-blue-600',
  'Aprobado': 'bg-emerald-100 text-emerald-600',
  'Implementado': 'bg-purple-100 text-purple-600',
  'Rechazado': 'bg-rose-100 text-rose-600'
};

const PRIORITY_COLORS = {
  'Baja': 'bg-slate-50 text-slate-500',
  'Media': 'bg-blue-50 text-blue-500',
  'Alta': 'bg-orange-50 text-orange-500',
  'Crítica': 'bg-rose-50 text-rose-500'
};

export default function InnovationProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = React.useState<InnovationProposal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getInnovationProposals();
      setProposals(data);
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Error al cargar propuestas');
    } finally {
      setLoading(false);
    }
  };

  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [newProposal, setNewProposal] = useState<Partial<InnovationProposal>>({
    title: '',
    description: '',
    category: INITIAL_CATEGORIES[0],
    priority: 'Media',
    tags: []
  });
  const [editingProposal, setEditingProposal] = useState<InnovationProposal | null>(null);

  // Dynamic file upload states
  const [images, setImages] = useState<FileInfo[]>([]);
  const [sketches, setSketches] = useState<FileInfo[]>([]);
  const [blueprints, setBlueprints] = useState<FileInfo[]>([]);
  const [uploadingField, setUploadingField] = useState<'images' | 'sketches' | 'blueprints' | 'update' | null>(null);

  // Hidden inputs refs
  const imagesInputRef = React.useRef<HTMLInputElement>(null);
  const sketchesInputRef = React.useRef<HTMLInputElement>(null);
  const blueprintsInputRef = React.useRef<HTMLInputElement>(null);
  const updateFileInputRef = React.useRef<HTMLInputElement>(null);

  // Detail Modal states
  const [detailProposal, setDetailProposal] = useState<InnovationProposal | null>(null);
  const [progressText, setProgressText] = useState('');
  const [progressFiles, setProgressFiles] = useState<FileInfo[]>([]);
  const [activeUpdateComments, setActiveUpdateComments] = useState<Record<string, string>>({});
  const [proposalComment, setProposalComment] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'images' | 'sketches' | 'blueprints') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    try {
      setUploadingField(field);
      const uniquePath = `proposals/${newProposal.title || 'unnamed'}/${field}/${Date.now()}_${file.name}`;
      const fileInfo = await SupabaseService.uploadFile('proposals', uniquePath, file);
      
      if (field === 'images') setImages(prev => [...prev, fileInfo]);
      else if (field === 'sketches') setSketches(prev => [...prev, fileInfo]);
      else if (field === 'blueprints') setBlueprints(prev => [...prev, fileInfo]);
      
      toast.success('Documento subido correctamente');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Error al subir archivo: ${err.message || err}`);
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number, field: 'images' | 'sketches' | 'blueprints') => {
    if (field === 'images') setImages(prev => prev.filter((_, i) => i !== index));
    else if (field === 'sketches') setSketches(prev => prev.filter((_, i) => i !== index));
    else if (field === 'blueprints') setBlueprints(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      setUploadingField('update');
      const uniquePath = `proposals/${detailProposal?.title || 'unnamed'}/updates/${Date.now()}_${file.name}`;
      const fileInfo = await SupabaseService.uploadFile('proposals', uniquePath, file);
      setProgressFiles(prev => [...prev, fileInfo]);
      toast.success('Documento adjuntado al avance');
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al subir archivo: ${err.message || err}`);
    } finally {
      setUploadingField(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveUpdate = async () => {
    if (!detailProposal) return;
    if (!progressText.trim()) {
      toast.error('Escribe una descripción del avance');
      return;
    }
    
    try {
      const newUpdate = {
        id: crypto.randomUUID(),
        user: user?.email || 'Usuario',
        date: new Date().toISOString(),
        text: progressText,
        files: progressFiles,
        comments: []
      };
      
      const updatedUpdates = [...(detailProposal.updates || []), newUpdate];
      const result = await SupabaseService.updateInnovationProposal(detailProposal.id, {
        updates: updatedUpdates
      });
      
      setDetailProposal(result);
      setProposals(prev => prev.map(p => p.id === result.id ? result : p));
      
      setProgressText('');
      setProgressFiles([]);
      toast.success('Avance registrado correctamente');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al registrar el avance');
    }
  };

  const handleAddUpdateComment = async (updateId: string) => {
    if (!detailProposal) return;
    const commentText = activeUpdateComments[updateId];
    if (!commentText || !commentText.trim()) return;
    
    try {
      const updatedUpdates = (detailProposal.updates || []).map(upd => {
        if (upd.id === updateId) {
          return {
            ...upd,
            comments: [
              ...(upd.comments || []),
              {
                id: crypto.randomUUID(),
                user: user?.email || 'Usuario',
                text: commentText.trim(),
                date: new Date().toISOString()
              }
            ]
          };
        }
        return upd;
      });
      
      const result = await SupabaseService.updateInnovationProposal(detailProposal.id, {
        updates: updatedUpdates
      });
      
      setDetailProposal(result);
      setProposals(prev => prev.map(p => p.id === result.id ? result : p));
      setActiveUpdateComments(prev => ({ ...prev, [updateId]: '' }));
      toast.success('Comentario añadido');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al añadir comentario');
    }
  };

  const handleAddProposalComment = async () => {
    if (!detailProposal) return;
    if (!proposalComment.trim()) return;
    
    try {
      const updatedComments = [
        ...(detailProposal.comments || []),
        {
          id: crypto.randomUUID(),
          user: user?.email || 'Usuario',
          text: proposalComment.trim(),
          date: new Date().toISOString()
        }
      ];
      
      const result = await SupabaseService.updateInnovationProposal(detailProposal.id, {
        comments: updatedComments
      });
      
      setDetailProposal(result);
      setProposals(prev => prev.map(p => p.id === result.id ? result : p));
      setProposalComment('');
      toast.success('Comentario añadido');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al añadir comentario');
    }
  };

  const handleUpdateStatus = async (newStatus: any) => {
    if (!detailProposal) return;
    try {
      const result = await SupabaseService.updateInnovationProposal(detailProposal.id, {
        status: newStatus
      });
      setDetailProposal(result);
      setProposals(prev => prev.map(p => p.id === result.id ? result : p));
      toast.success(`Estado actualizado a: ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleSaveProposal = async () => {
    try {
      if (editingProposal) {
        const updates: Partial<InnovationProposal> = {
          title: newProposal.title,
          description: newProposal.description,
          category: newProposal.category,
          priority: newProposal.priority as any,
          tags: newProposal.tags,
          images: images,
          sketches: sketches,
          blueprints: blueprints
        };
        const result = await SupabaseService.updateInnovationProposal(editingProposal.id, updates);
        setProposals(proposals.map(p => p.id === result.id ? result : p));
        toast.success('Propuesta actualizada');
      } else {
        const proposal: Partial<InnovationProposal> = {
          title: newProposal.title || 'Sin Título',
          description: newProposal.description || '',
          category: newProposal.category || 'Otros',
          author: user?.email || 'Usuario Actual',
          status: 'Borrador',
          priority: newProposal.priority as any || 'Media',
          images: images,
          sketches: sketches,
          blueprints: blueprints,
          tags: newProposal.tags || [],
          comments: [],
          updates: []
        };
        const result = await SupabaseService.createInnovationProposal(proposal);
        setProposals([result, ...proposals]);
        toast.success('Propuesta creada correctamente');
      }
      setIsModalOpen(false);
      setEditingProposal(null);
      setNewProposal({
        title: '',
        description: '',
        category: 'Eficiencia Energética',
        priority: 'Media',
        tags: []
      });
      setImages([]);
      setSketches([]);
      setBlueprints([]);
    } catch (error) {
      console.error('Error saving proposal:', error);
      toast.error('Error al guardar la propuesta');
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (confirm('¿Está seguro de eliminar esta propuesta?')) {
      try {
        await SupabaseService.deleteInnovationProposal(id);
        setProposals(proposals.filter(p => p.id !== id));
        toast.success('Propuesta eliminada');
      } catch (error) {
        console.error('Error deleting proposal:', error);
        toast.error('Error al eliminar la propuesta');
      }
    }
  };


  const filteredProposals = proposals
    .filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest border border-amber-100">
            <Lightbulb size={12} />
            Laboratorio de Ideas
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Propuestas de Innovación</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg">
            Un espacio libre para capturar, estructurar y potenciar las ideas que transformarán nuestros productos.
          </p>
        </div>
        
        <button 
          onClick={() => {
            setEditingProposal(null);
            setNewProposal({
              title: '',
              description: '',
              category: INITIAL_CATEGORIES[0],
              priority: 'Media',
              tags: []
            });
            setImages([]);
            setSketches([]);
            setBlueprints([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
        >
          <Plus size={20} />
          Nueva Idea
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar ideas, conceptos, autores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-medium text-slate-700"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('Todas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'Todas' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProposals.map((proposal) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={proposal.id}
              className="group bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all overflow-hidden flex flex-col"
            >
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-start justify-between">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[proposal.status]}`}>
                    {proposal.status}
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => {
                        setEditingProposal(proposal);
                        setNewProposal({
                          title: proposal.title,
                          description: proposal.description,
                          category: proposal.category,
                          priority: proposal.priority,
                          tags: proposal.tags
                        });
                        setImages(proposal.images || []);
                        setSketches(proposal.sketches || []);
                        setBlueprints(proposal.blueprints || []);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProposal(proposal.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 cursor-pointer" onClick={() => setDetailProposal(proposal)}>
                  <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                    {proposal.title}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3">
                    {proposal.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-600 border border-slate-100">
                    <Tag size={12} className="text-blue-500" />
                    {proposal.category}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-transparent ${PRIORITY_COLORS[proposal.priority]}`}>
                    <AlertCircle size={12} />
                    {proposal.priority}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 group/icon">
                    <ImageIcon size={18} className="text-slate-400 group-hover/icon:text-blue-500 transition-colors" />
                    <span className="text-[10px] font-black mt-1 text-slate-400">{proposal.images.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 group/icon">
                    <Map size={18} className="text-slate-400 group-hover/icon:text-emerald-500 transition-colors" />
                    <span className="text-[10px] font-black mt-1 text-slate-400">{proposal.sketches.length}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 group/icon">
                    <Layers size={18} className="text-slate-400 group-hover/icon:text-purple-500 transition-colors" />
                    <span className="text-[10px] font-black mt-1 text-slate-400">{proposal.blueprints.length}</span>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                    {proposal.author.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-900">{proposal.author}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {format(new Date(proposal.date), "d MMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailProposal(proposal)}
                  className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:gap-2 transition-all"
                >
                  Explorar
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* New Proposal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {editingProposal ? 'Editar Propuesta' : 'Capturar Nueva Idea'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      {editingProposal ? 'Actualiza los detalles de tu idea innovadora.' : 'Define el concepto y adjunta material visual de apoyo.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Título de la Idea</label>
                      <input
                        type="text"
                        placeholder="Ej: Quemador de Hidrógeno de Alta Eficiencia"
                        value={newProposal.title}
                        onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Categoría</label>
                      <div className="flex gap-2">
                        {isAddingCategory ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              placeholder="Nueva categoría..."
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border-2 border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900"
                              autoFocus
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (customCategory.trim()) {
                                  const trimmed = customCategory.trim();
                                  if (!categories.includes(trimmed)) {
                                    setCategories([...categories, trimmed]);
                                  }
                                  setNewProposal({...newProposal, category: trimmed});
                                  setIsAddingCategory(false);
                                  setCustomCategory('');
                                }
                              }}
                              className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors"
                            >
                              <CheckCircle2 size={20} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsAddingCategory(false);
                                setCustomCategory('');
                              }}
                              className="p-4 bg-slate-200 text-slate-600 rounded-2xl hover:bg-slate-300 transition-colors"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex gap-2">
                            <div className="relative flex-1">
                              <select
                                value={newProposal.category}
                                onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900 appearance-none"
                              >
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={20} className="rotate-90" />
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setIsAddingCategory(true)}
                              className="p-4 bg-blue-100 text-blue-600 rounded-2xl hover:bg-blue-200 transition-colors"
                              title="Agregar nueva categoría"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Prioridad</label>
                        <select
                          value={newProposal.priority}
                          onChange={(e) => setNewProposal({...newProposal, priority: e.target.value as any})}
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900 appearance-none"
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Tags (separados por coma)</label>
                        <input
                          type="text"
                          placeholder="Ej: Gas, Eficiencia"
                          onChange={(e) => setNewProposal({...newProposal, tags: e.target.value.split(',').map(t => t.trim())})}
                          className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">Descripción Detallada</label>
                      <textarea
                        placeholder="Explica el problema que resuelve, cómo funciona y por qué es innovador..."
                        rows={8}
                        value={newProposal.description}
                        onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none font-medium text-slate-700 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Images Upload */}
                  <div 
                    onClick={() => imagesInputRef.current?.click()}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer text-center space-y-3"
                  >
                    <input 
                      type="file"
                      ref={imagesInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'images')}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-blue-500 transition-colors">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Imágenes</p>
                      <p className="text-[10px] font-bold text-slate-400">Fotos del concepto</p>
                    </div>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100"
                      disabled={uploadingField === 'images'}
                    >
                      {uploadingField === 'images' ? 'Subiendo...' : 'Subir'}
                    </button>
                    {images.length > 0 && (
                      <div className="mt-3 space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                        {images.map((img, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-medium">
                            <span className="truncate max-w-[150px]">{img.name}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFile(idx, 'images')}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sketches Upload */}
                  <div 
                    onClick={() => sketchesInputRef.current?.click()}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group cursor-pointer text-center space-y-3"
                  >
                    <input 
                      type="file"
                      ref={sketchesInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'sketches')}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <Map size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Bosquejos</p>
                      <p className="text-[10px] font-bold text-slate-400">Dibujos a mano alzada</p>
                    </div>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100"
                      disabled={uploadingField === 'sketches'}
                    >
                      {uploadingField === 'sketches' ? 'Subiendo...' : 'Subir'}
                    </button>
                    {sketches.length > 0 && (
                      <div className="mt-3 space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                        {sketches.map((sk, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-medium">
                            <span className="truncate max-w-[150px]">{sk.name}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFile(idx, 'sketches')}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blueprints Upload */}
                  <div 
                    onClick={() => blueprintsInputRef.current?.click()}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all group cursor-pointer text-center space-y-3"
                  >
                    <input 
                      type="file"
                      ref={blueprintsInputRef}
                      className="hidden"
                      accept=".pdf,.dwg,.dxf,.zip,.rar,.dwg7,.dwfx"
                      onChange={(e) => handleFileUpload(e, 'blueprints')}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-purple-500 transition-colors">
                      <Layers size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Planos</p>
                      <p className="text-[10px] font-bold text-slate-400">Diseños técnicos CAD/PDF</p>
                    </div>
                    <button 
                      type="button"
                      className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100"
                      disabled={uploadingField === 'blueprints'}
                    >
                      {uploadingField === 'blueprints' ? 'Subiendo...' : 'Subir'}
                    </button>
                    {blueprints.length > 0 && (
                      <div className="mt-3 space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                        {blueprints.map((bp, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-medium">
                            <span className="truncate max-w-[150px]">{bp.name}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveFile(idx, 'blueprints')}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 rounded-2xl text-slate-500 font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProposal}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                >
                  {editingProposal ? 'Actualizar Propuesta' : 'Guardar Idea'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proposal Details Modal */}
      <AnimatePresence>
        {detailProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailProposal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{detailProposal.title}</h2>
                    <p className="text-slate-500 text-sm font-medium">
                      Autor: {detailProposal.author} | Creado: {format(new Date(detailProposal.date), "d MMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailProposal(null)}
                  className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Proposal general details and Comments */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="text-xs font-bold text-slate-500 mr-2">Estado:</div>
                    <select
                      value={detailProposal.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border outline-none ${STATUS_COLORS[detailProposal.status]}`}
                    >
                      <option value="Borrador">Borrador</option>
                      <option value="En Evaluación">En Evaluación</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Implementado">Implementado</option>
                      <option value="Rechazado">Rechazado</option>
                    </select>

                    <div className="text-xs font-bold text-slate-500 ml-4 mr-2">Prioridad:</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${PRIORITY_COLORS[detailProposal.priority]}`}>
                      {detailProposal.priority}
                    </span>

                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                      {detailProposal.category}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</h4>
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-6 rounded-2xl whitespace-pre-line font-medium border border-slate-100">
                      {detailProposal.description}
                    </p>
                  </div>

                  {/* Visual assets (Images, sketches, blueprints) */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos del Concepto</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Images */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                        <ImageIcon size={20} className="mx-auto text-blue-500" />
                        <span className="block text-xs font-bold text-slate-700">Imágenes ({detailProposal.images?.length || 0})</span>
                        {detailProposal.images && detailProposal.images.length > 0 && (
                          <div className="space-y-1 pt-1 text-left">
                            {detailProposal.images.map((img, idx) => (
                              <a key={idx} href={img.url} target="_blank" rel="noreferrer" className="block text-[10px] text-blue-600 font-bold truncate hover:underline">
                                {img.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Sketches */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                        <Map size={20} className="mx-auto text-emerald-500" />
                        <span className="block text-xs font-bold text-slate-700">Bosquejos ({detailProposal.sketches?.length || 0})</span>
                        {detailProposal.sketches && detailProposal.sketches.length > 0 && (
                          <div className="space-y-1 pt-1 text-left">
                            {detailProposal.sketches.map((sk, idx) => (
                              <a key={idx} href={sk.url} target="_blank" rel="noreferrer" className="block text-[10px] text-emerald-600 font-bold truncate hover:underline">
                                {sk.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Blueprints */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                        <Layers size={20} className="mx-auto text-purple-500" />
                        <span className="block text-xs font-bold text-slate-700">Planos ({detailProposal.blueprints?.length || 0})</span>
                        {detailProposal.blueprints && detailProposal.blueprints.length > 0 && (
                          <div className="space-y-1 pt-1 text-left">
                            {detailProposal.blueprints.map((bp, idx) => (
                              <a key={idx} href={bp.url} target="_blank" rel="noreferrer" className="block text-[10px] text-purple-600 font-bold truncate hover:underline">
                                {bp.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* General Comments */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={14} />
                      Comentarios Generales ({detailProposal.comments?.length || 0})
                    </h4>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {detailProposal.comments && detailProposal.comments.length > 0 ? (
                        detailProposal.comments.map((comment) => (
                          <div key={comment.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                              <span className="text-slate-700">{comment.user}</span>
                              <span>{format(new Date(comment.date), "d MMM yyyy, HH:mm", { locale: es })}</span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-bold text-center py-4">Sin comentarios. Escribe el primero.</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Escribe un comentario sobre esta idea..."
                        value={proposalComment}
                        onChange={(e) => setProposalComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddProposalComment(); }}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                      />
                      <button 
                        onClick={handleAddProposalComment}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side: Progress logs and comments per progress */}
                <div className="lg:col-span-5 border-l border-slate-100 pl-0 lg:pl-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Clock size={18} className="text-blue-600" />
                      Historial de Avances
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Registra el progreso, sube documentos e intercambia observaciones sobre los avances.</p>
                  </div>

                  {/* Form to add progress */}
                  <div className="p-5 border border-slate-200 rounded-3xl space-y-4 bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Registrar Nuevo Avance</h4>
                    <textarea 
                      placeholder="Describe qué avances se han realizado, pruebas realizadas, etc..."
                      rows={3}
                      value={progressText}
                      onChange={(e) => setProgressText(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-medium resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <input 
                          type="file"
                          ref={updateFileInputRef}
                          className="hidden"
                          onChange={handleUpdateFileUpload}
                        />
                        <button 
                          type="button" 
                          onClick={() => updateFileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Upload size={12} />
                          {uploadingField === 'update' ? 'Subiendo...' : 'Adjuntar Archivo'}
                        </button>
                      </div>
                      <button 
                        onClick={handleSaveUpdate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Registrar Avance
                      </button>
                    </div>
                    {/* Attached files for update */}
                    {progressFiles.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Archivos Adjuntos:</p>
                        {progressFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-[10px] font-medium">
                            <span className="truncate max-w-[200px]">{file.name}</span>
                            <button 
                              type="button" 
                              onClick={() => setProgressFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Updates Timeline List */}
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
                    {detailProposal.updates && detailProposal.updates.length > 0 ? (
                      [...detailProposal.updates].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((upd) => (
                        <div key={upd.id} className="relative pl-6 border-l-2 border-slate-200 pb-6 last:pb-0">
                          {/* Timeline dot */}
                          <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                          
                          <div className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3 shadow-sm hover:border-blue-100 transition-colors">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-black text-slate-800">{upd.user}</span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {format(new Date(upd.date), "d MMM yyyy, HH:mm", { locale: es })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">{upd.text}</p>
                            
                            {/* Update Attached files */}
                            {upd.files && upd.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {upd.files.map((file, fIdx) => (
                                  <a 
                                    key={fIdx} 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 rounded-lg text-[9px] font-bold text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
                                  >
                                    <FileText size={10} />
                                    {file.name}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Sub-comments on this update */}
                            <div className="border-t border-slate-50 pt-2 space-y-2">
                              {upd.comments && upd.comments.length > 0 && (
                                <div className="space-y-1.5">
                                  {upd.comments.map((subc) => (
                                    <div key={subc.id} className="p-2 bg-slate-50 rounded-xl text-[9px] space-y-0.5">
                                      <div className="flex justify-between font-bold text-slate-500">
                                        <span>{subc.user}</span>
                                        <span>{format(new Date(subc.date), "d MMM, HH:mm", { locale: es })}</span>
                                      </div>
                                      <p className="text-slate-700 font-medium">{subc.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Add subcomment form */}
                              <div className="flex gap-1.5">
                                <input 
                                  type="text"
                                  placeholder="Escribe un comentario..."
                                  value={activeUpdateComments[upd.id] || ''}
                                  onChange={(e) => setActiveUpdateComments(prev => ({ ...prev, [upd.id]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddUpdateComment(upd.id); }}
                                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-[10px] font-medium"
                                />
                                <button 
                                  onClick={() => handleAddUpdateComment(upd.id)}
                                  className="px-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black uppercase text-slate-600 hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                  Enviar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <Clock size={24} className="mx-auto mb-2 opacity-25" />
                        <p className="text-xs font-bold uppercase tracking-wider">No hay avances registrados</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
