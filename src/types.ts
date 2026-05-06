export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required' | 'not_started' | 'approved_with_observation';

export interface Approval {
  status: ApprovalStatus;
  date?: string;
  user?: string;
  comments?: string;
}

export type ArtworkCategory = 'Manual' | 'Carton box' | 'Product Label' | 'Carton Label' | 'Logo Placement' | 'Serial Number' | 'Others';
export type ArtworkSubcategory = 'Printing' | 'Editable';

export interface FileInfo {
  name: string;
  url: string;
  type: string;
  originalName?: string;
}

export interface PDFComment {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  user: string;
  date: string;
  resolved?: boolean;
}

export interface DocumentVersion {
  version: number;
  files: FileInfo[];
  category?: ArtworkCategory; // Only for artworks
  subcategory?: ArtworkSubcategory; // Only for artworks
  uploadDate: string;
  uploadedBy: string;
  idApproval: Approval;
  mktApproval: Approval;
  provApproval: Approval;
  planApproval: Approval;
  aplicaA?: string;
  changeDescription?: string;
  proformaNumber?: string;
  solpedNumber?: string;
  estimatedShipmentDate?: string;
  pdfComments?: PDFComment[];
  commercialStatus?: 'A la venta' | 'No a la venta';
}

export interface BrandDocumentVersion {
  id: string;
  version: string;
  date: string;
  modifiedBy: string;
  changeDescription: string;
  url: string;
}

export interface Brand {
  id: string;
  name: string;
  image?: string;
  description?: string;
}

export interface ProductLine {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  productLineId: string;
}

export interface BrandDocument {
  id: string;
  brandId: string;
  parentId: string | null;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'folder';
  modified: string;
  modifiedBy: string;
  versions?: BrandDocumentVersion[];
}

export interface InfoRequest {
  id: string;
  requestText: string;
  requestDate: string;
  requestedBy: string;
  response?: {
    text?: string;
    files?: FileInfo[];
    date: string;
    user: string;
  };
}

export interface AssignmentInfo {
  designer?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  assignmentDate?: string;
  actualCompletionDate?: string;
  infoRequests?: InfoRequest[];
}

export interface ProductRecord {
  id: string;
  correlativeId?: string;
  codigoEAN: string;
  codigoSAP: string;
  descripcionSAP: string;
  codProv: string;
  proveedor: string;
  correoProveedor: string[];
  marca: string;
  brandId?: string;
  linea: 'LÍNEA BLANCA' | 'AGUA CALIENTE' | 'CLIMATIZACIÓN' | 'PURIFICACIÓN';
  lineId?: string;
  categoryId?: string;
  artworks: DocumentVersion[];
  technicalSheets?: DocumentVersion[];
  commercialSheets?: DocumentVersion[];
  commercialStatus?: 'A la venta' | 'No a la venta';
  qualityInspectionDate?: string;
  createdAt: string;
  sampleId?: string; // Linked sample from Samples module
  gallery?: {
    id: string;
    category: string;
    photos: FileInfo[];
    uploadDate: string;
  }[];
  // New assignment fields
  artworkAssignment?: AssignmentInfo;
  technicalAssignment?: AssignmentInfo;
  commercialAssignment?: AssignmentInfo;
  trackingType?: 'artwork' | 'technical' | 'commercial';
  linkedGroupId?: string;
}

export type SampleStatus = 'Aprobado' | 'Pasó a Comité' | 'Rechazado' | 'Observado' | 'Tolerado' | 'Inspeccionado sin informe';

export interface InspectionField {
  id: string;
  label: string;
  value: string;
  photos: FileInfo[];
}

export interface InspectionSection {
  id: string;
  title: string;
  fields: InspectionField[];
}

export interface WorkflowStage {
  id: string;
  stage: string;
  status: 'pending' | 'approved' | 'observed';
  comment?: string;
  files?: FileInfo[];
}

export interface InitialTechnicalDatasheet {
  version: number;
  lastModified: string;
  modifiedBy: string;
  data: Record<string, string>;
  isFinalized: boolean;
}

export interface InspectionTimer {
  lastStartTime?: string;
  accumulatedTimeMs: number;
  idleTimeMs: number;
  isPaused: boolean;
  firstStartTime?: string;
}

export interface InspectionTemplate {
  id: string;
  categoryId: string;
  name: string;
  formStructure: InspectionSection[];
  workflowStructure: WorkflowStage[];
  procedureFile?: FileInfo;
  createdAt?: string;
  updatedAt?: string;
}



export interface SampleRecord {
  id: string;
  correlativeId: string;
  createdAt: string;
  version: number;
  codigoSAP?: string;
  descripcionSAP: string;
  marca: string;
  proveedor: string;
  codProv?: string;
  linea: string;
  lineId?: string;
  categoria?: string;
  categoryId?: string;
  brandId?: string;
  tipoSuestra?: string;
  inspectionDate: string;
  inspectionStatus: SampleStatus;
  reportDate?: string;
  reportFile?: FileInfo;
  initialTechnicalDatasheet?: InitialTechnicalDatasheet;
  
