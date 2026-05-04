import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, Edit2, Trash2, FileText, Upload, Image as ImageIcon, UserPlus, HelpCircle, AlertCircle, Beaker, Search, X, Clock, Send } from 'lucide-react';
import { ProductRecord, DocumentVersion, Supplier, SampleRecord } from '../types';
import StatusIcon from './StatusIcon';
import HeaderFilterPopover from './HeaderFilterPopover';

interface DataTableProps {
  data: ProductRecord[];
  suppliers: Supplier[];
  samples: SampleRecord[];
  onActionClick: (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet', action: 'view' | 'upload' | 'approve', version?: DocumentVersion, stage?: string) => void;
  onViewDetail: (record: ProductRecord) => void;
  onAssign?: (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet') => void;
  onInfoRequest?: (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet') => void;
  onStartFlow?: (record: ProductRecord, version: DocumentVersion) => void;
  onEdit?: (record: ProductRecord) => void;
  onDelete?: (record: ProductRecord) => void;
  mode?: 'artwork' | 'technical_sheet' | 'commercial_sheet';
}

export default function DataTable({ 
  data, 
  suppliers,
  samples,
  onActionClick, 
  onViewDetail, 
  onAssign,
  onInfoRequest,
  onStartFlow,
  onEdit,
  onDelete,
  mode = 'artwork'
}: DataTableProps) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  // Sync scrollbars
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    const handleTableScroll = () => {
      if (topScroll.scrollLeft !== tableContainer.scrollLeft) {
        topScroll.scrollLeft = tableContainer.scrollLeft;
      }
    };

    const handleTopScroll = () => {
      if (tableContainer.scrollLeft !== topScroll.scrollLeft) {
        tableContainer.scrollLeft = topScroll.scrollLeft;
      }
    };

    tableContainer.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    return () => {
      tableContainer.removeEventListener('scroll', handleTableScroll);
      topScroll.removeEventListener('scroll', handleTopScroll);
    };
  }, []);

  const getSupplierLogo = (codProv: string) => {
    const supplier = suppliers.find(s => s.erpCode === codProv);
    return supplier?.logoUrl;
  };

