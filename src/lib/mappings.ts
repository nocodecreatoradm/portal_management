import { 
  RDInventoryItem, 
  EnergyEfficiencyRecord, 
  ProductManagementRecord, 
  Project, 
  ProjectActivity, 
  CalendarTask, 
  InnovationProposal, 
  Supplier, 
  RDProjectTemplate, 
  RDProject, 
  ProductRecord, 
  AuditLog, 
  NTPRegulation, 
  Brand, 
  BrandDocument, 
  SampleRecord,
  ProductLine,
  Category,
  InspectionTemplate,
  QualityClaim
} from '../types';

const formatDateOnly = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    return val.split('T')[0];
  }
  return String(val);
};

export const mapInventoryToDB = (item: Partial<RDInventoryItem>) => {
  const dbItem: any = {};
  if (item.serialNumber      !== undefined) dbItem.serial_number        = item.serialNumber;
  if (item.description       !== undefined) dbItem.description          = item.description;
  if (item.responsible       !== undefined) dbItem.responsible_id       = item.responsible;
  if (item.acquisitionDate   !== undefined) dbItem.acquisition_date     = item.acquisitionDate || null;
  if (item.startupDate       !== undefined) dbItem.startup_date         = item.startupDate || null;
  if (item.calibrationStatus !== undefined) dbItem.calibration_status   = item.calibrationStatus;
  if (item.category          !== undefined) dbItem.category             = item.category;
  if (item.equipmentType     !== undefined) dbItem.equipment_type       = item.equipmentType;
  if (item.sourceType        !== undefined) dbItem.source_type          = item.sourceType;
  if (item.brand             !== undefined) dbItem.brand                = item.brand;
  if (item.model             !== undefined) dbItem.model                = item.model;
  if (item.equipmentRange    !== undefined) dbItem.equipment_range      = item.equipmentRange;
  if (item.lastCalibrationDate  !== undefined) dbItem.last_calibration_date = item.lastCalibrationDate || null;
  if (item.nextCalibrationDate  !== undefined) dbItem.next_calibration_date = item.nextCalibrationDate || null;
  if (item.manual            !== undefined) dbItem.manual_file          = item.manual;
  if (item.photos            !== undefined) dbItem.photos               = item.photos;
  if (item.certificate       !== undefined) dbItem.certificate          = item.certificate;
  if (item.certificateHistory !== undefined) dbItem.certificates        = item.certificateHistory;
  return dbItem;
};

export const mapDBToInventory = (dbItem: any): RDInventoryItem => ({
  id: dbItem.id,
  serialNumber: dbItem.serial_number,
  description: dbItem.description,
  responsible: dbItem.responsible_id,
  acquisitionDate: formatDateOnly(dbItem.acquisition_date),
  startupDate: formatDateOnly(dbItem.startup_date),
  calibrationStatus: dbItem.calibration_status,
  category: dbItem.category,
  equipmentType: dbItem.equipment_type,
  sourceType: dbItem.source_type,
  brand: dbItem.brand,
  model: dbItem.model,
  equipmentRange: dbItem.equipment_range,
  lastCalibrationDate: formatDateOnly(dbItem.last_calibration_date),
  nextCalibrationDate: formatDateOnly(dbItem.next_calibration_date),
  manual: dbItem.manual_file,
  photos: dbItem.photos,
  certificateHistory: dbItem.certificates,
  certificate: dbItem.certificate
});

export const mapEEToDB = (record: Partial<EnergyEfficiencyRecord>) => {
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const dbRecord: any = {
    mt_code: record.codigoMT,
    description: record.descripcion,
    letter: record.letra,
    ee_percentage: record.porcentajeEE,
    ocp: record.ocp,
    supplier_id: record.proveedor && isUUID(record.proveedor) ? record.proveedor : null,
    emission_date: record.fechaEmision || null,
    vigilance_date: record.fechaVigilancia || null,
    product_type: record.tipoProducto,
    sample_id: record.sampleId && isUUID(record.sampleId) ? record.sampleId : null,
    certificate_file: record.certificadoFile,
    certificate_history: record.certificadoHistory,
    label_file: record.etiquetaFile,
    label_history: record.etiquetaHistory,
    test_report_file: record.testReportFile,
    test_report_history: record.testReportHistory,
    gallery: record.gallery
  };

  if (record.lineId && isUUID(record.lineId)) {
    dbRecord.line_id = record.lineId;
  } else if (record.linea && isUUID(record.linea)) {
    dbRecord.line_id = record.linea;
  } else {
    dbRecord.line_id = null;
  }

  if (record.categoryId && isUUID(record.categoryId)) {
    dbRecord.category_id = record.categoryId;
  } else if (record.categoria && isUUID(record.categoria)) {
    dbRecord.category_id = record.categoria;
  } else {
    dbRecord.category_id = null;
  }

  return dbRecord;
};

