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
  SampleRecord 
} from '../types';

export const mapInventoryToDB = (item: Partial<RDInventoryItem>) => ({
  serial_number: item.serialNumber,
  description: item.description,
  responsible_id: item.responsible, // Assuming 'responsible' is an ID
  acquisition_date: item.acquisitionDate,
  startup_date: item.startupDate,
  calibration_status: item.calibrationStatus,
  category: item.category,
  equipment_type: item.equipmentType,
  source_type: item.sourceType,
  brand: item.brand,
  model: item.model,
  equipment_range: item.equipmentRange,
  last_calibration_date: item.lastCalibrationDate,
  next_calibration_date: item.nextCalibrationDate,
  manual_file: item.manual,
  photos: item.photos
});

export const mapDBToInventory = (dbItem: any): RDInventoryItem => ({
  id: dbItem.id,
  serialNumber: dbItem.serial_number,
  description: dbItem.description,
  responsible: dbItem.responsible_id,
  acquisitionDate: dbItem.acquisition_date,
  startupDate: dbItem.startup_date,
  calibrationStatus: dbItem.calibration_status,
  category: dbItem.category,
  equipmentType: dbItem.equipment_type,
  sourceType: dbItem.source_type,
  brand: dbItem.brand,
  model: dbItem.model,
  equipmentRange: dbItem.equipment_range,
  lastCalibrationDate: dbItem.last_calibration_date,
  nextCalibrationDate: dbItem.next_calibration_date,
  manual: dbItem.manual_file,
  photos: dbItem.photos,
  certificateHistory: dbItem.certificates
});

export const mapEEToDB = (record: Partial<EnergyEfficiencyRecord>) => {
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  const dbRecord: any = {
    mt_code: record.codigoMT,
    description: record.descripcion,
    letra: record.letra,
    ee_percentage: record.porcentajeEE,
    ocp: record.ocp,
    supplier_id: record.proveedor && isUUID(record.proveedor) ? record.proveedor : null,
    emission_date: record.fechaEmision,
    vigilance_date: record.fechaVigilancia,
    product_type: record.tipoProducto,
    sample_id: record.sampleId && isUUID(record.sampleId) ? record.sampleId : null,
    certificado_file: record.certificadoFile,
    certificado_history: record.certificadoHistory,
    etiqueta_file: record.etiquetaFile,
    etiqueta_history: record.etiquetaHistory,
    gallery: record.gallery
  };
  return dbRecord;
};

export const mapDBToEE = (dbRecord: any): EnergyEfficiencyRecord => ({
  id: dbRecord.id,
  codigoMT: dbRecord.mt_code,
  descripcion: dbRecord.description,
  letra: dbRecord.letra,
  porcentajeEE: dbRecord.ee_percentage,
  ocp: dbRecord.ocp,
  proveedor: dbRecord.supplier_id,
  fechaEmision: dbRecord.emission_date,
  fechaVigilancia: dbRecord.vigilance_date,
  tipoProducto: dbRecord.product_type,
  sampleId: dbRecord.sample_id,
  certificadoFile: dbRecord.certificado_file,
  certificadoHistory: dbRecord.certificado_history,
  etiquetaFile: dbRecord.etiqueta_file,
  etiquetaHistory: dbRecord.etiqueta_history,
  gallery: dbRecord.gallery,
  createdAt: dbRecord.created_at
});

export const mapProjectToDB = (project: Partial<Project>) => {
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  return {
    project_number: project.number,
    name: project.name,
    responsible_id: project.responsible && isUUID(project.responsible) ? project.responsible : null,
    progress: project.progress,
    status: project.status
  };
};

