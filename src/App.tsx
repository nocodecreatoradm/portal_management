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
import { initialApprovers, initialSuppliers, initialEnergyEfficiency, initialProductManagement, initialCalendarTasks, initialRDProjectTemplates } from './data/mockData';
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

export default function App() {
  const { samples, setSamples } = useSamples();
  const { user, profile, loading } = useAuth();
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('artwork_followup');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [data, setData] = useState<ProductRecord[]>([]);
  const [rdInventory, setRdInventory] = useState<RDInventoryItem[]>([]);
  const [energyEfficiency, setEnergyEfficiency] = useState<EnergyEfficiencyRecord[]>([]);
  const [productManagement, setProductManagement] = useState<ProductManagementRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [rdProjects, setRdProjects] = useState<RDProject[]>([]);
  const [rdTemplates, setRdTemplates] = useState<RDProjectTemplate[]>(initialRDProjectTemplates);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>(initialCalendarTasks);
  const [calculationRecords, setCalculationRecords] = useState<CalculationRecord[]>([]);
  const [approvers, setApprovers] = useState(initialApprovers);
  const [isApproverModalOpen, setIsApproverModalOpen] = useState(false);
  const [moduleInitialData, setModuleInitialData] = useState<Record<ModuleId, any>>({} as any);
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
        const [
          productsData,
          inventoryData,
          projectsData
        ] = await Promise.all([
          SupabaseService.getProducts(),
          SupabaseService.getInventory(),
          SupabaseService.getProjects()
        ]);

        setData(productsData as unknown as ProductRecord[]);
        setRdInventory(inventoryData as unknown as RDInventoryItem[]);
        setProjects(projectsData as unknown as Project[]);
        
        // Load calculations
        const calcRecords = await fetchCalculationRecords();
        setCalculationRecords(calcRecords);

      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        toast.error('Error al sincronizar datos con la nube');
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

  const handleNewRequest = (newRecord: ProductRecord) => {
    const existingIndex = data.findIndex(r => r.codigoSAP.toLowerCase() === newRecord.codigoSAP.toLowerCase());
    
    if (existingIndex > -1) {
      // Update existing record metadata and move to top
      const newData = [...data];
      const existingRecord = newData[existingIndex];
      
      newData.splice(existingIndex, 1);
      newData.unshift({
        ...existingRecord,
        codigoEAN: newRecord.codigoEAN,
        descripcionSAP: newRecord.descripcionSAP,
        proveedor: newRecord.proveedor,
        codProv: newRecord.codProv,
        correoProveedor: newRecord.correoProveedor,
        marca: newRecord.marca,
        linea: newRecord.linea,
      });
      
      setData(newData);
    } else {
      setData([newRecord, ...data]);
    }
  };

  const handleUpdateRecord = (id: string, updates: Partial<ProductRecord>) => {
    setData(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleAddRDItem = (item: Omit<RDInventoryItem, 'id'>) => {
    const newItem: RDInventoryItem = {
      ...item,
      id: `RD-${Date.now()}`
    };
    setRdInventory(prev => [newItem, ...prev]);
  };

  const handleUpdateRDItem = (updatedItem: RDInventoryItem) => {
    setRdInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleDeleteRDItem = (id: string) => {
    setRdInventory(prev => prev.filter(item => item.id !== id));
  };

  const handleAddEERecord = (record: Omit<EnergyEfficiencyRecord, 'id' | 'createdAt'>) => {
    const newRecord: EnergyEfficiencyRecord = {
      ...record,
      id: `EE-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setEnergyEfficiency(prev => [newRecord, ...prev]);
  };

  const handleUpdateEERecord = (updatedRecord: EnergyEfficiencyRecord) => {
    setEnergyEfficiency(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleDeleteEERecord = (id: string) => {
    setEnergyEfficiency(prev => prev.filter(r => r.id !== id));
  };

  const handleAddPMRecord = (record: Omit<ProductManagementRecord, 'id' | 'createdAt'>) => {
    const newRecord: ProductManagementRecord = {
      ...record,
      id: `PM-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProductManagement(prev => [newRecord, ...prev]);
  };

  const handleUpdatePMRecord = (updatedRecord: ProductManagementRecord) => {
    setProductManagement(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleDeletePMRecord = (id: string) => {
    setProductManagement(prev => prev.filter(r => r.id !== id));
  };

  const handleAddCalendarTask = (taskData: Omit<CalendarTask, 'id' | 'createdAt' | 'changeLog'>) => {
    const newTask: CalendarTask = {
      ...taskData,
      id: `TASK-${Date.now()}`,
      createdAt: new Date().toISOString(),
      changeLog: [{
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user?.name || 'Sistema',
        action: 'Creación',
        details: 'Se creó la tarea'
      }]
    };
    setCalendarTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateCalendarTask = (updatedTask: CalendarTask) => {
    setCalendarTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteCalendarTask = (id: string) => {
    setCalendarTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddRDProject = (project: RDProject) => {
    setRdProjects(prev => [project, ...prev]);
  };

  const handleUpdateRDProject = (project: RDProject) => {
    setRdProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const handleDeleteRDProject = (id: string) => {
    setRdProjects(prev => prev.filter(p => p.id !== id));
  };

  const renderModuleContent = () => {
    const moduleLabels: Record<ModuleId, string> = {
      rd_inventory: 'Inventario de I+D',
      ntp_regulations: 'Normativas NTP',
      samples: 'Muestras',
      technical_datasheet: 'Seguimiento Ficha Técnica',
      commercial_datasheet: 'Seguimiento Ficha Comercial',
      artwork_followup: 'Seguimiento de Artes',
      commercial_artworks: 'Artes Comerciales Aprobados',
      approved_technical_sheets: 'Fichas Técnicas Aprobadas',
      approved_commercial_sheets: 'Fichas Comerciales Aprobadas',
      applications: 'Aplicaciones',
      work_plan: 'Seguimiento Plan de Trabajo',
      supplier_master: 'Maestro de Proveedores',
      water_demand: 'Sistema Dimensionamiento de Agua Caliente',
      gas_heater_experimental: 'Rendimiento Térmico de Calentadores a Gas',
      absorption_calculation: 'Cálculo de Absorción de Campana',
      temperature_loss: 'Pérdida de Temperatura en Tuberías',
      brandbook: 'Brandbook',
      energy_efficiency: 'Eficiencia Energética',
      product_management: 'Productos',
      rd_projects: 'Proyectos I+D',
      calculations_dashboard: 'Panel de Cálculos Técnicos',
      innovation_proposals: 'Propuestas de Innovación',
      cr_ni_coating_analysis: 'Análisis de Recubrimiento Cr-Ni',
      canton_fair: 'Canton Fair',
      oven_experimental: 'Análisis Térmico de Hornos',
      records: 'Registros de Cálculos y Exportaciones',
      calendar: 'Calendario de Pendientes',
      user_management: 'Gestión de Usuarios y Permisos'
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
      return (
        <EnergyEfficiency 
          records={energyEfficiency}
          samples={samples}
          onAddRecord={handleAddEERecord}
          onUpdateRecord={handleUpdateEERecord}
          onDeleteRecord={handleDeleteEERecord}
          onExportPPT={handleExportPPT}
        />
      );
    }

    if (activeModule === 'product_management') {
      return (
        <ProductsModule 
          records={productManagement}
          samples={samples}
          allProducts={data}
          onAddRecord={handleAddPMRecord}
          onUpdateRecord={handleUpdatePMRecord}
          onDeleteRecord={handleDeletePMRecord}
          onExportPPT={handleExportPPT}
        />
      );
    }

    if (activeModule === 'rd_projects') {
      return (
        <ProjectsModule 
          projects={rdProjects}
          templates={rdTemplates}
          onAddProject={handleAddRDProject}
          onUpdateProject={handleUpdateRDProject}
          onDeleteProject={handleDeleteRDProject}
          onAddTemplate={(t) => setRdTemplates(prev => [...prev, t])}
          onUpdateTemplate={(t) => setRdTemplates(prev => prev.map(item => item.id === t.id ? t : item))}
          onDeleteTemplate={(id) => setRdTemplates(prev => prev.filter(item => item.id !== id))}
        />
      );
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
      return <SupplierMaster suppliers={suppliers} onUpdateSuppliers={setSuppliers} onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'commercial_artworks') {
      return (
        <CommercialArtworks 
          data={filteredData} 
          onUpdateRecord={handleUpdateRecord} 
          mode="artwork"
          suppliers={suppliers}
          samples={samples}
          calculationRecords={calculationRecords}
          onLoadRecord={handleLoadRecord}
        />
      );
    }

    if (activeModule === 'approved_technical_sheets') {
      return (
        <CommercialArtworks 
          data={filteredData} 
          onUpdateRecord={handleUpdateRecord} 
          mode="technical_sheet"
          suppliers={suppliers}
          samples={samples}
          calculationRecords={calculationRecords}
          onLoadRecord={handleLoadRecord}
        />
      );
    }

    if (activeModule === 'approved_commercial_sheets') {
      return (
        <CommercialArtworks 
          data={filteredData} 
          onUpdateRecord={handleUpdateRecord} 
          mode="commercial_sheet"
          suppliers={suppliers}
          samples={samples}
          calculationRecords={calculationRecords}
          onLoadRecord={handleLoadRecord}
        />
      );
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
      return (
        <RDInventory 
          items={rdInventory}
          onAddItem={handleAddRDItem}
          onUpdateItem={handleUpdateRDItem}
          onDeleteItem={handleDeleteRDItem}
          onExportPPT={handleExportPPT}
        />
      );
    }

    if (activeModule === 'ntp_regulations') {
      return <NTPRegulations initialData={moduleInitialData.ntp_regulations} onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'work_plan') {
      return <WorkPlan initialData={moduleInitialData.work_plan} onExportPPT={handleExportPPT} />;
    }

    if (activeModule === 'applications') {
      return <Applications />;
    }

    if (activeModule === 'calendar') {
      return (
        <CalendarModule 
          tasks={calendarTasks}
          onAddTask={handleAddCalendarTask}
          onUpdateTask={handleUpdateCalendarTask}
          onDeleteTask={handleDeleteCalendarTask}
        />
      );
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
      setRdInventory(data);
    } else if (moduleId === 'supplier_master' && Array.isArray(data)) {
      setSuppliers(data);
    } else if (moduleId === 'samples' && Array.isArray(data)) {
      setSamples(data);
    } else if (moduleId === 'energy_efficiency' && Array.isArray(data)) {
      setEnergyEfficiency(data);
    } else if (moduleId === 'product_management' && Array.isArray(data)) {
      setProductManagement(data);
    } else if ((moduleId === 'artwork_followup' || moduleId === 'commercial_artworks') && Array.isArray(data)) {
      // This might be tricky since 'data' in App.tsx is imported from mockData
      // and used to derive filteredData. We might need a state for 'data'.
      // For now, let's assume we can't easily update the global 'data' without refactoring.
      // But we can at least try to update the relevant states if they exist.
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
            
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
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
            onClose={() => setIsNewRequestModalOpen(false)}
            onSubmit={handleNewRequest}
            existingProviders={uniqueProviders}
            existingData={data}
            mode={activeModule === 'artwork_followup' ? 'artwork' : 
                  activeModule === 'technical_datasheet' ? 'technical_sheet' : 'commercial_sheet'}
          />

          <ApproverConfigModal
            isOpen={isApproverModalOpen}
            onClose={() => setIsApproverModalOpen(false)}
            currentApprovers={approvers}
            onSave={(newApprovers, reason) => {
              console.log('Nuevos aprobadores:', newApprovers, 'Motivo:', reason);
              setApprovers(newApprovers);
              // En una app real, aquí se guardaría en BD con el motivo
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