export const mapDBToEE = (dbRecord: any): EnergyEfficiencyRecord => ({
  id: dbRecord.id,
  codigoMT: dbRecord.mt_code || '',
  descripcion: dbRecord.description || '',
  letra: dbRecord.letter || '',
  porcentajeEE: dbRecord.ee_percentage || '',
  ocp: dbRecord.ocp || '',
  proveedor: dbRecord.supplier?.legal_name || dbRecord.supplier_id || '',
  fechaEmision: formatDateOnly(dbRecord.emission_date),
  fechaVigilancia: formatDateOnly(dbRecord.vigilance_date),
  tipoProducto: dbRecord.product_type || '',
  sampleId: dbRecord.sample_id || '',
  certificadoFile: dbRecord.certificate_file,
  certificadoHistory: dbRecord.certificate_history || [],
  etiquetaFile: dbRecord.label_file,
  etiquetaHistory: dbRecord.label_history || [],
  testReportFile: dbRecord.test_report_file,
  testReportHistory: dbRecord.test_report_history || [],
  gallery: dbRecord.gallery || [],
  createdAt: dbRecord.created_at,
  linea: dbRecord.line?.name || dbRecord.line_id || '',
  lineId: dbRecord.line_id || '',
  categoria: dbRecord.category?.name || dbRecord.category_id || '',
  categoryId: dbRecord.category_id || ''
});

export const mapProjectToDB = (project: Partial<Project>) => {
  return {
    project_number: project.number,
    name: project.name,
    responsible_id: project.responsible || null,
    progress: project.progress,
    status: project.status
  };
};

export const mapDBToProject = (dbProject: any): Project => ({
  id: dbProject.id,
  number: dbProject.project_number || '',
  name: dbProject.name || '',
  responsible: dbProject.responsible_id || '',
  progress: dbProject.progress || 0,
  status: dbProject.status || 'NO INICIADO',
  activities: dbProject.activities ? dbProject.activities.map(mapDBToActivity) : []
});

export const mapActivityToDB = (activity: Partial<ProjectActivity>) => ({
  activity_number: activity.number,
  name: activity.name,
  comments: activity.comments,
  indicator: activity.indicator,
  progress: activity.progress,
  classification: activity.classification,
  planned_start_date: activity.plannedStartDate,
  planned_end_date: activity.plannedEndDate,
  actual_start_date: activity.actualStartDate,
  actual_end_date: activity.actualEndDate,
  status: activity.status,
  daily_progress: activity.dailyProgress,
  responsibles: activity.responsible
});

export const mapDBToActivity = (dbActivity: any): ProjectActivity => ({
  id: dbActivity.id,
  number: dbActivity.activity_number || '',
  name: dbActivity.name || '',
  comments: dbActivity.comments || '',
  indicator: dbActivity.indicator || '',
  progress: dbActivity.progress || 0,
  classification: dbActivity.classification || '',
  plannedStartDate: dbActivity.planned_start_date || '',
  plannedEndDate: dbActivity.planned_end_date || '',
  actualStartDate: dbActivity.actual_start_date,
  actualEndDate: dbActivity.actual_end_date,
  status: dbActivity.status || 'NO INICIADO',
  dailyProgress: dbActivity.daily_progress || {},
  responsible: dbActivity.responsibles || []
});

export const mapTaskToDB = (task: Partial<CalendarTask>) => {
  const dbTask: any = {};
  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.deadline !== undefined) dbTask.deadline = task.deadline;
  if (task.startDate !== undefined) dbTask.start_date = task.startDate;
  if (task.endDate !== undefined) dbTask.end_date = task.endDate;
  if (task.type !== undefined) dbTask.task_type = task.type;
  if (task.requester !== undefined) dbTask.requester_id = task.requester;
  if (task.assignee !== undefined) dbTask.assignee_id = task.assignee;
  if (task.status !== undefined) dbTask.status = task.status;
  if (task.deliveryStatus !== undefined) dbTask.delivery_status = task.deliveryStatus;
  if (task.changeLog !== undefined) dbTask.change_log = task.changeLog;
  return dbTask;
};

