import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Calendar, User, 
  CheckCircle2, Clock, AlertCircle, FileText, Download, 
  Trash2, Edit2, LayoutGrid, List, ArrowRight, ChevronRight,
  Droplets, Ruler, FlaskConical, Settings, Save, X, Upload,
  Briefcase, Tag, Info, ChevronDown, ChevronUp,
  Activity, Database, Cpu, Globe, HardDrive, Layers, Zap, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { RDProject, RDProjectTemplate, RDProjectField, FileInfo } from '../types';
import { exportToExcel } from '../lib/exportUtils';


import { SupabaseService } from '../lib/SupabaseService';
import { initialRDProjectTemplates, initialRDProjects } from '../data/mockData';

export default function ProjectsModule() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<RDProject[]>([]);
  const [templates, setTemplates] = useState<RDProjectTemplate[]>(initialRDProjectTemplates);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RDProjectTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState<Partial<RDProjectTemplate>>({
    name: '',
    description: '',
    icon: 'Briefcase',
    sections: [],
    isCustom: true
  });
  const [selectedProject, setSelectedProject] = useState<RDProject | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Template, 2: Fill Data
  const [selectedTemplate, setSelectedTemplate] = useState<RDProjectTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    id: string; 
    title: string;
    type: 'project' | 'template';
    onConfirm: () => void;
  } | null>(null);
  
  const [formData, setFormData] = useState<Partial<RDProject>>({
    name: '',
    description: '',
    status: 'Borrador',
    priority: 'Media',
    responsible: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    sections: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      let projectsData: RDProject[] = [];
      let templatesData: RDProjectTemplate[] = [];

      try {
        projectsData = await SupabaseService.getRDProjects();
      } catch (err) {
        console.error('Error fetching RD projects from Supabase:', err);
      }

      try {
        templatesData = await SupabaseService.getRDProjectTemplates();
      } catch (err) {
        console.error('Error fetching RD templates from Supabase:', err);
      }

      const templateIdMap: Record<string, string> = {};

      // Migrate templates if empty
      if (templatesData && templatesData.length === 0) {
        console.log('RD Templates database empty or failed, migrating initial templates...');
        try {
          const migratedTemplates = await Promise.all(
            initialRDProjectTemplates.map(async (template) => {
              const { id: originalId, ...templateData } = template;
              const created = await SupabaseService.createRDProjectTemplate(templateData as any);
              if (created && created.id) {
                templateIdMap[originalId] = created.id;
              }
              return created;
            })
          );
          setTemplates(migratedTemplates as unknown as RDProjectTemplate[]);
        } catch (err) {
          console.error('Error migrating initial RD templates:', err);
          setTemplates(initialRDProjectTemplates);
        }
      } else {
        setTemplates(templatesData as unknown as RDProjectTemplate[]);
        // Build templateIdMap by matching template names
        initialRDProjectTemplates.forEach(t => {
          const matched = templatesData.find(dbT => dbT.name === t.name);
          if (matched && matched.id) {
            templateIdMap[t.id] = matched.id;
          }
        });
      }

      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

      // Migrate projects if empty
      if (projectsData && projectsData.length === 0) {
        console.log('RD Projects database empty or failed, migrating initial projects...');
        try {
          const migratedProjects = await Promise.all(
            initialRDProjects.map(async (project) => {
              const { id: _, ...projectData } = project;
              if (projectData.templateId && !isUUID(projectData.templateId)) {
                projectData.templateId = templateIdMap[projectData.templateId] || null;
              }
              return await SupabaseService.createRDProject(projectData as any);
            })
          );
          setProjects(migratedProjects as unknown as RDProject[]);
        } catch (err) {
          console.error('Error migrating initial RD projects:', err);
          setProjects(initialRDProjects);
        }
      } else {
        setProjects(projectsData as unknown as RDProject[]);
      }

    } catch (error) {
      console.error('Error loading RD projects module data:', error);
      toast.error('Error al cargar proyectos I+D');
      setTemplates(initialRDProjectTemplates);
      setProjects(initialRDProjects);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsible.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const handleOpenNewProject = () => {
    setStep(1);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      status: 'Borrador',
      priority: 'Media',
      responsible: user?.name || '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      sections: []
    });
    setIsNewProjectModalOpen(true);
  };

  const handleSelectTemplate = (template: RDProjectTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      name: template.name + ' - ' + format(new Date(), 'dd/MM/yy'),
      sections: template.sections.map(s => ({
        ...s,
        fields: s.fields.map(f => ({ ...f, value: f.type === 'boolean' ? false : '' }))
      }))
    }));
    setStep(2);
  };

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections?.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            fields: s.fields.map(f => f.id === fieldId ? { ...f, value } : f)
          };
        }
        return s;
      })
    }));
  };

  const handleSubmitProject = async () => {
    if (!formData.name || !formData.responsible) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }

    // Validate required fields from template
    if (formData.sections) {
      for (const section of formData.sections) {
        for (const field of section.fields) {
          if (field.required && (!field.value || field.value.toString().trim() === '')) {
            toast.error(`El campo "${field.label}" en la sección "${section.title}" es obligatorio`);
            return;
          }
        }
      }
    }

    const projectData: Partial<RDProject> = {
      templateId: selectedTemplate?.id || 'generic',
      name: formData.name || '',
      description: formData.description || '',
      status: formData.status as any || 'Borrador',
      priority: formData.priority as any || 'Media',
      responsible: formData.responsible || '',
      startDate: formData.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: formData.endDate,
      sections: formData.sections || [],
      attachments: formData.attachments || [],
      updatedAt: new Date().toISOString()
    };

    try {
      if (selectedProject) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedProject.id);
        let result;
        if (isUUID) {
          result = await SupabaseService.updateRDProject(selectedProject.id, projectData);
        } else {
          result = await SupabaseService.createRDProject({ ...projectData, createdAt: selectedProject.createdAt } as RDProject);
        }
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? result : p));
        toast.success('Proyecto actualizado con éxito');
      } else {
        const result = await SupabaseService.createRDProject({ ...projectData, createdAt: new Date().toISOString() } as RDProject);
        setProjects(prev => [result, ...prev]);
        toast.success('Proyecto creado con éxito');
      }
      setIsNewProjectModalOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Error al guardar el proyecto');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await SupabaseService.deleteRDProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Proyecto eliminado');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Error al eliminar el proyecto');
    }
  };

  const handleUpdateTemplate = async (template: RDProjectTemplate) => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(template.id);
      let result;
      if (isUUID) {
        result = await SupabaseService.updateRDProjectTemplate(template.id, template);
      } else {
        result = await SupabaseService.createRDProjectTemplate(template);
      }
      setTemplates(prev => prev.map(t => t.id === template.id ? result : t));
      toast.success('Plantilla actualizada');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Error al actualizar plantilla');
    }
  };

  const handleAddTemplate = async (template: RDProjectTemplate) => {
    try {
      const result = await SupabaseService.createRDProjectTemplate(template);
      setTemplates(prev => [...prev, result]);
      toast.success('Plantilla creada');
    } catch (error) {
      console.error('Error adding template:', error);
      toast.error('Error al crear plantilla');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await SupabaseService.deleteRDProjectTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Plantilla eliminada');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleEditProject = (project: RDProject) => {
    setSelectedProject(project);
    const template = templates.find(t => t.id === project.templateId) || templates[0];
    setSelectedTemplate(template);
    setFormData(project);
    setStep(2);
    setIsNewProjectModalOpen(true);
  };

  const handleExportExcel = () => {
    const data = filteredProjects.map(p => ({
      'ID': p.id,
      'Nombre': p.name,
      'Descripción': p.description,
      'Estado': p.status,
      'Prioridad': p.priority,
      'Responsable': p.responsible,
      'Fecha Inicio': p.startDate,
      'Fecha Fin': p.endDate || 'N/A',
      'Creado': format(new Date(p.createdAt), 'dd/MM/yyyy')
    }));
    exportToExcel(data, `Proyectos_ID_${format(new Date(), 'yyyyMMdd')}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'En Proceso': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Revisión': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Cancelado': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Crítica': return 'text-rose-600';
      case 'Alta': return 'text-orange-600';
      case 'Media': return 'text-amber-600';
      default: return 'text-emerald-600';
    }
  };

  const getTemplateIcon = (iconName: string, className?: string) => {
    const iconProps = { size: 20 };
    const defaultColors: Record<string, string> = {
      'Droplets': 'text-blue-500',
      'Ruler': 'text-amber-500',
      'FlaskConical': 'text-emerald-500',
      'Briefcase': 'text-slate-500',
      'FileText': 'text-indigo-500',
      'Tag': 'text-rose-500',
      'Settings': 'text-slate-600',
      'Info': 'text-sky-500',
      'Activity': 'text-orange-500',
      'Database': 'text-purple-500',
      'Cpu': 'text-cyan-500',
      'Globe': 'text-blue-600',
      'HardDrive': 'text-slate-700',
      'Layers': 'text-violet-500',
      'Zap': 'text-yellow-500',
      'Shield': 'text-red-500'
    };

    const finalClassName = className || defaultColors[iconName] || 'text-slate-500';

    switch (iconName) {
      case 'Droplets': return <Droplets {...iconProps} className={finalClassName} />;
      case 'Ruler': return <Ruler {...iconProps} className={finalClassName} />;
      case 'FlaskConical': return <FlaskConical {...iconProps} className={finalClassName} />;
      case 'Briefcase': return <Briefcase {...iconProps} className={finalClassName} />;
      case 'FileText': return <FileText {...iconProps} className={finalClassName} />;
      case 'Tag': return <Tag {...iconProps} className={finalClassName} />;
      case 'Settings': return <Settings {...iconProps} className={finalClassName} />;
      case 'Info': return <Info {...iconProps} className={finalClassName} />;
      case 'Activity': return <Activity {...iconProps} className={finalClassName} />;
      case 'Database': return <Database {...iconProps} className={finalClassName} />;
      case 'Cpu': return <Cpu {...iconProps} className={finalClassName} />;
      case 'Globe': return <Globe {...iconProps} className={finalClassName} />;
      case 'HardDrive': return <HardDrive {...iconProps} className={finalClassName} />;
      case 'Layers': return <Layers {...iconProps} className={finalClassName} />;
      case 'Zap': return <Zap {...iconProps} className={finalClassName} />;
      case 'Shield': return <Shield {...iconProps} className={finalClassName} />;
      default: return <Briefcase {...iconProps} className={finalClassName} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Proyectos I+D</h2>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
            <Briefcase size={18} className="text-blue-500" />
            Administración flexible de ensayos, dimensionamientos e investigación
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Gestionar Plantillas"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            title="Exportar a Excel"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={handleOpenNewProject}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus size={20} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar proyectos por nombre, descripción o responsable..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all shadow-sm text-slate-700 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Projects Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col"
              >
                <div className="p-8 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <button 
                      onClick={() => {
                        setSelectedProject(project);
                        setIsDetailModalOpen(true);
                      }}
                      className={`p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300 active:scale-95 group/icon shadow-sm`}
                      title="Ver detalles"
                    >
                      <div className="group-hover/icon:scale-110 transition-transform duration-500">
                        {getTemplateIcon(templates.find(t => t.id === project.templateId)?.icon || '')}
                      </div>
                    </button>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{project.name}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-6 font-medium leading-relaxed">{project.description}</p>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Responsable</span>
                      <span className="text-slate-700 font-bold flex items-center gap-2">
                        <User size={14} className="text-slate-400" />
                        {project.responsible}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Prioridad</span>
                      <span className={`font-black flex items-center gap-2 ${getPriorityColor(project.priority)}`}>
                        <AlertCircle size={14} />
                        {project.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Inicio</span>
                      <span className="text-slate-700 font-bold flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {format(new Date(project.startDate), 'dd MMM, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditProject(project)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteConfirm({
                          id: project.id,
                          user: user?.name || 'Sistema',
                          onConfirm: () => {
                            handleDeleteProject(project.id);
                            setDeleteConfirm(null);
                          }
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedProject(project);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-2 text-blue-600 font-bold text-sm px-4 py-2 hover:bg-blue-100 rounded-xl transition-all"
                  >
                    Ver Detalles
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyecto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridad</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicio</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500">
                        {getTemplateIcon(templates.find(t => t.id === project.templateId)?.icon || '')}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</div>
                        <div className="text-xs text-slate-400 font-medium">{templates.find(t => t.id === project.templateId)?.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`font-bold text-sm flex items-center gap-2 ${getPriorityColor(project.priority)}`}>
                      <AlertCircle size={14} />
                      {project.priority}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px]">
                        {project.responsible.charAt(0)}
                      </div>
                      {project.responsible}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-slate-600">{format(new Date(project.startDate), 'dd/MM/yyyy')}</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditProject(project)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedProject(project);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Project / Edit Modal */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewProjectModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedProject ? 'Editar Proyecto' : 'Nuevo Proyecto I+D'}
                  </h3>
                  <p className="text-slate-500 font-medium">
                    {step === 1 ? 'Seleccione una plantilla para comenzar' : `Completando: ${selectedTemplate?.name}`}
                  </p>
                </div>
                <button 
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-10">
                {step === 1 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group relative flex flex-col items-center text-center p-8 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 transition-all overflow-hidden"
                      >
                        {template.backgroundImage && (
                          <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                            <img src={template.backgroundImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="relative z-10">
                          <div className="p-6 bg-slate-50 rounded-[1.5rem] mb-6 group-hover:scale-110 group-hover:bg-blue-50 transition-all duration-500 mx-auto w-fit">
                            {getTemplateIcon(template.icon)}
                          </div>
                          <h4 className="text-lg font-black text-slate-900 mb-2">{template.name}</h4>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed">{template.description}</p>
                          <div className="mt-6 flex items-center gap-2 text-blue-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-all justify-center">
                            Seleccionar
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    {selectedTemplate?.backgroundImage && (
                      <div className="absolute inset-0 -m-10 opacity-5 pointer-events-none">
                        <img src={selectedTemplate.backgroundImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="relative z-10 space-y-10">
                      {/* Basic Info Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Proyecto *</label>
                        <input 
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Ej: Ensayo de dureza - Planta 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable *</label>
                        <input 
                          type="text"
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                          value={formData.responsible}
                          onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                          placeholder="Nombre del encargado"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
                        <select 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                        >
                          <option value="Borrador">Borrador</option>
                          <option value="En Proceso">En Proceso</option>
                          <option value="Revisión">Revisión</option>
                          <option value="Completado">Completado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
                        <select 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none"
                          value={formData.priority}
                          onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                        >
                          <option value="Baja">Baja</option>
                          <option value="Media">Media</option>
                          <option value="Alta">Alta</option>
                          <option value="Crítica">Crítica</option>
                        </select>
                      </div>
                    </div>

                    {/* Template Specific Sections */}
                    {formData.sections?.map((section) => (
                      <div key={section.id} className="space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                          <h4 className="text-lg font-black text-slate-900 tracking-tight">{section.title}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {section.fields.map((field) => (
                            <div key={field.id} className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {field.label} {field.required && '*'}
                              </label>
                              
                              {field.type === 'text' && (
                                <input 
                                  type="text"
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                />
                              )}

                              {field.type === 'number' && (
                                <input 
                                  type="number"
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                />
                              )}

                              {field.type === 'textarea' && (
                                <textarea 
                                  rows={4}
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700 resize-none"
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                />
                              )}

                              {field.type === 'select' && (
                                <select 
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none"
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                >
                                  <option value="">Seleccione...</option>
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}

                              {field.type === 'date' && (
                                <input 
                                  type="date"
                                  className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                                  value={field.value}
                                  onChange={(e) => handleFieldChange(section.id, field.id, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-10 py-8 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button 
                  onClick={() => step === 2 ? setStep(1) : setIsNewProjectModalOpen(false)}
                  className="px-8 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
                >
                  {step === 2 ? 'Volver a Plantillas' : 'Cancelar'}
                </button>
                {step === 2 && (
                  <button 
                    onClick={handleSubmitProject}
                    className="flex items-center gap-2 bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <Save size={20} />
                    {selectedProject ? 'Guardar Cambios' : 'Crear Proyecto'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consolidated Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className={`w-20 h-20 ${deleteConfirm.type === 'project' ? 'bg-rose-50 text-rose-500' : 'bg-rose-50 text-rose-500'} rounded-3xl flex items-center justify-center mx-auto mb-8`}>
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">
                {deleteConfirm.type === 'project' ? '¿Eliminar Proyecto?' : '¿Eliminar Plantilla?'}
              </h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                Estás a punto de eliminar {deleteConfirm.type === 'project' ? 'el proyecto' : 'la plantilla'} <span className="text-slate-900 font-bold">"{deleteConfirm.title}"</span>. 
                Esta acción no se puede deshacer.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={deleteConfirm.onConfirm}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-95"
                >
                  Sí, Eliminar {deleteConfirm.type === 'project' ? 'Proyecto' : 'Plantilla'}
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-12 py-10 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100">
                    {getTemplateIcon(templates.find(t => t.id === selectedProject.templateId)?.icon || '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedProject.name}</h3>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedProject.status)}`}>
                        {selectedProject.status}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">
                      {templates.find(t => t.id === selectedProject.templateId)?.name} • ID: {selectedProject.id}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 relative">
                {templates.find(t => t.id === selectedProject.templateId)?.backgroundImage && (
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <img 
                      src={templates.find(t => t.id === selectedProject.templateId)?.backgroundImage} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    {/* Project Data Sections */}
                    {selectedProject.sections.map((section) => (
                      <div key={section.id} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                          <h4 className="text-xl font-black text-slate-900 tracking-tight">{section.title}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100">
                          {section.fields.map((field) => (
                            <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{field.label}</div>
                              <div className="text-slate-700 font-bold bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
                                {field.value || <span className="text-slate-300 italic">No registrado</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
                      <h4 className="text-sm font-black uppercase tracking-widest mb-8 opacity-50">Información de Gestión</h4>
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            <User size={20} className="text-blue-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Responsable</div>
                            <div className="font-bold">{selectedProject.responsible}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            <AlertCircle size={20} className="text-amber-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Prioridad</div>
                            <div className={`font-black ${getPriorityColor(selectedProject.priority)}`}>{selectedProject.priority}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            <Calendar size={20} className="text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Fecha de Inicio</div>
                            <div className="font-bold">{format(new Date(selectedProject.startDate), 'dd/MM/yyyy')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Adjuntos</h4>
                        <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-all">
                          <Upload size={18} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {selectedProject.attachments.length > 0 ? (
                          selectedProject.attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                <FileText size={18} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{file.name}</span>
                              </div>
                              <button className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                                <Download size={16} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Info size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">Sin archivos adjuntos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-12 py-8 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-4">
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditProject(selectedProject);
                  }}
                  className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Edit2 size={18} />
                  Editar Proyecto
                </button>
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Management Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsTemplateModalOpen(false);
                setEditingTemplate(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Gestionar Plantillas de Proyecto</h3>
                  <p className="text-slate-500 text-sm font-medium">Crea y personaliza tus propias estructuras de datos</p>
                </div>
                <button 
                  onClick={() => {
                    setIsTemplateModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10">
                {!editingTemplate ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {templates.map((template) => (
                        <div 
                          key={template.id}
                          className="group bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex items-start justify-between"
                        >
                          <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => {
                            setEditingTemplate(template);
                            setTemplateFormData(template);
                          }}>
                            <div className="p-4 bg-slate-50 rounded-2xl text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              {getTemplateIcon(template.icon)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {template.name}
                                {template.isCustom && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-full">Personalizada</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 line-clamp-1">{template.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingTemplate(template);
                                setTemplateFormData(template);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setDeleteConfirm({
                                  id: template.id,
                                  title: template.name,
                                  type: 'template',
                                  onConfirm: () => {
                                    handleDeleteTemplate(template.id);
                                    setDeleteConfirm(null);
                                  }
                                });
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newId = `custom-${Date.now()}`;
                          const newTemplate: RDProjectTemplate = {
                            id: newId,
                            name: '',
                            description: '',
                            icon: 'Briefcase',
                            sections: [{ id: 'section-1', title: 'Nueva Sección', fields: [] }],
                            isCustom: true
                          };
                          setEditingTemplate(newTemplate);
                          setTemplateFormData(newTemplate);
                        }}
                        className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 transition-all group"
                      >
                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
                          <Plus size={24} />
                        </div>
                        <span className="font-bold text-sm">Crear Nueva Plantilla</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Nombre de la Plantilla</label>
                          <input 
                            type="text"
                            value={templateFormData.name}
                            onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700"
                            placeholder="Ej: Ensayo de Laboratorio"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Descripción</label>
                          <textarea 
                            value={templateFormData.description}
                            onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-slate-700 h-24 resize-none"
                            placeholder="Describe el propósito de esta plantilla..."
                          />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Icono</label>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                            {['Droplets', 'Ruler', 'FlaskConical', 'Briefcase', 'FileText', 'Tag', 'Settings', 'Info', 'Activity', 'Database', 'Cpu', 'Globe', 'HardDrive', 'Layers', 'Zap', 'Shield'].map((icon) => (
                              <button
                                key={icon}
                                type="button"
                                onClick={() => setTemplateFormData({ ...templateFormData, icon })}
                                className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${templateFormData.icon === icon ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                title={icon}
                              >
                                {getTemplateIcon(icon, templateFormData.icon === icon ? 'text-white' : undefined)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Imagen de Fondo (Opcional)</label>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-sm font-medium truncate">
                              {templateFormData.backgroundImage ? 'Imagen seleccionada' : 'Sin imagen de fondo'}
                            </div>
                            <button 
                              onClick={() => {
                                const url = prompt('Ingresa la URL de la imagen de fondo:');
                                if (url) setTemplateFormData({ ...templateFormData, backgroundImage: url });
                              }}
                              className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                            >
                              <Upload size={20} />
                            </button>
                            {templateFormData.backgroundImage && (
                              <button 
                                onClick={() => setTemplateFormData({ ...templateFormData, backgroundImage: undefined })}
                                className="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"
                              >
                                <X size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                          <h4 className="text-xl font-black text-slate-900 tracking-tight">Estructura de Secciones y Campos</h4>
                        </div>
                        <button 
                          onClick={() => {
                            const newSection = {
                              id: `section-${Date.now()}`,
                              title: 'Nueva Sección',
                              fields: []
                            };
                            setTemplateFormData({
                              ...templateFormData,
                              sections: [...(templateFormData.sections || []), newSection]
                            });
                          }}
                          className="flex items-center gap-2 text-blue-600 font-bold text-sm px-4 py-2 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          <Plus size={16} />
                          Añadir Sección
                        </button>
                      </div>

                      <div className="space-y-6">
                        {templateFormData.sections?.map((section, sIdx) => (
                          <div key={section.id} className="bg-slate-50 rounded-[2.5rem] border border-slate-200 p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              <input 
                                type="text"
                                value={section.title}
                                onChange={(e) => {
                                  const newSections = [...(templateFormData.sections || [])];
                                  newSections[sIdx].title = e.target.value;
                                  setTemplateFormData({ ...templateFormData, sections: newSections });
                                }}
                                className="bg-transparent border-none text-lg font-black text-slate-900 focus:ring-0 p-0 w-full"
                                placeholder="Título de la Sección"
                              />
                              <button 
                                onClick={() => {
                                  const newSections = templateFormData.sections?.filter((_, i) => i !== sIdx);
                                  setTemplateFormData({ ...templateFormData, sections: newSections });
                                }}
                                className="p-2 text-slate-400 hover:text-rose-600 transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>

                            <div className="space-y-4">
                              {section.fields.map((field, fIdx) => (
                                <div key={field.id} className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                  <div className="md:col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre del Campo</label>
                                    <input 
                                      type="text"
                                      value={field.label}
                                      onChange={(e) => {
                                        const newSections = [...(templateFormData.sections || [])];
                                        newSections[sIdx].fields[fIdx].label = e.target.value;
                                        setTemplateFormData({ ...templateFormData, sections: newSections });
                                      }}
                                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700"
                                      placeholder="Ej: Temperatura"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tipo</label>
                                    <select 
                                      value={field.type}
                                      onChange={(e) => {
                                        const newSections = [...(templateFormData.sections || [])];
                                        newSections[sIdx].fields[fIdx].type = e.target.value as any;
                                        setTemplateFormData({ ...templateFormData, sections: newSections });
                                      }}
                                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700"
                                    >
                                      <option value="text">Texto</option>
                                      <option value="number">Número</option>
                                      <option value="date">Fecha</option>
                                      <option value="select">Selección</option>
                                      <option value="textarea">Área de Texto</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        const newSections = [...(templateFormData.sections || [])];
                                        const section = { ...newSections[sIdx] };
                                        const fields = [...section.fields];
                                        fields[fIdx] = { ...fields[fIdx], required: !fields[fIdx].required };
                                        section.fields = fields;
                                        newSections[sIdx] = section;
                                        setTemplateFormData({ ...templateFormData, sections: newSections });
                                      }}
                                      className={`p-2 rounded-xl transition-all ${field.required ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                      title="Requerido"
                                    >
                                      <CheckCircle2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newSections = [...(templateFormData.sections || [])];
                                        newSections[sIdx].fields = newSections[sIdx].fields.filter((_, i) => i !== fIdx);
                                        setTemplateFormData({ ...templateFormData, sections: newSections });
                                      }}
                                      className="p-2 text-slate-400 hover:text-rose-600 transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                  {field.type === 'select' && (
                                    <div className="md:col-span-4 mt-2">
                                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Opciones (separadas por coma)</label>
                                      <input 
                                        type="text"
                                        value={field.options?.join(', ') || ''}
                                        onChange={(e) => {
                                          const newSections = [...(templateFormData.sections || [])];
                                          newSections[sIdx].fields[fIdx].options = e.target.value.split(',').map(s => s.trim());
                                          setTemplateFormData({ ...templateFormData, sections: newSections });
                                        }}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700"
                                        placeholder="Opción 1, Opción 2, Opción 3"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newField = {
                                    id: `field-${Date.now()}`,
                                    label: 'Nuevo Campo',
                                    type: 'text' as const,
                                    required: false
                                  };
                                  const newSections = [...(templateFormData.sections || [])];
                                  newSections[sIdx].fields.push(newField);
                                  setTemplateFormData({ ...templateFormData, sections: newSections });
                                }}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-white transition-all group"
                              >
                                <Plus size={16} />
                                <span className="font-bold text-xs">Añadir Campo</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-10 py-8 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button 
                  onClick={() => {
                    if (editingTemplate) {
                      setEditingTemplate(null);
                    } else {
                      setIsTemplateModalOpen(false);
                    }
                  }}
                  className="px-8 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
                >
                  {editingTemplate ? 'Volver al Listado' : 'Cerrar'}
                </button>
                {editingTemplate && (
                  <button 
                    onClick={() => {
                      if (!templateFormData.name) {
                        toast.error('El nombre de la plantilla es obligatorio');
                        return;
                      }
                      if (templates.find(t => t.id === templateFormData.id)) {
                        handleUpdateTemplate(templateFormData as RDProjectTemplate);
                      } else {
                        handleAddTemplate(templateFormData as RDProjectTemplate);
                      }
                      setEditingTemplate(null);
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-10 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    <Save size={20} />
                    Guardar Plantilla
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
