import React, { useState, useEffect } from 'react';
import { X, Activity, Calendar, Clock, Database, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function UserActivityModal({ isOpen, onClose, user }: UserActivityModalProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadActivity();
    }
  }, [isOpen, user]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('calculation_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Registro de Actividad</h3>
              <p className="text-xs text-slate-500 font-medium">{user.full_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando registros...</p>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors shrink-0">
                        <Database size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                            {activity.module_id.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {activity.action_type.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                          {activity.project_name || 'Sin nombre de proyecto'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 font-medium italic">
                          {activity.description || 'Sin descripción adicional'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                        <Calendar size={12} />
                        {format(new Date(activity.created_at), 'dd MMM yyyy', { locale: es })}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
                        <Clock size={12} />
                        {format(new Date(activity.created_at), 'HH:mm')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 border-2 border-dashed border-slate-100">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Sin actividad reciente</h3>
              <p className="text-slate-500 max-w-xs mx-auto font-medium mt-2">
                Este usuario aún no ha realizado acciones registrables en los módulos de cálculo.
              </p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <Info size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Aquí se muestran las acciones realizadas en los módulos de ingeniería, cálculos técnicos y reportes de I+D.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