export const mapDBToTask = (dbTask: any): CalendarTask => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description,
  deadline: dbTask.deadline,
  startDate: dbTask.start_date,
  endDate: dbTask.end_date,
  type: dbTask.task_type,
  requester: dbTask.requester_id,
  assignee: dbTask.assignee_id,
  status: dbTask.status,
  deliveryStatus: dbTask.delivery_status,
  changeLog: dbTask.change_log || [],
  createdAt: dbTask.created_at || new Date().toISOString()
});

export const mapProposalToDB = (proposal: Partial<InnovationProposal>) => {
  const dbProposal: any = {};
  if (proposal.title !== undefined) dbProposal.title = proposal.title;
  if (proposal.description !== undefined) dbProposal.description = proposal.description;
  if (proposal.category !== undefined) dbProposal.category = proposal.category;
  if (proposal.author !== undefined) dbProposal.author = proposal.author;
  if (proposal.status !== undefined) dbProposal.status = proposal.status;
  if (proposal.priority !== undefined) dbProposal.priority = proposal.priority;
  if (proposal.images !== undefined) dbProposal.images = proposal.images;
  if (proposal.sketches !== undefined) dbProposal.sketches = proposal.sketches;
  if (proposal.blueprints !== undefined) dbProposal.blueprints = proposal.blueprints;
  if (proposal.tags !== undefined) dbProposal.tags = proposal.tags;
  if (proposal.comments !== undefined) dbProposal.comments = proposal.comments;
  if (proposal.updates !== undefined) dbProposal.updates = proposal.updates;
  return dbProposal;
};

export const mapDBToProposal = (dbProposal: any): InnovationProposal => ({
  id: dbProposal.id,
  title: dbProposal.title,
  description: dbProposal.description,
  category: dbProposal.category,
  author: dbProposal.author,
  date: dbProposal.created_at || dbProposal.date,
  status: dbProposal.status,
  priority: dbProposal.priority,
  images: dbProposal.images || [],
  sketches: dbProposal.sketches || [],
  blueprints: dbProposal.blueprints || [],
  tags: dbProposal.tags || [],
  comments: dbProposal.comments ? dbProposal.comments.map((c: any) => ({
    ...c,
    user: c.user || c.user_id
  })) : [],
  updates: dbProposal.updates ? dbProposal.updates.map((u: any) => ({
    ...u,
    user: u.user || u.user_id
  })) : []
});

export const mapNTPToDB = (reg: Partial<NTPRegulation>) => ({
  code: reg.code,
  title: reg.title,
  category: reg.category,
  upload_date: reg.uploadDate,
  file: reg.file,
  description: reg.description
});

export const mapDBToNTP = (dbReg: any): NTPRegulation => ({
  id: dbReg.id,
  code: dbReg.code,
  title: dbReg.title,
  category: dbReg.category,
  uploadDate: dbReg.upload_date,
  file: dbReg.file,
  description: dbReg.description
});

export const mapLogToDB = (log: Partial<AuditLog>) => ({
  user_email: log.userEmail || '',
  user_name: log.user,
  action: log.action,
  entity_type: log.entityType,
  entity_id: log.entityId,
  entity_name: log.entityName,
  previous_data: log.previousData,
  new_data: log.newData
});

