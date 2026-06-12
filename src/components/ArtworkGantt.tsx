import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BarChart2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  XCircle,
  TrendingUp,
  Users,
  Zap,
  Filter,
  X,
} from 'lucide-react';
import { ProductRecord, DocumentVersion } from '../types';
import { differenceInDays, format, parseISO, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear, addYears, isWithinInterval, isBefore, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArtworkGanttProps {
  data: ProductRecord[];
  onBack: () => void;
}

type ViewMode = 'week' | 'month' | 'year';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  unassigned:  { bg: 'bg-slate-100',   text: 'text-slate-600',  border: 'border-slate-300',  label: 'Sin Asignar' },
  pending:     { bg: 'bg-blue-100',    text: 'text-blue-700',   border: 'border-blue-300',   label: 'Pendiente de Arte' },
  id_review:   { bg: 'bg-yellow-100',  text: 'text-yellow-700', border: 'border-yellow-300', label: 'En Revisión I+D' },
  mkt_review:  { bg: 'bg-orange-100',  text: 'text-orange-700', border: 'border-orange-300', label: 'En Revisión MKT' },
  prov_review: { bg: 'bg-purple-100',  text: 'text-purple-700', border: 'border-purple-300', label: 'En Revisión PROV' },
  observed:    { bg: 'bg-red-100',     text: 'text-red-700',    border: 'border-red-300',    label: 'Observado' },
  approved:    { bg: 'bg-green-100',   text: 'text-green-700',  border: 'border-green-300',  label: 'Aprobado Final' },
  in_process:  { bg: 'bg-slate-100',   text: 'text-slate-700',  border: 'border-slate-300',  label: 'En Proceso' },
};

function getRecordStatus(record: ProductRecord) {
  const assignment = record.artworkAssignment;
  const versions = record.artworks || [];

  if (!assignment?.designer) return 'unassigned';

  if (versions.length === 0) return 'pending';

  const latestByCategory = Object.values(
    versions.reduce((acc, v) => {
      const key = v.category || 'Others';
      if (!acc[key] || acc[key].version < v.version) acc[key] = v;
      return acc;
    }, {} as Record<string, DocumentVersion>)
  );

  const hasRejected = latestByCategory.some(
    v => v.idApproval?.status === 'rejected' || v.mktApproval?.status === 'rejected' || v.provApproval?.status === 'rejected' || v.planApproval?.status === 'rejected'
  );
  if (hasRejected) return 'observed';

  const allApproved = latestByCategory.every(
    v => v.idApproval?.status === 'approved' && v.mktApproval?.status === 'approved' && v.provApproval?.status === 'approved' && v.planApproval?.status === 'approved'
  );
  if (allApproved) return 'approved';

  const hasIdPending = latestByCategory.some(v => v.idApproval?.status === 'pending');
  if (hasIdPending) return 'id_review';

  const hasMktPending = latestByCategory.some(v => v.mktApproval?.status === 'pending');
  if (hasMktPending) return 'mkt_review';

  const hasProvPending = latestByCategory.some(v => v.provApproval?.status === 'pending');
  if (hasProvPending) return 'prov_review';

  return 'in_process';
}

function getApprovalBreakdown(record: ProductRecord) {
  const versions = record.artworks || [];
  if (versions.length === 0) return null;

  const latest = Object.values(
    versions.reduce((acc, v) => {
      const key = v.category || 'Others';
      if (!acc[key] || acc[key].version < v.version) acc[key] = v;
      return acc;
    }, {} as Record<string, DocumentVersion>)
  );

  const count = (stage: 'idApproval' | 'mktApproval' | 'provApproval' | 'planApproval') => {
    const approved = latest.filter((v: any) => v[stage]?.status === 'approved').length;
    const pending  = latest.filter((v: any) => v[stage]?.status === 'pending').length;
    const rejected = latest.filter((v: any) => v[stage]?.status === 'rejected').length;
    return { approved, pending, rejected, total: latest.length };
  };

  return {
    id:   count('idApproval'),
    mkt:  count('mktApproval'),
    prov: count('provApproval'),
    plan: count('planApproval'),
  };
}

function getActualCompletionDate(record: ProductRecord): string | null {
  const versions = record.artworks || [];
  if (versions.length === 0) return null;
  const uploadDates = versions.map(v => v.uploadDate).filter(Boolean).sort();
  return uploadDates[0] || null;
}

