import { X, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import UserSelect from './UserSelect';

interface ApproverConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApprovers: { [key: string]: string };
  onSave: (newApprovers: { [key: string]: string }, reason: string) => void;
}

export default function ApproverConfigModal({ 
  isOpen, 
  onClose, 
  currentApprovers, 
  onSave 
}: ApproverConfigModalProps) {
  const [approvers, setApprovers] = useState(currentApprovers);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!reason.trim()) {
      setError('Debe proporcionar un motivo para el cambio.');
      return;
    }
    onSave(approvers, reason);
    setReason('');
    setError('');
    onClose();
  };

  const stages = [
    { id: 'I+D', label: 'Investigación y Desarrollo (I+D)' },
    { id: 'MKT', label: 'Marketing (MKT)' },
    { id: 'PLAN', label: 'Planeamiento (PLAN)' },
    { id: 'PROV', label: 'Proveedor (PROV)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-bottom border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-gray-800">Configurar Aprobadores</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-4">
            {stages.map((stage) => (
              <div key={stage.id} className="space-y-1.5">
                <UserSelect
                  label={stage.label}
                  name={stage.id}
                  value={approvers[stage.id]}
                  onChange={(val) => setApprovers({ ...approvers, [stage.id]: val })}
                  required
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-4 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              Motivo del cambio <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej: Vacaciones de titular, Colaborador no labora..."
              className={`w-full border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none`}
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                <AlertCircle size={12} />
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#52627e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3d4a60] transition-colors shadow-sm"
          >
            <Save size={16} />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
