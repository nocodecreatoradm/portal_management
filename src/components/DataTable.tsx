import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Eye, Edit2, Trash2, FileText, Upload, Image as ImageIcon, UserPlus, HelpCircle, AlertCircle, Beaker, Search, X, Clock, Send, Calendar, Plus, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { ProductRecord, DocumentVersion, Supplier, SampleRecord, QualityClaim } from '../types';
import StatusIcon from './StatusIcon';
import HeaderFilterPopover from './HeaderFilterPopover';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { format, parseISO, differenceInDays } from 'date-fns';

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
  onEditDates?: (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet') => void;
  onDelete?: (record: ProductRecord) => void;
  mode?: 'artwork' | 'technical_sheet' | 'commercial_sheet';
  onUpdateRecord?: (id: string, updates: Partial<ProductRecord>) => Promise<void> | void;
  qualityClaims?: QualityClaim[];
  onQualityClaimsClick?: (record: ProductRecord) => void;
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
  onEditDates,
  onDelete,
  mode = 'artwork',
  onUpdateRecord,
  qualityClaims = [],
  onQualityClaimsClick
}: DataTableProps) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();

  const [editingSampleRowId, setEditingSampleRowId] = useState<string | null>(null);
  const [inlineSampleSearch, setInlineSampleSearch] = useState('');
  const inlineDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedCommentRecord, setSelectedCommentRecord] = useState<ProductRecord | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inlineDropdownRef.current && !inlineDropdownRef.current.contains(event.target as Node)) {
        setEditingSampleRowId(null);
        setInlineSampleSearch('');
      }
    }
    if (editingSampleRowId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingSampleRowId]);

  const hasScope = (record: ProductRecord) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (!profile.scopes || profile.scopes.length === 0) return true; // Global access if no scopes defined
    
    return profile.scopes.some(scope => {
      const matchBrand = !scope.brand || scope.brand === record.marca;
      const matchLine = !scope.line || scope.line === record.linea;
      return matchBrand && matchLine;
    });
  };

  const getSupplierLogo = (codProv: string) => {
    const supplier = suppliers.find(s => s.erpCode === codProv);
    return supplier?.logoUrl;
  };

  const getSampleCorrelative = (sampleId?: string) => {
    if (!sampleId) return null;
    const sample = samples.find(s => s.id === sampleId);
    return sample?.correlativeId;
  };

  const isNearDeadline = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const daysDiff = differenceInDays(parseISO(dateStr), new Date());
      return daysDiff <= 2;
    } catch (e) {
      return false;
    }
  };

  const getRecordStatus = (record: ProductRecord, currentMode: 'artwork' | 'technical_sheet' | 'commercial_sheet', latestVersions: DocumentVersion[]) => {
    const assignment = currentMode === 'artwork' ? record.artworkAssignment : currentMode === 'technical_sheet' ? record.technicalAssignment : record.commercialAssignment;
    
    if (!assignment?.designer) {
      return { label: 'Sin Asignar', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    
    if (latestVersions.length === 0) {
      return { label: 'Pendiente de Arte', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }

    // Check if any is rejected
    const hasRejected = latestVersions.some(v => 
      v.idApproval.status === 'rejected' || 
      (currentMode === 'artwork' && (v.mktApproval.status === 'rejected' || v.provApproval.status === 'rejected' || v.planApproval.status === 'rejected'))
    );
    if (hasRejected) {
      return { label: 'Observado', color: 'bg-red-100 text-red-700 border-red-200' };
    }

    // Check if all approved
    const allApproved = latestVersions.every(v => {
      const idOk = v.idApproval.status === 'approved';
      if (currentMode !== 'artwork') return idOk;
      return idOk && v.mktApproval.status === 'approved' && v.provApproval.status === 'approved' && v.planApproval.status === 'approved';
    });
    if (allApproved) {
      return { label: 'Aprobado Final', color: 'bg-green-100 text-green-700 border-green-200' };
    }

    // Determine pending stages
    const hasIdPending = latestVersions.some(v => v.idApproval.status === 'pending');
    if (hasIdPending) {
      return { label: 'En Revisión I+D', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }

    if (currentMode === 'artwork') {
      const hasMktPending = latestVersions.some(v => v.mktApproval.status === 'pending');
      if (hasMktPending) {
        return { label: 'En Revisión MKT', color: 'bg-orange-100 text-orange-700 border-orange-200' };
      }
      
      const hasProvPending = latestVersions.some(v => v.provApproval.status === 'pending');
      if (hasProvPending) {
        return { label: 'En Revisión PROV', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      }
    }

    return { label: 'En Proceso', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply column filters
    (Object.entries(columnFilters) as [string, string][]).forEach(([key, value]) => {
      if (!value) return;
      const lowerValue = value.toLowerCase();
      result = result.filter(item => {
        if (!item) return false;
        
        // Handle filter mapping if needed
        if (key === 'sampleId') {
          const sampleCorrel = getSampleCorrelative(item.sampleId) || '';
          return sampleCorrel.toLowerCase().includes(lowerValue);
        }
        if (key === 'status') {
          const currentVersions = mode === 'artwork' ? (item.artworks || []) : 
                                 mode === 'technical_sheet' ? (item.technicalSheets || []) : 
                                 (item.commercialSheets || []);
          const latestByCategory = mode === 'artwork' ? Object.values(
            (currentVersions || []).reduce((acc, v) => {
              if (!v) return acc;
              const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
              if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
              return acc;
            }, {} as Record<string, DocumentVersion>)
          ).sort((a: any, b: any) => {
            const catCompare = (a.category || '').localeCompare(b.category || '');
            if (catCompare !== 0) return catCompare;
            return (a.subcategory || '').localeCompare(b.subcategory || '');
          }) as DocumentVersion[]
          : (currentVersions && currentVersions.length > 0 ? [currentVersions.sort((a, b) => Number(b.version) - Number(a.version))[0]] : []);
          const generalStatus = getRecordStatus(item, mode, latestByCategory);
          return generalStatus.label.toLowerCase().includes(lowerValue);
        }
        if (key === 'assignment') {
          const assignment = mode === 'artwork' 
            ? item.artworkAssignment 
            : mode === 'technical_sheet' 
              ? item.technicalAssignment 
              : item.commercialAssignment;
              
          if (lowerValue === 'sin asignar') {
            return !assignment || !assignment.designer;
          }
          if (!assignment) return false;
          
          if (lowerValue === 'sin fecha') {
            return !assignment.plannedEndDate;
          }
          if (lowerValue === 'vencido / próximo a vencer') {
            return !!assignment.plannedEndDate && isNearDeadline(assignment.plannedEndDate);
          }
          
          const designerName = assignment.designer || '';
          const plannedDate = assignment.plannedEndDate 
            ? `vence: ${format(parseISO(assignment.plannedEndDate), 'dd/MM/yy')}` 
            : '';
          
          return designerName.toLowerCase().includes(lowerValue) || plannedDate.toLowerCase().includes(lowerValue);
        }

        const itemValue = String((item as any)[key] || '').toLowerCase();
        return itemValue.includes(lowerValue);
      });
    });

    // Sort by sortConfig or fallback to ID descending
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortConfig.column === 'assignment') {
          const aAssign = mode === 'artwork' ? a.artworkAssignment : mode === 'technical_sheet' ? a.technicalAssignment : a.commercialAssignment;
          const bAssign = mode === 'artwork' ? b.artworkAssignment : mode === 'technical_sheet' ? b.technicalAssignment : b.commercialAssignment;
          aVal = aAssign?.plannedEndDate || '';
          bVal = bAssign?.plannedEndDate || '';
        } else if (sortConfig.column === 'status') {
          const getStatusLabel = (r: ProductRecord) => {
            const currentVersions = mode === 'artwork' ? (r.artworks || []) : 
                                   mode === 'technical_sheet' ? (r.technicalSheets || []) : 
                                   (r.commercialSheets || []);
            const latestByCategory = mode === 'artwork' ? Object.values(
              (currentVersions || []).reduce((acc, v) => {
                if (!v) return acc;
                const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
                if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
                return acc;
              }, {} as Record<string, DocumentVersion>)
            ).sort((a: any, b: any) => {
              const catCompare = (a.category || '').localeCompare(b.category || '');
              if (catCompare !== 0) return catCompare;
              return (a.subcategory || '').localeCompare(b.subcategory || '');
            }) as DocumentVersion[]
            : (currentVersions && currentVersions.length > 0 ? [currentVersions.sort((a, b) => Number(b.version) - Number(a.version))[0]] : []);
            return getRecordStatus(r, mode, latestByCategory).label;
          };
          aVal = getStatusLabel(a).toLowerCase();
          bVal = getStatusLabel(b).toLowerCase();
        } else {
          aVal = String((a as any)[sortConfig.column] || '').toLowerCase();
          bVal = String((b as any)[sortConfig.column] || '').toLowerCase();
        }

        if (!aVal && bVal) return 1;
        if (aVal && !bVal) return -1;
        if (!aVal && !bVal) return 0;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => {
        const idA = a.correlativeId || '';
        const idB = b.correlativeId || '';
        return idB.localeCompare(idA, undefined, { numeric: true });
      });
    }

    return result;
  }, [data, columnFilters, sortConfig, mode, samples]);

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };

  const toggleSort = (column: string) => {
    let nextDirection: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.column === column) {
      if (sortConfig.direction === 'asc') {
        nextDirection = 'desc';
      } else if (sortConfig.direction === 'desc') {
        nextDirection = null;
      }
    }
    handleSortChange(column, nextDirection);
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderApprovalCell = (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet', versions: DocumentVersion[], stage: string, isExpanded: boolean, hasMore: boolean) => {
    const cellClass = "px-0.5 py-2 border-r border-gray-100 text-center w-[42px] min-w-[42px] max-w-[42px]";
    if (versions.length === 0) return <td className={cellClass}>-</td>;
    
    // Para Planeamiento, solo mostramos una aprobación global (la última versión)
    const isPlan = stage === 'PLAN';
    let displayVersions = isPlan ? [versions[versions.length - 1]] : versions;
    
    if (!isExpanded && !isPlan) {
      displayVersions = displayVersions.slice(0, 1);
    }

    return (
      <td className={cellClass}>
        <div className="flex flex-col gap-2 items-center">
          {displayVersions.map((v, idx) => {
            const approval = stage === 'I+D' ? v.idApproval : 
                             stage === 'MKT' ? v.mktApproval : 
                             stage === 'PLAN' ? v.planApproval : v.provApproval;
            
            // Permisos basados en departamento y alcance de marca/línea
            const normalizedDept = profile?.department?.toLowerCase() || '';
            const isCorrectDepartment = 
              (stage === 'I+D' && (normalizedDept.includes('i+d') || normalizedDept.includes('innovación'))) ||
              (stage === 'MKT' && (normalizedDept.includes('mkt') || normalizedDept.includes('marketing'))) ||
              (stage === 'PLAN' && (normalizedDept.includes('plan') || normalizedDept.includes('planeamiento'))) ||
              (stage === 'PROV' && (normalizedDept.includes('prov') || normalizedDept.includes('proveedor')));

            const requiredPermission = type === 'artwork' ? 'artwork:approve' : 'technical_sheets:approve';
            const hasPerm = hasPermission(requiredPermission);

            const canApprove = profile?.role === 'admin' || 
                              (isCorrectDepartment && hasPerm && hasScope(record));

            return (
              <div key={idx} className="h-8 flex items-center justify-center">
                {canApprove ? (
                  <button 
                    onClick={() => onActionClick(record, type, 'approve', v, stage)}
                    className="inline-flex items-center justify-center transition-transform hover:scale-110"
                  >
                    <StatusIcon status={approval?.status} label={stage} />
                  </button>
                ) : (
                  <div className="inline-flex items-center justify-center opacity-80 cursor-not-allowed" title={`No tienes permisos para aprobar el área de ${stage}`}>
                    <StatusIcon status={approval?.status} label={stage} />
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && !isPlan && (
            <div className="h-[22px] mt-1"></div>
          )}
        </div>
      </td>
    );
  };


  const uniqueIDs = useMemo(() => Array.from(new Set(data.map(item => item.correlativeId || '').filter(Boolean))), [data]);
  const uniqueSapCodes = useMemo(() => Array.from(new Set(data.map(item => item.codigoSAP || '').filter(Boolean))), [data]);
  const uniqueSapDescriptions = useMemo(() => Array.from(new Set(data.map(item => item.descripcionSAP || '').filter(Boolean))), [data]);
  const uniqueLines = useMemo(() => Array.from(new Set(data.map(item => item.linea || '').filter(Boolean))), [data]);
  const uniqueCategories = useMemo(() => Array.from(new Set(data.map(item => (item.categoria || '').toUpperCase()).filter(Boolean))), [data]);
  const uniqueBrands = useMemo(() => Array.from(new Set(data.map(item => item.marca || '').filter(Boolean))), [data]);
  const uniqueComments = useMemo(() => Array.from(new Set(data.map(item => item.comments || '').filter(Boolean))), [data]);
  const uniqueSamples = useMemo(() => Array.from(new Set(data.map(item => getSampleCorrelative(item.sampleId) || '').filter(Boolean))), [data, samples]);
  const uniqueStatuses = useMemo(() => {
    return Array.from(
      new Set(
        data.map(item => {
          const currentVersions = mode === 'artwork' ? (item.artworks || []) : 
                                 mode === 'technical_sheet' ? (item.technicalSheets || []) : 
                                 (item.commercialSheets || []);
          const latestByCategory = mode === 'artwork' ? Object.values(
            (currentVersions || []).reduce((acc, v) => {
              if (!v) return acc;
              const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
              if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
              return acc;
            }, {} as Record<string, DocumentVersion>)
          ).sort((a: any, b: any) => {
            const catCompare = (a.category || '').localeCompare(b.category || '');
            if (catCompare !== 0) return catCompare;
            return (a.subcategory || '').localeCompare(b.subcategory || '');
          }) as DocumentVersion[]
          : (currentVersions && currentVersions.length > 0 ? [currentVersions.sort((a, b) => Number(b.version) - Number(a.version))[0]] : []);
          return getRecordStatus(item, mode, latestByCategory).label;
        }).filter(Boolean)
      )
    );
  }, [data, mode]);

  const uniqueDesignersAndDatesAndStatus = useMemo(() => {
    const values = new Set<string>();
    
    data.forEach(item => {
      const assignment = mode === 'artwork' 
        ? item.artworkAssignment 
        : mode === 'technical_sheet' 
          ? item.technicalAssignment 
          : item.commercialAssignment;
          
      if (assignment) {
        if (assignment.designer) {
          values.add(assignment.designer);
        }
        if (assignment.plannedEndDate) {
          const formattedDate = format(parseISO(assignment.plannedEndDate), 'dd/MM/yy');
          values.add(`Vence: ${formattedDate}`);
          if (isNearDeadline(assignment.plannedEndDate)) {
            values.add("Vencido / Próximo a vencer");
          }
        } else {
          values.add("Sin fecha");
        }
      } else {
        values.add("Sin asignar");
      }
    });
    
    return Array.from(values).filter(Boolean);
  }, [data, mode]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Cards for Mobile (lg:hidden) */}
      <div className="lg:hidden divide-y divide-slate-100">
        {filteredAndSortedData.map((record) => {
          const currentVersions = mode === 'artwork' ? (record.artworks || []) : 
                                 mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                                 (record.commercialSheets || []);

          const latestByCategory = mode === 'artwork' ? Object.values(
            (currentVersions || []).reduce((acc, v) => {
              if (!v) return acc;
              const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
              if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
              return acc;
            }, {} as Record<string, DocumentVersion>)
          ).sort((a: any, b: any) => {
            const catCompare = (a.category || '').localeCompare(b.category || '');
            if (catCompare !== 0) return catCompare;
            return (a.subcategory || '').localeCompare(b.subcategory || '');
          }) as DocumentVersion[]
          : (currentVersions && currentVersions.length > 0 ? [currentVersions.sort((a, b) => Number(b.version) - Number(a.version))[0]] : []);

          const isExpanded = expandedRows[record.id];
          const hasMore = latestByCategory.length > 1;
          const displayCategories = isExpanded ? latestByCategory : latestByCategory.slice(0, 1);
          const generalStatus = getRecordStatus(record, mode, latestByCategory);
          const assignment = mode === 'artwork' ? record.artworkAssignment : mode === 'technical_sheet' ? record.technicalAssignment : record.commercialAssignment;

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
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border ${generalStatus.color}`}>
                    {generalStatus.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end max-w-[50%]">
                  {displayCategories.map((v, idx) => (
                    <div key={idx} className="flex gap-1 mb-1">
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
                  {hasMore && (
                    <button onClick={() => toggleRow(record.id)} className="text-[10px] text-blue-600 font-bold ml-1 bg-blue-50 px-1.5 py-0.5 rounded">
                      {isExpanded ? 'Contraer' : `+${latestByCategory.length - 1}`}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{record.codigoSAP}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1 uppercase line-clamp-2 leading-tight">
                    {record.descripcionSAP}
                  </p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium uppercase">
                      Línea: {record.linea}
                    </span>
                    {record.categoria && (
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium uppercase">
                        Cat: {record.categoria}
                      </span>
                    )}
                  </div>
                  {record.comments && (
                    <p className="text-[10px] text-slate-500 mt-1.5 italic bg-slate-50 p-2 rounded border border-slate-100 font-medium">
                      <span className="font-bold text-slate-600 not-italic block mb-0.5 text-[9px] uppercase tracking-wider">Comentarios del Arte:</span>
                      {record.comments}
                    </p>
                  )}
                  {assignment && (
                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-2">
                        {isNearDeadline(assignment.plannedEndDate) ? (
                          <div className="flex items-center gap-1 text-red-500 bg-red-50 px-1.5 py-0.5 rounded" title="Vencido o próximo a vencer">
                            <AlertCircle size={10} className="animate-pulse" />
                            <span className="text-[9px] font-bold">Vence: {format(parseISO(assignment.plannedEndDate!), 'dd/MM/yy')}</span>
                          </div>
                        ) : assignment.plannedEndDate ? (
                          <span className="text-[9px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                            Vence: {format(parseISO(assignment.plannedEndDate), 'dd/MM/yy')}
                          </span>
                        ) : null}
                      </div>
                      <button 
                        onClick={() => onEditDates?.(record, mode)}
                        className="text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-blue-50 p-1.5 rounded transition-colors"
                        title="Editar fechas planificadas"
                      >
                        <Calendar size={12} />
                      </button>
                    </div>
                  )}
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
                  {displayCategories.map((v, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <button 
                        onClick={() => onActionClick(record, mode, 'view', v)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      >
                        <ImageIcon size={14} />
                        V{v.version}
                      </button>
                      {mode === 'commercial_sheet' && v.files && v.files.map((f, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-1 mt-1 text-[10px]">
                          <span className="truncate max-w-[80px] text-slate-500" title={f.name}>{f.name}</span>
                          {f.commercialType === 'provisional' ? (
                            <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100">Prov</span>
                          ) : f.commercialType === 'final' ? (
                            <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Final</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
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
                {editingSampleRowId === record.id ? (
                  <div className="relative inline-block text-left" ref={inlineDropdownRef}>
                    <div className="flex items-center border border-blue-400 rounded-xl bg-white shadow-lg pr-2 max-w-[180px] relative z-30">
                      <input 
                        type="text"
                        className="w-full px-2.5 py-1 text-xs outline-none bg-transparent font-medium border-0 focus:ring-0"
                        placeholder="Buscar..."
                        value={inlineSampleSearch}
                        onChange={(e) => setInlineSampleSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation();
                          setEditingSampleRowId(null); 
                          setInlineSampleSearch(''); 
                        }} 
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    
                    <div className="absolute z-50 right-0 mt-1.5 w-[240px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 text-left">
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                        <div 
                          className="px-3 py-2 text-xs font-black text-red-500 hover:bg-red-50 cursor-pointer border-b border-slate-50 text-left transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateRecord?.(record.id, { sampleId: '', correlativeId: '' });
                            setEditingSampleRowId(null);
                            setInlineSampleSearch('');
                          }}
                        >
                          Sin muestra vinculada
                        </div>
                        {samples
                          .filter(s => 
                            s.correlativeId.toLowerCase().includes(inlineSampleSearch.toLowerCase()) || 
                            s.descripcionSAP.toLowerCase().includes(inlineSampleSearch.toLowerCase())
                          )
                          .map(s => (
                            <div 
                              key={s.id}
                              className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 text-left transition-colors flex flex-col gap-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateRecord?.(record.id, { sampleId: s.id, correlativeId: s.correlativeId });
                                setEditingSampleRowId(null);
                                setInlineSampleSearch('');
                              }}
                            >
                              <span className="font-bold text-blue-600">{s.correlativeId}</span>
                              <span className="text-slate-600 truncate text-[10px]" title={s.descripcionSAP}>{s.descripcionSAP}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {record.sampleId ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSampleRowId(record.id);
                          setInlineSampleSearch('');
                        }}
                        className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-100 transition-all active:scale-95 cursor-pointer"
                        title="Click para cambiar muestra"
                      >
                        <Beaker size={12} className="text-emerald-500" />
                        <span>{getSampleCorrelative(record.sampleId)}</span>
                        <Edit2 size={8} className="text-emerald-400 ml-0.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSampleRowId(record.id);
                          setInlineSampleSearch('');
                        }}
                        className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 px-2 py-1 rounded-lg border border-dashed border-slate-200 hover:border-blue-200 transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus size={10} />
                        Vincular Muestra
                      </button>
                    )}
                  </>
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
        <div ref={tableContainerRef} className="overflow-x-auto min-h-[420px]">
          <table className={`w-full text-[11px] text-left border-collapse ${mode === 'artwork' ? 'min-w-[1150px]' : 'min-w-[1000px]'} xl:min-w-full`}>
          <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-gray-200 sticky top-0 z-20">
            <tr>
              <th rowSpan={2} className="px-1.5 py-2.5 text-center border-r border-gray-100 w-20 min-w-[80px] max-w-[80px]">Acciones</th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-16 min-w-[64px] max-w-[64px]"
                onClick={() => toggleSort('correlativeId')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>ID</span>
                  <HeaderFilterPopover 
                    column="correlativeId" 
                    label="ID" 
                    currentFilter={columnFilters.correlativeId || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueIDs}
                  />
                </div>
              </th>

              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[115px] min-w-[115px] max-w-[115px]"
                onClick={() => toggleSort('codigoSAP')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Código SAP</span>
                  <HeaderFilterPopover 
                    column="codigoSAP" 
                    label="Código SAP" 
                    currentFilter={columnFilters.codigoSAP || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueSapCodes}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[150px] min-w-[150px] max-w-[150px]"
                onClick={() => toggleSort('descripcionSAP')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Descripción SAP</span>
                  <HeaderFilterPopover 
                    column="descripcionSAP" 
                    label="Descripción SAP" 
                    currentFilter={columnFilters.descripcionSAP || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueSapDescriptions}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[50px] min-w-[50px] max-w-[50px]"
                onClick={() => toggleSort('comments')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Comentarios</span>
                  <HeaderFilterPopover 
                    column="comments" 
                    label="Comentarios" 
                    currentFilter={columnFilters.comments || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueComments}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-20 min-w-[80px] max-w-[80px]"
                onClick={() => toggleSort('linea')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Línea</span>
                  <HeaderFilterPopover 
                    column="linea" 
                    label="Línea" 
                    currentFilter={columnFilters.linea || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueLines}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-24 min-w-[96px] max-w-[96px]"
                onClick={() => toggleSort('categoria')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Categoría</span>
                  <HeaderFilterPopover 
                    column="categoria" 
                    label="Categoría" 
                    currentFilter={columnFilters.categoria || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueCategories}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[70px] min-w-[70px] max-w-[70px]"
                onClick={() => toggleSort('marca')}
              >
                <div className="inline-flex items-center gap-1 justify-center w-full">
                  <span>Marca</span>
                  <HeaderFilterPopover 
                    column="marca" 
                    label="Marca" 
                    currentFilter={columnFilters.marca || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueBrands}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[90px] min-w-[90px] max-w-[90px]"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <span>Estado</span>
                  <HeaderFilterPopover 
                    column="status" 
                    label="Estado" 
                    currentFilter={columnFilters.status || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueStatuses}
                  />
                </div>
              </th>
              <th 
                rowSpan={2} 
                className="px-1.5 py-2.5 text-center border-r border-gray-100 cursor-pointer hover:bg-slate-100/80 transition-colors select-none w-[115px] min-w-[115px] max-w-[115px]"
                onClick={() => toggleSort('assignment')}
              >
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <span>Asignación</span>
                  <HeaderFilterPopover 
                    column="assignment" 
                    label="Asignación" 
                    currentFilter={columnFilters.assignment || ''} 
                    onFilterChange={handleFilterChange} 
                    currentSort={sortConfig} 
                    onSortChange={handleSortChange} 
                    uniqueValues={uniqueDesignersAndDatesAndStatus}
                  />
                </div>
              </th>
              <th colSpan={mode === 'artwork' ? 6 : 3} className={`px-2 py-1.5 text-center text-[9px] ${
                mode === 'artwork' ? 'bg-indigo-50/50 text-indigo-600' : 
                mode === 'technical_sheet' ? 'bg-emerald-50/50 text-emerald-600' : 
                'bg-amber-50/50 text-amber-600'
              }`}>
                {mode === 'artwork' ? 'Artworks' : 
                 mode === 'technical_sheet' ? 'Fichas Técnicas' : 
                 'Fichas Comerciales'}
              </th>

            </tr>
            <tr className="bg-slate-50/50">
              {/* Subheaders */}
              <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[60px] min-w-[60px] max-w-[60px] text-[9px]">Arch.</th>
              <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">I+D</th>
              {mode === 'artwork' ? (
                <>
                  <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">MKT</th>
                  <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">PROV</th>
                  <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">Ver.</th>
                  <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">PLAN</th>
                </>
              ) : (
                <th className="px-1 py-1.5 text-center border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px] text-[9px]">Ver.</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSortedData.map((record) => {
              const currentVersions = mode === 'artwork' ? (record.artworks || []) : 
                                     mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                                     (record.commercialSheets || []);

              const latestByCategory = mode === 'artwork' ? Object.values(
                (currentVersions || []).reduce((acc, v) => {
                  if (!v) return acc;
                  const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
                  if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
                  return acc;
                }, {} as Record<string, DocumentVersion>)
              ).sort((a: any, b: any) => {
                const catCompare = (a.category || '').localeCompare(b.category || '');
                if (catCompare !== 0) return catCompare;
                return (a.subcategory || '').localeCompare(b.subcategory || '');
              }) as DocumentVersion[]
              : (currentVersions && currentVersions.length > 0 ? [currentVersions.sort((a, b) => Number(b.version) - Number(a.version))[0]] : []);

              const isExpanded = expandedRows[record.id];
              const hasMore = latestByCategory.length > 1;
              const displayCategories = isExpanded ? latestByCategory : latestByCategory.slice(0, 1);
              const generalStatus = getRecordStatus(record, mode, latestByCategory);
              const assignment = mode === 'artwork' ? record.artworkAssignment : mode === 'technical_sheet' ? record.technicalAssignment : record.commercialAssignment;

              return (
                <tr 
                  key={record.id} 
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-1.5 py-2 border-r border-gray-100 w-20 min-w-[80px] max-w-[80px]">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => onViewDetail(record)} 
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => onEdit?.(record)} 
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all" 
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete?.(record)} 
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                        title="Borrar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 w-16 min-w-[64px] max-w-[64px]">
                    <div className="flex items-center justify-center gap-1">
                      <span 
                        onClick={() => onViewDetail(record)}
                        data-soly="datatable-correlative"
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 cursor-pointer hover:bg-indigo-100 hover:text-indigo-800 transition-all"
                      >
                        {record.correlativeId || '-'}
                      </span>
                      {record.artworkAssignment?.infoRequests?.some(r => !r.response) && (
                        <div className="relative group/alert">
                          <AlertCircle size={11} className="text-orange-500 animate-pulse" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/alert:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-50">
                            Solicitud de información pendiente
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-1.5 py-2 border-r border-gray-100 font-mono text-xs text-slate-600 font-bold w-[115px] min-w-[115px] max-w-[115px]">
                    <div className="flex items-center gap-1 justify-center w-full">
                      <span className="whitespace-nowrap" title={record.codigoSAP}>{record.codigoSAP}</span>
                      {onQualityClaimsClick && (
                        (() => {
                          const claimType = mode === 'artwork' ? 'artwork' : mode === 'technical_sheet' ? 'technical' : 'commercial';
                          const prodClaims = (qualityClaims || []).filter(c => c.productId === record.id && c.trackingType === claimType);
                          
                          let qBg = 'bg-slate-300/50 text-slate-500 hover:bg-slate-400/50';
                          let qTitle = 'Sin reclamos de calidad';
                          
                          if (prodClaims.length > 0) {
                            const hasOpen = prodClaims.some(c => c.status === 'open');
                            if (hasOpen) {
                              qBg = 'bg-red-500 text-white animate-pulse hover:bg-red-600';
                              qTitle = 'Reclamos de calidad abiertos';
                            } else {
                              qBg = 'bg-emerald-500 text-white hover:bg-emerald-600';
                              qTitle = 'Reclamos de calidad resueltos';
                            }
                          }
                          
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onQualityClaimsClick(record);
                              }}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black tracking-tighter shadow transition-all shrink-0 ${qBg}`}
                              title={qTitle}
                            >
                              Q
                            </button>
                          );
                        })()
                      )}
                    </div>
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-slate-700 font-bold uppercase text-[10px] leading-tight w-[150px] min-w-[150px] max-w-[150px] truncate" title={record.descripcionSAP}>
                    {record.descripcionSAP}
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-[11px] leading-tight text-slate-500 font-medium italic w-[50px] min-w-[50px] max-w-[50px] text-center">
                    {record.comments ? (
                      <button 
                        onClick={() => setSelectedCommentRecord(record)}
                        className="flex justify-center w-full focus:outline-none transition-transform active:scale-95 cursor-pointer"
                        title="Click para ver comentarios"
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-500 hover:text-indigo-600 transition-colors" />
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-[9px] text-slate-500 font-semibold uppercase tracking-tight text-center w-20 min-w-[80px] max-w-[80px] truncate" title={record.linea}>
                    {record.linea}
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-[9px] text-slate-500 font-semibold uppercase tracking-tight text-center w-24 min-w-[96px] max-w-[96px] truncate" title={record.categoria}>
                    {record.categoria || <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-center w-[70px] min-w-[70px] max-w-[70px]">
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                      record.marca === 'SOLE' 
                        ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {record.marca}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 text-center w-[90px] min-w-[90px] max-w-[90px]">
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border whitespace-nowrap inline-block ${generalStatus.color}`}>
                      {generalStatus.label}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 border-r border-gray-100 w-[115px] min-w-[115px] max-w-[115px]">
                    <div className="flex flex-col gap-1">
                      {/* Assignment */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-bold text-indigo-600">
                          {mode === 'artwork' ? 'ART:' : mode === 'technical_sheet' ? 'TEC:' : 'COM:'}
                        </span>
                        {assignment ? (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[9.5px] text-slate-600 truncate max-w-[50px]" title={assignment.designer}>
                              {assignment.designer.split(' ')[0]}
                            </span>
                            <button 
                              onClick={() => onInfoRequest?.(record, mode)} 
                              className="text-orange-500 hover:text-orange-700 transition-colors" 
                              title="Solicitar Información"
                            >
                              <HelpCircle size={12} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => onAssign?.(record, mode)} 
                            className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-0.5 whitespace-nowrap"
                          >
                            <UserPlus size={10} /> Asignar
                          </button>
                        )}
                      </div>
                      
                      {/* Deadline & Edit */}
                      {assignment && (
                        <div className="flex items-center justify-between gap-0.5 pt-1 border-t border-slate-50 mt-1">
                          <div className="flex items-center">
                            {isNearDeadline(assignment.plannedEndDate) ? (
                              <div className="flex items-center gap-0.5 text-red-500" title="Vencido o próximo a vencer">
                                <AlertCircle size={9} className="animate-pulse shrink-0" />
                                <span className="text-[8.5px] font-bold">Vence: {format(parseISO(assignment.plannedEndDate!), 'dd/MM')}</span>
                              </div>
                            ) : assignment.plannedEndDate ? (
                              <span className="text-[8.5px] text-slate-400">Vence: {format(parseISO(assignment.plannedEndDate), 'dd/MM')}</span>
                            ) : (
                              <span className="text-[8.5px] text-slate-300 italic">Sin fecha</span>
                            )}
                          </div>
                          <button 
                            onClick={() => onEditDates?.(record, mode)}
                            className="text-slate-300 hover:text-blue-500 transition-colors"
                            title="Editar fechas planificadas"
                          >
                            <Calendar size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Document Cells */}
                  <td className="px-1 py-2 border-r border-gray-100 text-center w-[60px] min-w-[60px] max-w-[60px]">
                    <div className="flex flex-col gap-1 items-center">
                      {displayCategories.length > 0 ? (
                        displayCategories.map((v, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5 items-start w-full px-0.5">
                            <div className="flex items-center justify-center gap-1 h-8 w-full">
                              <button 
                                onClick={() => onActionClick(record, mode, 'view', v)}
                                className="text-indigo-500 hover:text-indigo-700 transition-colors"
                                title={`Ver ${v.category || 'Documento'} V${v.version}`}
                              >
                                <ImageIcon size={16} />
                              </button>
                              <button 
                                onClick={() => onActionClick(record, mode, 'upload')}
                                className="text-slate-300 hover:text-indigo-500 transition-colors"
                                title="Subir nueva versión"
                              >
                                <Upload size={12} />
                              </button>
                            </div>
                            {mode === 'commercial_sheet' && v.files && v.files.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-0.5 w-full text-left bg-slate-50 p-1 rounded border border-slate-100">
                                {v.files.map((f, fIdx) => (
                                  <div key={fIdx} className="flex items-center gap-1 flex-wrap">
                                    <FileText size={10} className="text-slate-400 shrink-0" />
                                    <a 
                                      href={f.url}
                                      className="text-[9px] text-blue-600 hover:underline truncate max-w-[70px]"
                                      title={f.name}
                                    >
                                      {f.name}
                                    </a>
                                    {f.commercialType === 'provisional' ? (
                                      <span className="px-0.5 py-0.2 rounded text-[6.5px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 shrink-0">Prov</span>
                                    ) : f.commercialType === 'final' ? (
                                      <span className="px-0.5 py-0.2 rounded text-[6.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">Final</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <button 
                          onClick={() => onActionClick(record, mode, 'upload')}
                          className="text-slate-300 hover:text-indigo-500 transition-colors"
                          title={`Subir ${mode === 'artwork' ? 'artwork' : 'ficha'}`}
                        >
                          <Upload size={16} />
                        </button>
                      )}
                      {latestByCategory.some(v => v.idApproval?.status === 'not_started') && (
                        <button 
                          onClick={() => {
                            const targetVersion = latestByCategory.find(v => v.idApproval?.status === 'not_started') || latestByCategory[0];
                            onStartFlow?.(record, targetVersion);
                          }}
                          className="mt-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[8px] font-black uppercase tracking-wider transition-all animate-pulse w-full shadow-md shadow-blue-600/10 active:scale-95 whitespace-nowrap"
                          title="Iniciar flujo de aprobaciones para todos los archivos"
                        >
                          <Send size={8} />
                          <span>INICIAR</span>
                        </button>
                      )}
                      {hasMore && (
                        <button 
                          onClick={() => toggleRow(record.id)} 
                          className="text-[8px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1 py-0.5 rounded w-full mt-1 transition-colors h-[18px]"
                        >
                          {isExpanded ? 'Contraer' : `+${latestByCategory.length - 1}`}
                        </button>
                      )}
                    </div>
                  </td>
                  {renderApprovalCell(record, mode, latestByCategory, 'I+D', isExpanded, hasMore)}
                  {mode === 'artwork' ? (
                    <>
                      {renderApprovalCell(record, mode, latestByCategory, 'MKT', isExpanded, hasMore)}
                      {renderApprovalCell(record, mode, latestByCategory, 'PROV', isExpanded, hasMore)}
                      <td className="px-0.5 py-2 border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px]">
                        <div className="flex flex-col gap-2 items-center">
                          {displayCategories.length > 0 ? (
                            displayCategories.map((v, idx) => (
                              <div key={idx} className="h-8 flex flex-col justify-center items-center leading-none">
                                {v.category && <span className="text-[7.5px] text-slate-400 uppercase font-black truncate max-w-[40px]" title={v.category}>{v.category.substring(0,3)}:</span>}
                                <span className="text-[9.5px] text-indigo-600 font-black">V{v.version}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                          {hasMore && (
                            <div className="h-[22px] mt-1 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-slate-400">...</span>
                            </div>
                          )}
                        </div>
                      </td>
                      {renderApprovalCell(record, mode, latestByCategory, 'PLAN', isExpanded, hasMore)}
                    </>
                  ) : (
                    <td className="px-0.5 py-2 border-r border-gray-100 w-[42px] min-w-[42px] max-w-[42px]">
                      <div className="flex flex-col gap-2 items-center">
                        {displayCategories.length > 0 ? (
                          displayCategories.map((v, idx) => (
                            <div key={idx} className="h-8 flex flex-col justify-center items-center leading-none">
                              {v.category && <span className="text-[7.5px] text-slate-400 uppercase font-black truncate max-w-[40px]" title={v.category}>{v.category.substring(0,3)}:</span>}
                              <span className="text-[9.5px] text-indigo-600 font-black">V{v.version}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                        {hasMore && (
                          <div className="h-[22px] mt-1 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-slate-400">...</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {selectedCommentRecord && (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-md font-black text-slate-900 uppercase tracking-tight">Comentarios de la Solicitud</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5">{selectedCommentRecord.correlativeId}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedCommentRecord(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Producto / Descripción</span>
              <span className="text-xs font-bold text-slate-800 uppercase leading-snug block">{selectedCommentRecord.descripcionSAP}</span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Comentarios</span>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-slate-700 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {selectedCommentRecord.comments}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => setSelectedCommentRecord(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