export const mapDBToLog = (dbLog: any): AuditLog => ({
  id: dbLog.id,
  date: dbLog.created_at,
  user: dbLog.user_name,
  userEmail: dbLog.user_email,
  action: dbLog.action,
  entityType: dbLog.entity_type,
  entityId: dbLog.entity_id,
  entityName: dbLog.entity_name,
  previousData: dbLog.previous_data,
  newData: dbLog.new_data
});
export const mapProductToDB = (product: Partial<ProductRecord & ProductManagementRecord>) => {
  const dbProduct: any = {};
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (product.correlativeId !== undefined) dbProduct.correlative_id = product.correlativeId;
  if (product.codigoSAP !== undefined) dbProduct.sap_code = product.codigoSAP;
  if (product.codigoEAN !== undefined) dbProduct.ean_code = product.codigoEAN;
  if (product.eanCode !== undefined) dbProduct.ean_code = product.eanCode;
  if (product.descripcionSAP !== undefined) dbProduct.sap_description = product.descripcionSAP;
  if (product.marca !== undefined) dbProduct.brand_id = product.brandId || (isUUID(product.marca) ? product.marca : null);
  if (product.proveedor !== undefined) dbProduct.supplier_id = product.supplierId || (isUUID(product.proveedor) ? product.proveedor : null);
  if (product.linea !== undefined) dbProduct.line_id = product.lineId || (isUUID(product.linea) ? product.linea : null);
  if (product.sampleId !== undefined) dbProduct.sample_id = isUUID(product.sampleId) ? product.sampleId : null;
  if (product.commercialStatus !== undefined) dbProduct.commercial_status = product.commercialStatus;
  if (product.qualityInspectionDate !== undefined) dbProduct.quality_inspection_date = product.qualityInspectionDate;
  if (product.fobPrice !== undefined) dbProduct.fob_price = product.fobPrice;
  if (product.fobPriceHistory !== undefined) dbProduct.fob_price_history = product.fobPriceHistory;
  if (product.explodeFiles !== undefined) dbProduct.explode_files = product.explodeFiles;
  if (product.additionalProviderDocuments !== undefined) dbProduct.additional_provider_documents = product.additionalProviderDocuments;
  if (product.gallery !== undefined) dbProduct.gallery = product.gallery;
  if (product.artworkAssignment !== undefined) dbProduct.artwork_assignment = product.artworkAssignment;
  if (product.technicalAssignment !== undefined) dbProduct.technical_assignment = product.technicalAssignment;
  if (product.commercialAssignment !== undefined) dbProduct.commercial_assignment = product.commercialAssignment;
  if (product.approvedDocuments !== undefined) dbProduct.approved_documents = product.approvedDocuments;
  if (product.trackingType !== undefined) dbProduct.tracking_type = product.trackingType;
  if (product.linkedGroupId !== undefined) dbProduct.linked_group_id = product.linkedGroupId;
  if (product.categoryId !== undefined) dbProduct.category_id = isUUID(product.categoryId) ? product.categoryId : null;
  else if (product.categoria !== undefined && isUUID(product.categoria)) dbProduct.category_id = product.categoria;
  return dbProduct;
};

export const mapPMRecordToDB = (record: Partial<ProductManagementRecord>) => {
  const dbRecord: any = {};
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (record.correlativeId !== undefined) dbRecord.correlative_id = record.correlativeId;
  if (record.codigoSAP !== undefined) dbRecord.sap_code = record.codigoSAP;
  if (record.codigoEAN !== undefined) dbRecord.ean_code = record.codigoEAN;
  if (record.eanCode !== undefined) dbRecord.ean_code = record.eanCode;
  if (record.descripcionSAP !== undefined) dbRecord.sap_description = record.descripcionSAP;
  if (record.brandId !== undefined || record.marca !== undefined) dbRecord.brand_id = record.brandId || (record.marca && isUUID(record.marca) ? record.marca : null);
  if (record.supplierId !== undefined || record.proveedor !== undefined) dbRecord.supplier_id = record.supplierId || (record.proveedor && isUUID(record.proveedor) ? record.proveedor : null);
  if (record.lineId !== undefined || record.linea !== undefined) dbRecord.line_id = record.lineId || (record.linea && isUUID(record.linea) ? record.linea : null);
  if (record.sampleId !== undefined) dbRecord.sample_id = isUUID(record.sampleId) ? record.sampleId : null;
  if (record.fobPrice !== undefined) dbRecord.fob_price = record.fobPrice;
  if (record.fobPriceHistory !== undefined) dbRecord.fob_price_history = record.fobPriceHistory;
  if (record.explodeFiles !== undefined) dbRecord.explode_files = record.explodeFiles;
  if (record.additionalProviderDocuments !== undefined) dbRecord.additional_provider_documents = record.additionalProviderDocuments;
  if (record.gallery !== undefined) dbRecord.gallery = record.gallery;
  if (record.approvedDocuments !== undefined) dbRecord.approved_documents = record.approvedDocuments;
  if (record.artworkAssignment !== undefined) dbRecord.artwork_assignment = record.artworkAssignment;
  if (record.technicalAssignment !== undefined) dbRecord.technical_assignment = record.technicalAssignment;
  if (record.commercialAssignment !== undefined) dbRecord.commercial_assignment = record.commercialAssignment;
  if (record.categoryId !== undefined) dbRecord.category_id = isUUID(record.categoryId) ? record.categoryId : null;
  else if (record.categoria !== undefined && isUUID(record.categoria)) dbRecord.category_id = record.categoria;
  
  return dbRecord;
};


