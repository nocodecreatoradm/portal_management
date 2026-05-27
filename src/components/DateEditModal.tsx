import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { ProductRecord, AssignmentInfo, DateChangeHistory } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface DateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductRecord | null;
  mode: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  onSave: (recordId: string, updatedAssignment: AssignmentInfo) => void;
}

export default function DateEditModal({ isOpen, onClose, record, mode, onSave }: DateEditModalProps) {
  const { profile } = useAuth();
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const assignment = record ? (mode === 'artwork' ? record.artworkAssignment : mode === 'technical_sheet' ? record.technicalAssignment : record.commercialAssignment) : undefined;

  useEffect(() => {
    if (isOpen && assignment) {
      setPlannedStartDate(assignment.plannedStartDate || '');
      setPlannedEndDate(assignment.plannedEndDate || '');
      setReason('');
      setError('');
    }
  }, [isOpen, assignment]);

  if (!isOpen || !record || !mode || !assignment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Debe ingresar un motivo para el cambio de fechas.');
      return;
    }
    if (plannedStartDate === assignment.plannedStartDate && plannedEndDate === assignment.plannedEndDate) {
      setError('No ha realizado cambios en las fechas.');
      return;
    }

    const changeHistoryEntry: DateChangeHistory = {
      date: new Date().toISOString(),
      user: profile?.full_name || profile?.email || 'Usuario Desconocido',
      previousStartDate: assignment.plannedStartDate,
      newStartDate: plannedStartDate,
      previousEndDate: assignment.plannedEndDate,
      newEndDate: plannedEndDate,
      reason: reason.trim()
    };

    const updatedAssignment: AssignmentInfo = {
      ...assignment,
      plannedStartDate,
      plannedEndDate,
      dateChangeHistory: [...(assignment.dateChangeHistory || []), changeHistoryEntry]
    };

    onSave(record.id, updatedAssignment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Editar Fechas Planificadas</h3>
              <p className="text-xs text-slate-500 font-medium">{record.codigoSAP} - {record.descripcionSAP}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Inicio Planeada</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="date"
                    className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Fin Planeada</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="date"
                    className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={plannedEndDate}
                    onChange={(e) => setPlannedEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo de la Modificación</label>
              <textarea
                required
                rows={3}
                className="w-full border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                placeholder="Indique brevemente por qué se están modificando las fechas (ej. Retraso del proveedor, Cambio de prioridad)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 shadow-blue-200"
            >
              <CheckCircle2 size={18} />
              Guardar Cambios
            </button>
          </form>

          {/* Historial de Cambios */}
          {assignment.dateChangeHistory && assignment.dateChangeHistory.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <History size={16} className="text-slate-400" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Historial de Cambios</h4>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {[...assignment.dateChangeHistory].reverse().map((change, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <User size={12} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{change.user}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-medium">
                        <Clock size={10} />
                        {format(parseISO(change.date), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Inicio Planificado</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 line-through">{change.previousStartDate || '-'}</span>
                          <span className="text-[10px] text-blue-600 font-bold">→ {change.newStartDate || '-'}</span>
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Fin Planificado</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 line-through">{change.previousEndDate || '-'}</span>
                          <span className="text-[10px] text-blue-600 font-bold">→ {change.newEndDate || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Motivo</p>
                      <p className="text-xs text-amber-900">{change.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
