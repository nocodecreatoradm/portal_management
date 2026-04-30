import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RDInventoryItem, FileInfo } from '../types';
import { 
  Search, Plus, Filter, Download, Calendar, 
  AlertCircle, CheckCircle, Clock, FileText, 
  Upload, Trash2, Edit2, ChevronRight, Info, X,
  LayoutDashboard, Image as ImageIcon, BookOpen,
  Camera, File, BarChart3
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { initialRDInventory } from '../data/mockData';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

interface RDInventoryProps {
  initialItems?: RDInventoryItem[];
  onExportPPT?: () => void;
}

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export default function RDInventory({ initialItems, onExportPPT: propOnExportPPT }: RDInventoryProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<RDInventoryItem[]>(initialItems || []);
  const [loading, setLoading] = useState(!initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RDInventoryItem | null>(null);
  const [viewingCalibration, setViewingCalibration] = useState<RDInventoryItem | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<RDInventoryItem | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<RDInventoryItem | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  // Load inventory from Supabase
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const data = await SupabaseService.getInventory();
        const remoteItems = data as unknown as RDInventoryItem[];
        
        // Merge with initialRDInventory (on-demand migration support)
        const remoteIds = new Set(remoteItems.map(i => i.id));
        const remoteSerials = new Set(remoteItems.map(i => i.serialNumber).filter(Boolean));
        
        const uniqueMockItems = initialRDInventory.filter(mock => 
          !remoteIds.has(mock.id) && (!mock.serialNumber || !remoteSerials.has(mock.serialNumber))
        );
        
        setItems([...remoteItems, ...uniqueMockItems]);
      } catch (error) {
        console.error('Error loading inventory:', error);
        toast.error('Error al cargar el inventario de Supabase');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

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

  const handleAddItem = async (item: Omit<RDInventoryItem, 'id'>) => {
    try {
      const newItem = await SupabaseService.createInventoryItem(item);
      setItems(prev => [newItem as unknown as RDInventoryItem, ...prev]);
      toast.success('Equipo añadido al inventario');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Error al añadir equipo');
    }
  };

  const handleUpdateItem = async (updatedItem: RDInventoryItem) => {
    try {
      const validUUID = isUUID(updatedItem.id);
      let result;
      if (validUUID) {
        result = await SupabaseService.updateInventoryItem(updatedItem.id, updatedItem);
      } else {
        const { id, ...itemWithoutId } = updatedItem;
        result = await SupabaseService.createInventoryItem(itemWithoutId);
      }
      setItems(prev => prev.map(item => item.id === updatedItem.id ? (result as unknown as RDInventoryItem) : item));
      toast.success('Inventario actualizado');
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Error al actualizar inventario');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const validUUID = isUUID(id);
      if (validUUID) {
        await SupabaseService.deleteInventoryItem(id);
      }
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Equipo eliminado');
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Error al eliminar equipo');
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Sort by ID descending (last created first)
    result.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

    // Apply global search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.description.toLowerCase().includes(lowerSearch) ||
        item.serialNumber.toLowerCase().includes(lowerSearch) ||
        item.brand.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply column filters
    (Object.entries(columnFilters) as [string, string][]).forEach(([key, value]) => {
      if (!value) return;
      const lowerValue = value.toLowerCase();
      result = result.filter(item => {
        const itemValue = String((item as any)[key] || '').toLowerCase();
        return itemValue.includes(lowerValue);
      });
    });

    return result;
  }, [items, searchTerm, columnFilters]);

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const renderFilterInput = (column: string, placeholder: string) => (
    <div className="relative mt-1 px-1">
      <input
        type="text"
        value={columnFilters[column] || ''}
        onChange={(e) => handleFilterChange(column, e.target.value)}
        placeholder={placeholder}
        className="w-full pl-6 pr-2 py-1 text-[9px] font-normal border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white normal-case"
      />
      <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
      {columnFilters[column] && (
        <button 
          onClick={() => handleFilterChange(column, '')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );

  const getCalibrationStatusColor = (status: string) => {
    switch (status) {
      case 'Operativo': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Programado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Vencido': return 'bg-red-50 text-red-600 border-red-100';
      case 'En Calibración': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getTimelineInfo = (nextDate?: string) => {
    if (!nextDate) return null;
    const date = parseISO(nextDate);
    if (!isValid(date)) return null;
    
    const days = differenceInDays(date, new Date());
    if (days < 0) return { label: 'Vencido', color: 'text-red-600', icon: <AlertCircle size={14} />, status: 'vencido' };
    if (days < 30) return { label: `Por vencer (${days}d)`, color: 'text-amber-600', icon: <Clock size={14} />, status: 'por_vencer' };
    return { label: `Válido (${days}d)`, color: 'text-emerald-600', icon: <CheckCircle size={14} />, status: 'valido' };
  };

  const handleCertificateUpload = async (e: React.FormEvent<HTMLFormElement>, item: RDInventoryItem) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const calDate = formData.get('calibrationDate') as string;
    const expDate = formData.get('expiryDate') as string;
    const file = formData.get('file') as File;
    
    try {
      let fileInfo: FileInfo;
      if (file && file.size > 0) {
        fileInfo = await SupabaseService.uploadFile('inventory', `certificates/${item.serialNumber}/${file.name}`, file);
      } else {
        fileInfo = { 
          name: `Certificado_${item.serialNumber}_${calDate}.pdf`, 
          url: '#', 
          type: 'application/pdf',
          uploadDate: new Date().toISOString()
        };
      }
      
      const newCert = {
        ...fileInfo,
        calibrationDate: calDate,
        expiryDate: expDate,
        version: (item.certificateHistory?.length || 0) + 1
      };

      const updatedItem: RDInventoryItem = {
        ...item,
        certificate: fileInfo.name,
        lastCalibrationDate: calDate,
        nextCalibrationDate: expDate,
        calibrationStatus: 'Operativo',
        certificateHistory: [...(item.certificateHistory || []), newCert]
      };

      await handleUpdateItem(updatedItem);
      if (selectedDetailItem?.id === item.id) setSelectedDetailItem(updatedItem);
      setShowCertificateModal(null);
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast.error('Error al subir el certificado');
    }
  };

  const NewCertificateModal = ({ item, onCancel }: { item: RDInventoryItem, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Actualizar Certificado</h3>
            <p className="text-slate-500 text-sm font-medium">{item.description}</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={(e) => handleCertificateUpload(e, item)} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Calibración</label>
            <input type="date" name="calibrationDate" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Vencimiento</label>
            <input type="date" name="expiryDate" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Archivo del Certificado</label>
            <div className="relative">
              <input type="file" name="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  toast.info(`Archivo seleccionado: ${file.name}`);
                }
              }} />
              <div className="w-full px-5 py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:border-indigo-200 transition-all">
                <Upload size={24} />
                <span className="text-[10px] font-black uppercase">Seleccionar PDF</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Subir</button>
          </div>
        </form>
      </div>
    </div>
  );

  const DashboardModal = () => {
    const calibrationData = [
      { name: 'Válida', value: items.filter(i => getTimelineInfo(i.nextCalibrationDate)?.status === 'valido').length, color: '#10b981' },
      { name: 'Por Vencer', value: items.filter(i => getTimelineInfo(i.nextCalibrationDate)?.status === 'por_vencer').length, color: '#f59e0b' },
      { name: 'Vencido', value: items.filter(i => getTimelineInfo(i.nextCalibrationDate)?.status === 'vencido').length, color: '#ef4444' },
    ];

    const operationalData = [
      { name: 'Operativo', value: items.filter(i => i.calibrationStatus === 'Operativo').length, color: '#10b981' },
      { name: 'Programado', value: items.filter(i => i.calibrationStatus === 'Programado').length, color: '#3b82f6' },
      { name: 'En Calibración', value: items.filter(i => i.calibrationStatus === 'En Calibración').length, color: '#f59e0b' },
      { name: 'Vencido', value: items.filter(i => i.calibrationStatus === 'Vencido').length, color: '#ef4444' },
    ];

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Panel de Inventario</h3>
              <p className="text-slate-500 text-sm font-medium">Estado general de equipos y calibraciones</p>
            </div>
            <button onClick={() => setShowDashboard(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
          <div id="inventory-dashboard" className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Estado de Calibración</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={calibrationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {calibrationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Estado Operativo</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operationalData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {operationalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EquipmentDetailModal = ({ item }: { item: RDInventoryItem }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Detalles del Equipo</h3>
            <p className="text-slate-500 text-sm font-medium">{item.description} - {item.serialNumber}</p>
          </div>
          <button onClick={() => setSelectedDetailItem(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información General</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marca</p>
                  <p className="text-sm font-bold text-slate-700">{item.brand}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</p>
                  <p className="text-sm font-bold text-slate-700">{item.model}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</p>
                  <p className="text-sm font-bold text-slate-700">{item.category}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                  <p className="text-sm font-bold text-slate-700">{item.equipmentType}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especificaciones</h4>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium tracking-tight">Rango:</span>
                  <span className="font-bold text-slate-700 uppercase">{item.equipmentRange}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium tracking-tight">Origen:</span>
                  <span className="font-bold text-slate-700 uppercase">{item.sourceType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium tracking-tight">Responsable:</span>
                  <span className="font-bold text-slate-700 uppercase">{item.responsible}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual del Equipo</h4>
              {item.manual ? (
                <a href={item.manual.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 group">
                  <div className="p-3 bg-indigo-600 text-white rounded-xl group-hover:scale-110 transition-transform">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-indigo-900 uppercase tracking-tight">{item.manual.name}</p>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Click para visualizar</p>
                  </div>
                </a>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 text-slate-400">
                  <BookOpen size={20} />
                  <p className="text-sm font-bold uppercase tracking-tight">No hay manual disponible</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Certificados</h4>
                <button 
                  onClick={() => setShowCertificateModal(item)}
                  className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 transition-colors"
                >
                  <Plus size={12} />
                  Nuevo Certificado
                </button>
              </div>
              <div className="space-y-2">
                {item.certificateHistory && item.certificateHistory.length > 0 ? (
                  item.certificateHistory.sort((a: any, b: any) => b.version - a.version).map((cert, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <FileText size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 uppercase">V{cert.version} - {cert.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Calibrado: {cert.calibrationDate} | Vence: {cert.expiryDate}</p>
                        </div>
                      </div>
                      <a href={cert.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all">
                        <Download size={14} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed flex flex-col items-center justify-center text-slate-400 gap-2">
                    <FileText size={24} className="opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No hay historial</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos del Equipo</h4>
              <div className="grid grid-cols-2 gap-4">
                {item.photos && item.photos.length > 0 ? (
                  item.photos.map((photo, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 group relative">
                      <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="text-white" size={24} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 aspect-video bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <ImageIcon size={32} />
                    <p className="text-xs font-bold uppercase tracking-tight">No hay fotos disponibles</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Calibración</h4>
              <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase ${getCalibrationStatusColor(item.calibrationStatus)}`}>
                    {item.calibrationStatus}
                  </span>
                  {(() => {
                    const info = getTimelineInfo(item.nextCalibrationDate);
                    return info ? (
                      <div className={`flex items-center gap-2 text-[11px] font-black uppercase ${info.color}`}>
                        {info.icon}
                        {info.label}
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última</p>
                    <p className="text-sm font-bold text-slate-700">{item.lastCalibrationDate || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próxima</p>
                    <p className="text-sm font-bold text-slate-700">{item.nextCalibrationDate || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const EquipmentForm = ({ item, onSubmit, onCancel, title }: { item?: RDInventoryItem, onSubmit: (data: any) => void, onCancel: () => void, title: string }) => {
    const [photos, setPhotos] = useState<FileInfo[]>(item?.photos || []);
    const [manual, setManual] = useState<FileInfo | null>(item?.manual || null);

    const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const fileInfo = await SupabaseService.uploadFile('inventory', `photos/${item?.serialNumber || 'new'}/${file.name}`, file);
        setPhotos(prev => [...prev, fileInfo]);
        toast.success('Foto subida');
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Error al subir foto');
      }
    };

    const handleManualAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const fileInfo = await SupabaseService.uploadFile('inventory', `manuals/${item?.serialNumber || 'new'}/${file.name}`, file);
        setManual(fileInfo);
        toast.success('Manual subido');
      } catch (error) {
        console.error('Error uploading manual:', error);
        toast.error('Error al subir manual');
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
              <p className="text-slate-500 text-sm font-medium">Completa los datos del equipo</p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              serialNumber: formData.get('serialNumber') as string,
              description: formData.get('description') as string,
              responsible: formData.get('responsible') as string,
              brand: formData.get('brand') as string,
              model: formData.get('model') as string,
              category: formData.get('category') as string,
              equipmentType: formData.get('equipmentType') as string,
              sourceType: formData.get('sourceType') as string,
              equipmentRange: formData.get('equipmentRange') as string,
              calibrationStatus: formData.get('calibrationStatus') as any,
              lastCalibrationDate: formData.get('lastCalibrationDate') as string,
              nextCalibrationDate: formData.get('nextCalibrationDate') as string,
              acquisitionDate: formData.get('acquisitionDate') as string,
              startupDate: formData.get('startupDate') as string,
              photos: photos,
              manual: manual,
            };
            onSubmit(item ? { ...item, ...data } : data);
          }} className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-h-[70vh] overflow-y-auto">
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multimedia</h4>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*"
                      onChange={handlePhotoAdd}
                    />
                    <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all group">
                      <Camera size={24} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase">
                        {photos.length > 0 ? `${photos.length} Fotos` : 'Añadir Fotos'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept=".pdf,.doc,.docx"
                      onChange={handleManualAdd}
                    />
                    <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all group">
                      <File size={24} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase">
                        {manual ? 'Manual Subido' : 'Subir Manual'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
              <input name="description" defaultValue={item?.description} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">N° Serie</label>
              <input name="serialNumber" defaultValue={item?.serialNumber} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
              <input name="responsible" defaultValue={item?.responsible || 'I+D'} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
              <input name="brand" defaultValue={item?.brand} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
              <input name="model" defaultValue={item?.model} required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <select name="category" defaultValue={item?.category} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700">
                <option>Equipo de Medición</option>
                <option>Equipo de Ensayo</option>
                <option>Herramienta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Equipo</label>
              <input name="equipmentType" defaultValue={item?.equipmentType} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rango</label>
              <input name="equipmentRange" defaultValue={item?.equipmentRange} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Última Calibración</label>
              <input type="date" name="lastCalibrationDate" defaultValue={item?.lastCalibrationDate} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Próxima Calibración</label>
              <input type="date" name="nextCalibrationDate" defaultValue={item?.nextCalibrationDate} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
              <select name="calibrationStatus" defaultValue={item?.calibrationStatus} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700">
                <option value="Programado">Programado</option>
                <option value="Operativo">Operativo</option>
                <option value="Vencido">Vencido</option>
                <option value="En Calibración">En Calibración</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-4 pt-4">
              <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 border border-slate-200 rounded-xl md:rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
              <button type="submit" className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    localStorage.setItem('rd_inventory_data', JSON.stringify(items));
    
    try {
      const recordName = await generateModuleCorrelative('rd_inventory', details.projectName);
      
      await saveCalculationRecord(
        'rd_inventory', 
        'save', 
        { items, recordName }, 
        user?.email || 'unknown',
        details.projectName,
        details.sampleId,
        details.description
      );
      toast.success('Inventario guardado localmente y en la base de datos');
    } catch (error) {
      console.error('Error saving inventory record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleExportExcel = () => {
    const data = items.map(item => ({
      'ID': item.id,
      'Descripción': item.description,
      'S/N': item.serialNumber,
      'Marca': item.brand,
      'Modelo': item.model,
      'Categoría': item.category,
      'Estado': item.calibrationStatus,
      'Responsable': item.responsible,
      'Última Calibración': item.lastCalibrationDate || 'N/A',
      'Próxima Calibración': item.nextCalibrationDate || 'N/A',
    }));
    exportToExcel(data, 'Inventario_Equipos_ID');
    saveCalculationRecord('rd_inventory', 'export_excel', data, user?.email || 'unknown');
    toast.success('Excel exportado correctamente');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'inventory-table', title: 'Inventario de Equipos' },
      { contentId: 'inventory-dashboard', title: 'Panel de Control' }
    ];
    await generateReportPDF(sections, 'Informe_Inventario_Equipos_ID', 'Informe de Inventario de Equipos I+D');
    saveCalculationRecord('rd_inventory', 'export_pdf', { sections }, user?.email || 'unknown');
    toast.success('PDF exportado correctamente');
  };

  const handleExportPPT = async () => {
    const sections = [
      { contentId: 'inventory-dashboard', title: 'Panel de Control de Inventario' },
      { contentId: 'inventory-table', title: 'Tabla General de Equipos' }
    ];
    await exportToPPT(sections, 'Presentacion_Inventario_Equipos_ID', 'Gestión de Inventario de Equipos I+D');
    saveCalculationRecord('rd_inventory', 'export_ppt', { sections }, user?.email || 'unknown');
    toast.success('PPT exportado correctamente');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando Inventario...</p>
      </div>
    );
  }

  return (
    <div id="rd-inventory-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl md:rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-slate-200 shrink-0">
            <LayoutDashboard size={28} className="md:w-8 md:h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight">Inventario de Equipos I+D</h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium tracking-wide uppercase mt-1">Gestión y Control de Calibraciones</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <ModuleActions 
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={handleExportPPT}
          />
          <button 
            onClick={() => setShowDashboard(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <BarChart3 size={20} />
            Panel
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black uppercase text-xs md:text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
          >
            <Plus size={20} />
            Nuevo Equipo
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar por descripción, serie o marca..."
            className="w-full pl-12 pr-4 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-[24px] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-600 shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 rounded-xl md:rounded-[24px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm text-sm">
            <Filter size={20} />
            Filtros
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div id="inventory-table" className="bg-white rounded-2xl md:rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto h-3 bg-slate-50 border-b border-slate-100"
        >
          <div style={{ width: '1500px', height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Equipo / Serie
                  {renderFilterInput('description', 'Filtrar...')}
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Responsable
                  {renderFilterInput('responsible', 'Filtrar...')}
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Estado
                  {renderFilterInput('calibrationStatus', 'Filtrar...')}
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Marca / Modelo
                  {renderFilterInput('brand', 'Filtrar...')}
                </th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cronograma de Calibración</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Certificado</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => {
                const timeline = getTimelineInfo(item.nextCalibrationDate);
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedDetailItem(item)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 uppercase leading-tight">{item.description}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1">S/N: {item.serialNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase">
                        {item.responsible}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase ${getCalibrationStatusColor(item.calibrationStatus)}`}>
                        {item.calibrationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{item.brand}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {timeline ? (
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 text-[11px] font-black uppercase ${timeline.color}`}>
                            {timeline.icon}
                            {timeline.label}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCalibration(item);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
                            title="Ver detalles de calibración"
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase">No programada</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {item.certificate ? (
                        <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
                          <FileText size={16} />
                          <span className="text-[10px] font-black uppercase">{item.certificate}</span>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCertificateModal(item);
                          }}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group/upload"
                        >
                          <Upload size={16} className="group-hover/upload:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase">Subir</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Está seguro de eliminar este equipo?')) {
                              handleDeleteItem(item.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <EquipmentForm 
          title="Añadir Nuevo Equipo"
          onCancel={() => setShowAddModal(false)}
          onSubmit={handleAddItem}
        />
      )}

      {editingItem && (
        <EquipmentForm 
          title="Editar Equipo"
          item={editingItem}
          onCancel={() => setEditingItem(null)}
          onSubmit={handleUpdateItem}
        />
      )}

      {showDashboard && <DashboardModal />}
      
      {selectedDetailItem && (
        <EquipmentDetailModal 
          item={selectedDetailItem} 
        />
      )}

      {showCertificateModal && (
        <NewCertificateModal 
          item={showCertificateModal}
          onCancel={() => setShowCertificateModal(null)}
        />
      )}

      {viewingCalibration && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Info Calibración</h3>
                <p className="text-slate-500 text-sm font-medium">{viewingCalibration.description}</p>
              </div>
              <button onClick={() => setViewingCalibration(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inicio</p>
                  <p className="text-sm font-bold text-slate-700">
                    {viewingCalibration.lastCalibrationDate ? format(parseISO(viewingCalibration.lastCalibrationDate), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencimiento</p>
                  <p className="text-sm font-bold text-slate-700">
                    {viewingCalibration.nextCalibrationDate ? format(parseISO(viewingCalibration.nextCalibrationDate), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Vigencia</p>
                  {(() => {
                    const info = getTimelineInfo(viewingCalibration.nextCalibrationDate);
                    return (
                      <p className={`text-sm font-black uppercase ${info?.color || 'text-slate-400'}`}>
                        {info?.label || 'Sin fecha'}
                      </p>
                    );
                  })()}
                </div>
                {(() => {
                  const info = getTimelineInfo(viewingCalibration.nextCalibrationDate);
                  return <div className={`${info?.color}`}>{info?.icon}</div>;
                })()}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalles Adicionales</p>
                <div className="text-xs space-y-2 text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Marca:</span>
                    <span className="font-bold">{viewingCalibration.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modelo:</span>
                    <span className="font-bold">{viewingCalibration.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Serie:</span>
                    <span className="font-bold">{viewingCalibration.serialNumber}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setViewingCalibration(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
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
