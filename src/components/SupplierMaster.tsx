import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  X, 
  Globe, 
  Hash, 
  Building2, 
  Image as ImageIcon,
  MoreVertical,
  Edit2,
  Trash2,
  Users,
  Mail,
  Phone,
  QrCode,
  Link as LinkIcon,
  Star,
  Zap,
  Award,
  AlertTriangle,
  DollarSign,
  ClipboardList
} from 'lucide-react';
import { Supplier, SupplierEvaluation } from '../types';
import { initialSuppliers } from '../data/mockData';
import { motion, AnimatePresence } from 'motion/react';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF } from '../lib/exportUtils';
import { saveCalculationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SupplierMasterProps {
  suppliers: Supplier[];
  onAddSupplier?: (supplier: Partial<Supplier>) => void;
  onUpdateSupplier?: (id: string, supplier: Partial<Supplier>) => void;
  onDeleteSupplier?: (id: string) => void;
  onExportPPT?: () => void;
}

const SupplierMaster: React.FC<SupplierMasterProps> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onExportPPT }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    id: string; 
    title: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Supplier>>({
    legalName: '',
    commercialAlias: '',
    erpCode: '',
    country: '',
    logoUrl: '',
    contacts: '',
    website: '',
    wechat: '',
    email: '',
    evaluation: {
      innovation: 0,
      responseTime: 0,
      quality: 0,
      failureIndex: 0,
      price: 0
    }
  });

  const handleEvaluationChange = (field: keyof SupplierEvaluation, value: number) => {
    setFormData(prev => ({
      ...prev,
      evaluation: {
        ...(prev.evaluation || {}),
        [field]: value,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const handleSaveData = (details: { projectName: string; sampleId: string; description: string }) => {
    localStorage.setItem('supplier_master_backup', JSON.stringify(suppliers));
    saveCalculationRecord(
      'supplier_master', 
      'save', 
      suppliers, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Copia de seguridad de proveedores guardada localmente y en la base de datos');
  };

  const handleExportExcel = () => {
    const exportData = suppliers.map(s => ({
      'Razón Social': s.legalName,
      'Nombre Comercial': s.commercialAlias,
      'Código ERP': s.erpCode,
      'País': s.country,
      'Contactos': s.contacts || '',
      'Página Web': s.website || '',
      'WeChat': s.wechat || '',
      'Correo': s.email || '',
      'Capacidad de Innovación': s.evaluation?.innovation || 0,
      'Tiempo de Respuesta': s.evaluation?.responseTime || 0,
      'Calidad de Productos': s.evaluation?.quality || 0,
      'Índice de Fallas': s.evaluation?.failureIndex || 0,
      'Precios': s.evaluation?.price || 0,
    }));

    exportToExcel(exportData, `Maestro_Proveedores_${format(new Date(), 'yyyyMMdd')}`);
    saveCalculationRecord('supplier_master', 'export_excel', exportData, user?.email || 'unknown');
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'supplier-grid', title: 'Listado de Proveedores Registrados' }
    ];

    await generateReportPDF(sections, `Informe_Proveedores_${format(new Date(), 'yyyyMMdd')}`, 'Informe de Maestro de Proveedores');
    saveCalculationRecord('supplier_master', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.commercialAlias.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.erpCode.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        ...supplier,
        evaluation: supplier.evaluation || {
          innovation: 0,
          responseTime: 0,
          quality: 0,
          failureIndex: 0,
          price: 0
        }
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        legalName: '',
        commercialAlias: '',
        erpCode: '',
        country: '',
        logoUrl: '',
        contacts: '',
        website: '',
        wechat: '',
        email: '',
        evaluation: {
          innovation: 0,
          responseTime: 0,
          quality: 0,
          failureIndex: 0,
          price: 0
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingSupplier) {
      onUpdateSupplier?.(editingSupplier.id, formData);
      toast.success('Socio actualizado');
    } else {
      onAddSupplier?.(formData);
      toast.success('Socio registrado');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteConfirm({
      id,
      title,
      onConfirm: () => {
        onDeleteSupplier?.(id);
        setDeleteConfirm(null);
        toast.success('Proveedor eliminado');
      }
    });
  };

  const RatingStars = ({ value, label, onChange, icon: Icon }: { value: number, label: string, onChange?: (val: number) => void, icon: any }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon size={16} className="text-slate-500" />
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{value}/5</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange?.(star)}
            disabled={!onChange}
            className={`w-full h-2 rounded-full transition-all ${
              star <= value 
                ? 'bg-blue-600' 
                : 'bg-slate-200 hover:bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6">
      {/* Header Section */}
      <div className="bg-[#0038a8] rounded-2xl md:rounded-3xl p-6 md:p-8 mb-6 md:mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24 blur-2xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:gap-5">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
              <Users className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black text-white tracking-tight uppercase leading-tight">
                Maestro de Proveedores
              </h1>
              <p className="text-blue-100/70 text-[10px] md:text-sm font-medium tracking-wider uppercase mt-1">
                Mantenimiento de socios estratégicos globales
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative group flex-1 sm:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border border-white/20 text-white placeholder:text-blue-200/50 pl-12 pr-6 py-3 rounded-xl md:rounded-2xl w-full sm:w-64 md:w-80 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-md transition-all text-sm"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#ff0000] hover:bg-[#cc0000] text-white px-6 py-3 rounded-xl md:rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-all active:scale-95 whitespace-nowrap uppercase text-xs md:text-sm tracking-wider"
            >
              <Plus className="w-5 h-5" />
              Nuevo Socio
            </button>

            <ModuleActions 
              onSave={handleSaveData}
              onExportExcel={handleExportExcel}
              variant="white"
            />
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div id="supplier-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSuppliers.map((supplier) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={supplier.id}
              className="group bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Card Header with Logo */}
              <div className="p-8 flex items-start justify-between">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center p-4 border border-slate-100 group-hover:border-blue-100 transition-colors">
                  {supplier.logoUrl ? (
                    <img 
                      src={supplier.logoUrl} 
                      alt={supplier.commercialAlias}
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenModal(supplier)}
                      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(supplier.id, supplier.commercialAlias)}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-8 pb-4 flex-1">
                <h3 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">
                  {supplier.commercialAlias}
                </h3>
                <p className="text-red-600 font-bold text-xs tracking-widest mt-1">
                  {supplier.erpCode}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-auto px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
                {/* Evaluation Metrics Display */}
                {supplier.evaluation && (
                  <div className="grid grid-cols-5 gap-1 pb-2 border-b border-slate-200/50">
                    {[
                      { icon: Zap, value: supplier.evaluation.innovation, color: 'text-amber-500', label: 'Innovación' },
                      { icon: ClipboardList, value: supplier.evaluation.responseTime, color: 'text-blue-500', label: 'Respuesta' },
                      { icon: Award, value: supplier.evaluation.quality, color: 'text-emerald-500', label: 'Calidad' },
                      { icon: AlertTriangle, value: supplier.evaluation.failureIndex, color: 'text-red-500', label: 'Fallas' },
                      { icon: DollarSign, value: supplier.evaluation.price, color: 'text-slate-600', label: 'Precio' }
                    ].map((m, i) => (
                      <div key={i} className="flex flex-col items-center gap-1 group/metric relative" title={`${m.label}: ${m.value || 0}/5`}>
                        <m.icon size={14} className={m.color} />
                        <span className="text-[10px] font-black text-slate-400">{m.value || 0}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                    <Globe className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {supplier.country}
                  </span>
                </div>

                {supplier.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate">
                      {supplier.email}
                    </span>
                  </div>
                )}

                {supplier.website && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                      <LinkIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate">
                      {supplier.website}
                    </span>
                  </div>
                )}

                <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed line-clamp-1">
                  "{supplier.legalName}"
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="mt-12 flex items-center justify-between px-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Total Registros: {filteredSuppliers.length}
        </p>
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Acceso Seguro Sole Industrial V2.4
        </p>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center text-red-600 mx-auto mb-8 shadow-xl shadow-red-100">
                  <Trash2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">¿Estás seguro?</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                  Estás a punto de eliminar al proveedor <span className="font-black text-slate-900">"{deleteConfirm.title}"</span>. Esta acción es irreversible y afectará los registros vinculados.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={deleteConfirm.onConfirm}
                    className="flex-1 px-8 py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-[#0038a8] p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {editingSupplier ? 'Actualización de Datos' : 'Nuevo Proveedor'}
                    </h2>
                    <p className="text-blue-100/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                      Ingrese la información corporativa para la base de datos centralizada
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <Building2 size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Información General</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Razón Social Legal
                      </label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.legalName}
                          onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="Nombre legal completo"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Alias Comercial
                      </label>
                      <div className="relative group">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.commercialAlias}
                          onChange={(e) => setFormData({ ...formData, commercialAlias: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="Nombre comercial corto"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Código ERP / SAP
                        </label>
                        <div className="relative group">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                          <input
                            type="text"
                            value={formData.erpCode}
                            onChange={(e) => setFormData({ ...formData, erpCode: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            placeholder="Ej: 2000001270"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          País
                        </label>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                          <input
                            type="text"
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            placeholder="Ej: China"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        URL del Logotipo
                      </label>
                      <div className="relative group">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="https://ejemplo.com/logo.png"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Section */}
                  <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200">
                      <Star size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evaluación de Desempeño</span>
                    </div>

                    <div className="space-y-8">
                      <RatingStars 
                        label="Capacidad de Innovación" 
                        value={formData.evaluation?.innovation || 0} 
                        onChange={(val) => handleEvaluationChange('innovation', val)}
                        icon={Zap}
                      />
                      <RatingStars 
                        label="Tiempo de Respuesta" 
                        value={formData.evaluation?.responseTime || 0} 
                        onChange={(val) => handleEvaluationChange('responseTime', val)}
                        icon={ClipboardList}
                      />
                      <RatingStars 
                        label="Calidad de Productos" 
                        value={formData.evaluation?.quality || 0} 
                        onChange={(val) => handleEvaluationChange('quality', val)}
                        icon={Award}
                      />
                      <RatingStars 
                        label="Índice de Fallas (Anual)" 
                        value={formData.evaluation?.failureIndex || 0} 
                        onChange={(val) => handleEvaluationChange('failureIndex', val)}
                        icon={AlertTriangle}
                      />
                      <RatingStars 
                        label="Competitividad de Precios" 
                        value={formData.evaluation?.price || 0} 
                        onChange={(val) => handleEvaluationChange('price', val)}
                        icon={DollarSign}
                      />
                    </div>

                    <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Última Evaluación:</span>
                      <span className="text-blue-600">
                        {formData.evaluation?.lastUpdated 
                          ? format(new Date(formData.evaluation.lastUpdated), 'dd/MM/yyyy HH:mm')
                          : 'Pendiente'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <Mail size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contacto Directo</span>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Contactos / Teléfonos
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.contacts}
                          onChange={(e) => setFormData({ ...formData, contacts: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="Ej: Mr. Zhang (+86...)"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Correo Electrónico
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="sales@supplier.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <LinkIcon size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Presencia Digital</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Página Web
                      </label>
                      <div className="relative group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="www.supplier.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        WeChat ID / QR Link
                      </label>
                      <div className="relative group">
                        <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="text"
                          value={formData.wechat}
                          onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          placeholder="ID de WeChat"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                  >
                    Anular
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-[#002b80] hover:bg-[#001f5c] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95"
                  >
                    Aplicar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupplierMaster;
