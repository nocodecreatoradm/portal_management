import React, { useState } from 'react';
import { X, MessageSquare, Send, Paperclip, CheckCircle2, Clock } from 'lucide-react';
import { ProductRecord, InfoRequest, AssignmentInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface InfoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | 'sample' | null;
  onSave: (requests: InfoRequest[]) => void;
}

export default function InfoRequestModal({ isOpen, onClose, record, type, onSave }: InfoRequestModalProps) {
  const { user } = useAuth();
  const [newRequestText, setNewRequestText] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  if (!isOpen || !record || !type) return null;

  const assignment = type === 'artwork' ? record.artworkAssignment : 
                     type === 'technical_sheet' ? record.technicalAssignment : 
                     type === 'commercial_sheet' ? record.commercialAssignment : null;
  const requests = record.infoRequests || assignment?.infoRequests || [];

  const title = type === 'artwork' ? 'Artwork' : 
                type === 'technical_sheet' ? 'Ficha Técnica' : 
                type === 'commercial_sheet' ? 'Ficha Comercial' : 'Muestra';

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestText.trim()) return;

    const newRequest: InfoRequest = {
      id: `req-${Date.now()}`,
      requestText: newRequestText,
      requestDate: new Date().toISOString().split('T')[0],
      requestedBy: user?.name || 'Sistema',
    };

    onSave([...requests, newRequest]);
    setNewRequestText('');
  };

  const handleResponse = (requestId: string) => {
    if (!responseText.trim()) return;

    const updatedRequests = requests.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          response: {
            text: responseText,
            date: new Date().toISOString().split('T')[0],
            user: user?.name || 'Sistema',
            files: [] // In a real app, handle file uploads
          }
        };
      }
      return req;
    });

    onSave(updatedRequests);
    setResponseText('');
    setRespondingTo(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Solicitudes de Información</h3>
              <p className="text-xs text-slate-500 font-medium">{record.codigoSAP} - {title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500 font-medium">No hay solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solicitud</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {req.requestDate}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{req.requestedBy}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-4">{req.requestText}</p>

                  {req.response ? (
                    <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Respuesta</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{req.response.date} - {req.response.user}</span>
                      </div>
                      <p className="text-sm text-slate-700">{req.response.text}</p>
                      {req.response.files && req.response.files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {req.response.files.map((f, i) => (
                            <div key={i} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded text-[10px] text-blue-600 font-medium border border-blue-100">
                              <Paperclip size={10} /> {f.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    respondingTo === req.id ? (
                      <div className="mt-4 space-y-3">
                        <textarea
                          className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                          placeholder="Escribe tu respuesta..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setRespondingTo(null)}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleResponse(req.id)}
                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Send size={14} /> Enviar Respuesta
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setRespondingTo(req.id)}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Responder solicitud
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAddRequest} className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              {type === 'artwork' ? 'Nueva Solicitud (Diseñador)' : 'Nueva Solicitud (Técnico)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="¿Qué información adicional necesitas?"
                value={newRequestText}
                onChange={(e) => setNewRequestText(e.target.value)}
              />
              <button
                type="submit"
                className="bg-orange-600 text-white p-3 rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
