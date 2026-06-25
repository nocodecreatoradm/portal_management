import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProductRecord, ModuleId, CalculationRecord } from '../types';
import { FileText, CheckCircle, XCircle, Search, X, Eye, FolderArchive, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ProductDetailModal from './ProductDetailModal';
import { SupabaseService } from '../lib/SupabaseService';
import { Loader2 } from 'lucide-react';
import HeaderFilterPopover from './HeaderFilterPopover';

interface FolderFilesViewProps {
  files: Array<{ name: string; url: string; commercialType?: string }>;
  mode: 'artwork' | 'technical_sheet' | 'commercial_sheet';
}

function FolderFilesView({ files, mode }: FolderFilesViewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!files || files.length === 0) {
    return <span className="text-slate-400 italic text-[10px]">Sin archivos</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-semibold w-full justify-between group ${
          isOpen 
            ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' 
            : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/60'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <FolderOpen className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-105 transition-transform" />
          ) : (
            <FolderArchive className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-105 transition-transform" />
          )}
          <span className="truncate max-w-[130px]" title="Carpeta comprimida de archivos">
            {isOpen ? 'Carpeta abierta' : 'Carpeta comprimida'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
            {files.length} {files.length === 1 ? 'pdf' : 'pdfs'}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 p-2 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-lg min-w-[240px] max-w-[280px] z-50 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
            Archivos del Arte:
          </div>
          <div className="max-h-[180px] overflow-y-auto pr-1 space-y-1 scrollbar-thin">
            {files.map((file, i) => (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 text-blue-600 hover:text-blue-800 transition-all group/item"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
                {mode === 'commercial_sheet' && file.commercialType && (
                  <span className={`px-1 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                    file.commercialType === 'provisional'
                      ? 'bg-amber-50 text-amber-600 border border-amber-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {file.commercialType === 'provisional' ? 'Prov' : 'Final'}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CommercialArtworksProps {
  mode?: 'artwork' | 'technical_sheet' | 'commercial_sheet';
}

export default function CommercialArtworks({ 
  mode = 'artwork'
}: CommercialArtworksProps) {
  const { user } = useAuth();
  const [data, setData] = useState<ProductRecord[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  const moduleTitle = mode === 'artwork' ? 'Artes Comerciales Aprobados' : 
                      mode === 'technical_sheet' ? 'Fichas Técnicas Aprobadas' : 
                      'Fichas Comerciales Aprobadas';

  const handleSave = (details: { projectName: string; sampleId: string; description: string }) => {
    const statuses = data.map(r => ({ id: r.id, status: r.commercialStatus }));
    localStorage.setItem(`commercial_${mode}_statuses`, JSON.stringify(statuses));
    saveCalculationRecord(
      `commercial_${mode}`, 
      'save', 
      statuses, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Estados comerciales guardados localmente y en la base de datos');
  };

  const handleExportExcel = () => {
    const exportData = approvedProducts.map(record => ({
      'Código SAP': record.codigoSAP,
      'Descripción SAP': record.descripcionSAP,
      'Código EAN': record.codigoEAN,
      'Marca': record.marca,
      'Línea': record.linea
    }));

    exportToExcel(exportData, `${moduleTitle.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord(`commercial_${mode}`, 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'artworks-table', title: `Listado de ${moduleTitle}` }
    ];

    await generateReportPDF(sections, `Informe_${moduleTitle.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}`, `Informe de ${moduleTitle}`);
    saveCalculationRecord(`commercial_${mode}`, 'export_pdf', { sections }, user?.email || 'unknown');
  };

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, suppliersData, samplesData] = await Promise.all([
        SupabaseService.getProducts(),
        SupabaseService.getSuppliers(),
        SupabaseService.getSamples()
      ]);
      setData(productsData);
      setSuppliers(suppliersData);
      setSamples(samplesData);
    } catch (error) {
      console.error('Error loading commercial artworks data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async (id: string, updates: Partial<ProductRecord>) => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let result;
      if (isUUID) {
        const currentRecord = data.find(r => r.id === id);
        if (updates.gallery !== undefined && currentRecord?.codigoSAP) {
          const matchingRecords = data.filter(r => r.codigoSAP === currentRecord.codigoSAP);
          const results = await Promise.all(matchingRecords.map(r => 
            SupabaseService.updateProduct(r.id, { gallery: updates.gallery })
          ));
          setData(prev => prev.map(r => {
            const updated = results.find(res => res.id === r.id);
            return updated || r;
          }));
          result = results.find(res => res.id === id);
        } else {
          result = await SupabaseService.updateProduct(id, updates);
          setData(prev => prev.map(p => p.id === id ? result : p));
        }
      } else {
        const p = data.find(item => item.id === id);
        if (p && p.codigoSAP) {
          result = await SupabaseService.updateProductBySAP(p.codigoSAP, updates);
        }
      }
      if (result) {
        if (selectedProduct?.id === id) {
          setSelectedProduct(result);
        }
        toast.success('Estado actualizado');
      } else {
        // If it's a mock product not in Supabase, update it locally in state
        setData(prev => {
          const newData = prev.map(p => p.id === id ? { ...p, ...updates } : p);
          if (selectedProduct?.id === id) {
            const updated = newData.find(p => p.id === id);
            if (updated) setSelectedProduct(updated);
          }
          return newData;
        });
        toast.success('Estado actualizado localmente');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar registro');
    }
  };

  const handleUpdateVersionStatus = async (productId: string, versionNumber: number, status: 'A la venta' | 'No a la venta') => {
    const record = data.find(r => r.id === productId);
    if (!record) return;

    const listKey = mode === 'artwork' ? 'artworks' : 
                    mode === 'technical_sheet' ? 'technicalSheets' : 
                    'commercialSheets';
    
    const versions = [...(record[listKey] || [])];
    const updatedVersions = versions.map(v => 
      v.version === versionNumber ? { ...v, commercialStatus: status } : v
    );

    await handleUpdateRecord(productId, { [listKey]: updatedVersions });
  };

  // Filter products that have at least one approved version
  const approvedProducts = useMemo(() => {
    let result = data.filter(record => {
      const versions = mode === 'artwork' ? record.artworks : 
                        mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                        (record.commercialSheets || []);

      return versions.some(v => {
        if (mode === 'artwork') {
          return v.idApproval.status === 'approved' &&
                 v.mktApproval.status === 'approved' &&
                 v.planApproval.status === 'approved' &&
                 v.provApproval.status === 'approved';
        } else {
          // Only I+D approval for technical and commercial sheets
          return v.idApproval.status === 'approved';
        }
      });
    });

    // Apply column filters
    (Object.entries(columnFilters) as [string, string][]).forEach(([key, value]) => {
      if (!value) return;
      const lowerValue = value.toLowerCase();
      result = result.filter(item => {
        const itemValue = String((item as any)[key] || '').toLowerCase();
        return itemValue.includes(lowerValue);
      });
    });

    // Sort by sortConfig or fallback to createdAt descending
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.column] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.column] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => b.correlativeId.localeCompare(a.correlativeId, undefined, { numeric: true }));
    }

    return result;
  }, [data, columnFilters, sortConfig, mode]);

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight tracking-tight uppercase">{moduleTitle}</h2>
          <p className="text-slate-500 font-medium mt-1">
            {mode === 'artwork' ? 'Visualización de diseños aprobados para comercialización e inspección' : 
             mode === 'technical_sheet' ? 'Visualización de fichas técnicas aprobadas por I+D' : 
             'Visualización de fichas comerciales aprobadas por I+D'}
          </p>
        </div>
      </div>

      <div id="artworks-table" className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col">
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto h-3 bg-slate-50 border-b border-slate-100"
        >
          <div style={{ width: '1200px', height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase text-[10px] font-bold border-b border-gray-200 sticky top-0 z-20">
              <tr>
                <th className="px-6 py-4 border-r border-gray-100">
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
                <th className="px-6 py-4 border-r border-gray-100">
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
                <th className="px-4 py-4 border-r border-gray-100">
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
                <th className="px-4 py-4 border-r border-gray-100">
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
                <th className="px-4 py-4 border-r border-gray-100">
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
                <th className="px-4 py-4 border-r border-gray-100">Archivos</th>
                <th className="px-4 py-4 border-r border-gray-100 text-center">Ver.</th>
                <th className="px-4 py-4 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 italic">
                    No hay elementos aprobados actualmente.
                  </td>
                </tr>
              ) : (
                approvedProducts.map((record) => {
                  const versions = mode === 'artwork' ? record.artworks : 
                                    mode === 'technical_sheet' ? (record.technicalSheets || []) : 
                                    (record.commercialSheets || []);

                  const approvedVersions = versions.filter(v => {
                    if (mode === 'artwork') {
                      return v.idApproval.status === 'approved' &&
                             v.mktApproval.status === 'approved' &&
                             v.planApproval.status === 'approved' &&
                             v.provApproval.status === 'approved';
                    } else {
                      return v.idApproval.status === 'approved';
                    }
                  });

                  if (approvedVersions.length === 0) return null;

                  // Group approved versions by category & subcategory (for artwork)
                  const groupsMap: Record<string, {
                    category?: string;
                    subcategory?: string;
                    displayName: string;
                    versions: DocumentVersion[];
                  }> = {};

                  approvedVersions.forEach(v => {
                    let key = '';
                    let displayName = '';
                    if (mode === 'artwork') {
                      const cat = v.category || 'Otros';
                      const sub = v.subcategory || 'Printing';
                      key = `${cat}-${sub}`;
                      displayName = `${cat} (${sub === 'Printing' ? 'Impresión' : 'Editable'})`;
                    } else {
                      key = mode === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial';
                      displayName = key;
                    }

                    if (!groupsMap[key]) {
                      groupsMap[key] = {
                        category: v.category,
                        subcategory: v.subcategory,
                        displayName,
                        versions: []
                      };
                    }
                    groupsMap[key].versions.push(v);
                  });

                  const groups = Object.values(groupsMap);

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 border-r border-gray-100 font-bold text-blue-600 text-[11px]">
                        {record.codigoSAP}
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100 font-bold text-slate-700 uppercase text-[11px]">
                        {record.descripcionSAP}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 font-mono text-xs text-slate-600">
                        {record.codigoEAN}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          record.marca === 'SOLE' 
                            ? 'bg-orange-50 text-orange-600 border border-orange-100' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {record.marca}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 text-[10px] text-slate-500 font-medium uppercase">
                        {record.linea}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 min-w-[200px]">
                        <div className="flex flex-col gap-4 py-1">
                          {groups.map((group) => {
                            const groupKey = mode === 'artwork' ? `${group.category || 'Otros'}-${group.subcategory || 'Printing'}` : mode;
                            const stateKey = `${record.id}-${groupKey}`;
                            const sortedGroupVersions = [...group.versions].sort((a, b) => a.version - b.version);
                            const latestApproved = sortedGroupVersions[sortedGroupVersions.length - 1];
                            const currentVersionNum = selectedVersions[stateKey] || latestApproved.version;
                            const currentVersion = group.versions.find(v => v.version === currentVersionNum) || latestApproved;

                            return (
                              <div key={groupKey} className="flex flex-col gap-1 pb-3 last:pb-0 border-b border-slate-100 last:border-0">
                                {mode === 'artwork' && (
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                                    {group.displayName}
                                  </span>
                                )}
                                <FolderFilesView files={currentVersion.files} mode={mode} />
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 text-center font-bold text-slate-600">
                        <div className="flex flex-col gap-4 py-1 justify-center">
                          {groups.map((group) => {
                            const groupKey = mode === 'artwork' ? `${group.category || 'Otros'}-${group.subcategory || 'Printing'}` : mode;
                            const stateKey = `${record.id}-${groupKey}`;
                            const sortedGroupVersions = [...group.versions].sort((a, b) => a.version - b.version);
                            const latestApproved = sortedGroupVersions[sortedGroupVersions.length - 1];
                            const currentVersionNum = selectedVersions[stateKey] || latestApproved.version;

                            return (
                              <div key={groupKey} className="flex flex-col items-center justify-end min-h-[38px] pb-3 last:pb-0 border-b border-transparent last:border-0">
                                {mode === 'artwork' && <div className="h-3.5"></div>}
                                {group.versions.length > 1 ? (
                                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1 shadow-sm text-slate-700 font-semibold text-xs">
                                    <select
                                      value={currentVersionNum}
                                      onChange={(e) => setSelectedVersions(prev => ({ ...prev, [stateKey]: parseInt(e.target.value) }))}
                                      className="bg-transparent border-none outline-none text-center cursor-pointer hover:text-blue-600 transition-colors font-bold text-xs"
                                    >
                                      {[...sortedGroupVersions].reverse().map(v => (
                                        <option key={v.version} value={v.version}>
                                          V{v.version} {v.version === latestApproved.version ? '(Última)' : '(Anterior)'}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center bg-slate-50 border border-slate-200/40 rounded-xl px-3 py-1 text-slate-500 font-semibold text-xs">
                                    V{latestApproved.version} (Última)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setSelectedProduct(record)}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 group"
                          title="Ver Detalles y Galería"
                        >
                          <Eye size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProduct && (
        <ProductDetailModal
          record={selectedProduct}
          suppliers={suppliers}
          samples={samples}
          onClose={() => setSelectedProduct(null)}
          onUpdateRecord={handleUpdateRecord}
        />
      )}
    </div>
  );
}
