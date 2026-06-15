import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Target, Users, BarChart3, Clock, CheckCircle2, Shield, Info, 
  Activity, ChevronRight, ArrowLeft, RefreshCw, Zap, Book, ShieldAlert,
  Flame, HelpCircle, FileText, Settings, Hammer, Sliders, Play, Plus, ArrowRight,
  Maximize2, LayoutGrid, Check, Server, Building2, HeartHandshake, Eye
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Import newly uploaded cropped graphic assets
import imgAppRes from '../assets/graphics/applications_res.png';
import imgAppCom from '../assets/graphics/applications_com.png';
import imgInstIndividual from '../assets/graphics/installation_individual.png';
import imgInstCascadeClean from '../assets/graphics/installation_cascade_clean.png';
import imgInstCascadeRinnai from '../assets/graphics/installation_cascade_rinnai.png';
import imgInstMixed from '../assets/graphics/installation_mixed.png';
import imgWiringSimple from '../assets/graphics/wiring_cascade_simple.png';
import imgWiringComplex from '../assets/graphics/wiring_cascade_complex.png';
import imgModulationCurve from '../assets/graphics/modulation_curve.png';
import imgHunterCurves from '../assets/graphics/hunter_curves.png';

interface TopicItem {
  id: string;
  title: string;
  category: 'logic' | 'hardware' | 'installation';
  icon: React.ReactNode;
}

