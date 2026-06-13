import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Target, Users, BarChart3, Clock, CheckCircle2, Shield, Info, 
  Activity, ChevronRight, ArrowLeft, RefreshCw, Zap, Book, ShieldAlert,
  Flame, HelpCircle, FileText, Settings, Hammer, Sliders
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface SlideTopic {
  id: string;
  title: string;
  category: 'context' | 'cascade' | 'mixed' | 'hardware';
  icon: React.ReactNode;
}

export default function SizingModule() {
  const [activeTab, setActiveTab] = useState<'info' | 'methods'>('info');
  const [activeTopic, setActiveTopic] = useState<string>('suministro');
  const [errorSearch, setErrorSearch] = useState<string>('');

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
    { id: 'suministro', title: 'Tres formas de suministro', category: 'context', icon: <Droplets size={16} /> },
    { id: 'centralizar', title: '¿Por qué centralizar?', category: 'context', icon: <Target size={16} /> },
    { id: 'criterios', title: 'Criterios de sustentación', category: 'context', icon: <Info size={16} /> },
    { id: 'modulacion', title: 'Modulación y ahorro de gas', category: 'context', icon: <Zap size={16} /> },
    { id: 'funcion_cascada', title: 'Sistema en cascada: Operación', category: 'cascade', icon: <Activity size={16} /> },
    { id: 'conexion_cascada', title: 'Conexión y rotación en cascada', category: 'cascade', icon: <RefreshCw size={16} /> },
    { id: 'funcion_mixto', title: 'Sistema mixto con acumulación', category: 'mixed', icon: <LayersIcon size={16} /> },
    { id: 'recirculacion', title: 'Sistema de recirculación', category: 'mixed', icon: <RefreshCw size={16} /> },
    { id: 'comparativa', title: 'Tradicional vs Centralizado Rinnai', category: 'context', icon: <BarChart3 size={16} /> },
    { id: 'hardware_parts', title: 'Tecnología y partes internas', category: 'hardware', icon: <Hammer size={16} /> },
    { id: 'seguridad_32l', title: 'Sistemas de seguridad (32L)', category: 'hardware', icon: <Shield size={16} /> },
    { id: 'specs_32l', title: 'Especificaciones RINGASN32C', category: 'hardware', icon: <FileText size={16} /> },
    { id: 'instalacion_32l', title: 'Instalación y dimensiones', category: 'hardware', icon: <Settings size={16} /> },
    { id: 'auto_diagnostico', title: 'Autodiagnóstico y servoválvula', category: 'hardware', icon: <Activity size={16} /> },
    { id: 'codigos_error', title: 'Tabla de códigos de error', category: 'hardware', icon: <ShieldAlert size={16} /> },
    { id: 'kits_instalacion', title: 'Kits de instalación', category: 'hardware', icon: <Hammer size={16} /> }
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
    // Fixture units values from standard ASHRAE Table
    // Private (residential) values
    const fuShowers = 1.5;
    const fuWashbasins = 0.75;
    const fuSinks = 1.5;

    const totalAptFu = (showersPerApt * fuShowers) + (washbasinsPerApt * fuWashbasins) + (sinksPerApt * fuSinks);
    const totalFU = Math.round(apartments * totalAptFu * 100) / 100;

    // Approximate probable demand using a curve approximation for Hunter's Curve (residential)
    // Formula approximation for residential curve:
    // Q_prob = 1.05 * FU^0.55 (valid for range FU > 10)
    let qProbGpm = 0;
    if (totalFU > 0) {
      qProbGpm = 1.05 * Math.pow(totalFU, 0.55);
    }
    const qProbLpm = qProbGpm * 3.78541; // Convert to L/min

    // Heat calculation
    // Power (kW) = Flow (L/min) * 60 * (Delta T) * Density (1 kg/L) * Cp (4.186 kJ/kg.C) / 3600
    // Simplified: Power (kW) = Flow (L/min) * Delta T * 0.0697
    const powerKw = qProbLpm * tempDelta * 0.06978;

    // Rinnai 32L heater capacity
    // RINGASN32C capacity: 32 L/min at Delta T = 25C. 
    // Power of one unit: 32 * 25 * 0.06978 = ~56 kW (nominal input is 58.3 kW)
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
    // Hot water consumption parameters (liters/hour at 60C)
    // and storage factors based on ASPE / ASHRAE standards
    let consPerUnit = 0; // L/h/unit
    let storageFactor = 0; // ratio of storage tank size to total volume
    let recoveryFactor = 0; // ratio of recovery heater capacity to total volume
    let label = '';

    switch (buildingType) {
      case 'hotel':
        consPerUnit = 75; // 75 Liters per room per hour
        storageFactor = 0.8; 
        recoveryFactor = 0.25;
        label = 'Habitaciones';
        break;
      case 'hospital':
        consPerUnit = 110; // 110 Liters per bed per hour
        storageFactor = 0.6;
        recoveryFactor = 0.4;
        label = 'Camas';
        break;
      case 'multifamily':
      default:
        consPerUnit = 90; // 90 Liters per apartment per hour (assuming 2-3 bedrooms)
        storageFactor = 1.2;
        recoveryFactor = 0.3;
        label = 'Departamentos';
        break;
    }

    const peakHourDemand = unitsCount * consPerUnit; // Total demand during peak hour (Liters)
    const storageTankVolume = peakHourDemand * storageFactor; // Recommended storage volume (Liters)
    const recoveryRate = peakHourDemand * recoveryFactor; // Required recovery capacity (L/h)

    // Recommended heaters needed for recovery
    // Rinnai 32L heater heats 32 L/min at 25C. 
    // At typical Delta T (e.g. 40C), recovery is 32 * (25/40) = 20 L/min = 1200 L/h per heater.
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/50 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Droplets className="text-indigo-600" size={32} />
            MÓDULO DE DIMENSIONAMIENTO Y SISTEMAS CENTRALIZADOS
          </h2>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Diseño, teoría técnica, autodiagnóstico y calculadoras de dimensionamiento de sistemas de agua caliente Rinnai.
          </p>
        </div>
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
          Explicación y Manual Técnico de Sistemas
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
          Métodos de Dimensionamiento (Calculadoras)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sizing Sidebar navigation */}
          <div className="lg:col-span-1 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 max-h-[80vh] overflow-y-auto custom-scrollbar shadow-inner">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Temario Técnico</h3>
            
            {(['context', 'cascade', 'mixed', 'hardware'] as const).map(cat => {
              const catTitle = cat === 'context' ? 'Contexto de Centralización' :
                               cat === 'cascade' ? 'Sistemas en Cascada' :
                               cat === 'mixed' ? 'Sistemas Mixtos y Recirculación' : 'Tecnología Calentador 32L';
              
              const catTopics = topics.filter(t => t.category === cat);
              if (catTopics.length === 0) return null;

              return (
                <div key={cat} className="space-y-1 mb-4">
                  <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider px-3 mb-1">{catTitle}</span>
                  {catTopics.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTopic(t.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
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

          {/* Slide Viewer Frame */}
          <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm min-h-[60vh] flex flex-col relative overflow-hidden">
            
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -z-10 -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-40 -z-10 -ml-20 -mb-20" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTopic}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-between"
              >
                
                {/* Topic: Suministro */}
                {activeTopic === 'suministro' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 1 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Tres formas de resolver el suministro de agua caliente</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Individual */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                        <div>
                          <span className="inline-block px-3 py-1 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-full mb-4">Individual</span>
                          <h4 className="text-base font-black text-slate-800 mb-2">Un calentador por unidad</h4>
                          <p className="text-slate-500 text-xs leading-relaxed">
                            Solución sencilla en diseño, pero multiplica los ductos de evacuación de gases, incrementa los puntos de falla potenciales y dispersa los costos de mantenimiento a lo largo de todo el edificio.
                          </p>
                        </div>
                        <div className="mt-6 border-t border-slate-200/60 pt-4 text-xs font-bold text-slate-400">
                          Uso típico: Departamentos pequeños independientes.
                        </div>
                      </div>

                      {/* Cascada */}
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                        <div>
                          <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-full mb-4">Cascada de Paso Continuo</span>
                          <h4 className="text-base font-black text-slate-800 mb-2">Operación Secuencial Modulante</h4>
                          <p className="text-slate-500 text-xs leading-relaxed font-medium">
                            Varios calentadores de paso continuo trabajan de forma secuencial y coordinada según la demanda de caudal instantáneo. Alta eficiencia energética para proyectos con consumo sumamente variable.
                          </p>
                        </div>
                        <div className="mt-6 border-t border-indigo-100 pt-4 text-xs font-black text-indigo-600 uppercase tracking-widest">
                          Apto para: Edificios, Condominios, Viviendas de alta densidad.
                        </div>
                      </div>

                      {/* Mixto */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                        <div>
                          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full mb-4">Mixto con Acumulación</span>
                          <h4 className="text-base font-black text-slate-800 mb-2">Calentadores + Tanque de Acumulación</h4>
                          <p className="text-slate-500 text-xs leading-relaxed">
                            Combina calentadores modulantes con tanques acumuladores termo-aislados. Responde con la máxima estabilidad hidráulica ante picos de demanda masivos concentrados en periodos muy breves de tiempo.
                          </p>
                        </div>
                        <div className="mt-6 border-t border-emerald-100 pt-4 text-xs font-black text-emerald-600 uppercase tracking-widest">
                          Apto para: Hoteles, Hospitales, Gimnasios, Proyectos Horeca.
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-2xl p-5 mt-6 flex items-center gap-4 border border-slate-800">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Info size={24} />
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-slate-300">
                        <strong className="text-white block font-bold text-sm uppercase tracking-wide mb-0.5">Sistemas Rinnai Centralizados</strong>
                        La tecnología de cascada Rinnai optimiza el espacio y el consumo de combustible, activando proporcionalmente los calentadores conforme fluye la demanda, en lugar de prender calderas masivas de acumulación.
                      </p>
                    </div>
                  </div>
                )}

                {/* Topic: Centralizar */}
                {activeTopic === 'centralizar' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 2 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">¿Por qué hablar de sistemas centralizados?</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Dolores del Proyecto */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Dolores frecuentes en proyectos
                        </h4>
                        
                        <div className="space-y-3">
                          {[
                            'Mayor densidad de departamentos y consumo simultáneo concentrado en horas punta.',
                            'Espacios de instalación de ducterías limitados o confinados, con peligro de acumulación de CO por falta de oxígeno.',
                            'Usuarios exigentes que esperan agua caliente inmediata, estable y con presión uniforme en las griferías.',
                            'Puntos críticos de mantenimiento dispersos que incrementan riesgos operativos y costos de repuestos.',
                            'Presión gubernamental e inmobiliaria por optimizar la eficiencia energética del edificio completo.'
                          ].map((dolor, i) => (
                            <div key={i} className="flex gap-3 bg-red-50/20 border border-red-100/30 p-3.5 rounded-xl">
                              <span className="text-xs font-black text-red-500">{i+1}.</span>
                              <p className="text-slate-600 text-xs font-semibold leading-relaxed">{dolor}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Oportunidad Comercial */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Oportunidad comercial de valor
                        </h4>

                        <div className="space-y-3">
                          {[
                            'Migrar de la venta de calentadores unitarios a una solución de ingeniería integral del edificio o proyecto completo.',
                            'Incorporar diseño de ingeniería, control automático, recirculación de agua y soporte técnico especializado.',
                            'Posicionar y diferenciar la marca Rinnai en proyectos inmobiliarios multifamiliares y del sector Horeca.',
                            'Incrementar significativamente el ticket de venta, fidelización del cliente y asegurar especificaciones en planos.'
                          ].map((op, i) => (
                            <div key={i} className="flex gap-3 bg-emerald-50/20 border border-emerald-100/30 p-3.5 rounded-xl">
                              <span className="text-xs font-black text-emerald-500">✓</span>
                              <p className="text-slate-600 text-xs font-semibold leading-relaxed">{op}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-600 text-white rounded-2xl p-6 mt-6 border border-indigo-700 shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                          <Target size={24} />
                        </div>
                        <div>
                          <span className="block text-[10px] font-black uppercase tracking-widest opacity-80">Idea Clave de Ingeniería</span>
                          <p className="text-base font-black mt-0.5 leading-snug">
                            "Centralizar no es usar más equipos, es dimensionar mejor la solución de suministro del edificio o proyecto."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Criterios */}
                {activeTopic === 'criterios' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 3 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Criterios para sustentar la centralización</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Para sustentar técnicamente una central de agua caliente, no basta con comparar el precio bruto de los equipos. Es necesario analizar a profundidad las variables de caudal probable, potencia, modulación y eficiencia:
                        </p>

                        <div className="space-y-3">
                          {[
                            'Comparar las tres arquitecturas de diseño (individual, cascada, y mixta con acumulación) según el tipo de cliente.',
                            'Convertir la demanda teórica del proyecto en caudal probable, potencia térmica de recuperación y cantidad real de equipos.',
                            'Sustentar técnica y comercialmente la propuesta ante inmobiliarias, instaladores y gerencias de operaciones.',
                            'Evaluar el costo/beneficio a largo plazo en mantenimiento, control centralizado y vida útil del intercambiador de calor.',
                            'Caso de referencia representativo: Reemplazar 96 calentadores individuales de 10 L/min por una central en cascada Rinnai de 11 equipos de 32 L, logrando un ahorro masivo de espacio y ductería.'
                          ].map((crit, i) => (
                            <div key={i} className="flex gap-3 bg-slate-50 border border-slate-200/50 p-3.5 rounded-xl shadow-inner">
                              <span className="w-5 h-5 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                              <p className="text-slate-600 text-xs font-semibold leading-relaxed">{crit}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hunter Curves & Modulation Details */}
                      <div className="space-y-6">
                        <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            1. Demanda Probable (Curvas Hunter)
                          </h4>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            Las <strong>CURVAS HUNTER</strong> permiten estimar de forma probabilística el caudal simultáneo máximo a partir de las "unidades de aparato sanitario" del edificio, evitando sobre-dimensionar los sistemas por simultaneidad total (lo que resulta en centrales gigantescas e ineficientes).
                          </p>
                          <div className="border-t border-slate-800 pt-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Método Recomendado</span>
                            <span className="text-xs font-semibold text-slate-300 block">Curvas Hunter revisadas - ASHRAE HVAC</span>
                          </div>
                        </div>

                        <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            2. Modulación según demanda real
                          </h4>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            A través del control MSB de Rinnai, el sistema activa de forma modular <strong>únicamente los calentadores estrictamente necesarios</strong> para la demanda instantánea de agua. Esto cubre perfectamente los picos de consumo matutinos y apaga quemadores en las horas valle.
                          </p>
                          <div className="border-t border-slate-800 pt-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Beneficio</span>
                            <span className="text-xs font-semibold text-emerald-400 block">Reducción del uso de gas en horas de bajo consumo</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-900 text-indigo-100 rounded-2xl p-5 border border-indigo-800 mt-4">
                      <p className="text-xs font-bold text-center uppercase tracking-widest leading-relaxed">
                        💡 Idea Clave: "La centralización se dimensiona por demanda probable (Hunter) y se optimiza mediante modulación, no por simultaneidad total."
                      </p>
                    </div>
                  </div>
                )}

                {/* Topic: Modulacion */}
                {activeTopic === 'modulacion' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 4 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">¿Cómo funciona la modulación?</h3>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      La modulación adaptativa ajusta continuamente la inyección de gas y aire en el quemador para adecuar la entrega de calor al caudal real de agua que pasa por el calentador en cada instante:
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 items-center">
                      {/* Graphics Simulation */}
                      <div className="lg:col-span-8 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comparación de consumo de gas a lo largo del día (24h)</span>
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-red-500 font-bold">
                              <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> Caldera (Tradicional)
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Rinnai Modulante
                            </span>
                          </div>
                        </div>

                        {/* Interactive Graph mock */}
                        <div className="h-44 border-l border-b border-slate-800 relative flex items-end pt-4 pb-2">
                          {/* Y-axis label */}
                          <div className="absolute left-1 top-2 text-[8px] text-slate-500 font-black uppercase origin-left rotate-90 translate-y-6">
                            Consumo de Gas
                          </div>
                          
                          {/* Boiler Line (high, flat line with cycles) */}
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Boiler consumption (constant flat red area) */}
                            <path d="M 0 45 L 10 45 L 20 42 L 30 46 L 40 43 L 50 44 L 60 41 L 70 45 L 80 43 L 90 42 L 100 45" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            {/* Rinnai consumption (curved green line matching demand) */}
                            <path d="M 0 95 L 10 90 L 20 85 L 25 20 L 30 15 L 35 30 L 40 70 L 50 90 L 55 92 L 60 85 L 70 40 L 75 35 L 80 45 L 90 85 L 100 95" fill="none" stroke="#10b981" strokeWidth="3" />
                          </svg>

                          {/* X-axis indicators */}
                          <div className="absolute bottom-[-18px] left-0 w-full flex justify-between text-[8px] font-bold text-slate-500 px-2">
                            <span>01:00</span>
                            <span>06:00 (Pico)</span>
                            <span>12:00</span>
                            <span>18:00 (Pico)</span>
                            <span>24:00</span>
                          </div>

                          {/* Savings indicator shaded area */}
                          <div className="absolute left-[38%] top-[50%] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 text-[9px] font-black uppercase tracking-wider text-center">
                            Ahorro de gas en horas valle
                          </div>
                        </div>
                      </div>

                      {/* Explanation card */}
                      <div className="lg:col-span-4 space-y-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-emerald-400 space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={16} />
                            Beneficio Clave
                          </h4>
                          <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                            La modulación continua permite ajustar dinámicamente el consumo de gas a la demanda real instantánea, eliminando por completo las pérdidas térmicas por mantenimiento de temperatura en calderas o tanques durante los periodos de baja demanda.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Funcion Cascada */}
                {activeTopic === 'funcion_cascada' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 5 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Sistema en cascada: Lógica de operación</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Lógica de operación y control</h4>
                        <ul className="space-y-3">
                          {[
                            'El sistema activa SOLAMENTE los calentadores estrictamente necesarios según el caudal y la demanda real instantánea de griferías.',
                            'Los equipos trabajan de forma coordinada y secuencial para evitar encendidos o consumos innecesarios de gas en horas valle.',
                            'Si una unidad requiere mantenimiento preventivo o correctivo, se puede aislar físicamente; el resto del sistema continuará operando normalmente.',
                            'El control centralizado MSB permite administrar la temperatura y el monitoreo de alarmas del sistema completo desde un solo control digital.'
                          ].map((point, i) => (
                            <li key={i} className="flex gap-2.5 items-start">
                              <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                              <p className="text-slate-600 text-xs font-semibold leading-relaxed">{point}</p>
                            </li>
                          ))}
                        </ul>

                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 mt-6">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">¿Cuándo conviene diseñar en Cascada?</h5>
                          <p className="text-slate-500 text-xs leading-relaxed">
                            Proyectos comerciales y residenciales con <strong>consumo continuo distribuido</strong> a lo largo del día: edificios multifamiliares, vestuarios de industrias, gimnasios corporativos y centros comerciales.
                          </p>
                        </div>
                      </div>

                      {/* 5 key cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">1. Operación Continua</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Respaldo mutuo: si una unidad se apaga, las demás asumen el caudal sin interrupciones.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">2. Eficiencia Energética</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Activación secuencial modulante según caudal real de agua.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">3. Sistema Escalable</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Permite interconectar múltiples equipos Rinnai fácilmente.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">4. Ahorro de Espacio</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Equipos compactos de montaje mural, liberando área útil de azotea o sótano.</span>
                        </div>
                        <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-sm sm:col-span-2 flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                            <Settings size={18} />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-white">5. Control Inteligente</span>
                            <span className="text-[10px] text-slate-400 leading-normal block">Gestión y monitoreo de todo el sistema integrado desde un control maestro.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Conexion Cascada */}
                {activeTopic === 'conexion_cascada' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 6 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Conexión, cableado y lógica de rotación</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      {/* Left Side: objectives & details */}
                      <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Target size={16} className="text-indigo-600" />
                            Objetivos de la conexión en cascada
                          </h4>
                          
                          <div className="space-y-2">
                            <div className="flex gap-2 text-xs font-semibold text-slate-600">
                              <span className="text-emerald-500">✓</span>
                              <span>Permite interconectar <strong>hasta 25 calentadores</strong> Rinnai trabajando como una sola central.</span>
                            </div>
                            <div className="flex gap-2 text-xs font-semibold text-slate-600">
                              <span className="text-emerald-500">✓</span>
                              <span>Lógica de control que <strong>rota la operación</strong> entre los equipos para balancear las horas de uso y desgaste de los componentes.</span>
                            </div>
                            <div className="flex gap-2 text-xs font-semibold text-slate-600">
                              <span className="text-emerald-500">✓</span>
                              <span>Todos los equipos del sistema modulan proporcionalmente su llama según el caudal requerido.</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Sliders size={16} className="text-indigo-600" />
                            Accesorios de Cableado
                          </h4>
                          <p className="text-slate-500 text-xs leading-relaxed font-medium">
                            Se requiere un cable de cascada específico por cada calentador de agua.
                          </p>
                          <ul className="text-xs text-slate-500 font-semibold space-y-1 mt-2 list-disc list-inside">
                            <li>Longitudes disponibles: 3 m (10 ft) y 8 m (26 ft).</li>
                            <li>Incluye 1 cable de comunicación y 2 puentes de cascada (Jumpers).</li>
                          </ul>
                        </div>
                      </div>

                      {/* Right Side: Rotation Logic */}
                      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 space-y-6 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Lógica de equipos en espera y rotación</h4>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            Es posible configurar hasta 3 unidades en espera (standby). Conforme aumenta la demanda de caudal, las unidades adicionales abren sus servoválvulas internas de agua y entran en funcionamiento secuencial.
                          </p>
                          
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ciclo de Rotación Automática</span>
                            <p className="text-xs text-slate-300 font-mono">
                              Rotación: 1,2,3 → 2,3,4 → 3,4,5 → 4,5,1 → 5,1,2 → 1,2,3
                            </p>
                            <span className="text-[9px] text-slate-500 leading-normal block">
                              La rotación se ejecuta en cada ciclo de combustión para dividir la carga de manera uniforme entre todos los equipos.
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-800 pt-4 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                          💡 La cascada permite una operación equilibrada y controlada.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Funcion Mixto */}
                {activeTopic === 'funcion_mixto' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 7 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Sistemas mixtos con acumulación</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Lógica de operación del sistema mixto</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Combina calentadores de paso continuo modulantes Rinnai con tanques de almacenamiento termo-aislados. Los tanques de acumulación actúan como colchón térmico para absorber picos repentinos de consumo masivo, asegurando estabilidad de temperatura sin caídas de presión en la red de distribución.
                        </p>

                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 mt-4">
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">¿Cuándo conviene diseñar sistemas mixtos?</h5>
                          <ul className="text-xs text-slate-500 font-semibold space-y-1 list-disc list-inside">
                            <li>Proyectos del sector Horeca: Hoteles, hospitales, grandes resorts y clubes deportivos.</li>
                            <li>Demandas extremadamente concentradas en horarios específicos del día (horas punta masivas).</li>
                            <li>Necesidad de respuesta hidráulica inmediata con alta inercia térmica disponible en red.</li>
                          </ul>
                        </div>
                      </div>

                      {/* 5 key cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">1. Respuesta Inmediata</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">El agua acumulada cubre consumos simultáneos instantáneos sin variaciones térmicas.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">2. Estabilidad Hidráulica</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Mantiene presión y temperatura estables incluso ante grandes demandas.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">3. Optimización de Calentadores</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Los calentadores operan a máxima eficiencia cargando el tanque según consumo requerido.</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                          <span className="block text-xs font-black text-slate-900 mb-1">4. Mayor Confort</span>
                          <span className="text-[10px] text-slate-500 leading-normal block">Suministro estable e ininterrumpido en todos los puntos de uso.</span>
                        </div>
                        <div className="bg-slate-950 text-white rounded-2xl p-4 shadow-sm sm:col-span-2 flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                            <Settings size={18} />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-white">5. Flexibilidad de diseño</span>
                            <span className="text-[10px] text-slate-400 leading-normal block">Permite configurar capacidades de almacenamiento y potencia según el perfil del proyecto.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Recirculacion */}
                {activeTopic === 'recirculacion' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 8 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Sistemas de recirculación de agua caliente</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                          Un sistema de recirculación mantiene el agua caliente en constante movimiento por la red de tuberías de distribución del edificio, retornándola a la central térmica:
                        </p>

                        <div className="space-y-3">
                          <div className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                            <Clock size={20} className="text-indigo-600 shrink-0" />
                            <p className="text-slate-600 text-xs leading-relaxed">
                              <strong>Eliminación de esperas:</strong> Reduce drásticamente el tiempo de espera por agua caliente en las griferías más alejadas de la central.
                            </p>
                          </div>
                          <div className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                            <RefreshCw size={20} className="text-indigo-600 shrink-0" />
                            <p className="text-slate-600 text-xs leading-relaxed">
                              <strong>Línea de retorno:</strong> Requiere una tubería de retorno que conecte el final de la red de agua caliente de vuelta al calentador.
                            </p>
                          </div>
                          <div className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                            <Activity size={20} className="text-indigo-600 shrink-0" />
                            <p className="text-slate-600 text-xs leading-relaxed">
                              <strong>Componentes recomendados:</strong> Incorporar una bomba circuladora controlada por termostato y un tanque de expansión para absorber presiones en red.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Return Temperature Criteria */}
                      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
                        <div className="space-y-4">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Criterio Técnico Recomendado</span>
                          <h4 className="text-base font-black text-white">Rangos de Temperatura de Retorno</h4>
                          
                          <p className="text-slate-400 text-xs leading-relaxed">
                            Para asegurar el confort térmico inmediato del usuario y evitar pérdidas de energía excesivas, la bomba de recirculación debe programarse para mantener la red de retorno dentro de rangos controlados:
                          </p>
                          
                          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">Rango Recomendado de Retorno:</span>
                            <span className="text-xl font-mono font-black text-emerald-400">45°C - 50°C</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Este rango minimiza la formación de incrustaciones de calcio, inhibe el crecimiento bacteriano y evita sobrecargar de ciclos de encendido a los calentadores.
                          </p>
                        </div>

                        <div className="border-t border-slate-800 pt-4 text-xs font-bold text-slate-400">
                          Temperatura de salida en central: 55°C - 60°C.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Comparativa */}
                {activeTopic === 'comparativa' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 9 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Aplicación hotelera: Tradicional vs Centralizado Rinnai</h3>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                      En muchos hoteles grandes todavía se operan calderas de piso masivas combinadas con tanques acumuladores gigantes. La centralización modular con equipos Rinnai introduce cambios significativos:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {/* Boiler */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 space-y-4">
                        <span className="text-xs font-black text-red-500 uppercase tracking-widest block">Sistema Tradicional (Caldera)</span>
                        
                        <ul className="text-xs text-slate-600 font-semibold space-y-2 list-disc list-inside">
                          <li><strong>Mayor volumen físico:</strong> Ocupa grandes salas de máquinas dedicadas.</li>
                          <li><strong>Poca flexibilidad:</strong> Incapaz de modular de forma eficiente ante demandas bajas, manteniendo agua caliente acumulada innecesariamente.</li>
                          <li><strong>Mantenimiento concentrado:</strong> Si la caldera falla, el hotel completo se queda sin suministro.</li>
                        </ul>
                      </div>

                      {/* Rinnai */}
                      <div className="bg-indigo-950/20 border border-indigo-100 rounded-2xl p-6 space-y-4">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Sistema en Cascada Rinnai</span>
                        
                        <ul className="text-xs text-slate-700 font-semibold space-y-2 list-disc list-inside">
                          <li><strong>Ahorro de espacio:</strong> Montaje mural compacto en cascada.</li>
                          <li><strong>Redundancia operativa total:</strong> Mantenimiento sin interrumpir el servicio.</li>
                          <li><strong>Modulación precisa:</strong> Encendido proporcional según caudal real.</li>
                          <li><strong>Rotación automática:</strong> Desgaste equilibrado de los calentadores.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-2xl p-6 mt-6 border border-slate-800">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-medium text-slate-300 leading-relaxed max-w-xl">
                          <strong className="text-white block font-bold text-sm uppercase mb-1">Para hotelería, la centralización Rinnai:</strong>
                          No solo reemplaza equipos, sino que convierte la producción de agua caliente en una <strong>solución controlada, eficiente, escalable y con ahorro demostrable</strong> en el consumo de gas.
                        </div>
                        <div className="flex gap-3 shrink-0">
                          {['Respaldo', 'Menor Costo', 'Eficiencia'].map((ind, i) => (
                            <span key={i} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-300">
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Hardware Parts */}
                {activeTopic === 'hardware_parts' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 10 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Tecnología y partes del calentador 32L</h3>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                      Los calentadores Rinnai de la línea comercial están construidos con materiales de grado industrial diseñados para alta exigencia operativa:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Component 1 */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Ducto de evacuación</span>
                        <h4 className="text-sm font-black text-slate-800">Acero Inoxidable 304</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Ducto de gases resistente a la corrosión de condensados y altas temperaturas, asegurando una larga vida útil sin perforaciones o fugas.
                        </p>
                      </div>

                      {/* Component 2 */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Transferencia térmica</span>
                        <h4 className="text-sm font-black text-slate-800">Intercambiador de cobre</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Intercambiador de calor fabricado con cobre de alta pureza para lograr una transferencia de calor ultra-rápida y resistencia a choque térmico.
                        </p>
                      </div>

                      {/* Component 3 */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">Combustión</span>
                        <h4 className="text-sm font-black text-slate-800">Quemador de alta eficiencia</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Quemador de premezcla de gas y aire que maximiza el rendimiento térmico y reduce el consumo de gas y emisiones contaminantes.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 mt-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Flame size={20} />
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-slate-400">
                        <strong>Estructura Interna del Calentador:</strong> Incluye además electroválvulas de gas para control de flujo preciso, ventilador DC de tiro forzado para evacuación silenciosa y una tarjeta electrónica inteligente con microprocesador integrado.
                      </p>
                    </div>
                  </div>
                )}

                {/* Topic: Seguridad 32l */}
                {activeTopic === 'seguridad_32l' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 11 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Sistemas de seguridad del calentador 32L</h3>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      El calentador Rinnai de 32L incorpora 6 sistemas de seguridad electrónicos redundantes para garantizar el correcto funcionamiento y proteger la integridad de la red de tuberías y de los usuarios:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">1</span>
                        <h4 className="text-sm font-black text-slate-800">Termostato bimetálico</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Dispositivo térmico que corta el paso de gas si la temperatura del cuerpo alcanza 97°C. Detiene el equipo y reporta código de error 14.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">2</span>
                        <h4 className="text-sm font-black text-slate-800">Fusible térmico</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Fusible protector que se rompe físicamente si la temperatura excede los 221°C. Detiene el equipo y reporta código de error 14.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">3</span>
                        <h4 className="text-sm font-black text-slate-800">Termistor de Intercambiador</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Sensor digital que mide constantemente la salida del intercambiador. Si detecta sobrecalentamiento a 95°C, para el equipo de inmediato.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">4</span>
                        <h4 className="text-sm font-black text-slate-800">Sensor de flama</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Mide la ionización de la llama. Si detecta ausencia de fuego, cierra de inmediato la válvula de gas de seguridad y reporta error 12.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">5</span>
                        <h4 className="text-sm font-black text-slate-800">Fusible electrónico</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Fusible de 5 Amperes ubicado en la placa electrónica para proteger la circuitería de control contra sobre-corrientes o cortocircuitos.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600/10 text-indigo-600 text-xs font-black flex items-center justify-center">6</span>
                        <h4 className="text-sm font-black text-slate-800">Varistor</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          Componente de protección contra picos de voltaje transitorios en la red eléctrica comercial (220V).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Specs 32l */}
                {activeTopic === 'specs_32l' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 12 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Especificaciones técnicas RINGASN32C</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      {/* Specifications Table */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase">
                              <th className="px-4 py-3">Parámetro</th>
                              <th className="px-4 py-3">Especificación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-semibold text-slate-600">
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Capacidad nominal</td>
                              <td className="px-4 py-2.5 bg-white">32 Litros/min a Δ25°C</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Caudal Mínimo / Máximo</td>
                              <td className="px-4 py-2.5 bg-white">1.5 L/min / 37 L/min</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Rango de temperatura</td>
                              <td className="px-4 py-2.5 bg-white">35°C a 85°C (regulable)</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Tipo de gas</td>
                              <td className="px-4 py-2.5 bg-white">GLP / Gas Natural (GN)</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Suministro eléctrico</td>
                              <td className="px-4 py-2.5 bg-white">220 V - 60 Hz</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Conexiones agua / gas</td>
                              <td className="px-4 py-2.5 bg-white">R 3/4" (Rosca exterior)</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Peso neto</td>
                              <td className="px-4 py-2.5 bg-white">23 kg</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 bg-white font-bold">Controlador remoto</td>
                              <td className="px-4 py-2.5 bg-white">MC-601-BR (Incluido de fábrica)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Commercial Details */}
                      <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 space-y-4">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Características Destacadas</h4>
                          
                          <div className="space-y-3">
                            <div className="flex gap-2.5 items-start">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
                              <p className="text-xs font-semibold text-slate-600 leading-normal">
                                <strong>5 Años de Garantía:</strong> En el intercambiador de calor de cobre y quemadores.
                              </p>
                            </div>
                            <div className="flex gap-2.5 items-start">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
                              <p className="text-xs font-semibold text-slate-600 leading-normal">
                                <strong>Tipo B (Tiro Forzado):</strong> Incorpora ventilador interno para inyección forzada de gases de combustión.
                              </p>
                            </div>
                            <div className="flex gap-2.5 items-start">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-bold">✓</span>
                              <p className="text-xs font-semibold text-slate-600 leading-normal">
                                <strong>Funcionamiento en Altura:</strong> Configurable mediante switch electrónico de compensación de oxígeno para zonas geográficas altas.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 border border-slate-800">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Capacidad de Abastecimiento</span>
                          <p className="text-sm font-black text-white">Hasta 7 servicios simultáneos en condiciones óptimas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Instalacion 32l */}
                {activeTopic === 'instalacion_32l' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 13 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Instalación y dimensiones de tuberías</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Especificaciones de Instalación</h4>
                        
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 space-y-3">
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notas Técnicas de Chimenea</h5>
                          <ul className="text-xs text-slate-500 font-semibold space-y-2 list-disc list-inside">
                            <li>Instalación interior con evacuación obligatoria de gases al exterior (ducto de chimenea).</li>
                            <li><strong>Diámetro de chimenea:</strong> Φ 100 mm.</li>
                            <li><strong>Longitud de chimenea máxima:</strong> 7 m con 4 curvas de 90° o hasta 15 m sin curvas. (Cada codo de 90° reduce 2 metros lineales de capacidad).</li>
                            <li><strong>Inclinación recomendada:</strong> 2 cm de inclinación hacia el exterior por cada 1 metro de longitud horizontal para evitar retorno de condensados.</li>
                            <li>Verificar el estricto cumplimiento de las normativas de gas <strong>NTP 111.022 y 111.23</strong>.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Dimensions & Connections */}
                      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Dimensiones Físicas</h4>
                          <div className="grid grid-cols-3 gap-2 text-center pt-2">
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <span className="block text-[8px] text-slate-500 uppercase font-black">Ancho</span>
                              <span className="text-base font-mono font-black text-white mt-1 block">470 mm</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <span className="block text-[8px] text-slate-500 uppercase font-black">Alto</span>
                              <span className="text-base font-mono font-black text-white mt-1 block">600 mm</span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <span className="block text-[8px] text-slate-500 uppercase font-black">Profundidad</span>
                              <span className="text-base font-mono font-black text-white mt-1 block">240 mm</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-slate-800 pt-4">
                          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Conexiones de Tuberías</h4>
                          <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Tubería de Gas:</span>
                              <span className="font-mono text-white">R 3/4"</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Entrada de Agua Fría:</span>
                              <span className="font-mono text-white">R 3/4"</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-slate-400">
                              <span>Salida de Agua Caliente:</span>
                              <span className="font-mono text-white">R 3/4"</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Auto Diagnostico */}
                {activeTopic === 'auto_diagnostico' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 14 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Funcionamiento de autodiagnóstico y servoválvula</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      {/* Auto-diagnostic system */}
                      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
                          Sistema de Auto-diagnóstico Inteligente
                        </h4>
                        
                        <p className="text-slate-400 text-xs leading-relaxed">
                          La tarjeta de control principal monitorea continuamente las variables del equipo (corriente del ventilador, temperaturas de entrada/salida, ionización de flama). Si se detecta cualquier anomalía, el sistema detiene el equipo antes de una falla crítica, evitando daños mayores y mostrando un código de error numérico en el panel remoto.
                        </p>

                        <div className="border-t border-slate-800 pt-3 space-y-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Monitoreo del Ventilador DC</span>
                          <p className="text-xs text-slate-300">
                            Genera y ajusta el flujo de aire óptimo para la combustión y la evacuación de gases. Si la velocidad o corriente se alteran (debido a obstrucción de chimenea), la tarjeta activa protección.
                          </p>
                        </div>
                      </div>

                      {/* Water Flow control & Servovalve */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <Sliders size={16} className="text-indigo-600" />
                          Regulación de Caudal: Servoválvula
                        </h4>

                        <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                          Cuando la demanda de caudal de agua caliente de las griferías supera la capacidad térmica de calefacción momentánea del calentador, la <strong>servoválvula interna</strong> regula automáticamente la apertura para mantener una temperatura de salida estable y segura.
                        </p>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Motor paso a paso integrado</span>
                          <p className="text-slate-600 text-xs mt-1 leading-normal font-semibold">
                            La servoválvula incorpora un motor eléctrico que ajusta de forma continua la restricción del agua, regulando el caudal para mantener la temperatura preestablecida exacta en el controlador remoto MC-601.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Topic: Codigos Error */}
                {activeTopic === 'codigos_error' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 15 de 16</span>
                        <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Tabla de códigos de error de autodiagnóstico</h3>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Buscar código o descripción..." 
                        value={errorSearch}
                        onChange={(e) => setErrorSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold w-full sm:w-60"
                      />
                    </div>

                    {/* Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-96 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-700 uppercase tracking-wider sticky top-0 z-10">
                            <th className="px-5 py-3.5 w-16">Cód.</th>
                            <th className="px-5 py-3.5">Descripción del Error</th>
                            <th className="px-5 py-3.5">Acción Recomendada / Solución</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-semibold text-slate-600">
                          {filteredErrors.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-slate-400 font-medium bg-white">
                                No se encontraron códigos que coincidan con la búsqueda.
                              </td>
                            </tr>
                          ) : (
                            filteredErrors.map((err, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 bg-white transition-colors">
                                <td className="px-5 py-3 font-mono font-black text-slate-900">{err.code}</td>
                                <td className="px-5 py-3 text-slate-700">{err.desc}</td>
                                <td className="px-5 py-3 text-indigo-600 font-medium bg-indigo-50/10">{err.sol}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Topic: Kits Instalacion */}
                {activeTopic === 'kits_instalacion' && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Temario 16 de 16</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-1 uppercase">Kit de instalación residencial / comercial</h3>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      El kit de instalación incluye las piezas de conexión y accesorios de anclaje necesarios para garantizar una conexión hidráulica y de gas segura:
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                      {[
                        { id: '1', name: 'Reductor campana 3/4" a 1/2"', desc: 'Ajuste de roscas de agua.' },
                        { id: '2', name: 'Niple 1/2"', desc: 'Tubo de unión roscado.' },
                        { id: '3', name: 'Tornillo AISI 304', desc: 'Anclaje de alta resistencia.' },
                        { id: '4', name: 'Tarugo N°8', desc: 'Fijación en pared de concreto.' },
                        { id: '5', name: 'Pipeta GLP G1/2" hembra - 3/8" macho', desc: 'Conexión de entrada de gas.' },
                        { id: '6', name: 'Empaque', desc: 'Sellado hermético de juntas.' },
                        { id: '7', name: 'Ductería AISI304 Φ 10 cm', desc: 'Chimenea inoxidable de evacuación.' },
                        { id: '8', name: 'Tubos de abasto 1/2"', desc: 'Conexión flexible de agua.' }
                      ].map((item) => (
                        <div key={item.id} className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="w-5 h-5 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-black flex items-center justify-center mb-3">
                              {item.id}
                            </span>
                            <h4 className="text-xs font-black text-slate-800 leading-snug">{item.name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 font-semibold leading-normal">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="border-t border-slate-100 pt-6 mt-8 flex justify-between">
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
                Siguiente Tema
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sizing Calculators Tab (ASHRAE vs ASPE methods) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Method Selection & Inputs */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">Configuración del Proyecto</h3>
                <p className="text-slate-500 text-xs font-medium mt-1">Selecciona el método e ingresa los datos para dimensionar la central térmica Rinnai.</p>
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
                  {/* apartments */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Número de Departamentos / Viviendas</label>
                    <input 
                      type="number" 
                      value={apartments}
                      onChange={(e) => setApartments(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Showers per apartment */}
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

                  {/* Washbasins per apartment */}
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

                  {/* Sinks per apartment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Lavaplatos/Lavaderos por departamento (1.5 FU c/u)</label>
                    <input 
                      type="number" 
                      step="1"
                      value={sinksPerApt}
                      onChange={(e) => setSinksPerApt(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Temp delta */}
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
                  {/* Building Type */}
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

                  {/* units count */}
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
                {/* Header info */}
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">Resultados de Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas en Cascada de Paso Continuo (Método ASHRAE)</h3>
                </div>

                {/* Main Results card */}
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

                {/* Mathematical context using KaTeX */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={14} />
                    Contexto Teórico del Cálculo (Fórmula ASHRAE)
                  </h4>
                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <p>
                      El caudal probable se calcula utilizando la aproximación de la curva de Hunter residencial:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`Q_{\\text{gpm}} = 1.05 \\times (\\text{FU})^{0.55}`} />
                    </div>
                    <p>
                      La potencia térmica de recuperación requerida en la central para cubrir la demanda probable de forma instantánea es:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`P_{\\text{kW}} = Q_{\\text{L/min}} \\times \\rho \\times C_p \\times \\Delta T`} />
                    </div>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px] text-slate-500">
                      <div>Sustituyendo los valores del proyecto:</div>
                      <div className="text-slate-300 font-semibold">{ashraeCalculations.qProbLpm} L/min × 1 kg/L × 4.186 kJ/kg°C × {tempDelta}°C / 60 = {ashraeCalculations.powerKw} kW</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Header info */}
                <div>
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">Resultados de Dimensionamiento</span>
                  <h3 className="text-xl md:text-2xl font-black text-white mt-1 uppercase">Sistemas Mixtos con Acumulación (Método ASPE)</h3>
                </div>

                {/* Main Results card */}
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

                {/* Mathematical context using KaTeX */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={14} />
                    Contexto Teórico del Cálculo (Fórmula ASPE)
                  </h4>
                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <p>
                      La relación entre la acumulación requerida (<InlineMath math="V_s" />) y la recuperación (<InlineMath math="R_x" />) para cubrir la demanda máxima en la hora punta es:
                    </p>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-center font-mono">
                      <BlockMath math={`V_s + (R_x \\times 1 \\text{ h}) = V_d`} />
                    </div>
                    <p>
                      Para evitar la sobredimensión hidráulica de los calentadores, el método ASPE recomienda los siguientes coeficientes empíricos según el destino del proyecto:
                    </p>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px] text-slate-500">
                      <div>Edificios multifamiliares:</div>
                      <div className="text-slate-300 font-semibold">Acumulación: V_s = V_d × 1.2 | Recuperación: R_x = V_d × 0.3</div>
                      <div className="mt-2">Hoteles / Hospedaje:</div>
                      <div className="text-slate-300 font-semibold">Acumulación: V_s = V_d × 0.8 | Recuperación: R_x = V_d × 0.25</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
              <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
              <span>
                <strong>Recomendación de Diseño:</strong> En base a la capacidad requerida y los caudales resultantes, te sugerimos utilizar calentadores Rinnai de <strong>Línea Comercial RINGASN32C</strong> interconectados en cascada para suministrar el volumen de recuperación calculado.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
