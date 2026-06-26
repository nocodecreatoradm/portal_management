import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Droplets, Target, Users, BarChart3, Clock, CheckCircle2, Shield, Info, 
  Activity, ChevronRight, ArrowLeft, RefreshCw, Zap, Book, ShieldAlert,
  Flame, HelpCircle, FileText, Settings, Hammer, Sliders, Play, Plus, ArrowRight,
  Maximize2, LayoutGrid, Check, Server, Building2, HeartHandshake, Eye,
  Search, Calendar, MapPin, Mail, Upload, X, Trash2, Edit
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { SupabaseService } from '../lib/SupabaseService';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ReferenceLine 
} from 'recharts';

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
  const { profile } = useAuth();
  const currentUserName = profile?.full_name || 'Ingeniero I+D';

  const [activeTab, setActiveTab] = useState<'projects' | 'info' | 'methods' | 'performance'>('projects');
  const [activeTopic, setActiveTopic] = useState<string>('arquitectura');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  interface ProjectLog {
    date: string;
    note: string;
    author: string;
    type?: 'creacion' | 'avance' | 'hallazgo' | 'finalizacion';
  }

  interface SizingProject {
    id: string;
    name: string;
    client: string;
    address: string;
    background: string;
    specialRequirements: string;
    emails: string;
    status: 'en_progreso' | 'completado';
    startDate: string;
    endDate?: string;
    attachments: { name: string; url: string; type: string }[];
    logs: ProjectLog[];
  }

  const [projects, setProjects] = useState<SizingProject[]>(() => {
    const saved = localStorage.getItem('sizing_projects');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const seed: SizingProject[] = [
      {
        id: 'PRJ-DIM-001',
        name: 'Dimensionamiento Edificio Miraflores',
        client: 'Inmobiliaria Imagina',
        address: 'Av. Larco 1250, Miraflores, Lima',
        background: 'Cálculo de demanda de agua caliente para edificio de departamentos multifamiliar de 20 pisos.',
        specialRequirements: 'Cálculo formal con método ASHRAE y diseño de recirculación.',
        emails: 'carlos.hoyos@sole.com.pe, proyectos@imagina.pe',
        status: 'completado',
        startDate: '2026-04-10',
        endDate: '2026-04-18',
        attachments: [
          { name: 'Informe_Final_Miraflores.pdf', url: 'https://pdfobject.com/pdf/sample.pdf', type: '📄 INFORME TÉCNICO' }
        ],
        logs: [
          { date: '10/4/2026, 9:00:00 a. m.', note: 'Dimensionamiento iniciado tras reunión técnica.', author: 'Carlos Hoyos', type: 'creacion' },
          { date: '12/4/2026, 11:30:00 a. m.', note: 'Cálculos iniciales completados en calculadora ASHRAE. Caudal estimado en 180 L/h.', author: 'Carlos Hoyos', type: 'avance' },
          { date: '18/4/2026, 4:00:00 p. m.', note: 'Informes finales firmados y subidos como evidencia.', author: 'Carlos Hoyos', type: 'finalizacion' }
        ]
      },
      {
        id: 'PRJ-DIM-002',
        name: 'ACS Hotel Savoy San Isidro',
        client: 'Hoteles Savoy del Perú',
        address: 'Calle Libertadores 320, San Isidro, Lima',
        background: 'Reemplazo de calderas de vapor por sistema modular de cascada Rinnai para 120 habitaciones.',
        specialRequirements: 'Interconexión con BMS y sistema de calentamiento rápido.',
        emails: 'mantenimiento@savoy.pe, ingenieria@sole.com.pe',
        status: 'completado',
        startDate: '2026-05-02',
        endDate: '2026-05-04',
        attachments: [
          { name: 'Esquema_Cascada_Savoy.pdf', url: 'https://pdfobject.com/pdf/sample.pdf', type: '📊 ESQUEMA HIDRÁULICO' }
        ],
        logs: [
          { date: '2/5/2026, 10:00:00 a. m.', note: 'Visita técnica realizada. Dimensionamiento urgente.', author: 'Carlos Hoyos', type: 'creacion' },
          { date: '3/5/2026, 2:00:00 p. m.', note: 'Esquema hidráulico en cascada finalizado.', author: 'Carlos Hoyos', type: 'avance' },
          { date: '4/5/2026, 6:00:00 p. m.', note: 'Informes técnicos finales cargados a la orden del cliente.', author: 'Carlos Hoyos', type: 'finalizacion' }
        ]
      },
      {
        id: 'PRJ-DIM-003',
        name: 'Planta Industrial SolGas Callao',
        client: 'SolGas S.A.C.',
        address: 'Av. Néstor Gambetta 1520, Callao',
        background: 'Suministro de agua caliente para vestuarios del personal de planta en 3 turnos rotativos.',
        specialRequirements: 'Cálculo de acumulación por picos según normativa ASPE.',
        emails: 'seguridad@solgas.com, proyectosmt@sole.com.pe',
        status: 'en_progreso',
        startDate: '2026-06-25',
        attachments: [],
        logs: [
          { date: '25/6/2026, 11:00:00 a. m.', note: 'Proyecto creado. Pendiente de envío de cantidad exacta de operarios.', author: 'Carlos Hoyos', type: 'creacion' }
        ]
      }
    ];
    localStorage.setItem('sizing_projects', JSON.stringify(seed));
    return seed;
  });

  const saveProjects = (updatedProjects: SizingProject[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('sizing_projects', JSON.stringify(updatedProjects));
  };

  const [sizingSearchTerm, setSizingSearchTerm] = useState('');
  
  // New Sizing Project Form state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    client: '',
    address: '',
    background: '',
    specialRequirements: '',
    emails: ''
  });
  
  // Log / Finding Modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({
    note: '',
    type: 'avance' as 'avance' | 'hallazgo'
  });
  
  // Finalize Project Modal state
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  
  // File upload state
  const [tempAttachments, setTempAttachments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Date filters for performance report
  const [performanceFilter, setPerformanceFilter] = useState({
    start: '2026-03-26',
    end: '2026-06-26'
  });

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      setIsUploading(true);
      const toastId = toast.loading(`Subiendo archivo: ${file.name}...`);
      try {
        const fileInfo = await SupabaseService.uploadFile('rd-files', `sizing/${Date.now()}_${file.name}`, file);
        const publicUrl = fileInfo.url;
        toast.dismiss(toastId);
        toast.success(`Archivo subido: ${file.name}`);
        setTempAttachments(prev => [
          ...prev, 
          { name: file.name, url: publicUrl, type: file.type.includes('image') ? '📸 EVIDENCIA IMAGEN' : '📄 INFORME TÉCNICO' }
        ]);
      } catch (err) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error(`Error al subir ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCreateProject = () => {
    if (!projectForm.name.trim() || !projectForm.client.trim() || !projectForm.address.trim()) {
      toast.error('Debe completar los campos obligatorios (*)');
      return;
    }
    const newId = `PRJ-DIM-${String(projects.length + 1).padStart(3, '0')}`;
    const newProj: SizingProject = {
      id: newId,
      name: projectForm.name.trim(),
      client: projectForm.client.trim(),
      address: projectForm.address.trim(),
      background: projectForm.background.trim(),
      specialRequirements: projectForm.specialRequirements.trim(),
      emails: projectForm.emails.trim(),
      status: 'en_progreso',
      startDate: new Date().toISOString().split('T')[0],
      attachments: [...tempAttachments],
      logs: [
        { 
          date: new Date().toLocaleString(), 
          note: 'Proyecto iniciado. Levantamiento de información.', 
          author: currentUserName, 
          type: 'creacion' 
        }
      ]
    };

    saveProjects([...projects, newProj]);
    toast.success(`Proyecto ${newId} iniciado con éxito.`);
    setIsNewProjectModalOpen(false);
    setTempAttachments([]);
  };

  const handleAddLog = () => {
    if (!logForm.note.trim() || !selectedProjectId) {
      toast.error('Debe ingresar una nota de bitácora.');
      return;
    }

    const updated = projects.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          logs: [
            ...p.logs,
            {
              date: new Date().toLocaleString(),
              note: logForm.note.trim(),
              author: currentUserName,
              type: logForm.type
            }
          ]
        };
      }
      return p;
    });

    saveProjects(updated);
    toast.success('Bitácora actualizada.');
    setIsLogModalOpen(false);
  };

  const handleFinalizeProject = () => {
    if (!selectedProjectId) return;
    if (tempAttachments.length === 0) {
      toast.error('Debe subir al menos un informe final para culminar el proyecto.');
      return;
    }

    const updated = projects.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          status: 'completado' as const,
          endDate: new Date().toISOString().split('T')[0],
          attachments: [...p.attachments, ...tempAttachments],
          logs: [
            ...p.logs,
            {
              date: new Date().toLocaleString(),
              note: 'Informes finales subidos y proyecto finalizado.',
              author: currentUserName,
              type: 'finalizacion'
            }
          ]
        };
      }
      return p;
    });

    saveProjects(updated);
    toast.success('Proyecto culminado y cerrado.');
    setIsFinalizeModalOpen(false);
    setTempAttachments([]);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este proyecto?')) {
      const updated = projects.filter(p => p.id !== id);
      saveProjects(updated);
      toast.success('Proyecto eliminado.');
    }
  };

  const filteredProjects = useMemo(() => {
    const term = sizingSearchTerm.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.client.toLowerCase().includes(term) ||
      p.address.toLowerCase().includes(term) ||
      p.background.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  }, [projects, sizingSearchTerm]);

  const performanceChartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    // Group by key YYYY-MM
    const grouped: Record<string, { totalDays: number; count: number; label: string }> = {};
    
    projects.forEach(p => {
      if (p.status === 'completado' && p.endDate) {
        const date = new Date(p.endDate);
        const year = date.getFullYear();
        const monthIdx = date.getMonth();
        const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
        const monthName = `${months[monthIdx]} ${year}`;
        const days = Math.max(1, Math.round((date.getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)));
        
        if (!grouped[key]) {
          grouped[key] = { totalDays: 0, count: 0, label: monthName };
        }
        grouped[key].totalDays += days;
        grouped[key].count += 1;
      }
    });
    
    // Sort keys chronologically
    return Object.keys(grouped)
      .sort()
      .map(key => ({
        month: grouped[key].label,
        avgDays: parseFloat((grouped[key].totalDays / grouped[key].count).toFixed(1))
      }));
  }, [projects]);

  const performanceKPIs = useMemo(() => {
    const completedInRange = projects.filter(p => {
      if (p.status !== 'completado' || !p.endDate) return false;
      return p.endDate >= performanceFilter.start && p.endDate <= performanceFilter.end;
    });

    const activeCount = projects.filter(p => p.status === 'en_progreso').length;

    let totalDays = 0;
    completedInRange.forEach(p => {
      if (p.endDate) {
        const days = Math.max(1, Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)));
        totalDays += days;
      }
    });

    const avg = completedInRange.length > 0 ? (totalDays / completedInRange.length).toFixed(1) : '0';

    return {
      completedCount: completedInRange.length,
      avgDays: avg,
      activeCount
    };
  }, [projects, performanceFilter]);

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
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'projects' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Building2 size={16} />
          Proyectos de Dimensionamiento
        </button>
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
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'performance' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BarChart3 size={16} />
          Reporte de Performance
        </button>
      </div>

      {/* Tab 3: Projects List Dashboard */}
      {activeTab === 'projects' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Proyectos de Dimensionamiento</h3>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Administración y seguimiento de dimensionamientos de sistemas centralizados de agua caliente.
              </p>
            </div>
            <button
              onClick={() => {
                setTempAttachments([]);
                setProjectForm({
                  name: '',
                  client: '',
                  address: '',
                  background: '',
                  specialRequirements: '',
                  emails: ''
                });
                setIsNewProjectModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-indigo-100"
            >
              <Plus size={14} className="stroke-[3]" />
              Nuevo Proyecto
            </button>
          </div>

          {/* Search bar */}
          <div className="flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre de proyecto, cliente, dirección o antecedentes..."
                value={sizingSearchTerm}
                onChange={(e) => setSizingSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
                <Building2 size={48} className="opacity-20 mb-3" />
                <h4 className="text-lg font-bold">No se encontraron proyectos</h4>
                <p className="text-sm font-medium mt-1">Intente con otro término o cree un nuevo proyecto.</p>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isCompleted = p.status === 'completado';
                const durationDays = isCompleted && p.endDate
                  ? Math.max(1, Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)))
                  : Math.max(1, Math.round((new Date().getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)));
                
                return (
                  <div key={p.id} className="bg-white border border-slate-200/80 hover:border-indigo-200 hover:shadow-lg transition-all rounded-3xl p-6 space-y-6">
                    {/* Project Card Header */}
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.id}</span>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">{p.name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                        }`}>
                          {isCompleted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {isCompleted ? 'Completado' : 'En Progreso'}
                        </span>
                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="p-2 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Eliminar proyecto"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-slate-650 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Cliente</span>
                        <span className="text-slate-800 font-bold block mt-0.5">{p.client}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Dirección</span>
                        <span className="text-slate-800 font-bold block mt-0.5 truncate" title={p.address}>{p.address}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Fecha Inicio</span>
                        <span className="text-slate-800 font-bold block mt-0.5 flex items-center gap-1.5">
                          <Calendar size={12} /> {p.startDate}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">
                          {isCompleted ? 'Fecha Fin' : 'Tiempo Transcurrido'}
                        </span>
                        <span className="text-slate-800 font-bold block mt-0.5 flex items-center gap-1.5">
                          <Clock size={12} /> 
                          {isCompleted ? `${p.endDate} (${durationDays} días)` : `${durationDays} días activo`}
                        </span>
                      </div>
                    </div>

                    {/* Background & Requirements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Antecedentes</span>
                        <p className="text-slate-600 font-medium whitespace-pre-line">{p.background || 'Sin antecedentes registrados.'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Requerimientos Especiales</span>
                        <p className="text-slate-600 font-medium whitespace-pre-line">{p.specialRequirements || 'Sin requerimientos especiales.'}</p>
                      </div>
                    </div>

                    {/* Emails list */}
                    {p.emails && (
                      <div className="text-xs">
                        <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Correos del Proyecto</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {p.emails.split(',').map((email, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-655 rounded-lg text-[10px] font-bold border border-slate-200">
                              <Mail size={10} /> {email.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments Section */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Documentos y Evidencias</span>
                      {p.attachments.length === 0 ? (
                        <p className="text-slate-400 text-xs font-semibold">No hay documentos adjuntos.</p>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {p.attachments.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                              <FileText size={14} />
                              <div className="text-left">
                                <p className="leading-none text-[11px] font-bold truncate max-w-[150px]">{file.name}</p>
                                <p className="text-[8px] text-indigo-400 uppercase font-black tracking-widest mt-0.5">{file.type}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timeline Logs */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <span className="block text-[9px] text-slate-400 uppercase font-black tracking-widest">Bitácora de Avances y Hallazgos</span>
                      <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {p.logs.map((log, idx) => (
                          <div key={idx} className="flex gap-4 items-start pl-5 relative animate-in fade-in duration-300">
                            {/* Dot indicator */}
                            <span className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                              log.type === 'creacion' ? 'bg-indigo-500' :
                              log.type === 'finalizacion' ? 'bg-emerald-500' :
                              log.type === 'hallazgo' ? 'bg-amber-500' : 'bg-slate-400'
                            }`} />
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-800 font-bold">{log.note}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                <span>{log.author}</span>
                                <span>•</span>
                                <span>{log.date}</span>
                                {log.type && (
                                  <>
                                    <span>•</span>
                                    <span className="uppercase text-[8px] font-black tracking-widest text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                      {log.type}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Project footer buttons */}
                    {!isCompleted && (
                      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setLogForm({ note: '', type: 'avance' });
                            setIsLogModalOpen(true);
                          }}
                          className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                        >
                          Registrar Avance
                        </button>
                        <button
                          onClick={() => {
                            setBuildingType('multifamily');
                            setUnitsCount(50);
                            setActiveTab('methods');
                            toast.info(`Configurando calculadora para el proyecto: ${p.name}`);
                          }}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                        >
                          Realizar Cálculos
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProjectId(p.id);
                            setTempAttachments([]);
                            setIsFinalizeModalOpen(true);
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 shadow-md"
                        >
                          Subir Evidencia y Finalizar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 1: Interactive Learning Dashboard */}
      {activeTab === 'info' && (
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
      )}

      {/* Tab 2: Sizing Calculators */}
      {activeTab === 'methods' && (
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

      {/* Tab 4: Performance Report */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters & Title */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Indicadores de Desempeño (I+D)</h3>
              <p className="text-slate-500 text-xs font-medium mt-1">
                Monitoreo del tiempo promedio desde el inicio del dimensionamiento hasta la entrega del informe final.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-700">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-black">Desde</label>
                <input 
                  type="date"
                  value={performanceFilter.start}
                  onChange={(e) => setPerformanceFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase tracking-wider text-slate-400 font-black">Hasta</label>
                <input 
                  type="date"
                  value={performanceFilter.end}
                  onChange={(e) => setPerformanceFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* KPIs & Objective Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Entregados</span>
                <span className="text-3xl font-black text-slate-900 block mt-0.5">{performanceKPIs.completedCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Proyectos cerrados en el rango</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-650 shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black tracking-widest">Tiempo Promedio</span>
                <span className="text-3xl font-black text-slate-900 block mt-0.5">
                  {performanceKPIs.avgDays} <span className="text-sm font-bold text-slate-500">días</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Promedio de días para finalizar</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-150 flex items-center justify-center text-amber-600 shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-black tracking-widest">Dimensionamientos Activos</span>
                <span className="text-3xl font-black text-slate-900 block mt-0.5">{performanceKPIs.activeCount}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">En proceso de diseño y levantamiento</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Chart Area */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Evolución del Tiempo Promedio de Entrega</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">Gráfico mensual con metas operativas (Meta: 5 días o menos).</p>
              </div>

              <div className="h-[280px] w-full text-xs font-mono font-bold">
                {performanceChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    No hay suficientes datos históricos para graficar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" unit="d" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <ReferenceLine y={10} label={{ value: 'Máximo (10d)', fill: '#ef4444', position: 'top', fontSize: 10 }} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={5} label={{ value: 'Meta (5d)', fill: '#10b981', position: 'top', fontSize: 10 }} stroke="#10b981" strokeDasharray="3 3" />
                      <ReferenceLine y={2} label={{ value: 'Mínimo (2d)', fill: '#3b82f6', position: 'top', fontSize: 10 }} stroke="#3b82f6" strokeDasharray="3 3" />
                      <Line 
                        name="Días Promedio" 
                        type="monotone" 
                        dataKey="avgDays" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        dot={{ r: 6, stroke: '#818cf8', strokeWidth: 2, fill: '#0f172a' }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Objective Description Card */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Target size={20} />
                  <h4 className="text-xs font-black uppercase tracking-wider">Objetivo de Desempeño</h4>
                </div>
                
                <div className="space-y-3 text-xs leading-relaxed text-slate-650">
                  <p>
                    <strong>Agilidad Comercial:</strong> R&D tiene como meta entregar dimensionamientos y esquemas hidráulicos en un plazo óptimo para no retrasar las propuestas del área comercial.
                  </p>
                  <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-500">
                      <span>Métricas de Control</span>
                      <span>Meta</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Plazo de Entrega</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                        ≤ 5 días
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>Carga en Azure</span>
                      <span className="text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">
                        Obligatorio
                      </span>
                    </div>
                  </div>
                  <p>
                    La carga de evidencias (esquemas hidráulicos firmados o informes de pre-evaluación) es obligatoria antes de marcar un proyecto como finalizado.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-medium">
                Última actualización: hace unos instantes. Los datos se calculan dinámicamente con base en los registros finalizados en el sistema.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Proyecto */}
      <AnimatePresence>
        {isNewProjectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Iniciar Nuevo Proyecto</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Comienza un nuevo dimensionamiento registrando los datos base.</p>
                </div>
                <button 
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Nombre del Proyecto *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Residencia Miraflores Rinnai"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Cliente *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Inmobiliaria Imagina"
                      value={projectForm.client}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, client: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Dirección del Proyecto *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Av. Larco 1250, Miraflores"
                      value={projectForm.address}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Correos de Notificación</label>
                    <input 
                      type="text" 
                      placeholder="Ej. c.hoyos@sole.com.pe, proyectos@imagina.pe"
                      value={projectForm.emails}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, emails: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Antecedentes</label>
                  <textarea 
                    placeholder="Describe el contexto del proyecto, cantidad de departamentos, requerimiento de caudal, etc."
                    value={projectForm.background}
                    rows={3}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, background: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Reerimientos Especiales</label>
                  <textarea 
                    placeholder="Ej. Sistema de recirculación forzada, BMS, espacio reducido, etc."
                    value={projectForm.specialRequirements}
                    rows={2}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, specialRequirements: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Upload Section */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Planos / Fotos de Referencia (Opcional)</label>
                  <div className="flex gap-4 items-center">
                    <label className={`flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight cursor-pointer border border-slate-250 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={14} />
                      {isUploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleUploadFile} 
                        className="hidden" 
                        disabled={isUploading}
                      />
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">Carga documentos iniciales a Azure</span>
                  </div>

                  {/* Temp attachments list */}
                  {tempAttachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      {tempAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs font-bold text-indigo-750 relative group">
                          <FileText size={14} />
                          <div className="text-left max-w-[120px] truncate">
                            <p className="leading-none text-[10px] font-bold truncate">{file.name}</p>
                            <p className="text-[7px] text-indigo-400 uppercase font-black tracking-widest mt-0.5">{file.type}</p>
                          </div>
                          <button
                            onClick={() => setTempAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-150 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                <button 
                  onClick={() => {
                    setIsNewProjectModalOpen(false);
                    setTempAttachments([]);
                  }}
                  className="px-4 py-2.5 border border-slate-250 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateProject}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 shadow-md shadow-indigo-100"
                >
                  Iniciar Proyecto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Registrar Bitácora */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full flex flex-col"
            >
              <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Registrar Nota en Bitácora</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Agrega avances o hallazgos al historial del dimensionamiento.</p>
                </div>
                <button 
                  onClick={() => setIsLogModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 flex-1">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Tipo de Nota</label>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setLogForm(prev => ({ ...prev, type: 'avance' }))}
                      className={`py-2 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all ${
                        logForm.type === 'avance' 
                          ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/40' 
                          : 'text-slate-450 hover:text-slate-600'
                      }`}
                    >
                      Avance Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogForm(prev => ({ ...prev, type: 'hallazgo' }))}
                      className={`py-2 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all ${
                        logForm.type === 'hallazgo' 
                          ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/40' 
                          : 'text-slate-450 hover:text-slate-600'
                      }`}
                    >
                      Hallazgo Técnico
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Anotación *</label>
                  <textarea 
                    placeholder="Escribe el avance realizado o el hallazgo técnico encontrado..."
                    value={logForm.note}
                    rows={4}
                    onChange={(e) => setLogForm(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-150 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                <button 
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-250 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddLog}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 shadow-md shadow-indigo-100"
                >
                  Guardar Nota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Finalizar Proyecto */}
      <AnimatePresence>
        {isFinalizeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full flex flex-col"
            >
              <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Culminar Proyecto</h3>
                  <p className="text-slate-500 text-xs font-semibold mt-0.5">Sube el informe técnico final en PDF para finalizar el dimensionamiento.</p>
                </div>
                <button 
                  onClick={() => {
                    setIsFinalizeModalOpen(false);
                    setTempAttachments([]);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 flex-1">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs leading-relaxed text-amber-700 flex gap-2.5 items-start">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>Requisito Obligatorio:</strong> Para cerrar un proyecto de dimensionamiento es obligatorio subir el informe de cálculo formal o esquema hidráulico para contar con evidencias de R&D.
                  </span>
                </div>

                {/* Upload Inputs */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block font-bold">Documento PDF del Informe *</label>
                  <div className="flex gap-4 items-center">
                    <label className={`flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-tight cursor-pointer border border-slate-250 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={14} />
                      {isUploading ? 'Subiendo...' : 'Subir Informe final'}
                      <input 
                        type="file" 
                        accept="application/pdf,image/*"
                        onChange={handleUploadFile} 
                        className="hidden" 
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  {/* Temp attachments list */}
                  {tempAttachments.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      {tempAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-150 rounded-xl text-xs font-bold text-indigo-700 relative group">
                          <FileText size={14} />
                          <div className="text-left max-w-[150px] truncate">
                            <p className="leading-none text-[10px] font-bold truncate">{file.name}</p>
                            <p className="text-[7px] text-indigo-400 uppercase font-black tracking-widest mt-0.5">{file.type}</p>
                          </div>
                          <button
                            onClick={() => setTempAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-150 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                <button 
                  onClick={() => {
                    setIsFinalizeModalOpen(false);
                    setTempAttachments([]);
                  }}
                  className="px-4 py-2.5 border border-slate-250 hover:bg-slate-200 text-slate-655 rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleFinalizeProject}
                  disabled={tempAttachments.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all active:scale-95 shadow-md shadow-emerald-100 font-bold"
                >
                  Cerrar y Finalizar Proyecto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
