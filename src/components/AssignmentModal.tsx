import React, { useState } from 'react';
import { X, Calendar, User } from 'lucide-react';
import { ProductRecord, AssignmentInfo } from '../types';
import UserSelect from './UserSelect';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: ProductRecord | null;
  type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  onSave: (assignment: AssignmentInfo) => void;
}

export default function AssignmentModal({ isOpen, onClose, record, type, onSave }: AssignmentModalProps) {
  const [designer, setDesigner] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  if (!isOpen || !record || !type) return null;

  const title = type === 'artwork' ? 'Asignar Artwork' : 
                type === 'technical_sheet' ? 'Asignar Ficha Técnica' : 'Asignar Ficha Comercial';


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      designer,
      assignmentDate: new Date().toISOString().split('T')[0],
      plannedStartDate,
      plannedEndDate,
      infoRequests: []
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">{record.codigoSAP} - {record.descripcionSAP}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <UserSelect
            label={type === 'artwork' ? 'Diseñador Responsable' : 'Técnico Responsable'}
            placeholder={type === 'artwork' ? 'Seleccionar diseñador...' : 'Seleccionar técnico...'}
            value={designer}
            onChange={setDesigner}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Inicio Planeada</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  required
                  type="date"
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                  className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            >
              Confirmar Asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