export const mapDBToProject = (dbProject: any): Project => ({
  id: dbProject.id,
  number: dbProject.project_number,
  name: dbProject.name,
  responsible: dbProject.responsible_id,
  progress: dbProject.progress,
  status: dbProject.status,
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
  number: dbActivity.activity_number,
  name: dbActivity.name,
  comments: dbActivity.comments,
  indicator: dbActivity.indicator,
  progress: dbActivity.progress,
  classification: dbActivity.classification,
  plannedStartDate: dbActivity.planned_start_date,
  plannedEndDate: dbActivity.planned_end_date,
  actualStartDate: dbActivity.actual_start_date,
  actualEndDate: dbActivity.actual_end_date,
  status: dbActivity.status,
  dailyProgress: dbActivity.daily_progress,
  responsible: dbActivity.responsibles
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

export const mapProposalToDB = (proposal: Partial<InnovationProposal>) => ({
  title: proposal.title,
  description: proposal.description,
  category: proposal.category,
  author_id: proposal.author,
  status: proposal.status,
  priority: proposal.priority,
  images: proposal.images,
  sketches: proposal.sketches,
  blueprints: proposal.blueprints,
  tags: proposal.tags
});

export const mapDBToProposal = (dbProposal: any): InnovationProposal => ({
  id: dbProposal.id,
  title: dbProposal.title,
  description: dbProposal.description,
  category: dbProposal.category,
  author: dbProposal.author_id,
  date: dbProposal.created_at,
  status: dbProposal.status,
  priority: dbProposal.priority,
  images: dbProposal.images || [],
  sketches: dbProposal.sketches || [],
  blueprints: dbProposal.blueprints || [],
  tags: dbProposal.tags || [],
  comments: dbProposal.comments ? dbProposal.comments.map((c: any) => ({
    ...c,
    user: c.user_id
  })) : []
});

export const mapNTPToDB = (reg: Partial<NTPRegulation>) => ({
  code: reg.code,
  title: reg.title,
  category: reg.category,
  upload_date: reg.uploadDate,
  file_info: reg.file,
  description: reg.description
});

export const mapDBToNTP = (dbReg: any): NTPRegulation => ({
  id: dbReg.id,
  code: dbReg.code,
  title: dbReg.title,
  category: dbReg.category,
  uploadDate: dbReg.upload_date,
  file: dbReg.file_info,
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
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  if (product.codigoSAP !== undefined) dbProduct.sap_code = product.codigoSAP;
  if (product.codigoEAN !== undefined) dbProduct.ean_code = product.codigoEAN;
  if (product.descripcionSAP !== undefined) dbProduct.sap_description = product.descripcionSAP;
  if (product.marca !== undefined) dbProduct.brand_id = isUUID(product.marca) ? product.marca : null;
  if (product.proveedor !== undefined) dbProduct.supplier_id = isUUID(product.proveedor) ? product.proveedor : null;
  if (product.linea !== undefined) dbProduct.line_id = isUUID(product.linea) ? product.linea : null;
  if (product.sampleId !== undefined) dbProduct.sample_id = isUUID(product.sampleId) ? product.sampleId : null;
  if (product.commercialStatus !== undefined) dbProduct.commercial_status = product.commercialStatus;
  if (product.qualityInspectionDate !== undefined) dbProduct.quality_inspection_date = product.qualityInspectionDate;
  if (product.fobPrice !== undefined) dbProduct.fob_price = product.fobPrice;
  if (product.fobPriceHistory !== undefined) dbProduct.fob_price_history = product.fobPriceHistory;
  if (product.explodeFiles !== undefined) dbProduct.explode_files = product.explodeFiles;
  if (product.additionalProviderDocuments !== undefined) dbProduct.additional_provider_documents = product.additionalProviderDocuments;
  if (product.gallery !== undefined) dbProduct.gallery = product.gallery;
  return dbProduct;
};


export const mapDBToProduct = (dbProduct: any): ProductRecord => ({
  id: dbProduct.id,
  codigoSAP: dbProduct.sap_code || '',
  codigoEAN: dbProduct.ean_code || '',
  descripcionSAP: dbProduct.sap_description || '',
  marca: dbProduct.brand?.name || dbProduct.brand_id || 'SOLE',
  proveedor: dbProduct.supplier?.legal_name || dbProduct.supplier_id || 'Desconocido',
  linea: dbProduct.line?.name || dbProduct.line_id || 'AGUA CALIENTE',
  codProv: '', // Not in DB yet
  correoProveedor: [], // Not in DB yet
  artworks: dbProduct.documents ? dbProduct.documents.filter((d: any) => d.category === 'Artwork') : [],
  technicalSheets: dbProduct.documents ? dbProduct.documents.filter((d: any) => d.category === 'Technical Sheet') : [],
  commercialSheets: dbProduct.documents ? dbProduct.documents.filter((d: any) => d.category === 'Commercial Sheet') : [],
  commercialStatus: dbProduct.commercial_status,
  qualityInspectionDate: dbProduct.quality_inspection_date,
  createdAt: dbProduct.created_at || new Date().toISOString(),
});

export const mapDBToPMRecord = (dbRecord: any): ProductManagementRecord => ({
  id: dbRecord.id,
  codigoSAP: dbRecord.sap_code || '',
  descripcionSAP: dbRecord.sap_description || '',
  marca: dbRecord.brand?.name || dbRecord.brand_id || 'SOLE',
  proveedor: dbRecord.supplier?.legal_name || dbRecord.supplier_id || 'Desconocido',
  linea: dbRecord.line?.name || dbRecord.line_id || 'AGUA CALIENTE',
  sampleId: dbRecord.sample_id,
  fobPrice: dbRecord.fob_price || 0,
  fobPriceHistory: dbRecord.fob_price_history || [],
  explodeFiles: dbRecord.explode_files || [],
  additionalProviderDocuments: dbRecord.additional_provider_documents || [],
  gallery: dbRecord.gallery || [],
  approvedDocuments: [],
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
  evaluation: dbSupplier.evaluation
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
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  if (sample.correlativeId !== undefined) dbSample.correlative_id = sample.correlativeId;
  if (sample.codigoSAP !== undefined) dbSample.sap_code = sample.codigoSAP;
  if (sample.descripcionSAP !== undefined) dbSample.sap_description = sample.descripcionSAP;
  if (sample.marca !== undefined) dbSample.brand_id = isUUID(sample.marca) ? sample.marca : null;
  if (sample.proveedor !== undefined) dbSample.supplier_id = isUUID(sample.proveedor) ? sample.proveedor : null;
  if (sample.linea !== undefined) dbSample.line_id = isUUID(sample.linea) ? sample.linea : null;
  if (sample.categoria !== undefined) dbSample.category_id = isUUID(sample.categoria) ? sample.categoria : null;
  if (sample.technician !== undefined) dbSample.technician_id = isUUID(sample.technician) ? sample.technician : null;
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
  codigoSAP: dbSample.sap_code,
  descripcionSAP: dbSample.sap_description,
  marca: dbSample.brand?.name || dbSample.brand_id || 'SOLE',
  proveedor: dbSample.supplier?.legal_name || dbSample.supplier_id || 'Desconocido',
  linea: dbSample.line?.name || dbSample.line_id || 'AGUA CALIENTE',
  categoria: dbSample.category?.name || dbSample.category_id,
  inspectionDate: dbSample.inspection_date,
  inspectionStatus: dbSample.inspection_status,
  reportDate: dbSample.report_date,
  reportFile: dbSample.report_file,
  technician: dbSample.technician_id,
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
  createdAt: dbProject.created_at,
  updatedAt: dbProject.updated_at
});

export const mapRDProjectToDB = (project: Partial<RDProject>) => {
  const dbProject: any = {};
  if (project.templateId !== undefined) dbProject.template_id = project.templateId;
  if (project.name !== undefined) dbProject.name = project.name;
  if (project.description !== undefined) dbProject.description = project.description;
  if (project.status !== undefined) dbProject.status = project.status;
  if (project.priority !== undefined) dbProject.priority = project.priority;
  if (project.responsible !== undefined) dbProject.responsible_id = project.responsible;
  if (project.startDate !== undefined) dbProject.start_date = project.startDate;
  if (project.endDate !== undefined) dbProject.end_date = project.endDate;
  if (project.sections !== undefined) dbProject.sections = project.sections;
  if (project.attachments !== undefined) dbProject.attachments = project.attachments;
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
