import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProductManagementRecord, SampleRecord, FileInfo, ProductRecord, DocumentVersion, Supplier, Brand, ProductLine } from '../types';
import { 
  Search, Plus, Filter, Download, Calendar, 
  FileText, Upload, Trash2, Edit2, X, Check,
  Eye, Link as LinkIcon, Image as ImageIcon, Box, Files,
  CheckCircle2, Grid, List, Tag, ShoppingBag, ChevronRight,
  TrendingUp, History as HistoryIcon, DollarSign, AlertCircle,
  ArrowUp, ArrowDown, Edit3, BarChart2, LineChart, Award,
  Package, Zap, Star, RefreshCw, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { openFileUrl } from '../utils/fileViewer';
import { Loader2 } from 'lucide-react';
import HeaderFilterPopover from './HeaderFilterPopover';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Segment config
const SEGMENT_CONFIG = {
  ticket_value: { label: 'Ticket Value', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', accent: '#3b82f6' },
  mainstream: { label: 'Mainstream', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', accent: '#10b981' },
  premium: { label: 'Premium', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', accent: '#f59e0b' },
} as const;

const STATUS_CONFIG = {
  vigente: { label: 'Vigente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  reemplazo: { label: 'Reemplazo', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  descontinuado: { label: 'Descontinuado', color: 'bg-red-100 text-red-700 border-red-200' },
} as const;

const getFobEffective = (r: ProductManagementRecord) =>
  (r.fobPrice || 0) + (r.habilitado && r.habilitacionCosto ? r.habilitacionCosto : 0);

const getGrowthPct = (r: ProductManagementRecord) => {
  if (!r.salesCurrentYear || !r.salesPreviousYear || r.salesPreviousYear === 0) return null;
  return ((r.salesCurrentYear - r.salesPreviousYear) / r.salesPreviousYear) * 100;
};


interface ProductsModuleProps {
  onExportPPT?: () => void;
}

export default function ProductsModule({ 
  onExportPPT 
}: ProductsModuleProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<ProductManagementRecord[]>([]);
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    codigoSAP: '',
    descripcionSAP: '',
    marca: '',
    sampleId: '',
    fobPrice: ''
  });
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({
    column: '',
    direction: null
  });

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductManagementRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ProductManagementRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'lineal' | 'dashboard'>('grid');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'ticket_value' | 'mainstream' | 'premium'>('all');
  const [brandFilter, setBrandFilter] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // FOB Price states
  const [isFobModalOpen, setIsFobModalOpen] = useState(false);
  const [fobEditingRecord, setFobEditingRecord] = useState<ProductManagementRecord | null>(null);
  const [newFobPrice, setNewFobPrice] = useState<string>('');
  const [fobChangeReason, setFobChangeReason] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Omit<ProductManagementRecord, 'id' | 'createdAt'>>({
    codigoSAP: '',
    descripcionSAP: '',
    commercialName: '',
    detailedDescription: '',
    segment: undefined,
    productStatus: 'vigente',
    habilitado: false,
    incluyeKit: false,
    habilitacionCosto: undefined,
    pvp: undefined,
    pvpDescuento: undefined,
    salesCurrentYear: undefined,
    salesPreviousYear: undefined,
    currentYear: new Date().getFullYear(),
    previousYear: new Date().getFullYear() - 1,
    catalogComments: '',
    marca: 'SOLE',
    proveedor: '',
    linea: 'AGUA CALIENTE',
    sampleId: '',
    approvedDocuments: [],
    gallery: [],
    explodeFiles: [],
    additionalProviderDocuments: [],
    fobPrice: undefined,
    fobPriceHistory: []
  });


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordsData, samplesData, productsData, suppliersData, brandsData, linesData] = await Promise.all([
        SupabaseService.getPMRecords(),
        SupabaseService.getSamples(),
        SupabaseService.getProducts(),
        SupabaseService.getSuppliers(),
        SupabaseService.getBrands(),
        SupabaseService.getProductLines()
      ]);
      setRecords(recordsData);
      setSamples(samplesData);
      setAllProducts(productsData);
      setSuppliers(suppliersData as unknown as Supplier[]);
      setBrands(brandsData as unknown as Brand[]);
      setProductLines(linesData as unknown as ProductLine[]);
    } catch (error) {
      console.error('Error loading PM data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (record: Omit<ProductManagementRecord, 'id' | 'createdAt'>) => {
    try {
      const result = await SupabaseService.createProductManagementRecord(record);
      setRecords(prev => [result, ...prev]);
      toast.success('Producto registrado');
    } catch (error) {
      console.error('Error adding PM record:', error);
      toast.error('Error al registrar producto');
    }
  };

  const handleUpdateRecord = async (updatedRecord: ProductManagementRecord) => {
    try {
      const isUUIDVal = isUUID(updatedRecord.id);
      let result;
      if (isUUIDVal) {
        result = await SupabaseService.updateProductManagementRecord(updatedRecord.id, updatedRecord);
      } else {
        const { id, createdAt, ...recordWithoutId } = updatedRecord;
        result = await SupabaseService.createProductManagementRecord(recordWithoutId);
      }
      if (result) {
        setRecords(prev => prev.map(r => r.id === updatedRecord.id ? result! : r));
        if (selectedRecord?.id === updatedRecord.id) {
          setSelectedRecord(result);
        }
        toast.success('Producto actualizado');
      }
    } catch (error) {
      console.error('Error updating PM record:', error);
      toast.error('Error al actualizar producto');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await SupabaseService.deleteProductManagementRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Producto eliminado');
    } catch (error) {
      console.error('Error deleting PM record:', error);
      toast.error('Error al eliminar producto');
    }
  };

  // Form state

  const filteredRecords = useMemo(() => {
    let result = records.filter(record => 
      record.descripcionSAP.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.codigoSAP.includes(searchTerm) ||
      (record.commercialName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Segment filter
    if (segmentFilter !== 'all') {
      result = result.filter(r => r.segment === segmentFilter);
    }
    // Brand filter
    if (brandFilter) {
      result = result.filter(r => r.marca === brandFilter || r.brandId === brandFilter);
    }
    // Line filter
    if (lineFilter) {
      result = result.filter(r => r.linea === lineFilter || r.lineId === lineFilter);
    }
    // Status filter
    if (statusFilter) {
      result = result.filter(r => (r.productStatus || 'vigente') === statusFilter);
    }

    Object.keys(columnFilters).forEach(col => {
      const filterVal = columnFilters[col]?.toLowerCase();
      if (filterVal) {
        result = result.filter(r => {
          if (col === 'codigoSAP') return r.codigoSAP?.toLowerCase().includes(filterVal);
          if (col === 'descripcionSAP') return r.descripcionSAP?.toLowerCase().includes(filterVal) || r.proveedor?.toLowerCase().includes(filterVal);
          if (col === 'marca') return r.marca?.toLowerCase().includes(filterVal) || r.linea?.toLowerCase().includes(filterVal);
          if (col === 'sampleId') {
            const linkedSample = samples.find(s => s.id === r.sampleId);
            return linkedSample?.correlativeId?.toLowerCase().includes(filterVal) || r.sampleId?.toLowerCase().includes(filterVal);
          }
          if (col === 'fobPrice') return r.fobPrice?.toString().toLowerCase().includes(filterVal);
          return false;
        });
      }
    });

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = '', valB = '';
        if (sortConfig.column === 'codigoSAP') { valA = a.codigoSAP || ''; valB = b.codigoSAP || ''; }
        else if (sortConfig.column === 'descripcionSAP') { valA = a.descripcionSAP || ''; valB = b.descripcionSAP || ''; }
        else if (sortConfig.column === 'marca') { valA = a.marca || ''; valB = b.marca || ''; }
        else if (sortConfig.column === 'sampleId') { valA = a.sampleId || ''; valB = b.sampleId || ''; }
        else if (sortConfig.column === 'fobPrice') { valA = (a.fobPrice || 0).toString(); valB = (b.fobPrice || 0).toString(); }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
    return result;
  }, [records, searchTerm, segmentFilter, brandFilter, lineFilter, statusFilter, columnFilters, sortConfig, samples]);


  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormData({
      codigoSAP: '',
      descripcionSAP: '',
      commercialName: '',
      detailedDescription: '',
      segment: undefined,
      productStatus: 'vigente',
      habilitado: false,
      incluyeKit: false,
      habilitacionCosto: undefined,
      pvp: undefined,
      pvpDescuento: undefined,
      salesCurrentYear: undefined,
      salesPreviousYear: undefined,
      currentYear: new Date().getFullYear(),
      previousYear: new Date().getFullYear() - 1,
      catalogComments: '',
      marca: 'SOLE',
      brandId: undefined,
      proveedor: '',
      supplierId: undefined,
      linea: 'AGUA CALIENTE',
      lineId: undefined,
      sampleId: '',
      approvedDocuments: [],
      gallery: [],
      explodeFiles: [],
      additionalProviderDocuments: [],
      fobPrice: undefined,
      fobPriceHistory: []
    });
    setIsModalOpen(true);
  };


  const handleOpenEditModal = (record: ProductManagementRecord) => {
    setEditingRecord(record);
    const brandId = record.brandId || brands.find(b => b.name === record.marca)?.id || record.marca;
    const supplierId = record.supplierId || 
                     suppliers.find(s => s.legalName === record.proveedor || s.commercialAlias === record.proveedor)?.id || 
                     record.proveedor;
    const lineId = record.lineId || productLines.find(l => l.name === record.linea)?.id || record.linea;

    setFormData({
      codigoSAP: record.codigoSAP,
      descripcionSAP: record.descripcionSAP,
      commercialName: record.commercialName || '',
      detailedDescription: record.detailedDescription || '',
      segment: record.segment,
      productStatus: record.productStatus || 'vigente',
      habilitado: record.habilitado || false,
      incluyeKit: record.incluyeKit || false,
      habilitacionCosto: record.habilitacionCosto,
      pvp: record.pvp,
      pvpDescuento: record.pvpDescuento,
      salesCurrentYear: record.salesCurrentYear,
      salesPreviousYear: record.salesPreviousYear,
      currentYear: record.currentYear || new Date().getFullYear(),
      previousYear: record.previousYear || new Date().getFullYear() - 1,
      catalogComments: record.catalogComments || '',
      marca: brandId,
      brandId: isUUID(brandId) ? brandId : undefined,
      proveedor: supplierId,
      supplierId: isUUID(supplierId) ? supplierId : undefined,
      linea: lineId,
      lineId: isUUID(lineId) ? lineId : undefined,
      sampleId: record.sampleId || '',
      approvedDocuments: record.approvedDocuments || [],
      gallery: record.gallery || [],
      explodeFiles: record.explodeFiles || [],
      additionalProviderDocuments: record.additionalProviderDocuments || [],
      fobPrice: record.fobPrice,
      fobPriceHistory: record.fobPriceHistory || []
    });
    setIsModalOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const resolvedFormData = { ...formData };

      // Resolve Brand
      if (resolvedFormData.marca) {
        if (isUUID(resolvedFormData.marca)) {
          resolvedFormData.brandId = resolvedFormData.marca;
        } else {
          const found = brands.find(b => b.name === resolvedFormData.marca);
          if (found) {
            resolvedFormData.marca = found.id;
            resolvedFormData.brandId = found.id;
          } else {
            try {
              const newBrand = await SupabaseService.createBrand({ name: resolvedFormData.marca });
              resolvedFormData.marca = newBrand.id;
              resolvedFormData.brandId = newBrand.id;
              setBrands(prev => [...prev, newBrand]);
            } catch (err) {
              console.warn('Error creating brand, using name:', err);
            }
          }
        }
      }

      // Resolve Supplier
      if (resolvedFormData.proveedor) {
        if (isUUID(resolvedFormData.proveedor)) {
          resolvedFormData.supplierId = resolvedFormData.proveedor;
        } else {
          const found = suppliers.find(s => s.legalName === resolvedFormData.proveedor || s.commercialAlias === resolvedFormData.proveedor);
          if (found) {
            resolvedFormData.proveedor = found.id;
            resolvedFormData.supplierId = found.id;
          } else {
            try {
              const newSupplier = await SupabaseService.createSupplier({ 
                legalName: resolvedFormData.proveedor,
                commercialAlias: resolvedFormData.proveedor,
                erpCode: 'TEMP-' + Date.now()
              });
              resolvedFormData.proveedor = newSupplier.id;
              resolvedFormData.supplierId = newSupplier.id;
              setSuppliers(prev => [...prev, newSupplier]);
            } catch (err) {
              console.warn('Error creating supplier, using name:', err);
            }
          }
        }
      }

      // Resolve Line
      if (resolvedFormData.linea) {
        if (isUUID(resolvedFormData.linea)) {
          resolvedFormData.lineId = resolvedFormData.linea;
        } else {
          const found = productLines.find(l => l.name === resolvedFormData.linea);
          if (found) {
            resolvedFormData.linea = found.id;
            resolvedFormData.lineId = found.id;
          } else {
            try {
              const newLine = await SupabaseService.createProductLine({ name: resolvedFormData.linea });
              resolvedFormData.linea = newLine.id;
              resolvedFormData.lineId = newLine.id;
              setProductLines(prev => [...prev, newLine]);
            } catch (err) {
              console.warn('Error creating line, using name:', err);
            }
          }
        }
      }

      if (editingRecord) {
        await handleUpdateRecord({ ...editingRecord, ...resolvedFormData });
      } else {
        await handleAddRecord(resolvedFormData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      toast.error('Error al guardar el registro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncDocuments = () => {
    if (!formData.codigoSAP) {
      toast.error('Ingrese un código SAP para sincronizar documentos');
      return;
    }

    const product = allProducts.find(p => p.codigoSAP === formData.codigoSAP);
    if (!product) {
      toast.error('No se encontró el producto en el sistema de artes/fichas');
      return;
    }

    const syncedGroups: any[] = [];
    
    const checkVersion = (version: DocumentVersion, categoryName: string) => {
      const isApproved = 
        version.idApproval.status === 'approved' &&
        version.mktApproval.status === 'approved' &&
        version.planApproval.status === 'approved' &&
        version.provApproval.status === 'approved';
      
      if (isApproved) {
        let group = syncedGroups.find(g => g.category === categoryName);
        if (!group) {
          group = {
            id: `GROUP-${Math.random().toString(36).substr(2, 9)}`,
            category: categoryName,
            documents: []
          };
          syncedGroups.push(group);
        }
        version.files.forEach((f: FileInfo) => {
          group.documents.push({
            id: `DOC-${Math.random().toString(36).substr(2, 9)}`,
            name: f.name,
            type: f.type,
            url: f.url,
            approvalDate: new Date().toISOString().split('T')[0]
          });
        });
      }
    };

    product.artworks?.forEach(v => checkVersion(v, 'Arte'));
    product.technicalSheets?.forEach(v => checkVersion(v, 'Ficha Técnica'));
    product.commercialSheets?.forEach(v => checkVersion(v, 'Ficha Comercial'));

    if (syncedGroups.length === 0) {
      toast.info('No se encontraron documentos aprobados para este código SAP');
    } else {
      setFormData(prev => ({
        ...prev,
        approvedDocuments: syncedGroups
      }));
      toast.success(`Se sincronizaron ${syncedGroups.reduce((acc, g) => acc + g.documents.length, 0)} documentos aprobados`);
    }
  };

  const handleAddNewDocCategory = () => {
    if (newDocCategoryName.trim()) {
      setFormData(prev => ({
        ...prev,
        approvedDocuments: [
          ...prev.approvedDocuments,
          {
            id: `GROUP-${Math.random().toString(36).substr(2, 9)}`,
            category: newDocCategoryName.trim(),
            documents: []
          }
        ]
      }));
      setNewDocCategoryName('');
      setIsAddingNewDocCategory(false);
    }
  };

  const handleSaveDocCategoryName = (id: string) => {
    if (editingDocCategoryName.trim()) {
      setFormData(prev => ({
        ...prev,
        approvedDocuments: prev.approvedDocuments.map(g => 
          g.id === id ? { ...g, category: editingDocCategoryName.trim() } : g
        )
      }));
    }
    setEditingDocCategoryId(null);
  };

  const handleMoveDoc = (groupId: string, docId: string, direction: 'up' | 'down') => {
    setFormData(prev => ({
      ...prev,
      approvedDocuments: prev.approvedDocuments.map(group => {
        if (group.id !== groupId) return group;
        const newDocs = [...group.documents];
        const idx = newDocs.findIndex(d => d.id === docId);
        if (direction === 'up' && idx > 0) {
          [newDocs[idx], newDocs[idx - 1]] = [newDocs[idx - 1], newDocs[idx]];
        } else if (direction === 'down' && idx < newDocs.length - 1) {
          [newDocs[idx], newDocs[idx + 1]] = [newDocs[idx + 1], newDocs[idx]];
        }
        return { ...group, documents: newDocs };
      })
    }));
  };

  const handleMoveGroup = (groupId: string, direction: 'up' | 'down') => {
    setFormData(prev => {
      const newGroups = [...prev.approvedDocuments];
      const idx = newGroups.findIndex(g => g.id === groupId);
      if (direction === 'up' && idx > 0) {
        [newGroups[idx], newGroups[idx - 1]] = [newGroups[idx - 1], newGroups[idx]];
      } else if (direction === 'down' && idx < newGroups.length - 1) {
        [newGroups[idx], newGroups[idx + 1]] = [newGroups[idx + 1], newGroups[idx]];
      }
      return { ...prev, approvedDocuments: newGroups };
    });
  };

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const handleSaveCategoryName = (id: string) => {
    if (editingCategoryName.trim()) {
      setFormData(prev => ({
        ...prev,
        gallery: prev.gallery.map(g => g.id === id ? { ...g, category: editingCategoryName.trim() } : g)
      }));
    }
    setEditingCategoryId(null);
  };

  const [isGalleryUploadModalOpen, setIsGalleryUploadModalOpen] = useState(false);
  const [tempGalleryPhotos, setTempGalleryPhotos] = useState<FileInfo[]>([]);
  const [galleryCategory, setGalleryCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Approved Docs Category management
  const [isAddingNewDocCategory, setIsAddingNewDocCategory] = useState(false);
  const [newDocCategoryName, setNewDocCategoryName] = useState('');
  const [editingDocCategoryId, setEditingDocCategoryId] = useState<string | null>(null);
  const [editingDocCategoryName, setEditingDocCategoryName] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    id: string; 
    type: 'record' | 'category'; 
    title: string;
    onConfirm: () => void;
  } | null>(null);

  const handleExplodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      toast.loading('Subiendo archivos...');
      try {
        const uploadedFiles: FileInfo[] = [];
        for (const f of Array.from(files) as File[]) {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `products/explode/${Date.now()}_${f.name}`, f) as any;
          uploadedFiles.push({
            name: f.name,
            url: fileInfo.url,
            type: f.type
          });
        }
        setFormData(prev => ({
          ...prev,
          explodeFiles: [...(prev.explodeFiles || []), ...uploadedFiles]
        }));
        toast.dismiss();
        toast.success('Explode añadido');
      } catch (err) {
        toast.dismiss();
        toast.error('Error al subir archivos explode');
      }
    }
  };

  const handleAdditionalDocsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      toast.loading('Subiendo documentos...');
      try {
        const uploadedFiles: FileInfo[] = [];
        for (const f of Array.from(files) as File[]) {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `products/additional/${Date.now()}_${f.name}`, f) as any;
          uploadedFiles.push({
            name: f.name,
            url: fileInfo.url,
            type: f.type
          });
        }
        setFormData(prev => ({
          ...prev,
          additionalProviderDocuments: [...(prev.additionalProviderDocuments || []), ...uploadedFiles]
        }));
        toast.dismiss();
        toast.success('Documentos adicionales añadidos');
      } catch (err) {
        toast.dismiss();
        toast.error('Error al subir documentos adicionales');
      }
    }
  };

  const handleGalleryPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      toast.loading('Subiendo fotos...');
      try {
        const uploadedPhotos: FileInfo[] = [];
        for (const f of Array.from(files) as File[]) {
          const fileInfo = await SupabaseService.uploadFile('rd-files', `products/gallery/${Date.now()}_${f.name}`, f) as any;
          uploadedPhotos.push({
            name: f.name,
            url: fileInfo.url,
            type: f.type
          });
        }
        setTempGalleryPhotos(prev => [...prev, ...uploadedPhotos]);
        toast.dismiss();
      } catch (err) {
        toast.dismiss();
        toast.error('Error al subir fotos');
      }
    }
  };

  const handleConfirmGalleryUpload = () => {
    if (!galleryCategory || tempGalleryPhotos.length === 0) {
      toast.error('Por favor seleccione una categoría y al menos una foto');
      return;
    }

    const newGalleryItem = {
      id: `GAL-${Date.now()}`,
      category: galleryCategory,
      photos: tempGalleryPhotos,
      uploadDate: new Date().toISOString()
    };

    if (isModalOpen) {
      // We are in the Edit Modal
      const existingCategory = formData.gallery.find(g => g.category === galleryCategory);
      if (existingCategory) {
        setFormData(prev => ({
          ...prev,
          gallery: prev.gallery.map(g => 
            g.category === galleryCategory 
              ? { ...g, photos: [...g.photos, ...tempGalleryPhotos] }
              : g
          )
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          gallery: [...prev.gallery, newGalleryItem]
        }));
      }
    } else if (selectedRecord) {
      // We are in the Detail View
      const existingCategory = selectedRecord.gallery.find(g => g.category === galleryCategory);
      let updatedRecord;
      
      if (existingCategory) {
        updatedRecord = {
          ...selectedRecord,
          gallery: selectedRecord.gallery.map(g => 
            g.category === galleryCategory 
              ? { ...g, photos: [...g.photos, ...tempGalleryPhotos] }
              : g
          )
        };
      } else {
        updatedRecord = {
          ...selectedRecord,
          gallery: [...selectedRecord.gallery, newGalleryItem]
        };
      }

      handleUpdateRecord(updatedRecord);
      setSelectedRecord(updatedRecord);
    }

    setIsGalleryUploadModalOpen(false);
    setTempGalleryPhotos([]);
    setGalleryCategory('');
    toast.success('Fotos añadidas a la galería');
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const exists = formData.gallery.some(g => g.category.toLowerCase() === newCategoryName.trim().toLowerCase());
    if (exists) {
      toast.error('Esta categoría ya existe');
      return;
    }

    const newCategory = {
      id: `GAL-${Date.now()}`,
      category: newCategoryName.trim(),
      photos: [],
      uploadDate: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      gallery: [...prev.gallery, newCategory]
    }));
    setNewCategoryName('');
    setIsAddingNewCategory(false);
    toast.success('Categoría añadida');
  };

  const handleSaveData = () => {
    toast.success('Datos guardados correctamente');
  };

  const handleExportExcel = () => {
    const data = filteredRecords.map(r => ({
      'Código SAP': r.codigoSAP,
      'Descripción SAP': r.descripcionSAP,
      'Marca': r.marca,
      'Proveedor': r.proveedor,
      'Línea': r.linea,
      'Precio FOB (USD)': r.fobPrice || 'N/A',
      'Muestra Vinculada': r.sampleId || 'Sin muestra',
      'Documentos Aprobados': r.approvedDocuments.length,
      'Fotos Galería': r.gallery.reduce((acc, g) => acc + g.photos.length, 0),
      'Fecha Creación': format(new Date(r.createdAt), 'dd/MM/yyyy')
    }));
    exportToExcel(data, `Productos_ID_${format(new Date(), 'yyyyMMdd')}`);
  };

  const handleOpenFobModal = (record: ProductManagementRecord) => {
    setFobEditingRecord(record);
    setNewFobPrice(record.fobPrice?.toString() || '');
    setFobChangeReason('');
    setIsFobModalOpen(true);
  };

  const handleUpdateFobPrice = () => {
    if (!fobEditingRecord || !newFobPrice || !fobChangeReason.trim()) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    const price = parseFloat(newFobPrice);
    if (isNaN(price)) {
      toast.error('Precio no válido');
      return;
    }

    const historyEntry = {
      price,
      reason: fobChangeReason.trim(),
      date: new Date().toISOString(),
      user: user?.name || 'Sistema'
    };

    const updatedRecord: ProductManagementRecord = {
      ...fobEditingRecord,
      fobPrice: price,
      fobPriceHistory: [historyEntry, ...(fobEditingRecord.fobPriceHistory || [])]
    };

    handleUpdateRecord(updatedRecord);
    if (selectedRecord?.id === updatedRecord.id) {
      setSelectedRecord(updatedRecord);
    }
    setIsFobModalOpen(false);
    toast.success('Precio FOB actualizado correctamente');
  };

  const handleExportPDF = () => {
    generateReportPDF(
      [{ contentId: 'products-module-container', title: 'Productos I+D' }],
      `Productos_ID_${format(new Date(), 'yyyyMMdd')}`,
      'Reporte de Productos I+D'
    );
    toast.success('Reporte PDF generado correctamente');
  };

  const handleExportPPT = () => {
    exportToPPT(
      [{ contentId: 'products-module-container', title: 'Productos I+D' }],
      `Productos_ID_${format(new Date(), 'yyyyMMdd')}`,
      'Presentación de Productos I+D'
    );
    toast.success('Presentación PPT generada correctamente');
  };

  return (
    <div id="products-module-container" className="space-y-6 animate-in fade-in duration-500">

      {/* ── HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <LineChart size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Lineal de Productos</h2>
              <p className="text-slate-500 font-medium text-sm">Estrategia de posicionamiento y análisis de valor por categoría</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {([
                { id: 'lineal', label: 'Vista Lineal', icon: <LineChart size={15}/> },
                { id: 'grid', label: 'Vista Grilla', icon: <Grid size={15}/> },
                { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={15}/> },
                { id: 'table', label: 'Tabla', icon: <List size={15}/> },
              ] as const).map(v => (
                <button key={v.id} onClick={() => setViewMode(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all ${
                    viewMode === v.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
            <button onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
              <Plus size={18}/> Agregar Producto
            </button>
            <ModuleActions onSave={handleSaveData} onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} onExportPPT={handleExportPPT}/>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input type="text" placeholder="Buscar por nombre, modelo o proveedor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          {/* Segment pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([
              { id: 'all', label: 'Todos los Segmentos' },
              { id: 'ticket_value', label: 'Ticket Value' },
              { id: 'mainstream', label: 'Mainstream' },
              { id: 'premium', label: 'Premium' },
            ] as const).map(s => (
              <button key={s.id} onClick={() => setSegmentFilter(s.id)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${
                  segmentFilter === s.id
                    ? s.id === 'all' ? 'bg-slate-900 text-white' : s.id === 'ticket_value' ? 'bg-blue-600 text-white' : s.id === 'mainstream' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{s.label}
              </button>
            ))}
          </div>
        </div>
        {/* Advanced filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros:</span>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none">
            <option value="">Marcas: Todas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={lineFilter} onChange={e => setLineFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none">
            <option value="">Línea: Todas</option>
            {productLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none">
            <option value="">Estado: Todos</option>
            <option value="vigente">Vigente</option>
            <option value="reemplazo">Reemplazo</option>
            <option value="descontinuado">Descontinuado</option>
          </select>
          <span className="text-xs font-bold text-slate-400 ml-auto">{filteredRecords.length} productos</span>
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin"/>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando productos...</p>
        </div>

      /* ── GRID VIEW ── */
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRecords.map(record => {
            const segCfg = record.segment ? SEGMENT_CONFIG[record.segment] : null;
            const stsCfg = STATUS_CONFIG[record.productStatus || 'vigente'];
            const fobEff = getFobEffective(record);
            const growth = getGrowthPct(record);
            const linkedSample = samples.find(s => s.id === record.sampleId);
            return (
              <div key={record.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
                {/* Card header */}
                <div className="px-4 pt-4 flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {segCfg && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${segCfg.color}`}>
                        {segCfg.label}
                      </span>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${stsCfg.color}`}>
                      {stsCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEditModal(record)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                      <Eye size={14}/>
                    </button>
                  </div>
                </div>
                {/* Product image placeholder */}
                <div className="px-4 py-3 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                    {record.gallery?.length > 0 && record.gallery[0].photos?.length > 0
                      ? <img src={record.gallery[0].photos[0].url} className="w-full h-full object-cover rounded-xl" alt=""/>
                      : <Package size={28} className="text-slate-300"/>
                    }
                  </div>
                  {record.habilitado && (
                    <div className="ml-2 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-sm" title="Incluye habilitación">
                      <Zap size={14} className="text-white"/>
                    </div>
                  )}
                </div>
                {/* Line / category */}
                <div className="px-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{record.linea}{record.categoria ? ` | ${record.categoria}` : ''}</p>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5 line-clamp-2">{record.commercialName || record.descripcionSAP}</h3>
                </div>
                {/* PVP / FOB */}
                <div className="px-4 pt-3 flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">PVP</p>
                    <p className="text-sm font-black text-indigo-600">
                      {record.pvp ? `S/ ${record.pvp.toLocaleString()}` : <span className="text-slate-300">—</span>}
                      {record.pvpDescuento && <span className="text-[10px] font-bold text-slate-400 ml-1">/ S/ {record.pvpDescuento}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">FOB</p>
                    <p className="text-sm font-black text-slate-700">
                      {fobEff > 0 ? `$ ${fobEff.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </p>
                  </div>
                </div>
                {/* Sales */}
                <div className="px-4 pt-2 pb-4 mt-auto border-t border-slate-50 mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ventas YTD</p>
                    <p className="text-xs font-bold text-slate-700">{record.salesCurrentYear ? `${record.salesCurrentYear.toLocaleString()} un.` : <span className="text-slate-300">—</span>}</p>
                  </div>
                  {growth !== null && (
                    <div className={`flex items-center gap-1 text-xs font-black ${growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {growth >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                      {Math.abs(growth).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <Package size={48} className="opacity-10 mb-4"/>
              <p className="font-bold text-sm uppercase tracking-widest">No hay productos con estos filtros</p>
            </div>
          )}
        </div>

      /* ── LINEAL VIEW ── */
      ) : viewMode === 'lineal' ? (() => {
        const segments = ['ticket_value', 'mainstream', 'premium'] as const;
        const allFobs = filteredRecords.map(getFobEffective).filter(v => v > 0);
        const allPvps = filteredRecords.map(r => r.pvp || 0).filter(v => v > 0);
        const maxFob = allFobs.length ? Math.max(...allFobs) * 1.1 : 50;
        const maxPvp = allPvps.length ? Math.max(...allPvps) * 1.1 : 1000;
        const minPvp = allPvps.length ? Math.min(...allPvps) * 0.9 : 0;
        const [hoveredId, setHoveredId] = React.useState<string|null>(null);
        const COL_W = 320;
        const CHART_H = 520;
        const PAD = 48;

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Posicionamiento de Productos</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Eje Y: PVP (S/)  ·  Eje X: FOB efectivo ($)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                {segments.map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${SEGMENT_CONFIG[s].dot}`}/>
                    {SEGMENT_CONFIG[s].label}
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div style={{ display: 'flex', minWidth: segments.length * COL_W + PAD + 60 }}>
                {/* Y-axis */}
                <div style={{ width: 60, flexShrink: 0, paddingTop: PAD, paddingBottom: PAD, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8 }}>
                  {[...Array(6)].map((_, i) => {
                    const val = Math.round(maxPvp - (i / 5) * (maxPvp - minPvp));
                    return <span key={i} className="text-[9px] font-black text-slate-400">S/{val}</span>;
                  })}
                </div>
                {/* Columns */}
                {segments.map(seg => {
                  const segRecords = filteredRecords.filter(r => r.segment === seg);
                  const cfg = SEGMENT_CONFIG[seg];
                  return (
                    <div key={seg} style={{ width: COL_W, flexShrink: 0, position: 'relative', borderLeft: '1px dashed #e2e8f0' }}>
                      {/* Column header */}
                      <div className="text-center py-3 border-b border-slate-100">
                        <span className={`text-xs font-black uppercase tracking-widest ${seg === 'ticket_value' ? 'text-blue-600' : seg === 'mainstream' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold ml-2">({segRecords.length})</span>
                      </div>
                      {/* Chart area */}
                      <div style={{ height: CHART_H, position: 'relative', overflow: 'visible', padding: `${PAD}px 24px` }}>
                        {/* Horizontal grid lines */}
                        {[...Array(5)].map((_, i) => (
                          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: PAD + (i / 4) * (CHART_H - PAD * 2), borderTop: '1px dashed #f1f5f9' }}/>
                        ))}
                        {segRecords.map(record => {
                          const fob = getFobEffective(record);
                          const pvp = record.pvp || 0;
                          if (!pvp && !fob) return null;
                          const yPct = maxPvp === minPvp ? 0.5 : 1 - (pvp - minPvp) / (maxPvp - minPvp);
                          const top = PAD + yPct * (CHART_H - PAD * 2);
                          const growth = getGrowthPct(record);
                          const isHovered = hoveredId === record.id;
                          return (
                            <div key={record.id} style={{ position: 'absolute', top, left: '50%', transform: 'translateX(-50%)', zIndex: isHovered ? 50 : 10 }}>
                              {/* Tooltip */}
                              {isHovered && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-slate-900 text-white rounded-xl shadow-2xl p-3 w-52 pointer-events-none">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">{record.linea}{record.categoria ? ` | ${record.categoria}` : ''}</p>
                                  <p className="text-xs font-black mt-0.5">{record.commercialName || record.descripcionSAP}</p>
                                  {record.catalogComments && (
                                    <div className="mt-2 border-t border-slate-700 pt-2">
                                      {(record.catalogComments || '').split('\n').slice(0,3).map((c, i) => (
                                        <p key={i} className="text-[9px] text-slate-300">• {c}</p>
                                      ))}
                                    </div>
                                  )}
                                  <div className="mt-2 flex justify-between text-[9px]">
                                    <span className="text-slate-400">Precio PVP <span className="text-white font-black">S/ {pvp}</span></span>
                                    <span className="text-slate-400">FOB <span className="text-white font-black">${fob.toFixed(2)}</span></span>
                                  </div>
                                </div>
                              )}
                              {/* Card */}
                              <button
                                onMouseEnter={() => setHoveredId(record.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => handleOpenEditModal(record)}
                                className="bg-white border-2 border-slate-200 rounded-xl p-2.5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all w-[130px] text-left"
                                style={{ borderColor: isHovered ? cfg.accent : undefined }}
                              >
                                <div className={`w-2 h-2 rounded-full ${cfg.dot} mb-1`}/>
                                <p className="text-[9px] font-black text-slate-900 line-clamp-2">{record.commercialName || record.descripcionSAP}</p>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-[9px] font-black text-indigo-600">S/ {pvp || '—'}</span>
                                  <span className="text-[9px] font-bold text-slate-400">${fob.toFixed(2)}</span>
                                </div>
                                {growth !== null && (
                                  <div className={`text-[8px] font-black flex items-center gap-0.5 mt-0.5 ${growth >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {growth >= 0 ? <ArrowUp size={8}/> : <ArrowDown size={8}/>}
                                    {Math.abs(growth).toFixed(1)}%
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                        {segRecords.length === 0 && (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin productos</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* X-axis label */}
            <div className="text-center py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100">
              Costo FOB Unitario (Dólares Americanos — USD) ↗
            </div>
          </div>
        );
      })()

      /* ── DASHBOARD VIEW ── */
      ) : viewMode === 'dashboard' ? (() => {
        // Segment distribution
        const segCounts = {
          ticket_value: records.filter(r => r.segment === 'ticket_value').length,
          mainstream: records.filter(r => r.segment === 'mainstream').length,
          premium: records.filter(r => r.segment === 'premium').length,
          sin_segmento: records.filter(r => !r.segment).length,
        };
        // Brands by segment
        const brandSegMap: Record<string, Record<string, number>> = {};
        records.forEach(r => {
          const brand = brands.find(b => b.id === r.brandId || b.name === r.marca)?.name || r.marca || 'Desconocida';
          const seg = r.segment || 'sin_segmento';
          if (!brandSegMap[brand]) brandSegMap[brand] = { ticket_value: 0, mainstream: 0, premium: 0, sin_segmento: 0 };
          brandSegMap[brand][seg] = (brandSegMap[brand][seg] || 0) + 1;
        });
        const brandSegData = Object.entries(brandSegMap).sort((a, b) =>
          Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
        ).slice(0, 8);
        // Distribution by line
        const lineDistMap: Record<string, number> = {};
        records.forEach(r => {
          const line = productLines.find(l => l.id === r.lineId || l.name === r.linea)?.name || r.linea || 'Otras';
          lineDistMap[line] = (lineDistMap[line] || 0) + 1;
        });
        const lineDistData = Object.entries(lineDistMap).sort((a, b) => b[1] - a[1]);
        const maxLineDist = Math.max(...lineDistData.map(([, v]) => v), 1);
        // Distribution by category and segment
        const catSegMap: Record<string, Record<string, number>> = {};
        records.forEach(r => {
          const cat = r.categoria || 'Sin categoría';
          const seg = r.segment || 'sin_segmento';
          if (!catSegMap[cat]) catSegMap[cat] = { ticket_value: 0, mainstream: 0, premium: 0 };
          catSegMap[cat][seg] = (catSegMap[cat][seg] || 0) + 1;
        });
        const catSegData = Object.entries(catSegMap).sort((a, b) =>
          Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0)
        ).slice(0, 10);
        const maxCatSeg = Math.max(...catSegData.map(([, v]) => Object.values(v).reduce((s, x) => s + x, 0)), 1);

        const totalWithSeg = segCounts.ticket_value + segCounts.mainstream + segCounts.premium;

        return (
          <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Productos', value: records.length, icon: <Package size={20}/>, color: 'text-slate-600 bg-slate-100' },
                { label: 'Ticket Value', value: segCounts.ticket_value, icon: <Award size={20}/>, color: 'text-blue-600 bg-blue-100' },
                { label: 'Mainstream', value: segCounts.mainstream, icon: <Star size={20}/>, color: 'text-emerald-600 bg-emerald-100' },
                { label: 'Premium', value: segCounts.premium, icon: <Zap size={20}/>, color: 'text-amber-600 bg-amber-100' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart 1: Products by segment donut */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-black text-slate-900 mb-4">Productos por Segmento</h4>
                <div className="flex items-center gap-8">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {(() => {
                      const data = [
                        { val: segCounts.ticket_value, color: '#3b82f6' },
                        { val: segCounts.mainstream, color: '#10b981' },
                        { val: segCounts.premium, color: '#f59e0b' },
                        { val: segCounts.sin_segmento, color: '#e2e8f0' },
                      ];
                      const total = data.reduce((s, d) => s + d.val, 0) || 1;
                      let angle = -90;
                      return data.map((d, i) => {
                        if (!d.val) return null;
                        const sweep = (d.val / total) * 360;
                        const r = 50, cx = 60, cy = 60;
                        const a1 = (angle * Math.PI) / 180;
                        const a2 = ((angle + sweep) * Math.PI) / 180;
                        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
                        const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
                        const largeArc = sweep > 180 ? 1 : 0;
                        const path = `M${cx},${cy} L${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} Z`;
                        angle += sweep;
                        return <path key={i} d={path} fill={d.color} opacity="0.9"/>;
                      });
                    })()}
                    <circle cx="60" cy="60" r="30" fill="white"/>
                    <text x="60" y="55" textAnchor="middle" className="text-xs" style={{ fontSize: 14, fontWeight: 900, fill: '#0f172a' }}>{totalWithSeg}</text>
                    <text x="60" y="70" textAnchor="middle" style={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }}>con seg.</text>
                  </svg>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Ticket Value', val: segCounts.ticket_value, color: 'bg-blue-500' },
                      { label: 'Mainstream', val: segCounts.mainstream, color: 'bg-emerald-500' },
                      { label: 'Premium', val: segCounts.premium, color: 'bg-amber-400' },
                      { label: 'Sin segmento', val: segCounts.sin_segmento, color: 'bg-slate-200' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}/>
                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                        <span className="text-xs font-black text-slate-900 ml-auto">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart 2: Brands by segment */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-black text-slate-900 mb-4">Marcas por Segmento</h4>
                <div className="space-y-2">
                  {brandSegData.map(([brand, segs]) => {
                    const total = Object.values(segs).reduce((s, v) => s + v, 0);
                    const maxB = Math.max(...brandSegData.map(([, s]) => Object.values(s).reduce((x, v) => x + v, 0)), 1);
                    return (
                      <div key={brand}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{brand}</span>
                          <span className="text-[10px] font-black text-slate-400">{total}</span>
                        </div>
                        <div className="h-5 bg-slate-50 rounded-lg overflow-hidden flex">
                          {(['ticket_value', 'mainstream', 'premium'] as const).map(s => segs[s] ? (
                            <div key={s} style={{ width: `${(segs[s] / maxB) * 100}%` }}
                              className={`h-full ${s === 'ticket_value' ? 'bg-blue-400' : s === 'mainstream' ? 'bg-emerald-400' : 'bg-amber-400'} transition-all`}
                              title={`${SEGMENT_CONFIG[s].label}: ${segs[s]}`}/>
                          ) : null)}
                        </div>
                      </div>
                    );
                  })}
                  {brandSegData.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Sin datos suficientes</p>}
                </div>
              </div>

              {/* Chart 3: Distribution by line */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-black text-slate-900 mb-4">Distribución por Línea</h4>
                <div className="space-y-3">
                  {lineDistData.map(([line, count]) => (
                    <div key={line}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">{line}</span>
                        <span className="text-xs font-black text-slate-900">{count}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all"
                          style={{ width: `${(count / maxLineDist) * 100}%` }}/>
                      </div>
                    </div>
                  ))}
                  {lineDistData.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Sin datos</p>}
                </div>
              </div>

              {/* Chart 4: Distribution by category and segment */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-black text-slate-900 mb-4">Distribución por Categoría y Segmento</h4>
                <div className="space-y-2">
                  {catSegData.map(([cat, segs]) => {
                    const total = Object.values(segs).reduce((s, v) => s + v, 0);
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider truncate max-w-[160px]">{cat}</span>
                          <span className="text-[10px] font-black text-slate-400">{total}</span>
                        </div>
                        <div className="h-4 bg-slate-50 rounded-lg overflow-hidden flex gap-px">
                          {(['ticket_value', 'mainstream', 'premium'] as const).map(s => segs[s] ? (
                            <div key={s} style={{ width: `${(segs[s] / maxCatSeg) * 100}%` }}
                              className={`h-full ${s === 'ticket_value' ? 'bg-blue-300' : s === 'mainstream' ? 'bg-emerald-300' : 'bg-amber-300'}`}
                              title={`${SEGMENT_CONFIG[s].label}: ${segs[s]}`}/>
                          ) : null)}
                        </div>
                      </div>
                    );
                  })}
                  {catSegData.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Sin datos suficientes</p>}
                </div>
              </div>
            </div>
          </div>
        );
      })()

      /* ── TABLE VIEW ── */
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto min-h-[420px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between"><span>Código SAP</span>
                      <HeaderFilterPopover column="codigoSAP" label="Código SAP" currentFilter={columnFilters.codigoSAP || ''} onFilterChange={handleFilterChange} currentSort={sortConfig} onSortChange={handleSortChange}/>
                    </div>
                  </th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between"><span>Nombre / Segmento</span>
                      <HeaderFilterPopover column="descripcionSAP" label="Descripción" currentFilter={columnFilters.descripcionSAP || ''} onFilterChange={handleFilterChange} currentSort={sortConfig} onSortChange={handleSortChange}/>
                    </div>
                  </th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Marca / Línea</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">PVP</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">FOB Ef.</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Ventas YTD</th>
                  <th className="px-5 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(record => {
                  const segCfg = record.segment ? SEGMENT_CONFIG[record.segment] : null;
                  const fobEff = getFobEffective(record);
                  const growth = getGrowthPct(record);
                  return (
                    <tr key={record.id} className="hover:bg-indigo-50/20 transition-colors group">
                      <td className="px-5 py-3">
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{record.codigoSAP}</span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-slate-900">{record.commercialName || record.descripcionSAP}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {segCfg && <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${segCfg.color}`}>{segCfg.label}</span>}
                          <span className="text-xs text-slate-400 font-medium">{record.proveedor}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs font-bold text-slate-700">{record.marca}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{record.linea}</p>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-black text-indigo-600">{record.pvp ? `S/ ${record.pvp}` : '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => handleOpenFobModal(record)} className="text-sm font-black text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1 mx-auto">
                          {fobEff > 0 ? `$ ${fobEff.toFixed(2)}` : '—'}
                          <Edit2 size={10} className="text-slate-300"/>
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{record.salesCurrentYear ? `${record.salesCurrentYear.toLocaleString()} un.` : '—'}</p>
                          {growth !== null && (
                            <p className={`text-[9px] font-black flex items-center justify-center gap-0.5 ${growth >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {growth >= 0 ? <ArrowUp size={8}/> : <ArrowDown size={8}/>}{Math.abs(growth).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedRecord(record); setIsDetailModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye size={15}/></button>
                          <button onClick={() => handleOpenEditModal(record)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><Edit2 size={15}/></button>
                          <button onClick={() => { if (window.confirm('¿Eliminar este producto?')) handleDeleteRecord(record.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={15}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRecords.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                <Package size={48} className="opacity-10 mb-4"/>
                <p className="font-bold text-sm uppercase tracking-widest">Sin productos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">{editingRecord ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Row 1: SAP + Nombre Comercial */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Código SAP</label>
                  <div className="flex gap-2">
                    <input type="text" required placeholder="Ej: SAP001"
                      className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={formData.codigoSAP} onChange={e => setFormData({ ...formData, codigoSAP: e.target.value })}/>
                    <button type="button" onClick={handleSyncDocuments}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5">
                      <Download size={14}/> Sync
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre Comercial</label>
                  <input type="text" placeholder="Nombre de cara al mercado"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.commercialName || ''} onChange={e => setFormData({ ...formData, commercialName: e.target.value })}/>
                </div>
              </div>
              {/* Descripción detallada */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Descripción Detallada</label>
                <textarea rows={2} placeholder="Características principales..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  value={formData.detailedDescription || ''} onChange={e => setFormData({ ...formData, detailedDescription: e.target.value })}/>
              </div>
              {/* Segmento + Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Segmento (Posicionamiento)</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.segment || ''} onChange={e => setFormData({ ...formData, segment: e.target.value as any || undefined })}>
                    <option value="">Sin segmento</option>
                    <option value="ticket_value">Ticket Value</option>
                    <option value="mainstream">Mainstream</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado de Producto</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.productStatus || 'vigente'} onChange={e => setFormData({ ...formData, productStatus: e.target.value as any })}>
                    <option value="vigente">Vigente</option>
                    <option value="reemplazo">Reemplazo</option>
                    <option value="descontinuado">Descontinuado</option>
                  </select>
                </div>
              </div>
              {/* Toggles: Habilitado + Incluye Kit */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Habilitado</span>
                  <div onClick={() => setFormData({ ...formData, habilitado: !formData.habilitado })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${formData.habilitado ? 'bg-orange-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.habilitado ? 'left-5' : 'left-0.5'}`}/>
                  </div>
                </label>
                <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Incluye Kit</span>
                  <div onClick={() => setFormData({ ...formData, incluyeKit: !formData.incluyeKit })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${formData.incluyeKit ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${formData.incluyeKit ? 'left-5' : 'left-0.5'}`}/>
                  </div>
                </label>
              </div>
              {/* Costo habilitación (visible solo si habilitado) */}
              {formData.habilitado && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-wider">Costo Habilitación / Kit ($)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500/20 outline-none"
                    value={formData.habilitacionCosto ?? ''} onChange={e => setFormData({ ...formData, habilitacionCosto: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
              )}
              {/* Marca / Línea / Categoría */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Marca</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value as any })}>
                    <option value="">Seleccionar</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Línea</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.linea} onChange={e => setFormData({ ...formData, linea: e.target.value as any })}>
                    <option value="">Seleccionar</option>
                    {productLines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoría (Sub)</label>
                  <input type="text" placeholder="Ej: Rapiducha"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.categoria || ''} onChange={e => setFormData({ ...formData, categoria: e.target.value })}/>
                </div>
              </div>
              {/* PVP + PVP Descuento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">PVP (S/)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.pvp ?? ''} onChange={e => setFormData({ ...formData, pvp: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">PVP con Descuento (S/)</label>
                  <input type="number" step="0.01" min="0" placeholder="Precio oferta..."
                    className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    value={formData.pvpDescuento ?? ''} onChange={e => setFormData({ ...formData, pvpDescuento: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
              </div>
              {/* FOB ($) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">FOB ($) — Solo costo base del producto</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={formData.fobPrice ?? ''} onChange={e => setFormData({ ...formData, fobPrice: e.target.value ? Number(e.target.value) : undefined })}/>
                {formData.habilitado && formData.habilitacionCosto && (
                  <p className="text-[10px] text-orange-600 font-bold">FOB Efectivo = ${((formData.fobPrice || 0) + formData.habilitacionCosto).toFixed(2)} (base + habilitación)</p>
                )}
              </div>
              {/* Ventas */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Año Actual</label>
                  <input type="number" placeholder="2024"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.currentYear ?? ''} onChange={e => setFormData({ ...formData, currentYear: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Año Anterior</label>
                  <input type="number" placeholder="2023"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.previousYear ?? ''} onChange={e => setFormData({ ...formData, previousYear: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ventas Año Actual (un.)</label>
                  <input type="number" min="0" placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.salesCurrentYear ?? ''} onChange={e => setFormData({ ...formData, salesCurrentYear: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ventas Año Anterior (un.)</label>
                  <input type="number" min="0" placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.salesPreviousYear ?? ''} onChange={e => setFormData({ ...formData, salesPreviousYear: e.target.value ? Number(e.target.value) : undefined })}/>
                </div>
              </div>
              {/* Proveedor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Proveedor</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.proveedor} onChange={e => setFormData({ ...formData, proveedor: e.target.value })}>
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.legalName}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Vincular Muestra</label>
                  <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.sampleId} onChange={e => setFormData({ ...formData, sampleId: e.target.value })}>
                    <option value="">Sin muestra</option>
                    {samples.map(s => <option key={s.id} value={s.id}>{s.correlativeId} - {s.descripcionSAP}</option>)}
                  </select>
                </div>
              </div>
              {/* Comentarios */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={12}/> Comentarios (uno por línea)
                </label>
                <textarea rows={3} placeholder="Temperatura constante&#10;Alta eficiencia..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  value={formData.catalogComments || ''} onChange={e => setFormData({ ...formData, catalogComments: e.target.value })}/>
              </div>

              {/* Approved Documents Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500"/> Documentos Aprobados
                  </h4>
                  <div className="flex items-center gap-2">
                    {isAddingNewDocCategory ? (
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Nombre categoría..." autoFocus
                          className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none"
                          value={newDocCategoryName} onChange={e => setNewDocCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewDocCategory()}/>
                        <button type="button" onClick={handleAddNewDocCategory} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Plus size={12}/></button>
                        <button type="button" onClick={() => setIsAddingNewDocCategory(false)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><X size={12}/></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setIsAddingNewDocCategory(true)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Plus size={12}/> Nueva Categoría
                      </button>
                    )}
                  </div>
                </div>
                {formData.approvedDocuments.map(group => (
                  <div key={group.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm group">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {editingDocCategoryId === group.id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" className="px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg outline-none"
                              value={editingDocCategoryName} onChange={e => setEditingDocCategoryName(e.target.value)} autoFocus/>
                            <button type="button" onClick={() => handleSaveDocCategoryName(group.id)} className="p-1 text-emerald-600"><Check size={12}/></button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{group.category}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => { setEditingDocCategoryId(group.id); setEditingDocCategoryName(group.category); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit3 size={10}/></button>
                          <button type="button" onClick={() => handleMoveGroup(group.id, 'up')} className="p-1 text-slate-400 hover:text-blue-600"><ArrowUp size={10}/></button>
                          <button type="button" onClick={() => handleMoveGroup(group.id, 'down')} className="p-1 text-slate-400 hover:text-blue-600"><ArrowDown size={10}/></button>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, approvedDocuments: prev.approvedDocuments.filter(g => g.id !== group.id) }))} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={10}/></button>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-slate-400">{group.documents.length} docs</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {group.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={14} className="text-emerald-600 shrink-0"/>
                            <p className="text-[10px] font-bold text-slate-900 truncate">{doc.name}</p>
                          </div>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, approvedDocuments: prev.approvedDocuments.map(g => g.id === group.id ? { ...g, documents: g.documents.filter(d => d.id !== doc.id) } : g) }))} className="p-1 text-slate-300 hover:text-red-500"><X size={10}/></button>
                        </div>
                      ))}
                      {group.documents.length === 0 && (
                        <div className="col-span-full py-3 text-center text-[10px] font-bold text-slate-300 border border-dashed border-slate-200 rounded-lg">Sin documentos</div>
                      )}
                    </div>
                  </div>
                ))}
                {formData.approvedDocuments.length === 0 && (
                  <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <FileText size={32} className="mb-2 opacity-10"/>
                    <p className="text-xs font-bold uppercase tracking-widest">Usa "Sync Docs" para traer documentos aprobados</p>
                  </div>
                )}
              </div>

              {/* Gallery Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} className="text-indigo-500"/> Galería de Inspección
                  </h4>
                  <div className="flex items-center gap-2">
                    {isAddingNewCategory ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nombre categoría..." autoFocus
                          className="text-xs font-bold px-3 py-1.5 bg-white border border-indigo-300 rounded-xl focus:outline-none" onKeyDown={e => { if (e.key === 'Enter') handleAddNewCategory(); if (e.key === 'Escape') setIsAddingNewCategory(false); }}/>
                        <button type="button" onClick={handleAddNewCategory} className="p-1.5 bg-indigo-600 text-white rounded-xl"><Check size={12}/></button>
                        <button type="button" onClick={() => setIsAddingNewCategory(false)} className="p-1.5 bg-slate-200 rounded-xl"><X size={12}/></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setIsAddingNewCategory(true)} className="text-xs font-black text-indigo-600 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                        <Plus size={12}/> Nueva Categoría
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {formData.gallery.map(group => (
                    <div key={group.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {editingCategoryId === group.id ? (
                            <div className="flex items-center gap-2">
                              <input type="text" value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} autoFocus
                                className="text-xs font-black bg-white border border-indigo-300 rounded px-2 py-1 outline-none" onKeyDown={e => { if (e.key === 'Enter') handleSaveCategoryName(group.id); if (e.key === 'Escape') setEditingCategoryId(null); }}/>
                              <button type="button" onClick={() => handleSaveCategoryName(group.id)} className="p-1 text-emerald-600"><Check size={12}/></button>
                              <button type="button" onClick={() => setEditingCategoryId(null)} className="p-1 text-rose-600"><X size={12}/></button>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">{group.category}</h5>
                              <button type="button" onClick={() => { setEditingCategoryId(group.id); setEditingCategoryName(group.category); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={10}/></button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setGalleryCategory(group.category); setIsGalleryUploadModalOpen(true); }} className="text-[10px] font-black text-indigo-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1"><Plus size={10}/> Añadir</button>
                          <button type="button" onClick={() => setDeleteConfirm({ id: group.id, type: 'category', title: group.category, onConfirm: () => setFormData(prev => ({ ...prev, gallery: prev.gallery.filter(g => g.id !== group.id) })) })} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12}/></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {group.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group/p">
                            <img src={photo.url} alt="" className="w-full h-full object-cover"/>
                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, gallery: prev.gallery.map(g => g.id === group.id ? { ...g, photos: g.photos.filter((_, i) => i !== pIdx) } : g) }))} className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded opacity-0 group-hover/p:opacity-100 transition-opacity"><X size={8}/></button>
                          </div>
                        ))}
                        {group.photos.length === 0 && <div className="col-span-full py-3 text-center text-[10px] font-bold text-slate-400 italic">Sin fotos</div>}
                      </div>
                    </div>
                  ))}
                  {formData.gallery.length === 0 && (
                    <div className="py-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={24} className="mb-1 opacity-20"/>
                      <p className="text-xs font-bold">Sin categorías de galería</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explode & Additional Docs */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Box size={14} className="text-blue-500"/> Explode</h4>
                    <button type="button" onClick={() => document.getElementById('explode-upload')?.click()} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                      <Plus size={14}/>
                      <input id="explode-upload" type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.html,.zip,.rar,.7z" onChange={handleExplodeUpload}/>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {formData.explodeFiles?.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden"><FileText size={12} className="text-blue-500 shrink-0"/><span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span></div>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, explodeFiles: prev.explodeFiles?.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500"><X size={12}/></button>
                      </div>
                    ))}
                    {(!formData.explodeFiles || formData.explodeFiles.length === 0) && (
                      <div className="py-4 border border-dashed border-slate-200 rounded-xl text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin archivos</div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Files size={14} className="text-amber-500"/> Docs Adicionales</h4>
                    <button type="button" onClick={() => document.getElementById('extra-docs-upload')?.click()} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                      <Plus size={14}/>
                      <input id="extra-docs-upload" type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.pdf,.ai,.dwg,.html,.zip,.rar,.7z" onChange={handleAdditionalDocsUpload}/>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {formData.additionalProviderDocuments?.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <div className="flex items-center gap-2 overflow-hidden"><FileText size={12} className="text-amber-500 shrink-0"/><span className="text-[10px] font-bold text-slate-700 truncate">{file.name}</span></div>
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, additionalProviderDocuments: prev.additionalProviderDocuments?.filter((_, i) => i !== idx) }))} className="text-slate-300 hover:text-red-500"><X size={12}/></button>
                      </div>
                    ))}
                    {(!formData.additionalProviderDocuments || formData.additionalProviderDocuments.length === 0) && (
                      <div className="py-4 border border-dashed border-slate-200 rounded-xl text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin documentos</div>
                    )}
                  </div>
                </div>
              </div>
            </form>
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all">Cancelar</button>
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting && <Loader2 size={14} className="animate-spin"/>}
                {editingRecord ? 'Guardar Cambios' : 'Registrar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><ShoppingBag size={20}/></div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedRecord.commercialName || selectedRecord.descripcionSAP}</h3>
                  {selectedRecord.segment && <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${SEGMENT_CONFIG[selectedRecord.segment].color}`}>{SEGMENT_CONFIG[selectedRecord.segment].label}</span>}
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Código SAP', value: selectedRecord.codigoSAP, color: 'text-indigo-600' },
                  { label: 'Marca / Línea', value: `${selectedRecord.marca} / ${selectedRecord.linea}`, color: 'text-slate-900' },
                  { label: 'PVP', value: selectedRecord.pvp ? `S/ ${selectedRecord.pvp}` : '—', color: 'text-indigo-600' },
                  { label: 'FOB Efectivo', value: `$ ${getFobEffective(selectedRecord).toFixed(2)}`, color: 'text-slate-900' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedRecord.catalogComments && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Comentarios</p>
                  {selectedRecord.catalogComments.split('\n').map((c, i) => c.trim() && <p key={i} className="text-sm text-slate-700 font-medium">• {c}</p>)}
                </div>
              )}
              {selectedRecord.fobPriceHistory && selectedRecord.fobPriceHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3"><HistoryIcon size={16} className="text-blue-500"/> Historial FOB</h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-100/50 border-b border-slate-100">
                        <th className="px-4 py-2 font-black text-slate-500 text-left">Fecha</th>
                        <th className="px-4 py-2 font-black text-slate-500 text-left">Usuario</th>
                        <th className="px-4 py-2 font-black text-slate-500 text-left">Precio</th>
                        <th className="px-4 py-2 font-black text-slate-500 text-left">Motivo</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecord.fobPriceHistory.map((entry, idx) => (
                          <tr key={idx}><td className="px-4 py-2 text-slate-500">{format(new Date(entry.date), 'dd/MM/yyyy HH:mm')}</td>
                            <td className="px-4 py-2 font-bold text-slate-700">{entry.user}</td>
                            <td className="px-4 py-2 font-black text-blue-600">${entry.price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-slate-600">{entry.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {selectedRecord.approvedDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3"><CheckCircle2 size={16} className="text-emerald-500"/> Documentos Aprobados</h4>
                  {selectedRecord.approvedDocuments.map(group => (
                    <div key={group.id} className="mb-4">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">{group.category}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.documents.map(doc => (
                          <a key={doc.id} href={doc.url} onClick={e => { e.preventDefault(); openFileUrl(doc.url); }} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group">
                            <FileText size={16} className="text-emerald-500 group-hover:text-emerald-600"/>
                            <div className="min-w-0"><p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p></div>
                            <Download size={14} className="ml-auto text-slate-300 group-hover:text-emerald-500"/>
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedRecord.gallery && selectedRecord.gallery.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3"><ImageIcon size={16} className="text-indigo-500"/> Galería</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecord.gallery.map(item => (
                      <div key={item.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-3 py-2 bg-slate-50 border-b border-slate-100">{item.category}</p>
                        <div className="p-3 grid grid-cols-4 gap-1.5">
                          {item.photos.map((photo, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-100">
                              <img src={photo.url} alt={photo.name} className="w-full h-full object-cover"/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between">
              <button onClick={() => { setIsDetailModalOpen(false); handleOpenEditModal(selectedRecord); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"><Edit2 size={14}/> Editar</button>
              <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Upload Modal */}
      {isGalleryUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Añadir a Galería</h3>
              <button onClick={() => { setIsGalleryUploadModalOpen(false); setTempGalleryPhotos([]); setGalleryCategory(''); }} className="p-2 hover:bg-white rounded-2xl transition-colors text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                <input type="text" value={galleryCategory} onChange={e => setGalleryCategory(e.target.value)} placeholder="Ej: Empaque, Producto, Defectos..."
                  list="gallery-categories-pm" className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-600 transition-all"/>
                <datalist id="gallery-categories-pm">{(isModalOpen ? formData.gallery : (selectedRecord?.gallery || [])).map(g => <option key={g.id} value={g.category}/>)}</datalist>
              </div>
              <div onClick={() => document.getElementById('gallery-file-input-pm')?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <Upload size={28} className="text-indigo-400"/>
                <p className="text-sm font-black text-slate-900 uppercase">Seleccionar fotos</p>
                <input id="gallery-file-input-pm" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" onChange={handleGalleryPhotoSelect} className="hidden"/>
              </div>
              {tempGalleryPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto">
                  {tempGalleryPhotos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={photo.url} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                      <button onClick={() => setTempGalleryPhotos(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button onClick={() => { setIsGalleryUploadModalOpen(false); setTempGalleryPhotos([]); setGalleryCategory(''); }} className="flex-1 py-3 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={handleConfirmGalleryUpload} disabled={!galleryCategory || tempGalleryPhotos.length === 0} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* FOB Price Modal */}
      {isFobModalOpen && fobEditingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div><h3 className="text-lg font-black text-slate-900 uppercase italic">Actualizar Precio FOB</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{fobEditingRecord.commercialName || fobEditingRecord.descripcionSAP}</p>
              </div>
              <button onClick={() => setIsFobModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo Precio Base (USD)</label>
                <div className="relative"><div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={16}/></div>
                  <input type="number" step="0.01" value={newFobPrice} onChange={e => setNewFobPrice(e.target.value)} placeholder="0.00" autoFocus
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:outline-none focus:border-blue-600 transition-all"/></div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo del Cambio</label>
                <textarea value={fobChangeReason} onChange={e => setFobChangeReason(e.target.value)} placeholder="Ej: Ajuste por costos de materia prima..."
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-600 transition-all min-h-[100px] resize-none"/>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="text-amber-500 shrink-0" size={16}/>
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">Cambio registrado en historial con usuario, fecha y motivo.</p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setIsFobModalOpen(false)} className="flex-1 py-3 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={handleUpdateFobPrice} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto mb-5"><Trash2 size={28}/></div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">¿Confirmar Eliminación?</h3>
              <p className="text-slate-500 text-sm font-medium">
                {deleteConfirm.type === 'record' ? 'Eliminar el producto' : 'Eliminar la categoría'}
                <span className="font-bold text-slate-900 block mt-1">"{deleteConfirm.title}"</span>
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-5 bg-slate-50 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200">Cancelar</button>
              <button onClick={() => { deleteConfirm.onConfirm(); setDeleteConfirm(null); if (deleteConfirm.type === 'record') setIsDetailModalOpen(false); }} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

