import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Calendar, 
  User, 
  ArrowRight, 
  FileText, 
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import { fetchCalculationRecords } from '../lib/api';
import { CalculationRecord, ModuleId } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

interface RecordsModuleProps {
  onLoadRecord: (moduleId: ModuleId, data: any) => void;
}

const MODULE_LABELS: Record<string, string> = {
  rd_inventory: 'Inventario de I+D',
  ntp_regulations: 'Normativas NTP',
  samples: 'Muestras',
  technical_datasheet: 'Ficha Técnica',
  commercial_datasheet: 'Ficha Comercial',
  artwork_followup: 'Seguimiento de Artes',
  commercial_artworks: 'Artes Comerciales',
  applications: 'Aplicaciones',
  work_plan: 'Seguimiento Plan de Trabajo',
  supplier_master: 'Maestro de Proveedores',
  water_demand: 'Sistema Dimensionamiento de Agua Caliente',
  gas_heater_experimental: 'Rendimiento Térmico de Calentadores a Gas',
  absorption_calculation: 'Cálculo de Absorción de Campana',
  oven_experimental: 'Análisis Térmico de Hornos'
};

const ACTION_LABELS: Record<string, string> = {
  save: 'Guardado',
  save_local: 'Guardado Local',
  export_excel: 'Exportación Excel',
  export_pdf: 'Exportación PDF'
};

export default function RecordsModule({ onLoadRecord }: RecordsModuleProps) {
  const [records, setRecords] = useState<CalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');

  const loadRecords = async () => {
    setLoading(true);
    const data = await fetchCalculationRecords();
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.module_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.sample_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === 'all' || record.module_id === filterModule;
    
    return matchesSearch && matchesModule;
  });

  const handleLoad = (record: CalculationRecord) => {
    try {
      const data = JSON.parse(record.record_data);
      onLoadRecord(record.module_id, data);
    } catch (e) {
      console.error('Error parsing record data', e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Módulo de Registros</h2>
          <p className="text-slate-500 font-medium mt-1">Historial de acciones y datos guardados en el sistema</p>
        </div>
        <button 
          onClick={loadRecords}
          className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por proyecto, muestra, usuario, módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-700"
          >
            <option value="all">Todos los Módulos</option>
            {Object.entries(MODULE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Módulo</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Proyecto / Muestra</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Acción</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha y Hora</th>
                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="animate-spin text-blue-500" size={32} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando registros...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Database className="text-slate-200" size={48} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <motion.tr 
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{MODULE_LABELS[record.module_id] || record.module_id}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{record.module_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-slate-900">{record.project_name || '-'}</p>
                        {record.sample_id && (
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Muestra: {record.sample_id}</p>
                        )}
                        {record.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 italic">"{record.description}"</p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        record.action_type.includes('export') 
                          ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {ACTION_LABELS[record.action_type] || record.action_type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} />
                        <span className="text-sm font-medium">{record.user_email}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-900">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-bold">
                            {format(parseISO(record.timestamp), "d 'de' MMMM, yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={14} />
                          <span className="text-xs font-medium">
                            {format(parseISO(record.timestamp), "HH:mm:ss")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => handleLoad(record)}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                      >
                        Cargar Datos
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
