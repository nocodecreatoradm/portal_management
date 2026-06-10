import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, AlertCircle, CheckCircle2, FileText, Download, TrendingUp, BarChart3, PieChart as PieIcon, ExternalLink } from 'lucide-react';
import { QualityClaim, ProductRecord } from '../types';
import { format, parseISO } from 'date-fns';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import HeaderFilterPopover from './HeaderFilterPopover';

interface QualityClaimsModuleProps {
  qualityClaims: QualityClaim[];
  products: ProductRecord[];
  onViewProductDetail: (record: ProductRecord) => void;
  onOpenClaimsModal: (record: ProductRecord) => void;
  initialSearchTerm?: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr === '-') return '-';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy');
  } catch (e) {
    return dateStr.split('T')[0] || '-';
  }
};

export default function QualityClaimsModule({
  qualityClaims,
  products,
  onViewProductDetail,
  onOpenClaimsModal,
  initialSearchTerm
}: QualityClaimsModuleProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [defectFilter, setDefectFilter] = useState<'all' | 'Estético' | 'Funcional' | 'Dimensional'>('all');

  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [moduleFilter, setModuleFilter] = useState<'all' | 'artwork' | 'technical' | 'commercial'>('all');

  // Filter claims
  const filteredClaims = useMemo(() => {
    return qualityClaims.filter(claim => {
      const matchesSearch = 
        claim.sapCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (claim.comments || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
      const matchesDefect = defectFilter === 'all' || claim.defectType === defectFilter;
      const matchesModule = moduleFilter === 'all' || claim.trackingType === moduleFilter;

      return matchesSearch && matchesStatus && matchesDefect && matchesModule;
    });
  }, [qualityClaims, searchTerm, statusFilter, defectFilter, moduleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = qualityClaims.length;
    const open = qualityClaims.filter(c => c.status === 'open').length;
    const resolved = total - open;
    
    const estético = qualityClaims.filter(c => c.defectType === 'Estético').length;
    const funcional = qualityClaims.filter(c => c.defectType === 'Funcional').length;
    const dimensional = qualityClaims.filter(c => c.defectType === 'Dimensional').length;

    return { total, open, resolved, estético, funcional, dimensional };
  }, [qualityClaims]);

  // Recharts Data
  const defectChartData = useMemo(() => [
    { name: 'Estético', value: stats.estético, color: '#f59e0b' },
    { name: 'Funcional', value: stats.funcional, color: '#ef4444' },
    { name: 'Dimensional', value: stats.dimensional, color: '#3b82f6' }
  ].filter(d => d.value > 0), [stats]);

  const statusChartData = useMemo(() => [
    { name: 'Abiertos', cantidad: stats.open, color: '#ef4444' },
    { name: 'Subsanados', cantidad: stats.resolved, color: '#10b981' }
  ], [stats]);

  const handleProductLinkClick = (sapCode: string) => {
    const product = products.find(p => p.codigoSAP === sapCode);
    if (product) {
      onOpenClaimsModal(product);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Reclamos de Calidad</h2>
        <p className="text-slate-500 font-medium mt-1">Monitoreo, control y trazabilidad de observaciones de calidad en artes y fichas</p>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Observaciones</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pendientes (Abiertos)</p>
            <h3 className="text-3xl font-black text-red-600 mt-2">{stats.open}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subsanados</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-2">{stats.resolved}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">% De Solución</p>
            <h3 className="text-3xl font-black text-slate-950 mt-2">
              {stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '100%'}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      {/* Graphical Dashboard Charts */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Defect Types */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col h-[320px]">
            <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
              <PieIcon size={16} />
              Distribución por Tipo de Defecto
            </h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {defectChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} reclamos`, 'Cantidad']} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Status Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col h-[320px]">
            <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} />
              Resolución de Reclamos
            </h4>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cantidad">
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Database Filters & Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        
        {/* Filters Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código SAP, inspector, comentarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700"
            >
              <option value="all">Todos los Estados</option>
              <option value="open">Abiertos</option>
              <option value="resolved">Subsanados</option>
            </select>

            <select
              value={defectFilter}
              onChange={(e) => setDefectFilter(e.target.value as any)}
              className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700"
            >
              <option value="all">Todos los Defectos</option>
              <option value="Estético">Estético</option>
              <option value="Funcional">Funcional</option>
              <option value="Dimensional">Dimensional</option>
            </select>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as any)}
              className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700"
            >
              <option value="all">Todos los Módulos</option>
              <option value="artwork">Artes</option>
              <option value="technical">Ficha Técnica</option>
              <option value="commercial">Ficha Comercial</option>
            </select>
          </div>
        </div>

        {/* Claims Table */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">CÓDIGO SAP</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Módulo</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Defecto / Arte</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Inspector</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Comentarios</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha Inicio</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha Fin</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                    No hay observaciones que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5 font-mono text-xs font-bold text-slate-900">
                      <button
                        onClick={() => handleProductLinkClick(claim.sapCode)}
                        className="flex items-center gap-1.5 hover:text-blue-600 outline-none text-left"
                      >
                        {claim.sapCode}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        {claim.trackingType === 'artwork' ? 'Artes' : claim.trackingType === 'technical' ? 'Ficha Téc.' : 'Ficha Com.'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold text-slate-900">{claim.documentCategory}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{claim.defectType}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                      {claim.responsibleName}
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-500 max-w-[260px] truncate" title={claim.comments}>
                      {claim.comments}
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-600">
                      {formatDate(claim.claimStartDate)}
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-500">
                      {formatDate(claim.claimEndDate)}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        claim.status === 'open' 
                          ? 'bg-red-50 text-red-600 border-red-100' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {claim.status === 'open' ? 'Abierto' : 'Subsanado'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
