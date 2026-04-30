import React, { useState, useEffect } from 'react';
import { 
  Wind, 
  FlaskConical, 
  Droplets, 
  Thermometer, 
  ChevronRight, 
  ChevronDown,
  Clock, 
  Search, 
  Plus, 
  ArrowRight,
  Database,
  LayoutGrid,
  History,
  BookOpen,
  X as CloseIcon,
  Info,
  Flame
} from 'lucide-react';
import { ModuleId, CalculationRecord } from '../types';
import { fetchCalculationRecords } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface CalculationsDashboardProps {
  onModuleChange: (module: ModuleId) => void;
  onLoadRecord: (moduleId: ModuleId, data: any) => void;
}

interface CalculationTool {
  id: ModuleId;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  theory: {
    formula: string;
    variables: { name: string; description: string }[];
    description: string;
    methods?: { name: string; description: string }[];
  };
}

const TOOLS: CalculationTool[] = [
  {
    id: 'absorption_calculation',
    title: 'Cálculo de Absorción de Campana',
    description: 'Dimensionamiento de capacidad de extracción basado en volumen de cocina y uso.',
    icon: <Wind size={24} />,
    color: 'blue',
    category: 'Campana Extractora',
    theory: {
      formula: "Q = V × N",
      variables: [
        { name: "Q", description: "Caudal de extracción (m³/h)" },
        { name: "V", description: "Volumen de la cocina (m³)" },
        { name: "N", description: "Número de renovaciones de aire por hora" }
      ],
      description: "El cálculo del caudal de extracción es vital para garantizar la eliminación de contaminantes, vapores y calor excesivo en el ambiente de cocina.",
      methods: [
        { name: "Método de Renovaciones", description: "Basado en el volumen total del recinto (V) multiplicado por un factor de cambios de aire por hora (N). Recomendado: 15-30 renovaciones/hora parea cocinas industriales." },
        { name: "Método de Velocidad de Captura", description: "Enfoque en la velocidad mínima del aire en la cara de la campana (típicamente 0.25 - 0.50 m/s) para asegurar que los humos no escapen lateralmente." },
        { name: "Método por Área de Cocción", description: "Cálculo basado en las dimensiones de los equipos de calor (quemadores, freidoras) y un factor de seguridad por desborde." }
      ]
    }
  },
  {
    id: 'gas_heater_experimental',
    title: 'Rendimiento Térmico de Calentadores',
    description: 'Evaluación experimental de eficiencia energética y rendimiento térmico.',
    icon: <FlaskConical size={24} />,
    color: 'emerald',
    category: 'Calentadores a gas',
    theory: {
      formula: "η = (m × Cp × ΔT) / (V × Hv)",
      variables: [
        { name: "η", description: "Eficiencia térmica (%)" },
        { name: "m", description: "Masa de agua calentada (kg)" },
        { name: "Cp", description: "Calor específico del agua (4.186 kJ/kg°C)" },
        { name: "ΔT", description: "Diferencial de temperatura (°C)" },
        { name: "V", description: "Volumen de gas consumido (m³)" },
        { name: "Hv", description: "Poder calorífico del gas (kJ/m³)" }
      ],
      description: "Permite cuantificar la eficiencia de la transferencia de calor del combustible al fluido caloportador.",
      methods: [
        { name: "Banco Hidráulico (Continuo)", description: "Se miden caudales constantes y temperaturas de entrada/salida estabilizadas. Es el método estándar de laboratorio." },
        { name: "Prueba de Acumulación", description: "Evaluación en calentadores tipo tanque, midiendo el tiempo para elevar una temperatura específica." },
        { name: "Corrección por STP", description: "Obligatorio ajustar el volumen de gas según la presión atmosférica local y la temperatura del medidor para obtener el volumen real estándar." }
      ]
    }
  },
  {
    id: 'water_demand',
    title: 'Dimensionamiento de Agua Caliente',
    description: 'Cálculo de demanda simultánea y capacidad de almacenamiento requerida.',
    icon: <Droplets size={24} />,
    color: 'cyan',
    category: 'Calentadores a gas',
    theory: {
      formula: "D = Σ (Ui × Ki)",
      variables: [
        { name: "D", description: "Demanda máxima probable (L/min)" },
        { name: "Ui", description: "Unidades de gasto por aparato" },
        { name: "Ki", description: "Factor de simultaneidad" }
      ],
      description: "El dimensionamiento correcto evita el agotamiento prematuro de agua caliente y optimiza el consumo de energía.",
      methods: [
        { name: "Método de Hunter", description: "Se asignan unidades de gasto (UG) a cada punto de agua y se usa la curva de Hunter para hallar el caudal probable según la probabilidad estadística de uso." },
        { name: "Método de Simultaneidad Directa", description: "Aplicación de coeficientes fijos según el número de baños o tipo de usuario (hotel, vivienda, gimnasio)." },
        { name: "Cálculo de Acumulación", description: "Determinación del volumen del tanque basado en la demanda punta (peak hour) y la capacidad de recuperación del quemador." }
      ]
    }
  },
  {
    id: 'oven_experimental',
    title: 'Análisis Térmico de Hornos',
    description: 'Mapeo de temperatura por zonas y curvas de calentamiento.',
    icon: <Flame size={24} />,
    color: 'orange',
    category: 'Hornos',
    theory: {
      formula: "T(t) = Ta + (Ti - Ta)e^(-kt)",
      variables: [
        { name: "T(t)", description: "Temperatura en el tiempo t" },
        { name: "Ta", description: "Temperatura ambiente/horno" },
        { name: "k", description: "Constante térmo-dinámica" }
      ],
      description: "Evaluación de la homogeneidad térmica y eficiencia de aislamiento en cavidades de cocción.",
      methods: [
        { name: "Muestreo Multipunto", description: "Registro simultáneo en diferentes niveles (superior, medio, inferior) para detectar zonas frías." },
        { name: "Curva de Estabilización", description: "Medición del tiempo requerido para alcanzar el set-point y la histéresis del termostato." }
      ]
    }
  },
  {
    id: 'temperature_loss',
    title: 'Pérdida de Temperatura en Tuberías',
    description: 'Análisis de caída térmica en redes de distribución de agua caliente.',
    icon: <Thermometer size={24} />,
    color: 'rose',
    category: 'Griferías',
    theory: {
      formula: "Q = U × A × ΔT",
      variables: [
        { name: "Q", description: "Pérdida de calor (W)" },
        { name: "U", description: "Coeficiente global de transferencia de calor" },
        { name: "A", description: "Área superficial de la tubería (m²)" },
        { name: "ΔT", description: "Diferencia entre temp. del agua y temp. ambiente" }
      ],
      description: "Estudio del enfriamiento pasivo en redes de distribución.",
      methods: [
        { name: "Análisis de Materiales", description: "Comparación de pérdidas térmicas entre metales (Cobre) con alta conductividad y polímeros (PEX/PPR) con baja conductividad." },
        { name: "Efecto del Aislamiento", description: "Cálculo del espesor crítico de aislamiento y reducción porcentual de pérdidas por milímetro de elastómero o lana de roca." },
        { name: "Caída por Longitud", description: "Estimación del gradiente de temperatura local (°C/m) en función del caudal circulante." }
      ]
    }
  },
  {
    id: 'cr_ni_coating_analysis',
    title: 'Análisis de Recubrimiento Cr-Ni',
    description: 'Medición de espesor de cromo y níquel por método coulométrico.',
    icon: <FlaskConical size={24} />,
    color: 'slate',
    category: 'Griferías',
    theory: {
      formula: "e = (I × t × M) / (n × F × ρ × A)",
      variables: [
        { name: "e", description: "Espesor del recubrimiento (µm)" },
        { name: "I", description: "Corriente (A)" },
        { name: "t", description: "Tiempo de disolución (s)" },
        { name: "M", description: "Masa molar del metal (g/mol)" },
        { name: "n", description: "Número de electrones intercambiados" },
        { name: "F", description: "Constante de Faraday (96,485 C/mol)" },
        { name: "ρ", description: "Densidad del metal (g/cm³)" },
        { name: "A", description: "Área de disolución (cm²)" }
      ],
      description: "Determinación precisa de capas metálicas para cumplimiento normativo de resistencia a la corrosión.",
      methods: [
        { name: "Método Coulométrico", description: "Descapado electrolítico mediante corriente constante. Es destructivo pero altamente preciso para capas delgadas (Cromo)." },
        { name: "Microscopía (Corte Transversal)", description: "Referencia destructiva mediante examen óptico de sección pulida. Usado para validación de resultados electrónicos." },
        { name: "Flujo Magnético/Corrientes Eddy", description: "Alternativa no destructiva para bases ferrosas o no ferrosas, con mayor margen de error en capas múltiples." }
      ]
    }
  }
];

