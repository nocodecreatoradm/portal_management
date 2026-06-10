import React, { useState, useMemo, useEffect } from 'react';
import UserSelect from './UserSelect';
import { SupabaseService } from '../lib/SupabaseService';
import { CalendarTask, ChangeLog, Project, ProjectActivity } from '../types';
import { 
  Plus, Search, Filter, Calendar as CalendarIcon, 
  Clock, User, CheckCircle2, AlertCircle, 
  History, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  ArrowRight, MoreVertical, Star, PartyPopper, Coffee,
  Sun, MapPin, Plane, Activity, Check, Play, Ban
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { outlookService } from '../services/outlookService';
import { getLimaNow } from '../lib/dateUtils';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const parseLocalISO = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (!dateStr.includes('T')) {
    return parseISO(`${dateStr}T00:00:00`);
  }
  return parseISO(dateStr);
};

export default function CalendarModule() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(getLimaNow());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState<CalendarTask | null>(null);
  const [entryType, setEntryType] = useState<CalendarTask['type']>('work');
  const [requester, setRequester] = useState('');
  const [assignee, setAssignee] = useState('');
  const [viewMode, setViewMode] = useState<'calendar' | 'gantt'>('calendar');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [tasksData, projectsData] = await Promise.all([
        SupabaseService.getCalendarTasks(),
        SupabaseService.getProjects()
      ]);

      const fixedActivities: CalendarTask[] = [];
      projectsData.forEach((project: Project) => {
        if (project.activities) {
          project.activities.forEach((act: ProjectActivity) => {
            fixedActivities.push({
              id: `fixed-${act.id}`,
              title: `[${project.name}] ${act.name}`,
              description: act.comments || `Actividad de proyecto: ${project.name}`,
              startDate: act.plannedStartDate,
              endDate: act.plannedEndDate,
              deadline: act.plannedEndDate ? `${act.plannedEndDate}T18:00` : undefined,
              type: 'fixed_activity',
              requester: 'Plan de Trabajo',
              assignee: act.responsible ? act.responsible.join(', ') : '',
              status: act.status === 'COMPLETADO' ? 'completed' : 
                      act.status === 'EN PROCESO' ? 'in_progress' : 'pending',
              deliveryStatus: act.status === 'COMPLETADO' ? 'on_time' : 'pending',
              createdAt: getLimaNow().toISOString(),
              changeLog: []
            });
          });
        }
      });

      setTasks([...tasksData, ...fixedActivities]);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Error al cargar tareas del calendario');
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.requester && task.requester.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.assignee && task.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tasks, searchTerm]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    calendarDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      filteredTasks.forEach(task => {
        const start = task.startDate ? parseLocalISO(task.startDate) : (task.createdAt ? parseLocalISO(task.createdAt) : null);
        const end = task.endDate ? parseLocalISO(task.endDate) : (task.deadline ? parseLocalISO(task.deadline) : null);
        
        if (start && end) {
          const sDate = format(start, 'yyyy-MM-dd');
          const eDate = format(end, 'yyyy-MM-dd');
          if (dayStr >= sDate && dayStr <= eDate) {
            if (!map[dayStr]) map[dayStr] = [];
            map[dayStr].push(task);
          }
        } else if (task.deadline) {
          if (format(parseLocalISO(task.deadline), 'yyyy-MM-dd') === dayStr) {
            if (!map[dayStr]) map[dayStr] = [];
            map[dayStr].push(task);
          }
        }
      });
    });
    return map;
  }, [filteredTasks, calendarDays]);

  const ganttTasks = useMemo(() => {
    return filteredTasks.filter(task => {
      const start = task.startDate ? parseLocalISO(task.startDate) : (task.createdAt ? parseLocalISO(task.createdAt) : null);
      const end = task.endDate ? parseLocalISO(task.endDate) : (task.deadline ? parseLocalISO(task.deadline) : null);
      if (!start || !end) return false;
      return (start <= monthEnd && end >= monthStart);
    });
  }, [filteredTasks, monthStart, monthEnd]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(getLimaNow());

  const getStatusColor = (task: CalendarTask) => {
    if (task.type === 'holiday') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (task.type === 'special_event') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (task.type === 'vacation') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (task.type === 'field_visit') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (task.type === 'fixed_activity') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (task.type === 'business_trip') return 'bg-sky-100 text-sky-700 border-sky-200';
    if (task.type === 'other_activity') return 'bg-slate-100 text-slate-700 border-slate-200';
    
    switch (task.status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-slate-200 text-slate-500 border-slate-300 line-through';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getDeliveryStatusColor = (status: CalendarTask['deliveryStatus']) => {
    switch (status) {
      case 'on_time': return 'text-emerald-600';
      case 'delayed': return 'text-rose-600 font-bold';
      case 'postponed': return 'text-indigo-600';
      default: return 'text-slate-400';
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: CalendarTask['status']) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const change: ChangeLog = {
      id: `LOG-${Date.now()}`,
      timestamp: getLimaNow().toISOString(),
      user: user?.name || 'Sistema',
      action: 'Cambio de Estado',
      details: `Se cambió el estado de la tarea a: ${
        newStatus === 'completed' ? 'Completado' :
        newStatus === 'in_progress' ? 'En Proceso' :
        newStatus === 'cancelled' ? 'Cancelado' : 'Pendiente'
      }`
    };

    const deliveryStatus = newStatus === 'completed'
      ? (task.deadline && new Date(task.deadline) < getLimaNow() ? 'delayed' : 'on_time')
      : task.deliveryStatus;

    try {
      const result = await SupabaseService.updateCalendarTask(id, {
        status: newStatus,
        deliveryStatus: deliveryStatus as any,
        changeLog: [change, ...(task.changeLog || [])]
      });
      if (result) {
        setTasks(prev => prev.map(t => t.id === id ? result : t));
        toast.success('Estado de la tarea actualizado');
        outlookService.sendCalendarNotification(result, false);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Error al actualizar el estado de la tarea');
    }
  };

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const rawDeadline = formData.get('deadline') as string || undefined;
    const rawStartDate = formData.get('startDate') as string || undefined;
    const rawEndDate = formData.get('endDate') as string || undefined;

    // Normalise fields to ensure tasks always display correctly in timelines
    const resolvedStartDate = rawStartDate || (rawDeadline ? rawDeadline.split('T')[0] : undefined);
    const resolvedEndDate = rawEndDate || (rawDeadline ? rawDeadline.split('T')[0] : undefined);
    const resolvedDeadline = rawDeadline || (rawStartDate ? `${rawStartDate}T18:00` : undefined);

    const taskData: Partial<CalendarTask> = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      deadline: resolvedDeadline,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      type: formData.get('type') as CalendarTask['type'],
      requester: (formData.get('requester') as string) || user?.name || 'Sistema',
      assignee: formData.get('assignee') as string || undefined,
      status: formData.get('status') as CalendarTask['status'] || 'pending',
      deliveryStatus: formData.get('deliveryStatus') as CalendarTask['deliveryStatus'] || 'pending',
    };

    try {
      if (editingTask) {
        const isUUIDVal = isUUID(editingTask.id);
        const change: ChangeLog = {
          id: `LOG-${Date.now()}`,
          timestamp: getLimaNow().toISOString(),
          user: user?.name || 'Sistema',
          action: 'Actualización',
          details: `Se actualizó la tarea: ${taskData.title}`
        };
        
        let result;
        if (isUUIDVal) {
          result = await SupabaseService.updateCalendarTask(editingTask.id, {
            ...taskData,
            changeLog: [change, ...(editingTask.changeLog || [])]
          });
        } else {
          result = await SupabaseService.createCalendarTask({
            ...taskData,
            changeLog: [change]
          });
        }
        
        setTasks(prev => prev.map(t => t.id === editingTask.id ? result : t));
        toast.success('Tarea actualizada');
        outlookService.sendCalendarNotification(result, false);
      } else {
        const result = await SupabaseService.createCalendarTask({
          ...taskData,
          createdAt: getLimaNow().toISOString(),
          changeLog: [{
            id: `LOG-${Date.now()}`,
            timestamp: getLimaNow().toISOString(),
            user: user?.name || 'Sistema',
            action: 'Creación',
            details: 'Registro inicial de la tarea'
          }]
        });
        setTasks(prev => [result, ...prev]);
        toast.success('Tarea creada');
        outlookService.sendCalendarNotification(result, true);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Error al guardar la tarea');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta tarea?')) return;
    try {
      await SupabaseService.deleteCalendarTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Tarea eliminada');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error al eliminar la tarea');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Calendario de Pendientes</h2>
          <p className="text-slate-500 text-sm font-medium">Seguimiento de deadlines y tareas diarias</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar tareas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-64"
            />
          </div>
          <button 
            onClick={() => {
              setEditingTask(null);
              setRequester(user?.name || '');
              setAssignee('');
              setEntryType('work');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Plus size={18} />
            Nueva Tarea
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Calendar / Gantt Main Container */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md transition-all text-slate-600">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={handleToday} className="px-3 py-1 text-xs font-bold hover:bg-white rounded-md transition-all text-slate-600">
                  Hoy
                </button>
                <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md transition-all text-slate-600">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/50">
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Calendario
              </button>
              <button 
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${viewMode === 'gantt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Gantt
              </button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <>
              <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                {calendarDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayTasks = tasksByDay[dayStr] || [];
                  const isToday = isSameDay(day, getLimaNow());
                  const isCurrentMonth = isSameMonth(day, currentDate);

                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[120px] p-2 border-b border-r border-slate-100 transition-all cursor-pointer hover:bg-slate-50/50 flex flex-col gap-1 ${
                        !isCurrentMonth ? 'bg-slate-50/30 opacity-40' : ''
                      } ${isToday ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${isToday ? 'w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded-full' : 'text-slate-600'}`}>
                          {format(day, 'd')}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase">
                            {dayTasks.length} {dayTasks.length === 1 ? 'Tarea' : 'Tareas'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map(task => {
                          const isMultiDay = task.startDate && task.endDate && !isSameDay(parseLocalISO(task.startDate), parseLocalISO(task.endDate));
                          const isStart = isMultiDay && isSameDay(parseLocalISO(task.startDate!), day);
                          const isEnd = isMultiDay && isSameDay(parseLocalISO(task.endDate!), day);
                          
                          const roundStyle = isMultiDay 
                            ? `${isStart ? 'rounded-l-lg rounded-r-none border-r-0 mr-0 pr-0' : isEnd ? 'rounded-r-lg rounded-l-none border-l-0 ml-0 pl-0' : 'rounded-none border-l-0 border-r-0 mx-0 px-0'}`
                            : 'rounded-lg';

                          return (
                            <div 
                              key={task.id}
                              className={`text-[9px] font-bold px-2 py-1 truncate border flex items-center gap-1 transition-all ${roundStyle} ${getStatusColor(task)}`}
                            >
                              {task.type === 'holiday' && <Star size={8} />}
                              {task.type === 'special_event' && <PartyPopper size={8} />}
                              {task.type === 'vacation' && <Sun size={8} />}
                              {task.type === 'field_visit' && <MapPin size={8} />}
                              {task.type === 'business_trip' && <Plane size={8} />}
                              {task.type === 'fixed_activity' && <CalendarIcon size={8} />}
                              {task.type === 'other_activity' && <Activity size={8} />}
                              {task.title}
                            </div>
                          );
                        })}
                        {dayTasks.length > 3 && (
                          <div className="text-[9px] font-bold text-slate-400 text-center">
                            + {dayTasks.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Gantt Chart Mode */
            <div className="flex-1 overflow-auto p-4 min-h-[400px]">
              {/* Timeline headers */}
              <div className="flex border-b border-slate-100 pb-2 mb-2 min-w-[800px]">
                <div className="w-48 flex-shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-wider pl-4">Tarea / Pendiente</div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(0, 1fr))` }}>
                  {daysInMonth.map(day => {
                    const isToday = isSameDay(day, getLimaNow());
                    return (
                      <div key={day.toString()} className="text-center flex flex-col items-center">
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {format(day, 'eee', { locale: es }).substring(0, 2)}
                        </span>
                        <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline rows */}
              <div className="space-y-3 min-w-[800px] pb-4">
                {ganttTasks.map(task => {
                  const start = task.startDate ? parseLocalISO(task.startDate) : (task.createdAt ? parseLocalISO(task.createdAt) : getLimaNow());
                  const end = task.endDate ? parseLocalISO(task.endDate) : (task.deadline ? parseLocalISO(task.deadline) : getLimaNow());
                  
                  // Clamp dates to monthly view
                  const displayStart = start < monthStart ? monthStart : start;
                  const displayEnd = end > monthEnd ? monthEnd : end;
                  
                  const startIdx = daysInMonth.findIndex(d => isSameDay(d, displayStart));
                  const endIdx = daysInMonth.findIndex(d => isSameDay(d, displayEnd));
                  
                  const startCol = startIdx !== -1 ? startIdx + 1 : 1;
                  const endCol = endIdx !== -1 ? endIdx + 2 : daysInMonth.length + 1;
                  
                  const isDelayed = task.status !== 'completed' && task.status !== 'cancelled' && task.deadline && new Date(task.deadline) < getLimaNow();

                  return (
                    <div 
                      key={task.id} 
                      onClick={() => setSelectedDay(start)}
                      className="flex items-center hover:bg-slate-50/50 py-1.5 rounded-xl transition-all cursor-pointer group"
                    >
                      {/* Left Panel */}
                      <div className="w-48 flex-shrink-0 pr-4 pl-4 truncate">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate group-hover:text-indigo-600">
                          {task.title}
                        </h5>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                          {task.type === 'work' ? (task.status || 'pendiente') : task.type}
                        </span>
                      </div>

                      {/* Right Panel Grid */}
                      <div className="flex-1 grid relative h-8 items-center" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(0, 1fr))` }}>
                        {/* Vertical background lines */}
                        <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(0, 1fr))` }}>
                          {daysInMonth.map((_, i) => (
                            <div key={i} className="border-r border-slate-100/80 h-full last:border-r-0" />
                          ))}
                        </div>

                        {/* Gantt Bar */}
                        <div 
                          className={`h-6 rounded-xl border flex items-center justify-between px-3 text-[9px] font-black uppercase tracking-wider shadow-sm z-10 transition-all ${
                            isDelayed ? 'bg-rose-100 border-rose-300 text-rose-800' :
                            task.type === 'holiday' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                            task.type === 'special_event' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                            task.type === 'vacation' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            task.type === 'field_visit' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            task.type === 'business_trip' ? 'bg-sky-50 border-sky-200 text-sky-700' :
                            task.type === 'fixed_activity' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                            task.status === 'completed' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' :
                            task.status === 'in_progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                          style={{ 
                            gridColumnStart: startCol, 
                            gridColumnEnd: endCol 
                          }}
                        >
                          <span className="truncate pr-1">{task.title}</span>
                          {task.status === 'completed' && <CheckCircle2 size={10} className="flex-shrink-0" />}
                          {isDelayed && <AlertCircle size={10} className="flex-shrink-0 animate-pulse text-rose-600" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {ganttTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Activity size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">No hay tareas para graficar este mes</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Day Details / Task List */}
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {selectedDay ? format(selectedDay, "EEEE, d 'de' MMMM", { locale: es }) : 'Tareas del Mes'}
            </h3>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">
              {selectedDay ? 'Detalle de actividades programadas' : 'Resumen de actividades'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(selectedDay ? (tasksByDay[format(selectedDay, 'yyyy-MM-dd')] || []) : filteredTasks).map(task => {
              const isDelayed = task.status !== 'completed' && task.status !== 'cancelled' && task.deadline && new Date(task.deadline) < getLimaNow();

              return (
                <div key={task.id} className={`group rounded-2xl p-4 border transition-all ${
                  task.type === 'holiday' ? 'bg-rose-50 border-rose-200 hover:border-rose-400' :
                  task.type === 'special_event' ? 'bg-indigo-50 border-indigo-200 hover:border-indigo-400' :
                  task.type === 'vacation' ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
                  task.type === 'field_visit' ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' :
                  task.type === 'business_trip' ? 'bg-sky-50 border-sky-200 hover:border-sky-400' :
                  'bg-slate-50 border-slate-200 hover:border-indigo-300'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {task.type === 'holiday' && <Star size={14} className="text-rose-500" />}
                        {task.type === 'special_event' && <PartyPopper size={14} className="text-indigo-500" />}
                        {task.type === 'vacation' && <Sun size={14} className="text-amber-500" />}
                        {task.type === 'field_visit' && <MapPin size={14} className="text-emerald-500" />}
                        {task.type === 'business_trip' && <Plane size={14} className="text-sky-500" />}
                        {task.type === 'fixed_activity' && <CalendarIcon size={14} className="text-purple-500" />}
                        {task.type === 'other_activity' && <Activity size={14} className="text-slate-500" />}
                        {task.type === 'work' && <Coffee size={14} className="text-slate-400" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {task.type === 'holiday' ? 'Feriado' : 
                           task.type === 'special_event' ? 'Evento Especial' : 
                           task.type === 'vacation' ? 'Vacaciones' :
                           task.type === 'field_visit' ? 'Visita Campo' :
                           task.type === 'business_trip' ? 'Viaje Trabajo' :
                           task.type === 'fixed_activity' ? 'Actividad Fija' :
                           task.type === 'other_activity' ? 'Actividad' : 'Trabajo'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {task.type !== 'fixed_activity' && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setRequester(task.requester || '');
                              setAssignee(task.assignee || '');
                              setEntryType(task.type);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isDelayed && (
                    <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[9px] font-bold mb-3 animate-pulse">
                      <AlertCircle size={12} />
                      <span>TAREA ATRASADA - Pasó la fecha límite</span>
                    </div>
                  )}

                  {/* Task Metadata Details */}
                  <div className="flex flex-col gap-2 mb-3 bg-white/50 p-3 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User size={10} className="text-slate-400" /> Solicitado por:
                      </span>
                      <span className="uppercase text-indigo-600 font-extrabold">{task.requester || 'Sistema'}</span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <User size={10} className="text-slate-400" /> Asignado a:
                        </span>
                        <span className="uppercase text-slate-800 font-extrabold">{task.assignee}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={10} className="text-slate-400" /> Registrado el:
                      </span>
                      <span>{format(parseLocalISO(task.createdAt), "d MMM yyyy, HH:mm", { locale: es })}</span>
                    </div>
                    {task.deadline && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-slate-400" /> Fecha Límite:
                        </span>
                        <span className={isDelayed ? 'text-rose-600 font-black' : 'text-slate-800'}>
                          {format(parseLocalISO(task.deadline), "d MMM yyyy, HH:mm", { locale: es })}
                        </span>
                      </div>
                    )}
                    {task.startDate && task.endDate && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/50">
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-slate-400" /> Programado:
                        </span>
                        <span className="text-slate-800">
                          {format(parseLocalISO(task.startDate), 'd MMM')} al {format(parseLocalISO(task.endDate), 'd MMM yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Status row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border ${getStatusColor(task)}`}>
                        {task.type === 'fixed_activity' ? 'Actividad Fija' :
                         task.type === 'work' ? (task.status === 'in_progress' ? 'En Curso' : task.status === 'completed' ? 'Completado' : task.status === 'cancelled' ? 'Cancelado' : 'Pendiente') : 
                         task.type === 'holiday' ? 'Feriado' : 
                         task.type === 'vacation' ? 'Vacaciones' :
                         task.type === 'field_visit' ? 'Visita' :
                         task.type === 'business_trip' ? 'Viaje' :
                         task.type === 'other_activity' ? 'Actividad' : 'Evento'}
                      </span>

                      {/* Quick Status Modifiers */}
                      {task.status !== 'completed' && task.status !== 'cancelled' && task.type !== 'fixed_activity' && (
                        <div className="flex items-center gap-1 ml-2">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                              title="Iniciar Tarea"
                              className="p-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 transition-all"
                            >
                              <Play size={10} />
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                            title="Completar Tarea"
                            className="p-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-600 transition-all"
                          >
                            <Check size={10} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'cancelled')}
                            title="Cancelar Tarea"
                            className="p-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 transition-all"
                          >
                            <Ban size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {task.type !== 'fixed_activity' && (
                        <button 
                          onClick={() => setShowHistory(task)}
                          className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-wider"
                        >
                          <History size={12} />
                          Historial
                        </button>
                      )}
                      {task.type === 'work' && (
                        <span className={`text-[9px] font-black uppercase tracking-wider ${getDeliveryStatusColor(task.deliveryStatus || 'pending')}`}>
                          {task.deliveryStatus === 'on_time' ? 'A Tiempo' : task.deliveryStatus === 'delayed' ? 'Con Retraso' : task.deliveryStatus === 'postponed' ? 'Postergado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {((selectedDay ? (tasksByDay[format(selectedDay, 'yyyy-MM-dd')] || []) : filteredTasks).length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No hay tareas programadas</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                </h3>
                <p className="text-slate-500 text-sm font-medium">Completa la información del pendiente</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Entrada</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'work', label: 'Trabajo', icon: <Coffee size={14} /> },
                    { id: 'holiday', label: 'Feriado', icon: <Star size={14} /> },
                    { id: 'special_event', label: 'Evento', icon: <PartyPopper size={14} /> },
                    { id: 'vacation', label: 'Vacaciones', icon: <Sun size={14} /> },
                    { id: 'field_visit', label: 'Campo', icon: <MapPin size={14} /> },
                    { id: 'business_trip', label: 'Viaje', icon: <Plane size={14} /> },
                    { id: 'other_activity', label: 'Actividad', icon: <Activity size={14} /> }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setEntryType(type.id as CalendarTask['type'])}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-[10px] transition-all ${
                        entryType === type.id 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="type" value={entryType} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                <input 
                  name="title" 
                  defaultValue={editingTask?.title}
                  required 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                <textarea 
                  name="description" 
                  defaultValue={editingTask?.description}
                  rows={3}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 resize-none"
                />
              </div>

              {/* Date Inputs - Unified configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                  <input 
                    type="date" 
                    name="startDate" 
                    defaultValue={editingTask?.startDate ? format(parseLocalISO(editingTask.startDate), "yyyy-MM-dd") : (selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(getLimaNow(), "yyyy-MM-dd"))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-xs" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                  <input 
                    type="date" 
                    name="endDate" 
                    defaultValue={editingTask?.endDate ? format(parseLocalISO(editingTask.endDate), "yyyy-MM-dd") : (selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(getLimaNow(), "yyyy-MM-dd"))}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-xs" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Máxima de Entrega (Deadline)</label>
                  <input 
                    type="datetime-local" 
                    name="deadline" 
                    defaultValue={editingTask?.deadline ? format(parseLocalISO(editingTask.deadline), "yyyy-MM-dd'T'HH:mm") : (selectedDay ? `${format(selectedDay, "yyyy-MM-dd")}T18:00` : `${format(getLimaNow(), "yyyy-MM-dd")}T18:00`)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-xs" 
                  />
                </div>
              </div>

              {/* People Selection */}
              <div className="grid grid-cols-2 gap-4">
                <UserSelect
                  label="Solicitante"
                  name="requester"
                  value={requester}
                  onChange={setRequester}
                />
                <UserSelect
                  label="Asignado a (Responsable)"
                  name="assignee"
                  value={assignee}
                  onChange={setAssignee}
                  placeholder="Persona responsable"
                />
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    name="status" 
                    defaultValue={editingTask?.status || 'pending'}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-xs"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Proceso</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrega</label>
                  <select 
                    name="deliveryStatus" 
                    defaultValue={editingTask?.deliveryStatus || 'pending'}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 text-xs"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="on_time">A Tiempo</option>
                    <option value="delayed">Con Retraso</option>
                    <option value="postponed">Postergado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  {editingTask ? 'Actualizar' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Control de Cambios</h3>
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">{showHistory.title}</p>
              </div>
              <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              {showHistory.changeLog.map((log, idx) => (
                <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                  {idx !== showHistory.changeLog.length - 1 && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100" />
                  )}
                  <div className="absolute left-0 top-1.5 w-6 h-6 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{log.action}</span>
                      <span className="text-[9px] font-bold text-slate-400">{format(parseLocalISO(log.timestamp), "d MMM, HH:mm", { locale: es })}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 mb-1">{log.details}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                      <User size={10} />
                      {log.user}
                    </div>
                  </div>
                </div>
              ))}
              {showHistory.changeLog.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <History size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-widest">No hay registros de cambios</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
