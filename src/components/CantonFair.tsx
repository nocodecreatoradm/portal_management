import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  User, 
  Globe, 
  Star, 
  FileText, 
  Tag, 
  DollarSign, 
  MessageSquare, 
  Image as ImageIcon,
  Upload,
  X,
  ChevronRight,
  Filter,
  ArrowLeft,
  ExternalLink,
  Download,
  Trash2,
  Calendar as CalendarIcon,
  Briefcase,
  Phone,
  Mail,
  QrCode,
  FileText as FileIcon,
  Eye,
  CheckCircle2,
  Clock,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerIcon = (visited: boolean) => {
  return L.divIcon({
    html: `<div class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all hover:scale-125 ${visited ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-blue-600 ring-4 ring-blue-600/20'}">
            ${visited 
              ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
              : '<div class="w-2.5 h-2.5 rounded-full bg-white/80"></div>'}
           </div>`,
    className: 'custom-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const MapPicker: React.FC<{
  lat: number | undefined;
  lng: number | undefined;
  onChange: (lat: number, lng: number) => void;
}> = ({ lat, lng, onChange }) => {
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const center: [number, number] = lat && lng ? [lat, lng] : [35.8617, 104.1954]; // Center of China

  return (
    <div className="h-[350px] w-full rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-inner relative z-0">
      <MapContainer 
        center={center} 
        zoom={lat ? 12 : 4} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapEvents />
        {lat && lng && <Marker position={[lat, lng]} />}
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-500 shadow-lg border border-slate-100">
        Haz clic en el mapa para fijar ubicación
      </div>
    </div>
  );
};

import { CantonFairSupplier, FileInfo, CantonFairSettings } from '../types';
import { 
  fetchCantonFairSuppliers, 
  saveCantonFairSupplier, 
  updateCantonFairSupplier, 
  deleteCantonFairSupplier,
  fetchCantonFairSettings,
  saveCantonFairSettings,
  saveCalculationRecord
} from '../lib/api';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { SupabaseService } from '../lib/SupabaseService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  BarChart,
  PieChart,
  Edit2, 
  Layout, 
  Users, 
  Image as ImageIcon2 
} from 'lucide-react';
import ModuleActions from './ModuleActions';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: Math.max(1, currentYear - 2023 + 1) }, (_, i) => 2023 + i);

const DEFAULT_REGIONS = ['Guangdong', 'Zhejiang', 'Ningbo', 'Jiangsu', 'Fujian', 'Shandong', 'Shanghai', 'Hebei', 'Anhui'];

import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell 
} from 'recharts';

