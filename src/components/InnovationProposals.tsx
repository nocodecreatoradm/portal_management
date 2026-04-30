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

  const handleSaveProposal = async () => {
    try {
      if (editingProposal) {
        const updates: Partial<InnovationProposal> = {
          title: newProposal.title,
          description: newProposal.description,
          category: newProposal.category,
          priority: newProposal.priority as any,
          tags: newProposal.tags
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
          images: [],
          sketches: [],
          blueprints: [],
          tags: newProposal.tags || []
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


  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
          onClick={() => setIsModalOpen(true)}
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
                  <div className="flex gap-1">
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

                <div className="space-y-3">
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
                <button className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:gap-2 transition-all">
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
                  <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group cursor-pointer text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-blue-500 transition-colors">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Imágenes</p>
                      <p className="text-[10px] font-bold text-slate-400">Fotos del concepto</p>
                    </div>
                    <button className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100">Subir</button>
                  </div>

                  <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group cursor-pointer text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <Map size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Bosquejos</p>
                      <p className="text-[10px] font-bold text-slate-400">Dibujos a mano alzada</p>
                    </div>
                    <button className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100">Subir</button>
                  </div>

                  <div className="p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all group cursor-pointer text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-purple-500 transition-colors">
                      <Layers size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Planos</p>
                      <p className="text-[10px] font-bold text-slate-400">Diseños técnicos CAD/PDF</p>
                    </div>
                    <button className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100">Subir</button>
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
    </div>
  );
}
