import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, User as UserIcon, Loader2, AlertCircle, ArrowLeft, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu registro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b18] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[1000px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative z-10"
      >
        {/* Left Side - Visual/Branding */}
        <div className="md:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
          </div>
          
          <div className="relative z-10">
            <motion.button
              whileHover={{ x: -5 }}
              onClick={() => {
                console.log('Back button clicked');
                onBack();
              }}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12 group relative z-20"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </motion.button>
            <h1 className="text-4xl font-bold mb-6 leading-tight">
              I+D Portal <br />
              <span className="text-white/70 font-light">Management</span>
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-sm">
              Accede a la plataforma centralizada de Innovación y Desarrollo de Grupo Sole.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-semibold">{isSignUp ? 'Nueva Cuenta' : 'Seguridad Total'}</p>
                <p className="text-sm text-white/60">{isSignUp ? 'Únete a nuestra plataforma' : 'Acceso cifrado y seguro'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-[#0a1120]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? 'Crear Usuario' : 'Bienvenido'}
            </h2>
            <p className="text-slate-400">
              {isSignUp ? 'Regístrate para solicitar acceso' : 'Ingresa tus credenciales para continuar'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 block">Nombre Completo</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Juan Pérez"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="nombre@gruposole.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 block">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isSignUp ? 'Crear Usuario' : 'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
              }}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {isSignUp 
                ? '¿Ya tienes una cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
