/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { Plus, Settings, FileText, ArrowLeft, Beaker, Search, X } from 'lucide-react';
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
import QualityClaimModal from './components/QualityClaimModal';
import QualityClaimsModule from './components/QualityClaimsModule';

import AssignmentModal from './components/AssignmentModal';
import DateEditModal from './components/DateEditModal';
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
import PriceGMROISimulator from './components/PriceGMROISimulator';
import CalculationsDashboard from './components/CalculationsDashboard';
import SizingModule from './components/SizingModule';
import SolyAssistant from './components/SolyAssistant';
import InnovationProposals from './components/InnovationProposals';
import CrNiCoatingAnalysis from './components/CrNiCoatingAnalysis';
import CantonFair from './components/CantonFair';
import OvenExperimental from './components/OvenExperimental';
import MasterDataModule from './components/MasterDataModule';
import ArtworkGantt from './components/ArtworkGantt';
import ModuleActions from './components/ModuleActions';
import { exportToExcel, generateReportPDF, exportToPPT } from './lib/exportUtils';
import { saveCalculationRecord, fetchCalculationRecords } from './lib/api';
import { outlookService } from './services/outlookService';


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
  InfoRequest,
  QualityClaim
} from './types';
import UserManagement from './components/UserManagement';
import { useSamples } from './context/SamplesContext';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { samples, setSamples } = useSamples();
  const { user, profile, loading, isRecovery } = useAuth();
  const { t } = useTranslation();
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('brandbook');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [data, setData] = useState<ProductRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [calculationRecords, setCalculationRecords] = useState<CalculationRecord[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [moduleInitialData, setModuleInitialData] = useState<Record<ModuleId, any>>({} as any);
  const [energyEfficiency, setEnergyEfficiency] = useState<any[]>([]);
  const [productManagement, setProductManagement] = useState<any[]>([]);
  const [qualityClaims, setQualityClaims] = useState<QualityClaim[]>([]);
  const [isQualityClaimsModalOpen, setIsQualityClaimsModalOpen] = useState(false);
  const [selectedQualityClaimsProduct, setSelectedQualityClaimsProduct] = useState<ProductRecord | null>(null);
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [isSolyVisible, setIsSolyVisible] = useState(() => {
    const saved = localStorage.getItem('is_soly_visible');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const handleToggleSoly = () => {
    setIsSolyVisible((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('is_soly_visible', JSON.stringify(next));
      return next;
    });
  };
  const [filters, setFilters] = useState({
    marca: '',
    linea: '',
    proveedor: '',
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filtered data
  const filteredData = data.filter(record => {
    if (!record) return false;
    // Tracking type filter for followup modules
    const isFollowupModule = ['artwork_followup', 'technical_datasheet', 'commercial_datasheet'].includes(activeModule);
    if (isFollowupModule) {
      const expectedType = activeModule === 'artwork_followup' ? 'artwork' : 
                           activeModule === 'technical_datasheet' ? 'technical' : 'commercial';
      if (record.trackingType !== expectedType) return false;
    }

    const matchMarca = !filters.marca || record.marca === filters.marca;
    const matchLinea = !filters.linea || record.linea === filters.linea;
    const matchProveedor = !filters.proveedor || record.proveedor === filters.proveedor;

    let matchSearch = true;
    if (globalSearch.trim()) {
      const searchTerms = globalSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const assignmentObj = record.trackingType === 'artwork' ? record.artworkAssignment :
                            record.trackingType === 'technical' ? record.technicalAssignment :
                            record.commercialAssignment;
      const designerOrTechName = assignmentObj?.designer || '';
      const reviewerName = assignmentObj?.reviewer || '';

      const docList = record.trackingType === 'artwork' ? record.artworks :
                      record.trackingType === 'technical' ? (record.technicalSheets || []) :
                      (record.commercialSheets || []);

      let statusLabel = 'En Proceso';
      if (!designerOrTechName) {
        statusLabel = 'Sin Asignar';
      } else if (docList.length === 0) {
        statusLabel = record.trackingType === 'artwork' ? 'Pendiente de Arte' : 'Pendiente';
      } else {
        const hasRejected = docList.some(v => 
          v.idApproval.status === 'rejected' || 
          (record.trackingType === 'artwork' && (v.mktApproval?.status === 'rejected' || v.provApproval?.status === 'rejected' || v.planApproval?.status === 'rejected'))
        );
        if (hasRejected) {
          statusLabel = 'Observado';
        } else {
          const allApproved = docList.every(v => {
            const idOk = v.idApproval.status === 'approved';
            if (record.trackingType !== 'artwork') return idOk;
            return idOk && v.mktApproval?.status === 'approved' && v.provApproval?.status === 'approved' && v.planApproval?.status === 'approved';
          });
          if (allApproved) {
            statusLabel = 'Aprobado Final';
          } else {
            const hasIdPending = docList.some(v => v.idApproval.status === 'pending');
            if (hasIdPending) {
              statusLabel = 'En Revisión I+D';
            } else if (record.trackingType === 'artwork') {
              const hasMktPending = docList.some(v => v.mktApproval?.status === 'pending');
              if (hasMktPending) {
                statusLabel = 'En Revisión MKT';
              } else {
                const hasProvPending = docList.some(v => v.provApproval?.status === 'pending');
                if (hasProvPending) {
                  statusLabel = 'En Revisión PROV';
                }
              }
            }
          }
        }
      }
      
      const searchIndex = [
        record.id || '',
        record.correlativeId || '',
        record.codigoSAP || '',
        record.descripcionSAP || '',
        record.comments || '',
        record.linea || '',
        record.categoria || '',
        record.marca || '',
        record.proveedor || '',
        designerOrTechName,
        reviewerName,
        statusLabel,
      ].map(str => str.toLowerCase()).join(' ');

      matchSearch = searchTerms.every(term => searchIndex.includes(term));
    }

    return matchMarca && matchLinea && matchProveedor && matchSearch;
  });

  // Detail Modal state
  const [detailRecord, setDetailRecord] = useState<ProductRecord | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

  // Extract unique providers for the dropdown in NewRequestModal
  const uniqueProviders: { name: string; emails: string[]; code: string }[] = useMemo(() => {
    const fromData = data.map(item => {
      let resolvedName = item.proveedor;
      const s = suppliers.find(sup => sup.id === item.proveedor || sup.legalName === item.proveedor);
      if (s) {
        resolvedName = s.commercialAlias || s.legalName || item.proveedor;
      }
      return {
        name: resolvedName,
        emails: item.correoProveedor,
        code: item.codProv || (s ? s.erpCode : '')
      };
    });
    const fromSuppliers = suppliers.map(sup => {
      let emails: string[] = [];
      if (sup.email) {
        emails = Array.isArray(sup.email) 
          ? sup.email 
          : sup.email.split(',').map((e: string) => e.trim()).filter(Boolean);
      }
      return {
        name: sup.commercialAlias || sup.legalName,
        emails,
        code: sup.erpCode || ''
      };
    });
    const map = new Map<string, { name: string; emails: string[]; code: string }>();
    [...fromSuppliers, ...fromData].forEach(item => {
      if (item.name && !map.has(item.name)) {
        map.set(item.name, item);
      }
    });
    return Array.from(map.values());
  }, [data, suppliers]);

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
  const [isDateEditModalOpen, setIsDateEditModalOpen] = useState(false);
  const [assignmentConfig, setAssignmentConfig] = useState<{
    record: ProductRecord | null;
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  }>({ record: null, type: null });
  const [dateEditConfig, setDateEditConfig] = useState<{
    record: ProductRecord | null;
    mode: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  }>({ record: null, mode: null });

  // Info Request Modal state
  const [isInfoRequestModalOpen, setIsInfoRequestModalOpen] = useState(false);
  const [infoRequestConfig, setInfoRequestConfig] = useState<{
    record: ProductRecord | null;
    type: 'artwork' | 'technical_sheet' | 'commercial_sheet' | null;
  }>({
    record: null,
    type: null,
  });

  // Parse query parameters for deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const moduleParam = params.get('module') as ModuleId;
    if (moduleParam) {
      setActiveModule(moduleParam);
    }
  }, []);

  // Load core data from Supabase (lightweight initial load)
  useEffect(() => {
    const loadCoreData = async () => {
      if (!user) return;
      
      setLoadingData(true);
      try {
        // Only load essential lightweight data on startup
        const results = await Promise.allSettled([
          SupabaseService.getProducts(),
          SupabaseService.getSuppliers(),
          SupabaseService.getBrands(),
          SupabaseService.getProductLines()
        ]);

        const [
          productsRes,
          suppliersRes,
          brandsRes,
          linesRes
        ] = results;

        if (productsRes.status === 'fulfilled') setData(productsRes.value);
        else console.error('Error loading products:', productsRes.reason);

        if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value as unknown as Supplier[]);
        else console.error('Error loading suppliers:', suppliersRes.reason);

        if (brandsRes.status === 'fulfilled') setBrands(brandsRes.value);
        else console.error('Error loading brands:', brandsRes.reason);

        if (linesRes.status === 'fulfilled') setProductLines(linesRes.value);
        else console.error('Error loading product lines:', linesRes.reason);

        // Fetch categories as well
        try {
          const cats = await SupabaseService.getCategories();
          setCategories(cats);
        } catch (e) {
          console.error('Error loading categories:', e);
        }

        // Fetch quality claims
        try {
          const claims = await SupabaseService.getQualityClaims();
          setQualityClaims(claims);
        } catch (e) {
          console.error('Error loading quality claims:', e);
        }



        // Load calculations lazily (non-blocking)
        fetchCalculationRecords()
          .then(calcRecords => setCalculationRecords(calcRecords))
          .catch(error => console.error('Error loading calculations:', error));

        // Only show error toast if critical data failed
        if (productsRes.status === 'rejected') {
          toast.error('Error al sincronizar datos principales con la nube');
        }

      } catch (error) {
        console.error('Unexpected error in loadCoreData:', error);
        toast.error('Error crítico al sincronizar datos');
      } finally {
        setLoadingData(false);
      }
    };

    loadCoreData();
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
      'Versión Actual': r.artworks.length > 0 ? Math.max(...r.artworks.map(a => Number(a.version))) : 0
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
        const recordId = modalConfig.record?.id;
        const recordIndex = newData.findIndex(r => r.id === recordId);
        
        if (recordIndex > -1) {
          const record = { ...newData[recordIndex] };

          const docArrayKey = modalConfig.type === 'artwork' ? 'artworks' : 
                            modalConfig.type === 'technical_sheet' ? 'technicalSheets' : 'commercialSheets';
          
          const currentDocs = [...(record[docArrayKey] || [])];

          if (modalConfig.action === 'upload') {
            const categoryDocs = modalConfig.type === 'artwork'
              ? currentDocs.filter(v => v.category === actionData.category && v.subcategory === actionData.subcategory)
              : currentDocs;
            
            const nextVersionNumber = categoryDocs.length > 0 
              ? Math.max(...categoryDocs.map(v => Number(v.version))) + 1 
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
              provApproval: { status: 'not_started' },
              planApproval: { status: 'not_started' },
            };
            
            record[docArrayKey] = [...currentDocs, newVersion];
            newData[recordIndex] = record;
            
            // Persist to Supabase
            if (record.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id)) {
              await SupabaseService.updateProduct(record.id, { [docArrayKey]: record[docArrayKey] });
            } else if (record.codigoSAP) {
              await SupabaseService.updateProductBySAP(record.codigoSAP, { [docArrayKey]: record[docArrayKey] });
            }
            
            setData(newData);
            toast.success('Nueva versión registrada');
          } else if (modalConfig.action === 'approve' && (actionData.targetVersion || modalConfig.version) && modalConfig.stage) {
            const targetVersion = actionData.targetVersion || modalConfig.version;
            
            const versionIndex = currentDocs.findIndex(v => 
              Number(v.version) === Number(targetVersion?.version) &&
              v.category === targetVersion?.category &&
              v.subcategory === targetVersion?.subcategory
            );
            
            let updatedVersion;
            if (modalConfig.stage === 'PLAN') {
              // Para Planeamiento, la aprobación es GLOBAL para todos los documentos del registro
              record[docArrayKey] = currentDocs.map(v => ({
                ...v,
                planApproval: {
                  status: actionData.status,
                  user: user?.name || 'Sistema',
                  date: new Date().toISOString().split('T')[0],
                  comments: actionData.comments
                },
                proformaNumber: actionData.proformaNumber,
                solpedNumber: actionData.solpedNumber,
                estimatedShipmentDate: actionData.estimatedShipmentDate
              }));
              updatedVersion = record[docArrayKey][0];
            } else if (versionIndex > -1) {
              const stageKey = modalConfig.stage === 'I+D' ? 'idApproval' : 
                               modalConfig.stage === 'MKT' ? 'mktApproval' : 'provApproval';
              
              updatedVersion = {
                ...currentDocs[versionIndex],
                [stageKey]: {
                  status: actionData.status,
                  user: user?.name || 'Sistema',
                  date: new Date().toISOString().split('T')[0],
                  comments: actionData.comments
                }
              };
              currentDocs[versionIndex] = updatedVersion;
              record[docArrayKey] = currentDocs;
            }

            // Sequential multi-stage flow logic for artworks
            const isArtwork = modalConfig.type === 'artwork';
            let allEvaluated = false;
            let hasRejections = false;

            if (isArtwork && modalConfig.stage) {
              const stage = modalConfig.stage; // 'I+D' | 'MKT' | 'PROV' | 'PLAN'
              const stageKey = stage === 'I+D' ? 'idApproval' : 
                               stage === 'MKT' ? 'mktApproval' : 
                               stage === 'PROV' ? 'provApproval' : 'planApproval';
              
              const newlyUpdatedDocs = record[docArrayKey] || [];
              const latestByCategory = Object.values(
                newlyUpdatedDocs.reduce((acc: any, v: any) => {
                  if (!v) return acc;
                  const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
                  if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
                  return acc;
                }, {} as Record<string, DocumentVersion>)
              ) as DocumentVersion[];

              allEvaluated = latestByCategory.every((v: any) => 
                ['approved', 'approved_with_observation', 'rejected'].includes(v[stageKey]?.status)
              );

              hasRejections = latestByCategory.some((v: any) => 
                v[stageKey]?.status === 'rejected'
              );

              if (allEvaluated) {
                if (hasRejections) {
                  // Stop flow and reset subsequent stages to not_started
                  latestByCategory.forEach((latestV: any) => {
                    const idx = newlyUpdatedDocs.findIndex((v: any) => 
                      Number(v.version) === Number(latestV.version) && 
                      v.category === latestV.category && 
                      v.subcategory === latestV.subcategory
                    );
                    if (idx > -1) {
                      const v = newlyUpdatedDocs[idx];
                      if (stage === 'I+D') {
                        newlyUpdatedDocs[idx] = { ...v, mktApproval: { status: 'not_started' }, provApproval: { status: 'not_started' }, planApproval: { status: 'not_started' } };
                      } else if (stage === 'MKT') {
                        newlyUpdatedDocs[idx] = { ...v, provApproval: { status: 'not_started' }, planApproval: { status: 'not_started' } };
                      } else if (stage === 'PROV') {
                        newlyUpdatedDocs[idx] = { ...v, planApproval: { status: 'not_started' } };
                      }
                    }
                  });
                  record[docArrayKey] = newlyUpdatedDocs;
                } else {
                  // Advance active documents to the next stage ('pending')
                  latestByCategory.forEach((latestV: any) => {
                    const idx = newlyUpdatedDocs.findIndex((v: any) => 
                      Number(v.version) === Number(latestV.version) && 
                      v.category === latestV.category && 
                      v.subcategory === latestV.subcategory
                    );
                    if (idx > -1) {
                      const v = newlyUpdatedDocs[idx];
                      if (stage === 'I+D') {
                        newlyUpdatedDocs[idx] = { ...v, mktApproval: { status: 'pending' } };
                      } else if (stage === 'MKT') {
                        newlyUpdatedDocs[idx] = { ...v, provApproval: { status: 'pending' } };
                      } else if (stage === 'PROV') {
                        newlyUpdatedDocs[idx] = { ...v, planApproval: { status: 'pending' } };
                      }
                    }
                  });
                  record[docArrayKey] = newlyUpdatedDocs;
                }
              }
            }
            
            newData[recordIndex] = record;
            
            // Persist to Supabase
            if (record.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.id)) {
              await SupabaseService.updateProduct(record.id, { [docArrayKey]: record[docArrayKey] });
            } else if (record.codigoSAP) {
              await SupabaseService.updateProductBySAP(record.codigoSAP, { [docArrayKey]: record[docArrayKey] });
            }
            
            setData(newData);

            // Trigger notification emails
            if (isArtwork && modalConfig.stage) {
              if (allEvaluated) {
                if (hasRejections) {
                  outlookService.sendObservationEmail(record, modalConfig.stage, actionData.comments || 'Se registraron observaciones en la revisión.', 'Artes');
                } else {
                  if (modalConfig.stage === 'PLAN') {
                    outlookService.sendApprovalEmail(record, updatedVersion, 'artwork');
                  } else {
                    const nextStageName = modalConfig.stage === 'I+D' ? 'Aprobación Técnica' : 
                                         modalConfig.stage === 'MKT' ? 'Aprobación Marketing' : 'Aprobación Proveedor';
                    outlookService.sendStageApprovalEmail(
                      record, 
                      updatedVersion, 
                      modalConfig.stage, 
                      nextStageName, 
                      actionData.comments || '', 
                      user?.name || 'Sistema'
                    );
                  }
                }
              }
            } else {
              // Non-artworks evaluation notification logic
              if (actionData.status === 'approved' || actionData.status === 'approved_with_observation') {
                outlookService.sendStageApprovalEmail(
                  record, 
                  updatedVersion, 
                  modalConfig.stage || '', 
                  'Aprobación Técnica', 
                  actionData.comments || '', 
                  user?.name || 'Sistema',
                  modalConfig.type || 'technical_sheet'
                );
              } else if (actionData.status === 'rejected') {
                outlookService.sendObservationEmail(record, modalConfig.stage || '', actionData.comments, modalConfig.type || 'technical_sheet');
              }
            }
            toast.success('Estado actualizado correctamente');
          }
        }
      } catch (error) {
        console.error('Error handling save action:', error);
        toast.error('Error al procesar la acción');
      }
    }
    setIsModalOpen(false);
  };

  const handleStartFlow = async (record: ProductRecord, version: DocumentVersion) => {
    const newData = [...data];
    const recordIndex = newData.findIndex(r => r.id === record.id);
    
    if (recordIndex > -1) {
      const updatedRecord = { ...newData[recordIndex] };
      const isArtwork = activeModule === 'artwork_followup';
      // Determine which array to use based on activeModule
      const docArrayKey = activeModule === 'artwork_followup' ? 'artworks' : 
                          activeModule === 'technical_datasheet' ? 'technicalSheets' : 'commercialSheets';
      
      const docArray = [...(updatedRecord[docArrayKey] || [])];
      
      if (isArtwork) {
        // Find latest version of each category (active files list)
        const latestByCategory = Object.values(
          docArray.reduce((acc, v) => {
            if (!v) return acc;
            const key = v.category && v.subcategory ? `${v.category.toUpperCase()} - ${v.subcategory.toUpperCase()}` : (v.category || 'Others').toUpperCase();
            if (!acc[key] || Number(acc[key].version) < Number(v.version)) acc[key] = v;
            return acc;
          }, {} as Record<string, DocumentVersion>)
        ) as DocumentVersion[];

        // Update all active files to have idApproval = 'pending' (if not_started)
        // and others = 'not_started'
        latestByCategory.forEach(latestV => {
          const idx = docArray.findIndex(v => 
            Number(v.version) === Number(latestV.version) && 
            v.category === latestV.category && 
            v.subcategory === latestV.subcategory
          );
          if (idx > -1) {
            const v = docArray[idx];
            docArray[idx] = {
              ...v,
              idApproval: v.idApproval.status === 'not_started' ? { status: 'pending' } : v.idApproval,
              mktApproval: { status: 'not_started' },
              provApproval: { status: 'not_started' },
              planApproval: { status: 'not_started' }
            };
          }
        });
      } else {
        const versionIndex = docArray.findIndex(v => 
          Number(v.version) === Number(version.version) &&
          v.category === version.category &&
          v.subcategory === version.subcategory
        );
        
        if (versionIndex > -1) {
          const v = docArray[versionIndex];
          docArray[versionIndex] = {
            ...v,
            idApproval: v.idApproval.status === 'not_started' ? { status: 'pending' } : v.idApproval,
          };
        }
      }

      updatedRecord[docArrayKey] = docArray;
      newData[recordIndex] = updatedRecord;
      setData(newData);

      // Persist to Supabase
      try {
        if (updatedRecord.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedRecord.id)) {
          await SupabaseService.updateProduct(updatedRecord.id, { [docArrayKey]: updatedRecord[docArrayKey] });
        } else if (updatedRecord.codigoSAP) {
          await SupabaseService.updateProductBySAP(updatedRecord.codigoSAP, { [docArrayKey]: updatedRecord[docArrayKey] });
        }
        
        // Notify flow start
        outlookService.sendFlowStartEmail(updatedRecord, version, activeModule === 'artwork_followup' ? 'Artes' : 'Fichas');
        toast.success('Flujo de aprobaciones iniciado para todos los archivos activos');
      } catch (error) {
        console.error('Error persisting flow start:', error);
        toast.error('Error al guardar inicio de flujo en la nube');
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

  const handleEditDatesClick = (record: ProductRecord, mode: 'artwork' | 'technical_sheet' | 'commercial_sheet') => {
    setDateEditConfig({ record, mode });
    setIsDateEditModalOpen(true);
  };

  const handleSaveDateEdit = async (recordId: string, updatedAssignment: AssignmentInfo) => {
    if (dateEditConfig.mode) {
      const updateField = dateEditConfig.mode === 'artwork' ? 'artworkAssignment' : 
                         dateEditConfig.mode === 'technical_sheet' ? 'technicalAssignment' : 'commercialAssignment';
      await handleUpdateRecord(recordId, { [updateField]: updatedAssignment });
    }
  };

  const handleSaveAssignment = async (assignment: AssignmentInfo) => {
    if (assignmentConfig.record && assignmentConfig.type) {
      const assignmentKey = assignmentConfig.type === 'artwork' ? 'artworkAssignment' : 
                            assignmentConfig.type === 'technical_sheet' ? 'technicalAssignment' : 'commercialAssignment';
      
      const newData = data.map(r => {
        if (r.id === assignmentConfig.record?.id) {
          return { ...r, [assignmentKey]: assignment };
        }
        return r;
      });
      setData(newData);

      // Persist assignment to Supabase
      try {
        const recordId = assignmentConfig.record.id;
        if (recordId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId)) {
          // Assignments are stored as part of the product's explode_files or as separate fields
          // For now, persist via the product update mechanism
          const updatedRecord = newData.find(r => r.id === recordId);
          if (updatedRecord) {
            await SupabaseService.updateProduct(recordId, { [assignmentKey]: assignment } as any);
          }
        }
      } catch (error: any) {
        console.error('Error persisting assignment:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          assignment: assignment
        });
        toast.error('Asignación guardada localmente pero falló la sincronización con la nube');
      }
    }
  };

  const handleSaveInfoRequests = async (requests: InfoRequest[]) => {
    if (infoRequestConfig.record && infoRequestConfig.type) {
      const assignmentKey = infoRequestConfig.type === 'artwork' ? 'artworkAssignment' : 
                            infoRequestConfig.type === 'technical_sheet' ? 'technicalAssignment' : 'commercialAssignment';
      
      const newData = data.map(r => {
        if (r.id === infoRequestConfig.record?.id) {
          const currentAssignment = r[assignmentKey];
          if (currentAssignment) {
            return {
              ...r,
              [assignmentKey]: { ...currentAssignment, infoRequests: requests }
            };
          }
        }
        return r;
      });
      setData(newData);

      // Persist info requests to Supabase
      try {
        const recordId = infoRequestConfig.record.id;
        if (recordId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId)) {
          const updatedRecord = newData.find(r => r.id === recordId);
          if (updatedRecord) {
            const updatedAssignment = updatedRecord[assignmentKey];
            await SupabaseService.updateProduct(recordId, { [assignmentKey]: updatedAssignment } as any);
          }
        }
      } catch (error) {
        console.error('Error persisting info requests:', error);
        toast.error('Solicitudes guardadas localmente pero falló la sincronización con la nube');
      }
    }
  };

  const handleNewRequest = async (newRecord: ProductRecord) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isFollowupModule = ['artwork_followup', 'technical_datasheet', 'commercial_datasheet'].includes(activeModule);
      const targetType = activeModule === 'artwork_followup' ? 'artwork' : 
                         activeModule === 'technical_datasheet' ? 'technical' : 'commercial';

      const existingIndex = data.findIndex(r => {
        if (r.id === newRecord.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.id)) {
          return true;
        }
        if (r.codigoSAP && newRecord.codigoSAP && r.codigoSAP.toLowerCase() === newRecord.codigoSAP.toLowerCase()) {
          if (isFollowupModule) {
            return r.trackingType === targetType;
          } else {
            return !r.trackingType;
          }
        }
        return false;
      });

      if (existingIndex > -1 && data[existingIndex].id !== newRecord.id) {
        const typeLabel = activeModule === 'artwork_followup' ? 'Artes' : 
                          activeModule === 'technical_datasheet' ? 'Ficha Técnica' : 'Ficha Comercial';
        toast.error(`El código SAP "${newRecord.codigoSAP}" ya está registrado en el seguimiento de ${typeLabel}.`);
        setIsSubmitting(false);
        return;
      }
      
      // Helper to resolve master data names to IDs
      const resolveMetadata = async (record: any) => {
        const resolved = { ...record };
        if (record.marca) {
          const brand = brands.find(b => b.name === record.marca);
          if (brand) resolved.marca = brand.id;
          else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.marca)) {
            try {
              const newBrand = await SupabaseService.createBrand({ name: record.marca });
              resolved.marca = newBrand.id;
              setBrands(prev => [...prev, newBrand]);
            } catch (err: any) {
              // Duplicate: try to find the existing brand
              const freshBrands = await SupabaseService.getBrands().catch(() => brands);
              const existingBrand = (freshBrands as any[]).find((b: any) => b.name === record.marca);
              if (existingBrand) { resolved.marca = existingBrand.id; setBrands(freshBrands as any); }
              else console.warn('Error creating brand:', err);
            }
          }
        }
        if (record.linea) {
          const line = productLines.find(l => l.name === record.linea);
          if (line) resolved.linea = line.id;
          else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.linea)) {
            try {
              const newLine = await SupabaseService.createProductLine({ name: record.linea });
              resolved.linea = newLine.id;
              setProductLines(prev => [...prev, newLine]);
            } catch (err: any) {
              const freshLines = await SupabaseService.getProductLines().catch(() => productLines);
              const existingLine = (freshLines as any[]).find((l: any) => l.name === record.linea);
              if (existingLine) { resolved.linea = existingLine.id; setProductLines(freshLines as any); }
              else console.warn('Error creating line:', err);
            }
          }
        }
        if (record.categoria) {
          const currentLineId = resolved.linea;
          const cat = categories.find(c => c.name.toLowerCase() === record.categoria.toLowerCase() && c.productLineId === currentLineId);
          if (cat) {
            resolved.categoryId = cat.id;
          } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.categoria)) {
            const generalCat = categories.find(c => c.name.toLowerCase() === record.categoria.toLowerCase());
            if (generalCat) resolved.categoryId = generalCat.id;
          }
        }
        if (record.proveedor) {
          const supplier = suppliers.find(s => s.legalName === record.proveedor || s.commercialAlias === record.proveedor);
          if (supplier) {
            resolved.proveedor = supplier.id;
            // UPDATE supplier's email if provided
            if (record.correoProveedor && record.correoProveedor.length > 0) {
              const currentEmails = Array.isArray(supplier.email) 
                ? supplier.email 
                : (supplier.email ? supplier.email.split(',').map((e: string) => e.trim()).filter(Boolean) : []);
              const mergedEmails = Array.from(new Set([...currentEmails, ...record.correoProveedor]));
              if (mergedEmails.length !== currentEmails.length || !currentEmails.every(e => mergedEmails.includes(e))) {
                try {
                  const newEmailString = mergedEmails.join(', ');
                  await SupabaseService.updateSupplier(supplier.id, { email: newEmailString });
                  setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, email: newEmailString } : s));
                } catch (err) { console.warn('Error updating supplier emails:', err); }
              }
            }
          }
          else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.proveedor)) {
            try {
              const newSupplier = await SupabaseService.createSupplier({
                legalName: record.proveedor,
                commercialAlias: record.proveedor,
                erpCode: record.codProv || 'NEW',
                email: record.correoProveedor ? record.correoProveedor.join(', ') : ''
              });
              resolved.proveedor = newSupplier.id;
              setSuppliers(prev => [...prev, newSupplier]);
            } catch (err: any) {
              // If creation failed (e.g. duplicate), refresh suppliers and try to find it
              console.warn('Error creating supplier, searching for existing one:', err);
              try {
                const allSuppliers = await SupabaseService.getSuppliers();
                const existing = (allSuppliers as any[]).find((s: any) =>
                  s.legalName === record.proveedor || s.commercialAlias === record.proveedor
                );
                if (existing) {
                  resolved.proveedor = existing.id;
                  setSuppliers(allSuppliers as any);
                }
              } catch (fetchErr) {
                console.warn('Could not fetch suppliers after creation error:', fetchErr);
              }
            }
          }
        }
        return resolved;
      };

      if (existingIndex > -1) {
        const existingRecord = data[existingIndex];
        const resolvedUpdates = await resolveMetadata(newRecord);

        if (isFollowupModule && existingRecord.linkedGroupId) {
          // Update all records in the same group
          const linkedRecords = data.filter(r => r.linkedGroupId === existingRecord.linkedGroupId);
          const updatePromises = linkedRecords.map(r => SupabaseService.updateProduct(r.id, resolvedUpdates));
          const results = await Promise.all(updatePromises);
          
          const freshProducts = await SupabaseService.getProducts();
          setData(freshProducts);
          toast.success('Solicitud y sus vinculados actualizados');
        } else {
          await SupabaseService.updateProduct(existingRecord.id, resolvedUpdates);
          const freshProducts = await SupabaseService.getProducts();
          setData(freshProducts);
          toast.success('Registro actualizado');
        }
      } else {
        const resolvedNewRecord = await resolveMetadata(newRecord);
        
        if (isFollowupModule) {
          // Determine specific type based on active module
          const type = activeModule === 'artwork_followup' ? 'artwork' : 
                       activeModule === 'technical_datasheet' ? 'technical' : 'commercial';
          
          const result = await SupabaseService.createProduct({
            ...resolvedNewRecord,
            trackingType: type
          } as any);
          
          const freshProducts = await SupabaseService.getProducts();
          setData(freshProducts);
          outlookService.sendNewTrackingEmail({
            code: result.codigoSAP,
            description: result.descripcionSAP,
            supplier: result.proveedor,
            brand: result.marca,
            creatorEmail: user?.email
          }, activeModule === 'artwork_followup' ? 'Artes' : 
            activeModule === 'technical_datasheet' ? 'Ficha Técnica' : 'Ficha Comercial');
          toast.success(`Nueva solicitud creada en el módulo de ${
            activeModule === 'artwork_followup' ? 'Artes' : 
            activeModule === 'technical_datasheet' ? 'Ficha Técnica' : 'Ficha Comercial'
          }`);
        } else {
          const result = await SupabaseService.createProduct(resolvedNewRecord as any);
          const freshProducts = await SupabaseService.getProducts();
          setData(freshProducts);
          outlookService.sendNewTrackingEmail({
            code: result.codigoSAP,
            description: result.descripcionSAP,
            supplier: result.proveedor,
            brand: result.marca,
            creatorEmail: user?.email
          }, 'General');
          toast.success('Nueva solicitud registrada');
        }
      }
    } catch (error) {
      console.error('Error in handleNewRequest:', error);
      toast.error('Error al registrar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRecord = async (id: string, updates: Partial<ProductRecord>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const resolvedUpdates = { ...updates };
      
      if (updates.marca) {
        const brand = brands.find(b => b.name === updates.marca);
        if (brand) {
          (resolvedUpdates as any).marca = brand.id;
        } else {
          const isBrandUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.marca);
          if (!isBrandUUID) {
            try {
              const newBrand = await SupabaseService.createBrand({ name: updates.marca });
              (resolvedUpdates as any).marca = newBrand.id;
              setBrands(prev => [...prev, newBrand]);
            } catch (err) {
              console.warn('Error creating brand, ignoring:', err);
            }
          }
        }
      }

      if (updates.linea) {
        const line = productLines.find(l => l.name === updates.linea);
        if (line) {
          (resolvedUpdates as any).linea = line.id;
        } else {
          const isLineUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.linea);
          if (!isLineUUID) {
            try {
              const newProductLine = await SupabaseService.createProductLine({ name: updates.linea });
              (resolvedUpdates as any).linea = newProductLine.id;
              setProductLines(prev => [...prev, newProductLine]);
            } catch (err) {
              console.warn('Error creating line, ignoring:', err);
            }
          }
        }
      }

      if (updates.proveedor) {
        let supplier = suppliers.find(s => s.legalName === updates.proveedor || s.commercialAlias === updates.proveedor);
        if (supplier) {
          (resolvedUpdates as any).proveedor = supplier.id;
        } else {
          // Create new supplier if it's a name and not found
          const isSupplierUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.proveedor);
          if (!isSupplierUUID) {
            try {
              const newSupplier = await SupabaseService.createSupplier({
                legalName: updates.proveedor,
                commercialAlias: updates.proveedor,
                erpCode: (updates as any).codProv || 'UPD'
              });
              (resolvedUpdates as any).proveedor = newSupplier.id;
              setSuppliers(prev => [...prev, newSupplier]);
            } catch (err) {
              console.warn('Error creating supplier, ignoring:', err);
            }
          }
        }
      }

      let result;
      if (isUUID) {
        const metadataFields = ['codigoSAP', 'codigoEAN', 'descripcionSAP', 'marca', 'linea', 'proveedor', 'correlativeId', 'sampleId'];
        const hasMetadataUpdate = Object.keys(updates).some(key => metadataFields.includes(key));
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
        } else if (hasMetadataUpdate && currentRecord?.linkedGroupId) {
          // Update all records in the group for metadata fields
          const metadataUpdates: any = {};
          metadataFields.forEach(f => { if ((resolvedUpdates as any)[f] !== undefined) metadataUpdates[f] = (resolvedUpdates as any)[f]; });
          
          const linkedRecords = data.filter(r => r.linkedGroupId === currentRecord.linkedGroupId);
          const results = await Promise.all(linkedRecords.map(r => 
            SupabaseService.updateProduct(r.id, r.id === id ? resolvedUpdates : metadataUpdates)
          ));
          
          setData(prev => prev.map(r => results.find(res => res.id === r.id) || r));
          result = results.find(res => res.id === id);
        } else {
          result = await SupabaseService.updateProduct(id, resolvedUpdates);
          setData(prev => prev.map(r => r.id === id ? result : r));
        }
      } else {
        const currentRecord = data.find(r => r.id === id);
        if (!currentRecord) throw new Error('Record not found');
        const { id: _, createdAt: __, ...recordToCreate } = { ...currentRecord, ...resolvedUpdates };
        result = await SupabaseService.createProduct(recordToCreate as any);
        setData(prev => prev.map(r => r.id === id ? result : r));
      }
      if (detailRecord?.id === id && result) {
        setDetailRecord(result);
      }
      toast.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error updating record:', error);
      toast.error('Error al actualizar datos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveQualityClaim = async (claimData: Partial<QualityClaim>) => {
    try {
      const newClaim = await SupabaseService.createQualityClaim(claimData);
      setQualityClaims(prev => [newClaim, ...prev]);
      
      const product = data.find(p => p.id === newClaim.productId);
      if (product) {
        outlookService.sendQualityClaimEmail(product, newClaim).catch(err => {
          console.error('Error sending quality claim email:', err);
        });
      }
      toast.success('Reclamo de calidad registrado correctamente');
    } catch (error) {
      console.error('Error registering quality claim:', error);
      toast.error('Error al registrar el reclamo de calidad');
    }
  };

  const handleUpdateQualityClaim = async (id: string, updates: Partial<QualityClaim>) => {
    try {
      const updated = await SupabaseService.updateQualityClaim(id, updates);
      if (updated) {
        setQualityClaims(prev => prev.map(c => c.id === id ? updated : c));
        if (updates.status === 'resolved') {
          const product = data.find(p => p.id === updated.productId);
          if (product) {
            outlookService.sendQualityClaimResolvedEmail(product, updated).catch(err => {
              console.error('Error sending quality claim resolved email:', err);
            });
          }
        }
        toast.success('Reclamo de calidad actualizado correctamente');
      }
    } catch (error) {
      console.error('Error updating quality claim:', error);
      toast.error('Error al actualizar el reclamo de calidad');
    }
  };

  const handleDeleteQualityClaim = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este reclamo? Esta acción no se puede deshacer.')) {
      try {
        await SupabaseService.deleteQualityClaim(id);
        setQualityClaims(prev => prev.filter(c => c.id !== id));
        toast.success('Reclamo de calidad eliminado correctamente');
      } catch (error) {
        console.error('Error deleting quality claim:', error);
        toast.error('Error al eliminar el reclamo de calidad');
      }
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
      user_management: t('menu.users_permissions'),
      master_data: 'Maestro de Datos',
      quality_claims: t('menu.quality_claims'),
      price_gmroi_simulator: t('menu.price_gmroi_simulator'),
      sizing_module: t('menu.sizing_module')
    };

    if (activeModule === 'user_management') {
      return <UserManagement />;
    }

    if (activeModule === 'master_data') {
      return <MasterDataModule />;
    }

    if (activeModule === 'innovation_proposals') {
      return <InnovationProposals />;
    }

    if (activeModule === 'quality_claims') {
      return (
        <QualityClaimsModule 
          qualityClaims={qualityClaims}
          products={data}
          onViewProductDetail={setDetailRecord}
          onOpenClaimsModal={(record) => {
            setSelectedQualityClaimsProduct(record);
            setIsQualityClaimsModalOpen(true);
          }}
          initialSearchTerm={claimSearchTerm}
        />
      );
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


    if (activeModule === 'sizing_module') {
      return <SizingModule onModuleChange={handleModuleChange} />;
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
          brands={brands}
          productLines={productLines}
          categories={categories}
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
      return <CalendarModule onNavigateToModule={handleNavigateFromCalendar} />;
    }
    if (activeModule === 'price_gmroi_simulator') {
      return <PriceGMROISimulator />;
    }
    if (activeModule === 'energy_efficiency') {
      return <EnergyEfficiency onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'product_management') {
      return <ProductsModule onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'rd_projects') {
      return <ProjectsModule onExportPPT={handleExportPPT} />;
    }

    const isFollowupModule = ['artwork_followup', 'technical_datasheet', 'commercial_datasheet'].includes(activeModule);

    if (showReport && isFollowupModule) {
      return <ReportsDashboard data={data} activeModule={activeModule} onBack={() => setShowReport(false)} />;
    }

    if (showGantt && activeModule === 'artwork_followup') {
      return <ArtworkGantt data={filteredData} onBack={() => setShowGantt(false)} />;
    }

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
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Reporte</span>
              </button>
              {activeModule === 'artwork_followup' && (
                <button 
                  onClick={() => setShowGantt(true)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="15" y2="12"/>
                    <line x1="3" y1="18" x2="18" y2="18"/>
                    <rect x="7" y="4" width="6" height="4" rx="1"/>
                    <rect x="5" y="10" width="8" height="4" rx="1"/>
                    <rect x="6" y="16" width="10" height="4" rx="1"/>
                  </svg>
                  <span className="hidden sm:inline">Gantt</span>
                </button>
              )}
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
          <div className="px-8 pb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-6">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Mostrando <span className="text-slate-900">{filteredData.length}</span> registros
            </p>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar en cualquier columna..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-450 hover:text-slate-600 hover:bg-slate-200/50 rounded-md transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
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
            onEditDates={handleEditDatesClick}
            onUpdateRecord={handleUpdateRecord}
            qualityClaims={qualityClaims}
            onQualityClaimsClick={(record) => {
              setSelectedQualityClaimsProduct(record);
              setIsQualityClaimsModalOpen(true);
            }}
            onEdit={(record) => {
              setEditingProduct(record);
              setIsNewRequestModalOpen(true);
            }}
            onDelete={async (record) => {
              const label = activeModule === 'artwork_followup' ? 'artes' : 
                          activeModule === 'technical_datasheet' ? 'fichas técnicas' : 'fichas comerciales';
              const confirmMsg = record.linkedGroupId 
                ? `¿Estás seguro de que deseas eliminar este registro? Al estar vinculado, se eliminará también de los otros módulos de seguimiento (${label}). Esta acción no se puede deshacer.`
                : '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.';

              if (window.confirm(confirmMsg)) {
                try {
                  if (record.linkedGroupId) {
                    await SupabaseService.deleteLinkedProducts(record.linkedGroupId);
                    setData(prev => prev.filter(r => r.linkedGroupId !== record.linkedGroupId));
                    toast.success('Registros vinculados eliminados correctamente');
                  } else {
                    await SupabaseService.deleteProduct(record.id);
                    setData(prev => prev.filter(r => r.id !== record.id));
                    toast.success('Registro eliminado correctamente');
                  }
                } catch (error) {
                  console.error('Error deleting record:', error);
                  toast.error('Error al eliminar el registro');
                }
              }
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
    setShowGantt(false);
    setClaimSearchTerm('');
    setGlobalSearch('');
  };

  const handleNavigateFromCalendar = (moduleId: ModuleId, itemId: string, sapCode?: string) => {
    setActiveModule(moduleId);
    setShowReport(false);
    setShowGantt(false);
    setGlobalSearch('');
    if (moduleId === 'quality_claims') {
      setClaimSearchTerm(sapCode || '');
    } else {
      const product = data.find(p => p.id === itemId);
      if (product) {
        setDetailRecord(product);
      }
    }
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
      {isRecovery ? (
        <motion.div
          key="reset-password"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen"
        >
          <ResetPasswordPage />
        </motion.div>
      ) : !user && !showLogin ? (
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
          <Toaster 
            position="top-right" 
            richColors 
            toastOptions={{
              className: 'font-sans font-semibold rounded-2xl shadow-xl backdrop-blur-md bg-white/90 border border-slate-200/60 p-4 text-slate-800 flex items-center gap-3',
              style: {
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                color: '#0f172a'
              },
              success: {
                className: 'bg-emerald-50/90 border-emerald-200/60 text-emerald-900',
                style: {
                  background: 'rgba(236, 253, 245, 0.9)',
                  border: '1px solid rgba(167, 243, 208, 0.8)',
                  color: '#065f46'
                }
              },
              error: {
                className: 'bg-red-50/90 border-red-200/60 text-red-900',
                style: {
                  background: 'rgba(254, 242, 242, 0.9)',
                  border: '1px solid rgba(254, 202, 202, 0.8)',
                  color: '#991b1b'
                }
              },
              warning: {
                className: 'bg-amber-50/90 border-amber-200/60 text-amber-900',
                style: {
                  background: 'rgba(255, 251, 235, 0.9)',
                  border: '1px solid rgba(253, 230, 138, 0.8)',
                  color: '#92400e'
                }
              },
              info: {
                className: 'bg-blue-50/90 border-blue-200/60 text-blue-900',
                style: {
                  background: 'rgba(239, 246, 255, 0.9)',
                  border: '1px solid rgba(191, 219, 254, 0.8)',
                  color: '#1e40af'
                }
              }
            }} 
          />

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
              isSolyVisible={isSolyVisible}
              onToggleSoly={handleToggleSoly}
            />
            
            <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="w-full">
                <ErrorBoundary>
                  {renderModuleContent()}
                </ErrorBoundary>
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
            isSubmitting={isSubmitting}
            existingProviders={uniqueProviders}
            existingData={data}
            brands={brands}
            productLines={productLines}
            categories={categories}
            mode={activeModule === 'artwork_followup' ? 'artwork' : 
                  activeModule === 'technical_datasheet' ? 'technical_sheet' : 'commercial_sheet'}
            initialData={editingProduct}
          />

          <DateEditModal
            isOpen={isDateEditModalOpen}
            onClose={() => setIsDateEditModalOpen(false)}
            record={dateEditConfig.record}
            mode={dateEditConfig.mode}
            onSave={handleSaveDateEdit}
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

          <QualityClaimModal
            isOpen={isQualityClaimsModalOpen}
            onClose={() => {
              setIsQualityClaimsModalOpen(false);
              setSelectedQualityClaimsProduct(null);
            }}
            record={selectedQualityClaimsProduct}
            qualityClaims={qualityClaims}
            onSaveClaim={handleSaveQualityClaim}
            onUpdateClaim={handleUpdateQualityClaim}
            onDeleteClaim={handleDeleteQualityClaim}
          />

          <SolyAssistant
            activeModule={activeModule}
            onNavigateModule={handleModuleChange}
            isVisible={isSolyVisible}
            onToggleVisible={(visible) => {
              setIsSolyVisible(visible);
              localStorage.setItem('is_soly_visible', JSON.stringify(visible));
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

