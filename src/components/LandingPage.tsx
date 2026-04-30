import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Beaker, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Globe, 
  Settings,
  ChevronDown,
  Activity,
  Box,
  Cpu
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-[#050b18] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden">
      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl mt-4 mx-4 md:mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Beaker className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">I+D Portal <span className="text-blue-500 font-light">Management</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#stats" className="hover:text-white transition-colors">Impacto</a>
          <a href="#about" className="hover:text-white transition-colors">Nosotros</a>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEnter}
          className="bg-white text-[#050b18] px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-white/10 hover:bg-blue-50 transition-all flex items-center gap-2"
        >
          Iniciar Portal
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nueva Plataforma Centralizada
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold leading-[1.1] mb-8 bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
              Elevamos el estándar de <span className="text-blue-500">Innovación</span> en Grupo Sole.
            </h1>
            <p className="text-xl text-white/60 mb-10 leading-relaxed max-w-xl">
              Gestiona artes, fichas técnicas, inspecciones de muestras y cálculos científicos en un ecosistema digital inteligente diseñado para la excelencia operativa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onEnter}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-3"
              >
                Acceso al Portal
                <ArrowRight className="w-5 h-5" />
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold text-lg transition-all backdrop-blur-sm">
                Ver Capacitación
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_-12px_rgba(37,99,235,0.3)] bg-[#0a1120]/50 backdrop-blur-sm">
              <img 
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200" 
                alt="I+D Dashboard"
                className="w-full h-auto opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1120] via-transparent to-transparent" />
              
              {/* Floating UI elements */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 -left-6 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Aprobaciones</p>
                    <p className="text-sm font-bold">Artes V4 Listas</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-20 -right-6 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Calibración</p>
                    <p className="text-sm font-bold">29 Equipos OK</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Abstract Background Decoration */}
            <div className="absolute -inset-10 bg-blue-500/10 blur-[100px] rounded-full z-0 animate-pulse" />
          </motion.div>
        </div>

        <div className="mt-32 flex justify-center">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/20 flex flex-col items-center gap-2"
          >
            <span className="text-xs uppercase tracking-widest font-bold">Explorar Más</span>
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-white/[0.02] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Proyectos Activos', value: '142+', icon: Layers },
              { label: 'Inspecciones Realizadas', value: '1.2k', icon: Beaker },
              { label: 'Artes Aprobados', value: '850+', icon: FileText },
              { label: 'Proveedores Globales', value: '45', icon: Globe },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mb-4">
                  <stat.icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-4xl font-bold mb-2">{stat.value}</h3>
                <p className="text-white/40 text-sm font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Módulos de Alto Rendimiento</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Una suite completa diseñada específicamente para los desafíos técnicos de la industria.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'Gestión de Artes',
              desc: 'Versionamiento automático y flujo de aprobación por pilares (I+D, MKT, PLAN, PROV).',
              icon: Layers,
              color: 'from-blue-600 to-indigo-600'
            },
            {
              title: 'Inspección de Muestras',
              desc: 'Workflow dinámico con timers de inspección y galerías de evidencia integradas.',
              icon: Beaker,
              color: 'from-purple-600 to-pink-600'
            },
            {
              title: 'Cálculos Científicos',
              desc: 'Dashboard especializado para cálculos termodinámicos y dimensionamientos técnicos.',
              icon: Cpu,
              color: 'from-emerald-600 to-teal-600'
            },
            {
              title: 'Canton Fair Portal',
              desc: 'Base de datos global de proveedores con ratings de innovación y precios FOB.',
              icon: Globe,
              color: 'from-orange-600 to-red-600'
            },
            {
              title: 'Inventario de Laboratorio',
              desc: 'Control de vigilancia de calibración para equipos críticos y trazabilidad total.',
              icon: Box,
              color: 'from-cyan-600 to-blue-600'
            },
            {
              title: 'Work Plan Tracking',
              desc: 'Seguimiento de proyectos mediante diagramas de Gantt y gestión de actividades.',
              icon: Settings,
              color: 'from-indigo-600 to-violet-600'
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Beaker className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold">I+D Portal <span className="font-light text-white/50">v4.0.0</span></span>
          </div>
          <div className="text-white/40 text-sm">
            © 2026 Grupo Sole. Todos los derechos reservados.
          </div>
          <div className="flex gap-6 text-white/40 text-sm">
            <a href="#" className="hover:text-white">Privacidad</a>
            <a href="#" className="hover:text-white">Soporte</a>
            <a href="#" className="hover:text-white">Documentación</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
