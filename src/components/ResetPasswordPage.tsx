import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Loader2, AlertCircle, CheckCircle2, ShieldAlert, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const { setIsRecovery, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;
      
      setSuccess(true);
      toast.success('Contraseña restablecida correctamente');
      
      // Delay transition to app to let user see success state
      setTimeout(() => {
        setIsRecovery(false);
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await signOut();
      setIsRecovery(false);
    } catch (err) {
      console.error('Error logging out during recovery cancel:', err);
      setIsRecovery(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[480px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-10 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2">Restablecer Contraseña</h2>
          <p className="text-slate-400 text-sm font-medium">
            Ingresa tu nueva clave de acceso para continuar de forma segura.
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-emerald-400">¡Contraseña Actualizada!</h3>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              Redireccionando de forma segura a la plataforma Sole...
            </p>
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mt-6" />
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* New Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Nueva Contraseña
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Confirmar Contraseña
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white/10 outline-none transition-all text-sm font-bold placeholder-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 text-xs"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black uppercase tracking-wider text-[10px]">Error de Validación</p>
                    <p className="font-medium text-slate-300 leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-[0.98] uppercase tracking-widest text-xs"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Restablecer Contraseña'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" />
                Cancelar e Iniciar Sesión
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
