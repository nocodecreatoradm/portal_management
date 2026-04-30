import React, { useState, useMemo } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Ruler, 
  Wind, 
  Settings2, 
  Info,
  ChevronRight,
  Calculator,
  RefreshCw,
  Download,
  Flame,
  FileText,
  Maximize2,
  X
} from 'lucide-react';
import ModuleActions from './ModuleActions';
import { generateReportPDF, exportToExcel, exportToPPT } from '../lib/exportUtils';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { currentUser } from '../data/mockData';
import { toast } from 'sonner';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const PIPE_MATERIALS = [
  { name: 'Cobre', k: 385 },
  { name: 'Acero al carbono', k: 45 },
  { name: 'Acero inoxidable', k: 16 },
  { name: 'PPR', k: 0.22 },
  { name: 'CPVC', k: 0.14 },
  { name: 'PEX', k: 0.35 },
  { name: 'HDPE', k: 0.45 },
];

const INSULATION_MATERIALS = [
  { name: 'Sin aislamiento', k: 0 },
  { name: 'Elastomérico', k: 0.038 },
  { name: 'Poliuretano', k: 0.025 },
  { name: 'Lana mineral', k: 0.040 },
];

interface PipeParams {
  Tin: number; // Inlet temperature (°C)
  Tamb: number; // Ambient temperature (°C)
  length: number; // Length (m)
  flowLmin: number; // Flow rate (L/min)
  di: number; // Inner diameter (mm)
  eTubo: number; // Pipe thickness (mm)
  materialTubo: string;
  eAisl: number; // Insulation thickness (mm)
  materialAisl: string;
  hi: number; // Internal film coefficient (W/m2.K)
  ho: number; // External film coefficient (W/m2.K)
}

const DEFAULT_PARAMS: PipeParams = {
  Tin: 50,
  Tamb: 29.5,
  length: 5,
  flowLmin: 2.94,
  di: 12,
  eTubo: 1.8,
  materialTubo: 'Cobre',
  eAisl: 0,
  materialAisl: 'Sin aislamiento',
  hi: 1000,
  ho: 8
};

