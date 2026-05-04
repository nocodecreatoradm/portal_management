import React, { useState, useEffect } from 'react';
import { X, Shield, Save, Loader2, Info, Hash, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Role, RolesService } from '../services/RolesService';
import { toast } from 'sonner';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null; // null if creating new
  onUpdate: () => void;
}

export default function RoleModal({ isOpen, onClose, role, onUpdate }: RoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    level: 1
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        display_name: role.display_name || '',
        description: role.description || '',
        level: role.level || 1
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        level: 1
      });
    }
  }, [role, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      // Basic validation
      if (!formData.name.trim() || !formData.display_name.trim()) {
        toast.error('Nombre y Nombre a mostrar son requeridos');
        return;
      }

      // Convert name to snake_case if it's a new role and not already set correctly
      const nameToSave = role ? formData.name : formData.name.toLowerCase().replace(/\s+/g, '_');

      if (role) {
        await RolesService.updateRole(role.id, {
          name: nameToSave,
          display_name: formData.display_name,
          description: formData.description,
          level: formData.level
        });
        toast.success('Rol actualizado correctamente');
      } else {
        await RolesService.createRole({
          name: nameToSave,
          display_name: formData.display_name,
          description: formData.description,
          level: formData.level
        });
        toast.success('Rol creado correctamente');
      }
      
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error(error.message || 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

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
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {role ? 'Editar Rol' : 'Nuevo Rol'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {role ? `Editando: ${role.display_name}` : 'Define un nuevo perfil de acceso'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador (ID)</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    disabled={!!role}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700 disabled:opacity-50"
                    placeholder="ej: admin_id"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel (Prioridad)</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="number"
                    required
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700"
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre a mostrar</label>
              <div className="relative group">
                <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700"
                  placeholder="ej: Administrador de I+D"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
              <div className="relative group">
                <Info className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700 min-h-[100px] resize-none"
                  placeholder="Describe las responsabilidades de este rol..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {role ? 'Actualizar Rol' : 'Crear Rol'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
