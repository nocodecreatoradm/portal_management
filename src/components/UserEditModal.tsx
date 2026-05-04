import React, { useState, useEffect } from 'react';
import { X, User, Building2, Shield, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';
import { Role } from '../services/RolesService';
import { toast } from 'sonner';
import { Brand, ProductLine } from '../types';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  roles: Role[];
  onUpdate: (updatedUser: any) => void;
}

export default function UserEditModal({ isOpen, onClose, user, roles, onUpdate }: UserEditModalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    role: '',
    avatar_url: '',
    scopes: [] as { brand: string; line: string }[]
  });
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [lines, setLines] = useState<ProductLine[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandsData, linesData] = await Promise.all([
          SupabaseService.getBrands(),
          SupabaseService.getProductLines()
        ]);
        setBrands(brandsData);
        setLines(linesData);
      } catch (error) {
        console.error('Error fetching brands/lines:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        department: user.department || '',
        role: user.role || 'viewer',
        avatar_url: user.avatar_url || '',
        scopes: user.scopes || []
      });
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedData = await SupabaseService.updateProfile(user.id, formData);
      onUpdate(updatedData);
      toast.success('Perfil actualizado correctamente');
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('No se pudieron guardar los cambios');
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
              <User size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Editar Perfil</h3>
              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700"
                  placeholder="Nombre del usuario"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700"
                  placeholder="Área o departamento"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel de Acceso (Rol)</label>
              <div className="relative group">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.name}>{role.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de Avatar (Opcional)</label>
              <input
                type="text"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm font-bold text-slate-700"
                placeholder="https://ejemplo.com/foto.jpg"
              />
            </div>

            {/* Scopes Section */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permisos por Marca y Línea (Opcional)</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, scopes: [...formData.scopes, { brand: '', line: '' }] })}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  + Agregar Regla
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.scopes.map((scope, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <select
                      value={scope.brand}
                      onChange={(e) => {
                        const newScopes = [...formData.scopes];
                        newScopes[index].brand = e.target.value;
                        setFormData({ ...formData, scopes: newScopes });
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 transition-all text-sm font-medium text-slate-700"
                    >
                      <option value="">Todas las marcas</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>

                    <select
                      value={scope.line}
                      onChange={(e) => {
                        const newScopes = [...formData.scopes];
                        newScopes[index].line = e.target.value;
                        setFormData({ ...formData, scopes: newScopes });
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 transition-all text-sm font-medium text-slate-700"
                    >
                      <option value="">Todas las líneas</option>
                      {lines.map(l => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const newScopes = formData.scopes.filter((_, i) => i !== index);
                        setFormData({ ...formData, scopes: newScopes });
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {formData.scopes.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4 italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    Sin restricciones. El usuario tendrá acceso global según su rol.
                  </div>
                )}
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
              Guardar Cambios
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
