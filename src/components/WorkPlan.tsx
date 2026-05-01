import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  History, 
  ChevronRight, 
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  X,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Copy
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  Label
} from 'recharts';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, differenceInDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Project, ProjectActivity, AuditLog } from '../types';
import { initialProjects, initialAuditLogs } from '../data/mockData';
import { SupabaseService } from '../lib/SupabaseService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord } from '../lib/api';


interface WorkPlanProps {
  initialData?: any;
  onExportPPT?: () => void;
}

export default function WorkPlan({ initialData, onExportPPT }: WorkPlanProps) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isLogProgressModalOpen, setIsLogProgressModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingActivity, setEditingActivity] = useState<{ projectId: string, activity: ProjectActivity } | null>(null);
  const [loggingProgress, setLoggingProgress] = useState<{ projectId: string, activity: ProjectActivity, date: Date } | null>(null);
  const [copiedProgress, setCopiedProgress] = useState<{ progress: number, comments: string } | null>(null);

  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsData, logsData] = await Promise.all([
        SupabaseService.getProjects(),
        SupabaseService.getAuditLogs()
      ]);
      setProjects(projectsData as any);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Error loading workplan data:', error);
      toast.error('Error al cargar datos del plan de trabajo');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = (details: { projectName: string; sampleId: string; description: string }) => {
    localStorage.setItem('workplan_projects_data', JSON.stringify(projects));
    localStorage.setItem('workplan_audit_logs', JSON.stringify(auditLogs));
    saveCalculationRecord(
      'work_plan', 
      'save', 
      { projects, auditLogs }, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Plan de trabajo y auditoría guardados localmente y en la base de datos');
  };

  const handleExportExcel = () => {
    const exportData: any[] = [];
    projects.forEach(p => {
      p.activities.forEach(a => {
        exportData.push({
          'Proyecto': p.name,
          'Responsable Proyecto': p.responsible,
          'Actividad': a.name,
          'Progreso (%)': a.progress,
          'Estado': a.status,
          'Inicio Planificado': a.plannedStartDate,
          'Fin Planificado': a.plannedEndDate,
          'Responsable Actividad': a.responsible.join(', ')
        });
      });
    });

    exportToExcel(exportData, `Plan_Trabajo_RD_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('work_plan', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'workplan-dashboard', title: 'Dashboard de Proyectos R&D' },
      { contentId: 'workplan-calendar', title: 'Cronograma de Actividades' },
      { contentId: 'workplan-audit', title: 'Historial de Auditoría' }
    ];

    await generateReportPDF(sections, `Informe_Plan_Trabajo_${format(new Date(), 'yyyyMMdd')}`, 'Informe de Plan de Trabajo R&D');
    saveCalculationRecord('work_plan', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Audit logging helper
  const addAuditLog = async (action: AuditLog['action'], entityType: AuditLog['entityType'], entityId: string, entityName: string, previousData?: any, newData?: any) => {
    try {
      const newLog = await SupabaseService.createAuditLog({
        user: user?.name || 'Usuario',
        userEmail: user?.email || '',
        action,
        entityType,
        entityId,
        entityName,
        previousData,
        newData
      });
      setAuditLogs(prev => [newLog, ...prev]);
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (projectToDelete) {
      setConfirmation({
        isOpen: true,
        title: 'Eliminar Proyecto',
        message: `¿Está seguro de eliminar el proyecto "${projectToDelete.name}"? Esta acción quedará registrada en el historial.`,
        onConfirm: async () => {
          try {
            await SupabaseService.deleteProject(projectId);
            addAuditLog('delete', 'PROJECT', projectId, projectToDelete.name, projectToDelete);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            toast.success('Proyecto eliminado');
          } catch (error) {
            console.error('Error deleting project:', error);
            toast.error('Error al eliminar proyecto');
          }
          setConfirmation(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleDeleteActivity = (projectId: string, activityId: string) => {
    const project = projects.find(p => p.id === projectId);
    const activityToDelete = project?.activities.find(a => a.id === activityId);
    
    if (project && activityToDelete) {
      setConfirmation({
        isOpen: true,
        title: 'Eliminar Actividad',
        message: `¿Está seguro de eliminar la actividad "${activityToDelete.name}"? Esta acción quedará registrada en el historial.`,
        onConfirm: async () => {
          try {
            await SupabaseService.deleteProjectActivity(activityId);
            addAuditLog('delete', 'ACTIVITY', activityId, activityToDelete.name, activityToDelete);
            setProjects(prev => prev.map(p => {
              if (p.id === projectId) {
                return {
                  ...p,
                  activities: p.activities.filter(a => a.id !== activityId)
                };
              }
              return p;
            }));
            toast.success('Actividad eliminada');
          } catch (error) {
            console.error('Error deleting activity:', error);
            toast.error('Error al eliminar actividad');
          }
          setConfirmation(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const responsible = formData.get('responsible') as string;
    const status = formData.get('status') as Project['status'];

    try {
      if (editingProject) {
        const updatedProject = { ...editingProject, name, responsible, status };
        const result = await SupabaseService.updateProject(editingProject.id, updatedProject);
        addAuditLog('update', 'PROJECT', editingProject.id, name, editingProject, result);
        setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...result, activities: p.activities } : p));
        toast.success('Proyecto actualizado');
      } else {
        const newProjectData: Partial<Project> = {
          number: (projects.length + 1).toString(),
          name,
          responsible,
          progress: 0,
          status
        };
        const result = await SupabaseService.createProject(newProjectData);
        const newProject: Project = { ...result, activities: [] };
        addAuditLog('create', 'PROJECT', result.id, name, undefined, newProject);
        setProjects(prev => [...prev, newProject]);
        toast.success('Proyecto creado');
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Error al guardar proyecto');
    }
  };

  const handleDuplicateProject = (project: Project) => {
    const newId = `P-${Date.now()}`;
    const newNumber = (projects.length + 1).toString();
    
    const duplicatedProject: Project = {
      ...project,
      id: newId,
      number: newNumber,
      name: `${project.name} (Copia)`,
      progress: 0,
      status: 'NO INICIADO',
      activities: project.activities.map((activity, index) => ({
        ...activity,
        id: `A-${Date.now()}-${index}`,
        number: `${newNumber}.${index + 1}`,
        progress: 0,
        status: 'NO INICIADO',
        comments: ''
      }))
    };

    setProjects(prev => [...prev, duplicatedProject]);
    addAuditLog('create', 'PROJECT', newId, duplicatedProject.name, undefined, duplicatedProject);
  };

  const handleEditActivity = (projectId: string, activity: ProjectActivity) => {
    setEditingActivity({ projectId, activity });
    setIsActivityModalOpen(true);
  };

  const handleAddActivity = (projectId: string) => {
    setEditingActivity({ 
      projectId, 
      activity: {
        id: `A-${Date.now()}`,
        number: '',
        name: '',
        progress: 0,
        status: 'NO INICIADO',
        plannedStartDate: format(new Date(), 'yyyy-MM-dd'),
        plannedEndDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        responsible: ['Carlos Hoyos'],
        classification: 'Plan inicial'
      }
    });
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const progress = parseInt(formData.get('progress') as string);
    const status = formData.get('status') as ProjectActivity['status'];
    const plannedStartDate = formData.get('plannedStartDate') as string;
    const plannedEndDate = formData.get('plannedEndDate') as string;
    const actualStartDate = formData.get('actualStartDate') as string || undefined;
    const actualEndDate = formData.get('actualEndDate') as string || undefined;

    if (editingActivity) {
      try {
        const isNew = !projects.find(p => p.id === editingActivity.projectId)?.activities.find(a => a.id === editingActivity.activity.id);
        
        const activityData: Partial<ProjectActivity> = { 
          ...editingActivity.activity, 
          name, 
          progress, 
          status, 
          plannedStartDate, 
          plannedEndDate,
          actualStartDate,
          actualEndDate
        };

        let result: ProjectActivity;
        if (isNew) {
          result = await SupabaseService.createProjectActivity(editingActivity.projectId, activityData);
          addAuditLog('create', 'ACTIVITY', result.id, name, undefined, result);
        } else {
          result = await SupabaseService.updateProjectActivity(editingActivity.activity.id, activityData);
          addAuditLog('update', 'ACTIVITY', editingActivity.activity.id, name, editingActivity.activity, result);
        }
        
        setProjects(prev => prev.map(p => {
          if (p.id === editingActivity.projectId) {
            let newActivities;
            if (isNew) {
              newActivities = [...p.activities, result];
            } else {
              newActivities = p.activities.map(a => a.id === editingActivity.activity.id ? result : a);
            }
            
            // Recalculate project progress
            const totalProgress = newActivities.reduce((acc, curr) => acc + curr.progress, 0);
            const avgProgress = newActivities.length > 0 ? Math.round(totalProgress / newActivities.length) : 0;
            
            return {
              ...p,
              activities: newActivities,
              progress: avgProgress
            };
          }
          return p;
        }));
        toast.success(isNew ? 'Actividad creada' : 'Actividad actualizada');
        setIsActivityModalOpen(false);
        setEditingActivity(null);
      } catch (error) {
        console.error('Error saving activity:', error);
        toast.error('Error al guardar actividad');
      }
    }
  };

  const handleLogProgress = (projectId: string, activity: ProjectActivity, date: Date) => {
    setLoggingProgress({ projectId, activity, date });
    setIsLogProgressModalOpen(true);
  };

  const handleSaveLoggedProgress = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const additionalProgress = parseInt(formData.get('additionalProgress') as string);
    const comments = formData.get('comments') as string;

    if (loggingProgress) {
      const currentProgress = loggingProgress.activity.progress;
      const newProgress = Math.min(100, currentProgress + additionalProgress);
      const dateKey = format(loggingProgress.date, 'yyyy-MM-dd');
      
      const updatedActivity: ProjectActivity = {
        ...loggingProgress.activity,
        progress: newProgress,
        comments: comments ? `${loggingProgress.activity.comments || ''}\n[${format(loggingProgress.date, 'dd/MM/yyyy')}]: ${comments}` : loggingProgress.activity.comments,
        status: newProgress === 100 ? 'COMPLETADO' : 'EN PROCESO',
        dailyProgress: {
          ...(loggingProgress.activity.dailyProgress || {}),
          [dateKey]: { progress: additionalProgress, comments }
        }
      };

      addAuditLog('update', 'ACTIVITY', loggingProgress.activity.id, loggingProgress.activity.name, loggingProgress.activity, updatedActivity);

      setProjects(prev => prev.map(p => {
        if (p.id === loggingProgress.projectId) {
          const newActivities = p.activities.map(a => a.id === loggingProgress.activity.id ? updatedActivity : a);
          const totalProgress = newActivities.reduce((acc, curr) => acc + curr.progress, 0);
          const avgProgress = newActivities.length > 0 ? Math.round(totalProgress / newActivities.length) : 0;

          return {
            ...p,
            activities: newActivities,
            progress: avgProgress
          };
        }
        return p;
      }));
    }
    setIsLogProgressModalOpen(false);
    setLoggingProgress(null);
  };

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETADO': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EN PROCESO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'RETRASADO': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Seguimiento de Plan de Trabajo</h2>
          <p className="text-slate-500">Gestión y control de proyectos R&D</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              showDashboard 
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showDashboard ? <CalendarIcon size={18} /> : <BarChart3 size={18} />}
            {showDashboard ? 'Ver Calendario' : 'Dashboard Gerencial'}
          </button>
          <button 
            onClick={() => setShowAuditTrail(!showAuditTrail)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <History size={18} />
            Historial de Cambios
          </button>
          <button 
            onClick={() => {
              setEditingProject(null);
              setIsProjectModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={18} />
            Nuevo Proyecto
          </button>
        </div>
      </div>

      {showDashboard ? (
        <div id="workplan-dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Proyectos</p>
                  <p className="text-2xl font-black text-slate-900">{projects.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completados</p>
                  <p className="text-2xl font-black text-slate-900">
                    {projects.filter(p => p.status === 'COMPLETADO').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Proceso</p>
                  <p className="text-2xl font-black text-slate-900">
                    {projects.filter(p => p.status === 'EN PROCESO').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avance Promedio</p>
                  <p className="text-2xl font-black text-slate-900">
                    {projects.length > 0 
                      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress by Project */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-600" />
                Avance por Proyecto
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projects}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="number" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    >
                      <Label value="Número de Proyecto" offset={-5} position="insideBottom" fill="#94a3b8" fontSize={10} fontWeight={700} />
                    </XAxis>
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      unit="%"
                    >
                      <Label value="Avance" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} fill="#94a3b8" fontSize={10} fontWeight={700} />
                    </YAxis>
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                      {projects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.progress === 100 ? '#10b981' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Projects by Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-indigo-600" />
                Distribución por Estado
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completado', value: projects.filter(p => p.status === 'COMPLETADO').length, color: '#10b981' },
                        { name: 'En Proceso', value: projects.filter(p => p.status === 'EN PROCESO').length, color: '#6366f1' },
                        { name: 'No Iniciado', value: projects.filter(p => p.status === 'NO INICIADO').length, color: '#94a3b8' },
                        { name: 'Retrasado', value: projects.filter(p => p.status === 'RETRASADO').length, color: '#f43f5e' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: 'Completado', value: projects.filter(p => p.status === 'COMPLETADO').length, color: '#10b981' },
                        { name: 'En Proceso', value: projects.filter(p => p.status === 'EN PROCESO').length, color: '#6366f1' },
                        { name: 'No Iniciado', value: projects.filter(p => p.status === 'NO INICIADO').length, color: '#94a3b8' },
                        { name: 'Retrasado', value: projects.filter(p => p.status === 'RETRASADO').length, color: '#f43f5e' },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Progress Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Resumen Detallado de Avances</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-center">Proyecto</th>
                    <th className="px-6 py-4 text-center">Responsable</th>
                    <th className="px-6 py-4 text-center">Actividades</th>
                    <th className="px-6 py-4 text-center">Avance</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">P-{project.number}</span>
                          <span className="text-sm font-bold text-slate-900">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{project.responsible}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-700">
                          {project.activities.filter(a => a.status === 'COMPLETADO').length} / {project.activities.length}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : showAuditTrail ? (
        <div id="workplan-audit" className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-bottom border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              Auditoría de Cambios
            </h3>
            <button onClick={() => setShowAuditTrail(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3 text-center">Fecha/Hora</th>
                  <th className="px-6 py-3 text-center">Usuario</th>
                  <th className="px-6 py-3 text-center">Acción</th>
                  <th className="px-6 py-3 text-center">Entidad</th>
                  <th className="px-6 py-3 text-center">Nombre</th>
                  <th className="px-6 py-3 text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                      No hay registros de auditoría aún.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {format(parseISO(log.date), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {log.user}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          log.action === 'create' ? 'bg-emerald-100 text-emerald-700' :
                          log.action === 'update' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {log.entityType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                        {log.entityName}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-indigo-600 hover:underline">Ver cambios</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar proyectos o responsables..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
              <button 
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 text-center font-semibold text-slate-900 capitalize">
                {format(viewDate, 'MMMM yyyy', { locale: es })}
              </div>
              <button 
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div id="workplan-calendar" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Header */}
                <div className="grid grid-cols-[350px_1fr] border-b border-slate-200 bg-slate-50/50">
                  <div className="p-4 font-semibold text-slate-700 border-r border-slate-200">
                    Proyectos y Actividades
                  </div>
                  <div className="flex">
                    {daysInMonth.map(day => (
                      <div 
                        key={day.toString()} 
                        className={`flex-1 min-w-[30px] border-r border-slate-100 py-2 text-center text-[10px] font-medium ${
                          isSameDay(day, new Date()) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="divide-y divide-slate-200">
                  {filteredProjects.map(project => (
                    <React.Fragment key={project.id}>
                      {/* Project Row */}
                      <div className="grid grid-cols-[350px_1fr] group">
                        <div className="p-4 border-r border-slate-200 flex items-start gap-3 bg-white group-hover:bg-slate-50/50 transition-colors">
                          <button 
                            onClick={() => toggleProject(project.id)}
                            className="mt-1 p-0.5 hover:bg-slate-200 rounded transition-colors"
                          >
                            {expandedProjects.has(project.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                Proyecto {project.number}
                              </span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleAddActivity(project.id)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Añadir Actividad"
                                >
                                  <Plus size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDuplicateProject(project)}
                                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Duplicar Proyecto"
                                >
                                  <Copy size={14} />
                                </button>
                                <button 
                                  onClick={() => handleEditProject(project)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <h4 className="font-bold text-slate-900 truncate" title={project.name}>
                              {project.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-500">{project.progress}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(project.status)}`}>
                                {project.status}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                Resp: {project.responsible}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="relative flex bg-white group-hover:bg-slate-50/50 transition-colors">
                          {daysInMonth.map(day => (
                            <div key={day.toString()} className="flex-1 min-w-[30px] border-r border-slate-100" />
                          ))}
                        </div>
                      </div>

                      {/* Activities */}
                      {expandedProjects.has(project.id) && project.activities.map(activity => {
                        const start = parseISO(activity.plannedStartDate);
                        const end = parseISO(activity.plannedEndDate);
                        
                        const progressDates = Object.keys(activity.dailyProgress || {}).map(d => parseISO(d));
                        const latestProgressDate = progressDates.length > 0 ? new Date(Math.max(...progressDates.map(d => d.getTime()))) : null;

                        return (
                          <div key={activity.id} className="grid grid-cols-[350px_1fr] group/activity">
                            <div className="p-4 pl-12 border-r border-slate-200 bg-slate-50/30 group-hover/activity:bg-slate-50 transition-colors">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  Actividad {activity.number}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => handleEditActivity(project.id, activity)}
                                    className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteActivity(project.id, activity.id)}
                                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <h5 className="text-sm font-medium text-slate-700 leading-tight">
                                {activity.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(activity.status)}`}>
                                  {activity.status}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {activity.progress}%
                                </span>
                              </div>
                            </div>
                            <div className="relative flex bg-slate-50/30 group-hover/activity:bg-slate-50 transition-colors">
                              {daysInMonth.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dailyData = activity.dailyProgress?.[dayKey];
                                const hasProgress = dailyData !== undefined;
                                
                                let indicatorColor = '';
                                if (hasProgress) {
                                  if (dailyData.progress === 0) indicatorColor = 'bg-rose-400';
                                  else if (activity.progress === 100) indicatorColor = 'bg-emerald-600';
                                  else indicatorColor = 'bg-emerald-400';
                                } else {
                                  const isBeforeLatest = latestProgressDate && isBefore(day, latestProgressDate);
                                  const isWithinPlanned = isWithinInterval(day, { start, end });
                                  if (isBeforeLatest && isWithinPlanned) {
                                    indicatorColor = 'bg-rose-300/50';
                                  }
                                }

                                return (
                                  <div 
                                    key={day.toString()} 
                                    className="flex-1 min-w-[30px] border-r border-slate-100 cursor-pointer transition-colors relative group/cell hover:bg-indigo-50/20"
                                    onClick={() => handleLogProgress(project.id, activity, day)}
                                    title={hasProgress ? `Avance: ${dailyData.progress}% - ${dailyData.comments}` : `Click para registrar avance`}
                                  >
                                    {/* Top indicator only */}
                                    {indicatorColor && (
                                      <div className={`absolute top-0 left-0 right-0 h-2 ${indicatorColor}`} />
                                    )}

                                    {hasProgress && (
                                      <div className="absolute inset-0 flex items-center justify-center pt-2">
                                        <span className={`text-[8px] font-bold ${dailyData.progress === 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                                          {dailyData.progress}%
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCopiedProgress({
                                              progress: dailyData.progress,
                                              comments: dailyData.comments
                                            });
                                          }}
                                          className="absolute top-2 right-0 p-0.5 bg-white/80 rounded-bl opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                          title="Copiar avance"
                                        >
                                          <Copy size={8} className="text-indigo-600" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {/* Timeline Bars (Planned vs Actual) */}
                              {isWithinInterval(start, { start: monthStart, end: monthEnd }) || 
                               isWithinInterval(end, { start: monthStart, end: monthEnd }) ||
                               (start < monthStart && end > monthEnd) ? (
                                <div 
                                  className="absolute inset-y-0 pointer-events-none z-10 flex flex-col justify-center gap-0.5"
                                  style={{
                                    left: `${Math.max(0, differenceInDays(start, monthStart)) * (100 / daysInMonth.length)}%`,
                                    width: `${Math.min(daysInMonth.length, differenceInDays(end, start) + 1) * (100 / daysInMonth.length)}%`,
                                  }}
                                >
                                  {/* Planned Bar (Blue) */}
                                  <div className="h-3 bg-blue-100 border border-blue-200 rounded-full relative group/planned">
                                    <div className="absolute -top-3.5 left-0 text-[7px] font-black text-blue-600 uppercase tracking-tighter opacity-0 group-hover/activity:opacity-100 transition-opacity">
                                      Planeado
                                    </div>
                                  </div>
                                  
                                  {/* Actual Bar (Green) */}
                                  <div className="h-6 bg-white border border-slate-200 rounded-full relative overflow-hidden shadow-md group/actual">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        activity.status === 'COMPLETADO' ? 'bg-emerald-600' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${activity.progress}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className={`text-[10px] font-black ${activity.progress > 50 ? 'text-white' : 'text-emerald-900'}`}>
                                        {activity.progress}%
                                      </span>
                                    </div>
                                    <div className="absolute -bottom-3.5 left-0 text-[7px] font-black text-emerald-600 uppercase tracking-tighter opacity-0 group-hover/activity:opacity-100 transition-opacity">
                                      Real
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Proyecto</label>
                <input
                  name="name"
                  defaultValue={editingProject?.name}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Responsable</label>
                <input
                  name="responsible"
                  defaultValue={editingProject?.responsible}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                <select
                  name="status"
                  defaultValue={editingProject?.status || 'NO INICIADO'}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="NO INICIADO">NO INICIADO</option>
                  <option value="EN PROCESO">EN PROCESO</option>
                  <option value="COMPLETADO">COMPLETADO</option>
                  <option value="RETRASADO">RETRASADO</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {projects.find(p => p.id === editingActivity?.projectId)?.activities.find(a => a.id === editingActivity?.activity.id) 
                  ? 'Editar Actividad' 
                  : 'Nueva Actividad'}
              </h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la Actividad</label>
                <input
                  name="name"
                  defaultValue={editingActivity?.activity.name}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Progreso (%)</label>
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={editingActivity?.activity.progress}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    name="status"
                    defaultValue={editingActivity?.activity.status}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    <option value="NO INICIADO">NO INICIADO</option>
                    <option value="EN PROCESO">EN PROCESO</option>
                    <option value="COMPLETADO">COMPLETADO</option>
                    <option value="RETRASADO">RETRASADO</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Inicio Planificado</label>
                  <input
                    name="plannedStartDate"
                    type="date"
                    defaultValue={editingActivity?.activity.plannedStartDate}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fin Planificado</label>
                  <input
                    name="plannedEndDate"
                    type="date"
                    defaultValue={editingActivity?.activity.plannedEndDate}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Inicio Real</label>
                  <input
                    name="actualStartDate"
                    type="date"
                    defaultValue={editingActivity?.activity.actualStartDate}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fin Real</label>
                  <input
                    name="actualEndDate"
                    type="date"
                    defaultValue={editingActivity?.activity.actualEndDate}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Log Progress Modal */}
      {isLogProgressModalOpen && loggingProgress && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h3 className="text-xl font-bold">Registrar Avance</h3>
                <p className="text-indigo-100 text-xs">{format(loggingProgress.date, "EEEE d 'de' MMMM", { locale: es })}</p>
              </div>
              <button onClick={() => setIsLogProgressModalOpen(false)} className="text-indigo-100 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveLoggedProgress} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actividad</p>
                <p className="text-sm font-bold text-slate-700">{loggingProgress.activity.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${loggingProgress.activity.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{loggingProgress.activity.progress}%</span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Falta para el 100%:</span>
                  <span className="text-xs font-black text-indigo-600">{100 - loggingProgress.activity.progress}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-700">¿Cuánto avanzaste hoy? (%)</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[name="additionalProgress"]') as HTMLInputElement;
                        const textarea = document.querySelector('textarea[name="comments"]') as HTMLTextAreaElement;
                        if (input && textarea) {
                          setCopiedProgress({
                            progress: parseInt(input.value) || 0,
                            comments: textarea.value
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Copiar
                    </button>
                    {copiedProgress && (
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.querySelector('input[name="additionalProgress"]') as HTMLInputElement;
                          const textarea = document.querySelector('textarea[name="comments"]') as HTMLTextAreaElement;
                          if (input && textarea && loggingProgress) {
                            const maxAllowed = 100 - loggingProgress.activity.progress;
                            input.value = Math.min(copiedProgress.progress, maxAllowed).toString();
                            textarea.value = copiedProgress.comments;
                          }
                        }}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Pegar
                      </button>
                    )}
                  </div>
                </div>
                <input
                  name="additionalProgress"
                  type="number"
                  min="0"
                  max={100 - loggingProgress.activity.progress}
                  required
                  placeholder="Ej: 5"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Ingresa el porcentaje de contribución de hoy (puede ser 0).</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Comentarios / Observaciones</label>
                <textarea
                  name="comments"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                  placeholder="Describe lo que hiciste..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogProgressModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmation.title}</h3>
              <p className="text-slate-500 text-sm">{confirmation.message}</p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmation.onConfirm}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