export const mapDBToProduct = (dbProduct: any): ProductRecord => ({
  id: dbProduct.id,
  correlativeId: dbProduct.correlative_id || dbProduct.sample?.correlative_id,
  codigoSAP: dbProduct.sap_code || '',
  codigoEAN: dbProduct.ean_code || '',
  descripcionSAP: dbProduct.sap_description || '',
  marca: dbProduct.brand?.name || dbProduct.brand_id || 'SOLE',
  proveedor: dbProduct.supplier?.commercial_alias || dbProduct.supplier?.legal_name || dbProduct.supplier_id || 'Desconocido',
  linea: dbProduct.line?.name || dbProduct.line_id || 'AGUA CALIENTE',
  codProv: dbProduct.supplier?.erp_code || '',
  correoProveedor: dbProduct.supplier?.email 
    ? (Array.isArray(dbProduct.supplier.email) 
        ? dbProduct.supplier.email 
        : dbProduct.supplier.email.split(',').map((e: string) => e.trim()).filter(Boolean))
    : [],
  artworks: dbProduct.explode_files ? dbProduct.explode_files.filter((d: any) => d.category !== 'Technical Sheet' && d.category !== 'Commercial Sheet') : [],
  technicalSheets: dbProduct.explode_files ? dbProduct.explode_files.filter((d: any) => d.category === 'Technical Sheet') : [],
  commercialSheets: dbProduct.explode_files ? dbProduct.explode_files.filter((d: any) => d.category === 'Commercial Sheet') : [],
  commercialStatus: dbProduct.commercial_status,
  qualityInspectionDate: dbProduct.quality_inspection_date,
  createdAt: dbProduct.created_at || new Date().toISOString(),
  gallery: dbProduct.gallery || [],
  artworkAssignment: dbProduct.artwork_assignment,
  technicalAssignment: dbProduct.technical_assignment,
  commercialAssignment: dbProduct.commercial_assignment,
  trackingType: dbProduct.tracking_type,
  linkedGroupId: dbProduct.linked_group_id,
  categoryId: dbProduct.category_id || dbProduct.sample?.category_id || '',
  categoria: dbProduct.category?.name || dbProduct.sample?.category?.name || ''
});

export const mapDBToPMRecord = (dbRecord: any): ProductManagementRecord => ({
  id: dbRecord.id,
  correlativeId: dbRecord.correlative_id || dbRecord.sample?.correlative_id,
  codigoSAP: dbRecord.sap_code || '',
  codigoEAN: dbRecord.ean_code || '',
  eanCode: dbRecord.ean_code || '',
  descripcionSAP: dbRecord.sap_description || '',
  marca: dbRecord.brand?.name || dbRecord.brand_id || 'SOLE',
  brandId: dbRecord.brand_id,
  proveedor: dbRecord.supplier?.commercial_alias || dbRecord.supplier?.legal_name || dbRecord.supplier_id || 'Desconocido',
  supplierId: dbRecord.supplier_id,
  linea: dbRecord.line?.name || dbRecord.line_id || 'AGUA CALIENTE',
  lineId: dbRecord.line_id,
  sampleId: dbRecord.sample_id,
  fobPrice: dbRecord.fob_price || 0,
  fobPriceHistory: dbRecord.fob_price_history || [],
  explodeFiles: dbRecord.explode_files || [],
  additionalProviderDocuments: dbRecord.additional_provider_documents || [],
  gallery: dbRecord.gallery || [],
  approvedDocuments: dbRecord.approved_documents || [],
  artworkAssignment: dbRecord.artwork_assignment,
  technicalAssignment: dbRecord.technical_assignment,
  commercialAssignment: dbRecord.commercial_assignment,
  categoryId: dbRecord.category_id || '',
  categoria: dbRecord.category?.name || '',
  createdAt: dbRecord.created_at || new Date().toISOString()
});