const CantonFair: React.FC = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [suppliers, setSuppliers] = useState<CantonFairSupplier[]>([]);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<CantonFairSupplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'schedule' | 'map' | 'dashboard'>('grid');
  const [yearSettings, setYearSettings] = useState<CantonFairSettings | null>(null);
  const [availableRegions, setAvailableRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [newRegion, setNewRegion] = useState('');
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState<CantonFairSettings>({
    year: currentYear,
    attendees: []
  });
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const attendeeInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<CantonFairSupplier>>({
    year: 2026,
    name: '',
    factoryLocation: '',
    contactName: '',
    website: '',
    innovationRating: 0,
    priceRating: 0,
    manufacturingRating: 0,
    featuredProducts: [],
    fobPrices: '',
    comments: '',
    images: [],
    catalogues: [],
    phone: '',
    email: '',
    logo: undefined,
    wechatQr: undefined,
    factoryVisited: false,
    visitDate: '',
    visitTime: '',
    locationLabel: '',
    lat: undefined,
    lng: undefined
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const wechatQrInputRef = useRef<HTMLInputElement>(null);
  const catalogueInputRef = useRef<HTMLInputElement>(null);
  const [viewingCatalogue, setViewingCatalogue] = useState<FileInfo | null>(null);
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const [tempImageComment, setTempImageComment] = useState('');

  useEffect(() => {
    loadSuppliers();
    loadYearSettings(selectedYear);
  }, [selectedYear]);

  const loadSuppliers = async () => {
    setIsLoading(true);
    const data = await fetchCantonFairSuppliers();
    setSuppliers(data);
    
    // Dynamically add regions from saved suppliers
    const existingRegions = data.map(s => s.locationLabel).filter(Boolean) as string[];
    setAvailableRegions(prev => Array.from(new Set([...prev, ...existingRegions])));
    
    setIsLoading(false);
  };

  const loadYearSettings = async (year: number) => {
    const settings = await fetchCantonFairSettings(year);
    setYearSettings(settings);
    setSettingsFormData(settings);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const result = await saveCantonFairSettings(settingsFormData);
    if (result.success) {
      toast.success('Ajustes del año guardados');
      setYearSettings(settingsFormData);
      setIsEditingSettings(false);
    }
    setIsSaving(false);
  };

  const handleSettingsBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Subiendo banner...');
      const fileInfo = await SupabaseService.uploadFile('rd-files', `canton-fair/banners/${selectedYear}_${file.name}`, file);
      setSettingsFormData(prev => ({
        ...prev,
        bannerImage: fileInfo
      }));
      toast.dismiss();
      toast.success('Banner subido');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Error al subir banner');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'catalogue' | 'logo' | 'wechatQr') => {
    const files = e.target.files;
    if (!files) return;

    toast.loading(`Subiendo ${files.length} archivos...`);
    try {
      const uploadPromises = Array.from(files).map((file: File) => 
        SupabaseService.uploadFile('rd-files', `canton-fair/${type}s/${Date.now()}_${file.name}`, file)
      );
      
      const uploadedFiles = await Promise.all(uploadPromises);

      if (type === 'image') {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...uploadedFiles.map((f: FileInfo) => ({ file: f, comment: '' }))]
        }));
      } else if (type === 'logo') {
        setFormData(prev => ({ ...prev, logo: uploadedFiles[0] }));
      } else if (type === 'wechatQr') {
        setFormData(prev => ({ ...prev, wechatQr: uploadedFiles[0] }));
      } else {
        setFormData(prev => ({
          ...prev,
          catalogues: [...(prev.catalogues || []), ...uploadedFiles]
        }));
      }
      toast.dismiss();
      toast.success('Archivos subidos con éxito');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Error al subir archivos');
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.factoryLocation || !formData.contactName) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setIsSaving(true);
    const supplierData: any = {
      year: selectedYear,
      name: formData.name || '',
      factoryLocation: formData.factoryLocation || '',
      contactName: formData.contactName || '',
      website: formData.website,
      innovationRating: formData.innovationRating || 0,
      priceRating: formData.priceRating || 0,
      manufacturingRating: formData.manufacturingRating || 0,
      catalogues: formData.catalogues || [],
      featuredProducts: formData.featuredProducts || [],
      fobPrices: formData.fobPrices || '',
      comments: formData.comments || '',
      images: formData.images || [],
      logo: formData.logo,
      phone: formData.phone,
      email: formData.email,
      wechatQr: formData.wechatQr,
      factoryVisited: formData.factoryVisited || false,
      visitDate: formData.visitDate,
      visitTime: formData.visitTime,
      locationLabel: formData.locationLabel,
      lat: formData.lat,
      lng: formData.lng
    };

    let result;
    try {
      if (editingId) {
        result = await updateCantonFairSupplier(editingId, supplierData);
      } else {
        supplierData.id = Math.random().toString(36).substr(2, 9);
        supplierData.createdAt = new Date().toISOString();
        result = await saveCantonFairSupplier(supplierData);
      }

      if (result.success) {
        toast.success(editingId ? 'Proveedor actualizado' : 'Proveedor guardado');
        setIsAddingSupplier(false);
        setEditingId(null);
        resetForm();
        loadSuppliers();
      }
    } catch (err) {
      toast.error('Error al guardar el proveedor');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveImageComment = async () => {
    if (!selectedSupplier || editingImageIdx === null) return;

    const updatedImages = [...selectedSupplier.images];
    updatedImages[editingImageIdx].comment = tempImageComment;

    const result = await updateCantonFairSupplier(selectedSupplier.id, {
      ...selectedSupplier,
      images: updatedImages
    });

    if (result.success) {
      toast.success('Comentario guardado');
      setSelectedSupplier({ ...selectedSupplier, images: updatedImages });
      setEditingImageIdx(null);
      loadSuppliers();
    } else {
      toast.error('Error al guardar comentario');
    }
  };

  const resetForm = () => {
    setFormData({
      year: selectedYear,
      name: '',
      factoryLocation: '',
      contactName: '',
      website: '',
      innovationRating: 0,
      priceRating: 0,
      manufacturingRating: 0,
      featuredProducts: [],
      fobPrices: '',
      comments: '',
      images: [],
      catalogues: [],
      logo: undefined,
      phone: '',
      email: '',
      wechatQr: undefined,
      factoryVisited: false,
      visitDate: '',
      visitTime: '',
      locationLabel: '',
      lat: undefined,
      lng: undefined
    });
  };

  const startEdit = (supplier: CantonFairSupplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(supplier.id);
    setFormData({
      ...supplier
    });
    setIsAddingSupplier(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      const result = await deleteCantonFairSupplier(id);
      if (result.success) {
        toast.success('Proveedor eliminado');
        loadSuppliers();
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.year === selectedYear && 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.featuredProducts.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const renderStars = (rating: number, interactive = false, field?: 'innovationRating' | 'priceRating' | 'manufacturingRating') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            size={interactive ? 24 : 14} 
            onClick={() => interactive && field && setFormData(prev => ({ ...prev, [field]: star }))}
            className={`${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-300"} ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`} 
          />
        ))}
      </div>
    );
  };

  const handleExportExcel = () => {
    const data = suppliers.filter(s => s.year === selectedYear).map(s => ({
      'Proveedor': s.name,
      'País/Ubicación': s.factoryLocation,
      'Contacto': s.contactName,
      'Email': s.email || '-',
      'Teléfono': s.phone || '-',
      'Website': s.website || '-',
      'Catálogos': (s.catalogues || []).length,
      'Productos': s.featuredProducts.map(p => p.name).join(', '),
      'Puntaje Innovación': s.innovationRating,
      'Puntaje Precio': s.priceRating,
      'Puntaje Fabril': s.manufacturingRating,
      'Precios FOB': s.fobPrices || '-',
      'Comentarios': s.comments || '-'
    }));

    exportToExcel(data, `CantonFair_${selectedYear}_Export_${new Date().getTime()}`);
    saveCalculationRecord('canton_fair', 'export_excel', { year: selectedYear, count: data.length }, user?.email || 'unknown');
    toast.success('Excel exportado correctamente');
  };

  const handleExportPDF = async () => {
    const filename = `CantonFair_${selectedYear}_Report_${new Date().getTime()}`;
    await generateReportPDF(
      [{ contentId: 'canton-fair-container', title: `Canton Fair ${selectedYear}` }],
      filename,
      `Reporte de Proveedores Canton Fair ${selectedYear}`
    );
    saveCalculationRecord('canton_fair', 'export_pdf', { year: selectedYear }, user?.email || 'unknown');
    toast.success('PDF exportado correctamente');
  };

  const handleExportPPT = async () => {
    const filename = `CantonFair_${selectedYear}_Presentation_${new Date().getTime()}`;
    await exportToPPT(
      [{ contentId: 'canton-fair-container', title: `Canton Fair ${selectedYear} - Proveedores Seleccionados` }],
      filename,
      `Presentación Canton Fair ${selectedYear}`
    );
    saveCalculationRecord('canton_fair', 'export_ppt', { year: selectedYear }, user?.email || 'unknown');
    toast.success('PPT exportado correctamente');
  };

  return (
    <div id="canton-fair-container" className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20 group">
        <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none transition-transform duration-1000 group-hover:scale-105">
          <img 
            src={yearSettings?.bannerImage?.url || `https://picsum.photos/seed/cantonfair-${selectedYear}/1200/800`} 
            alt={`Canton Fair ${selectedYear}`} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-4xl flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            >
              <Briefcase size={14} />
              Módulo de Ferias Internacionales
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black tracking-tight mb-6"
            >
              Canton Fair <span className="text-blue-500">{selectedYear}</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-300 text-lg font-medium leading-relaxed mb-8 max-w-2xl"
            >
              Base de datos interactiva de proveedores, catálogos y productos destacados recolectados durante las visitas a la Feria de Cantón en Guangzhou, China.
            </motion.p>

            {yearSettings && yearSettings.attendees.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap items-center gap-3"
              >
                <div className="flex items-center gap-2 text-blue-400 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <Users size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Asistentes</span>
                </div>
                {yearSettings.attendees.map((person, idx) => (
                  <div key={idx} className="bg-white/5 text-white/80 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/5">
                    {person}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end gap-3 invisible md:visible">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setViewMode(viewMode === 'schedule' ? 'grid' : 'schedule')}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/20 transition-all ${
              viewMode === 'schedule' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 border-transparent' 
                : 'bg-white/10 text-white/90 backdrop-blur-md hover:bg-white/20'
            }`}
          >
            <CalendarIcon size={18} />
            {viewMode === 'schedule' ? 'Ver Catálogo' : 'Ver Cronograma'}
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsEditingSettings(true)}
          className="absolute top-6 right-6 z-30 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all group"
          title="Opciones"
        >
          <SettingsIcon size={14} className="text-white/40 group-hover:text-blue-400" />
        </motion.button>
      </div>

      {/* Year Selector and Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-4 z-30">
        <div className="flex items-center gap-4 flex-1">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 shrink-0">
            <CalendarIcon size={18} className="text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Año de Visita</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar flex-1">
            {YEARS.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-2.5 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${
                  selectedYear === year 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="relative flex-1 md:min-w-[250px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar proveedor o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layout size={14} />
              <span className="hidden sm:inline">Cuadrícula</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                viewMode === 'map' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MapPin size={14} />
              <span className="hidden sm:inline">Mapa</span>
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layout size={14} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>

          <button 
            onClick={() => setIsAddingSupplier(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={18} />
            <span className="md:hidden lg:inline">Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* Views Container */}
      <div className="min-h-[400px]">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <div className="col-span-full py-20 flex justify-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredSuppliers.map((supplier) => (
                <motion.div
                  key={supplier.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setSelectedSupplier(supplier)}
                  className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer relative"
                >
                  <button 
                    onClick={(e) => handleDelete(supplier.id, e)}
                    className="absolute top-4 left-4 z-30 p-2 bg-white/80 backdrop-blur rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button 
                    onClick={(e) => startEdit(supplier, e)}
                    className="absolute top-4 left-14 z-30 p-2 bg-white/80 backdrop-blur rounded-xl text-blue-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>

                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                    {supplier.images.length > 0 ? (
                      <img 
                        src={supplier.images[0].file.url} 
                        alt={supplier.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                        <ImageIcon size={48} className="mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    
                    {/* Promoting the Factory Visit Check with a more distinct position */}
                    {supplier.factoryVisited && (
                      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-xl shadow-lg ring-4 ring-emerald-500/20">
                        <CheckCircle2 size={14} className="fill-white/20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Validado</span>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-xl font-black text-white tracking-tight mb-1">{supplier.name}</h3>
                      <div className="flex items-center gap-2 text-slate-200 text-xs font-bold">
                        <MapPin size={12} />
                        {supplier.factoryLocation}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-black text-slate-900">
                        {((supplier.innovationRating + supplier.priceRating + supplier.manufacturingRating) / 3).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {supplier.visitDate && (
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <CalendarIcon size={12} className="text-orange-500" />
                        <span>Visita: {supplier.visitDate} {supplier.visitTime}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {supplier.featuredProducts.slice(0, 2).map((product, idx) => (
                        <span key={idx} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100">
                          {product.name}
                        </span>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Innov.</p>
                        {renderStars(supplier.innovationRating)}
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Precio</p>
                        <div className="flex justify-center">
                          {renderStars(supplier.priceRating)}
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Manuf.</p>
                        <div className="flex justify-end">
                          {renderStars(supplier.manufacturingRating)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : viewMode === 'schedule' ? (
          <div className="space-y-8 bg-white p-8 rounded-[3rem] border border-slate-200">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cronograma de Visitas</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Fábricas Seleccionadas {selectedYear}</p>
              </div>
            </div>

            <div className="relative space-y-12 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
              {filteredSuppliers
                .filter(s => s.visitDate)
                .sort((a, b) => (a.visitDate! + a.visitTime!).localeCompare(b.visitDate! + b.visitTime!))
                .map((supplier, idx) => (
                  <motion.div 
                    key={supplier.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative pl-16 group"
                  >
                    <div className="absolute left-4 top-2 w-4 h-4 bg-orange-500 rounded-full ring-4 ring-orange-100 group-hover:scale-125 transition-transform" />
                    <div 
                      onClick={() => setSelectedSupplier(supplier)}
                      className="bg-slate-50 hover:bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center gap-6"
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-2xl font-black text-slate-900">{supplier.visitTime || '--:--'}</p>
                        <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{supplier.visitDate}</p>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-slate-900 mb-1">{supplier.name}</h4>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                          <MapPin size={12} className="text-orange-500" />
                          {supplier.factoryLocation}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                          {supplier.factoryVisited ? (
                            <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> Completada
                            </span>
                          ) : (
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Programada</span>
                          )}
                        </div>
                        <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-orange-600 hover:bg-orange-50 transition-all">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              {filteredSuppliers.filter(s => s.visitDate).length === 0 && (
                <div className="py-12 text-center text-slate-400 font-medium italic">
                  No hay visitas programadas para este periodo.
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Chart 1: Suppliers by Year */}
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <Layout size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Proveedores Añadidos por Año</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Evolución Histórica</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={YEARS.map(y => ({
                      name: y.toString(),
                      count: suppliers.filter(s => s.year === y).length
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="count" name="Proveedores" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Top Categories in Selected Year */}
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <PieChart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Distribución por Categoría</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{selectedYear}</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={['LÍNEA BLANCA', 'AGUA CALIENTE', 'CLIMATIZACIÓN', 'REFRIGERACIÓN', 'PURIFICACIÓN'].map(cat => ({
                          name: cat,
                          value: suppliers.filter(s => s.year === selectedYear && s.featuredProducts.some(p => p.category === cat)).length
                        })).filter(d => d.value > 0)}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Suppliers List by Category */}
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Star size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Top Proveedores por Categoría</h2>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Basado en Calificación Promedio ({selectedYear})</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['LÍNEA BLANCA', 'AGUA CALIENTE', 'CLIMATIZACIÓN', 'REFRIGERACIÓN', 'PURIFICACIÓN'].map(category => {
                  const topSupplier = suppliers
                    .filter(s => s.year === selectedYear && s.featuredProducts.some(p => p.category === category))
                    .sort((a, b) => {
                      const avgA = (a.innovationRating + a.priceRating + a.manufacturingRating) / 3;
                      const avgB = (b.innovationRating + b.priceRating + b.manufacturingRating) / 3;
                      return avgB - avgA;
                    })[0];

                  if (!topSupplier) return null;

                  return (
                    <div key={category} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{category}</span>
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-black text-slate-900">
                            {((topSupplier.innovationRating + topSupplier.priceRating + topSupplier.manufacturingRating) / 3).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 
                          onClick={() => setSelectedSupplier(topSupplier)}
                          className="text-lg font-black text-slate-900 hover:text-blue-600 cursor-pointer mb-1 truncate"
                        >
                          {topSupplier.name}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest">
                          <MapPin size={10} /> {topSupplier.factoryLocation}
                        </p>
                      </div>
                      <div className="flex -space-x-2">
                        {topSupplier.images.slice(0, 3).map((img, i) => (
                          <img 
                            key={i} 
                            src={img.file.url} 
                            className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                            alt="Preview" 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 bg-white p-8 rounded-[3rem] border border-slate-200 min-h-[600px] flex flex-col">
             <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                <MapPin size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mapa de Proveedores</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Ubicación Estratégica en China</p>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative overflow-hidden flex flex-col md:flex-row items-stretch p-8 gap-8">
              <div className="flex-1 min-h-[500px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative z-0">
                <MapContainer 
                  center={[35.8617, 104.1954]} 
                  zoom={4} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {filteredSuppliers.filter(s => s.lat && s.lng).map((s) => (
                    <Marker 
                      key={s.id} 
                      position={[s.lat!, s.lng!]} 
                      icon={getMarkerIcon(!!s.factoryVisited)}
                      eventHandlers={{
                        click: () => setSelectedSupplier(s),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                        <div className="p-3 min-w-[180px] bg-white rounded-xl shadow-xl border border-slate-100">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight">{s.name}</h4>
                            {s.factoryVisited && <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-50" />}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                             <MapPin size={10} className="text-slate-300" />
                             <span className="truncate max-w-[120px]">{s.factoryLocation}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-50">
                            <div>
                               <p className="text-[7px] text-slate-400 uppercase">Innov.</p>
                               {renderStars(s.innovationRating)}
                            </div>
                            <div>
                               <p className="text-[7px] text-slate-400 uppercase">Precio</p>
                               {renderStars(s.priceRating)}
                            </div>
                            <div>
                               <p className="text-[7px] text-slate-400 uppercase">Manuf.</p>
                               {renderStars(s.manufacturingRating)}
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    </Marker>
                  ))}
                </MapContainer>
                
                <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur p-4 rounded-3xl border border-slate-200 shadow-lg">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estadísticas por Región</p>
                  <div className="space-y-2">
                    {availableRegions.map(l => {
                      const count = filteredSuppliers.filter(s => s.locationLabel === l).length;
                      if (count === 0) return null;
                      return (
                        <div key={l} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{l}</span>
                          <span className="ml-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 overflow-y-auto space-y-4 max-h-[500px] pr-2 custom-scrollbar">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Listado de Proveedores</p>
                {filteredSuppliers.sort((a,b) => (a.locationLabel || '').localeCompare(b.locationLabel || '')).map(s => (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSupplier(s)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${s.lat && s.lng ? 'bg-white border-slate-100 hover:border-emerald-500' : 'bg-slate-50/50 border-transparent opacity-60'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{s.locationLabel || 'Sin Región'}</p>
                      {s.factoryVisited && <CheckCircle2 size={12} className="text-emerald-500" />}
                    </div>
                    <p className="text-sm font-black text-slate-900 truncate">{s.name}</p>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <MapPin size={10} className={s.lat ? 'text-emerald-500' : 'text-slate-300'} />
                      <span className="truncate">{s.factoryLocation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && filteredSuppliers.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400">
          <Search size={48} className="mb-4 opacity-20" />
          <p className="text-xl font-black tracking-tight">No se encontraron proveedores</p>
          <p className="font-medium">Intenta con otra búsqueda o cambia el año de visita</p>
        </div>
      )}


      {/* Supplier Detail Modal */}
      <AnimatePresence>
        {selectedSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-6xl max-h-full overflow-y-auto rounded-[3rem] shadow-2xl relative"
            >
              <div className="relative h-64 md:h-80 overflow-hidden">
                {selectedSupplier.images.length > 0 ? (
                  <img 
                    src={selectedSupplier.images[0].file.url} 
                    alt={selectedSupplier.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <ImageIcon size={64} className="text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="absolute top-6 right-6 z-10 p-3 bg-white/80 backdrop-blur rounded-full text-slate-500 hover:text-slate-900 transition-all shadow-lg"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left: Info */}
                <div className="p-8 md:p-12 space-y-10 -mt-20 relative z-10">
                  <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                      Canton Fair {selectedSupplier.year}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 flex items-center gap-3">
                      {selectedSupplier.name}
                      {selectedSupplier.factoryVisited && (
                        <CheckCircle2 size={32} className="text-emerald-500 fill-emerald-50" />
                      )}
                    </h2>
                    
                    {selectedSupplier.logo && (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-sm bg-white">
                        <img src={selectedSupplier.logo.url} alt="Logo" className="w-full h-full object-contain p-2" />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-6 text-slate-500 font-bold">
                      {selectedSupplier.visitDate && (
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                          <CalendarIcon size={18} />
                          {selectedSupplier.visitDate} {selectedSupplier.visitTime}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-blue-500" />
                        {selectedSupplier.factoryLocation} {selectedSupplier.locationLabel && `(${selectedSupplier.locationLabel})`}
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={18} className="text-blue-500" />
                        {selectedSupplier.contactName}
                      </div>
                      {selectedSupplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={18} className="text-blue-500" />
                          {selectedSupplier.phone}
                        </div>
                      )}
                      {selectedSupplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={18} className="text-blue-500" />
                          {selectedSupplier.email}
                        </div>
                      )}
                      {selectedSupplier.website && (
                        <a href={`https://${selectedSupplier.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                          <Globe size={18} />
                          {selectedSupplier.website}
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Innovación y Diseño</p>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedSupplier.innovationRating)}
                        <span className="text-sm font-black text-slate-900">{selectedSupplier.innovationRating}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Competitividad Precios</p>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedSupplier.priceRating)}
                        <span className="text-sm font-black text-slate-900">{selectedSupplier.priceRating}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufactura Propia</p>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedSupplier.manufacturingRating)}
                        <span className="text-sm font-black text-slate-900">{selectedSupplier.manufacturingRating}</span>
                      </div>
                    </div>
                  </div>

                  {selectedSupplier.lat && selectedSupplier.lng && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-blue-600" />
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Ubicación Geográfica</h3>
                      </div>
                      <div className="h-[250px] rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm relative z-0">
                        <MapContainer 
                          center={[selectedSupplier.lat, selectedSupplier.lng]} 
                          zoom={10} 
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={false}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <Marker position={[selectedSupplier.lat, selectedSupplier.lng]} />
                        </MapContainer>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Tag size={20} className="text-blue-600" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Productos Destacados</h3>
                    </div>
                    <div className="space-y-4">
                      {selectedSupplier.featuredProducts.map((product, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden">
                          <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  {product.category}
                                </span>
                                {product.targetBrand && (
                                  <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {product.targetBrand}
                                  </span>
                                )}
                              </div>
                              <span className="text-emerald-600 font-black text-lg">{product.fobPrice}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900">{product.name}</h4>
                            <p className="text-slate-500 text-sm font-medium italic">"{product.comments}"</p>
                            
                            {product.images.length > 0 && (
                              <div className="grid grid-cols-4 gap-2">
                                {product.images.map((img, i) => (
                                  <img key={i} src={img.url} alt="Product" className="aspect-square w-full object-cover rounded-xl border border-slate-200" referrerPolicy="no-referrer" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <DollarSign size={20} className="text-blue-600" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Precios FOB Referenciales</h3>
                    </div>
                    <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2rem] space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-emerald-700 font-black text-3xl leading-none">
                          {selectedSupplier.fobPrices || "A Consultar"}
                        </p>
                        <DollarSign size={32} className="text-emerald-200" />
                      </div>
                      <div className="pt-4 border-t border-emerald-100">
                        <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.2em]">
                          SUJETO A VOLUMEN Y ESPECIFICACIONES
                        </p>
                        <p className="text-emerald-600/60 text-[10px] font-bold mt-1">
                          * Precios referenciales basados en la visita comercial.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <MessageSquare size={20} className="text-blue-600" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Comentarios Generales</h3>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100 italic">
                      "{selectedSupplier.comments}"
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Catálogos
                      </h3>
                      <div className="space-y-2">
                        {selectedSupplier.catalogues.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <FileIcon size={20} className="text-slate-400" />
                              <span className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{cat.name}</span>
                            </div>
                            <div className="flex gap-2">
                              {cat.type === 'application/pdf' && (
                                <button 
                                  onClick={() => setViewingCatalogue(cat)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye size={18} />
                                </button>
                              )}
                              <a 
                                href={cat.url} 
                                download={cat.name}
                                className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                title="Descargar"
                              >
                                <Download size={18} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedSupplier.wechatQr && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <QrCode size={20} className="text-blue-600" />
                          WeChat QR
                        </h3>
                        <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-center">
                          <img src={selectedSupplier.wechatQr.url} alt="WeChat QR" className="max-w-[150px] w-full aspect-square object-contain" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Gallery */}
                <div className="bg-slate-50 p-8 md:p-12 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageIcon size={20} className="text-blue-600" />
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">Galería de Fotos</h3>
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedSupplier.images.length} Fotos</span>
                  </div>

                    <div className="space-y-8">
                      {selectedSupplier.images.map((img, idx) => (
                        <div key={idx} className="group bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all relative">
                          <div className="aspect-video relative">
                            <img 
                              src={img.file.url} 
                              alt={`Gallery ${idx}`} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              onClick={() => {
                                setEditingImageIdx(idx);
                                setTempImageComment(img.comment);
                              }}
                              className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur rounded-2xl text-blue-600 shadow-lg hover:scale-110 transition-all z-10"
                            >
                              <MessageSquare size={20} />
                            </button>
                          </div>
                          <div className="p-6 bg-white">
                            {editingImageIdx === idx ? (
                              <div className="space-y-3">
                                <textarea
                                  autoFocus
                                  value={tempImageComment}
                                  onChange={(e) => setTempImageComment(e.target.value)}
                                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none"
                                  placeholder="Escribe un comentario..."
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={handleSaveImageComment}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                                  >
                                    Guardar
                                  </button>
                                  <button 
                                    onClick={() => setEditingImageIdx(null)}
                                    className="px-4 bg-slate-100 text-slate-500 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-4">
                                <p className={`text-slate-600 font-medium text-sm leading-relaxed ${!img.comment && 'italic text-slate-400'}`}>
                                  {img.comment || "Sin comentarios"}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAddingSupplier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl p-8 md:p-12"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h2>
                  <p className="text-slate-500 font-bold mt-1">Canton Fair {selectedYear}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddingSupplier(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="p-3 bg-slate-50 rounded-full text-slate-500 hover:text-slate-900 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveSupplier} className="space-y-8">
                <div className="flex flex-col md:flex-row gap-10 items-start">
                  <div className="flex flex-col items-center gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo del Proveedor</label>
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer overflow-hidden relative group"
                    >
                      {formData.logo ? (
                        <>
                          <img src={formData.logo.url} alt="Logo" className="w-full h-full object-contain p-4" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload size={24} className="text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload size={24} />
                          <span className="text-[8px] font-black uppercase tracking-widest text-center px-2 text-slate-400">Subir Logo</span>
                        </>
                      )}
                    </div>
                    <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                    {formData.logo && (
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, logo: undefined})}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                      >
                        Eliminar Logo
                      </button>
                    )}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nombre del Proveedor *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        placeholder="Ej. Guangzhou Smart Tech"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Ubicación de Fábrica *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.factoryLocation}
                        onChange={(e) => setFormData({...formData, factoryLocation: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        placeholder="Ej. Foshan, Guangdong"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nombre de Contacto *</label>
                      <input 
                        type="text" 
                        required
                        value={formData.contactName}
                        onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        placeholder="Ej. Mr. Zhang"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Página Web</label>
                      <input 
                        type="text" 
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        placeholder="Ej. www.smarttech.cn"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Teléfono</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                      placeholder="Ej. +86 138..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                      placeholder="Ej. sales@smarttech.cn"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2">WeChat QR Code</label>
                    <div className="flex gap-4 items-center">
                      <button 
                        type="button" 
                        onClick={() => wechatQrInputRef.current?.click()}
                        className={`flex-1 py-4 px-6 rounded-2xl border-2 border-dashed transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                          formData.wechatQr ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                        }`}
                      >
                        <QrCode size={18} />
                        {formData.wechatQr ? 'QR Subido' : 'Subir QR'}
                      </button>
                      {formData.wechatQr && (
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, wechatQr: undefined})}
                          className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <input type="file" ref={wechatQrInputRef} hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'wechatQr')} />
                  </div>
                </div>

                <div className="flex flex-col gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-4">
                        <Clock size={14} /> Fecha y Hora de Visita
                      </label>
                      <div className="flex gap-4">
                        <input 
                          type="date"
                          value={formData.visitDate}
                          onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                          className="flex-1 px-6 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        />
                        <input 
                          type="time"
                          value={formData.visitTime}
                          onChange={(e) => setFormData({...formData, visitTime: e.target.value})}
                          className="w-32 px-6 py-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-4">
                        <MapPin size={14} /> Región en China
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableRegions.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setFormData({...formData, locationLabel: loc})}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              formData.locationLabel === loc 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                        
                        {isAddingRegion ? (
                          <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                            <input 
                              autoFocus
                              type="text" 
                              value={newRegion}
                              onBlur={() => {
                                if (!newRegion) setIsAddingRegion(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newRegion && !availableRegions.includes(newRegion)) {
                                    setAvailableRegions([...availableRegions, newRegion]);
                                    setFormData({...formData, locationLabel: newRegion});
                                  }
                                  setNewRegion('');
                                  setIsAddingRegion(false);
                                } else if (e.key === 'Escape') {
                                  setIsAddingRegion(false);
                                  setNewRegion('');
                                }
                              }}
                              onChange={(e) => setNewRegion(e.target.value)}
                              placeholder="Nombre de región..."
                              className="px-4 py-2 rounded-xl text-[10px] font-black outline-none border-2 border-blue-500 bg-white shadow-sm w-40"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (newRegion && !availableRegions.includes(newRegion)) {
                                  setAvailableRegions([...availableRegions, newRegion]);
                                  setFormData({...formData, locationLabel: newRegion});
                                }
                                setNewRegion('');
                                setIsAddingRegion(false);
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl shadow-lg ring-4 ring-blue-500/10"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingRegion(true)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 hover:bg-slate-200 border border-transparent flex items-center gap-2 transition-all"
                          >
                            <Plus size={14} />
                            Nueva Región
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-4">
                      <Globe size={14} /> Ubicación en el Mapa (China)
                    </label>
                    <MapPicker 
                      lat={formData.lat} 
                      lng={formData.lng} 
                      onChange={(lat, lng) => setFormData({ ...formData, lat, lng })} 
                    />
                    {formData.lat && (
                      <p className="text-[9px] font-bold text-slate-400 ml-4">
                        Coordenadas: {formData.lat.toFixed(4)}, {formData.lng?.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all ${formData.factoryVisited ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/10' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      onClick={() => setFormData({...formData, factoryVisited: !formData.factoryVisited})}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${formData.factoryVisited ? 'bg-emerald-500 text-white shadow-lg rotate-[360deg]' : 'bg-white text-slate-300 border-2 border-slate-200'}`}
                    >
                      {formData.factoryVisited ? <CheckCircle2 size={24} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <label htmlFor="factoryVisited" className="text-sm font-black text-slate-700 uppercase tracking-widest cursor-pointer select-none">
                        ¿Visitamos su fábrica?
                      </label>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {formData.factoryVisited ? 'Validación Confirmada' : 'Pendiente de Validación'}
                      </p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    id="factoryVisited"
                    checked={formData.factoryVisited}
                    onChange={(e) => setFormData({...formData, factoryVisited: e.target.checked})}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calificación Innovación</label>
                    <div className="flex gap-2">
                      {renderStars(formData.innovationRating || 0, true, 'innovationRating')}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calificación Precios</label>
                    <div className="flex gap-2">
                      {renderStars(formData.priceRating || 0, true, 'priceRating')}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manufactura Propia</label>
                    <div className="flex gap-2">
                      {renderStars(formData.manufacturingRating || 0, true, 'manufacturingRating')}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Productos Destacados</label>
                    <button 
                      type="button"
                      onClick={() => setFormData({
                        ...formData, 
                        featuredProducts: [
                          ...(formData.featuredProducts || []), 
                          { id: Math.random().toString(36).substr(2, 9), category: 'LÍNEA BLANCA', name: '', fobPrice: '', comments: '', images: [] }
                        ]
                      })}
                      className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                    >
                      <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                      Añadir Producto
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.featuredProducts?.map((product, idx) => (
                      <div key={product.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4 relative group/product">
                        <button 
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            featuredProducts: formData.featuredProducts?.filter((_, i) => i !== idx)
                          })}
                          className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X size={20} />
                        </button>
                        
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Marca Objetivo</label>
                                <select 
                                  value={product.targetBrand || ''}
                                  onChange={(e) => {
                                    const newProducts = [...(formData.featuredProducts || [])];
                                    newProducts[idx].targetBrand = e.target.value as any;
                                    setFormData({ ...formData, featuredProducts: newProducts });
                                  }}
                                  className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm shadow-sm"
                                >
                                  <option value="">Seleccionar Marca</option>
                                  <option value="Sole">Sole</option>
                                  <option value="S-Collection">S-Collection</option>
                                  <option value="Rinnai">Rinnai</option>
                                  <option value="Metusa">Metusa</option>
                                  <option value="Brikkel">Brikkel</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Categoría</label>
                                <select 
                                  value={product.category}
                                  onChange={(e) => {
                                    const newProducts = [...(formData.featuredProducts || [])];
                                    newProducts[idx].category = e.target.value as any;
                                    setFormData({ ...formData, featuredProducts: newProducts });
                                  }}
                                  className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm shadow-sm"
                                >
                                  <option value="LÍNEA BLANCA">LÍNEA BLANCA</option>
                                  <option value="AGUA CALIENTE">AGUA CALIENTE</option>
                                  <option value="CLIMATIZACIÓN">CLIMATIZACIÓN</option>
                                  <option value="REFRIGERACIÓN">REFRIGERACIÓN</option>
                                  <option value="PURIFICACIÓN">PURIFICACIÓN</option>
                                </select>
                              </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del Producto</label>
                            <input 
                              type="text" 
                              value={product.name}
                              onChange={(e) => {
                                const newProducts = [...(formData.featuredProducts || [])];
                                newProducts[idx].name = e.target.value;
                                setFormData({ ...formData, featuredProducts: newProducts });
                              }}
                              className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm shadow-sm"
                              placeholder="Ej. Calentador de Gas 10L"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Precio FOB</label>
                            <input 
                              type="text" 
                              value={product.fobPrice}
                              onChange={(e) => {
                                const newProducts = [...(formData.featuredProducts || [])];
                                newProducts[idx].fobPrice = e.target.value;
                                setFormData({ ...formData, featuredProducts: newProducts });
                              }}
                              className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm shadow-sm"
                              placeholder="Ej. $45.50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Comentarios</label>
                            <input 
                              type="text" 
                              value={product.comments}
                              onChange={(e) => {
                                const newProducts = [...(formData.featuredProducts || [])];
                                newProducts[idx].comments = e.target.value;
                                setFormData({ ...formData, featuredProducts: newProducts });
                              }}
                              className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl outline-none transition-all font-bold text-sm shadow-sm"
                              placeholder="Especificaciones clave..."
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fotos del Producto</label>
                          <div className="flex flex-wrap gap-2">
                            {product.images.map((img, iIdx) => (
                              <div key={iIdx} className="w-16 h-16 rounded-lg overflow-hidden relative group">
                                <img src={img.url} alt="Product" className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newProducts = [...(formData.featuredProducts || [])];
                                    newProducts[idx].images = newProducts[idx].images.filter((_, i) => i !== iIdx);
                                    setFormData({ ...formData, featuredProducts: newProducts });
                                  }}
                                  className="absolute top-0 right-0 p-0.5 bg-rose-500 text-white rounded-bl-lg"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            <button 
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.multiple = true;
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement).files;
                                  if (!files) return;
                                  Array.from(files).forEach(file => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const newProducts = [...(formData.featuredProducts || [])];
                                      newProducts[idx].images.push({
                                        name: file.name,
                                        url: reader.result as string,
                                        type: file.type
                                      });
                                      setFormData({ ...formData, featuredProducts: newProducts });
                                    };
                                    reader.readAsDataURL(file);
                                  });
                                };
                                input.click();
                              }}
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-white transition-all shadow-sm"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Precios FOB Referenciales</label>
                  <input 
                    type="text" 
                    value={formData.fobPrices}
                    onChange={(e) => setFormData({...formData, fobPrices: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                    placeholder="Ej. $25 - $45"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Comentarios Generales</label>
                  <textarea 
                    rows={4}
                    value={formData.comments}
                    onChange={(e) => setFormData({...formData, comments: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                    placeholder="Detalles sobre la visita, calidad percibida, etc."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fotos y Catálogos</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images?.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-3xl overflow-hidden relative group">
                        <img src={img.file.url} alt="Upload" className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => {
                              const newImages = [...(formData.images || [])];
                              const [selected] = newImages.splice(idx, 1);
                              newImages.unshift(selected);
                              setFormData({ ...formData, images: newImages });
                              toast.info("Imagen establecida como portada");
                            }}
                            className={`p-1 ${idx === 0 ? 'bg-amber-500' : 'bg-slate-700'} text-white rounded-lg`}
                            title="Establecer como Portada"
                          >
                            <Layout size={12} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== idx) }))}
                            className="p-1 bg-rose-500 text-white rounded-lg"
                            title="Eliminar"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                            Portada
                          </div>
                        )}
                        <input 
                          type="text"
                          placeholder="Comentario..."
                          value={img.comment}
                          onChange={(e) => {
                            const newImages = [...(formData.images || [])];
                            newImages[idx].comment = e.target.value;
                            setFormData({ ...formData, images: newImages });
                          }}
                          className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-[10px] outline-none"
                        />
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <Upload size={24} />
                      <span className="text-xs font-black uppercase tracking-widest">Subir Foto</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => catalogueInputRef.current?.click()}
                      className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <FileText size={24} />
                      <span className="text-xs font-black uppercase tracking-widest">Catálogo ({formData.catalogues?.length})</span>
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                  <input type="file" ref={catalogueInputRef} hidden multiple accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'catalogue')} />
                </div>

                <div className="pt-8 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingSupplier(false);
                      setEditingId(null);
                      resetForm();
                    }}
                    className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className={`flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                  >
                    {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editingId ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Year Settings Modal */}
      <AnimatePresence>
        {isEditingSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Layout size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración {selectedYear}</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Personalizar evento del año</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditingSettings(false)}
                  className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm border border-slate-100 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {/* Banner Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Imagen de Banner</label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Recomendado: 1200 x 400 px
                    </span>
                  </div>
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="relative aspect-[3/1] rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3 cursor-pointer group overflow-hidden transition-all hover:border-blue-500"
                  >
                    {settingsFormData.bannerImage ? (
                      <>
                        <img 
                          src={settingsFormData.bannerImage.url} 
                          className="w-full h-full object-cover" 
                          alt="Banner Preview"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2">
                            <Upload size={32} className="text-white" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Cambiar Imagen</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                          <Upload size={32} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-600">Subir Banner</p>
                          <p className="text-[10px] font-medium text-slate-400">JPG, PNG o WEBP (Máx 5MB)</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={bannerInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleSettingsBannerUpload} 
                  />
                </div>

                {/* Attendees Section */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Asistentes al Evento</label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <User size={18} />
                      </div>
                      <input 
                        type="text"
                        ref={attendeeInputRef}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              setSettingsFormData(prev => ({
                                ...prev,
                                attendees: [...prev.attendees, val]
                              }));
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-sm"
                        placeholder="Nombre de la persona asistenta..."
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const val = attendeeInputRef.current?.value.trim();
                        if (val) {
                          setSettingsFormData(prev => ({
                            ...prev,
                            attendees: [...prev.attendees, val]
                          }));
                          if (attendeeInputRef.current) attendeeInputRef.current.value = '';
                        }
                      }}
                      className="px-6 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    {settingsFormData.attendees.length === 0 ? (
                      <div className="w-full py-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 gap-2">
                        <Users size={32} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-widest">No hay asistentes registrados</span>
                      </div>
                    ) : (
                      settingsFormData.attendees.map((person, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl group hover:border-rose-200 hover:bg-rose-50 transition-all">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-rose-600">{person}</span>
                          <button 
                            onClick={() => setSettingsFormData(prev => ({
                              ...prev,
                              attendees: prev.attendees.filter((_, i) => i !== idx)
                            }))}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setIsEditingSettings(false)}
                  className="flex-1 py-4 font-black text-slate-500 hover:text-slate-900 transition-colors uppercase text-xs tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {viewingCatalogue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[2rem] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                  <FileIcon size={24} className="text-blue-600" />
                  <h3 className="font-black text-slate-900 truncate max-w-md">{viewingCatalogue.name}</h3>
                </div>
                <div className="flex gap-4">
                  <a 
                    href={viewingCatalogue.url} 
                    download={viewingCatalogue.name}
                    className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    <Download size={18} />
                    Descargar
                  </a>
                  <button 
                    onClick={() => setViewingCatalogue(null)}
                    className="p-2 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <iframe 
                src={`${viewingCatalogue.url}#toolbar=0`} 
                className="flex-1 w-full border-none"
                title="PDF Viewer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CantonFair;
