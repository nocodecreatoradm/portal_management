/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Plus, Settings, FileText, ArrowLeft, Beaker } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SupabaseService } from './lib/SupabaseService';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Filters from './components/Filters';
import DataTable from './components/DataTable';
import ActionModal from './components/ActionModal';
import ProductDetailModal from './components/ProductDetailModal';
import NewRequestModal from './components/NewRequestModal';
import ApproverConfigModal from './components/ApproverConfigModal';
import AssignmentModal from './components/AssignmentModal';
import InfoRequestModal from './components/InfoRequestModal';
import CommercialArtworks from './components/CommercialArtworks';
import Applications from './components/Applications';
import ReportsDashboard from './components/ReportsDashboard';
import Samples from './components/Samples';
import RDInventory from './components/RDInventory';
import NTPRegulations from './components/NTPRegulations';
import WorkPlan from './components/WorkPlan';
import SupplierMaster from './components/SupplierMaster';
import WaterDemandCalculator from './components/WaterDemandCalculator';
import GasHeaterExperimental from './components/GasHeaterExperimental';
import AbsorptionCalculator from './components/AbsorptionCalculator';
import TemperatureLossCalculator from './components/TemperatureLossCalculator';
import RecordsModule from './components/RecordsModule';
import Brandbook from './components/Brandbook';
import EnergyEfficiency from './components/EnergyEfficiency';
import ProductsModule from './components/ProductsModule';
import ProjectsModule from './components/ProjectsModule';
import CalendarModule from './components/CalendarModule';
import CalculationsDashboard from './components/CalculationsDashboard';
import InnovationProposals from './components/InnovationProposals';
import CrNiCoatingAnalysis from './components/CrNiCoatingAnalysis';
import CantonFair from './components/CantonFair';
import OvenExperimental from './components/OvenExperimental';
import ModuleActions from './components/ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from './lib/exportUtils';
import { saveCalculationRecord, fetchCalculationRecords } from './lib/api';
import { outlookService } from './services/outlookService';
import { initialData, technicians, designers, initialProjects, initialSamples, initialRDInventory, initialApprovers, initialSuppliers, initialEnergyEfficiency, initialProductManagement, initialCalendarTasks, initialRDProjectTemplates } from './data/mockData';
import { LandingPage } from './components/LandingPage';
import { 
  ProductRecord, 
  DocumentVersion, 
  ModuleId, 
  RDInventoryItem, 
  Supplier, 
  EnergyEfficiencyRecord, 
  ProductManagementRecord, 
  CalendarTask, 
  RDProjectTemplate, 
  CalculationRecord, 
  Project,
  RDProject,
  AssignmentInfo,
  InfoRequest
} from './types';
import UserManagement from './components/UserManagement';
import { useSamples } from './context/SamplesContext';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { samples, setSamples } = useSamples();
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('brandbook');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [data, setData] = useState<ProductRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [calculationRecords, setCalculationRecords] = useState<CalculationRecord[]>([]);
  const [approvers, setApprovers] = useState(initialApprovers);
  const [brands, setBrands] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [moduleInitialData, setModuleInitialData] = useState<Record<ModuleId, any>>({} as any);
  const [energyEfficiency, setEnergyEfficiency] = useState<any[]>([]);
  const [productManagement, setProductManagement] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    marca: '',
    linea: '',
    proveedor: '',
  });
  
  // Filtered data
  const filteredData = data.filter(record => {
    const matchMarca = !filters.marca || record.marca === filters.marca;
    const matchLinea = !filters.linea || record.linea === filters.linea;
    const matchProveedor = !filters.proveedor || record.proveedor === filters.proveedor;
    return matchMarca && matchLinea && matchProveedor;
  });

  // Detail Modal state
  const [detailRecord, setDetailRecord] = useState<ProductRecord | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

  // Extract unique providers for the dropdown in NewRequestModal
  const uniqueProviders: { name: string; emails: string[]; code: string }[] = Array.from(
    new Map<string, { name: string; emails: string[]; code: string }>(
      data.map(item => [item.proveedor + item.codProv, { name: item.proveedor, emails: item.correoProveedor, code: item.codProv }])
    ).values()
  );

  // New Request Modal state
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  // Action Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    record: ProductRecord | null;
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
    action: 'view' | 'upload' | 'approve' | null;
    version?: DocumentVersion;
    stage?: string;
  }>({
    record: null,
    type: null,
    action: null,
  });

  // Assignment Modal state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentConfig, setAssignmentConfig] = useState<{
    record: ProductRecord | null;
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  }>({
    record: null,
    type: null,
  });

  // Info Request Modal state
  const [isInfoRequestModalOpen, setIsInfoRequestModalOpen] = useState(false);
  const [infoRequestConfig, setInfoRequestConfig] = useState<{
    record: ProductRecord | null;
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  }>({
    record: null,
    type: null,
  });

  // Load all data from Supabase
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;
      
      setLoadingData(true);
      try {
        const results = await Promise.allSettled([
          SupabaseService.getProducts(),
          SupabaseService.getSuppliers(),
          SupabaseService.getSamples(),
          SupabaseService.getBrands(),
          SupabaseService.getProductLines(),
          SupabaseService.getApprovers()
        ]);

        const [
          productsRes,
          suppliersRes,
          samplesRes,
          brandsRes,
          linesRes,
          approversRes
        ] = results;

        if (productsRes.status === 'fulfilled') setData(productsRes.value);
        else console.error('Error loading products:', productsRes.reason);

        if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value as unknown as Supplier[]);
        else console.error('Error loading suppliers:', suppliersRes.reason);

        if (samplesRes.status === 'fulfilled') setSamples(samplesRes.value as any);
        else console.error('Error loading samples:', samplesRes.reason);

        if (brandsRes.status === 'fulfilled') setBrands(brandsRes.value);
        else console.error('Error loading brands:', brandsRes.reason);

        if (linesRes.status === 'fulfilled') setProductLines(linesRes.value);
        else console.error('Error loading product lines:', linesRes.reason);

        if (approversRes.status === 'fulfilled') setApprovers(approversRes.value);
        else console.error('Error loading approvers:', approversRes.reason);

        // Load calculations
        try {
          const calcRecords = await fetchCalculationRecords();
          setCalculationRecords(calcRecords);
        } catch (error) {
          console.error('Error loading calculations:', error);
        }

        // Only show error toast if critical data failed (like products or samples)
        if (productsRes.status === 'rejected' || samplesRes.status === 'rejected') {
          toast.error('Error al sincronizar datos principales con la nube');
        }

      } catch (error) {
        console.error('Unexpected error in loadAllData:', error);
        toast.error('Error crítico al sincronizar datos');
      } finally {
        setLoadingData(false);
      }
    };

    loadAllData();
  }, [user]);

  const handleSaveData = (details: { projectName: string; sampleId: string; description: string }) => {
    saveCalculationRecord(
      'artwork_followup', 
      'save', 
      data, 
      user?.email || 'unknown',
      details.projectName,
      details.sampleId,
      details.description
    );
    toast.success('Datos de seguimiento de artes guardados localmente y en la base de datos');
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(r => ({
      'ID': r.correlativeId,
      'Proveedor': r.proveedor,
      'Código SAP': r.codigoSAP,
      'Descripción SAP': r.descripcionSAP,
      'Línea': r.linea,
      'Marca': r.marca,
      'Diseñador': r.artworkAssignment?.designer || 'No asignado',
      'Versión Actual': r.artworks.length > 0 ? Math.max(...r.artworks.map(a => a.version)) : 0
    }));

    exportToExcel(exportData, `Seguimiento_Artes_${format(new Date(), 'yyyyMMdd')}`);
    if (user) {
      saveCalculationRecord('canton_fair', 'export_excel', { count: data.length }, user?.email || 'unknown');
    }
  };

  const handleExportPPT = async () => {
    try {
      const moduleTitle = activeModule.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      await exportToPPT('module-content', `Reporte_${activeModule}_${format(new Date(), 'yyyyMMdd')}`, moduleTitle);
      saveCalculationRecord('artwork_followup', 'export_ppt', { module: activeModule }, user?.email || 'unknown');
      toast.success('Presentación PPT generada con éxito');
    } catch (error) {
      console.error('Error generating PPT:', error);
      toast.error('Error al generar la presentación PPT');
    }
  };

  const handleExportPDF = async () => {
    const sections = [
      { contentId: 'artwork-table', title: 'Seguimiento de Artes - Listado General' }
    ];

    await generateReportPDF(sections, `Reporte_Seguimiento_Artes_${format(new Date(), 'yyyyMMdd')}`, 'Reporte de Seguimiento de Artes');
    saveCalculationRecord('artwork_followup', 'export_pdf', { sections }, user?.email || 'unknown');
  };

  const handleActionClick = (
    record: ProductRecord, 
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet', 
    action: 'view' | 'upload' | 'approve', 
    version?: DocumentVersion,
    stage?: string
  ) => {
    setModalConfig({ record, type, action, version, stage });
    setIsModalOpen(true);
  };

  const handleSaveAction = async (actionData: any) => {
    if (modalConfig.record && modalConfig.type) {
      try {
        const newData = [...data];
        const recordIndex = newData.findIndex(r => r.id === modalConfig.record?.id);
        
        if (recordIndex > -1) {
          const record = { ...newData[recordIndex] };
          const docArrayKey = modalConfig.type === 'artwork' ? 'artworks' : 
                            modalConfig.type === 'technical_sheet' ? 'technicalSheets' : 'commercialSheets';
          
          const currentDocs = [...(record[docArrayKey] || [])];

          if (modalConfig.action === 'upload') {
            const nextVersionNumber = currentDocs.length > 0 
              ? Math.max(...currentDocs.map(v => v.version)) + 1 
              : 1;

            const standardizedFiles = actionData.files.map((f: any, index: number) => {
              const extension = f.name.split('.').pop();
              const typeLabel = modalConfig.type === 'artwork' ? (actionData.category?.replace(/\s+/g, '') || 'Artwork') : 
                                modalConfig.type === 'technical_sheet' ? 'FichaTecnica' : 'FichaComercial';
              const sub = actionData.subcategory || '';
              const newName = `${record.codigoSAP}_${typeLabel}_${sub}_V${nextVersionNumber}${actionData.files.length > 1 ? `_${index + 1}` : ''}.${extension}`;
              
              return {
                ...f,
                name: newName
              };
            });

            const newVersion: DocumentVersion = {
              version: nextVersionNumber,
              files: standardizedFiles,
              category: actionData.category,
              subcategory: actionData.subcategory,
              proformaNumber: actionData.proformaNumber,
              solpedNumber: actionData.solpedNumber,
              uploadDate: new Date().toISOString().split('T')[0],
              uploadedBy: user?.name || 'Sistema',
              aplicaA: `V${nextVersionNumber}`,
              changeDescription: actionData.changeDescription,
              idApproval: { status: 'not_started' },
              mktApproval: { status: 'not_started' },
              planApproval: { status: 'not_started' },
              provApproval: { status: 'not_started' },
            };
            
            record[docArrayKey] = [...currentDocs, newVersion];
            newData[recordIndex] = record;
            
            // Persist to Supabase
            await SupabaseService.updateProduct(record.id, { [docArrayKey]: record[docArrayKey] });
            
            setData(newData);
            toast.success('Nueva versión registrada');
          } else if (modalConfig.action === 'approve' && (actionData.targetVersion || modalConfig.version) && modalConfig.stage) {
            const targetVersion = actionData.targetVersion || modalConfig.version;
            
            const versionIndex = currentDocs.findIndex(v => 
              v.version === targetVersion?.version &&
              v.category === targetVersion?.category &&
              v.subcategory === targetVersion?.subcategory
            );
            
            if (versionIndex > -1) {
              const stageKey = modalConfig.stage === 'I+D' ? 'idApproval' : 
                               modalConfig.stage === 'MKT' ? 'mktApproval' : 
                               modalConfig.stage === 'PLAN' ? 'planApproval' : 'provApproval';
              
              const updatedVersion = {
                ...currentDocs[versionIndex],
                [stageKey]: {
                  status: actionData.status,
                  user: user?.name || 'Sistema',
                  date: new Date().toISOString().split('T')[0],
                  comments: actionData.comments
                }
              };

              if (modalConfig.stage === 'PLAN') {
                updatedVersion.proformaNumber = actionData.proformaNumber;
                updatedVersion.solpedNumber = actionData.solpedNumber;
                updatedVersion.estimatedShipmentDate = actionData.estimatedShipmentDate;
              }

              currentDocs[versionIndex] = updatedVersion;
              record[docArrayKey] = currentDocs;
              newData[recordIndex] = record;
              
              // Persist to Supabase
              await SupabaseService.updateProduct(record.id, { [docArrayKey]: record[docArrayKey] });
              
              setData(newData);

              if (actionData.status === 'approved') {
                if (modalConfig.stage === 'PLAN') {
                  outlookService.sendApprovalEmail(record, updatedVersion, modalConfig.type || 'artwork');
                } else {
                  toast.info(`Informando sobre la aprobación de ${modalConfig.type}`);
                }
              }
              toast.success('Estado actualizado correctamente');
            }
          }
        }
      } catch (error) {
        console.error('Error handling save action:', error);
        toast.error('Error al procesar la acción');
      }
    }
    setIsModalOpen(false);
  };

  const handleStartFlow = (record: ProductRecord, version: DocumentVersion) => {
    const newData = [...data];
    const recordIndex = newData.findIndex(r => r.id === record.id);
    
    if (recordIndex > -1) {
      const updatedRecord = { ...newData[recordIndex] };
      // Determine which array to use based on activeModule
      const docArrayKey = activeModule === 'artwork_followup' ? 'artworks' : 
                          activeModule === 'technical_datasheet' ? 'technicalSheets' : 'commercialSheets';
      
      const docArray = [...(updatedRecord[docArrayKey] || [])];
      const versionIndex = docArray.findIndex(v => 
        v.version === version.version &&
        v.category === version.category &&
        v.subcategory === version.subcategory
      );
      
      if (versionIndex > -1) {
        const v = docArray[versionIndex];
        const isArtwork = activeModule === 'artwork_followup';
        
        docArray[versionIndex] = {
          ...v,
          idApproval: v.idApproval.status === 'not_started' ? { status: 'pending' } : v.idApproval,
          mktApproval: isArtwork && v.mktApproval.status === 'not_started' ? { status: 'pending' } : v.mktApproval,
          planApproval: isArtwork && v.planApproval.status === 'not_started' ? { status: 'pending' } : v.planApproval,
          provApproval: isArtwork && v.provApproval.status === 'not_started' ? { status: 'pending' } : v.provApproval,
        };
        updatedRecord[docArrayKey] = docArray;
        newData[recordIndex] = updatedRecord;
        setData(newData);
      }
    }
  };

  const handleAssignClick = (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet') => {
    setAssignmentConfig({ record, type });
    setIsAssignmentModalOpen(true);
  };

  const handleInfoRequestClick = (record: ProductRecord, type: 'artwork' | 'technical_sheet' | 'commercial_sheet') => {
    setInfoRequestConfig({ record, type });
    setIsInfoRequestModalOpen(true);
  };

  const handleSaveAssignment = (assignment: AssignmentInfo) => {
    if (assignmentConfig.record && assignmentConfig.type) {
      const newData = data.map(r => {
        if (r.id === assignmentConfig.record?.id) {
          const assignmentKey = assignmentConfig.type === 'artwork' ? 'artworkAssignment' : 
                                assignmentConfig.type === 'technical_sheet' ? 'technicalAssignment' : 'commercialAssignment';
          return {
            ...r,
            [assignmentKey]: assignment
          };
        }
        return r;
      });
      setData(newData);
    }
  };

  const handleSaveInfoRequests = (requests: InfoRequest[]) => {
    if (infoRequestConfig.record && infoRequestConfig.type) {
      const newData = data.map(r => {
        if (r.id === infoRequestConfig.record?.id) {
          const assignmentKey = infoRequestConfig.type === 'artwork' ? 'artworkAssignment' : 
                                infoRequestConfig.type === 'technical_sheet' ? 'technicalAssignment' : 'commercialAssignment';
          const currentAssignment = r[assignmentKey];
          if (currentAssignment) {
            return {
              ...r,
              [assignmentKey]: {
                ...currentAssignment,
                infoRequests: requests
              }
            };
          }
        }
        return r;
      });
      setData(newData);
    }
  };

  const handleNewRequest = async (newRecord: ProductRecord) => {
    try {
      const existingIndex = data.findIndex(r => r.codigoSAP.toLowerCase() === newRecord.codigoSAP.toLowerCase());
      
      if (existingIndex > -1) {
        // Update existing record metadata
        const existingRecord = data[existingIndex];
        const updates: Partial<ProductRecord> = {
          codigoEAN: newRecord.codigoEAN,
          descripcionSAP: newRecord.descripcionSAP,
          proveedor: newRecord.proveedor,
          codProv: newRecord.codProv,
          correoProveedor: newRecord.correoProveedor,
          marca: newRecord.marca,
          linea: newRecord.linea,
        };
        
        // Resolve names to IDs
        const resolvedUpdates = { ...updates };
        
        if (updates.marca) {
          const brand = brands.find(b => b.name === updates.marca);
          if (brand) {
            (resolvedUpdates as any).marca = brand.id;
          } else {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.marca);
            if (!isUUID) {
              const newBrand = await SupabaseService.createBrand({ name: updates.marca });
              (resolvedUpdates as any).marca = newBrand.id;
              setBrands(prev => [...prev, newBrand]);
            }
          }
        }

        if (updates.linea) {
          const line = productLines.find(l => l.name === updates.linea);
          if (line) {
            (resolvedUpdates as any).linea = line.id;
          } else {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.linea);
            if (!isUUID) {
              const newProductLine = await SupabaseService.createProductLine({ name: updates.linea });
              (resolvedUpdates as any).linea = newProductLine.id;
              setProductLines(prev => [...prev, newProductLine]);
            }
          }
        }

        if (updates.proveedor) {
          let supplier = suppliers.find(s => s.legalName === updates.proveedor);
          if (supplier) {
            (resolvedUpdates as any).proveedor = supplier.id;
          } else {
            // Create new supplier if it's a name and not found
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.proveedor);
            if (!isUUID) {
              const newSupplier = await SupabaseService.createSupplier({
                legalName: updates.proveedor,
                commercialAlias: updates.proveedor,
                erpCode: updates.codProv || 'NEW'
              });
              (resolvedUpdates as any).proveedor = newSupplier.id;
              setSuppliers(prev => [...prev, newSupplier]);
            }
          }
        }
        
        const result = await SupabaseService.updateProduct(existingRecord.id, resolvedUpdates);
        
        setData(prev => {
          const newData = [...prev];
          newData.splice(existingIndex, 1);
          newData.unshift(result);
          return newData;
        });
        toast.success('Producto existente actualizado y movido al inicio');
      } else {
        // Resolve names to IDs for new record
        const resolvedNewRecord = { ...newRecord };
        
        if (newRecord.marca) {
          const brand = brands.find(b => b.name === newRecord.marca);
          if (brand) {
            (resolvedNewRecord as any).marca = brand.id;
          } else {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newRecord.marca);
            if (!isUUID) {
              const newBrand = await SupabaseService.createBrand({ name: newRecord.marca });
              (resolvedNewRecord as any).marca = newBrand.id;
              setBrands(prev => [...prev, newBrand]);
            }
          }
        }

        if (newRecord.linea) {
          const line = productLines.find(l => l.name === newRecord.linea);
          if (line) {
            (resolvedNewRecord as any).linea = line.id;
          } else {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newRecord.linea);
            if (!isUUID) {
              const newProductLine = await SupabaseService.createProductLine({ name: newRecord.linea });
              (resolvedNewRecord as any).linea = newProductLine.id;
              setProductLines(prev => [...prev, newProductLine]);
            }
          }
        }

        if (newRecord.proveedor) {
          let supplier = suppliers.find(s => s.legalName === newRecord.proveedor);
          if (supplier) {
            (resolvedNewRecord as any).proveedor = supplier.id;
          } else {
            // Create new supplier if it's a name and not found
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newRecord.proveedor);
            if (!isUUID) {
              const newSupplier = await SupabaseService.createSupplier({
                legalName: newRecord.proveedor,
                commercialAlias: newRecord.proveedor,
                erpCode: newRecord.codProv || 'NEW'
              });
              (resolvedNewRecord as any).proveedor = newSupplier.id;
              setSuppliers(prev => [...prev, newSupplier]);
            }
          }
        }

        const result = await SupabaseService.createProduct(resolvedNewRecord as any);
        setData(prev => [result, ...prev]);
        toast.success('Nueva solicitud registrada');
      }
    } catch (error) {
      console.error('Error in handleNewRequest:', error);
      toast.error('Error al registrar la solicitud');
    }
  };

  const handleUpdateRecord = async (id: string, updates: Partial<ProductRecord>) => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
      const resolvedUpdates = { ...updates };
      
      if (updates.marca) {
        const brand = brands.find(b => b.name === updates.marca);
        if (brand) {
          (resolvedUpdates as any).marca = brand.id;
        } else {
          const isBrandUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.marca);
          if (!isBrandUUID) {
            const newBrand = await SupabaseService.createBrand({ name: updates.marca });
            (resolvedUpdates as any).marca = newBrand.id;
            setBrands(prev => [...prev, newBrand]);
          }
        }
      }

      if (updates.linea) {
        const line = productLines.find(l => l.name === updates.linea);
        if (line) {
          (resolvedUpdates as any).linea = line.id;
        } else {
          const isLineUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.linea);
          if (!isLineUUID) {
            const newProductLine = await SupabaseService.createProductLine({ name: updates.linea });
            (resolvedUpdates as any).linea = newProductLine.id;
            setProductLines(prev => [...prev, newProductLine]);
          }
        }
      }

      if (updates.proveedor) {
        let supplier = suppliers.find(s => s.legalName === updates.proveedor);
        if (supplier) {
          (resolvedUpdates as any).proveedor = supplier.id;
        } else {
          // Create new supplier if it's a name and not found
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updates.proveedor);
          if (!isUUID) {
            const newSupplier = await SupabaseService.createSupplier({
              legalName: updates.proveedor,
              commercialAlias: updates.proveedor,
              erpCode: (updates as any).codProv || 'UPD'
            });
            (resolvedUpdates as any).proveedor = newSupplier.id;
            setSuppliers(prev => [...prev, newSupplier]);
          }
        }
      }

      let result;
      if (isUUID) {
        result = await SupabaseService.updateProduct(id, resolvedUpdates);
      } else {
        // If not UUID, it's a mock record being updated for the first time
        // We merge the current record with updates and create it in Supabase
        const currentRecord = data.find(r => r.id === id);
        if (!currentRecord) throw new Error('Record not found');
        
        const { id: _, createdAt: __, ...recordToCreate } = { ...currentRecord, ...resolvedUpdates };
        result = await SupabaseService.createProduct(recordToCreate as any);
      }

      setData(prev => prev.map(r => r.id === id ? result : r));
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Error al actualizar datos');
    }
  };




  const renderModuleContent = () => {
    const moduleLabels: Record<ModuleId, string> = {
      rd_inventory: t('menu.rd_inventory'),
      ntp_regulations: t('menu.ntp_regulations'),
      samples: t('menu.samples'),
      technical_datasheet: t('menu.technical_datasheet'),
      commercial_datasheet: t('menu.commercial_datasheet'),
      artwork_followup: t('menu.artwork_followup'),
      commercial_artworks: t('menu.approved_artworks'),
      approved_technical_sheets: t('menu.approved_technical_sheets'),
      approved_commercial_sheets: t('menu.approved_commercial_sheets'),
      applications: t('menu.applications'),
      work_plan: t('menu.work_plan'),
      supplier_master: t('menu.supplier_master'),
      water_demand: t('menu.water_demand'),
      gas_heater_experimental: t('menu.gas_heater_experimental'),
      absorption_calculation: t('menu.absorption_calculation'),
      temperature_loss: t('menu.temperature_loss'),
      brandbook: t('menu.brandbook'),
      energy_efficiency: t('menu.energy_efficiency'),
      product_management: t('menu.product_catalog'),
      rd_projects: t('menu.rd_projects'),
      calculations_dashboard: t('menu.calculations_dashboard'),
      innovation_proposals: t('menu.innovation_proposals'),
      cr_ni_coating_analysis: t('menu.cr_ni_coating_analysis'),
      canton_fair: t('menu.international_fairs'),
      oven_experimental: t('menu.oven_experimental'),
      records: t('menu.base_records'),
      calendar: t('menu.calendar'),
      user_management: t('menu.users_permissions')
    };

    if (activeModule === 'user_management') {
      return <UserManagement />;
    }

    if (activeModule === 'innovation_proposals') {
      return <InnovationProposals />;
    }

    if (activeModule === 'brandbook') {
      return <Brandbook onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'energy_efficiency') {
      return <EnergyEfficiency onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'product_management') {
      return <ProductsModule onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'rd_projects') {
      return <ProjectsModule />;
    }


    if (activeModule === 'calculations_dashboard') {
      return (
        <CalculationsDashboard 
          onModuleChange={handleModuleChange}
          onLoadRecord={handleLoadRecord}
        />
      );
    }

    if (activeModule === 'cr_ni_coating_analysis') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <CrNiCoatingAnalysis initialData={moduleInitialData.cr_ni_coating_analysis} onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'canton_fair') {
      return <CantonFair />;
    }

    if (activeModule === 'temperature_loss') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <TemperatureLossCalculator onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'water_demand') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <WaterDemandCalculator initialData={moduleInitialData.water_demand} onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'gas_heater_experimental') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <GasHeaterExperimental initialData={moduleInitialData.gas_heater_experimental} onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'oven_experimental') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <OvenExperimental initialData={moduleInitialData.oven_experimental} onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'absorption_calculation') {
      return (
        <div className="space-y-6">
          <button 
            onClick={() => setActiveModule('calculations_dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Volver al Panel de Cálculos
          </button>
          <AbsorptionCalculator initialData={moduleInitialData.absorption_calculation} onExportPPT={handleExportPPT} />
        </div>
      );
    }

    if (activeModule === 'records') {
      return <RecordsModule onLoadRecord={handleLoadRecord} />;
    }

    if (activeModule === 'supplier_master') {
      return <SupplierMaster onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'commercial_artworks') {
      return <CommercialArtworks mode="artwork" />;
    }

    if (activeModule === 'approved_technical_sheets') {
      return <CommercialArtworks mode="technical_sheet" />;
    }

    if (activeModule === 'approved_commercial_sheets') {
      return <CommercialArtworks mode="commercial_sheet" />;
    }

    if (activeModule === 'samples') {
      return (
        <Samples 
          suppliers={suppliers}
          onExportPPT={handleExportPPT}
          onLoadRecord={handleLoadRecord}
        />
      );
    }

    if (activeModule === 'rd_inventory') {
      return <RDInventory onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'ntp_regulations') {
      return <NTPRegulations onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'work_plan') {
      return <WorkPlan onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'applications') {
      return <Applications />;
    }

    if (activeModule === 'calendar') {
      return <CalendarModule />;
    }
    if (activeModule === 'energy_efficiency') {
      return <EnergyEfficiency onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'product_management') {
      return <ProductsModule onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'rd_projects') {
      return <RDProjects onExportPPT={handleExportPPT} />;
    }

    if (showReport && activeModule === 'artwork_followup') {
      return <ReportsDashboard data={data} onBack={() => setShowReport(false)} />;
    }

    const isFollowupModule = ['artwork_followup', 'technical_datasheet', 'commercial_datasheet'].includes(activeModule);

    if (!isFollowupModule) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Settings className="mb-4 opacity-20" size={48} />
          <h2 className="text-2xl font-bold mb-2">{moduleLabels[activeModule]}</h2>
          <p className="font-medium">Este módulo se encuentra actualmente en desarrollo.</p>
        </div>
      );
    }

    const mode = activeModule === 'artwork_followup' ? 'artwork' : 
                 activeModule === 'technical_datasheet' ? 'technical_sheet' : 'commercial_sheet';

    return (
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{moduleLabels[activeModule]}</h2>
            <p className="text-slate-500 font-medium mt-1">
              {activeModule === 'artwork_followup' ? 'Gestión y seguimiento de aprobaciones de artes' : 
               activeModule === 'technical_datasheet' ? 'Gestión y seguimiento de fichas técnicas' : 
               'Gestión y seguimiento de fichas comerciales'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <button 
                onClick={() => setIsApproverModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Aprobadores</span>
              </button>
              <button 
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Reporte</span>
              </button>
            </div>

            <button 
              onClick={() => setIsNewRequestModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
            >
              <Plus size={18} />
              Nueva Solicitud
            </button>
          </div>
        </div>

        <div id="artwork-table" className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <Filters filters={filters} onFilterChange={setFilters} />
          
          <div className="px-8 pb-4 flex justify-between items-center border-t border-slate-100 pt-6">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Mostrando <span className="text-slate-900">{filteredData.length}</span> registros
            </p>
          </div>

          <DataTable 
            data={filteredData} 
            suppliers={suppliers}
            samples={samples}
            onActionClick={handleActionClick} 
            onViewDetail={setDetailRecord}
            onAssign={handleAssignClick}
            onInfoRequest={handleInfoRequestClick}
            onStartFlow={handleStartFlow}
            onEdit={(record) => {
              setEditingProduct(record);
              setIsNewRequestModalOpen(true);
            }}
            mode={mode}
          />
        </div>
      </div>
    );
  };

  const handleModuleChange = (module: ModuleId) => {
    setActiveModule(module);
    setShowReport(false);
  };

  const handleLoadRecord = (moduleId: ModuleId, data: any) => {
    // Navigate to the module
    setActiveModule(moduleId);
    setShowReport(false);

    // Update moduleInitialData for calculation modules
    setModuleInitialData(prev => ({
      ...prev,
      [moduleId]: data
    }));

    // Update specific states for other modules
    if (moduleId === 'rd_inventory' && Array.isArray(data)) {
      // RDInventory manages its own state from Supabase, but we can set initial data if needed
      setModuleInitialData(prev => ({ ...prev, [moduleId]: data }));
    } else if (moduleId === 'supplier_master' && Array.isArray(data)) {
      setSuppliers(data);
    } else if (moduleId === 'samples' && Array.isArray(data)) {
      setSamples(data);
    } else if (moduleId === 'energy_efficiency' && Array.isArray(data)) {
      setEnergyEfficiency(data);
    } else if (moduleId === 'product_management' && Array.isArray(data)) {
      setProductManagement(data);
    } else if ((moduleId === 'artwork_followup' || moduleId === 'commercial_artworks') && Array.isArray(data)) {
      setData(data);
    }

    setActiveModule(moduleId);
    toast.success(`Datos cargados en el módulo ${moduleId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b18] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/50">
            <Beaker className="w-10 h-10 text-white" />
          </div>
          <p className="text-blue-500 font-bold tracking-widest uppercase text-xs">Cargando Sistema</p>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!user && !showLogin ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <LandingPage onEnter={() => setShowLogin(true)} />
        </motion.div>
      ) : !user && showLogin ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
        >
          <LoginPage onBack={() => setShowLogin(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-screen bg-[#f1f5f9] font-sans selection:bg-blue-100 selection:text-blue-900"
        >
          <Toaster position="top-right" richColors />
          <Sidebar 
            activeModule={activeModule} 
            onModuleChange={handleModuleChange}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
          
          <div className="flex-1 flex flex-col min-w-0">
            <Header 
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              isSidebarOpen={isSidebarOpen}
            />
            
            <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="max-w-[1600px] mx-auto">
                {renderModuleContent()}
              </div>
            </main>
          </div>

          <ActionModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            {...modalConfig}
            onSave={handleSaveAction}
          />

          <ProductDetailModal 
            record={detailRecord} 
            suppliers={suppliers}
            samples={samples}
            onClose={() => setDetailRecord(null)} 
            onUpdateRecord={handleUpdateRecord}
            calculationRecords={calculationRecords}
            onLoadRecord={handleLoadRecord}
          />

          <NewRequestModal
            isOpen={isNewRequestModalOpen}
            onClose={() => {
              setIsNewRequestModalOpen(false);
              setEditingProduct(null);
            }}
            onSubmit={handleNewRequest}
            existingProviders={uniqueProviders}
            existingData={data}
            mode={activeModule === 'artwork_followup' ? 'artwork' : 
                  activeModule === 'technical_datasheet' ? 'technical_sheet' : 'commercial_sheet'}
            initialData={editingProduct}
          />

          <ApproverConfigModal
            isOpen={isApproverModalOpen}
            onClose={() => setIsApproverModalOpen(false)}
            currentApprovers={approvers}
            onSave={async (newApprovers, reason) => {
              try {
                const dbApprover = {
                  id_approver: newApprovers['I+D'],
                  mkt_approver: newApprovers['MKT'],
                  plan_approver: newApprovers['PLAN'],
                  prov_approver: newApprovers['PROV'],
                  reason: reason,
                  is_active: true
                };
                
                await SupabaseService.createApprover(dbApprover);
                setApprovers(newApprovers);
                toast.success('Configuración de aprobadores actualizada');
              } catch (error) {
                console.error('Error saving approvers:', error);
                toast.error('Error al guardar aprobadores');
              }
            }}
          />

          <AssignmentModal
            isOpen={isAssignmentModalOpen}
            onClose={() => setIsAssignmentModalOpen(false)}
            record={assignmentConfig.record}
            type={assignmentConfig.type}
            onSave={handleSaveAssignment}
          />

          <InfoRequestModal
            isOpen={isInfoRequestModalOpen}
            onClose={() => setIsInfoRequestModalOpen(false)}
            record={infoRequestConfig.record}
            type={infoRequestConfig.type}
            onSave={handleSaveInfoRequests}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

