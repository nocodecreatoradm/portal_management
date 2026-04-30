import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Droplets, 
  Thermometer, 
  Flame, 
  ChevronRight,
  Info,
  Download,
  Settings2,
  Layers,
  X,
  Play,
  RefreshCw,
  LayoutGrid,
  CheckCircle2,
  Camera
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  Label
} from 'recharts';
import ModuleActions from './ModuleActions';
import { generateReportPDF, exportToExcel, exportToPPT } from '../lib/exportUtils';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { currentUser } from '../data/mockData';
import { toast } from 'sonner';

interface UHConfig {
  id: string;
  name: string;
  total: number;
  hot: number;
}

interface Typology {
  id: string;
  name: string;
  count: number;
  fixtures: { [key: string]: number };
}

const INITIAL_UH_CONFIG: UHConfig[] = [
  { id: 'shower', name: 'Ducha', total: 2, hot: 1.5 },
  { id: 'toilet', name: 'Inodoro c/ tanque', total: 3, hot: 0 },
  { id: 'sink', name: 'Lavadero', total: 3, hot: 2 },
  { id: 'lavatory', name: 'Lavatorio', total: 1, hot: 0.75 },
  { id: 'faucet', name: 'Grifo', total: 2, hot: 0 },
  { id: 'bathtub', name: 'Tina', total: 2, hot: 1.5 },
  { id: 'bidet', name: 'Bidé', total: 1, hot: 0 },
];