  const getSampleCorrelative = (sampleId?: string) => {
    if (!sampleId) return null;
    const sample = samples.find(s => s.id === sampleId);
    return sample?.correlativeId;
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply column filters
    (Object.entries(columnFilters) as [string, string][]).forEach(([key, value]) => {
      if (!value) return;
      const lowerValue = value.toLowerCase();
      result = result.filter(item => {
        const itemValue = String((item as any)[key] || '').toLowerCase();
        return itemValue.includes(lowerValue);
      });
    });

    // Sort by sortConfig or fallback to ID descending
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.column] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.column] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
    }

    return result;
  }, [data, columnFilters, sortConfig]);

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };

  const renderApprovalCell = (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet', versions: DocumentVersion[], stage: string) => {
    if (versions.length === 0) return <td className="px-2 py-3 border-r border-gray-100 text-center">-</td>;
    
    return (
      <td className="px-2 py-3 border-r border-gray-100 text-center">
        <div className="flex flex-col gap-2 items-center">
          {versions.map((v, idx) => {
            const approval = stage === 'I+D' ? v.idApproval : 
                             stage === 'MKT' ? v.mktApproval : 
                             stage === 'PLAN' ? v.planApproval : v.provApproval;
            return (
              <div key={idx} className="h-8 flex items-center justify-center">
                <button 
                  onClick={() => onActionClick(record, type, 'approve', v, stage)}
                  className="inline-flex items-center justify-center transition-transform hover:scale-110"
                >
                  <StatusIcon status={approval?.status} label={stage} />
                </button>
              </div>
            );
          })}
        </div>
      </td>
    );
  };


  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Cards for Mobile (lg:hidden) */}
      <div className="lg:hidden divide-y divide-slate-100">
        {filteredAndSortedData.map((record) => {
          const currentVersions = mode === 'artwork' ? record.artworks : 
                                 mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                                 (record.commercialSheets || []);

          const latestByCategory = mode === 'artwork' ? Object.values(
            currentVersions.reduce((acc, v) => {
              const key = v.category || 'Others';
              if (!acc[key] || acc[key].version < v.version) acc[key] = v;
              return acc;
            }, {} as Record<string, DocumentVersion>)
          ).sort((a: any, b: any) => (a.category || '').localeCompare(b.category || '')) as DocumentVersion[]
          : (currentVersions.length > 0 ? [currentVersions.sort((a, b) => b.version - a.version)[0]] : []);

          return (
            <div key={record.id} className="p-4 space-y-4">
              {/* Card Header: ID and Approvals */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                    {record.correlativeId || '-'}
                  </span>
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                    record.marca === 'SOLE' 
                      ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {record.marca}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {latestByCategory.map((v, idx) => (
                    <div key={idx} className="flex gap-1">
                      <StatusIcon status={v.idApproval.status} label="I+D" size={12} />
                      {mode === 'artwork' && (
                        <>
                          <StatusIcon status={v.mktApproval.status} label="MKT" size={12} />
                          <StatusIcon status={v.planApproval.status} label="PLAN" size={12} />
                          <StatusIcon status={v.provApproval.status} label="PROV" size={12} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Content: Provider and Product */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center p-1 border border-slate-100 shrink-0">
                  {getSupplierLogo(record.codProv) ? (
                    <img 
                      src={getSupplierLogo(record.codProv)} 
                      alt={record.proveedor}
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-900 uppercase truncate">{record.proveedor}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{record.codigoSAP} / {record.codigoEAN}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase line-clamp-2 leading-tight">
                    {record.descripcionSAP}
                  </p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onViewDetail(record)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  >
                    <Eye size={14} />
                    Detalle
                  </button>
                  {latestByCategory.map((v, idx) => (
                    <button 
                      key={idx}
                      onClick={() => onActionClick(record, mode, 'view', v)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      <ImageIcon size={14} />
                      V{v.version}
                    </button>
                  ))}
                  <button 
                    onClick={() => onDelete?.(record)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  >
                    <Trash2 size={14} />
                    Borrar
                  </button>
                  {latestByCategory.length === 0 && (
                    <button 
                      onClick={() => onActionClick(record, mode, 'upload')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      <Upload size={14} />
                      Subir
                    </button>
                  )}
                </div>
                {record.sampleId && (
                  <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    <Beaker size={12} />
                    {getSampleCorrelative(record.sampleId)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filteredAndSortedData.length === 0 && (
          <div className="p-8 text-center text-slate-400 font-bold text-sm">
            No se encontraron registros.
          </div>
        )}
      </div>

      {/* Table for Desktop (hidden lg:block) */}
      <div className="hidden lg:flex lg:flex-col">
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto h-3 bg-slate-50 border-b border-slate-100"
        >
          <div style={{ width: '1800px', height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-sm text-left border-collapse" style={{ minWidth: '1800px' }}>
          <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-gray-200 sticky top-0 z-20">
            <tr>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100 w-20">Acciones</th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100 whitespace-nowrap">
                ID
                <HeaderFilterPopover 
                  column="correlativeId" 
                  label="ID" 
                  currentFilter={columnFilters.correlativeId || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100">
                Proveedor
                <HeaderFilterPopover 
                  column="proveedor" 
                  label="Proveedor" 
                  currentFilter={columnFilters.proveedor || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100 whitespace-nowrap">
                Código EAN
                <HeaderFilterPopover 
                  column="codigoEAN" 
                  label="Código EAN" 
                  currentFilter={columnFilters.codigoEAN || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100 whitespace-nowrap">
                Código SAP
                <HeaderFilterPopover 
                  column="codigoSAP" 
                  label="Código SAP" 
                  currentFilter={columnFilters.codigoSAP || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100">
                Descripción SAP
                <HeaderFilterPopover 
                  column="descripcionSAP" 
                  label="Descripción SAP" 
                  currentFilter={columnFilters.descripcionSAP || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100">
                Línea
                <HeaderFilterPopover 
                  column="linea" 
                  label="Línea" 
                  currentFilter={columnFilters.linea || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100">
                Marca
                <HeaderFilterPopover 
                  column="marca" 
                  label="Marca" 
                  currentFilter={columnFilters.marca || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                />
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-r border-gray-100 min-w-[120px]">Asignación</th>
              <th colSpan={mode === 'artwork' ? 6 : 3} className={`px-4 py-2 text-center ${
                mode === 'artwork' ? 'bg-indigo-50/50 text-indigo-600' : 
                mode === 'technical_sheet' ? 'bg-emerald-50/50 text-emerald-600' : 
                'bg-amber-50/50 text-amber-600'
              }`}>
                {mode === 'artwork' ? 'Artworks' : 
                 mode === 'technical_sheet' ? 'Fichas Técnicas' : 
                 'Fichas Comerciales'}
              </th>
              <th rowSpan={2} className="px-4 py-4 text-center border-l border-gray-100">
                Muestra
                <HeaderFilterPopover 
                  column="sampleId" 
                  label="Muestra" 
                  currentFilter={columnFilters.sampleId || ''} 
                  onFilterChange={handleFilterChange} 
                  currentSort={sortConfig} 
                  onSortChange={handleSortChange} 
                  align="right"
                />
              </th>
            </tr>
            <tr className="bg-slate-50/50">
              {/* Subheaders */}
              <th className="px-2 py-2 text-center border-r border-gray-100">Arch.</th>
              <th className="px-2 py-2 text-center border-r border-gray-100">I+D</th>
              {mode === 'artwork' && (
                <>
                  <th className="px-2 py-2 text-center border-r border-gray-100">MKT</th>
                  <th className="px-2 py-2 text-center border-r border-gray-100">PLAN</th>
                  <th className="px-2 py-2 text-center border-r border-gray-100">PROV</th>
                </>
              )}
              <th className="px-2 py-2 text-center border-r border-gray-100">Ver.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSortedData.map((record) => {
              const currentVersions = mode === 'artwork' ? record.artworks : 
                                     mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                                     (record.commercialSheets || []);

              const latestByCategory = mode === 'artwork' ? Object.values(
                currentVersions.reduce((acc, v) => {
                  const key = v.category || 'Others';
                  if (!acc[key] || acc[key].version < v.version) acc[key] = v;
                  return acc;
                }, {} as Record<string, DocumentVersion>)
              ).sort((a: any, b: any) => (a.category || '').localeCompare(b.category || '')) as DocumentVersion[]
              : (currentVersions.length > 0 ? [currentVersions.sort((a, b) => b.version - a.version)[0]] : []);

              return (
                <tr 
                  key={record.id} 
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-4 py-4 border-r border-gray-100">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onViewDetail(record)} 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                        title="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => onEdit?.(record)} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete?.(record)} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                        title="Borrar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {record.correlativeId || '-'}
                      </span>
                      {record.artworkAssignment?.infoRequests?.some(r => !r.response) && (
                        <div className="relative group/alert">
                          <AlertCircle size={14} className="text-orange-500 animate-pulse" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/alert:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-50">
                            Solicitud de información pendiente
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100 text-[10px] text-slate-500 uppercase whitespace-normal min-w-[150px]" title={record.proveedor}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center p-1 border border-slate-100 shrink-0">
                        {getSupplierLogo(record.codProv) ? (
                          <img 
                            src={getSupplierLogo(record.codProv)} 
                            alt={record.proveedor}
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(record.proveedor)}&background=f1f5f9&color=64748b&bold=true`;
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{record.proveedor}</span>
                        <span className="text-[9px] text-slate-400">{record.codProv}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100 font-mono text-xs text-slate-600">{record.codigoEAN}</td>
                  <td className="px-4 py-4 border-r border-gray-100 font-mono text-xs text-slate-600 font-bold">{record.codigoSAP}</td>
                  <td className="px-4 py-4 border-r border-gray-100 text-slate-700 font-bold uppercase text-[11px] leading-tight max-w-[200px]">
                    {record.descripcionSAP}
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100 text-[10px] text-slate-500 font-medium uppercase tracking-tight text-center">
                    {record.linea}
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      record.marca === 'SOLE' 
                        ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {record.marca}
                    </span>
                  </td>
                  <td className="px-4 py-4 border-r border-gray-100">
                    <div className="flex flex-col gap-2">
                      {/* Assignment */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-indigo-600">
                          {mode === 'artwork' ? 'ART:' : mode === 'technical_sheet' ? 'TEC:' : 'COM:'}
                        </span>
                        {(mode === 'artwork' ? record.artworkAssignment : 
                          mode === 'technical_sheet' ? record.technicalAssignment : 
                          record.commercialAssignment) ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-600 truncate max-w-[60px]" title={(mode === 'artwork' ? record.artworkAssignment : 
                              mode === 'technical_sheet' ? record.technicalAssignment : 
                              record.commercialAssignment)?.designer}>
                              {(mode === 'artwork' ? record.artworkAssignment : 
                                mode === 'technical_sheet' ? record.technicalAssignment : 
                                record.commercialAssignment)?.designer.split(' ')[0]}
                            </span>
                            <button 
                              onClick={() => onInfoRequest?.(record, mode)} 
                              className="text-orange-500 hover:text-orange-700 transition-colors" 
                              title="Solicitar Información"
                            >
                              <HelpCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => onAssign?.(record, mode)} 
                            className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1"
                          >
                            <UserPlus size={12} /> Asignar
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Document Cells */}
                  <td className="px-2 py-3 border-r border-gray-100 text-center">
                    <div className="flex flex-col gap-2 items-center">
                      {latestByCategory.length > 0 ? (
                        latestByCategory.map((v, idx) => (
                          <div key={idx} className="flex items-center justify-center gap-2 h-8">
                            <button 
                              onClick={() => onActionClick(record, mode, 'view', v)}
                              className="text-indigo-500 hover:text-indigo-700 transition-colors"
                              title={`Ver ${v.category || 'Documento'} V${v.version}`}
                            >
                              <ImageIcon size={18} />
                            </button>
                            <button 
                              onClick={() => onActionClick(record, mode, 'upload')}
                              className="text-slate-300 hover:text-indigo-500 transition-colors"
                              title="Subir nueva versión"
                            >
                              <Upload size={14} />
                            </button>
                            {(v.idApproval.status === 'not_started' || 
                              (mode === 'artwork' && (
                                v.mktApproval.status === 'not_started' || 
                                v.planApproval.status === 'not_started' || 
                                v.provApproval.status === 'not_started'
                              ))) && (
                              <button 
                                onClick={() => onStartFlow?.(record, v)}
                                className="text-blue-500 hover:text-blue-700 transition-colors animate-pulse"
                                title="Iniciar flujo de aprobaciones"
                              >
                                <Send size={14} />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <button 
                          onClick={() => onActionClick(record, mode, 'upload')}
                          className="text-slate-300 hover:text-indigo-500 transition-colors"
                          title={`Subir ${mode === 'artwork' ? 'artwork' : 'ficha'}`}
                        >
                          <Upload size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                  {renderApprovalCell(record, mode, latestByCategory, 'I+D')}
                  {mode === 'artwork' && (
                    <>
                      {renderApprovalCell(record, mode, latestByCategory, 'MKT')}
                      {renderApprovalCell(record, mode, latestByCategory, 'PLAN')}
                      {renderApprovalCell(record, mode, latestByCategory, 'PROV')}
                    </>
                  )}
                  <td className="px-2 py-3 border-r border-gray-100">
                    <div className="flex flex-col gap-2 items-center">
                      {latestByCategory.length > 0 ? (
                        latestByCategory.map((v, idx) => (
                          <div key={idx} className="h-8 flex flex-col justify-center items-center leading-none">
                            {v.category && <span className="text-[8px] text-slate-400 uppercase font-black">{v.category}:</span>}
                            <span className="text-[10px] text-indigo-600 font-black">V{v.version}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 border-l border-gray-100 text-center">
                    {record.sampleId ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                          <Beaker size={10} />
                          {getSampleCorrelative(record.sampleId)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-[10px]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}
