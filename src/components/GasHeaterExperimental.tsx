import React, { useState, useMemo, useEffect } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Thermometer, 
  Droplets, 
  Flame, 
  Info, 
  Settings2,
  Mountain,
  Wind,
  Camera,
  ChevronRight,
  TrendingDown,
  BarChart3,
  ArrowLeft,
  Calculator
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Measurement {
  id: string;
  region: string;
  caudal: number; // L/min
  tempInitial: number; // °C
  tempFinal: number; // °C
  altitude: number; // msnm
  nominalPower: number; // kW
}

interface RegionData {
  name: string;
  altitude: number;
}

const REGIONS: RegionData[] = [
  { name: 'Lima 1', altitude: 0 },
  { name: 'Lima 2', altitude: 0 },
  { name: 'Lima', altitude: 4 },
  { name: 'Cuzco', altitude: 3400 },
  { name: 'Arequipa', altitude: 2335 },
  { name: 'Cajamarca', altitude: 2750 },
];

const CONSTANTS = {
  WATER_DENSITY: 1, // g/mL
  SPECIFIC_HEAT: 4.186, // J/g°C
  GAS_PRESSURE: 28, // mBar
  P0: 101.33, // kPa (Sea level pressure per Excel)
  SEA_LEVEL_EFFICIENCY: 0.90875, // Efficiency at sea level (36.35 / 40)
};

interface GasHeaterExperimentalProps {
  initialData?: any;
  onExportPPT?: () => void;
  onLoadRecord?: () => void;
}

