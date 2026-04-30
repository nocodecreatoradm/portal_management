import React, { useState, useMemo } from 'react';
import { CalendarTask, ChangeLog } from '../types';
import { 
  Plus, Search, Filter, Calendar as CalendarIcon, 
  Clock, User, CheckCircle2, AlertCircle, 
  History, Edit2, Trash2, X, ChevronLeft, ChevronRight,
  ArrowRight, MoreVertical, Star, PartyPopper, Coffee,
  Sun, MapPin, Plane, Activity
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface CalendarModuleProps {
  tasks: CalendarTask[];
  onAddTask: (task: Omit<CalendarTask, 'id' | 'createdAt' | 'changeLog'>) => void;
  onUpdateTask: (task: CalendarTask) => void;
  onDeleteTask: (id: string) => void;
}

export default function CalendarModule({ tasks, onAddTask, onUpdateTask, onDeleteTask }: CalendarModuleProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState<CalendarTask | null>(null);
  const [entryType, setEntryType] = useState<CalendarTask['type']>('work');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.requester.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    calendarDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      filteredTasks.forEach(task => {
        if (task.type === 'work' && task.deadline) {
          if (format(parseISO(task.deadline), 'yyyy-MM-dd') === dayStr) {
            if (!map[dayStr]) map[dayStr] = [];
            map[dayStr].push(task);
          }
        } else if (task.startDate && task.endDate) {
          const start = parseISO(task.startDate);
          const end = parseISO(task.endDate);
          if (isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end)) {
            if (!map[dayStr]) map[dayStr] = [];
            map[dayStr].push(task);
          }
        }
      });
    });
    return map;
  }, [filteredTasks, calendarDays]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const getStatusColor = (task: CalendarTask) => {
    if (task.type === 'holiday') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (task.type === 'special_event') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (task.type === 'vacation') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (task.type === 'field_visit') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (task.type === 'business_trip') return 'bg-sky-100 text-sky-700 border-sky-200';
    if (task.type === 'other_activity') return 'bg-slate-100 text-slate-700 border-slate-200';
    
    switch (task.status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDeliveryStatusColor = (status: CalendarTask['deliveryStatus']) => {
    switch (status) {
      case 'on_time': return 'text-emerald-600';
      case 'delayed': return 'text-amber-600';
      case 'postponed': return 'text-indigo-600';
      default: return 'text-slate-400';
    }
  };

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const taskData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      deadline: formData.get('deadline') as string || undefined,
      startDate: formData.get('startDate') as string || undefined,
      endDate: formData.get('endDate') as string || undefined,
      type: formData.get('type') as CalendarTask['type'],
      requester: formData.get('requester') as string,
      assignee: formData.get('assignee') as string,
      status: formData.get('status') as CalendarTask['status'],
      deliveryStatus: formData.get('deliveryStatus') as CalendarTask['deliveryStatus'],
    };

    try {
      if (editingTask) {
        const change: ChangeLog = {
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user?.name || 'Sistema',
          action: 'Actualización',
          details: `Se actualizó la tarea: ${taskData.title}`
        };
        await onUpdateTask({ 
          ...editingTask, 
          ...taskData,
          changeLog: [change, ...editingTask.changeLog]
        });
        toast.success('Tarea actualizada');
      } else {
        await onAddTask(taskData);
        toast.success('Tarea creada');
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Error saving task:', error);
      // App.tsx already shows error toast, but we can catch here if needed
    }
  };

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
        {/* Calendar View */}
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
          </div>

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
              const isToday = isSameDay(day, new Date());
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
                    {dayTasks.slice(0, 3).map(task => (
                      <div 
                        key={task.id}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg truncate border flex items-center gap-1 ${getStatusColor(task)}`}
                      >
                        {task.type === 'holiday' && <Star size={8} />}
                        {task.type === 'special_event' && <PartyPopper size={8} />}
                        {task.type === 'vacation' && <Sun size={8} />}
                        {task.type === 'field_visit' && <MapPin size={8} />}
                        {task.type === 'business_trip' && <Plane size={8} />}
                        {task.type === 'other_activity' && <Activity size={8} />}
                        {task.title}
                      </div>
                    ))}
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
            {(selectedDay ? (tasksByDay[format(selectedDay, 'yyyy-MM-dd')] || []) : filteredTasks).map(task => (
              <div key={task.id} className={`group rounded-2xl p-4 border transition-all ${
                task.type === 'holiday' ? 'bg-rose-50 border-rose-200 hover:border-rose-400' :
                task.type === 'special_event' ? 'bg-indigo-50 border-indigo-200 hover:border-indigo-400' :
                task.type === 'vacation' ? 'bg-amber-50 border-amber-200 hover:border-amber-400' :
                task.type === 'field_visit' ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400' :
                task.type === 'business_trip' ? 'bg-sky-50 border-sky-200 hover:border-sky-400' :
                'bg-slate-50 border-slate-200 hover:border-indigo-300'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {task.type === 'holiday' && <Star size={14} className="text-rose-500" />}
                      {task.type === 'special_event' && <PartyPopper size={14} className="text-indigo-500" />}
                      {task.type === 'vacation' && <Sun size={14} className="text-amber-500" />}
                      {task.type === 'field_visit' && <MapPin size={14} className="text-emerald-500" />}
                      {task.type === 'business_trip' && <Plane size={14} className="text-sky-500" />}
                      {task.type === 'other_activity' && <Activity size={14} className="text-slate-500" />}
                      {task.type === 'work' && <Coffee size={14} className="text-slate-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {task.type === 'holiday' ? 'Feriado' : 
                         task.type === 'special_event' ? 'Evento Especial' : 
                         task.type === 'vacation' ? 'Vacaciones' :
                         task.type === 'field_visit' ? 'Visita Campo' :
                         task.type === 'business_trip' ? 'Viaje Trabajo' :
                         task.type === 'other_activity' ? 'Actividad' : 'Trabajo'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {task.type === 'work' ? (
                    <>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <User size={12} className="text-slate-400" />
                        <span className="uppercase">{task.requester}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <Clock size={12} className="text-slate-400" />
                        <span>{task.deadline ? format(parseISO(task.deadline), 'HH:mm') : ''}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {task.assignee && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                          <User size={12} className="text-slate-400" />
                          <span className="uppercase">{task.assignee}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <Clock size={12} className="text-slate-400" />
                        <span>
                          {task.startDate && task.endDate ? 
                            `${format(parseISO(task.startDate), 'd MMM')} - ${format(parseISO(task.endDate), 'd MMM')}` : 
                            'Todo el día'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border ${getStatusColor(task)}`}>
                    {task.type === 'work' ? task.status?.replace('_', ' ') : 
                     task.type === 'holiday' ? 'Feriado' : 
                     task.type === 'vacation' ? 'Vacaciones' :
                     task.type === 'field_visit' ? 'Visita' :
                     task.type === 'business_trip' ? 'Viaje' :
                     task.type === 'other_activity' ? 'Actividad' : 'Evento'}
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowHistory(task)}
                      className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-wider"
                    >
                      <History size={12} />
                      Historial
                    </button>
                    {task.type === 'work' && (
                      <span className={`text-[9px] font-black uppercase tracking-wider ${getDeliveryStatusColor(task.deliveryStatus || 'pending')}`}>
                        {task.deliveryStatus?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

            <form onSubmit={handleSaveTask} className="p-8 space-y-6">
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

              <div className="grid grid-cols-2 gap-6">
                {entryType === 'work' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha / Deadline</label>
                    <input 
                      type="datetime-local" 
                      name="deadline" 
                      defaultValue={editingTask?.deadline || (selectedDay ? format(selectedDay, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"))}
                      required 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
                      <input 
                        type="date" 
                        name="startDate" 
                        defaultValue={editingTask?.startDate || (selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))}
                        required 
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
                      <input 
                        type="date" 
                        name="endDate" 
                        defaultValue={editingTask?.endDate || (selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"))}
                        required 
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {entryType === 'work' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Solicitante</label>
                    <input 
                      name="requester" 
                      defaultValue={editingTask?.requester}
                      required={entryType === 'work'}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable / Persona</label>
                    <input 
                      name="assignee" 
                      defaultValue={editingTask?.assignee}
                      placeholder="Nombre de la persona"
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                    />
                  </div>
                )}
              </div>

              {entryType === 'work' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      name="status" 
                      defaultValue={editingTask?.status || 'pending'}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
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
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="on_time">A Tiempo</option>
                      <option value="delayed">Con Retraso</option>
                      <option value="postponed">Postergado</option>
                    </select>
                  </div>
                </div>
              )}

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
                      <span className="text-[9px] font-bold text-slate-400">{format(parseISO(log.timestamp), "d MMM, HH:mm", { locale: es })}</span>
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