export const mapSupplierToDB = (supplier: Partial<Supplier>) => {
  const dbSupplier: any = {};
  if (supplier.legalName !== undefined) dbSupplier.legal_name = supplier.legalName;
  if (supplier.commercialAlias !== undefined) dbSupplier.commercial_alias = supplier.commercialAlias;
  if (supplier.erpCode !== undefined) dbSupplier.erp_code = supplier.erpCode;
  if (supplier.country !== undefined) dbSupplier.country = supplier.country;
  if (supplier.logoUrl !== undefined) dbSupplier.logo_url = supplier.logoUrl;
  if (supplier.contacts !== undefined) dbSupplier.contacts = supplier.contacts;
  if (supplier.website !== undefined) dbSupplier.website = supplier.website;
  if (supplier.wechat !== undefined) dbSupplier.wechat = supplier.wechat;
  if (supplier.email !== undefined) dbSupplier.email = supplier.email;
  if (supplier.evaluation !== undefined) dbSupplier.evaluation = supplier.evaluation;
  if (supplier.quotations !== undefined) dbSupplier.quotations = supplier.quotations;
  return dbSupplier;
};

export const mapDBToSupplier = (dbSupplier: any): Supplier => ({
  id: dbSupplier.id,
  legalName: dbSupplier.legal_name,
  commercialAlias: dbSupplier.commercial_alias,
  erpCode: dbSupplier.erp_code,
  country: dbSupplier.country,
  logoUrl: dbSupplier.logo_url,
  contacts: dbSupplier.contacts,
  website: dbSupplier.website,
  wechat: dbSupplier.wechat,
  email: dbSupplier.email,
  evaluation: dbSupplier.evaluation,
  quotations: dbSupplier.quotations || []
});

export const mapTemplateToDB = (template: Partial<RDProjectTemplate>) => {
  const dbTemplate: any = {};
  if (template.name !== undefined) dbTemplate.name = template.name;
  if (template.description !== undefined) dbTemplate.description = template.description;
  if (template.icon !== undefined) dbTemplate.icon = template.icon;
  if (template.backgroundImage !== undefined) dbTemplate.background_image = template.backgroundImage;
  if (template.isCustom !== undefined) dbTemplate.is_custom = template.isCustom;
  if (template.sections !== undefined) dbTemplate.sections = template.sections;
  return dbTemplate;
};

export const mapDBToTemplate = (dbTemplate: any): RDProjectTemplate => ({
  id: dbTemplate.id,
  name: dbTemplate.name,
  description: dbTemplate.description,
  icon: dbTemplate.icon,
  backgroundImage: dbTemplate.background_image,
  isCustom: dbTemplate.is_custom,
  sections: dbTemplate.sections
});

export const mapSampleToDB = (sample: Partial<SampleRecord>) => {
  const dbSample: any = {};
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (sample.correlativeId !== undefined) dbSample.correlative_id = sample.correlativeId;
  if (sample.codigoSAP !== undefined) dbSample.codigo_sap = sample.codigoSAP;
  if (sample.descripcionSAP !== undefined) dbSample.descripcion_sap = sample.descripcionSAP;
  if (sample.marca !== undefined) dbSample.brand_id = isUUID(sample.marca) ? sample.marca : null;
  if (sample.proveedor !== undefined) dbSample.supplier_id = isUUID(sample.proveedor) ? sample.proveedor : null;
  if (sample.linea !== undefined) dbSample.line_id = isUUID(sample.linea) ? sample.linea : null;
  if (sample.categoria !== undefined) dbSample.category_id = isUUID(sample.categoria) ? sample.categoria : null;
  if (sample.technician !== undefined) dbSample.technician = isUUID(sample.technician) ? sample.technician : null;
  if (sample.inspectionDate !== undefined) dbSample.inspection_date = sample.inspectionDate;
  if (sample.inspectionStatus !== undefined) dbSample.inspection_status = sample.inspectionStatus;
  if (sample.inspectionProgress !== undefined) dbSample.inspection_progress = sample.inspectionProgress;
  if (sample.reportDate !== undefined) dbSample.report_date = sample.reportDate;
  if (sample.reportFile !== undefined) dbSample.report_file = sample.reportFile;
  if (sample.inspectionTimer !== undefined) dbSample.inspection_timer = sample.inspectionTimer;
  if (sample.inspectionForm !== undefined) dbSample.inspection_form = sample.inspectionForm;
  if (sample.workflow !== undefined) dbSample.workflow = sample.workflow;
  if (sample.infoRequests !== undefined) dbSample.info_requests = sample.infoRequests;
  if (sample.providerDocuments !== undefined) dbSample.provider_documents = sample.providerDocuments;
  if (sample.receptionPhoto !== undefined) dbSample.reception_photo = sample.receptionPhoto;
  if (sample.receivedBy !== undefined) dbSample.received_by = sample.receivedBy;
  if (sample.warehouseEntryDate !== undefined) dbSample.warehouse_entry_date = sample.warehouseEntryDate;
  if (sample.version !== undefined) dbSample.version = sample.version;
  return dbSample;
};