const CATEGORIES = [
  { name: 'Campana Extractora', icon: <Wind size={20} />, color: 'blue' },
  { name: 'Calentadores a gas', icon: <FlaskConical size={20} />, color: 'emerald' },
  { name: 'Hornos', icon: <Flame size={20} />, color: 'orange' },
  { name: 'Griferías', icon: <Droplets size={20} />, color: 'cyan' }
];

export default function CalculationsDashboard({ onModuleChange, onLoadRecord }: CalculationsDashboardProps) {
  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheoryTool, setSelectedTheoryTool] = useState<CalculationTool | null>(null);

  const [isTheoryDropdownOpen, setIsTheoryDropdownOpen] = useState(false);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      const data = await fetchCalculationRecords();
      // Only show calculation-related modules
      const calculationModules: ModuleId[] = ['water_demand', 'gas_heater_experimental', 'absorption_calculation', 'temperature_loss', 'cr_ni_coating_analysis', 'oven_experimental'];
      setRecords(data.filter(r => calculationModules.includes(r.module_id)));
      setLoading(false);
    };
    loadRecords();
  }, []);

  const handleLoad = (record: CalculationRecord) => {
    try {
      const data = JSON.parse(record.record_data);
      onLoadRecord(record.module_id, data);
      onModuleChange(record.module_id);
    } catch (e) {
      console.error('Error parsing record data', e);
    }
  };

  const filteredTools = TOOLS.filter(tool => 
    tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentRecords = records.slice(0, 5);

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
            <LayoutGrid size={12} />
            Módulo de Ingeniería
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Cálculos Técnicos</h1>
          <p className="text-slate-500 font-medium max-w-2xl text-lg">
            Selecciona una herramienta de cálculo o carga un registro previo para continuar con el dimensionamiento.
          </p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar herramienta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-700 bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Tools Grid */}
        <div className="lg:col-span-2 space-y-10">
          {CATEGORIES.map((category) => {
            const categoryTools = filteredTools.filter(t => t.category === category.name);
            if (categoryTools.length === 0) return null;

            return (
              <div key={category.name} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className={`p-2 rounded-xl bg-${category.color}-50 text-${category.color}-600`}>
                    {category.icon}
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase tracking-widest text-sm">{category.name}</h2>
                  <div className="flex-1 h-px bg-slate-100 ml-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoryTools.map((tool) => (
                    <motion.div
                      key={tool.id}
                      whileHover={{ y: -4 }}
                      className="group relative flex flex-col text-left bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl bg-${tool.color}-50 text-${tool.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                          {tool.icon}
                        </div>
                        <button 
                          onClick={() => setSelectedTheoryTool(tool)}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                          title="Ver base teórica"
                        >
                          <BookOpen size={18} />
                        </button>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed flex-1">
                        {tool.description}
                      </p>
                      
                      <div className="mt-6 flex items-center justify-between">
                        <button 
                          onClick={() => onModuleChange(tool.id)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors"
                        >
                          Iniciar Nuevo
                          <Plus size={14} />
                        </button>
                        <button 
                          onClick={() => onModuleChange(tool.id)}
                          className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar: Recent Calculations */}
        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                    <History size={20} />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Recientes</h2>
                </div>
                <button 
                  onClick={() => onModuleChange('records')}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                  Ver Todo
                </button>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
                    <Clock className="animate-spin" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando...</span>
                  </div>
                ) : recentRecords.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-slate-500 text-center">
                    <Database size={24} className="opacity-20" />
                    <p className="text-xs font-medium">No hay cálculos guardados recientemente.</p>
                  </div>
                ) : (
                  recentRecords.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleLoad(record)}
                      className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        {TOOLS.find(t => t.id === record.module_id)?.icon || <Database size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {record.project_name || 'Sin nombre'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            {format(parseISO(record.timestamp), "d MMM", { locale: es })}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-wider truncate">
                            {TOOLS.find(t => t.id === record.module_id)?.title.split(' ')[0] || record.module_id}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all mt-1" />
                    </button>
                  ))
                )}
              </div>

              <button 
                onClick={() => onModuleChange('records')}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white text-sm font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                Explorar Historial
                <ExternalLink size={16} />
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 relative">
            <h3 className="text-lg font-black text-indigo-900 mb-2 leading-tight">Biblioteca Técnica</h3>
            <p className="text-sm text-indigo-700/70 font-medium mb-6">
              Selecciona una guía técnica para entender los fundamentos de cálculo.
            </p>
            
            <div className="relative">
              <button 
                onClick={() => setIsTheoryDropdownOpen(!isTheoryDropdownOpen)}
                className="w-full flex items-center justify-between p-4 bg-white text-indigo-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:shadow-lg transition-all border border-indigo-100 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen size={16} />
                  </div>
                  <span>Bibliografía Técnica</span>
                </div>
                <motion.div
                  animate={{ rotate: isTheoryDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isTheoryDropdownOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setIsTheoryDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-[2rem] shadow-2xl border border-indigo-100 overflow-hidden z-50 p-2"
                    >
                      {TOOLS.map((tool) => (
                        <button 
                          key={tool.id}
                          onClick={() => {
                            setSelectedTheoryTool(tool);
                            setIsTheoryDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl transition-all text-left"
                        >
                          <div className={`p-2 rounded-lg bg-${tool.color}-50 text-${tool.color}-600`}>
                            {React.cloneElement(tool.icon as React.ReactElement, { size: 16 })}
                          </div>
                          <span className="text-xs font-bold truncate">{tool.title}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Theory Modal */}
      <AnimatePresence>
        {selectedTheoryTool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTheoryTool(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${selectedTheoryTool.color}-50 text-${selectedTheoryTool.color}-600 flex items-center justify-center`}>
                    {selectedTheoryTool.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Biblioteca Técnica</h2>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {TOOLS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTheoryTool(t)}
                          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${
                            selectedTheoryTool.id === t.id 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                          }`}
                        >
                          {t.title.split(' ').slice(-1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTheoryTool(null)}
                  className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <CloseIcon size={24} />
                </button>
              </div>

              <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Info size={18} />
                        <h3 className="text-xs font-black uppercase tracking-widest">Fórmula Principal</h3>
                      </div>
                      <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-200">
                        <span className="text-4xl font-mono tracking-tighter text-blue-400 text-center">
                          {selectedTheoryTool.theory.formula}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Variables y Parámetros</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedTheoryTool.theory.variables.map((v, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-mono font-black text-blue-600 shadow-sm shrink-0">
                              {v.name}
                            </span>
                            <span className="text-xs font-bold text-slate-600 leading-tight">{v.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Descripción Técnica</h3>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {selectedTheoryTool.theory.description}
                      </p>
                    </div>

                    {selectedTheoryTool.theory.methods && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Métodos de Cálculo Relevantes</h3>
                        <div className="space-y-4">
                          {selectedTheoryTool.theory.methods.map((m, i) => (
                            <div key={i} className="group p-5 rounded-[2rem] bg-blue-50/30 border border-blue-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                              <span className="text-sm font-black text-blue-900 block mb-2">{m.name}</span>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">{m.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button 
                  onClick={() => setSelectedTheoryTool(null)}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExternalLink({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