// ─── Period helpers ────────────────────────────────────────────────────────────
function getPeriodBounds(view: ViewMode, anchor: Date) {
  switch (view) {
    case 'week':  return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
    case 'month': return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'year':  return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

function navigatePeriod(view: ViewMode, anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case 'week':  return addWeeks(anchor, direction);
    case 'month': return addMonths(anchor, direction);
    case 'year':  return addYears(anchor, direction);
  }
}

function buildColumns(view: ViewMode, start: Date, end: Date): { label: string; start: Date; end: Date }[] {
  const cols: { label: string; start: Date; end: Date }[] = [];
  if (view === 'week') {
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      cols.push({ label: format(d, 'EEE dd', { locale: es }), start: new Date(d), end: new Date(d) });
    }
  } else if (view === 'month') {
    let w = startOfWeek(start, { weekStartsOn: 1 });
    while (w <= end) {
      const we = endOfWeek(w, { weekStartsOn: 1 });
      cols.push({ label: `S ${format(w, 'd')} – ${format(we, 'd MMM', { locale: es })}`, start: new Date(w), end: new Date(we) });
      w = addWeeks(w, 1);
    }
  } else {
    for (let m = new Date(start); m <= end; m = addMonths(m, 1)) {
      cols.push({ label: format(m, 'MMM', { locale: es }), start: startOfMonth(m), end: endOfMonth(m) });
    }
  }
  return cols;
}

function barPercent(barStart: Date, barEnd: Date, periodStart: Date, periodEnd: Date) {
  const total = differenceInDays(periodEnd, periodStart) + 1;
  const clampedStart = isBefore(barStart, periodStart) ? periodStart : barStart;
  const clampedEnd   = isAfter(barEnd, periodEnd)   ? periodEnd   : barEnd;
  if (isAfter(clampedStart, clampedEnd)) return { left: 0, width: 0 };
  const left  = (differenceInDays(clampedStart, periodStart) / total) * 100;
  const width = ((differenceInDays(clampedEnd, clampedStart) + 1) / total) * 100;
  return { left, width };
}

