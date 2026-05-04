import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine
} from 'recharts';
import { Calendar, Download, ArrowLeft, Filter, CheckCircle2, XCircle, Clock, Target, Users, BarChart3 } from 'lucide-react';
import { ProductRecord, ModuleId } from '../types';
import { format, parseISO, differenceInDays, isWithinInterval, startOfMonth, endOfMonth, subMonths, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { toast } from 'sonner';
import { saveCalculationRecord } from '../lib/api';
import { currentUser } from '../data/mockData';

interface ReportsDashboardProps {
  data: ProductRecord[];
  activeModule: ModuleId | string;
  onBack: () => void;
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981'];

export default function ReportsDashboard({ data, activeModule, onBack }: ReportsDashboardProps) {
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const stats = useMemo(() => {
    const startDate = parseISO(dateRange.start);
    const endDate = parseISO(dateRange.end);

    let totalApprovals = 0;
    let totalRejections = 0;
    
    // Approval times by stage
    const stageTimes: Record<string, number[]> = {
      'I+D': [],
      'MKT': [],
      'PLAN': [],
      'PROV': []
    };

    // Status counts by stage
    const stageStatus: Record<string, { approved: number, rejected: number }> = {
      'I+D': { approved: 0, rejected: 0 },
      'MKT': { approved: 0, rejected: 0 },
      'PLAN': { approved: 0, rejected: 0 },
      'PROV': { approved: 0, rejected: 0 }
    };

    data.forEach(record => {
      const docArrayKey = activeModule === 'artwork_followup' ? 'artworks' : 
                          activeModule === 'technical_datasheet' ? 'technicalSheets' : 'commercialSheets';
      
      const docs = record[docArrayKey as keyof ProductRecord] as any[] || [];
      
      docs.forEach(version => {
        const uploadDate = parseISO(version.uploadDate);
        
        const processApproval = (stage: string, approval: any) => {
          if (!approval || !approval.date || approval.status === 'not_required' || approval.status === 'pending') return;
          
          const approvalDate = parseISO(approval.date);
          
          if (isWithinInterval(approvalDate, { start: startDate, end: endDate })) {
            if (approval.status === 'approved') {
              totalApprovals++;
              stageStatus[stage].approved++;
              const diff = differenceInDays(approvalDate, uploadDate);
              stageTimes[stage].push(Math.max(0, diff));
            } else if (approval.status === 'rejected') {
              totalRejections++;
              stageStatus[stage].rejected++;
            }
          }
        };

        processApproval('I+D', version.idApproval);
        processApproval('MKT', version.mktApproval);
        processApproval('PLAN', version.planApproval);
        processApproval('PROV', version.provApproval);
      });
    });

    const avgTimes = Object.entries(stageTimes).map(([stage, times]) => ({
      stage,
      avgDays: times.length > 0 ? parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)) : 0
    }));

    const statusData = Object.entries(stageStatus).map(([stage, counts]) => ({
      name: stage,
      Aprobados: counts.approved,
      Rechazados: counts.rejected
    }));

    // Designer Workload and Performance
    const designerStats: Record<string, {
      name: string,
      artworks: number,
      total: number,
      avgCompletionDays: number[],
      onTime: number,
      delayed: number
    }> = {};

    data.forEach(record => {
      const assignmentKey = activeModule === 'artwork_followup' ? 'artworkAssignment' : 
                            activeModule === 'technical_datasheet' ? 'technicalAssignment' : 'commercialAssignment';
      
      const processAssignment = (type: 'art', assignment: any) => {
        if (!assignment || !assignment.designer) return;
        
        const designer = assignment.designer;
        if (!designerStats[designer]) {
          designerStats[designer] = {
            name: designer,
            artworks: 0,
            total: 0,
            avgCompletionDays: [],
            onTime: 0,
            delayed: 0
          };
        }

        if (type === 'art') designerStats[designer].artworks++;
        designerStats[designer].total++;

        if (assignment.assignmentDate && assignment.actualCompletionDate) {
          const start = parseISO(assignment.assignmentDate);
          const end = parseISO(assignment.actualCompletionDate);
          const diff = differenceInDays(end, start);
          designerStats[designer].avgCompletionDays.push(Math.max(0, diff));

          if (assignment.plannedEndDate) {
            const plannedEnd = parseISO(assignment.plannedEndDate);
            if (isAfter(end, plannedEnd)) {
              designerStats[designer].delayed++;
            } else {
              designerStats[designer].onTime++;
            }
          }
        }
      };

      processAssignment('art', record[assignmentKey as keyof ProductRecord]);
    });

    const workloadData = Object.values(designerStats).map(d => ({
      name: d.name,
      Documentos: d.artworks,
      Total: d.total,
      AvgDays: d.avgCompletionDays.length > 0 
        ? parseFloat((d.avgCompletionDays.reduce((a, b) => a + b, 0) / d.avgCompletionDays.length).toFixed(1)) 
        : 0,
      Efficiency: d.total > 0 ? parseFloat(((d.onTime / (d.onTime + d.delayed || 1)) * 100).toFixed(1)) : 0
    }));

    // Monthly performance timeline for Artworks (Assignment to Upload)
    const monthlyPerformance: Record<string, { total: number, count: number }> = {};
    
    data.forEach(record => {
      const assignmentKey = activeModule === 'artwork_followup' ? 'artworkAssignment' : 
                            activeModule === 'technical_datasheet' ? 'technicalAssignment' : 'commercialAssignment';
      const assignment = record[assignmentKey as keyof ProductRecord] as any;
      if (assignment?.assignmentDate && assignment?.actualCompletionDate) {
        const start = parseISO(assignment.assignmentDate);
        const end = parseISO(assignment.actualCompletionDate);
        const diff = differenceInDays(end, start);
        
        const monthKey = format(end, 'yyyy-MM');
        if (!monthlyPerformance[monthKey]) {
          monthlyPerformance[monthKey] = { total: 0, count: 0 };
        }
        monthlyPerformance[monthKey].total += Math.max(0, diff);
        monthlyPerformance[monthKey].count++;
      }
    });

    const performanceTimeline = Object.entries(monthlyPerformance)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, stats]) => ({
        month,
        displayMonth: format(parseISO(`${month}-01`), "d MMMM yyyy", { locale: es }),
        avgDays: parseFloat((stats.total / stats.count).toFixed(1))
      }));

    return {
      totalApprovals,
      totalRejections,
      avgTimes,
      statusData,
      workloadData,
      performanceTimeline,
      pieData: [
        { name: 'Aprobados', value: totalApprovals },
        { name: 'Rechazados', value: totalRejections }
      ]
    };
  }, [data, dateRange, activeModule]);

  const handleSave = (details: { projectName: string; sampleId: string; description: string }) => {
    localStorage.setItem('reports_dashboard_config', JSON.stringify({ dateRange }));
    saveCalculationRecord(
      'reports_dashboard', 
      'save', 
      { dateRange }, 
      currentUser.email,
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Configuración de reporte guardada');
  };

  const handleExportExcel = () => {
    const dataToExport = data.map(record => {
      const docArrayKey = activeModule === 'artwork_followup' ? 'artworks' : 
                          activeModule === 'technical_datasheet' ? 'technicalSheets' : 'commercialSheets';
      const docs = record[docArrayKey as keyof ProductRecord] as any[] || [];
      const assignmentKey = activeModule === 'artwork_followup' ? 'artworkAssignment' : 
                            activeModule === 'technical_datasheet' ? 'technicalAssignment' : 'commercialAssignment';
      const assignment = record[assignmentKey as keyof ProductRecord] as any;

      return {
        'Producto': record.descripcionSAP,
        'Marca': record.marca,
        'Categoría': record.linea,
        'Estado': docs.length > 0 ? docs[docs.length - 1].idApproval.status : 'Pendiente',
        'Diseñador': assignment?.designer || 'N/A',
        'Fecha Asignación': assignment?.assignmentDate || 'N/A',
        'Fecha Fin Real': assignment?.actualCompletionDate || 'N/A',
      };
    });
    exportToExcel(dataToExport, 'Reporte_Performance_ID');
    toast.success('Excel exportado correctamente');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'summary-cards', title: 'Resumen de Performance' },
      { contentId: 'detailed-performance', title: 'Análisis de Tiempos' },
      { contentId: 'workload-charts', title: 'Carga de Trabajo y Eficiencia' },
      { contentId: 'approval-distribution', title: 'Distribución de Decisiones' }
    ];
    await generateReportPDF(sections, 'Informe_Performance_ID', 'Informe de Performance de I+D');
    toast.success('PDF exportado correctamente');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Reporte de Performance</h2>
            <p className="text-slate-500 font-medium mt-1 text-xs md:text-sm">Análisis de tiempos y estados de aprobación</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex-1 w-full flex justify-center sm:justify-start">
            <ModuleActions 
              onSave={handleSave}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
            />
          </div>
          <div className="flex items-center gap-2 px-3 sm:border-r border-slate-100 w-full sm:w-auto justify-center">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-xs md:text-sm font-bold text-slate-600 outline-none w-28 md:w-auto"
            />
            <span className="text-slate-300">al</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-xs md:text-sm font-bold text-slate-600 outline-none w-28 md:w-auto"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div id="summary-cards" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Aprobados</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalApprovals}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full" 
              style={{ width: `${(stats.totalApprovals / (stats.totalApprovals + stats.totalRejections || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Rechazados</p>
              <h3 className="text-3xl font-black text-slate-900">{stats.totalRejections}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full" 
              style={{ width: `${(stats.totalRejections / (stats.totalApprovals + stats.totalRejections || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tiempo Promedio</p>
              <h3 className="text-3xl font-black text-slate-900">
                {(stats.avgTimes.reduce((a, b) => a + b.avgDays, 0) / stats.avgTimes.filter(t => t.avgDays > 0).length || 0).toFixed(1)} <span className="text-lg font-bold text-slate-400">días</span>
              </h3>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-400">Promedio global entre todas las áreas</p>
        </div>
      </div>

      {/* New Detailed Performance Section (Based on Image) */}
      <div id="detailed-performance" className="bg-[#1e293b] text-white rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[20px] border-white rounded-full opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-[10px] border-white rounded-full opacity-30" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 relative z-10">
          {/* Sidebar Info */}
          <div className="lg:col-span-1 p-8 lg:p-10 bg-slate-900/40 backdrop-blur-sm border-r border-slate-800/50">
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                  <Target size={20} className="text-indigo-400" />
                  Objetivo:
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Medir la rapidez con que el equipo elabora y finaliza las artes una vez que dispone de la información necesaria (o al menos la solicitud formal).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-400" />
                  Medición:
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Trimestral: Se calcula el promedio de días transcurridos entre la programación y el fin de las artes para todas las muestras terminadas en ese período.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                  <Clock size={20} className="text-indigo-400" />
                  Meta Trimestral:
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  Meta de 5 días por {activeModule === 'artwork_followup' ? 'Arte' : activeModule === 'technical_datasheet' ? 'Ficha Técnica' : 'Ficha Comercial'}.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-black text-white mb-3 flex items-center gap-2">
                  <Users size={20} className="text-indigo-400" />
                  Involucrados:
                </h3>
                <div className="text-slate-400 text-sm leading-relaxed font-medium space-y-1">
                  <p>Jonathan Soriano.</p>
                  <p>Raquel Veliz.</p>
                  <p>Yakkira Velasquez.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="lg:col-span-3 p-8 lg:p-10 flex flex-col">
            <div className="mb-10">
              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                Tiempo promedio de elaboración de {activeModule === 'artwork_followup' ? 'Artes' : activeModule === 'technical_datasheet' ? 'Fichas Técnicas' : 'Fichas Comerciales'} de productos Sole/S-Collection
              </h2>
            </div>

            <div className="flex-1 min-h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.performanceTimeline} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis 
                    dataKey="displayMonth" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    label={{ 
                      value: 'Tiempo de Elaboración de FC (días)', 
                      angle: -90, 
                      position: 'insideLeft', 
                      style: { fill: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
                      offset: 0
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '16px', 
                      color: '#fff',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  
                  {/* Threshold lines */}
                  <ReferenceLine 
                    y={5} 
                    stroke="#10b981" 
                    strokeDasharray="5 5" 
                    strokeWidth={2}
                    label={{ 
                      position: 'right', 
                      value: 'Meta', 
                      fill: '#10b981', 
                      fontSize: 12, 
                      fontWeight: 900,
                      offset: 10
                    }} 
                  />
                  <ReferenceLine 
                    y={8} 
                    stroke="#ef4444" 
                    strokeWidth={1}
                    opacity={0.5}
                  />

                  <Line 
                    type="monotone" 
                    dataKey="avgDays" 
                    stroke="#fff" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#fff', strokeWidth: 3, stroke: '#1e293b' }}
                    activeDot={{ r: 8, fill: '#6366f1', strokeWidth: 0 }}
                    label={{ 
                      position: 'top', 
                      fill: '#fff', 
                      fontSize: 14, 
                      fontWeight: 900, 
                      offset: 15,
                      formatter: (val: any) => `(${val})` 
                    }}
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 flex justify-end">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eficiente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crítico</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="workload-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workload Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Carga de Trabajo por Diseñador</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total asignaciones</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.workloadData} layout="vertical" margin={{ left: 20, right: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  width={100}
                  label={{ value: 'Diseñador', angle: -90, position: 'insideLeft', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Documentos" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Efficiency Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Eficiencia y Tiempos</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Días promedio vs Cumplimiento</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.workloadData} margin={{ bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                  label={{ value: 'Diseñador', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  label={{ value: 'Valor', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="AvgDays" name="Días Promedio" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Efficiency" name="% Cumplimiento" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Time Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Tiempo de Respuesta por Área</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Días promedio</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.avgTimes} margin={{ bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="stage" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                  label={{ value: 'Área', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: 'Días', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avgDays" name="Días Promedio" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval/Rejection Distribution */}
        <div id="approval-distribution" className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Distribución de Decisiones</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Por área</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusData} margin={{ bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                  label={{ value: 'Área', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Aprobados" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rechazados" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900">Balance Global de Aprobaciones</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-500 uppercase">Aprobados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-slate-500 uppercase">Rechazados</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[300px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-slate-500 mb-1">Tasa de Aprobación</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-emerald-600">
                    {((stats.totalApprovals / (stats.totalApprovals + stats.totalRejections || 1)) * 100).toFixed(1)}%
                  </span>
                  <span className="text-sm font-bold text-slate-400 mb-1">de éxito</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-slate-500 mb-1">Tasa de Rechazo</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-red-600">
                    {((stats.totalRejections / (stats.totalApprovals + stats.totalRejections || 1)) * 100).toFixed(1)}%
                  </span>
                  <span className="text-sm font-bold text-slate-400 mb-1">requiere corrección</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