export default function GasHeaterExperimental({ initialData, onExportPPT, onLoadRecord }: GasHeaterExperimentalProps) {
  const { user } = useAuth();
  const [view, setView] = useState<'main' | 'explanation'>('main');
  const [regionsData, setRegionsData] = useState<RegionData[]>(REGIONS);
  const [measurements, setMeasurements] = useState<Measurement[]>([
    { id: '1', region: 'Callao Medición 1', caudal: 26, tempInitial: 23.3, tempFinal: 43.3, altitude: 0, nominalPower: 40 },
    { id: '2', region: 'Callao Medición 2', caudal: 11.4, tempInitial: 15.3, tempFinal: 61, altitude: 0, nominalPower: 40 },
    { id: '3', region: 'Cuzco', caudal: 11.4, tempInitial: 16.1, tempFinal: 51.6, altitude: 3400, nominalPower: 40 },
  ]);

  const [theoreticalNominalPower, setTheoreticalNominalPower] = useState(40);
  const [gasType, setGasType] = useState<'GLP' | 'GN'>('GLP');
  const [theoreticalRegion, setTheoreticalRegion] = useState(REGIONS.find(r => r.name === 'Cajamarca') || REGIONS[0]);
  const [theoreticalDeltaT, setTheoreticalDeltaT] = useState(20);
  const [theoreticalCaudal, setTheoreticalCaudal] = useState(21.24);
  const [productDescription, setProductDescription] = useState<string>('Referencia visual de la placa técnica del calentador para verificar potencia nominal y tipo de gas.');
  const [productImage, setProductImage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      if (initialData.regionsData) setRegionsData(initialData.regionsData);
      if (initialData.measurements) setMeasurements(initialData.measurements);
      if (initialData.theoreticalNominalPower) setTheoreticalNominalPower(initialData.theoreticalNominalPower);
      if (initialData.gasType) setGasType(initialData.gasType);
      if (initialData.theoreticalRegion) setTheoreticalRegion(initialData.theoreticalRegion);
      if (initialData.theoreticalDeltaT) setTheoreticalDeltaT(initialData.theoreticalDeltaT);
      if (initialData.theoreticalCaudal) setTheoreticalCaudal(initialData.theoreticalCaudal);
      if (initialData.productDescription) setProductDescription(initialData.productDescription);
      if (initialData.productImage) setProductImage(initialData.productImage);
    }
  }, [initialData]);

  // Load saved data
  useEffect(() => {
    const savedMeasurements = localStorage.getItem('gas_heater_measurements');
    const savedRegions = localStorage.getItem('gas_heater_regions');
    const savedConfig = localStorage.getItem('gas_heater_config');
    
    if (savedMeasurements) {
      try {
        setMeasurements(JSON.parse(savedMeasurements));
      } catch (e) {
        console.error('Error loading gas heater measurements', e);
      }
    }
    if (savedRegions) {
      try {
        setRegionsData(JSON.parse(savedRegions));
      } catch (e) {
        console.error('Error loading gas heater regions', e);
      }
    }
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.gasType) setGasType(config.gasType);
        if (config.theoreticalNominalPower) setTheoreticalNominalPower(config.theoreticalNominalPower);
        if (config.productDescription) setProductDescription(config.productDescription);
        if (config.productImage) setProductImage(config.productImage);
      } catch (e) {
        console.error('Error loading gas heater config', e);
      }
    }
  }, []);

  const handleSaveData = async (details: { projectName: string; sampleId: string; description: string }) => {
    localStorage.setItem('gas_heater_measurements', JSON.stringify(measurements));
    localStorage.setItem('gas_heater_regions', JSON.stringify(regionsData));
    const config = {
      gasType,
      theoreticalNominalPower,
      productDescription,
      productImage
    };
    localStorage.setItem('gas_heater_config', JSON.stringify(config));
    
    try {
      const recordName = await generateModuleCorrelative('gas_heater_experimental', details.projectName);
      
      await saveCalculationRecord(
        'gas_heater_experimental', 
        'save', 
        { measurements, regionsData, ...config, recordName }, 
        user?.email || 'unknown',
        details.projectName,
        details.sampleId,
        details.description
      );
      toast.success('Datos y configuración guardados correctamente');
    } catch (error) {
      console.error('Error saving gas heater record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    let file: File | null = null;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }

    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, sube solo archivos de imagen');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProductImage(event.target.result as string);
          toast.success('Imagen de placa cargada correctamente');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportExcel = () => {
    const exportData = results.map(r => ({
      'Región / Medición': r.region,
      'Caudal (L/min)': r.caudal,
      'T° Inicial (°C)': r.tempInitial,
      'T° Final (°C)': r.tempFinal,
      'ΔT (°C)': r.deltaT.toFixed(2),
      'Altura (msnm)': r.altitude,
      'Potencia Real (kW)': r.realPower.toFixed(2),
      'Presión (kPa)': r.pressure.toFixed(2),
      'Incertidumbre (%)': r.uncertainty.toFixed(2),
      'Pérdida vs Lima (%)': r.lossVsLima.toFixed(2)
    }));

    exportToExcel(exportData, `Rendimiento_Gas_Heater_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('gas_heater_experimental', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'gas-heater-experimental', title: 'Método Experimental - Mediciones' },
      { contentId: 'gas-heater-chart', title: 'Gráfico Comparativo de Potencia' },
      { contentId: 'gas-heater-theoretical', title: 'Cálculo Teórico de Rendimiento' },
      { contentId: 'gas-heater-reference', title: 'Referencias y Fórmulas' }
    ];

    toast.promise(
      generateReportPDF(
        sections, 
        `Informe_Rendimiento_Gas_${format(new Date(), 'yyyyMMdd')}`, 
        'Informe de Rendimiento Térmico de Calentadores a Gas',
        { engineer: user?.email || 'unknown', project: 'Evaluación de Calentadores a Gas' }
      ),
      {
        loading: 'Generando informe PDF...',
        success: 'Informe PDF generado correctamente',
        error: 'Error al generar el PDF'
      }
    );
    saveCalculationRecord('gas_heater_experimental', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  const handleExportPPT = async () => {
    toast.promise(
      exportToPPT('gas-heater-container', `Reporte_Gas_Heater_${format(new Date(), 'yyyyMMdd')}`, 'Rendimiento Térmico de Calentadores a Gas'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('gas_heater_experimental', 'export_ppt', { module: 'gas_heater_experimental' }, user?.email || 'unknown');
  };

  const addMeasurement = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setMeasurements([...measurements, {
      id: newId,
      region: 'Nueva Región',
      caudal: 10,
      tempInitial: 20,
      tempFinal: 40,
      altitude: 0,
      nominalPower: 40
    }]);
  };

  const removeMeasurement = (id: string) => {
    setMeasurements(measurements.filter(m => m.id !== id));
  };

  const updateMeasurement = (id: string, field: keyof Measurement, value: any) => {
    setMeasurements(measurements.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const calculateAtmosphericPressure = (h: number) => {
    // P = P0 * (1 - 2.25577e-5 * h)^5.2559
    return CONSTANTS.P0 * Math.pow(1 - 2.25577e-5 * h, 5.2559);
  };

  const calculatePower = (caudal: number, deltaT: number) => {
    // Q = (m * ce * dT) / 60
    return (caudal * CONSTANTS.SPECIFIC_HEAT * deltaT) / 60;
  };

  const calculateUncertainty = (x: number) => {
    // Formula: y = -6E-10x^4 + 1E-06x^3 - 0.0006x^2 + 0.2103x + 9.9827
    return -6e-10 * Math.pow(x, 4) + 1e-6 * Math.pow(x, 3) - 0.0006 * Math.pow(x, 2) + 0.2103 * x + 9.9827;
  };

  const results = useMemo(() => {
    // Calculate baseline power as the average of all measurements below 100 msnm (Sea Level / Lima)
    const seaLevelMeasurements = measurements.filter(m => m.altitude < 100);
    const baselinePower = seaLevelMeasurements.length > 0
      ? seaLevelMeasurements.reduce((sum, m) => sum + calculatePower(m.caudal, m.tempFinal - m.tempInitial), 0) / seaLevelMeasurements.length
      : 0;
    
    return measurements.map(m => {
      const deltaT = m.tempFinal - m.tempInitial;
      const realPower = calculatePower(m.caudal, deltaT);
      const pressure = calculateAtmosphericPressure(m.altitude);
      const uncertainty = calculateUncertainty(realPower);
      const lossVsLima = baselinePower > 0 && m.altitude >= 100 
        ? ((realPower / baselinePower) - 1) * 100
        : 0;

      return {
        ...m,
        deltaT,
        realPower,
        pressure,
        uncertainty,
        lossVsLima
      };
    });
  }, [measurements]);

  const theoreticalPressure = calculateAtmosphericPressure(theoreticalRegion.altitude);
  // Power loss formula derived from Excel: P_alt = P_nom * Efficiency * (P_alt / P_sea)^0.6
  const theoreticalPower = theoreticalNominalPower * CONSTANTS.SEA_LEVEL_EFFICIENCY * Math.pow(theoreticalPressure / CONSTANTS.P0, 0.6);
  const theoreticalAvailablePower = theoreticalPower;

  const handleTheoreticalRegionChange = (regionName: string) => {
    const region = regionsData.find(r => r.name === regionName) || regionsData[0];
    setTheoreticalRegion(region);
    const pressure = calculateAtmosphericPressure(region.altitude);
    const availablePower = theoreticalNominalPower * CONSTANTS.SEA_LEVEL_EFFICIENCY * Math.pow(pressure / CONSTANTS.P0, 0.6);
    if (theoreticalDeltaT > 0) {
      const newCaudal = (availablePower * 60) / (CONSTANTS.SPECIFIC_HEAT * theoreticalDeltaT);
      setTheoreticalCaudal(parseFloat(newCaudal.toFixed(2)));
    }
  };

  const updateRegionData = (index: number, field: keyof RegionData, value: string | number) => {
    const newRegions = [...regionsData];
    newRegions[index] = { ...newRegions[index], [field]: value };
    setRegionsData(newRegions);
    
    // If the edited region is the one selected in theoretical, update it
    if (theoreticalRegion.name === regionsData[index].name) {
      setTheoreticalRegion(newRegions[index]);
      // Recalculate if altitude changed
      if (field === 'altitude') {
        const pressure = calculateAtmosphericPressure(value as number);
        const availablePower = theoreticalNominalPower * CONSTANTS.SEA_LEVEL_EFFICIENCY * Math.pow(pressure / CONSTANTS.P0, 0.6);
        if (theoreticalDeltaT > 0) {
          const newCaudal = (availablePower * 60) / (CONSTANTS.SPECIFIC_HEAT * theoreticalDeltaT);
          setTheoreticalCaudal(parseFloat(newCaudal.toFixed(2)));
        }
      }
    }
  };

  const handleTheoreticalNominalPowerChange = (val: number) => {
    setTheoreticalNominalPower(val);
    const pressure = calculateAtmosphericPressure(theoreticalRegion.altitude);
    const availablePower = val * CONSTANTS.SEA_LEVEL_EFFICIENCY * Math.pow(pressure / CONSTANTS.P0, 0.6);
    if (theoreticalDeltaT > 0) {
      const newCaudal = (availablePower * 60) / (CONSTANTS.SPECIFIC_HEAT * theoreticalDeltaT);
      setTheoreticalCaudal(parseFloat(newCaudal.toFixed(2)));
    }
  };

  const handleTheoreticalDeltaTChange = (val: number) => {
    setTheoreticalDeltaT(val);
    if (val > 0) {
      const pressure = calculateAtmosphericPressure(theoreticalRegion.altitude);
      const availablePower = theoreticalNominalPower * CONSTANTS.SEA_LEVEL_EFFICIENCY * Math.pow(pressure / CONSTANTS.P0, 0.6);
      const newCaudal = (availablePower * 60) / (CONSTANTS.SPECIFIC_HEAT * val);
      setTheoreticalCaudal(parseFloat(newCaudal.toFixed(2)));
    }
  };

  const chartData = results.map(m => ({
    name: m.region,
    power: parseFloat(m.realPower.toFixed(2)),
    uncertainty: parseFloat(m.uncertainty.toFixed(2)),
    altitude: m.altitude
  })).sort((a, b) => a.altitude - b.altitude);

  const maxPowerResult = results.length > 0 
    ? results.reduce((max, r) => r.realPower > max.realPower ? r : max, results[0])
    : null;

  const minPowerResult = results.length > 0
    ? results.reduce((min, r) => r.realPower < min.realPower ? r : min, results[0])
    : null;

  if (view === 'explanation') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setView('main')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al Panel
        </button>

        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-6 backdrop-blur-md">
              <Info size={32} />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-2">Explicación del Cálculo de Incertidumbre</h2>
            <p className="text-blue-100 font-medium">Metodología aplicada para determinar la variabilidad en la medición de potencia real.</p>
          </div>

          <div className="p-10 space-y-10">
            <section className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Calculator size={18} className="text-blue-500" />
                La Ecuación de Regresión
              </h3>
              <p className="text-slate-600 leading-relaxed">
                La incertidumbre no es un valor constante; depende directamente de la potencia de operación del equipo. 
                Para este modelo, se ha determinado una curva de ajuste mediante una regresión polinómica de cuarto grado:
              </p>
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center">
                <div className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                  y = -6E-10x⁴ + 1E-06x³ - 0.0006x² + 0.2103x + 9.9827
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ecuación de Incertidumbre (%)</p>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-blue-50 p-8 rounded-[32px] border border-blue-100">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4">Variable Independiente (x)</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Representa la <strong>Potencia Real (kW)</strong> calculada en cada medición. A medida que la potencia varía, la incertidumbre se ajusta dinámicamente según el comportamiento observado en pruebas controladas.
                </p>
              </div>
              <div className="bg-indigo-50 p-8 rounded-[32px] border border-indigo-100">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">Variable Dependiente (y)</h4>
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Es el <strong>Porcentaje de Incertidumbre (%)</strong>. Este valor indica el margen de error esperado en la medición, considerando factores de repetibilidad y precisión del instrumental.
                </p>
              </div>
            </section>

            <section className="space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">¿Por qué usar una regresión de 4to grado?</h3>
              <p className="text-slate-600 leading-relaxed">
                Los sistemas térmicos a gas presentan comportamientos no lineales. Una regresión de cuarto grado permite capturar con mayor precisión las fluctuaciones de error en los extremos de operación (bajas y altas potencias) y en el rango nominal, proporcionando un dato de confianza mucho más ajustado a la realidad física del ensayo.
              </p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="gas-heater-container" className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto bg-white">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 shrink-0">
              <FlaskConical size={24} />
            </div>
            Rendimiento Térmico de Calentadores a Gas
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Análisis de rendimiento térmico basado en mediciones reales y altitud.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={addMeasurement}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={20} />
            Nueva Medición
          </button>
          <ModuleActions 
            onSave={handleSaveData}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={handleExportPPT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Experimental Measurements Table */}
        <div className="lg:col-span-2 xl:col-span-2 space-y-8">
          <div id="gas-heater-experimental" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={18} className="text-blue-500" />
                MÉTODO EXPERIMENTAL
              </h3>
              <div className="flex gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Densidad: {CONSTANTS.WATER_DENSITY} g/mL</span>
                <span>Ce H2O: {CONSTANTS.SPECIFIC_HEAT} J/g°C</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Región / Medición</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Caudal (L/min)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">T° Inicial (°C)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">T° Final (°C)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Altura (msnm)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Potencia Real (kW)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <button 
                        onClick={() => setView('explanation')}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors group"
                      >
                        Incertidumbre (%)
                        <Info size={12} className="text-slate-300 group-hover:text-blue-400" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pérdida vs Lima</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 min-w-[200px]">
                        <input 
                          type="text" 
                          value={m.region}
                          onChange={(e) => updateMeasurement(m.id, 'region', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 text-sm min-w-[180px]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Droplets size={14} className="text-blue-400" />
                          <input 
                            type="number" 
                            value={m.caudal}
                            onChange={(e) => updateMeasurement(m.id, 'caudal', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Thermometer size={14} className="text-blue-400" />
                          <input 
                            type="number" 
                            value={m.tempInitial}
                            onChange={(e) => updateMeasurement(m.id, 'tempInitial', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Thermometer size={14} className="text-red-400" />
                          <input 
                            type="number" 
                            value={m.tempFinal}
                            onChange={(e) => updateMeasurement(m.id, 'tempFinal', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mountain size={14} className="text-slate-400" />
                          <input 
                            type="number" 
                            value={m.altitude}
                            onChange={(e) => updateMeasurement(m.id, 'altitude', parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-100/50 border-none rounded-lg px-2 py-1 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900">{m.realPower.toFixed(2)} kW</span>
                          <span className="text-[10px] font-bold text-slate-400">{m.pressure.toFixed(2)} kPa</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-indigo-600">±{m.uncertainty.toFixed(2)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        {m.lossVsLima < 0 ? (
                          <div className="flex items-center gap-1 text-red-600 font-black text-sm">
                            <TrendingDown size={14} />
                            {m.lossVsLima.toFixed(2)}%
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeMeasurement(m.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Section */}
          <div id="gas-heater-chart" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
              <BarChart3 size={18} className="text-blue-500" />
              COMPARATIVA DE POTENCIA REAL POR ALTITUD
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Potencia (kW)', angle: -90, position: 'insideLeft', style: { fontWeight: 'bold', fill: '#64748b' } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#6366f1" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Incertidumbre (%)', angle: 90, position: 'insideRight', style: { fontWeight: 'bold', fill: '#6366f1' } }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Bar yAxisId="left" dataKey="power" name="Potencia Real (kW)" radius={[8, 8, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.altitude > 0 ? '#3b82f6' : '#10b981'} />
                    ))}
                  </Bar>
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="uncertainty" 
                    name="Incertidumbre (%)" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel del Mar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Altura</span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {maxPowerResult && (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Flame size={80} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Máxima Potencia Real</h4>
                      <p className="text-2xl font-black">{maxPowerResult.region}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-3xl p-5 backdrop-blur-md border border-white/5">
                      <span className="block text-blue-200 text-[9px] font-black uppercase tracking-wider mb-1">Altitud</span>
                      <span className="text-2xl font-black">{maxPowerResult.altitude} <span className="text-[10px] font-medium opacity-60">msnm</span></span>
                    </div>
                    <div className="bg-white/10 rounded-3xl p-5 backdrop-blur-md border border-white/20 ring-1 ring-white/10">
                      <span className="block text-blue-200 text-[9px] font-black uppercase tracking-wider mb-1">Potencia</span>
                      <span className="text-2xl font-black text-white">
                        {maxPowerResult.realPower.toFixed(2)} 
                        <span className="text-[10px] font-medium opacity-70 ml-1">kW</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {minPowerResult && (
              <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingDown size={80} className="text-slate-900" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Mínima Potencia Real</h4>
                      <p className="text-2xl font-black text-slate-900">{minPowerResult.region}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                      <span className="block text-slate-400 text-[9px] font-black uppercase tracking-wider mb-1">Altitud</span>
                      <span className="text-2xl font-black text-slate-700">{minPowerResult.altitude} <span className="text-[10px] font-medium opacity-40">msnm</span></span>
                    </div>
                    <div className="bg-slate-900 rounded-3xl p-5 shadow-lg shadow-slate-200">
                      <span className="block text-slate-500 text-[9px] font-black uppercase tracking-wider mb-1">Potencia</span>
                      <span className="text-2xl font-black text-white">
                        {minPowerResult.realPower.toFixed(2)} 
                        <span className="text-[10px] font-medium opacity-50 ml-1">kW</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theoretical Table */}
          <div id="gas-heater-theoretical" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Info size={18} className="text-indigo-500" />
                TABLA DE PRUEBA - TEÓRICO
              </h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Fórmula: Q = m × ce × ΔT
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pot. Nominal (kW)</label>
                <input 
                  type="number" 
                  value={theoreticalNominalPower}
                  onChange={(e) => handleTheoreticalNominalPowerChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Región</label>
                <select 
                  value={theoreticalRegion.name}
                  onChange={(e) => handleTheoreticalRegionChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                >
                  {regionsData.map(r => (
                    <option key={r.name} value={r.name}>{r.name} ({r.altitude} msnm)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ΔTemp (°C)</label>
                <input 
                  type="number" 
                  value={theoreticalDeltaT}
                  onChange={(e) => handleTheoreticalDeltaTChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Caudal (L/min)</label>
                <input 
                  type="number" 
                  value={theoreticalCaudal}
                  onChange={(e) => setTheoreticalCaudal(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
              <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col justify-center border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Potencia Teórica</span>
                <span className="text-xl font-black text-indigo-600">{theoreticalPower.toFixed(2)} kW</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] font-bold text-indigo-300">{theoreticalPressure.toFixed(2)} kPa</span>
                  <span className="text-[10px] font-bold text-indigo-400">Disp: {theoreticalAvailablePower.toFixed(2)} kW</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Nameplate & Reference Data */}
        <div id="gas-heater-reference" className="space-y-8">
          {/* Nameplate Section */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Camera size={18} className="text-slate-500" />
              Etiqueta del Calentador
            </h3>
            
            <div 
              className={`aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden relative group ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleImageUpload}
              onClick={() => document.getElementById('heater-image-upload')?.click()}
            >
              <input 
                id="heater-image-upload"
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
              />
              
              {productImage ? (
                <div className="relative h-full w-full">
                  <img 
                    src={productImage} 
                    alt="Placa del Calentador" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                    <Camera size={24} className="text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar Imagen</span>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-wider">Subir foto de placa</span>
                  <p className="text-[10px] mt-1 opacity-60">Arrastra o haz clic aquí</p>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción / Notas del Equipo</label>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  placeholder="Ingrese detalles del modelo, marca o condiciones de la placa..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                />
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Potencia Nominal</span>
                <div className="flex items-center gap-1">
                  <input 
                    type="number"
                    value={theoreticalNominalPower}
                    onChange={(e) => handleTheoreticalNominalPowerChange(parseFloat(e.target.value) || 0)}
                    className="bg-transparent border-none focus:ring-0 text-sm font-black text-slate-900 p-0 w-12 text-right"
                  />
                  <span className="text-sm font-black text-slate-900">kW</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Gas</span>
                <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setGasType('GLP')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${
                      gasType === 'GLP' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    GLP
                  </button>
                  <button
                    onClick={() => setGasType('GN')}
                    className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${
                      gasType === 'GN' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    GN
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reference Altitudes */}
          <div className="bg-slate-900 rounded-[32px] shadow-xl p-8 text-white">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Mountain size={18} className="text-blue-400" />
              Alturas de Referencia
            </h3>
            <div className="space-y-4">
              {regionsData.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between group gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <input 
                      type="text"
                      value={r.name}
                      onChange={(e) => updateRegionData(idx, 'name', e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-300 hover:text-white transition-colors p-0 w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      value={r.altitude}
                      onChange={(e) => updateRegionData(idx, 'altitude', parseFloat(e.target.value) || 0)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-black text-slate-500 hover:text-blue-400 transition-colors p-0 w-16 text-right"
                    />
                    <span className="text-[10px] font-black text-slate-600 uppercase">msnm</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <Wind size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Presión Atmosférica</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                La potencia real disminuye con la altitud debido a la menor densidad del aire y presión atmosférica.
              </p>
            </div>
          </div>

          {/* Formula Reference */}
          <div className="bg-blue-600 rounded-[32px] shadow-xl shadow-blue-600/20 p-8 text-white">
            <h3 className="text-sm font-black text-blue-200 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Flame size={18} />
              Cálculo de Potencia
            </h3>
            <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
              <div className="text-center space-y-2">
                <div className="text-2xl font-black">Q = m · ce · ΔT</div>
                <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Ecuación Fundamental</div>
              </div>
              <div className="mt-6 space-y-2 text-[10px] font-bold text-blue-100">
                <div className="flex justify-between">
                  <span>m (masa)</span>
                  <span>Caudal (L/min)</span>
                </div>
                <div className="flex justify-between">
                  <span>ce (calor esp.)</span>
                  <span>4.186 J/g°C</span>
                </div>
                <div className="flex justify-between">
                  <span>ΔT (dif. temp)</span>
                  <span>Tf - Ti</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-[9px] font-black text-blue-200 uppercase mb-2">Incertidumbre de Medición</div>
                  <div className="text-[11px] font-mono leading-tight">
                    y = -6E-10x⁴ + 1E-06x³ - 0.0006x² + 0.2103x + 9.9827
                  </div>
                  <div className="text-[8px] text-blue-200 mt-1 italic">Donde x es la Potencia Real (kW)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