  // New Inspection Workflow Fields
  technician?: string;
  plannedStartDate?: string;
  inspectionProgress: 'pending' | 'in_progress' | 'paused' | 'completed';
  inspectionCompletedDate?: string;
  inspectionTimer?: InspectionTimer;
  inspectionForm?: InspectionSection[];
  workflow?: WorkflowStage[];
  infoRequests?: InfoRequest[];
  providerDocuments?: FileInfo[];
  gallery?: {
    id: string;
    category: string;
    photos: FileInfo[];
    uploadDate: string;
  }[];

  // Reception Fields
  receptionPhoto?: FileInfo;
  receivedBy?: string;
  warehouseEntryDate?: string;
  calculationIds?: number[];

  history: {
    date: string;
    status: SampleStatus | 'Inspección Iniciada' | 'Inspección Pausada' | 'Inspección Reanudada' | 'Inspección Finalizada' | 'Borrador Guardado' | 'Nuevo Ciclo de Inspección';
    user: string;
    comment?: string;
  }[];
}

export type UserRole = 'Gerente de Marketing' | 'Jefe de Marketing 1' | 'Jefe de Marketing 2' | 'Coordinador de I+D' | 'Gerente de Innovación y Calidad' | 'Jefe de Planeamiento' | 'Diseñadora Gráfica' | 'Proveedor' | 'Técnico de I+D';

export interface CantonFairProduct {
  id: string;
  category: 'LÍNEA BLANCA' | 'AGUA CALIENTE' | 'CLIMATIZACIÓN' | 'REFRIGERACIÓN' | 'PURIFICACIÓN';
  name: string;
  fobPrice: string;
  targetBrand?: 'Sole' | 'S-Collection' | 'Rinnai' | 'Metusa' | 'Brikkel';
  comments: string;
  images: FileInfo[];
}

export interface CantonFairSettings {
  year: number;
  bannerImage?: FileInfo;
  attendees: string[];
}

export interface CantonFairSupplier {
  id: string;
  year: number;
  name: string;
  factoryLocation: string;
  contactName: string;
  website?: string;
  innovationRating: number; // 1-5
  priceRating: number; // 1-5
  manufacturingRating: number; // 1-5
  catalogues: FileInfo[];
  agreements: FileInfo[];
  quotations: FileInfo[];
  featuredProducts: CantonFairProduct[];
  fobPrices: string;
  comments: string;
  images: {
    file: FileInfo;
    comment: string;
  }[];
  logo?: FileInfo;
  phone?: string;
  email?: string;
  wechatQr?: FileInfo;
  factoryVisited?: boolean;
  visitDate?: string;
  visitTime?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export type ModuleId = 'rd_inventory' | 'ntp_regulations' | 'work_plan' | 'samples' | 'technical_datasheet' | 'commercial_datasheet' | 'artwork_followup' | 'commercial_artworks' | 'approved_technical_sheets' | 'approved_commercial_sheets' | 'applications' | 'supplier_master' | 'water_demand' | 'gas_heater_experimental' | 'records' | 'absorption_calculation' | 'temperature_loss' | 'brandbook' | 'energy_efficiency' | 'product_management' | 'calendar' | 'rd_projects' | 'calculations_dashboard' | 'innovation_proposals' | 'cr_ni_coating_analysis' | 'canton_fair' | 'oven_experimental' | 'user_management' | 'master_data';

export interface OvenInspectionPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  timeUnit: 'min' | 'sec';
  series: {
    id: string;
    trialNumber: number;
    readings: { time: number; temperature: number }[];
  }[];
}

export interface OvenExperimentalRecord {
  ovenModel: string;
  ovenImage?: string;
  points: OvenInspectionPoint[];
  date: string;
}

export interface InnovationProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  author: string;
  date: string;
  status: 'Borrador' | 'En Evaluación' | 'Aprobado' | 'Implementado' | 'Rechazado';
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  images: FileInfo[];
  sketches: FileInfo[];
  blueprints: FileInfo[];
  tags: string[];
  comments: {
    id: string;
    user: string;
    text: string;
    date: string;
  }[];
}

export interface ChangeLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  startDate?: string;
  endDate?: string;
  type: 'work' | 'holiday' | 'special_event' | 'vacation' | 'field_visit' | 'business_trip' | 'other_activity';
  requester?: string;
  assignee?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deliveryStatus?: 'on_time' | 'delayed' | 'postponed' | 'pending';
  createdAt: string;
  changeLog: ChangeLog[];
}