export default function SizingModule({ onModuleChange }: { onModuleChange?: (module: string) => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'methods'>('info');
  const [activeTopic, setActiveTopic] = useState<string>('arquitectura');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Modulation Simulator State
  const [timelineIndex, setTimelineIndex] = useState<number>(0);

  // Sizing Calculators
  const [calcMethod, setCalcMethod] = useState<'ashrae' | 'aspe'>('ashrae');
  
  // ASHRAE Inputs
  const [apartments, setApartments] = useState<number>(50);
  const [showersPerApt, setShowersPerApt] = useState<number>(1.5);
  const [washbasinsPerApt, setWashbasinsPerApt] = useState<number>(2);
  const [sinksPerApt, setSinksPerApt] = useState<number>(1);
  const [tempDelta, setTempDelta] = useState<number>(40);

  // ASPE Inputs
  const [buildingType, setBuildingType] = useState<'hotel' | 'hospital' | 'multifamily'>('multifamily');
  const [unitsCount, setUnitsCount] = useState<number>(80);

  // App Sectors State
  const [appSectorTab, setAppSectorTab] = useState<'residential' | 'commercial'>('residential');

  const topics: TopicItem[] = [
    { id: 'arquitectura', title: 'Arquitectura de Suministro', category: 'logic', icon: <Droplets size={16} /> },
    { id: 'modulacion_sim', title: 'Simulador de Modulación', category: 'logic', icon: <Zap size={16} /> },
    { id: 'control_cableado', title: 'Control y Cableado de Cascada', category: 'logic', icon: <RefreshCw size={16} /> },
    { id: 'sectores_app', title: 'Sectores y Aplicaciones Rinnai', category: 'logic', icon: <Building2 size={16} /> },
    { id: 'manual_tecnico', title: 'Especificaciones Calentador 32L', category: 'hardware', icon: <Hammer size={16} /> }
  ];

  const modulationTimeline = [
    { 
      hour: '06:00 - 08:00', 
      title: 'Pico Matutino (Duchas Simultáneas)', 
      desc: 'Caudal de demanda elevado. Múltiples calentadores Rinnai se activan secuencialmente y operan a régimen modulado al 100%. La caldera tradicional tradicionalmente enciende a máxima potencia cíclicamente sufriendo pérdidas por inercia térmica.',
      rinnaiStatus: 'Quemadores al 100% de potencia. Cascada activada en paralelo.',
      boilerStatus: 'Encendido completo forzado. Pérdidas masivas en chimenea.',
      saving: 'Ahorro Alto'
    },
    { 
      hour: '12:00 - 14:00', 
      title: 'Bajo Consumo (Mediodía)', 
      desc: 'Pocos puntos de consumo abiertos. Rinnai modula al 10% de su capacidad. La caldera tradicional se apaga y enciende constantemente (ciclaje corto), perdiendo calor acumulado en la chimenea y quemando gas ineficientemente.',
      rinnaiStatus: '1 unidad operando al 10% de modulación. Resto en espera inteligente.',
      boilerStatus: 'Ciclos intermitentes cortos. Desgaste prematuro del quemador.',
      saving: 'Máximo Ahorro Rinnai'
    },
    { 
      hour: '18:00 - 20:00', 
      title: 'Consumo Medio (Retorno a Hogares)', 
      desc: 'Uso residencial regular. Los calentadores Rinnai rotan activamente para balancear el desgaste físico de los intercambiadores de cobre. Modulación proporcional al 45%.',
      rinnaiStatus: '2 unidades modulando al 45%. Rotación automática de desgaste.',
      boilerStatus: 'Operación a carga parcial ineficiente.',
      saving: 'Ahorro Proporcional'
    },
    { 
      hour: '22:00 - 00:00', 
      title: 'Estabilidad de Temperatura', 
      desc: 'Fluctuación rápida de consumos por grifería. La servoválvula Rinnai y la modulación de gas responden instantáneamente a los cambios rápidos de caudal, garantizando temperatura de salida constante de 42°C sin quemar gas innecesario.',
      rinnaiStatus: 'Servoválvula de caudal ajustando entrada electrónica.',
      boilerStatus: 'Incapaz de modular rápido. Fluctuaciones térmicas molestas.',
      saving: 'Consumo Ajustado a Demanda'
    }
  ];

  const ashraeCalculations = useMemo(() => {
    const fuShowers = 1.5;
    const fuWashbasins = 0.75;
    const fuSinks = 1.5;
    const totalAptFu = (showersPerApt * fuShowers) + (washbasinsPerApt * fuWashbasins) + (sinksPerApt * fuSinks);
    const totalFU = Math.round(apartments * totalAptFu * 100) / 100;

    let qProbGpm = 0;
    if (totalFU > 0) {
      qProbGpm = 1.05 * Math.pow(totalFU, 0.55);
    }
    const qProbLpm = qProbGpm * 3.78541;
    const powerKw = qProbLpm * tempDelta * 0.06978;
    const heaterPowerKw = 56;
    const requiredHeaters = Math.ceil(powerKw / heaterPowerKw);

    return {
      totalFU,
      qProbGpm: parseFloat(qProbGpm.toFixed(1)),
      qProbLpm: parseFloat(qProbLpm.toFixed(1)),
      powerKw: Math.round(powerKw * 10) / 10,
      requiredHeaters: Math.max(1, requiredHeaters)
    };
  }, [apartments, showersPerApt, washbasinsPerApt, sinksPerApt, tempDelta]);

  const aspeCalculations = useMemo(() => {
    let consPerUnit = 0;
    let storageFactor = 0;
    let recoveryFactor = 0;
    let label = '';

    switch (buildingType) {
      case 'hotel':
        consPerUnit = 75;
        storageFactor = 0.8; 
        recoveryFactor = 0.25;
        label = 'Habitaciones';
        break;
      case 'hospital':
        consPerUnit = 110;
        storageFactor = 0.6;
        recoveryFactor = 0.4;
        label = 'Camas';
        break;
      case 'multifamily':
      default:
        consPerUnit = 90;
        storageFactor = 1.2;
        recoveryFactor = 0.3;
        label = 'Departamentos';
        break;
    }

    const peakHourDemand = unitsCount * consPerUnit;
    const storageTankVolume = peakHourDemand * storageFactor;
    const recoveryRate = peakHourDemand * recoveryFactor;
    const recoveryPerHeaterLh = 1200; 
    const requiredHeaters = Math.ceil(recoveryRate / recoveryPerHeaterLh);

    return {
      peakHourDemand: Math.round(peakHourDemand),
      storageTankVolume: Math.round(storageTankVolume),
      recoveryRate: Math.round(recoveryRate),
      requiredHeaters: Math.max(1, requiredHeaters),
      unitLabel: label
    };
  }, [buildingType, unitsCount]);

  const handleOpenFullscreen = (img: string) => {
    setFullscreenImage(img);
    setIsFullscreen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-slate-200/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Droplets className="text-indigo-600" size={32} />
            MÓDULO DE DIMENSIONAMIENTO Y SISTEMAS CENTRALIZADOS
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Herramienta pedagógica interactiva para ingenieros y técnicos. Explica conceptos clave con diagramas reales aislados y calcula demandas.
          </p>
        </div>

        {/* Calculations Shortcut */}
        {onModuleChange && (
          <div 
            onClick={() => onModuleChange('water_demand')}
            className="flex items-center justify-between bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all rounded-3xl p-5 cursor-pointer max-w-sm w-full group relative overflow-hidden shrink-0"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Droplets size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-slate-900">Dimensionamiento de Agua Caliente</h4>
                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                  Cálculo de demanda simultánea y capacidad de almacenamiento requerida.
                </p>
                <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 uppercase tracking-widest pt-2">
                  <span>INICIAR NUEVO</span>
                  <Plus size={12} className="stroke-[3]" />
                </div>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center text-slate-400 shrink-0 shadow-inner">
              <ArrowRight size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'info' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Book size={16} />
          Explicación Dinámica de Conceptos
        </button>
        <button
          onClick={() => setActiveTab('methods')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'methods' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sliders size={16} />
          Calculadoras de Dimensionamiento
        </button>
      </div>

      {/* Tab 1: Interactive Learning Dashboard */}
      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Topic list on left */}
          <div className="lg:col-span-1 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Temario Técnico</h3>
            {topics.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id)}
                className={`w-full text-left px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                  activeTopic === t.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                }`}
              >
                <span className={activeTopic === t.id ? 'text-white' : 'text-slate-400'}>{t.icon}</span>
                <span>{t.title}</span>
              </button>
            ))}
          </div>

          {/* Main Visual Display */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
            
            <AnimatePresence mode="wait">
              {activeTopic === 'arquitectura' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Arquitectura y Tres Formas de Suministro</h3>
                    <p className="text-slate-500 text-xs mt-1">Explica a los instaladores los esquemas hidráulicos de distribución de agua caliente y sus aplicaciones.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Individual */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white aspect-[4/3] flex items-center justify-center p-2 group">
                          <img src={imgInstIndividual} alt="Individual" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => handleOpenFullscreen(imgInstIndividual)}
                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                          >
                            <Eye size={16} /> Ver Pantalla Completa
                          </button>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase">1. Suministro Individual</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Un calentador de paso por vivienda. Ideal para independizar consumos y facturación eléctrica/gas.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-1 text-[11px] text-slate-600 font-medium">
                        <div className="flex gap-1.5"><span className="text-red-500 font-bold">✗</span> Múltiples salidas de humos</div>
                        <div className="flex gap-1.5"><span className="text-red-500 font-bold">✗</span> Pérdida de espacio en balcones</div>
                      </div>
                    </div>

                    {/* Cascada */}
                    <div className="bg-indigo-50/20 border border-indigo-100 rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-100/50 bg-white aspect-[4/3] flex items-center justify-center p-2 group">
                          <img src={imgInstCascadeClean} alt="Cascada" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => handleOpenFullscreen(imgInstCascadeClean)}
                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                          >
                            <Eye size={16} /> Ver Pantalla Completa
                          </button>
                        </div>
                        <h4 className="text-sm font-black text-indigo-950 uppercase">2. Cascada Modular</h4>
                        <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                          Calentadores de paso en paralelo. Se activan electrónicamente conforme aumenta la demanda en el colector.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-indigo-100/50 space-y-1 text-[11px] text-indigo-800 font-medium">
                        <div className="flex gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Alta eficiencia (modulación)</div>
                        <div className="flex gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Redundancia activa del sistema</div>
                      </div>
                    </div>

                    {/* Mixto */}
                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-2xl border border-emerald-100/50 bg-white aspect-[4/3] flex items-center justify-center p-2 group">
                          <img src={imgInstMixed} alt="Mixto" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => handleOpenFullscreen(imgInstMixed)}
                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                          >
                            <Eye size={16} /> Ver Pantalla Completa
                          </button>
                        </div>
                        <h4 className="text-sm font-black text-emerald-950 uppercase">3. Mixto con Acumulación</h4>
                        <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                          Calentadores instantáneos Rinnai en ciclo de calentamiento continuo conectados a termoacumuladores de gran volumen.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-emerald-100/50 space-y-1 text-[11px] text-emerald-800 font-medium">
                        <div className="flex gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Absorbe picos extremos instantáneos</div>
                        <div className="flex gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Recomendado para Hoteles y Clínicas</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTopic === 'modulacion_sim' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Simulador de Modulación de Gas Rinnai</h3>
                      <p className="text-slate-500 text-xs mt-1">Simula el comportamiento real de gas en 24 horas y compáralo con calderas tradicionales.</p>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[11px] font-black uppercase tracking-wider">
                      {modulationTimeline[timelineIndex].saving}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    {/* Left: Interactive Timeline & Explanation */}
                    <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Seleccionar Escenario de Demanda:</span>
                        <div className="flex flex-col gap-2">
                          {modulationTimeline.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => setTimelineIndex(idx)}
                              className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                                timelineIndex === idx 
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div>
                                <span className="block text-[9px] font-black uppercase opacity-65">{item.hour}</span>
                                <span className="text-xs font-bold">{item.title}</span>
                              </div>
                              <ChevronRight size={16} className={timelineIndex === idx ? 'text-indigo-400' : 'text-slate-400'} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Activity size={14} className="text-indigo-600" />
                          Estado en la Central
                        </h4>
                        <div className="space-y-2 text-[11px] leading-relaxed">
                          <div>
                            <span className="font-black text-indigo-600 uppercase block text-[9px]">Rinnai Modulante:</span>
                            <span className="font-semibold text-slate-700">{modulationTimeline[timelineIndex].rinnaiStatus}</span>
                          </div>
                          <div>
                            <span className="font-black text-red-500 uppercase block text-[9px]">Caldera Convencional:</span>
                            <span className="font-semibold text-slate-700">{modulationTimeline[timelineIndex].boilerStatus}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Curve Chart Graphic */}
                    <div className="lg:col-span-3 space-y-4">
                      <div className="relative rounded-3xl border border-slate-200 bg-slate-50/50 p-4 overflow-hidden shadow-inner aspect-[1.8/1] flex items-center justify-center group">
                        <img 
                          src={imgModulationCurve} 
                          alt="Curva de Modulación" 
                          className="max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={() => handleOpenFullscreen(imgModulationCurve)}
                          className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl text-xs backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          <Maximize2 size={12} />
                          Expandir Gráfica
                        </button>
                      </div>

                      <div className="bg-slate-900 text-white rounded-2xl p-5 text-xs leading-relaxed font-semibold">
                        <p>{modulationTimeline[timelineIndex].desc}</p>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {activeTopic === 'control_cableado' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Control Electrónico y Cableado de Cascada</h3>
                    <p className="text-slate-500 text-xs mt-1">Cómo conectar eléctricamente los calentadores Rinnai para activar la cascada inteligente.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Simple */}
                    <div className="space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-3xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Instalación Básica</span>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Conexión en Cascada de 1 a 5 Equipos</h4>
                      
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white aspect-[1.8/1] flex items-center justify-center p-2 group">
                        <img src={imgWiringSimple} alt="Wiring Simple" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => handleOpenFullscreen(imgWiringSimple)}
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                        >
                          <Eye size={14} /> Ampliar Esquema
                        </button>
                      </div>
                      
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        Para hasta 5 unidades, un calentador actúa como maestro (1) comandando a las demás unidades de apoyo mediante cableado directo en cascada.
                      </p>
                    </div>

                    {/* Complex */}
                    <div className="space-y-4 bg-indigo-50/20 border border-indigo-100 p-6 rounded-3xl">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Instalación Avanzada</span>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Sistema Multilink (Hasta 25 Equipos)</h4>
                      
                      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/50 bg-white aspect-[1.8/1] flex items-center justify-center p-2 group">
                        <img src={imgWiringComplex} alt="Wiring Complex" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => handleOpenFullscreen(imgWiringComplex)}
                          className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                        >
                          <Eye size={14} /> Ampliar Esquema
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Componentes Requeridos:</span>
                        <ul className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700 leading-tight">
                          <li className="bg-white px-2 py-1.5 border border-slate-200 rounded-lg"><strong>REU-MSB-M:</strong> Módulo Maestro</li>
                          <li className="bg-white px-2 py-1.5 border border-slate-200 rounded-lg"><strong>REU-MSB-C1:</strong> Cable de conexión</li>
                          <li className="bg-white px-2 py-1.5 border border-slate-200 rounded-lg"><strong>REU-MSB-C2:</strong> Cable Comunicación</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTopic === 'sectores_app' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Sectores y Edificaciones de Aplicación</h3>
                      <p className="text-slate-500 text-xs mt-1">Identifica en qué proyectos se recomienda instalar centrales modulares Rinnai.</p>
                    </div>
                    
                    {/* Sector tab selector */}
                    <div className="flex bg-slate-100 p-1 border border-slate-200/80 rounded-xl">
                      <button
                        onClick={() => setAppSectorTab('residential')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          appSectorTab === 'residential' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Residencial
                      </button>
                      <button
                        onClick={() => setAppSectorTab('commercial')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          appSectorTab === 'commercial' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Comercial / Horeca
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left: Graphic display */}
                    <div className="relative rounded-3xl border border-slate-200 bg-slate-50/50 p-6 overflow-hidden shadow-inner aspect-[16/9] flex items-center justify-center group">
                      <img 
                        src={appSectorTab === 'residential' ? imgAppRes : imgAppCom} 
                        alt="Sectores" 
                        className="max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => handleOpenFullscreen(appSectorTab === 'residential' ? imgAppRes : imgAppCom)}
                        className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-xl text-xs backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 shadow-lg"
                      >
                        <Maximize2 size={12} />
                        Ver Gráfica
                      </button>
                    </div>

                    {/* Right: Technical briefing */}
                    <div className="space-y-4">
                      {appSectorTab === 'residential' ? (
                        <>
                          <h4 className="text-base font-black text-slate-900 uppercase">Sector Residencial Multifamiliar</h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                            Diseñado para optimizar las instalaciones de agua caliente sanitaria en condominios, departamentos y viviendas de alta densidad:
                          </p>
                          <ul className="space-y-2 text-xs font-semibold text-slate-700">
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Ahorro de espacio útil en lavanderías y balcones.</li>
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Centralización de medidores para cobro exacto.</li>
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Mayor seguridad al retirar la combustión de los departamentos.</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <h4 className="text-base font-black text-slate-900 uppercase">Sector Comercial y Horeca</h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                            Suministro continuo garantizado para hoteles, clínicas, gimnasios y restaurantes donde la falta de agua caliente detiene la operación comercial:
                          </p>
                          <ul className="space-y-2 text-xs font-semibold text-slate-700">
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Redundancia 100%: si un equipo falla, los demás asumen la demanda.</li>
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Flexibilidad de ampliación de la cascada si el negocio crece.</li>
                            <li className="flex gap-2"><Check className="text-emerald-500 shrink-0" size={16} /> Compatibilidad directa con sistemas de recirculación térmica.</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTopic === 'manual_tecnico' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Especificaciones del Calentador RINGASN32C</h3>
                    <p className="text-slate-500 text-xs mt-1">Detalles de construcción interna y pautas técnicas comerciales del equipo de 32 Litros.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 font-semibold">
                    <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2">
                      <span className="font-black text-indigo-600 uppercase tracking-widest text-[9px] block">Materiales Internos</span>
                      <p>Intercambiador de calor fabricado en cobre de alto espesor y quemador de acero inoxidable 304 de alta durabilidad frente a condensados.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2">
                      <span className="font-black text-indigo-600 uppercase tracking-widest text-[9px] block">Sistemas de Seguridad</span>
                      <p>Equipado con 6 protecciones activas: termistor de temperatura, fusible térmico de sobrecalentamiento, sensor de ionización de llama y disyuntor por sobrepresión de agua.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2">
                      <span className="font-black text-indigo-600 uppercase tracking-widest text-[9px] block">Autodiagnóstico Electrónico</span>
                      <p>La placa integrada reporta códigos numéricos instantáneos en el control remoto para identificar fallas de gas, aire o sensores, agilizando el mantenimiento técnico.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      ) : (
        /* Tab 2: Sizing Calculators */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          
          {/* Settings & Inputs */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Pre-Evaluación de Demandas</h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Configura las características de tu proyecto para estimar la cantidad de calentadores Rinnai 32L necesarios.</p>
              </div>

              {/* Selector buttons */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
                <button
                  onClick={() => setCalcMethod('ashrae')}
                  className={`py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all ${
                    calcMethod === 'ashrae' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Método ASHRAE (Cascada)
                </button>
                <button
                  onClick={() => setCalcMethod('aspe')}
                  className={`py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all ${
                    calcMethod === 'aspe' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/40' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Método ASPE (Mixto)
                </button>
              </div>

              {/* Input Forms */}
              {calcMethod === 'ashrae' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Número de Departamentos / Viviendas</label>
                    <input 
                      type="number" 
                      value={apartments}
                      onChange={(e) => setApartments(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Duchas por departamento (1.5 FU c/u)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      value={showersPerApt}
                      onChange={(e) => setShowersPerApt(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Lavatorios por departamento (0.75 FU c/u)</label>
                    <input 
                      type="number" 
                      step="1"
                      value={washbasinsPerApt}
                      onChange={(e) => setWashbasinsPerApt(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Lavaplatos por departamento (1.5 FU c/u)</label>
                    <input 
                      type="number" 
                      step="1"
                      value={sinksPerApt}
                      onChange={(e) => setSinksPerApt(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Diferencia de temperatura (ΔT en °C)</label>
                    <input 
                      type="number" 
                      value={tempDelta}
                      onChange={(e) => setTempDelta(Math.max(5, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tipo de Edificación / Destino</label>
                    <select
                      value={buildingType}
                      onChange={(e) => setBuildingType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="multifamily">Edificio Residencial Multifamiliares</option>
                      <option value="hotel">Hoteles / Albergues turísticos</option>
                      <option value="hospital">Hospitales / Clínicas de salud</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      Cantidad de {buildingType === 'multifamily' ? 'Departamentos' : buildingType === 'hotel' ? 'Habitaciones' : 'Camas'}
                    </label>
                    <input 
                      type="number" 
                      value={unitsCount}
                      onChange={(e) => setUnitsCount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              * El cálculo utiliza coeficientes estándar de normas técnicas.
            </div>
          </div>

          {/* Results Output & Theory Integration */}
          <div className="lg:col-span-7 bg-[#0f172a] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col justify-between">
            {calcMethod === 'ashrae' ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block font-bold">Resultados del Pre-Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas en Cascada (Método ASHRAE)</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Total Unidades Aparato (FU)</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-white mt-1 block">{ashraeCalculations.totalFU}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Caudal Probable (Hunter)</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-emerald-400 mt-1 block">
                      {ashraeCalculations.qProbLpm} <span className="text-xs font-bold text-slate-500">L/min</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Potencia Térmica Requerida</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-white mt-1 block">
                      {ashraeCalculations.powerKw} <span className="text-xs font-bold text-slate-500">kW</span>
                    </span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center">
                    <span className="block text-[9px] text-indigo-400 uppercase font-black tracking-widest">Calentadores Rinnai 32L</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-indigo-400 mt-1 block">
                      {ashraeCalculations.requiredHeaters} <span className="text-xs font-bold text-slate-500">uds.</span>
                    </span>
                  </div>
                </div>

                {/* Hunter Curve graph integration */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={14} />
                      Curva de Hunter (ASHRAE HVAC)
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Ver Curvas A, B, C, D</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-white aspect-[1.8/1] flex items-center justify-center p-1 group">
                      <img src={imgHunterCurves} alt="Hunter Curve Graph" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => handleOpenFullscreen(imgHunterCurves)}
                        className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1"
                      >
                        <Eye size={12} /> Ampliar Curvas
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed space-y-2">
                      <p>
                        Para edificios residenciales se aplica la <strong>Curva C (Edificios de departamentos)</strong>. 
                      </p>
                      <p>
                        Las unidades de gasto calculadas ({ashraeCalculations.totalFU} FU) se proyectan en la curva para obtener el caudal simultáneo probable (<InlineMath math={`Q_{\\text{prob}} = ${ashraeCalculations.qProbLpm} \\text{ L/min}`} />).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block font-bold">Resultados del Pre-Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas Mixtos (Método ASPE)</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Demanda Hora Punta (V_d)</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-white mt-1 block">
                      {aspeCalculations.peakHourDemand} <span className="text-xs font-bold text-slate-500">Liters</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Tanque de Acumulación (V_s)</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-emerald-400 mt-1 block">
                      {aspeCalculations.storageTankVolume} <span className="text-xs font-bold text-slate-500">L</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Capacidad de Recuperación (R_x)</span>
                    <span className="text-xl md:text-2xl font-mono font-black text-white mt-1 block">
                      {aspeCalculations.recoveryRate} <span className="text-xs font-bold text-slate-500">L/h</span>
                    </span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center">
                    <span className="block text-[9px] text-indigo-400 uppercase font-black tracking-widest">Calentadores Rinnai 32L</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-indigo-400 mt-1 block">
                      {aspeCalculations.requiredHeaters} <span className="text-xs font-bold text-slate-500">uds.</span>
                    </span>
                  </div>
                </div>

                {/* Mixed Systems diagram integration */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Server size={14} />
                      Esquema Hidráulico del Sistema Mixto
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Calentador + Acumulador</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-white aspect-[1.8/1] flex items-center justify-center p-1 group">
                      <img src={imgInstMixed} alt="Mixed system diagram" className="max-h-full object-contain" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => handleOpenFullscreen(imgInstMixed)}
                        className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1"
                      >
                        <Eye size={12} /> Ampliar Esquema
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed space-y-2">
                      <p>
                        La demanda pico se cubre con el volumen almacenado en los termoacumuladores (<InlineMath math={`V_s = ${aspeCalculations.storageTankVolume} \\text{ L}`} />).
                      </p>
                      <p>
                        Los calentadores Rinnai {aspeCalculations.requiredHeaters} uds. operan de forma continua a su máxima potencia para recuperar el calor consumido (<InlineMath math={`R_x = ${aspeCalculations.recoveryRate} \\text{ L/h}`} />).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-850 flex items-start gap-3 text-xs text-slate-400 leading-relaxed shrink-0">
              <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <span>
                <strong>Nota Técnica:</strong> Para realizar un cálculo formal e interactivo detallado con guardado de registros, utiliza el botón <strong>Dimensionamiento de Agua Caliente</strong> en la cabecera.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Overlay */}
      <AnimatePresence>
        {isFullscreen && fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              className="absolute top-6 right-6 text-white/75 hover:text-white font-black text-xs uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md"
              onClick={() => setIsFullscreen(false)}
            >
              Cerrar (ESC)
            </button>
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-[92vw] max-h-[90vh] bg-white rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-4 flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={fullscreenImage} 
                alt="Gráfico en HD" 
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
