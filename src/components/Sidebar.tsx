import React, { useState, useEffect } from 'react';
import { 
  Package, 
  FileText, 
  FileSpreadsheet, 
  CheckSquare, 
  Image as ImageIcon, 
  Layers,
  ChevronRight,
  ChevronDown,
  FlaskConical,
  ClipboardList,
  Calendar as CalendarIcon,
  Users,
  Droplets,
  Database,
  Wind,
  Thermometer,
  Book,
  X,
  Zap,
  ShoppingBag,
  Briefcase,
  Lightbulb,
  Menu,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';

interface SidebarProps {
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  title: string;
  id: string;
  icon?: React.ReactNode;
  modules: { id: ModuleId; label: string; icon: React.ReactNode; permission?: string }[];
}

export default function Sidebar({ activeModule, onModuleChange, isOpen, onClose }: SidebarProps) {
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  
  // State for collapsible groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'seguimiento': true,
    'aprobados': false,
    'gestion': false,
    'productos': false,
    'recursos': false,
    'config': false
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Gestión Operativa',
      id: 'seguimiento',
      icon: <CalendarIcon size={18} />,
      modules: [
        { id: 'calendar', label: 'Calendario', icon: <CalendarIcon size={18} />, permission: 'calendar:view' },
        { id: 'work_plan', label: 'Plan de Trabajo', icon: <CalendarIcon size={18} />, permission: 'work_plan:view' },
        { id: 'artwork_followup', label: 'Seguimiento de Artes', icon: <CheckSquare size={18} />, permission: 'artwork:view' },
        { id: 'technical_datasheet', label: 'Seguimiento Ficha Técnica', icon: <FileText size={18} />, permission: 'technical_sheets:view' },
        { id: 'commercial_datasheet', label: 'Seguimiento Ficha Comercial', icon: <FileSpreadsheet size={18} />, permission: 'technical_sheets:view' },
      ]
    },
    {
      title: 'Archivo Histórico',
      id: 'aprobados',
      icon: <CheckSquare size={18} />,
      modules: [
        { id: 'commercial_artworks', label: 'Artes Aprobados', icon: <ImageIcon size={18} />, permission: 'approved_artworks:view' },
        { id: 'approved_technical_sheets', label: 'Fichas Técnicas', icon: <FileText size={18} />, permission: 'approved_technical:view' },
        { id: 'approved_commercial_sheets', label: 'Fichas Comerciales', icon: <FileSpreadsheet size={18} />, permission: 'approved_commercial:view' },
      ]
    },
    {
      title: 'Desarrollo I+D',
      id: 'gestion',
      icon: <Briefcase size={18} />,
      modules: [
        { id: 'rd_projects', label: 'Proyectos I+D', icon: <Briefcase size={18} />, permission: 'projects:view' },
        { id: 'innovation_proposals', label: 'Propuestas de Innovación', icon: <Lightbulb size={18} />, permission: 'proposals:view' },
        { id: 'rd_inventory', label: 'Inventario I+D', icon: <ClipboardList size={18} />, permission: 'inventory:view' },
        { id: 'supplier_master', label: 'Maestro de Proveedores', icon: <Users size={18} />, permission: 'suppliers:view' },
      ]
    },
    {
      title: 'Ingeniería & Productos',
      id: 'productos',
      icon: <Package size={18} />,
      modules: [
        { id: 'samples', label: 'Muestras', icon: <Package size={18} />, permission: 'samples:view' },
        { id: 'product_management', label: 'Catálogo Productos', icon: <ShoppingBag size={18} />, permission: 'catalog:view' },
        { id: 'energy_efficiency', label: 'Eficiencia Energética', icon: <Zap size={18} />, permission: 'efficiency:view' },
        { id: 'calculations_dashboard', label: 'Panel de Cálculos', icon: <Layers size={18} />, permission: 'calculations:view' },
      ]
    },
    {
      title: 'Recursos & Guías',
      id: 'recursos',
      icon: <Book size={18} />,
      modules: [
        { id: 'brandbook', label: 'Manual de Marca', icon: <Book size={18} />, permission: 'brandbook:view' },
        { id: 'ntp_regulations', label: 'Normativas NTP', icon: <FileText size={18} />, permission: 'regulations:view' },
        { id: 'canton_fair', label: 'Ferias Internacionales', icon: <Briefcase size={18} />, permission: 'fairs:view' },
        { id: 'applications', label: 'Aplicaciones', icon: <Layers size={18} />, permission: 'apps:view' },
        { id: 'records', label: 'Registros Base', icon: <Database size={18} />, permission: 'records:view' },
      ]
    },
    {
      title: 'Configuración',
      id: 'config',
      icon: <Shield size={18} />,
      modules: [
        { id: 'user_management', label: 'Usuarios y Permisos', icon: <Users size={18} />, permission: 'users:view' },
      ]
    }
  ];

  const renderModuleButton = (module: { id: ModuleId; label: string; icon: React.ReactNode; permission?: string }) => {
    // Check permission if defined
    if (module.permission && !hasPermission(module.permission)) return null;

    const calculationModules: ModuleId[] = ['water_demand', 'gas_heater_experimental', 'absorption_calculation', 'temperature_loss', 'calculations_dashboard'];
    const isCalculationModule = calculationModules.includes(activeModule);
    const isActive = module.id === 'calculations_dashboard' ? isCalculationModule : activeModule === module.id;
    
    return (
      <button
        key={module.id}
        onClick={() => {
          onModuleChange(module.id);
          if (window.innerWidth < 1024) onClose();
        }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${
          isActive 
            ? 'bg-blue-600/10 text-blue-400' 
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        }`}
      >
        <span className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
          {module.icon}
        </span>
        <span className="flex-1 truncate text-left">{module.label}</span>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed lg:sticky top-0 left-0 z-[70] lg:z-0
        h-screen bg-[#0f172a] border-r border-slate-800/50 flex flex-col shrink-0
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72' : 'w-0 lg:w-0 overflow-hidden opacity-0'}
        ${window.innerWidth < 1024 && !isOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20">R</div>
            <span className="text-lg font-bold text-white tracking-tight">R&D Portal</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => {
            const filteredModules = group.modules.filter(m => !m.permission || hasPermission(m.permission));
            if (filteredModules.length === 0) return null;
            
            const isExpanded = expandedGroups[group.id];
            const hasActiveChild = filteredModules.some(m => {
              if (m.id === 'calculations_dashboard') {
                return ['water_demand', 'gas_heater_experimental', 'absorption_calculation', 'temperature_loss', 'calculations_dashboard'].includes(activeModule);
              }
              return activeModule === m.id;
            });

            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    isExpanded || hasActiveChild ? 'text-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="shrink-0 opacity-70">{group.icon}</span>
                  <span className="flex-1 text-left">{group.title}</span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 py-1 space-y-1 border-l border-slate-800/50 ml-6 mt-1">
                        {filteredModules.map(renderModuleButton)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/30">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-sm font-black text-blue-400 shadow-inner overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.substring(0, 2).toUpperCase() || 'ID'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile?.full_name || 'Usuario'}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter truncate">{profile?.role || 'Invitado'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