export interface ProductManagementRecord {
  id: string;
  correlativeId?: string;
  codigoSAP: string;
  codigoEAN?: string;
  eanCode?: string;
  descripcionSAP: string;
  marca: string;
  brandId?: string;
  proveedor: string;
  supplierId?: string;
  linea: string;
  lineId?: string;
  sampleId?: string; // Linked sample
  approvedDocuments: {
    id: string;
    category: string;
    documents: {
      id: string;
      name: string;
      type: string;
      url: string;
      approvalDate: string;
    }[];
  }[];
  gallery: {
    id: string;
    category: string;
    photos: FileInfo[];
    uploadDate: string;
  }[];
  fobPrice?: number;
  fobPriceHistory?: {
    price: number;
    reason: string;
    date: string;
    user: string;
  }[];
  explodeFiles?: FileInfo[];
  additionalProviderDocuments?: FileInfo[];
  artworkAssignment?: string;
  technicalAssignment?: string;
  commercialAssignment?: string;
  createdAt: string;
}

export interface EnergyEfficiencyDocument extends FileInfo {
  version: number;
  uploadDate: string;
  uploadedBy: string;
  changeDescription?: string;
}

export interface EnergyEfficiencyRecord {
  id: string;
  codigoMT: string;
  descripcion: string;
  letra: string;
  porcentajeEE: string;
  ocp: string;
  proveedor: string;
  fechaEmision: string;
  fechaVigilancia: string;
  tipoProducto: string;
  sampleId?: string;
  certificadoFile?: FileInfo;
  certificadoHistory?: EnergyEfficiencyDocument[];
  etiquetaFile?: FileInfo;
  etiquetaHistory?: EnergyEfficiencyDocument[];
  testReportFile?: FileInfo;
  testReportHistory?: EnergyEfficiencyDocument[];
  gallery?: {
    id: string;
    category: string;
    photos: FileInfo[];
    uploadDate: string;
  }[];
  createdAt: string;
}

export interface CalculationRecord {
  id: number;
  module_id: ModuleId;
  action_type: string;
  record_data: string;
  user_email: string;
  project_name?: string;
  sample_id?: string;
  description?: string;
  timestamp: string;
}

export interface SupplierEvaluation {
  innovation?: number;
  responseTime?: number;
  quality?: number;
  failureIndex?: number;
  price?: number;
  lastUpdated?: string;
}

export interface Supplier {
  id: string;
  legalName: string;
  commercialAlias: string;
  erpCode: string;
  country: string;
  logoUrl?: string;
  contacts?: string;
  website?: string;
  wechat?: string;
  email?: string;
  evaluation?: SupplierEvaluation;
  quotations?: FileInfo[];
}

export interface AuditLog {
  id: string;
  date: string;
  user: string;
  userEmail?: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'PROJECT' | 'ACTIVITY';
  entityId: string;
  entityName: string;
  previousData?: any;
  newData?: any;
}

export interface ProjectActivity {
  id: string;
  number: string;
  name: string;
  comments?: string;
  indicator?: string;
  progress: number;
  responsible: string[];
  classification: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'COMPLETADO' | 'EN PROCESO' | 'NO INICIADO' | 'CANCELADO';
  dailyProgress?: Record<string, { progress: number, comments: string }>;
}

export interface Project {
  id: string;
  number: string;
  name: string;
  responsible: string;
  progress: number;
  status: 'COMPLETADO' | 'EN PROCESO' | 'NO INICIADO' | 'CANCELADO';
  activities: ProjectActivity[];
}

export interface NTPRegulation {
  id: string;
  code: string;
  title: string;
  category: string;
  uploadDate: string;
  file: FileInfo;
  description?: string;
}

export interface User {
  name: string;
  email: string;
  role: UserRole;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  level: number;
  permissions?: Permission[];
}

export interface ApproverConfig {
  id: string;
  mkt: string;
  plan: string;
  prov: string;
  reason?: string;
}

export interface CalibrationCertificate extends FileInfo {
  uploadDate: string;
  calibrationDate: string;
  expiryDate: string;
  version: number;
}

export interface RDProjectField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'file' | 'boolean' | 'textarea';
  value: any;
  options?: string[];
  required?: boolean;
}

export interface RDProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  backgroundImage?: string;
  isCustom?: boolean;
  sections: {
    id: string;
    title: string;
    fields: Omit<RDProjectField, 'value'>[];
  }[];
}

export interface RDProject {
  id: string;
  templateId: string;
  name: string;
  description: string;
  status: 'Borrador' | 'En Proceso' | 'Revisión' | 'Completado' | 'Cancelado';
  priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  responsible: string;
  startDate: string;
  endDate?: string;
  sections: {
    id: string;
    title: string;
    fields: RDProjectField[];
  }[];
  attachments: FileInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface RDInventoryItem {
  id: string;
  serialNumber: string;
  description: string;
  responsible: string;
  acquisitionDate?: string;
  startupDate?: string;
  calibrationStatus: 'Programado' | 'Operativo' | 'Vencido' | 'En Calibración';
  category: string;
  equipmentType: string;
  sourceType: string;
  brand: string;
  model: string;
  equipmentRange: string;
  supplierOrEquipment?: string;
  calibrationRegistry?: string;
  revisionRegistry?: string;
  certificate?: string; // URL or filename of the latest
  certificateHistory?: CalibrationCertificate[];
  revisionStatus?: string;
  assignmentRegistry?: string;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  photos?: FileInfo[];
  manual?: FileInfo;
}