// ─── Approval badge ────────────────────────────────────────────────────────────
function ApprovalBadge({ label, data }: { label: string; data: { approved: number; pending: number; rejected: number; total: number } }) {
  const all   = data.total === 0;
  const ok    = data.approved === data.total && data.total > 0;
  const bad   = data.rejected > 0;
  const pend  = data.pending > 0;

  const color = all ? 'text-slate-400' : ok ? 'text-green-600' : bad ? 'text-red-500' : pend ? 'text-yellow-600' : 'text-slate-500';
  const Icon  = all ? Clock : ok ? CheckCircle : bad ? XCircle : Clock;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// ─── Workload analysis ─────────────────────────────────────────────────────────
function getWorkloadLevel(count: number): { level: 'ok' | 'high' | 'critical'; label: string; color: string; bg: string } {
  if (count <= 3) return { level: 'ok',       label: 'Normal',       color: 'text-green-700',  bg: 'bg-green-100' };
  if (count <= 6) return { level: 'high',     label: 'Alta',         color: 'text-yellow-700', bg: 'bg-yellow-100' };
  return            { level: 'critical', label: 'Crítica',      color: 'text-red-700',    bg: 'bg-red-100' };
}

export default function ArtworkGantt({ data, onBack }: ArtworkGanttProps) {
  const today = useMemo(() => new Date(), []);
  const [view, setView]     = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(today);
  const [filterDesigner, setFilterDesigner]   = useState('');
  const [filterStatus, setFilterStatus]       = useState('');
  const [filterLine, setFilterLine]           = useState('');
  const [showFilters, setShowFilters]         = useState(false);
  const [hoveredRow, setHoveredRow]           = useState<string | null>(null);

  const { start: periodStart, end: periodEnd } = useMemo(() => getPeriodBounds(view, anchor), [view, anchor]);
  const columns = useMemo(() => buildColumns(view, periodStart, periodEnd), [view, periodStart, periodEnd]);

  const periodLabel = useMemo(() => {
    if (view === 'week')  return `Semana del ${format(periodStart, 'd MMM', { locale: es })} al ${format(periodEnd, 'd MMM yyyy', { locale: es })}`;
    if (view === 'month') return format(periodStart, 'MMMM yyyy', { locale: es });
    return format(periodStart, 'yyyy');
  }, [view, periodStart, periodEnd]);

  // All unique designers and lines
  const designers = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { if (r.artworkAssignment?.designer) set.add(r.artworkAssignment.designer); });
    return Array.from(set).sort();
  }, [data]);

  const lines = useMemo(() => {
    const set = new Set<string>();
    data.forEach(r => { if (r.linea) set.add(r.linea); });
    return Array.from(set).sort();
  }, [data]);

  // Process rows with dates
  const rows = useMemo(() => {
    return data
      .filter(r => {
        if (filterDesigner && r.artworkAssignment?.designer !== filterDesigner) return false;
        if (filterStatus && getRecordStatus(r) !== filterStatus) return false;
        if (filterLine && r.linea !== filterLine) return false;
        return true;
      })
      .map(r => {
        const assignment = r.artworkAssignment;
        const plannedStart = assignment?.plannedStartDate ? parseISO(assignment.plannedStartDate) : null;
        let plannedEnd     = assignment?.plannedEndDate   ? parseISO(assignment.plannedEndDate)   : null;
        const actualEnd    = getActualCompletionDate(r) ? parseISO(getActualCompletionDate(r)!) : null;
        const isEstimated  = !assignment?.plannedEndDate && plannedStart;

        if (!plannedEnd && plannedStart) {
          plannedEnd = addDays(plannedStart, 14);
        }

        const status        = getRecordStatus(r);
        const approval      = getApprovalBreakdown(r);
        const isDelayed = (() => {
          if (!plannedEnd || !assignment?.designer) return false;
          if (actualEnd) {
            return isAfter(actualEnd, plannedEnd);
          }
          return isAfter(today, plannedEnd);
        })();
        const daysRemaining = plannedEnd ? differenceInDays(plannedEnd, today) : null;

        return { record: r, plannedStart, plannedEnd, actualEnd, status, approval, isDelayed, daysRemaining, isEstimated };
      })
      .sort((a, b) => {
        // Sort: records with dates first (by plannedStart), then undated
        if (!a.plannedStart && !b.plannedStart) return 0;
        if (!a.plannedStart) return 1;
        if (!b.plannedStart) return -1;
        return a.plannedStart.getTime() - b.plannedStart.getTime();
      });
  }, [data, filterDesigner, filterStatus, filterLine, today]);

  // Workload: how many projects end on each day in view period
  const workloadByDay = useMemo(() => {
    const map: Record<string, { count: number; records: ProductRecord[] }> = {};
    for (let d = new Date(periodStart); d <= periodEnd; d = addDays(d, 1)) {
      const key = format(d, 'yyyy-MM-dd');
      map[key] = { count: 0, records: [] };
    }
    rows.forEach(row => {
      if (row.plannedEnd) {
        for (let d = new Date(periodStart); d <= periodEnd; d = addDays(d, 1)) {
          const key = format(d, 'yyyy-MM-dd');
          if (format(row.plannedEnd, 'yyyy-MM-dd') === key) {
            map[key].count += 1;
            map[key].records.push(row.record);
          }
        }
      }
    });
    return map;
  }, [rows, periodStart, periodEnd]);

  const maxWorkload = useMemo(() => Math.max(1, ...Object.values(workloadByDay).map(v => v.count)), [workloadByDay]);

  // Peak day analysis
  const peakDays = useMemo(() => {
    return Object.entries(workloadByDay)
      .filter(([, v]) => v.count >= 4)
      .map(([dateKey, v]) => ({ date: parseISO(dateKey), ...v }))
      .sort((a, b) => b.count - a.count);
  }, [workloadByDay]);

  const criticalDays = peakDays.filter(d => d.count >= 7);
  const highDays     = peakDays.filter(d => d.count >= 4 && d.count < 7);
  const delayedCount = rows.filter(r => r.isDelayed).length;

  // Export CSV
  const exportCSV = () => {
    const header = ['ID','SAP','Descripcion','Marca','Linea','Diseñador','Inicio Planificado','Fin Planificado','Fin Real','Estado','Dias Restantes'];
    const csv = [header, ...rows.map(r => [
      r.record.correlativeId || r.record.id,
      r.record.codigoSAP,
      r.record.descripcionSAP,
      r.record.marca,
      r.record.linea,
      r.record.artworkAssignment?.designer || '',
      r.plannedStart ? format(r.plannedStart, 'dd/MM/yyyy') : '',
      r.plannedEnd   ? format(r.plannedEnd,   'dd/MM/yyyy') : '',
      r.actualEnd    ? format(r.actualEnd,     'dd/MM/yyyy') : '',
      STATUS_COLORS[r.status]?.label || r.status,
      r.daysRemaining !== null ? String(r.daysRemaining) : '',
    ])].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `gantt_artes_${format(today, 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const todayPercent = barPercent(today, today, periodStart, periodEnd);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <BarChart2 size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Gantt — Seguimiento de Artes</h2>
                <p className="text-slate-500 text-xs font-medium">Hoy: {format(today, "dd 'de' MMMM yyyy", { locale: es })}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              {(['week', 'month', 'year'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => { setView(v); setAnchor(today); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {{ week: 'Semana', month: 'Mes', year: 'Año' }[v]}
                </button>
              ))}
            </div>

            {/* Period nav */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5">
              <button onClick={() => setAnchor(a => navigatePeriod(view, a, -1))} className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2 whitespace-nowrap capitalize">{periodLabel}</span>
              <button onClick={() => setAnchor(a => navigatePeriod(view, a, 1))} className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>

            <button onClick={() => setAnchor(today)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors">
              Hoy
            </button>

            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Filter size={12} />
              Filtros {(filterDesigner || filterStatus || filterLine) && '●'}
            </button>

            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors">
              <Download size={12} />
              CSV
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diseñador</label>
              <select value={filterDesigner} onChange={e => setFilterDesigner(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Todos</option>
                {designers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Todos</option>
                {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Línea</label>
              <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Todas</option>
                {lines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {(filterDesigner || filterStatus || filterLine) && (
              <button onClick={() => { setFilterDesigner(''); setFilterStatus(''); setFilterLine(''); }} className="self-end flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1.5">
                <X size={12} /> Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Registros', value: rows.length, icon: BarChart2, color: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-700' },
          { label: 'Con Retraso', value: delayedCount, icon: AlertTriangle, color: 'from-red-500 to-red-600', light: 'bg-red-50 text-red-700' },
          { label: 'Aprobados', value: rows.filter(r => r.status === 'approved').length, icon: CheckCircle, color: 'from-green-500 to-green-600', light: 'bg-green-50 text-green-700' },
          { label: 'Sin Programar', value: rows.filter(r => !r.plannedStart).length, icon: Clock, color: 'from-slate-400 to-slate-500', light: 'bg-slate-50 text-slate-600' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">{card.label}</span>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon size={14} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Gantt Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '900px' }}>
            {/* Column headers */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left min-w-[280px] max-w-[280px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registro</span>
                </th>
                {columns.map((col, i) => {
                  const isToday = isWithinInterval(today, { start: col.start, end: col.end });
                  return (
                    <th key={i} className={`px-1 py-3 text-center min-w-[80px] ${isToday ? 'bg-blue-50' : ''}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                        {col.label}
                      </span>
                      {isToday && <div className="w-1 h-1 rounded-full bg-blue-500 mx-auto mt-1" />}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    No hay registros que mostrar para el período seleccionado.
                  </td>
                </tr>
              )}

              {rows.map(row => {
                const statusCfg = STATUS_COLORS[row.status];
                const approval  = row.approval;
                const isHovered = hoveredRow === row.record.id;

                return (
                  <tr
                    key={row.record.id}
                    className={`transition-colors ${isHovered ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                    onMouseEnter={() => setHoveredRow(row.record.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Row info (sticky) */}
                    <td className={`sticky left-0 z-10 px-4 py-3 bg-white ${isHovered ? 'bg-blue-50/60' : ''} border-r border-slate-100 min-w-[280px] max-w-[280px]`}>
                      <div className="flex items-start gap-2.5">
                        {/* Status dot */}
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          row.isDelayed ? 'bg-red-500 animate-pulse' :
                          row.status === 'approved' ? 'bg-green-500' :
                          row.status === 'unassigned' ? 'bg-slate-300' :
                          'bg-yellow-400'
                        }`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-blue-600">{row.record.correlativeId || `ID-${row.record.id.slice(0, 6)}`}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                              {statusCfg.label}
                            </span>
                            {row.isDelayed && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-red-100 text-red-600 border border-red-200 flex items-center gap-0.5">
                                <AlertTriangle size={8} /> RETRASADO
                              </span>
                            )}
                            {row.isEstimated && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-100 text-slate-400 border border-slate-200">estimado</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5 truncate" title={row.record.descripcionSAP}>
                            {row.record.descripcionSAP}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">{row.record.marca} · {row.record.linea}</span>
                            {row.record.artworkAssignment?.designer && (
                              <span className="flex items-center gap-0.5 text-[10px] text-slate-500 font-medium">
                                <Users size={9} />
                                {row.record.artworkAssignment.designer}
                              </span>
                            )}
                          </div>
                          {/* Approval badges */}
                          {approval && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <ApprovalBadge label="I+D"  data={approval.id} />
                              <ApprovalBadge label="MKT"  data={approval.mkt} />
                              <ApprovalBadge label="PROV" data={approval.prov} />
                              <ApprovalBadge label="PLAN" data={approval.plan} />
                            </div>
                          )}
                          {/* Days remaining / overdue */}
                          {row.daysRemaining !== null && row.status !== 'approved' && (
                            <p className={`text-[10px] font-bold mt-1 ${row.daysRemaining < 0 ? 'text-red-500' : row.daysRemaining <= 3 ? 'text-orange-500' : 'text-slate-400'}`}>
                              {row.daysRemaining < 0
                                ? `⚠ ${Math.abs(row.daysRemaining)} días de retraso`
                                : row.daysRemaining === 0
                                ? '🔔 Vence hoy'
                                : `${row.daysRemaining} días restantes`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Timeline cells */}
                    {columns.map((col, ci) => {
                      const colStart  = col.start;
                      const colEnd    = col.end;
                      const isToday   = isWithinInterval(today, { start: colStart, end: colEnd });

                      // Planned bar
                      const hasPlan   = row.plannedStart && row.plannedEnd;
                      const planOvlp  = hasPlan && !(isAfter(row.plannedStart!, colEnd) || isBefore(row.plannedEnd!, colStart));
                      const planPct   = planOvlp ? barPercent(row.plannedStart!, row.plannedEnd!, colStart, colEnd) : null;

                      // Actual bar
                      const hasActual = row.plannedStart && row.actualEnd;
                      const actOvlp   = hasActual && !(isAfter(row.plannedStart!, colEnd) || isBefore(row.actualEnd!, colStart));
                      const actPct    = actOvlp ? barPercent(row.plannedStart!, row.actualEnd!, colStart, colEnd) : null;

                      return (
                        <td key={ci} className={`px-1 py-2 relative min-w-[80px] ${isToday ? 'bg-blue-50/30' : ''}`}>
                          <div className="relative h-10 flex flex-col justify-center gap-1">
                            {/* Planned bar */}
                            {planPct && planPct.width > 0 && (
                              <div className="relative h-3.5">
                                <div
                                  className={`absolute top-0 h-full rounded-full transition-all ${
                                    row.isDelayed ? 'bg-red-400' :
                                    row.status === 'approved' ? 'bg-green-400' :
                                    'bg-blue-400'
                                  }`}
                                  style={{ left: `${planPct.left}%`, width: `${planPct.width}%`, opacity: 0.85 }}
                                  title={`Planificado: ${row.plannedStart ? format(row.plannedStart, 'dd/MM') : ''} → ${row.plannedEnd ? format(row.plannedEnd, 'dd/MM') : ''}`}
                                />
                              </div>
                            )}
                            {/* Actual bar */}
                            {actPct && actPct.width > 0 && (
                              <div className="relative h-2">
                                <div
                                  className="absolute top-0 h-full rounded-full bg-emerald-500"
                                  style={{ left: `${actPct.left}%`, width: `${actPct.width}%`, opacity: 0.9 }}
                                  title={`Real: hasta ${row.actualEnd ? format(row.actualEnd, 'dd/MM') : ''}`}
                                />
                              </div>
                            )}
                            {/* No dates indicator */}
                            {!hasPlan && ci === 0 && (
                              <div className="h-1.5 bg-slate-200 rounded-full w-8 mx-auto opacity-50" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leyenda:</span>
          {[
            { color: 'bg-blue-400', label: 'Planificado (en curso)' },
            { color: 'bg-green-400', label: 'Planificado (aprobado)' },
            { color: 'bg-red-400', label: 'Planificado (retrasado)' },
            { color: 'bg-emerald-500', label: 'Entregado real' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-8 h-2.5 rounded-full ${l.color}`} />
              <span className="text-[10px] text-slate-500 font-medium">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Workload Analysis ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-white" />
          </div>
          <h3 className="text-sm font-black text-slate-800">Análisis de Carga Laboral</h3>
          <span className="text-xs text-slate-400 font-medium">(fechas fin planificado por día)</span>
        </div>

        {/* AI Recommendations */}
        {(criticalDays.length > 0 || highDays.length > 0 || delayedCount > 0) && (
          <div className="px-6 py-4 space-y-2 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">💡 Recomendaciones</p>
            {delayedCount > 0 && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  <strong>{delayedCount} proyecto{delayedCount > 1 ? 's' : ''} con retraso</strong> detectado{delayedCount > 1 ? 's' : ''}. Prioriza la revisión y aprobación de estos registros inmediatamente para evitar mayor demora en la cadena de aprobación.
                </p>
              </div>
            )}
            {criticalDays.map(d => (
              <div key={d.date.toISOString()} className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Zap size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  <strong>Sobrecarga crítica el {format(d.date, "EEEE dd 'de' MMMM", { locale: es })}</strong>: {d.count} proyectos vencen ese día. Se recomienda redistribuir al menos {d.count - 3} proyectos a días anteriores o negociar nuevas fechas con proveedores para evitar retrasos en cascada.
                </p>
              </div>
            ))}
            {highDays.map(d => (
              <div key={d.date.toISOString()} className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700 font-medium">
                  <strong>Alta carga el {format(d.date, "EEEE dd 'de' MMMM", { locale: es })}</strong>: {d.count} proyectos vencen ese día. Monitorea la capacidad del equipo de diseño para cumplir con los plazos.
                </p>
              </div>
            ))}
            {criticalDays.length === 0 && highDays.length === 0 && delayedCount === 0 && (
              <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700 font-medium">
                  <strong>Carga laboral balanceada</strong> en el período seleccionado. Todos los proyectos con fechas asignadas se encuentran dentro de rangos manejables.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Day-by-day workload bars (week/month only, for year skip) */}
        {view !== 'year' && (
          <div className="px-6 py-5">
            <div className="grid gap-2">
              {Object.entries(workloadByDay)
                .filter(([, v]) => v.count > 0 || view === 'week')
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, v]) => {
                  const date = parseISO(dateKey);
                  const wl   = getWorkloadLevel(v.count);
                  const pct  = (v.count / maxWorkload) * 100;
                  const isTd = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

                  return (
                    <div key={dateKey} className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold w-28 flex-shrink-0 ${isTd ? 'text-blue-600' : 'text-slate-600'} capitalize`}>
                        {isTd ? '📍 ' : ''}{format(date, "EEE dd MMM", { locale: es })}
                      </span>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            wl.level === 'critical' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                            wl.level === 'high'     ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                            'bg-gradient-to-r from-green-400 to-emerald-400'
                          }`}
                          style={{ width: `${Math.max(pct, v.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                      {v.count > 0 ? (
                        <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
                          <span className={`text-[11px] font-black ${wl.color}`}>{v.count} proy.</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${wl.bg} ${wl.color}`}>{wl.label}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300 w-36 flex-shrink-0">Sin vencimiento</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Year view summary */}
        {view === 'year' && (
          <div className="px-6 py-5 grid grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => {
              const monthStart = startOfMonth(new Date(periodStart.getFullYear(), i, 1));
              const monthEnd   = endOfMonth(monthStart);
              const count = rows.filter(r => r.plannedEnd && isWithinInterval(r.plannedEnd, { start: monthStart, end: monthEnd })).length;
              const wl    = getWorkloadLevel(count);
              return (
                <div key={i} className={`rounded-xl p-3 border text-center ${count > 0 ? `${wl.bg} border-current` : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider capitalize ${count > 0 ? wl.color : 'text-slate-400'}`}>
                    {format(monthStart, 'MMM', { locale: es })}
                  </p>
                  <p className={`text-lg font-black mt-1 ${count > 0 ? wl.color : 'text-slate-300'}`}>{count}</p>
                  <p className={`text-[9px] font-medium ${count > 0 ? wl.color : 'text-slate-300'}`}>proy.</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
