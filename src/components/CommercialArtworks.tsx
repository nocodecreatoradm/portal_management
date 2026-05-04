import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProductRecord, ModuleId, CalculationRecord } from '../types';
import { FileText, CheckCircle, XCircle, Search, X, Eye } from 'lucide-react';
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
      'Línea': record.linea,
      'Estado Comercial': record.commercialStatus || 'No a la venta'
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
        result = await SupabaseService.updateProduct(id, updates);
      } else {
        const p = data.find(item => item.id === id);
        if (p && p.codigoSAP) {
          result = await SupabaseService.updateProductBySAP(p.codigoSAP, updates);
        }
      }
      if (result) {
        setData(prev => prev.map(p => p.id === id ? result : p));
        toast.success('Estado actualizado');
      } else {
        // If it's a mock product not in Supabase, update it locally in state
        setData(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        toast.success('Estado actualizado localmente');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Error al actualizar registro');
    }
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
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
          <div style={{ width: '1350px', height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-sm text-left border-collapse min-w-[1350px]">
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
                <th className="px-6 py-4 bg-blue-50/50 text-blue-600">¿Está a la venta?</th>
                <th className="px-4 py-4 text-center">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">
                    No hay elementos aprobados actualmente.
                  </td>
                </tr>
              ) : (
                approvedProducts.map((record) => {
                  // Get the latest approved version
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
                  const latestApproved = approvedVersions[approvedVersions.length - 1];

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
                      <td className="px-4 py-4 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          {latestApproved.files.map((f, i) => (
                            <a 
                              key={i} 
                              href={f.url} 
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 transition-colors group"
                            >
                              <FileText size={14} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-medium truncate max-w-[120px]" title={f.name}>{f.name}</span>
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 text-center font-bold text-slate-600">
                        V{latestApproved.version}
                      </td>
                      <td className="px-6 py-4 bg-blue-50/20">
                        <select 
                          value={record.commercialStatus || 'No a la venta'}
                          onChange={(e) => handleUpdateRecord(record.id, { commercialStatus: e.target.value as any })}
                          className={`w-full border rounded-lg px-3 py-1.5 text-xs font-bold outline-none transition-all ${
                            record.commercialStatus === 'A la venta'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-2 focus:ring-emerald-500'
                              : 'bg-slate-50 border-slate-200 text-slate-600 focus:ring-2 focus:ring-slate-400'
                          }`}
                        >
                          <option value="No a la venta">No a la venta</option>
                          <option value="A la venta">A la venta</option>
                        </select>
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
