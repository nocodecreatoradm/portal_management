import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Target, Users, BarChart3, Clock, CheckCircle2, Shield, Info, 
  Activity, ChevronRight, ArrowLeft, RefreshCw, Zap, Book, ShieldAlert,
  Flame, HelpCircle, FileText, Settings, Hammer, Sliders, Play, Plus, ArrowRight
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Import all slide images statically so Vite registers and bundles them
import slide1 from '../assets/slides/slide1.png';
import slide2 from '../assets/slides/slide2.png';
import slide3 from '../assets/slides/slide3.png';
import slide4 from '../assets/slides/slide4.png';
import slide5 from '../assets/slides/slide5.png';
import slide6 from '../assets/slides/slide6.png';
import slide7 from '../assets/slides/slide7.png';
import slide8 from '../assets/slides/slide8.png';
import slide9 from '../assets/slides/slide9.png';
import slide10 from '../assets/slides/slide10.png';
import slide11 from '../assets/slides/slide11.png';
import slide12 from '../assets/slides/slide12.png';
import slide13 from '../assets/slides/slide13.png';
import slide14 from '../assets/slides/slide14.png';
import slide15 from '../assets/slides/slide15.png';
import slide16 from '../assets/slides/slide16.png';
import slide17 from '../assets/slides/slide17.png';
import slide18 from '../assets/slides/slide18.png';
import slide19 from '../assets/slides/slide19.png';

interface SlideTopic {
  id: string;
  title: string;
  category: 'context' | 'cascade' | 'mixed' | 'hardware';
  icon: React.ReactNode;
}

const slideImages: Record<string, string> = {
  suministro: slide1,
  centralizar: slide2,
  criterios: slide3,
  modulacion: slide4,
  funcion_cascada: slide5,
  conexion_cascada: slide6,
  funcion_mixto: slide7,
  recirculacion: slide8,
  comparativa: slide9,
  hardware_parts: slide10,
  seguridad_32l: slide11,
  comercial_line: slide12,
  specs_32l: slide13,
  instalacion_32l: slide14,
  dimensiones_32l: slide15,
  auto_diagnostico: slide16,
  servovalvula_32l: slide17,
  codigos_error: slide18,
  kits_instalacion: slide19
};