export const mapDBToSample = (dbSample: any): SampleRecord => ({
  id: dbSample.id,
  correlativeId: dbSample.correlative_id,
  createdAt: dbSample.created_at,
  version: dbSample.version || 1,
  codigoSAP: dbSample.codigo_sap,
  descripcionSAP: dbSample.descripcion_sap,
  marca: dbSample.brand?.name || dbSample.brand_id || 'SOLE',
  proveedor: dbSample.supplier?.commercial_alias || dbSample.supplier?.legal_name || dbSample.supplier_id || 'Desconocido',
  linea: dbSample.line?.name || dbSample.line_id || 'AGUA CALIENTE',
  categoria: dbSample.category?.name || dbSample.category_id,
  inspectionDate: dbSample.inspection_date,
  inspectionStatus: dbSample.inspection_status,
  reportDate: dbSample.report_date,
  reportFile: dbSample.report_file,
  technician: dbSample.technician,
  inspectionProgress: dbSample.inspection_progress as any,
  inspectionTimer: dbSample.inspection_timer,
  inspectionForm: dbSample.inspection_form,
  workflow: dbSample.workflow,
  infoRequests: dbSample.info_requests || [],
  providerDocuments: dbSample.provider_documents || [],
  receptionPhoto: dbSample.reception_photo,
  receivedBy: dbSample.received_by,
  warehouseEntryDate: dbSample.warehouse_entry_date,
  history: dbSample.history ? dbSample.history.map((h: any) => ({
    date: h.created_at,
    status: h.status,
    user: h.user_id || 'Desconocido',
    comment: h.comment
  })) : []
});

export const mapDBToRDProject = (dbProject: any): RDProject => ({
  id: dbProject.id,
  templateId: dbProject.template_id,
  name: dbProject.name,
  description: dbProject.description,
  status: dbProject.status,
  priority: dbProject.priority,
  responsible: dbProject.responsible_id,
  startDate: dbProject.start_date,
  endDate: dbProject.end_date,
  sections: dbProject.sections,
  attachments: dbProject.attachments || [],
  updates: dbProject.updates || [],
  createdAt: dbProject.created_at,
  updatedAt: dbProject.updated_at
});

export const mapRDProjectToDB = (project: Partial<RDProject>) => {
  const dbProject: any = {};
  const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  if (project.templateId !== undefined) {
    dbProject.template_id = isUUID(project.templateId) ? project.templateId : null;
  }
  if (project.name !== undefined) dbProject.name = project.name;
  if (project.description !== undefined) dbProject.description = project.description;
  if (project.status !== undefined) dbProject.status = project.status;
  if (project.priority !== undefined) dbProject.priority = project.priority;
  if (project.responsible !== undefined) dbProject.responsible_id = project.responsible;
  if (project.startDate !== undefined) dbProject.start_date = project.startDate;
  if (project.endDate !== undefined) dbProject.end_date = project.endDate;
  if (project.sections !== undefined) dbProject.sections = project.sections;
  if (project.attachments !== undefined) dbProject.attachments = project.attachments;
  if (project.updates !== undefined) dbProject.updates = project.updates;
  return dbProject;
};

export const mapBrandToDB = (brand: Partial<Brand>) => {
  const dbBrand: any = {};
  if (brand.name !== undefined) dbBrand.name = brand.name;
  if (brand.image !== undefined) dbBrand.image = brand.image;
  if (brand.description !== undefined) dbBrand.description = brand.description;
  return dbBrand;
};

export const mapDBToBrand = (dbBrand: any): Brand => ({
  id: dbBrand.id,
  name: dbBrand.name,
  image: dbBrand.image,
  description: dbBrand.description
});