export default function TemperatureLossCalculator({ onExportPPT }: { onExportPPT?: () => void }) {
  const [params, setParams] = useState<PipeParams>(DEFAULT_PARAMS);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);

  const results = useMemo(() => {
    const { Tin, Tamb, length, flowLmin, di, eTubo, materialTubo, eAisl, materialAisl, hi, ho } = params;
    const PI = Math.PI;
    const cp = 4186;

    // Step 1: Radii (m)
    const ri = (di / 2) / 1000;
    const ro = ri + (eTubo / 1000);
    const raisl = ro + (eAisl / 1000);

    // Step 2: Thermal conductivities
    const kTubo = PIPE_MATERIALS.find(m => m.name === materialTubo)?.k || 0.1;
    const kAisl = INSULATION_MATERIALS.find(m => m.name === materialAisl)?.k || 0.04;

    // Step 3: Thermal resistances per meter
    const Ri = 1 / (hi * 2 * PI * ri);
    const Rtubo = Math.log(ro / ri) / (2 * PI * kTubo);
    const Raisl = eAisl > 0 ? Math.log(raisl / ro) / (2 * PI * kAisl) : 0;
    const Ro = 1 / (ho * 2 * PI * raisl);

    const Rtot = Ri + Rtubo + Raisl + Ro;

    // Step 4: Mass flow rate (kg/s)
    const m_dot = flowLmin / 60;

    // Step 5: Outlet temperature
    const exponent = -length / (m_dot * cp * Rtot);
    const Tout = Tamb + (Tin - Tamb) * Math.exp(exponent);

    // Step 6: Losses
    const totalLoss = Tin - Tout;
    const avgLossPerMeter = totalLoss / length;

    // Generate chart data
    const chartData = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const currentL = (length / steps) * i;
      const currentTout = Tamb + (Tin - Tamb) * Math.exp(-currentL / (m_dot * cp * Rtot));
      chartData.push({
        distance: currentL.toFixed(1),
        temp: parseFloat(currentTout.toFixed(2))
      });
    }

    return {
      ri, ro, raisl,
      Ri, Rtubo, Raisl, Ro, Rtot,
      m_dot,
      Tout,
      totalLoss,
      avgLossPerMeter,
      chartData
    };
  }, [params]);

  const handleParamChange = (key: keyof PipeParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    toast.success('Parámetros restablecidos');
  };

  const handleExportExcel = () => {
    const data = [
      { Parámetro: 'Temperatura ingreso (Tin)', Valor: params.Tin, Unidad: '°C' },
      { Parámetro: 'Temperatura ambiente (Tamb)', Valor: params.Tamb, Unidad: '°C' },
      { Parámetro: 'Longitud (L)', Valor: params.length, Unidad: 'm' },
      { Parámetro: 'Caudal (Q)', Valor: params.flowLmin, Unidad: 'L/min' },
      { Parámetro: 'Caudal másico (ṁ)', Valor: results.m_dot, Unidad: 'Kg/s' },
      { Parámetro: 'Diámetro interno (di)', Valor: params.di, Unidad: 'mm' },
      { Parámetro: 'Espesor tubo (e_tubo)', Valor: params.eTubo, Unidad: 'mm' },
      { Parámetro: 'Material Tubo', Valor: params.materialTubo, Unidad: '-' },
      { Parámetro: 'Espesor aislamiento (e_aisl)', Valor: params.eAisl, Unidad: 'mm' },
      { Parámetro: 'Material Aislamiento', Valor: params.materialAisl, Unidad: '-' },
      { Parámetro: 'Coef. película interno (hi)', Valor: params.hi, Unidad: 'W/m2.K' },
      { Parámetro: 'Coef. película externo (ho)', Valor: params.ho, Unidad: 'W/m2.K' },
      { Parámetro: 'Temperatura salida (Tout)', Valor: results.Tout, Unidad: '°C' },
      { Parámetro: 'Pérdida total (ΔT)', Valor: results.totalLoss, Unidad: '°C' },
      { Parámetro: 'Pérdida promedio por metro', Valor: results.avgLossPerMeter, Unidad: '°C/m' }
    ];
    exportToExcel(data, 'Calculo_Perdida_Temperatura', 'Resultados');
    saveCalculationRecord('temperature_loss', 'export_excel', data, currentUser.email);
  };

  const handleExportPDF = async () => {
    const sections = [
      { title: 'Parámetros de Entrada', contentId: 'input-params' },
      { title: 'Resultados del Cálculo', contentId: 'calc-results' },
      { title: 'Fórmulas Aplicadas', contentId: 'formulas-section' }
    ];

    toast.promise(
      generateReportPDF(
        sections,
        'Informe_Perdida_Temperatura',
        'Cálculo de Pérdida de Temperatura en Tuberías',
        { engineer: currentUser.email, project: 'Dimensionamiento de ACS' }
      ),
      {
        loading: 'Generando informe PDF...',
        success: 'Informe PDF generado correctamente',
        error: 'Error al generar el PDF'
      }
    );
    saveCalculationRecord('temperature_loss', 'export_pdf', { params, results }, currentUser.email);
  };

  const handleExportPPT = async () => {
    toast.promise(
      exportToPPT('temperature-loss-container', 'Calculo_Perdida_Temperatura', 'Pérdida de Temperatura en Tuberías'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('temperature_loss', 'export_ppt', { module: 'temperature_loss' }, currentUser.email);
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    try {
      const recordName = await generateModuleCorrelative('temperature_loss', details.projectName);
      
      await saveCalculationRecord(
        'temperature_loss', 
        'save', 
        { params, results, recordName }, 
        currentUser.email,
        recordName,
        details.sampleId,
        details.description
      );
      toast.success('Cálculo guardado correctamente');
    } catch (error) {
      console.error('Error saving temperature loss record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  return (
    <div id="temperature-loss-container" className="space-y-8 animate-in fade-in duration-500 bg-white p-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Pérdida de Temperatura en Tuberías</h2>
          <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Modelo térmico avanzado para enfriamiento de agua caliente</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw size={18} />
            Restablecer
          </button>
        </div>
      </div>

      <ModuleActions 
        onSave={handleSave}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onExportPPT={handleExportPPT}
        title="Pérdida de Temperatura"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Parameters */}
        <div id="input-params" className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={18} className="text-indigo-500" />
                Parámetros de Entrada
              </h3>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Temperaturas */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Thermometer size={14} className="text-red-500" />
                  Temp. Ingreso (Tin) [°C]
                </label>
                <input 
                  type="number" 
                  value={params.Tin}
                  onChange={(e) => handleParamChange('Tin', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Thermometer size={14} className="text-blue-500" />
                  Temp. Ambiente (Tamb) [°C]
                </label>
                <input 
                  type="number" 
                  value={params.Tamb}
                  onChange={(e) => handleParamChange('Tamb', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              {/* Recorrido y Caudal */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Ruler size={14} className="text-slate-500" />
                  Longitud Total (L) [m]
                </label>
                <input 
                  type="number" 
                  value={params.length}
                  onChange={(e) => handleParamChange('length', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Droplets size={14} className="text-blue-500" />
                  Caudal (Q) [L/min]
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={params.flowLmin}
                  onChange={(e) => handleParamChange('flowLmin', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
                <div className="text-[10px] text-slate-400 italic px-1">
                  Caudal másico: {results.m_dot.toFixed(4)} Kg/s
                </div>
              </div>

              {/* Tubería */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calculator size={14} className="text-indigo-500" />
                  Diámetro Interno (di) [mm]
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={params.di}
                  onChange={(e) => handleParamChange('di', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calculator size={14} className="text-indigo-500" />
                  Espesor Tubo (e_tubo) [mm]
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={params.eTubo}
                  onChange={(e) => handleParamChange('eTubo', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Material de la Tubería
                </label>
                <select 
                  value={params.materialTubo}
                  onChange={(e) => handleParamChange('materialTubo', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                >
                  {PIPE_MATERIALS.map(m => (
                    <option key={m.name} value={m.name}>{m.name} (k={m.k} W/m·K)</option>
                  ))}
                </select>
              </div>

              {/* Aislamiento */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Espesor Aislamiento [mm]
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  value={params.eAisl}
                  onChange={(e) => handleParamChange('eAisl', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Material Aislamiento
                </label>
                <select 
                  value={params.materialAisl}
                  onChange={(e) => handleParamChange('materialAisl', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                >
                  {INSULATION_MATERIALS.map(m => (
                    <option key={m.name} value={m.name}>{m.name} {m.k > 0 ? `(k=${m.k} W/m·K)` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Coeficientes de película */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Coef. Película Interno (hi)
                </label>
                <input 
                  type="number" 
                  value={params.hi}
                  onChange={(e) => handleParamChange('hi', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  Coef. Película Externo (ho)
                </label>
                <input 
                  type="number" 
                  value={params.ho}
                  onChange={(e) => handleParamChange('ho', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Formulas Display Section */}
          <div id="formulas-section" className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                Fórmulas y Cálculo Paso a Paso
              </h3>
            </div>
            <div className="p-8 space-y-10">
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Paso 1: Radios de la Tubería</h4>
                <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Interno</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`r_i = \\frac{d_i}{2} = ${(results.ri * 1000).toFixed(2)} \\text{ mm}`} />
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Externo</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`r_o = r_i + e_{tubo} = ${(results.ro * 1000).toFixed(2)} \\text{ mm}`} />
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Aislamiento</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`r_{aisl} = r_o + e_{aisl} = ${(results.raisl * 1000).toFixed(2)} \\text{ mm}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Paso 2: Resistencia Térmica por Metro</h4>
                <div className="bg-slate-50 p-6 rounded-2xl space-y-6">
                  <div className="text-center py-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <BlockMath math="R'_{tot} = R'_i + R'_{tubo} + R'_{aisl} + R'_o" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Convección interna</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`R'_i = \\frac{1}{h_i \\cdot 2\\pi \\cdot r_i} = ${results.Ri.toFixed(6)} \\text{ K}\\cdot\\text{m/W}`} />
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Conducción tubo</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`R'_{tubo} = \\frac{\\ln(r_o/r_i)}{2\\pi \\cdot k_{tubo}} = ${results.Rtubo.toFixed(6)} \\text{ K}\\cdot\\text{m/W}`} />
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Conducción aislante</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`R'_{aisl} = \\frac{\\ln(r_{aisl}/r_o)}{2\\pi \\cdot k_{aisl}} = ${results.Raisl.toFixed(6)} \\text{ K}\\cdot\\text{m/W}`} />
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Convección externa</p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <BlockMath math={`R'_o = \\frac{1}{h_o \\cdot 2\\pi \\cdot r_{aisl}} = ${results.Ro.toFixed(6)} \\text{ K}\\cdot\\text{m/W}`} />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl text-center shadow-lg shadow-indigo-200 overflow-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Resistencia Total</p>
                    <div className="overflow-x-auto hide-scrollbar">
                      <BlockMath math={`R'_{tot} = ${results.Rtot.toFixed(6)} \\text{ K}\\cdot\\text{m/W}`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-red-500 pl-3">Paso 3: Temperatura de Salida</h4>
                <div className="bg-slate-50 p-8 rounded-2xl space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center overflow-hidden">
                    <div className="overflow-x-auto hide-scrollbar">
                      <BlockMath math="T_{out} = T_{amb} + (T_{in} - T_{amb}) \exp\left(-\frac{L}{\dot{m} \cdot c_p \cdot R'_{tot}}\right)" />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      <InlineMath math={`c_p = 4186 \\text{ J/kg}\\cdot\\text{K}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      <InlineMath math={`\\dot{m} = ${results.m_dot.toFixed(4)} \\text{ kg/s}`} />
                    </div>
                  </div>
                  <div className="p-6 bg-red-600 text-white rounded-3xl text-center shadow-xl shadow-red-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">Resultado Final</p>
                    <div className="text-3xl font-black">
                      <InlineMath math={`T_{out} = ${results.Tout.toFixed(2)} \\text{ °C}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div id="calc-results" className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-slate-900 rounded-[32px] shadow-xl p-8 text-white flex flex-col h-full">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-8">
              <Calculator size={18} className="text-blue-400" />
              Resumen de Resultados
            </h3>

            <div className="space-y-8 flex-1">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Temperatura Final</span>
                <span className="text-5xl font-black text-blue-400">{results.Tout.toFixed(2)} °C</span>
                <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
                  <ChevronRight size={16} />
                  <span className="text-sm font-bold">Pérdida Total: {results.totalLoss.toFixed(2)} °C</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pérdida Promedio</div>
                  <div className="text-2xl font-black text-white">{results.avgLossPerMeter.toFixed(4)} °C/m</div>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Caída de temperatura por cada metro de tubería</p>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resistencia Térmica Total</div>
                  <div className="text-2xl font-black text-white">{results.Rtot.toFixed(4)} K·m/W</div>
                  <p className="text-[10px] text-slate-500 mt-1 italic">Resistencia global al flujo de calor</p>
                </div>
              </div>

              {/* Temperature Profile Chart */}
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex flex-col h-[350px] relative group">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Perfil de Temperatura</div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Enfriamiento vs Distancia</div>
                    <button 
                      onClick={() => setIsChartFullscreen(true)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95"
                      title="Ver en pantalla completa"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="distance" 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Distancia (m)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        domain={['auto', 'auto']}
                        label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', offset: 10, fill: '#475569', fontSize: 10, fontWeight: 'bold' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                        itemStyle={{ color: '#60a5fa' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number) => [`${value} °C`, 'Temperatura']}
                        labelFormatter={(label) => `Distancia: ${label} m`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="temp" 
                        stroke="#60a5fa" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTemp)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800">
              <div className="flex items-center gap-3 text-blue-400 mb-2">
                <Info size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Conclusión Técnica</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Para un recorrido de {params.length}m de tubería de {params.materialTubo} {params.eAisl > 0 ? `con aislamiento de ${params.materialAisl}` : 'sin aislamiento'}, el agua ingresa a {params.Tin}°C y egresa a {results.Tout.toFixed(2)}°C.
                La pérdida total es de {results.totalLoss.toFixed(2)}°C, lo que representa una eficiencia térmica aceptable para este tramo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Chart Modal */}
      {isChartFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 w-full max-w-6xl h-[80vh] rounded-[40px] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Perfil de Temperatura Detallado</h3>
                <p className="text-slate-400 text-sm font-medium mt-1">Análisis de enfriamiento: {params.materialTubo} - {params.length}m</p>
              </div>
              <button 
                onClick={() => setIsChartFullscreen(false)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 p-8 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <defs>
                    <linearGradient id="colorTempFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="distance" 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Distancia Recorrida (m)', position: 'insideBottom', offset: -20, fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    domain={['auto', 'auto']}
                    label={{ value: 'Temperatura del Agua (°C)', angle: -90, position: 'insideLeft', offset: 20, fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '14px', padding: '12px' }}
                    itemStyle={{ color: '#60a5fa' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                    formatter={(value: number) => [`${value} °C`, 'Temperatura']}
                    labelFormatter={(label) => `Distancia: ${label} m`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#60a5fa" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTempFull)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="p-8 bg-white/5 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temp. Inicial</span>
                <p className="text-xl font-black text-white">{params.Tin}°C</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temp. Final</span>
                <p className="text-xl font-black text-blue-400">{results.Tout.toFixed(2)}°C</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pérdida Total</span>
                <p className="text-xl font-black text-red-400">-{results.totalLoss.toFixed(2)}°C</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resistencia</span>
                <p className="text-xl font-black text-indigo-400">{results.Rtot.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
