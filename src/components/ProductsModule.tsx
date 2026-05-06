import React, { useState, useMemo, useEffect } from 'react';
import { ProductManagementRecord, SampleRecord, FileInfo, ProductRecord, DocumentVersion, Supplier, Brand, ProductLine } from '../types';
import { 
  Search, Plus, Filter, Download, Calendar, 
  FileText, Upload, Trash2, Edit2, X, Check,
  Eye, Link as LinkIcon, Image as ImageIcon, Box, Files,
  CheckCircle2, Grid, List, Tag, ShoppingBag, ChevronRight,
  TrendingUp, History as HistoryIcon, DollarSign, AlertCircle,
  ArrowUp, ArrowDown, Edit3
} from 'lucide-react';
import { format } from 'date-fns';
import ModuleActions from './ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from '../lib/exportUtils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { Loader2 } from 'lucide-react';
import HeaderFilterPopover from './HeaderFilterPopover';

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProductManagementRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ProductManagementRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // FOB Price states
  const [isFobModalOpen, setIsFobModalOpen] = useState(false);
  const [fobEditingRecord, setFobEditingRecord] = useState<ProductManagementRecord | null>(null);
  const [newFobPrice, setNewFobPrice] = useState<string>('');
  const [fobChangeReason, setFobChangeReason] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Omit<ProductManagementRecord, 'id' | 'createdAt'>>({
    codigoSAP: '',
    descripcionSAP: '',
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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updatedRecord.id);
      let result;
      if (isUUID) {
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
      record.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    Object.keys(columnFilters).forEach(col => {
      const filterVal = columnFilters[col]?.toLowerCase();
      if (filterVal) {
        result = result.filter(r => {
          if (col === 'codigoSAP') {
            return r.codigoSAP?.toLowerCase().includes(filterVal);
          }
          if (col === 'descripcionSAP') {
            return r.descripcionSAP?.toLowerCase().includes(filterVal) || r.proveedor?.toLowerCase().includes(filterVal);
          }
          if (col === 'marca') {
            return r.marca?.toLowerCase().includes(filterVal) || r.linea?.toLowerCase().includes(filterVal);
          }
          if (col === 'sampleId') {
            const linkedSample = samples.find(s => s.id === r.sampleId);
            return linkedSample?.correlativeId?.toLowerCase().includes(filterVal) || r.sampleId?.toLowerCase().includes(filterVal);
          }
          if (col === 'fobPrice') {
            return r.fobPrice?.toString().toLowerCase().includes(filterVal);
          }
          return false;
        });
      }
    });

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = '';
        let valB = '';
        if (sortConfig.column === 'codigoSAP') {
          valA = a.codigoSAP || '';
          valB = b.codigoSAP || '';
        } else if (sortConfig.column === 'descripcionSAP') {
          valA = a.descripcionSAP || '';
          valB = b.descripcionSAP || '';
        } else if (sortConfig.column === 'marca') {
          valA = a.marca || '';
          valB = b.marca || '';
        } else if (sortConfig.column === 'sampleId') {
          valA = a.sampleId || '';
          valB = b.sampleId || '';
        } else if (sortConfig.column === 'fobPrice') {
          valA = (a.fobPrice || 0).toString();
          valB = (b.fobPrice || 0).toString();
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, columnFilters, sortConfig, samples]);

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormData({
      codigoSAP: '',
      descripcionSAP: '',
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
    
    // Ensure IDs are used for selects if possible
    const brandId = record.brandId || brands.find(b => b.name === record.marca)?.id || record.marca;
    const supplierId = record.supplierId || 
                     suppliers.find(s => s.legalName === record.proveedor || s.commercialAlias === record.proveedor)?.id || 
                     record.proveedor;
    const lineId = record.lineId || productLines.find(l => l.name === record.linea)?.id || record.linea;

    setFormData({
      codigoSAP: record.codigoSAP,
      descripcionSAP: record.descripcionSAP,
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
      if (!isUUID(resolvedFormData.marca) && resolvedFormData.marca) {
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

      // Resolve Supplier
      if (!isUUID(resolvedFormData.proveedor) && resolvedFormData.proveedor) {
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

      // Resolve Line
      if (!isUUID(resolvedFormData.linea) && resolvedFormData.linea) {
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
    <div id="products-module-container" className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Productos I+D</h2>
          <p className="text-slate-500 font-medium mt-1">Gestión de productos, documentos aprobados y galerías de inspección</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid size={20} />
            </button>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#1e293b] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
          <ModuleActions 
            onSave={handleSaveData}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={handleExportPPT}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por SAP, descripción o proveedor..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando productos...</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto min-h-[420px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Código SAP</span>
                      <HeaderFilterPopover 
                        column="codigoSAP" 
                        label="Código SAP" 
                        currentFilter={columnFilters.codigoSAP || ''}
                        onFilterChange={handleFilterChange}
                        currentSort={sortConfig}
                        onSortChange={handleSortChange}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Descripción</span>
                      <HeaderFilterPopover 
                        column="descripcionSAP" 
                        label="Descripción / Proveedor" 
                        currentFilter={columnFilters.descripcionSAP || ''}
                        onFilterChange={handleFilterChange}
                        currentSort={sortConfig}
                        onSortChange={handleSortChange}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Marca / Línea</span>
                      <HeaderFilterPopover 
                        column="marca" 
                        label="Marca / Línea" 
                        currentFilter={columnFilters.marca || ''}
                        onFilterChange={handleFilterChange}
                        currentSort={sortConfig}
                        onSortChange={handleSortChange}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Muestra</span>
                      <HeaderFilterPopover 
                        column="sampleId" 
                        label="Muestra" 
                        currentFilter={columnFilters.sampleId || ''}
                        onFilterChange={handleFilterChange}
                        currentSort={sortConfig}
                        onSortChange={handleSortChange}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Docs Aprob.</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">
                    <div className="flex items-center justify-center">
                      <span>Precio FOB</span>
                      <HeaderFilterPopover 
                        column="fobPrice" 
                        label="Precio FOB" 
                        currentFilter={columnFilters.fobPrice || ''}
                        onFilterChange={handleFilterChange}
                        currentSort={sortConfig}
                        onSortChange={handleSortChange}
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Fotos</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => {
                const linkedSample = samples.find(s => s.id === record.sampleId);
                return (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {record.codigoSAP}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{record.descripcionSAP}</p>
                      <p className="text-xs text-slate-500 font-medium">{record.proveedor}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-700">{record.marca}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{record.linea}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {linkedSample ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 w-fit">
                          <LinkIcon size={12} />
                          <span className="text-xs font-bold">{linkedSample.correlativeId}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 italic">Sin muestra</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700">{record.approvedDocuments.length}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenFobModal(record)}
                        className="flex flex-col items-center justify-center gap-0.5 hover:bg-slate-50 p-1.5 rounded-lg transition-colors group/fob"
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-black text-slate-900">
                            {record.fobPrice ? `$${record.fobPrice.toFixed(2)}` : '-'}
                          </span>
                          <Edit2 size={12} className="text-slate-300 group-hover/fob:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">USD FOB</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ImageIcon size={14} className="text-indigo-500" />
                        <span className="text-sm font-bold text-slate-700">
                          {record.gallery.reduce((acc, g) => acc + g.photos.length, 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(record)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('¿Está seguro de eliminar este producto?')) {
                              handleDeleteRecord(record.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
            <div key={record.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {record.codigoSAP}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 line-clamp-1">{record.descripcionSAP}</h3>
                    <p className="text-sm text-slate-500 font-medium">{record.proveedor}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenEditModal(record)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Precio FOB</p>
                    <button 
                      onClick={() => handleOpenFobModal(record)}
                      className="flex items-center gap-2 mt-1 hover:text-blue-600 transition-colors"
                    >
                      <DollarSign size={14} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-700">{record.fobPrice ? `$${record.fobPrice.toFixed(2)}` : 'No asignado'}</span>
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Documentos</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700">{record.approvedDocuments.length} Aprobados</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-slate-400">{record.marca} | {record.linea}</span>
                  <button 
                    onClick={() => {
                      setSelectedRecord(record);
                      setIsDetailModalOpen(true);
                    }}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Ver Detalles
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingRecord ? 'Editar Producto' : 'Nuevo Producto I+D'}
                </h3>
                <p className="text-sm text-slate-500 font-medium">Complete la información del producto</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Código SAP</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={formData.codigoSAP}
                      onChange={(e) => setFormData({ ...formData, codigoSAP: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={handleSyncDocuments}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      <Download size={16} />
                      Sincronizar Docs
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Descripción SAP</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.descripcionSAP}
                    onChange={(e) => setFormData({ ...formData, descripcionSAP: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Marca</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value as any })}
                  >
                    <option value="">Seleccione una marca</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Línea</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.linea}
                    onChange={(e) => setFormData({ ...formData, linea: e.target.value as any })}
                  >
                    <option value="">Seleccione una línea</option>
                    {productLines.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Proveedor</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  >
                    <option value="">Seleccione un proveedor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.legalName}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Vincular Muestra</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={formData.sampleId}
                    onChange={(e) => setFormData({ ...formData, sampleId: e.target.value })}
                  >
                    <option value="">Sin muestra</option>
                    {samples.map(s => (
                      <option key={s.id} value={s.id}>{s.correlativeId} - {s.descripcionSAP}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Approved Documents Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Documentos Aprobados
                  </h4>
                  <div className="flex items-center gap-3">
                    {isAddingNewDocCategory ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                        <input 
                          type="text"
                          placeholder="Nombre de categoría..."
                          className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20"
                          value={newDocCategoryName}
                          onChange={(e) => setNewDocCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNewDocCategory()}
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={handleAddNewDocCategory}
                          className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsAddingNewDocCategory(false)}
                          className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setIsAddingNewDocCategory(true)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Plus size={14} />
                        Nueva Categoría
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {formData.approvedDocuments.map((group) => (
                    <div key={group.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm group">
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {editingDocCategoryId === group.id ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="text"
                                className="px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg outline-none"
                                value={editingDocCategoryName}
                                onChange={(e) => setEditingDocCategoryName(e.target.value)}
                                autoFocus
                              />
                              <button 
                                type="button"
                                onClick={() => handleSaveDocCategoryName(group.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{group.category}</span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingDocCategoryId(group.id);
                                setEditingDocCategoryName(group.category);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleMoveGroup(group.id, 'up')}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleMoveGroup(group.id, 'down')}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                approvedDocuments: prev.approvedDocuments.filter(g => g.id !== group.id)
                              }))}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{group.documents.length} documentos</span>
                      </div>
                      
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {group.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl group/doc">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText size={18} className="text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{doc.name}</p>
                                <p className="text-[9px] text-emerald-600 font-black uppercase">{doc.approvalDate}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                              <button 
                                type="button"
                                onClick={() => handleMoveDoc(group.id, doc.id, 'up')}
                                className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleMoveDoc(group.id, doc.id, 'down')}
                                className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
                              >
                                <ArrowDown size={12} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  approvedDocuments: prev.approvedDocuments.map(g => 
                                    g.id === group.id ? { ...g, documents: g.documents.filter(d => d.id !== doc.id) } : g
                                  )
                                }))}
                                className="p-1 text-emerald-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {group.documents.length === 0 && (
                          <div className="col-span-full py-4 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                            <p className="text-[10px] font-bold uppercase tracking-widest">Sin documentos en esta categoría</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.approvedDocuments.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-3 opacity-10" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-300">No hay documentos sincronizados</p>
                      <p className="text-[10px] mt-1 font-medium">Use el botón "Sincronizar Docs" arriba para traer los archivos aprobados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={18} className="text-indigo-500" />
                    Galería de Inspección I+D (Máx. 50 MB)
                  </h4>
                  <div className="flex items-center gap-3">
                    {isAddingNewCategory ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nombre de categoría..."
                          className="text-xs font-bold px-3 py-2 bg-white border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddNewCategory();
                            if (e.key === 'Escape') setIsAddingNewCategory(false);
                          }}
                        />
                        <button 
                          type="button"
                          onClick={handleAddNewCategory}
                          className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setIsAddingNewCategory(false)}
                          className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => setIsAddingNewCategory(true)}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl transition-all border border-indigo-100 shadow-sm"
                      >
                        <Plus size={16} />
                        Nueva Categoría
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6">
                  {formData.gallery.map((group) => (
                    <div key={group.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {editingCategoryId === group.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className="text-xs font-black text-slate-700 uppercase tracking-wider bg-white border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCategoryName(group.id);
                                  if (e.key === 'Escape') setEditingCategoryId(null);
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => handleSaveCategoryName(group.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">{group.category}</h5>
                              <button 
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(group.id);
                                  setEditingCategoryName(group.category);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setGalleryCategory(group.category);
                              setIsGalleryUploadModalOpen(true);
                            }}
                            className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-black text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 uppercase tracking-widest"
                          >
                            <Plus size={12} />
                            Añadir Fotos
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setDeleteConfirm({
                                id: group.id,
                                type: 'category',
                                title: group.category,
                                onConfirm: () => {
                                  setFormData(prev => ({
                                    ...prev,
                                    gallery: prev.gallery.filter(g => g.id !== group.id)
                                  }));
                                }
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {group.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group">
                            <img src={photo.url} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  gallery: prev.gallery.map(g => 
                                    g.id === group.id 
                                      ? { ...g, photos: g.photos.filter((_, i) => i !== pIdx) }
                                      : g
                                  )
                                }));
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {group.photos.length === 0 && (
                          <div className="col-span-full py-4 text-center text-[10px] font-bold text-slate-400 italic">
                            No hay fotos en esta categoría
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.gallery.length === 0 && (
                    <div className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} className="mb-2 opacity-20" />
                      <p className="text-xs font-bold">No hay categorías de galería</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explode & Additional Multi-docs section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Box size={18} className="text-blue-500" />
                      Explode (Vista Explosiva) (Máx. 50 MB)
                    </h4>
                    <button 
                      type="button"
                      onClick={() => document.getElementById('explode-upload')?.click()}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Plus size={18} />
                      <input id="explode-upload" type="file" multiple className="hidden" onChange={handleExplodeUpload} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.explodeFiles?.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={16} className="text-blue-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, explodeFiles: prev.explodeFiles?.filter((_, i) => i !== idx) }))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!formData.explodeFiles || formData.explodeFiles.length === 0) && (
                      <div className="py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <Box size={24} className="opacity-20 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin archivos de Explode</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Files size={18} className="text-amber-500" />
                      Documentos Adicionales (Máx. 50 MB)
                    </h4>
                    <button 
                      type="button"
                      onClick={() => document.getElementById('extra-docs-upload')?.click()}
                      className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <Plus size={18} />
                      <input id="extra-docs-upload" type="file" multiple className="hidden" onChange={handleAdditionalDocsUpload} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.additionalProviderDocuments?.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={16} className="text-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, additionalProviderDocuments: prev.additionalProviderDocuments?.filter((_, i) => i !== idx) }))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!formData.additionalProviderDocuments || formData.additionalProviderDocuments.length === 0) && (
                      <div className="py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                        <Files size={24} className="opacity-20 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sin documentos adicionales</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                {editingRecord ? 'Guardar Cambios' : 'Registrar Producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedRecord.descripcionSAP}</h3>
                  <p className="text-sm text-slate-500 font-medium">Detalles del Producto I+D</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Código SAP</p>
                  <p className="text-sm font-bold text-blue-600">{selectedRecord.codigoSAP}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Marca / Línea</p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.marca} / {selectedRecord.linea}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Proveedor</p>
                  <p className="text-sm font-bold text-slate-900">{selectedRecord.proveedor}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Muestra Vinculada</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {samples.find(s => s.id === selectedRecord.sampleId)?.correlativeId || 'Sin muestra'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Precio FOB (USD)</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-blue-600">
                      {selectedRecord.fobPrice ? `$${selectedRecord.fobPrice.toFixed(2)}` : 'No asignado'}
                    </p>
                    <button 
                      onClick={() => handleOpenFobModal(selectedRecord)}
                      className="p-1 px-2 bg-blue-100 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
              </div>

              {/* FOB Price History */}
              {selectedRecord.fobPriceHistory && selectedRecord.fobPriceHistory.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon size={18} className="text-blue-500" />
                    Historial de Cambios FOB
                  </h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/50 border-b border-slate-100">
                          <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-widest">Precio</th>
                          <th className="px-4 py-2 font-black text-slate-500 uppercase tracking-widest">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecord.fobPriceHistory.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-500">
                              {format(new Date(entry.date), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{entry.user}</td>
                            <td className="px-4 py-3 font-black text-blue-600">${entry.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-slate-600">{entry.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Approved Documents */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Documentos Aprobados
                </h4>
                
                <div className="space-y-6">
                  {selectedRecord.approvedDocuments.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-emerald-100"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{group.category}</span>
                        <div className="h-px flex-1 bg-emerald-100"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.documents.map((doc) => (
                          <a 
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{doc.approvalDate}</p>
                              </div>
                            </div>
                            <Download size={18} className="text-slate-400 group-hover:text-emerald-600" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedRecord.approvedDocuments.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                      <FileText size={48} className="text-slate-200 mb-3" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay documentos aprobados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explode & Additional Docs View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Box size={18} className="text-blue-500" />
                    Explode (Vista Explosiva)
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedRecord.explodeFiles?.map((file, idx) => (
                      <a 
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Box size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Explode File</p>
                          </div>
                        </div>
                        <Download size={18} className="text-slate-400 group-hover:text-blue-600" />
                      </a>
                    ))}
                    {(!selectedRecord.explodeFiles || selectedRecord.explodeFiles.length === 0) && (
                      <p className="text-sm text-slate-400 italic py-4">No hay archivos de Explode registrados.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Files size={18} className="text-amber-500" />
                    Documentos Adicionales del Proveedor
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedRecord.additionalProviderDocuments?.map((file, idx) => (
                      <a 
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Files size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Proveedor Adic.</p>
                          </div>
                        </div>
                        <Download size={18} className="text-slate-400 group-hover:text-amber-600" />
                      </a>
                    ))}
                    {(!selectedRecord.additionalProviderDocuments || selectedRecord.additionalProviderDocuments.length === 0) && (
                      <p className="text-sm text-slate-400 italic py-4">No hay documentos adicionales registrados.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery View */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={18} className="text-indigo-500" />
                    Galería de Inspección I+D
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedRecord.gallery && selectedRecord.gallery.length > 0 ? (
                    selectedRecord.gallery.map((item) => (
                      <div key={item.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm group">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.category}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{format(new Date(item.uploadDate), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="p-4 grid grid-cols-3 gap-2">
                          {item.photos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group/photo">
                              <img 
                                src={photo.url} 
                                alt={photo.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                <a href={photo.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/40 transition-all">
                                  <Eye size={16} />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200 text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                        <ImageIcon className="text-slate-300" size={32} />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay imágenes en la galería</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-1">Añade imágenes para documentar visualmente la inspección</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Upload Modal */}
      {isGalleryUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Añadir a Galería</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Sube fotos y asígnalas a una categoría</p>
              </div>
              <button 
                onClick={() => {
                  setIsGalleryUploadModalOpen(false);
                  setTempGalleryPhotos([]);
                  setGalleryCategory('');
                }}
                className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Category Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría de la Galería</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Tag size={18} />
                  </div>
                  <input
                    type="text"
                    value={galleryCategory}
                    onChange={(e) => setGalleryCategory(e.target.value)}
                    placeholder="Ej: Empaque, Producto, Defectos, Manuales..."
                    list="gallery-categories-pm"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-slate-300"
                  />
                  <datalist id="gallery-categories-pm">
                    {(isModalOpen ? formData.gallery : (selectedRecord?.gallery || [])).map(g => (
                      <option key={g.id} value={g.category} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(new Set([
                    ...(isModalOpen ? formData.gallery : (selectedRecord?.gallery || [])).map(g => g.category),
                    'Empaque', 'Producto', 'Defectos', 'Manuales', 'Etiquetas'
                  ])).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGalleryCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        galleryCategory === cat 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload Area */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotos para subir</label>
                <div 
                  onClick={() => document.getElementById('gallery-file-input-pm')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Seleccionar fotos</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Puedes subir múltiples archivos a la vez</p>
                  </div>
                  <input
                    id="gallery-file-input-pm"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryPhotoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Preview Area */}
              {tempGalleryPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa ({tempGalleryPhotos.length})</label>
                    <button 
                      onClick={() => setTempGalleryPhotos([])}
                      className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                    >
                      Limpiar Todo
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 max-h-[240px] overflow-y-auto p-1 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                    {tempGalleryPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                        <img src={photo.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setTempGalleryPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => {
                  setIsGalleryUploadModalOpen(false);
                  setTempGalleryPhotos([]);
                  setGalleryCategory('');
                }}
                className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmGalleryUpload}
                disabled={!galleryCategory || tempGalleryPhotos.length === 0}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Confirmar Subida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOB Price Modal */}
      {isFobModalOpen && fobEditingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Actualizar Precio FOB</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Socio: {fobEditingRecord.descripcionSAP}</p>
              </div>
              <button onClick={() => setIsFobModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nuevo Precio (USD)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <DollarSign size={18} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={newFobPrice}
                    onChange={(e) => setNewFobPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo del Cambio</label>
                <textarea
                  value={fobChangeReason}
                  onChange={(e) => setFobChangeReason(e.target.value)}
                  placeholder="Ej: Ajuste por costos de materia prima, actualización anual..."
                  className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all min-h-[120px] resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                  Este cambio será registrado en el historial de trazabilidad con su usuario, fecha y el motivo especificado.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setIsFobModalOpen(false)}
                className="flex-1 py-4 bg-white text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateFobPrice}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                ¿Confirmar Eliminación?
              </h3>
              <p className="text-slate-500 text-sm font-medium">
                Estás a punto de eliminar {deleteConfirm.type === 'record' ? 'el producto' : 'la categoría'} 
                <span className="font-bold text-slate-900 block mt-1">"{deleteConfirm.title}"</span>
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteConfirm.onConfirm();
                  setDeleteConfirm(null);
                  if (deleteConfirm.type === 'record') {
                    setIsDetailModalOpen(false);
                  }
                }}
                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add missing icon