export const mapBrandDocumentToDB = (doc: Partial<BrandDocument>) => {
  const dbDoc: any = {};
  if (doc.brandId !== undefined) dbDoc.brand_id = doc.brandId;
  if (doc.parentId !== undefined) dbDoc.parent_id = doc.parentId;
  if (doc.name !== undefined) dbDoc.name = doc.name;
  if (doc.type !== undefined) dbDoc.type = doc.type;
  if (doc.modifiedBy !== undefined) dbDoc.modified_by = doc.modifiedBy;
  if (doc.versions !== undefined) dbDoc.versions = doc.versions;
  return dbDoc;
};

export const mapDBToBrandDocument = (dbDoc: any): BrandDocument => ({
  id: dbDoc.id,
  brandId: dbDoc.brand_id,
  parentId: dbDoc.parent_id,
  name: dbDoc.name,
  type: dbDoc.type as any,
  modified: new Date(dbDoc.modified_at).toLocaleString(),
  modifiedBy: dbDoc.modified_by,
  versions: dbDoc.versions || []
});

export const mapProductLineToDB = (line: Partial<ProductLine>) => ({
  name: line.name
});

export const mapDBToProductLine = (dbLine: any): ProductLine => ({
  id: dbLine.id,
  name: dbLine.name
});

export const mapCategoryToDB = (cat: Partial<Category>) => ({
  name: cat.name,
  line_id: cat.productLineId
});

export const mapDBToCategory = (dbCat: any): Category => ({
  id: dbCat.id,
  name: dbCat.name,
  productLineId: dbCat.line_id
});

export const mapInspectionTemplateToDB = (template: Partial<InspectionTemplate>) => ({
  category_id: template.categoryId,
  name: template.name,
  form_structure: template.formStructure,
  workflow_structure: template.workflowStructure,
  procedure_file: template.procedureFile
});

export const mapDBToInspectionTemplate = (dbTemplate: any): InspectionTemplate => ({
  id: dbTemplate.id,
  categoryId: dbTemplate.category_id,
  name: dbTemplate.name,
  formStructure: dbTemplate.form_structure,
  workflowStructure: dbTemplate.workflow_structure,
  procedureFile: dbTemplate.procedure_file,
  createdAt: dbTemplate.created_at,
  updatedAt: dbTemplate.updated_at
});

export const mapQualityClaimToDB = (claim: Partial<QualityClaim>) => {
  const dbClaim: any = {};
  if (claim.productId          !== undefined) dbClaim.product_id          = claim.productId;
  if (claim.sapCode            !== undefined) dbClaim.sap_code            = claim.sapCode;
  if (claim.trackingType       !== undefined) dbClaim.tracking_type       = claim.trackingType;
  if (claim.responsibleName    !== undefined) dbClaim.responsible_name    = claim.responsibleName;
  if (claim.responsibleEmail   !== undefined) dbClaim.responsible_email   = claim.responsibleEmail;
  if (claim.defectType         !== undefined) dbClaim.defect_type         = claim.defectType;
  if (claim.documentCategory   !== undefined) dbClaim.document_category   = claim.documentCategory;
  if (claim.comments           !== undefined) dbClaim.comments            = claim.comments;
  if (claim.claimStartDate     !== undefined) dbClaim.claim_start_date     = claim.claimStartDate || null;
  if (claim.claimEndDate       !== undefined) dbClaim.claim_end_date       = claim.claimEndDate || null;
  if (claim.status             !== undefined) dbClaim.status             = claim.status;
  if (claim.attachments        !== undefined) dbClaim.attachments        = claim.attachments;
  if (claim.resolutionComments !== undefined) dbClaim.resolution_comments = claim.resolutionComments;
  if (claim.resolvedBy         !== undefined) dbClaim.resolved_by         = claim.resolvedBy;
  return dbClaim;
};

export const mapDBToQualityClaim = (dbClaim: any): QualityClaim => ({
  id: dbClaim.id,
  productId: dbClaim.product_id,
  sapCode: dbClaim.sap_code,
  trackingType: dbClaim.tracking_type,
  responsibleName: dbClaim.responsible_name,
  responsibleEmail: dbClaim.responsible_email,
  defectType: dbClaim.defect_type,
  documentCategory: dbClaim.document_category,
  comments: dbClaim.comments,
  claimStartDate: dbClaim.claim_start_date,
  claimEndDate: dbClaim.claim_end_date,
  status: dbClaim.status,
  attachments: dbClaim.attachments || [],
  resolutionComments: dbClaim.resolution_comments,
  resolvedBy: dbClaim.resolved_by,
  createdAt: dbClaim.created_at,
  updatedAt: dbClaim.updated_at
});
