import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine
} from 'recharts';
import { SampleRecord } from '../types';
import { format, parseISO, startOfMonth, differenceInHours, isWithinInterval, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Users, CheckCircle, Clock, FileText, TrendingUp, ChevronRight, Calendar, Target, BarChart3 } from 'lucide-react';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface SamplesDashboardProps {
  samples: SampleRecord[];
  onBack: () => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

interface MetricDashboardCardProps {
  title: string;
  objective: string;
  measurement: string;
  targetLabel: string;
  target: string;
  involved: string[];
  data: any[];
  yDomain: [number, number];
  targetValue: number;
  yAxisLabel: string;
  unitLabel: string;
}

const MetricDashboardCard = ({ 
  title, 
  objective, 
  measurement, 
  targetLabel,
  target, 
  involved, 
  data, 
  yDomain, 
  targetValue,
  yAxisLabel,
  unitLabel
}: MetricDashboardCardProps) => {
  const lastValue = data.length > 0 ? data[data.length - 1].avgDays : 0;
  const isEfficient = lastValue <= targetValue;

  return (
    <div className="bg-[#1e293b] rounded-[40px] overflow-hidden shadow-2xl border border-slate-800 flex flex-col lg:flex-row min-h-[600px]">
      {/* Sidebar */}
      <div className="w-full lg:w-[300px] bg-[#0f172a] p-8 flex flex-col gap-8 border-r border-slate-800">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <Target size={20} />
            <h4 className="text-sm font-black uppercase tracking-widest">Objetivo:</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {objective}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <BarChart3 size={20} />
            <h4 className="text-sm font-black uppercase tracking-widest">Medición:</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {measurement}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <Clock size={20} />
            <h4 className="text-sm font-black uppercase tracking-widest">{targetLabel}:</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {target}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-indigo-400">
            <Users size={20} />
            <h4 className="text-sm font-black uppercase tracking-widest">Involucrados:</h4>
          </div>
          <div className="space-y-1">
            {involved.map((person, i) => (
              <p key={i} className="text-xs text-slate-400 font-medium">{person}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 p-8 relative flex flex-col">
        <div className="mb-8 flex items-center justify-between">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight max-w-2xl">
            {title}
          </h3>
          <div className="flex items-center gap-4">
            {isEfficient ? (
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                <span className="text-2xl">😊</span>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center text-red-500">
                <span className="text-2xl">☹️</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          {/* Circular Background Pattern */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="w-[300px] h-[300px] border border-white rounded-full"></div>
            <div className="absolute w-[450px] h-[450px] border border-white rounded-full"></div>
            <div className="absolute w-[600px] h-[600px] border border-white rounded-full"></div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 40, right: 60, left: 40, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis 
                dataKey="displayMonth" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={20}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                domain={yDomain}
                label={{ 
                  value: yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft', 
                  offset: -20,
                  fill: '#94a3b8',
                  fontSize: 10,
                  fontWeight: 700,
                  textAnchor: 'middle'
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
              />
              
              {/* Meta Line */}
              <ReferenceLine 
                y={targetValue} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                strokeWidth={2}
                label={{ 
                  value: 'Meta', 
                  position: 'right', 
                  fill: '#10b981', 
                  fontSize: 12, 
                  fontWeight: 900,
                  dx: 10
                }} 
              />
              
              {/* Critical Line (example) */}
              <ReferenceLine 
                y={yDomain[1] * 0.8} 
                stroke="#ef4444" 
                strokeWidth={1}
                label={{ 
                  value: '', 
                  position: 'right'
                }} 
              />

              <Line 
                type="monotone" 
                dataKey="avgDays" 
                stroke="#fff" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
                activeDot={{ r: 8, fill: '#fff' }}
                label={({ x, y, value }) => (
                  <text x={x} y={y - 20} fill="#fff" fontSize={12} fontWeight={900} textAnchor="middle">
                    ({value})
                  </text>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-end gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crítico</span>
          </div>
          <div className="ml-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {unitLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SamplesDashboard({ samples, onBack }: SamplesDashboardProps) {
  const { user } = useAuth();
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);

  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Load saved configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem('samples_dashboard_config');
    if (savedConfig) {
      try {
        const { startDate: savedStart, endDate: savedEnd } = JSON.parse(savedConfig);
        if (savedStart) setStartDate(savedStart);
        if (savedEnd) setEndDate(savedEnd);
      } catch (e) {
        console.error('Error loading samples dashboard config', e);
      }
    }
  }, []);

  const handleSave = (details: { projectName: string; sampleId: string; description: string }) => {
    const config = { startDate, endDate };
    localStorage.setItem('samples_dashboard_config', JSON.stringify(config));
    saveCalculationRecord(
      'samples_dashboard', 
      'save', 
      config, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Configuración de dashboard guardada localmente y en la base de datos');
  };

  const handleExportExcel = () => {
    const exportData = filteredSamples.map(s => ({
      'ID Correlativo': s.correlativeId,
      'Proveedor': s.proveedor,
      'Fecha Inspección': s.inspectionDate ? format(parseISO(s.inspectionDate), 'dd/MM/yyyy') : '-',
      'Técnico': s.technician || '-',
      'Estado': s.inspectionStatus,
      'Progreso': s.inspectionProgress,
      'Tiempo Inspección (ms)': s.inspectionTimer?.accumulatedTimeMs || 0,
      'Fecha Informe': s.reportDate ? format(parseISO(s.reportDate), 'dd/MM/yyyy') : '-'
    }));

    exportToExcel(exportData, `Dashboard_Samples_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('samples_dashboard', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'summary-stats', title: 'Resumen General de Muestras' },
      { contentId: 'turnaround-metric', title: 'Tiempo Promedio de Evaluación (Turnaround Time)' },
      { contentId: 'report-issuance-metric', title: 'Tiempo Promedio de Elaboración de Informes' },
      { contentId: 'workload-status', title: 'Carga Laboral y Estado Global' },
      { contentId: 'supplier-performance', title: 'Desempeño por Proveedor' }
    ];

    await generateReportPDF(sections, `Informe_Dashboard_Samples_${format(new Date(), 'yyyyMMdd')}`, 'Informe de Dashboard de Muestras R&D');
    saveCalculationRecord('samples_dashboard', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  // Filtered samples based on date range
  const filteredSamples = useMemo(() => {
    if (!startDate && !endDate) return samples;
    
    return samples.filter(s => {
      const dateStr = s.inspectionCompletedDate || s.inspectionDate;
      if (!dateStr) return false;
      
      const sampleDate = parseISO(dateStr);
      const start = startDate ? startOfDay(parseISO(startDate)) : new Date(0);
      const end = endDate ? endOfDay(parseISO(endDate)) : new Date();
      
      return isWithinInterval(sampleDate, { start, end });
    });
  }, [samples, startDate, endDate]);

  // 1. Registered Suppliers
  const suppliers = Array.from(new Set(filteredSamples.map(s => s.proveedor)));
  const supplierCount = suppliers.length;

  // 2. Approval Status Breakdown
  const statusCounts = filteredSamples.reduce((acc: any, s) => {
    const status = s.inspectionStatus;
    if (['Aprobado', 'Tolerado', 'Rechazado'].includes(status)) {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {});

  const statusData = Object.keys(statusCounts).map(name => ({
    name,
    value: statusCounts[name]
  }));

  // 3. Technician Workload Summary
  const technicianWorkload = filteredSamples.reduce((acc: any, s) => {
    if (s.technician) {
      if (!acc[s.technician]) acc[s.technician] = { pending: 0, in_progress: 0, completed: 0, total: 0, sampleIds: [] };
      const status = s.inspectionProgress === 'in_progress' ? 'in_progress' : 
                     s.inspectionProgress === 'completed' ? 'completed' : 'pending';
      acc[s.technician][status] += 1;
      acc[s.technician].total += 1;
      acc[s.technician].sampleIds.push(s.correlativeId);
    }
    return acc;
  }, {});

  const workloadData = Object.keys(technicianWorkload).map(name => ({
    name,
    ...technicianWorkload[name]
  }));

  // 4. Supplier Performance (Stacked Bar)
  const supplierPerformance = filteredSamples.reduce((acc: any, s) => {
    if (!acc[s.proveedor]) acc[s.proveedor] = { name: s.proveedor, Aprobado: 0, Tolerado: 0, Rechazado: 0, total: 0 };
    if (s.inspectionStatus === 'Aprobado') acc[s.proveedor].Aprobado += 1;
    if (s.inspectionStatus === 'Tolerado') acc[s.proveedor].Tolerado += 1;
    if (s.inspectionStatus === 'Rechazado') acc[s.proveedor].Rechazado += 1;
    acc[s.proveedor].total += 1;
    return acc;
  }, {});

  const allSupplierData = Object.values(supplierPerformance).sort((a: any, b: any) => b.total - a.total);
  
  let displaySupplierData = allSupplierData;
  const hasManySuppliers = allSupplierData.length > 6;

  if (!showAllSuppliers && hasManySuppliers) {
    const top5 = allSupplierData.slice(0, 5);
    const others = allSupplierData.slice(5).reduce((acc: any, curr: any) => {
      acc.Aprobado += curr.Aprobado;
      acc.Tolerado += curr.Tolerado;
      acc.Rechazado += curr.Rechazado;
      acc.total += curr.total;
      return acc;
    }, { name: 'Otros', Aprobado: 0, Tolerado: 0, Rechazado: 0, total: 0 });
    displaySupplierData = [...top5, others];
  }

  const handleSupplierClick = (state: any) => {
    if (state && state.activeLabel === 'Otros') {
      setShowAllSuppliers(true);
    }
  };

  // 5. Average Physical Inspection Time per Month (Horas)
  const monthlyInspectionTime = filteredSamples.reduce((acc: any, s) => {
    if (s.inspectionCompletedDate && s.inspectionTimer) {
      const month = format(parseISO(s.inspectionCompletedDate), 'MMM yyyy');
      const hours = s.inspectionTimer.accumulatedTimeMs / (1000 * 60 * 60);
      if (!acc[month]) acc[month] = { totalHours: 0, count: 0, technicians: {}, sampleIds: [] };
      acc[month].totalHours += hours;
      acc[month].count += 1;
      acc[month].sampleIds.push(s.correlativeId);

      if (s.technician) {
        if (!acc[month].technicians[s.technician]) acc[month].technicians[s.technician] = { totalHours: 0, count: 0 };
        acc[month].technicians[s.technician].totalHours += hours;
        acc[month].technicians[s.technician].count += 1;
      }
    }
    return acc;
  }, {});

  const inspectionTimeMonthlyData = Object.keys(monthlyInspectionTime).map(month => ({
    month,
    avgHours: Number((monthlyInspectionTime[month].totalHours / monthlyInspectionTime[month].count).toFixed(2)),
    sampleIds: monthlyInspectionTime[month].sampleIds,
    ...Object.keys(monthlyInspectionTime[month].technicians).reduce((tAcc: any, t) => {
      tAcc[t] = Number((monthlyInspectionTime[month].technicians[t].totalHours / monthlyInspectionTime[month].technicians[t].count).toFixed(2));
      return tAcc;
    }, {})
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // 6. Average time between inspection end and report upload (Monthly)
  const reportTimeMonthly = filteredSamples.reduce((acc: any, s) => {
    if (s.inspectionCompletedDate && s.reportDate) {
      const month = format(parseISO(s.inspectionCompletedDate), 'MMM yyyy');
      const diffHours = differenceInHours(parseISO(s.reportDate), parseISO(s.inspectionCompletedDate));
      
      if (!acc[month]) acc[month] = { totalHours: 0, count: 0, technicians: {}, sampleIds: [] };
      acc[month].totalHours += diffHours;
      acc[month].count += 1;
      acc[month].sampleIds.push(s.correlativeId);

      if (s.technician) {
        if (!acc[month].technicians[s.technician]) acc[month].technicians[s.technician] = { totalHours: 0, count: 0 };
        acc[month].technicians[s.technician].totalHours += diffHours;
        acc[month].technicians[s.technician].count += 1;
      }
    }
    return acc;
  }, {});

  const reportTimeData = Object.keys(reportTimeMonthly).map(month => ({
    month,
    avgHoursGlobal: Number((reportTimeMonthly[month].totalHours / reportTimeMonthly[month].count).toFixed(2)),
    sampleIds: reportTimeMonthly[month].sampleIds,
    ...Object.keys(reportTimeMonthly[month].technicians).reduce((tAcc: any, t) => {
      tAcc[t] = Number((reportTimeMonthly[month].technicians[t].totalHours / reportTimeMonthly[month].technicians[t].count).toFixed(2));
      return tAcc;
    }, {})
  })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  const techniciansList: string[] = Array.from(new Set(filteredSamples.filter(s => s.technician).map(s => s.technician as string)));

  // 7. Average Turnaround Time (Scheduling to Completion) - Monthly
  const turnaroundMonthly = filteredSamples.reduce((acc: any, s) => {
    if (s.inspectionDate && s.inspectionCompletedDate) {
      const month = format(parseISO(s.inspectionCompletedDate), 'yyyy-MM');
      const diffDays = differenceInDays(parseISO(s.inspectionCompletedDate), parseISO(s.inspectionDate));
      
      if (!acc[month]) acc[month] = { totalDays: 0, count: 0 };
      acc[month].totalDays += Math.max(0, diffDays);
      acc[month].count += 1;
    }
    return acc;
  }, {});

  const turnaroundData = Object.keys(turnaroundMonthly).map(month => ({
    month,
    displayMonth: format(parseISO(`${month}-01`), "d MMMM yyyy", { locale: es }),
    avgDays: Number((turnaroundMonthly[month].totalDays / turnaroundMonthly[month].count).toFixed(1))
  })).sort((a, b) => a.month.localeCompare(b.month));

  // 8. Average Report Issuance Time (Completion to Report) - Monthly
  const reportIssuanceMonthly = filteredSamples.reduce((acc: any, s) => {
    if (s.inspectionCompletedDate && s.reportDate) {
      const month = format(parseISO(s.reportDate), 'yyyy-MM');
      const diffDays = differenceInDays(parseISO(s.reportDate), parseISO(s.inspectionCompletedDate));
      
      if (!acc[month]) acc[month] = { totalDays: 0, count: 0 };
      acc[month].totalDays += Math.max(0, diffDays);
      acc[month].count += 1;
    }
    return acc;
  }, {});

  const reportIssuanceData = Object.keys(reportIssuanceMonthly).map(month => ({
    month,
    displayMonth: format(parseISO(`${month}-01`), "d MMMM yyyy", { locale: es }),
    avgDays: Number((reportIssuanceMonthly[month].totalDays / reportIssuanceMonthly[month].count).toFixed(1))
  })).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dashboard de Samples</h2>
            <p className="text-slate-500 font-medium mt-1">Indicadores de desempeño y gestión de muestras</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Period Filter */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-slate-400 ml-2" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-1"
              />
              <span className="text-slate-300">|</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 p-1"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-[10px] font-black text-indigo-600 uppercase px-2"
              >
                Limpiar
              </button>
            )}
          </div>

          <ModuleActions 
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div id="summary-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedores</p>
            <p className="text-2xl font-black text-slate-900">{supplierCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Muestras Aprobadas</p>
            <p className="text-2xl font-black text-slate-900">{statusCounts['Aprobado'] || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Total</p>
            <p className="text-2xl font-black text-slate-900">{filteredSamples.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informes Listos</p>
            <p className="text-2xl font-black text-slate-900">{filteredSamples.filter(s => s.reportFile).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* Average Turnaround Time Chart */}
        <div id="turnaround-metric">
          <MetricDashboardCard 
            title="Tiempo promedio de evaluación de muestra (Average Turnaround Time)"
            objective="Medir qué tan rápido se completa el ciclo de evaluación desde la programación de la muestra, considerando el tiempo de inspección en relación con la cantidad de muestras evaluadas por mes."
            measurement="Trimestral: se calcula el promedio de días transcurridos entre la programación y la entrega de datos para todas las muestras terminadas en ese período."
            targetLabel="Meta Trimestral"
            target="Meta de 7 días por muestra."
            involved={['Jonathan Soriano.', 'Fernando Lopez.', 'Anthony Soto.']}
            data={turnaroundData}
            yDomain={[0, 10]}
            targetValue={7}
            yAxisLabel="Tiempo de Evaluación (Días)"
            unitLabel="Mes"
          />
        </div>

        {/* Average Report Issuance Time Chart */}
        <div id="report-issuance-metric">
          <MetricDashboardCard 
            title="Tiempo promedio de elaboración de Informes"
            objective="Medir qué tan rápido se completa la elaboración de los informes de las muestras evaluadas"
            measurement="Se calcula el promedio de días transcurridos entre el fin de evaluación y el informe para todas las muestras terminadas en ese período. N es el número de muestras con informe emitido en el mes."
            targetLabel="Meta Mensual"
            target="Meta de 3 días por muestra."
            involved={['Carlos Hoyos.', 'Cristhian Sevillano.']}
            data={reportIssuanceData}
            yDomain={[0, 5]}
            targetValue={3}
            yAxisLabel="Tiempo de Evaluación (Días)"
            unitLabel="Mes"
          />
        </div>
      </div>

      <div id="workload-status" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Technician Workload */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Users size={20} className="text-indigo-500" />
            Carga Laboral por Técnico
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                  label={{ value: 'Técnico', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                  label={{ value: 'Cant. Muestras', angle: -90, position: 'insideLeft', fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                          <p className="font-black text-slate-900 mb-2 uppercase text-xs">{label}</p>
                          <div className="space-y-1 mb-2">
                            <p className="text-[10px] font-bold text-slate-500">Pendientes: <span className="text-slate-900">{data.pending}</span></p>
                            <p className="text-[10px] font-bold text-blue-500">En Curso: <span className="text-slate-900">{data.in_progress}</span></p>
                            <p className="text-[10px] font-bold text-emerald-500">Finalizados: <span className="text-slate-900">{data.completed}</span></p>
                          </div>
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Muestras:</p>
                            <p className="text-[9px] text-slate-600 font-medium">{data.sampleIds.join(', ')}</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="pending" name="Pendiente" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="in_progress" name="En Curso" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="completed" name="Finalizado" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" />
            Estado Global de Muestras
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Performance */}
        <div id="supplier-performance" className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-amber-500" />
              Desempeño por Proveedor (Aprob/Tol/Rech)
            </h3>
            {showAllSuppliers && (
              <button 
                onClick={() => setShowAllSuppliers(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
              >
                Ver Top 5
              </button>
            )}
          </div>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={displaySupplierData} 
                layout="vertical" 
                margin={{ left: 120, right: 30, bottom: 20 }}
                onClick={handleSupplierClick}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                  label={{ value: 'Cant. Muestras', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  label={{ value: 'Proveedor', angle: -90, position: 'insideLeft', offset: -100, fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const isOthers = payload.value === 'Otros';
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={-10} 
                          y={0} 
                          dy={4} 
                          textAnchor="end" 
                          fill={isOthers ? '#4f46e5' : '#1e293b'}
                          fontSize={10}
                          fontWeight={isOthers ? 900 : 700}
                          className={isOthers ? 'cursor-pointer' : ''}
                        >
                          {payload.value.length > 20 ? `${payload.value.substring(0, 17)}...` : payload.value}
                        </text>
                      </g>
                    );
                  }}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc', cursor: 'pointer' }}
                />
                <Legend />
                <Bar dataKey="Aprobado" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Tolerado" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Rechazado" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!showAllSuppliers && hasManySuppliers && (
            <p className="text-[10px] text-slate-400 font-bold mt-2 text-center uppercase tracking-widest">
              Haz clic en "Otros" para ver el detalle completo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