export default function SizingModule({ onModuleChange }: { onModuleChange?: (module: string) => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'methods'>('info');
  const [activeTopic, setActiveTopic] = useState<string>('suministro');
  const [errorSearch, setErrorSearch] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sizing Calculator state
  const [calcMethod, setCalcMethod] = useState<'ashrae' | 'aspe'>('ashrae');
  
  // ASHRAE Inputs
  const [apartments, setApartments] = useState<number>(50);
  const [showersPerApt, setShowersPerApt] = useState<number>(1.5);
  const [washbasinsPerApt, setWashbasinsPerApt] = useState<number>(2);
  const [sinksPerApt, setSinksPerApt] = useState<number>(1);
  const [tempDelta, setTempDelta] = useState<number>(40); // Delta T in Celsius

  // ASPE Inputs
  const [buildingType, setBuildingType] = useState<'hotel' | 'hospital' | 'multifamily'>('multifamily');
  const [unitsCount, setUnitsCount] = useState<number>(80); // apartments, rooms, or beds

  const topics: SlideTopic[] = [
    { id: 'suministro', title: '1. Tres formas de suministro', category: 'context', icon: <Droplets size={16} /> },
    { id: 'centralizar', title: '2. ¿Por qué centralizar?', category: 'context', icon: <Target size={16} /> },
    { id: 'criterios', title: '3. Criterios de sustentación', category: 'context', icon: <Info size={16} /> },
    { id: 'modulacion', title: '4. Modulación y ahorro de gas', category: 'context', icon: <Zap size={16} /> },
    { id: 'funcion_cascada', title: '5. Sistema en cascada: Operación', category: 'cascade', icon: <Activity size={16} /> },
    { id: 'conexion_cascada', title: '6. Conexión y rotación en cascada', category: 'cascade', icon: <RefreshCw size={16} /> },
    { id: 'funcion_mixto', title: '7. Sistema mixto con acumulación', category: 'mixed', icon: <LayersIcon size={16} /> },
    { id: 'recirculacion', title: '8. Sistema de recirculación', category: 'mixed', icon: <RefreshCw size={16} /> },
    { id: 'comparativa', title: '9. Tradicional vs Centralizado Rinnai', category: 'context', icon: <BarChart3 size={16} /> },
    { id: 'hardware_parts', title: '10. Tecnología y partes internas', category: 'hardware', icon: <Hammer size={16} /> },
    { id: 'seguridad_32l', title: '11. Sistemas de seguridad (32L)', category: 'hardware', icon: <Shield size={16} /> },
    { id: 'comercial_line', title: '12. Línea Comercial 32L', category: 'hardware', icon: <FileText size={16} /> },
    { id: 'specs_32l', title: '13. Especificaciones RINGASN32C', category: 'hardware', icon: <FileText size={16} /> },
    { id: 'instalacion_32l', title: '14. Instalación de chimeneas', category: 'hardware', icon: <Settings size={16} /> },
    { id: 'dimensiones_32l', title: '15. Dimensiones y conexiones', category: 'hardware', icon: <Settings size={16} /> },
    { id: 'auto_diagnostico', title: '16. Autodiagnóstico y tarjetas', category: 'hardware', icon: <Activity size={16} /> },
    { id: 'servovalvula_32l', title: '17. Servoválvula de caudal', category: 'hardware', icon: <Activity size={16} /> },
    { id: 'codigos_error', title: '18. Tabla de códigos de error', category: 'hardware', icon: <ShieldAlert size={16} /> },
    { id: 'kits_instalacion', title: '19. Kits de instalación', category: 'hardware', icon: <Hammer size={16} /> }
  ];

  // Helper custom icon
  function LayersIcon({ size }: { size: number }) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }

  // Error codes dataset (Slide 18)
  const errorCodes = [
    { code: '-', desc: 'Reducción notable del flujo de agua', sol: 'Es necesario limpiar el filtro de agua de entrada. Llame al servicio técnico.' },
    { code: '02', desc: '60 minutos de uso continuado', sol: 'Progreso de 60 minutos de uso continuado.' },
    { code: '03', desc: 'Interrupción del suministro eléctrico durante el llenado del baño. El agua no fluirá al restablecerse el suministro eléctrico.', sol: 'Cierre todos los grifos de agua caliente. Presione On/Off dos veces.' },
    { code: '10', desc: 'Entrada de aire o salida de humos bloqueada', sol: 'Servicio técnico.' },
    { code: '11', desc: 'Sin encendido / sin suministro de gas.', sol: 'Compruebe que el gas esté encendido en el calentador de agua y el gas o cilindro.' },
    { code: '12', desc: 'Falla de llama / flujo de gas bajo', sol: 'Verifique que el gas esté encendido en el calentador de agua y en el medidor o cilindro de gas. Compruebe que no haya obstrucciones en la salida de humos.' },
    { code: '14', desc: 'Dispositivo de seguridad de llama restante (termostato/fusible térmico activado)', sol: 'Servicio técnico.' },
    { code: '16', desc: 'Advertencia de temperatura excesiva', sol: 'Servicio técnico.' },
    { code: '19', desc: 'Fallo de verificación de tierra eléctrica', sol: 'Servicio técnico.' },
    { code: '21', desc: 'Se detectó un ajuste incorrecto del interruptor DIP', sol: 'Instalador para verificar la configuración del interruptor DIP switch / llamada de servicio.' },
    { code: '32', desc: 'Fallo del sensor de temperatura del agua de salida', sol: 'Servicio técnico.' },
    { code: '41', desc: 'Fallo del sensor de temperatura ambiente', sol: 'Servicio técnico.' },
    { code: '52', desc: 'Fallo de la válvula moduladora de gas', sol: 'Servicio técnico.' },
    { code: '61', desc: 'Fallo del ventilador de combustión', sol: 'Servicio técnico.' },
    { code: '65', desc: 'Fallo de control de flujo de agua. No detiene el flujo correctamente.', sol: 'Servicio técnico.' },
    { code: '70', desc: 'Falla del microprocesador', sol: 'Servicio técnico.' },
    { code: '71', desc: 'Falla del microprocesador', sol: 'Servicio técnico.' },
    { code: '72', desc: 'Falla del microprocesador', sol: 'Servicio técnico.' }
  ];

  const filteredErrors = useMemo(() => {
    if (!errorSearch) return errorCodes;
    const s = errorSearch.toLowerCase();
    return errorCodes.filter(e => 
      e.code.toLowerCase().includes(s) || 
      e.desc.toLowerCase().includes(s) || 
      e.sol.toLowerCase().includes(s)
    );
  }, [errorSearch]);

  // ASHRAE Calculator calculations
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
    const qProbLpm = qProbGpm * 3.78541; // Convert to L/min
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

  // ASPE Sizing parameters (Mixed Systems)
  const aspeCalculations = useMemo(() => {
    let consPerUnit = 0; // L/h/unit
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

  const activeTopicObj = topics.find(t => t.id === activeTopic);

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
            Herramienta pedagógica y técnica para explicar la modulación, la cascada y proceder a dimensionar el proyecto de agua caliente.
          </p>
        </div>

        {/* Quick Sizing Calculator Entry (Matching card in screenshot) */}
        {onModuleChange && (
          <div 
            onClick={() => onModuleChange('water_demand')}
            className="flex items-center justify-between bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all rounded-3xl p-5 cursor-pointer max-w-sm w-full group relative overflow-hidden"
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

      {/* Tabs */}
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
          Explicación de Sistemas (Diapositivas)
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
          Calculadoras de Apoyo
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 max-h-[82vh] overflow-y-auto custom-scrollbar shadow-inner">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Índice del Manual</h3>
            
            {(['context', 'cascade', 'mixed', 'hardware'] as const).map(cat => {
              const catTitle = cat === 'context' ? 'Contexto' :
                               cat === 'cascade' ? 'Sistemas en Cascada' :
                               cat === 'mixed' ? 'Sistemas Mixtos' : 'Hardware RINGASN32C';
              
              const catTopics = topics.filter(t => t.category === cat);
              if (catTopics.length === 0) return null;

              return (
                <div key={cat} className="space-y-1 mb-4">
                  <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider px-3 mb-1">{catTitle}</span>
                  {catTopics.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveTopic(t.id);
                        setIsFullscreen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                        activeTopic === t.id 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                      }`}
                    >
                      <span className={activeTopic === t.id ? 'text-white' : 'text-slate-400'}>{t.icon}</span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Slide Viewer Screen (Split-Screen / Premium layout) */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[65vh] flex flex-col justify-between relative overflow-hidden">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTopic}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col lg:flex-row gap-8 items-stretch"
              >
                
                {/* Left Side: Slide Image Card */}
                <div className="w-full lg:w-3/5 flex flex-col justify-between space-y-4">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner group flex-1 min-h-[300px] flex items-center justify-center">
                    {slideImages[activeTopic] ? (
                      <img 
                        src={slideImages[activeTopic]} 
                        alt={activeTopicObj?.title} 
                        className="w-full h-full object-contain cursor-zoom-in"
                        onClick={() => setIsFullscreen(true)}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                        <Info size={32} className="mb-2" />
                        <span className="text-xs font-bold uppercase">Sin imagen de diapositiva</span>
                      </div>
                    )}
                    <button 
                      onClick={() => setIsFullscreen(true)}
                      className="absolute bottom-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Expandir Diapositiva
                    </button>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    👉 Haz clic en la imagen para verla en pantalla completa de alta definición.
                  </div>
                </div>

                {/* Right Side: Structured Technical Explanation Notes for Technicians */}
                <div className="w-full lg:w-2/5 flex flex-col justify-between border-l border-slate-100 lg:pl-8 space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Diapositiva {topics.findIndex(t => t.id === activeTopic) + 1} de {topics.length}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1 mb-4 uppercase">
                      {activeTopicObj?.title.substring(activeTopicObj.title.indexOf(' ') + 1)}
                    </h3>

                    {/* Explanation details matching current slide */}
                    <div className="text-xs text-slate-600 leading-relaxed font-medium space-y-4">
                      
                      {activeTopic === 'suministro' && (
                        <>
                          <p>
                            El suministro de agua caliente en proyectos se resuelve mediante tres arquitecturas fundamentales. Cada una responde a diferentes necesidades de costo, infraestructura y confort:
                          </p>
                          <ul className="space-y-3 pt-2">
                            <li className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl">
                              <strong className="text-slate-800 block text-xs mb-0.5">1. Individual</strong>
                              Un calentador de paso por departamento. Simple en planos, pero exige múltiples salidas de gases al exterior, multiplicando los ductos y puntos de falla.
                            </li>
                            <li className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl">
                              <strong className="text-indigo-950 block text-xs mb-0.5">2. Cascada Modular</strong>
                              Varios calentadores modulantes conectados en paralelo. Se activan secuencialmente según el caudal real de grifería que fluye. Alta eficiencia.
                            </li>
                            <li className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                              <strong className="text-emerald-950 block text-xs mb-0.5">3. Mixto con Acumulación</strong>
                              Calentadores de paso + tanques termoacumuladores. Absorbe picos extremos de consumo en hoteles y hospitales con la máxima inercia térmica.
                            </li>
                          </ul>
                        </>
                      )}

                      {activeTopic === 'centralizar' && (
                        <>
                          <p>
                            En proyectos modernos de edificación, las instalaciones individuales presentan limitaciones críticas de espacio, ductos de gases y seguridad.
                          </p>
                          <div className="space-y-3 pt-2">
                            <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl">
                              <strong className="text-red-900 block text-xs mb-1">Dolores Inmobiliarios:</strong>
                              Dificultad de ventilación en ductos técnicos, peligro de monóxido de carbono, mantenimiento disperso y variaciones molestas de temperatura para el usuario final.
                            </div>
                            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                              <strong className="text-emerald-900 block text-xs mb-1">La Oportunidad Centralizada:</strong>
                              Optimización del espacio de ducterías, centralización de mantenimiento en un único punto (azotea o sótano) y provisión de agua caliente estable a presión constante.
                            </div>
                          </div>
                        </>
                      )}

                      {activeTopic === 'criterios' && (
                        <>
                          <p>
                            El dimensionamiento de una central de agua caliente debe justificarse técnicamente mediante metodologías de ingeniería hidráulica:
                          </p>
                          <ul className="space-y-2.5 pt-2 list-disc list-inside">
                            <li><strong>Demanda Probable:</strong> Se utiliza el método de las Curvas de Hunter para calcular el caudal simultáneo máximo esperado, evitando sobredimensionar.</li>
                            <li><strong>Modulación Inteligente:</strong> Permite que la central module su quemador adaptándose al consumo real, logrando hasta un 30% de ahorro de combustible.</li>
                            <li><strong>Redundancia:</strong> Diseñar con equipos modulares permite aislar una unidad para mantenimiento sin suspender el servicio del edificio.</li>
                          </ul>
                        </>
                      )}

                      {activeTopic === 'modulacion' && (
                        <>
                          <p>
                            La modulación de gas es la clave tecnológica para lograr eficiencia energética. Ajusta la inyección de gas y aire en el quemador conforme varía el flujo de agua caliente.
                          </p>
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                            <span className="font-bold text-slate-800 block">Diferencias clave:</span>
                            <div className="text-[11px] text-slate-500 leading-normal">
                              - <strong>Calderas:</strong> Encienden y apagan en ciclos completos a máxima potencia, generando pérdidas térmicas masivas.
                              <br />- <strong>Rinnai Modulante:</strong> El fuego se adapta milimétricamente al caudal instantáneo.
                            </div>
                          </div>
                        </>
                      )}

                      {activeTopic === 'funcion_cascada' && (
                        <>
                          <p>
                            La operación en cascada Rinnai administra los calentadores de forma coordinada e inteligente para responder a demandas variables:
                          </p>
                          <div className="space-y-2.5 pt-2">
                            <div className="flex gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Activa secuencialmente las unidades conforme fluye más caudal de agua caliente en el colector.</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Distribuye el arranque para balancear el desgaste físico de los intercambiadores de cobre.</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-emerald-500 font-bold">✓</span>
                              <span>Proporciona redundancia activa: ante fallas de un equipo, los demás asumen la carga hidráulica.</span>
                            </div>
                          </div>
                        </>
                      )}

                      {activeTopic === 'conexion_cascada' && (
                        <>
                          <p>
                            Para habilitar la cascada inteligente, los calentadores se interconectan mediante cables de cascada específicos que comunican las tarjetas lógicas de control:
                          </p>
                          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 font-mono text-[11px] text-slate-500">
                            <span className="font-bold text-slate-800 block text-xs">Especificaciones de conexión:</span>
                            - Interconexión de hasta 25 equipos.
                            <br />- Tarjetas de control dedicadas.
                            <br />- Rotación por ciclos de combustión.
                            <br />- Configuración de unidades de respaldo (standby).
                          </div>
                        </>
                      )}

                      {activeTopic === 'funcion_mixto' && (
                        <>
                          <p>
                            En aplicaciones como hoteles o gimnasios donde el consumo punta ocurre en lapsos muy cortos y de forma masiva, la acumulación térmica es indispensable:
                          </p>
                          <ul className="space-y-2.5 pt-2 list-disc list-inside">
                            <li>El agua caliente se almacena en tanques termo-aislados (acumuladores).</li>
                            <li>Los calentadores Rinnai operan a régimen constante de alta eficiencia para reponer el volumen consumido en el tanque.</li>
                            <li>Se reduce la potencia instantánea de gas requerida en el edificio.</li>
                          </ul>
                        </>
                      )}

                      {activeTopic === 'recirculacion' && (
                        <>
                          <p>
                            La red de recirculación asegura que el usuario tenga agua caliente inmediata al abrir la grifería, evitando desperdicios de agua fría estancada en tuberías largas:
                          </p>
                          <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-1.5">
                            <span className="font-bold text-indigo-950 block text-xs">Parámetros de Control:</span>
                            <div className="text-[11px] text-indigo-900 leading-normal">
                              - <strong>Temp. Salida:</strong> 55°C - 60°C.
                              <br />- <strong>Temp. Retorno:</strong> 45°C - 50°C.
                              <br />- <strong>Control:</strong> Bomba comandada por termostato para evitar ciclos de encendido continuos e innecesarios.
                            </div>
                          </div>
                        </>
                      )}

                      {activeTopic === 'codigos_error' ? (
                        <p>
                          Utiliza el campo de búsqueda a la izquierda para filtrar la tabla de códigos de error reportados por la tarjeta electrónica. Esto agiliza el diagnóstico en campo de los técnicos.
                        </p>
                      ) : (
                        <p>
                          Consulte la diapositiva técnica en el visor para identificar esquemas de conexión, diámetros de chimenea, detalles del kit residencial de gas y características del intercambiador de cobre del calentador <strong>RINGASN32C</strong>.
                        </p>
                      )}

                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div className="border-t border-slate-100 pt-6 flex justify-between gap-4 shrink-0">
                    <button
                      disabled={topics.findIndex(t => t.id === activeTopic) === 0}
                      onClick={() => {
                        const idx = topics.findIndex(t => t.id === activeTopic);
                        if (idx > 0) setActiveTopic(topics[idx - 1].id);
                      }}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Anterior
                    </button>
                    <button
                      disabled={topics.findIndex(t => t.id === activeTopic) === topics.length - 1}
                      onClick={() => {
                        const idx = topics.findIndex(t => t.id === activeTopic);
                        if (idx < topics.length - 1) setActiveTopic(topics[idx + 1].id);
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-wide transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Siguiente Diapositiva
                    </button>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

            {/* Special display for error codes below if it's the active topic */}
            {activeTopic === 'codigos_error' && (
              <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Tabla de códigos de error de autodiagnóstico</h4>
                  <input 
                    type="text" 
                    placeholder="Filtrar por código o descripción..." 
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold w-full sm:w-60"
                  />
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-700 uppercase sticky top-0">
                        <th className="px-4 py-2 w-16">Cód.</th>
                        <th className="px-4 py-2">Falla Reportada</th>
                        <th className="px-4 py-2">Solución</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold bg-white">
                      {filteredErrors.map((err, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono font-black text-slate-900">{err.code}</td>
                          <td className="px-4 py-2">{err.desc}</td>
                          <td className="px-4 py-2 text-indigo-600 font-medium">{err.sol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* Calculators Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Method Selection & Inputs */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Configuración del Proyecto</h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Selecciona el método e ingresa los datos para realizar una pre-evaluación del proyecto.</p>
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

          {/* Results Output Page */}
          <div className="lg:col-span-7 bg-[#0f172a] text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col justify-between">
            {calcMethod === 'ashrae' ? (
              <div className="space-y-8">
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">Resultados del Pre-Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas en Cascada (Método ASHRAE)</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Total Unidades Aparato (FU)</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-white mt-1 block">{ashraeCalculations.totalFU}</span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Caudal Probable (Hunter)</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-emerald-400 mt-1 block">
                      {ashraeCalculations.qProbLpm} <span className="text-xs font-bold text-slate-500">L/min</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Potencia Térmica Requerida</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-white mt-1 block">
                      {ashraeCalculations.powerKw} <span className="text-xs font-bold text-slate-500">kW</span>
                    </span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center">
                    <span className="block text-[9px] text-indigo-400 uppercase font-black tracking-widest">Calentadores Rinnai 32L</span>
                    <span className="text-3xl font-mono font-black text-indigo-400 mt-1 block">
                      {ashraeCalculations.requiredHeaters} <span className="text-xs font-bold text-slate-500">uds.</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={14} />
                    Fórmulas de Apoyo Utilizadas
                  </h4>
                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <p>Caudal probable aproximado de la curva de Hunter:</p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`Q_{\\text{gpm}} = 1.05 \\times (\\text{FU})^{0.55}`} />
                    </div>
                    <p>Potencia térmica de calefacción requerida:</p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`P_{\\text{kW}} = Q_{\\text{L/min}} \\times \\rho \\times C_p \\times \\Delta T`} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">Resultados del Pre-Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas Mixtos (Método ASPE)</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Demanda Hora Punta (V_d)</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-white mt-1 block">
                      {aspeCalculations.peakHourDemand} <span className="text-xs font-bold text-slate-500">Liters</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Tanque de Acumulación (V_s)</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-emerald-400 mt-1 block">
                      {aspeCalculations.storageTankVolume} <span className="text-xs font-bold text-slate-500">L</span>
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase font-black tracking-widest">Capacidad de Recuperación (R_x)</span>
                    <span className="text-2xl md:text-3xl font-mono font-black text-white mt-1 block">
                      {aspeCalculations.recoveryRate} <span className="text-xs font-bold text-slate-500">L/h</span>
                    </span>
                  </div>
                  <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 text-center flex flex-col justify-center">
                    <span className="block text-[9px] text-indigo-400 uppercase font-black tracking-widest">Calentadores Rinnai 32L</span>
                    <span className="text-3xl font-mono font-black text-indigo-400 mt-1 block">
                      {aspeCalculations.requiredHeaters} <span className="text-xs font-bold text-slate-500">uds.</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={14} />
                    Ecuación de Conservación Térmica
                  </h4>
                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <p>Relación de balance en hora punta:</p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`V_s + (R_x \\times 1 \\text{ h}) = V_d`} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
              <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <span>
                <strong>Nota Técnica:</strong> Para realizar un cálculo formal e interactivo detallado con guardado de registros, utiliza el botón <strong>Dimensionamiento de Agua Caliente</strong> en la cabecera.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Slide Modal Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              className="absolute top-6 right-6 text-white/75 hover:text-white font-black text-sm uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md"
              onClick={() => setIsFullscreen(false)}
            >
              Cerrar (ESC)
            </button>
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="max-w-[92vw] max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={slideImages[activeTopic]} 
                alt={activeTopicObj?.title} 
                className="max-w-full max-h-[85vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