const INITIAL_TYPOLOGIES: Typology[] = [
  { id: '104', name: '104', count: 1, fixtures: { shower: 2, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '1A', name: '1A', count: 11, fixtures: { shower: 1, sink: 1, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '1B', name: '1B', count: 10, fixtures: { shower: 2, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '2', name: '2', count: 21, fixtures: { shower: 1, sink: 1, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '3A', name: '3A', count: 2, fixtures: { shower: 2, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '3B', name: '3B', count: 19, fixtures: { shower: 2, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '4', name: '4', count: 17, fixtures: { shower: 2, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '5', name: '5', count: 5, fixtures: { shower: 1, sink: 2, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
  { id: '6', name: '6', count: 10, fixtures: { shower: 1, sink: 1, lavatory: 2, toilet: 1, faucet: 0, bathtub: 0, bidet: 0 } },
];

const ASPE_FIXTURES = [
  { id: '1br', name: '1 dormitorio', gph: 15 },
  { id: '2br', name: '2 dormitorios', gph: 18 },
  { id: '3br', name: '3 dormitorios', gph: 20 },
  { id: 'tubs', name: 'Tinas/Duchas', gph: 20 },
  { id: 'lavs', name: 'Lavatorios', gph: 2 },
  { id: 'kitchen', name: 'Lavaderos de cocina', gph: 10 },
  { id: 'dishwashers', name: 'Lavavajillas residenciales', gph: 15 },
  { id: 'clothes_washers', name: 'Lavadoras residenciales', gph: 20 },
  { id: 'service_sinks', name: 'Lavaderos de servicio', gph: 30 },
  { id: 'laundry_tubs', name: 'Bateas de lavandería', gph: 30 },
];

const HEATER_PRODUCTS = [
  { id: 'p1', name: 'Calentador Industrial 199k', power: 199000, efficiency: 0.97 },
  { id: 'p2', name: 'Calentador Industrial 150k', power: 150000, efficiency: 0.95 },
  { id: 'p3', name: 'Calentador Residencial 40k', power: 40000, efficiency: 0.90 },
];

const CONSTANTS = {
  BTU_CONSTANT: 8.33,
  GALLON_TO_LITER: 3.785
};

const getMSBKits = (count: number) => {
  const n = Math.ceil(count);
  if (n < 2) return null;
  if (n === 2) return { m: 1, c1: 0, c2: 0 };
  if (n === 3) return { m: 1, c1: 1, c2: 0 };
  if (n === 4) return { m: 1, c1: 2, c2: 0 };
  if (n === 5) return { m: 1, c1: 3, c2: 0 };
  if (n === 6) return { m: 2, c1: 2, c2: 1 };
  if (n === 7) return { m: 2, c1: 3, c2: 1 };
  if (n === 8) return { m: 2, c1: 4, c2: 1 };
  if (n === 9) return { m: 2, c1: 5, c2: 1 };
  if (n === 10) return { m: 2, c1: 6, c2: 1 };
  if (n === 11) return { m: 3, c1: 5, c2: 2 };
  if (n === 12) return { m: 3, c1: 6, c2: 2 };
  if (n >= 13) return { m: 3, c1: 7, c2: 2 };
  return null;
};

// Hunter Curve Polynomial for Curve C (Apt. Houses): y = -6E-10x^4 + 1E-06x^3 - 0.0006x^2 + 0.2103x + 9.9827
const calculateGPM_C = (uh: number) => {
  if (uh <= 0) return 0;
  const x = uh;
  
  // The polynomial provided is excellent for the 0-800 range.
  // For the full 3000 range, we'll use a logarithmic extension to prevent the polynomial from diving.
  if (x > 800) {
    // Logarithmic fit for the upper range of Curve C
    return 35 * Math.log(x) - 130;
  }
  
  const y = (-6e-10 * Math.pow(x, 4)) + (1e-6 * Math.pow(x, 3)) - (0.0006 * Math.pow(x, 2)) + (0.2103 * x) + 9.9827;
  return Math.max(0, y);
};

// Approximations for other curves for visual context
const calculateGPM_A = (uh: number) => calculateGPM_C(uh) * 2.8;
const calculateGPM_B = (uh: number) => calculateGPM_C(uh) * 1.7;
const calculateGPM_D = (uh: number) => calculateGPM_C(uh) * 0.65;

interface WaterDemandCalculatorProps {
  initialData?: any;
  onExportPPT?: () => void;
}

export default function WaterDemandCalculator({ initialData, onExportPPT }: WaterDemandCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'hunter' | 'aspe'>('hunter');
  const [typologies, setTypologies] = useState<Typology[]>(INITIAL_TYPOLOGIES);
  const [uhConfig, setUhConfig] = useState<UHConfig[]>(INITIAL_UH_CONFIG);
  const [tempFinal, setTempFinal] = useState(55); // 55°C
  const [tempInlet, setTempInlet] = useState(17); // 17°C
  const [heaterPowerKW, setHeaterPowerKW] = useState(64);
  const [efficiency, setEfficiency] = useState(90);
  const [floors, setFloors] = useState(15);
  const [manualTotalApartments, setManualTotalApartments] = useState<number | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load initial data if provided
  React.useEffect(() => {
    if (initialData) {
      if (initialData.activeTab) setActiveTab(initialData.activeTab);
      if (initialData.typologies) setTypologies(initialData.typologies);
      if (initialData.uhConfig) setUhConfig(initialData.uhConfig);
      if (initialData.tempFinal) setTempFinal(initialData.tempFinal);
      if (initialData.tempInlet) setTempInlet(initialData.tempInlet);
      if (initialData.heaterPowerKW) setHeaterPowerKW(initialData.heaterPowerKW);
      if (initialData.efficiency) setEfficiency(initialData.efficiency);
      if (initialData.floors) setFloors(initialData.floors);
      if (initialData.manualTotalApartments !== undefined) setManualTotalApartments(initialData.manualTotalApartments);
      if (initialData.aspeQuantities) setAspeQuantities(initialData.aspeQuantities);
      if (initialData.aspeTempInitial) setAspeTempInitial(initialData.aspeTempInitial);
      if (initialData.aspeTempFinal) setAspeTempFinal(initialData.aspeTempFinal);
      if (initialData.heaters) setHeaters(initialData.heaters);
      if (initialData.selectedHeaterId) setSelectedHeaterId(initialData.selectedHeaterId);
      if (initialData.tankCapacity) setTankCapacity(initialData.tankCapacity);
    }
  }, [initialData]);

  // ASPE State
  const [aspeQuantities, setAspeQuantities] = useState<Record<string, number>>(
    Object.fromEntries(ASPE_FIXTURES.map(f => [f.id, 0]))
  );
  const [aspeTempInitial, setAspeTempInitial] = useState(15);
  const [aspeTempFinal, setAspeTempFinal] = useState(60);
  const [heaters, setHeaters] = useState(HEATER_PRODUCTS);
  const [selectedHeaterId, setSelectedHeaterId] = useState(HEATER_PRODUCTS[0].id);
  const [tankCapacity, setTankCapacity] = useState(500);
  const [isAddHeaterModalOpen, setIsAddHeaterModalOpen] = useState(false);
  const [newHeater, setNewHeater] = useState({ name: '', power: 199000, efficiency: 95 });

  const totals = useMemo(() => {
    let calculatedTotalApartments = 0;
    const fixtureTotals: { [key: string]: number } = {};
    
    uhConfig.forEach(config => {
      fixtureTotals[config.id] = 0;
    });

    typologies.forEach(t => {
      calculatedTotalApartments += t.count;
      Object.entries(t.fixtures).forEach(([fixtureId, count]) => {
        if (fixtureTotals[fixtureId] !== undefined) {
          fixtureTotals[fixtureId] += (count as number) * t.count;
        }
      });
    });

    const finalTotalApartments = manualTotalApartments !== null ? manualTotalApartments : calculatedTotalApartments;

    let totalUH = 0;
    uhConfig.forEach(config => {
      totalUH += (fixtureTotals[config.id] || 0) * config.hot;
    });

    const gpm = calculateGPM_C(totalUH);
    const gph = gpm * 60;
    const lph = gph * 3.78541;

    const deltaTC = tempFinal - tempInlet;
    const deltaTF = deltaTC * 1.8;
    const btuh = gph * deltaTF * 8.33;
    const requiredKW = btuh / 3412.142;

    const effectiveHeaterPower = heaterPowerKW * (efficiency / 100);
    const heaterCount = effectiveHeaterPower > 0 ? requiredKW / effectiveHeaterPower : 0;
    const msbKits = getMSBKits(heaterCount);

    return {
      fixtureTotals,
      totalApartments: finalTotalApartments,
      calculatedTotalApartments,
      totalUH,
      gpm,
      gph,
      lph,
      deltaTC,
      deltaTF,
      btuh,
      requiredKW,
      heaterCount,
      msbKits
    };
  }, [typologies, uhConfig, tempFinal, tempInlet, heaterPowerKW, efficiency, manualTotalApartments]);

  const enlargedChartData = useMemo(() => {
    const data = [];
    for (let i = 0; i <= 400; i += 20) {
      data.push({
        uh: i,
        curveA: calculateGPM_A(i),
        curveB: calculateGPM_B(i),
        curveC: calculateGPM_C(i),
        curveD: calculateGPM_D(i),
      });
    }
    return data;
  }, []);

  const fullChartData = useMemo(() => {
    const data = [];
    for (let i = 0; i <= 3000; i += 100) {
      data.push({
        uh: i,
        curveA: calculateGPM_A(i),
        curveB: calculateGPM_B(i),
        curveC: calculateGPM_C(i),
        curveD: calculateGPM_D(i),
      });
    }
    return data;
  }, []);

  // ASPE Calculations
  const aspeResults = useMemo(() => {
    const totalGph = ASPE_FIXTURES.reduce((sum, f) => sum + (aspeQuantities[f.id] || 0) * f.gph, 0);
    const deltaTC = aspeTempFinal - aspeTempInitial;
    const deltaTF = deltaTC * 1.8;
    const designLoadBtuh = totalGph * deltaTF * CONSTANTS.BTU_CONSTANT;
    
    const selectedHeater = heaters.find(p => p.id === selectedHeaterId) || heaters[0];
    const heatersNeeded = designLoadBtuh / (selectedHeater.power * selectedHeater.efficiency);
    
    const storageVolumeGallons = totalGph * 0.15;
    const storageVolumeLiters = storageVolumeGallons * CONSTANTS.GALLON_TO_LITER;
    const tanksNeeded = storageVolumeLiters / tankCapacity;
    const msbKits = getMSBKits(heatersNeeded);

    return {
      totalGph,
      deltaTC,
      deltaTF,
      designLoadBtuh,
      heatersNeeded,
      storageVolumeLiters,
      tanksNeeded,
      selectedHeater,
      msbKits
    };
  }, [aspeQuantities, aspeTempInitial, aspeTempFinal, selectedHeaterId, tankCapacity, heaters]);

  const handleAddHeater = () => {
    if (!newHeater.name) return;
    const id = `p-${Date.now()}`;
    setHeaters([...heaters, { 
      id, 
      name: newHeater.name, 
      power: newHeater.power, 
      efficiency: newHeater.efficiency / 100 
    }]);
    setSelectedHeaterId(id);
    setIsAddHeaterModalOpen(false);
    setNewHeater({ name: '', power: 199000, efficiency: 95 });
  };

  const handleUpdateTypology = (id: string, field: keyof Typology | string, value: number | string) => {
    setTypologies(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (field === 'name' || field === 'count') {
        return { ...t, [field]: value };
      }
      return {
        ...t,
        fixtures: {
          ...t.fixtures,
          [field]: value
        }
      };
    }));
  };

  const handleAddTypology = () => {
    const newId = `T-${Date.now()}`;
    const initialFixtures: { [key: string]: number } = {};
    uhConfig.forEach(c => { initialFixtures[c.id] = 0; });
    
    setTypologies(prev => [...prev, {
      id: newId,
      name: `Nueva ${prev.length + 1}`,
      count: 0,
      fixtures: initialFixtures
    }]);
  };

  const handleUpdateUHConfig = (id: string, field: 'total' | 'hot', value: number) => {
    setUhConfig(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleRemoveTypology = (id: string) => {
    setTypologies(prev => prev.filter(t => t.id !== id));
  };

  const handleExportExcel = () => {
    let dataToExport = [];
    if (activeTab === 'hunter') {
      dataToExport = typologies.map(t => ({
        Tipología: t.name,
        Cantidad: t.count,
        ...Object.fromEntries(
          Object.entries(t.fixtures).map(([id, count]) => [
            uhConfig.find(c => c.id === id)?.name || id,
            count
          ])
        )
      }));
      exportToExcel(dataToExport, 'Calculo_Demanda_Agua_Hunter', 'Tipologías');
    } else {
      dataToExport = ASPE_FIXTURES.map(f => ({
        Aparato: f.name,
        Cantidad: aspeQuantities[f.id] || 0,
        'GPH Unitario': f.gph,
        'GPH Total': (aspeQuantities[f.id] || 0) * f.gph
      }));
      exportToExcel(dataToExport, 'Calculo_Demanda_Agua_ASPE', 'Aparatos');
    }
    saveCalculationRecord('water_demand', 'export_excel', dataToExport, currentUser.email);
    toast.success('Excel exportado correctamente');
  };

  const handleExportPDF = async () => {
    const sections = activeTab === 'hunter' ? [
      { title: 'Tipologías y Aparatos Sanitarios', contentId: 'hunter-typologies' },
      { title: 'Curva Hunter (0-400 U.H.)', contentId: 'hunter-chart-small' },
      { title: 'Resultados del Cálculo', contentId: 'hunter-results' }
    ] : [
      { title: 'Inventario de Aparatos Sanitarios', contentId: 'aspe-fixtures' },
      { title: 'Resultados del Cálculo ASPE', contentId: 'aspe-results' }
    ];

    toast.promise(
      generateReportPDF(
        sections, 
        `Informe_Demanda_Agua_${activeTab.toUpperCase()}`, 
        `Informe de Dimensionamiento de ACS - Método ${activeTab.toUpperCase()}`,
        { engineer: currentUser.email, project: 'Cálculo de Demanda de Agua' }
      ),
      {
        loading: 'Generando informe PDF...',
        success: 'Informe PDF generado correctamente',
        error: 'Error al generar el PDF'
      }
    );
    saveCalculationRecord('water_demand', 'export_pdf', { sections, method: activeTab }, currentUser.email);
  };

  const handleExportPPT = async () => {
    toast.promise(
      exportToPPT('water-demand-container', `Calculo_Demanda_Agua_${activeTab.toUpperCase()}`, 'Dimensionamiento de Sistema Centralizado de ACS'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('water_demand', 'export_ppt', { module: 'water_demand', method: activeTab }, currentUser.email);
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    const dataToSave = {
      activeTab,
      typologies,
      uhConfig,
      tempFinal,
      tempInlet,
      heaterPowerKW,
      efficiency,
      floors,
      manualTotalApartments,
      aspeQuantities,
      aspeTempInitial,
      aspeTempFinal,
      selectedHeaterId,
      tankCapacity
    };
    localStorage.setItem('water_demand_data', JSON.stringify(dataToSave));
    
    try {
      const recordName = await generateModuleCorrelative('water_demand', details.projectName);
      
      await saveCalculationRecord(
        'water_demand', 
        'save', 
        { ...dataToSave, recordName }, 
        currentUser.email,
        recordName,
        details.sampleId,
        details.description
      );
      toast.success('Datos guardados localmente y en la base de datos');
    } catch (error) {
      console.error('Error saving water demand record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  return (
    <div id="water-demand-container" className="space-y-8 animate-in fade-in duration-500 bg-white p-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Dimensionamiento de Sistema Centralizado de ACS</h2>
          <div className="flex bg-slate-100 p-1 rounded-2xl self-start">
            <button 
              onClick={() => setActiveTab('hunter')}
              className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === 'hunter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              MÉTODO HUNTER
            </button>
            <button 
              onClick={() => setActiveTab('aspe')}
              className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${activeTab === 'aspe' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              MÉTODO ASPE
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {activeTab === 'hunter' && (
            <>
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Settings2 size={18} />
                <span className="hidden sm:inline">Configurar U.H.</span>
              </button>
              <button 
                onClick={handleAddTypology}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Añadir Tipología</span>
              </button>
            </>
          )}
        </div>
      </div>

      <ModuleActions 
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onExportPPT={handleExportPPT}
        title="Dimensionamiento de Agua Caliente"
      />

      {activeTab === 'hunter' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-2 xl:col-span-2 space-y-8">
          {/* Typologies Table */}
          <div id="hunter-typologies" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Calculator size={18} className="text-indigo-500" />
                Tipologías y Aparatos Sanitarios
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Dptos:</span>
                  <input 
                    type="number" 
                    value={totals.totalApartments}
                    onChange={(e) => setManualTotalApartments(parseInt(e.target.value) || 0)}
                    className="w-16 bg-indigo-50 border border-indigo-100 rounded-lg text-center text-sm font-black text-indigo-700 py-1 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  {manualTotalApartments !== null && (
                    <button 
                      onClick={() => setManualTotalApartments(null)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 underline"
                    >
                      Reiniciar
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-1 py-4 text-[9px] font-black text-slate-400 uppercase tracking-tight w-24">Tipología</th>
                    <th className="px-1 py-4 text-[9px] font-black text-slate-400 uppercase tracking-tight text-center">Cant. Dptos</th>
                    {uhConfig.map(config => (
                      <th key={config.id} className="px-1 py-4 text-[9px] font-black text-slate-400 uppercase tracking-tight text-center max-w-[60px] break-words">
                        {config.name}
                      </th>
                    ))}
                    <th className="px-1 py-4 text-[9px] font-black text-slate-400 uppercase tracking-tight text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {typologies.map((t) => (
                    <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-1 py-4 w-24">
                        <input 
                          type="text" 
                          value={t.name}
                          onChange={(e) => handleUpdateTypology(t.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        />
                      </td>
                      <td className="px-1 py-4">
                        <div className="flex justify-center">
                          <input 
                            type="number" 
                            value={t.count}
                            onChange={(e) => handleUpdateTypology(t.id, 'count', parseInt(e.target.value) || 0)}
                            className="w-10 bg-slate-100 border-none rounded-lg text-center text-xs font-bold text-slate-900 py-1 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      </td>
                      {uhConfig.map(config => (
                        <td key={config.id} className="px-1 py-4">
                          <div className="flex justify-center">
                            <input 
                              type="number" 
                              value={t.fixtures[config.id] || 0}
                              onChange={(e) => handleUpdateTypology(t.id, config.id, parseInt(e.target.value) || 0)}
                              className="w-10 bg-slate-100 border-none rounded-lg text-center text-xs font-bold text-slate-900 py-1 focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-1 py-4">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => handleRemoveTypology(t.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hunter Curve Visualizations */}
          <div className="space-y-8">
            {/* Enlarged Chart (0-400) */}
            <div id="hunter-chart-small" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Droplets size={18} className="text-blue-500" />
                  Sección Ampliada (0-400 U.H.)
                </h3>
                <div className="flex gap-6">
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total U.H.</span>
                    <span className="text-xl font-black text-slate-900">{totals.totalUH.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Caudal (GPM)</span>
                    <span className="text-xl font-black text-blue-600">{totals.gpm.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enlargedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="uh" 
                      type="number" 
                      domain={[0, 400]} 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => [
                        value.toFixed(2) + ' GPM', 
                        name === 'curveC' ? 'Curva C (Edificios de Aptos.)' : 
                        name === 'curveA' ? 'Curva A (Sistemas Públicos)' : 
                        name === 'curveB' ? 'Curva B (Edificios de Oficinas)' : 'Curva D (Viviendas Unifamiliares)'
                      ]}
                    />
                    <Line type="monotone" dataKey="curveA" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="curveB" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="curveD" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line 
                      type="monotone" 
                      dataKey="curveC" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                    />
                    {totals.totalUH <= 400 && (
                      <ReferenceDot 
                        x={totals.totalUH} 
                        y={totals.gpm} 
                        r={6} 
                        fill="#ef4444" 
                        stroke="#fff" 
                        strokeWidth={2} 
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Full Chart (0-3000) */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Droplets size={18} className="text-blue-500" />
                  Curvas Hunter ASHRAE (0-3000 U.H.)
                </h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fullChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="uh" 
                      type="number" 
                      domain={[0, 3000]} 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 500]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => [
                        value.toFixed(2) + ' GPM', 
                        name === 'curveC' ? 'Curva C (Edificios de Aptos.)' : 
                        name === 'curveA' ? 'Curva A (Sistemas Públicos)' : 
                        name === 'curveB' ? 'Curva B (Edificios de Oficinas)' : 'Curva D (Viviendas Unifamiliares)'
                      ]}
                    />
                    <Line type="monotone" dataKey="curveA" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="curveB" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="curveD" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                    <Line 
                      type="monotone" 
                      dataKey="curveC" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={false} 
                    />
                    <ReferenceDot 
                      x={totals.totalUH} 
                      y={totals.gpm} 
                      r={6} 
                      fill="#ef4444" 
                      stroke="#fff" 
                      strokeWidth={2} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Results */}
        <div className="space-y-8">
          {/* Design Parameters */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Settings2 size={18} className="text-slate-500" />
              Parámetros de Diseño
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Layers size={14} className="text-slate-500" />
                  Número de Pisos
                </label>
                <input 
                  type="number" 
                  value={floors}
                  onChange={(e) => setFloors(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer size={14} className="text-red-500" />
                    Temp. Final (°C)
                  </div>
                  <span className="text-indigo-500 font-bold">{(tempFinal * 1.8 + 32).toFixed(1)} °F</span>
                </label>
                <input 
                  type="number" 
                  value={tempFinal}
                  onChange={(e) => setTempFinal(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer size={14} className="text-blue-500" />
                    Temp. Ingreso (°C)
                  </div>
                  <span className="text-indigo-500 font-bold">{(tempInlet * 1.8 + 32).toFixed(1)} °F</span>
                </label>
                <input 
                  type="number" 
                  value={tempInlet}
                  onChange={(e) => setTempInlet(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diferencial ΔT</span>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-slate-900">{totals.deltaTC.toFixed(1)} °C</span>
                  <span className="text-[10px] font-bold text-indigo-500">{totals.deltaTF.toFixed(1)} °F</span>
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Flame size={14} className="text-orange-500" />
                  Potencia Calentador (kW)
                </label>
                <input 
                  type="number" 
                  value={heaterPowerKW}
                  onChange={(e) => setHeaterPowerKW(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Eficiencia (%)</label>
                <input 
                  type="number" 
                  value={efficiency}
                  onChange={(e) => setEfficiency(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div id="hunter-results" className="bg-indigo-600 rounded-[32px] shadow-xl shadow-indigo-600/20 p-8 text-white space-y-8">
            <h3 className="text-sm font-black text-indigo-200 uppercase tracking-widest flex items-center gap-2">
              <Calculator size={18} />
              Resultados del Cálculo
            </h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-1">Demanda Térmica</span>
                  <span className="text-2xl font-black">{totals.btuh.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTUH</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-indigo-100">{totals.requiredKW.toFixed(2)} kW</span>
                </div>
              </div>

              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-1">Caudal de Diseño</span>
                  <span className="text-2xl font-black">{totals.gpm.toFixed(2)} GPM</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-indigo-100">{totals.gph.toFixed(0)} GPH</span>
                </div>
              </div>

              <div className="pt-4">
                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-4">Equipamiento Requerido</span>
                <div className="bg-white/10 rounded-3xl p-6 border border-white/10 text-center">
                  <span className="text-5xl font-black block mb-2">{Math.ceil(totals.heaterCount)}</span>
                  <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Calentadores en Cascada</span>
                  
                  {totals.msbKits && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-3 text-left">
                      <div className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-2">Kits de Cascada MSB Requeridos:</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-100">MSB-M (Pack A)</span>
                        <span className="font-black text-white">{totals.msbKits.m}</span>
                      </div>
                      {totals.msbKits.c1 > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-indigo-100">MSB-C1 (Pack B)</span>
                          <span className="font-black text-white">{totals.msbKits.c1}</span>
                        </div>
                      )}
                      {totals.msbKits.c2 > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-indigo-100">MSB-C2 (Pack C)</span>
                          <span className="font-black text-white">{totals.msbKits.c2}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-[10px] font-medium text-indigo-100 italic">
                      Basado en {heaterPowerKW}kW nominal @ {efficiency}% de eficiencia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl flex items-start gap-3">
              <Info size={16} className="text-indigo-200 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-indigo-100 leading-relaxed">
                Este cálculo utiliza el Método de Hunter para estimar la demanda máxima simultánea según la Norma Técnica I.S. 010.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UH Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Configuración de Unidades Hunter</h3>
                <p className="text-slate-500 text-sm font-medium">Modifica los valores de U.H. para cada aparato sanitario</p>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto max-h-[60vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aparato Sanitario</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">U.H. Agua Total</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">U.H. Agua Caliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uhConfig.map((config) => (
                    <tr key={config.id}>
                      <td className="py-4 text-sm font-bold text-slate-700">{config.name}</td>
                      <td className="py-4">
                        <div className="flex justify-center">
                          <input 
                            type="number" 
                            step="0.01"
                            value={config.total}
                            onChange={(e) => handleUpdateUHConfig(config.id, 'total', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-bold text-slate-900 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-center">
                          <input 
                            type="number" 
                            step="0.01"
                            value={config.hot}
                            onChange={(e) => handleUpdateUHConfig(config.id, 'hot', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-indigo-50 border border-indigo-100 rounded-lg text-center text-sm font-bold text-indigo-700 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* ASPE Fixture Table */}
          <div id="aspe-fixtures" className="xl:col-span-2 space-y-8">
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid size={18} className="text-indigo-500" />
                  LISTA DE APARATOS DE AGUA CALIENTE (ASPE)
                </h3>
                <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Método de Carga Máxima Probable</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Aparatos</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Cant.</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">GPH</th>
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Total GPH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ASPE_FIXTURES.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-slate-700">{f.name}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="number" 
                            min="0"
                            value={aspeQuantities[f.id]}
                            onChange={(e) => setAspeQuantities({ ...aspeQuantities, [f.id]: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 text-center"
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-slate-500">{f.gph}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-black text-slate-900">
                            {((aspeQuantities[f.id] || 0) * f.gph).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={3} className="px-6 py-4 text-sm font-black uppercase tracking-widest">GPH de Diseño Total</td>
                      <td className="px-6 py-4 text-right text-lg font-black text-indigo-400">
                        {aspeResults.totalGph.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ASPE Design Parameters */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
                <Calculator size={18} className="text-indigo-500" />
                PARÁMETROS DE DISEÑO Y SELECCIÓN
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>T° Inicial (°C)</span>
                    <span className="text-indigo-500 font-bold">{(aspeTempInitial * 1.8 + 32).toFixed(1)} °F</span>
                  </label>
                  <input 
                    type="number" 
                    value={aspeTempInitial}
                    onChange={(e) => setAspeTempInitial(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>T° Final (°C)</span>
                    <span className="text-indigo-500 font-bold">{(aspeTempFinal * 1.8 + 32).toFixed(1)} °F</span>
                  </label>
                  <input 
                    type="number" 
                    value={aspeTempFinal}
                    onChange={(e) => setAspeTempFinal(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diferencial ΔT</label>
                  <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl flex flex-col justify-center">
                    <span className="text-sm font-black text-slate-900">{aspeResults.deltaTC.toFixed(1)} °C</span>
                    <span className="text-[10px] font-bold text-indigo-500">{aspeResults.deltaTF.toFixed(1)} °F</span>
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col justify-center border border-indigo-100">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Carga de Diseño</span>
                  <span className="text-xl font-black text-indigo-600">{aspeResults.designLoadBtuh.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTUh</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Calentador</label>
                    <button 
                      onClick={() => setIsAddHeaterModalOpen(true)}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={12} />
                      Añadir Modelo
                    </button>
                  </div>
                  <select 
                    value={selectedHeaterId}
                    onChange={(e) => setSelectedHeaterId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  >
                    {heaters.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.power.toLocaleString()} BTUh @ {(p.efficiency * 100).toFixed(0)}%)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacidad Tanque (L)</label>
                  <select 
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  >
                    <option value={500}>500 Litros</option>
                    <option value={1000}>1000 Litros</option>
                    <option value={1500}>1500 Litros</option>
                  </select>
                </div>
                <div id="aspe-results" className="bg-indigo-900 rounded-2xl p-6 text-white flex flex-col justify-center shadow-lg shadow-indigo-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-indigo-300" />
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Resultado de Selección</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black">{Math.ceil(aspeResults.heatersNeeded)}</span>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Calentadores</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-baseline">
                    <span className="text-xl font-black">{Math.ceil(aspeResults.tanksNeeded)}</span>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Tanques de {tankCapacity}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: ASPE Reference & Summary */}
          <div className="space-y-8">
            <div className="bg-slate-900 rounded-[32px] shadow-xl p-8 text-white">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Layers size={18} className="text-indigo-400" />
                RESUMEN DE DEPÓSITO
              </h3>
              <div className="space-y-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Volumen de Depósito (L)</div>
                  <div className="text-2xl font-black text-indigo-400">{aspeResults.storageVolumeLiters.toFixed(2)} L</div>
                  <div className="text-[10px] text-slate-500 mt-1 italic">Cálculo: GPH Diseño × 0.15 × 3.785</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">GPH Diseño</div>
                    <div className="text-lg font-black">{aspeResults.totalGph}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Delta T</div>
                    <div className="flex flex-col">
                      <span className="text-lg font-black">{aspeResults.deltaTC.toFixed(1)}°C</span>
                      <span className="text-xs font-bold text-indigo-400">{aspeResults.deltaTF.toFixed(1)}°F</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="flex items-center gap-3 text-indigo-400 mb-2">
                  <Info size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nota Técnica ASPE</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  El método ASPE utiliza el factor de demanda (0.15 para almacenamiento) para determinar el volumen necesario basado en el caudal máximo probable.
                </p>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-[32px] shadow-xl shadow-indigo-600/20 p-8 text-white">
              <h3 className="text-sm font-black text-indigo-200 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Flame size={18} />
                Fórmulas de Diseño
              </h3>
              <div className="bg-white/10 rounded-2xl p-6 border border-white/10 space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-xl font-black">BTUh = GPH × ΔT × 8.33</div>
                  <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Carga Térmica</div>
                </div>
                <div className="text-center space-y-2 pt-4 border-t border-white/10">
                  <div className="text-xl font-black">Vol = GPH × 0.15</div>
                  <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Volumen Depósito (Gal)</div>
                </div>
              </div>
            </div>
            
            {/* Diagram Placeholder */}
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Camera size={18} className="text-slate-500" />
                {activeTab === 'aspe' ? 'Esquema de Instalación (ASPE con Tanques)' : 'Esquema de Instalación (ASHRAE en Cascada)'}
              </h3>
              <div className="aspect-video bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden p-4">
                <img 
                  src={activeTab === 'aspe' 
                    ? "https://www.rinnai.us/sites/default/files/2020-05/commercial-rack-system-with-storage.png"
                    : "https://www.rinnai.us/sites/default/files/2020-05/msb-cascade-system.png"
                  } 
                  alt="Esquema de Instalación" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to a more relevant technical drawing if the Rinnai image fails
                    (e.target as HTMLImageElement).src = activeTab === 'aspe'
                      ? "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800"
                      : "https://images.unsplash.com/photo-1581094288338-2314dddb7edd?auto=format&fit=crop&q=80&w=800";
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-center italic">
                {activeTab === 'aspe' 
                  ? 'Representación típica de batería de calentadores con tanques de almacenamiento para método ASPE.'
                  : 'Representación típica de batería de calentadores en cascada MSB para método ASHRAE.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Heater Modal */}
      {isAddHeaterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Añadir Nuevo Modelo
              </h3>
              <button 
                onClick={() => setIsAddHeaterModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Modelo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Calentador Industrial 250k"
                  value={newHeater.name}
                  onChange={(e) => setNewHeater({ ...newHeater, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Potencia (BTUh)</label>
                  <input 
                    type="number" 
                    value={newHeater.power}
                    onChange={(e) => setNewHeater({ ...newHeater, power: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Eficiencia (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={newHeater.efficiency}
                    onChange={(e) => setNewHeater({ ...newHeater, efficiency: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setIsAddHeaterModalOpen(false)}
                className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddHeater}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                Guardar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
