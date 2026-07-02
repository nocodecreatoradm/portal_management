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
  QualityClaim,
  PriceGMROITemplate,
  CategoryGMROIThreshold,
  SolyReminder
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
  if (item.responsible       !== undefined) dbItem.responsible          = item.responsible;
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
  responsible: dbItem.responsible,
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
  categoria: (dbRecord.category?.name || dbRecord.category_id || '').toUpperCase(),
  categoryId: dbRecord.category_id || ''
});

export const mapProjectToDB = (project: Partial<Project>) => {
  return {
    project_number: project.number,
    name: project.name,
    responsible: project.responsible || null,
    progress: project.progress,
    status: project.status
  };
};

export const mapDBToProject = (dbProject: any): Project => ({
  id: dbProject.id,
  number: dbProject.project_number || '',
  name: dbProject.name || '',
  responsible: dbProject.responsible || '',
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
  responsible: activity.responsible
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
  responsible: dbActivity.responsible || []
});

export const mapTaskToDB = (task: Partial<CalendarTask>) => {
  const dbTask: any = {};
  if (task.title !== undefined) dbTask.title = task.title;
  if (task.description !== undefined) dbTask.description = task.description;
  if (task.deadline !== undefined) dbTask.deadline = task.deadline;
  if (task.startDate !== undefined) dbTask.start_date = task.startDate;
  if (task.endDate !== undefined) dbTask.end_date = task.endDate;
  if (task.type !== undefined) dbTask.type = task.type;
  if (task.requester !== undefined) dbTask.requester = task.requester;
  if (task.assignee !== undefined) dbTask.assignee = task.assignee;
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
  type: dbTask.type,
  requester: dbTask.requester,
  assignee: dbTask.assignee,
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
  if (product.comments !== undefined) dbProduct.comments = product.comments;
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
  // Lineal de Productos fields
  if (record.commercialName !== undefined) dbRecord.commercial_name = record.commercialName;
  if (record.detailedDescription !== undefined) dbRecord.detailed_description = record.detailedDescription;
  if (record.segment !== undefined) dbRecord.segment = record.segment;
  if (record.productStatus !== undefined) dbRecord.product_status = record.productStatus;
  if (record.replacesProductId !== undefined) dbRecord.replaces_product_id = record.replacesProductId;
  if (record.habilitado !== undefined) dbRecord.habilitado = record.habilitado;
  if (record.incluyeKit !== undefined) dbRecord.incluye_kit = record.incluyeKit;
  if (record.habilitacionCosto !== undefined) dbRecord.habilitacion_costo = record.habilitacionCosto;
  if (record.pvp !== undefined) dbRecord.pvp = record.pvp;
  if (record.pvpDescuento !== undefined) dbRecord.pvp_descuento = record.pvpDescuento;
  if (record.salesCurrentYear !== undefined) dbRecord.sales_current_year = record.salesCurrentYear;
  if (record.salesPreviousYear !== undefined) dbRecord.sales_previous_year = record.salesPreviousYear;
  if (record.currentYear !== undefined) dbRecord.current_year = record.currentYear;
  if (record.previousYear !== undefined) dbRecord.previous_year = record.previousYear;
  if (record.catalogComments !== undefined) dbRecord.catalog_comments = record.catalogComments;
  if (record.categoria !== undefined && !isUUID(record.categoria)) dbRecord.categoria = record.categoria;
  if (record.salesHistory !== undefined) dbRecord.sales_history = record.salesHistory;
  if (record.kitSupplierId !== undefined) dbRecord.kit_supplier_id = record.kitSupplierId;
  
  return dbRecord;
};




export const mapDBToProduct = (dbProduct: any): ProductRecord => {
  const brandId = dbProduct.brand_id || dbProduct.brand?.id || '';
  const supplierId = dbProduct.supplier_id || dbProduct.supplier?.id || '';
  const lineId = dbProduct.line_id || dbProduct.line?.id || '';
  const categoryId = dbProduct.category_id || dbProduct.sample?.category_id || '';

  const emails = dbProduct.supplier?.email || dbProduct.supplier_email;

  return {
    id: dbProduct.id,
    correlativeId: dbProduct.correlative_id || dbProduct.sample?.correlative_id,
    codigoSAP: dbProduct.sap_code || '',
    codigoEAN: dbProduct.ean_code || '',
    descripcionSAP: dbProduct.sap_description || '',
    marca: dbProduct.brand?.name || dbProduct.brand_name || dbProduct.brand_id || 'SOLE',
    brandId,
    proveedor: dbProduct.supplier?.commercial_alias || dbProduct.supplier?.legal_name || dbProduct.supplier_commercial_alias || dbProduct.supplier_legal_name || dbProduct.supplier_id || 'Desconocido',
    supplierId,
    linea: dbProduct.line?.name || dbProduct.line_name || dbProduct.line_id || 'AGUA CALIENTE',
    lineId,
    codProv: dbProduct.supplier?.erp_code || dbProduct.supplier_erp_code || '',
    correoProveedor: emails
      ? (Array.isArray(emails) 
          ? emails 
          : emails.split(',').map((e: string) => e.trim()).filter(Boolean))
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
    categoryId,
    categoria: (dbProduct.category?.name || dbProduct.sample?.category?.name || dbProduct.category_name || dbProduct.category_id || '').toUpperCase(),
    comments: dbProduct.comments || '',
    sampleId: dbProduct.sample_id
  } as any;
};

export const mapDBToPMRecord = (dbRecord: any): ProductManagementRecord => ({
  id: dbRecord.id,
  correlativeId: dbRecord.correlative_id || dbRecord.sample?.correlative_id,
  codigoSAP: dbRecord.sap_code || '',
  codigoEAN: dbRecord.ean_code || '',
  eanCode: dbRecord.ean_code || '',
  descripcionSAP: dbRecord.sap_description || '',
  commercialName: dbRecord.commercial_name || '',
  detailedDescription: dbRecord.detailed_description || '',
  segment: dbRecord.segment || undefined,
  productStatus: dbRecord.product_status || 'vigente',
  replacesProductId: dbRecord.replaces_product_id || undefined,
  habilitado: dbRecord.habilitado === true || dbRecord.habilitado === 1,
  incluyeKit: dbRecord.incluye_kit === true || dbRecord.incluye_kit === 1,
  kitSupplierId: dbRecord.kit_supplier_id || undefined,
  kitSupplierName: dbRecord.kit_supplier_commercial_alias || dbRecord.kit_supplier_legal_name || undefined,
  habilitacionCosto: dbRecord.habilitacion_costo != null ? Number(dbRecord.habilitacion_costo) : undefined,
  pvp: dbRecord.pvp != null ? Number(dbRecord.pvp) : undefined,
  pvpDescuento: dbRecord.pvp_descuento != null ? Number(dbRecord.pvp_descuento) : undefined,
  salesCurrentYear: dbRecord.sales_current_year != null ? Number(dbRecord.sales_current_year) : undefined,
  salesPreviousYear: dbRecord.sales_previous_year != null ? Number(dbRecord.sales_previous_year) : undefined,
  currentYear: dbRecord.current_year != null ? Number(dbRecord.current_year) : undefined,
  previousYear: dbRecord.previous_year != null ? Number(dbRecord.previous_year) : undefined,
  catalogComments: dbRecord.catalog_comments || '',
  marca: dbRecord.brand?.name || dbRecord.brand_name || dbRecord.brand_id || 'SOLE',
  brandId: dbRecord.brand_id,
  proveedor: dbRecord.supplier?.commercial_alias || dbRecord.supplier?.legal_name || dbRecord.supplier_commercial_alias || dbRecord.supplier_legal_name || dbRecord.supplier_id || 'Desconocido',
  supplierId: dbRecord.supplier_id,
  supplierLogoUrl: dbRecord.supplier?.logo_url,
  linea: dbRecord.line?.name || dbRecord.line_name || dbRecord.line_id || 'AGUA CALIENTE',
  lineId: dbRecord.line_id,
  sampleId: dbRecord.sample_id,
  fobPrice: dbRecord.fob_price || 0,
  fobPriceHistory: dbRecord.fob_price_history || [],
  explodeFiles: dbRecord.explode_files || [],
  additionalProviderDocuments: dbRecord.additional_provider_documents || [],
  gallery: dbRecord.gallery || [],
  approvedDocuments: dbRecord.approved_documents || [],
  salesHistory: dbRecord.sales_history || [],
  artworkAssignment: dbRecord.artwork_assignment,
  technicalAssignment: dbRecord.technical_assignment,
  commercialAssignment: dbRecord.commercial_assignment,
  categoryId: dbRecord.category_id || '',
  categoria: dbRecord.categoria || (dbRecord.category?.name || dbRecord.category_name || dbRecord.category_id || '').toUpperCase(),
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

export const mapDBToTemplate = (dbTemplate: any): RDProjectTemplate => {
  let sections = dbTemplate.sections;
  if (typeof sections === 'string') {
    try {
      sections = JSON.parse(sections);
    } catch (e) {
      sections = [];
    }
  }
  if (!Array.isArray(sections)) {
    sections = [];
  }
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description,
    icon: dbTemplate.icon,
    backgroundImage: dbTemplate.background_image,
    isCustom: dbTemplate.is_custom,
    sections: sections.map((s: any) => ({
      id: s.id || `section-${Date.now()}-${Math.random()}`,
      title: s.title || '',
      fields: Array.isArray(s.fields) ? s.fields.map((f: any) => ({
        id: f.id || `field-${Date.now()}-${Math.random()}`,
        label: f.label || '',
        type: f.type || 'text',
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options : []
      })) : []
    }))
  };
};

export const mapSampleToDB = (sample: Partial<SampleRecord>) => {
  const dbSample: any = {};
  const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (sample.correlativeId !== undefined) dbSample.correlative_id = sample.correlativeId;
  if (sample.codigoSAP !== undefined) dbSample.codigo_sap = sample.codigoSAP;
  if (sample.descripcionSAP !== undefined) dbSample.descripcion_sap = sample.descripcionSAP;
  
  if (sample.brandId !== undefined) dbSample.brand_id = isUUID(sample.brandId) ? sample.brandId : null;
  else if (sample.marca !== undefined) dbSample.brand_id = isUUID(sample.marca) ? sample.marca : null;

  if (sample.lineId !== undefined) dbSample.line_id = isUUID(sample.lineId) ? sample.lineId : null;
  else if (sample.linea !== undefined) dbSample.line_id = isUUID(sample.linea) ? sample.linea : null;

  if (sample.categoryId !== undefined) dbSample.category_id = isUUID(sample.categoryId) ? sample.categoryId : null;
  else if (sample.categoria !== undefined) dbSample.category_id = isUUID(sample.categoria) ? sample.categoria : null;

  if (sample.proveedor !== undefined) dbSample.supplier_id = isUUID(sample.proveedor) ? sample.proveedor : null;
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
  if (sample.plannedStartDate !== undefined) dbSample.planned_start_date = sample.plannedStartDate;
  if (sample.inspectionCompletedDate !== undefined) dbSample.inspection_completed_date = sample.inspectionCompletedDate;
  if (sample.gallery !== undefined) dbSample.gallery = sample.gallery;
  if (sample.calculationIds !== undefined) dbSample.calculation_ids = sample.calculationIds;
  return dbSample;
};


export const mapDBToSample = (dbSample: any): SampleRecord => ({
  id: dbSample.id,
  correlativeId: dbSample.correlative_id,
  createdAt: dbSample.created_at,
  version: dbSample.version || 1,
  codigoSAP: dbSample.codigo_sap,
  descripcionSAP: dbSample.descripcion_sap,
  brandId: dbSample.brand_id || '',
  lineId: dbSample.line_id || '',
  categoryId: dbSample.category_id || '',
  marca: dbSample.brand?.name || dbSample.brand_id || 'SOLE',
  proveedor: dbSample.supplier?.commercial_alias || dbSample.supplier?.legal_name || dbSample.supplier_id || 'Desconocido',
  codProv: dbSample.supplier?.erp_code || '',
  linea: dbSample.line?.name || dbSample.line_id || 'AGUA CALIENTE',
  categoria: (dbSample.category?.name || dbSample.category_id || '').toUpperCase(),
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
  plannedStartDate: dbSample.planned_start_date,
  inspectionCompletedDate: dbSample.inspection_completed_date,
  gallery: Array.isArray(dbSample.gallery) ? dbSample.gallery : (dbSample.gallery ? JSON.parse(dbSample.gallery) : []),
  calculationIds: Array.isArray(dbSample.calculation_ids) ? dbSample.calculation_ids : (dbSample.calculation_ids ? JSON.parse(dbSample.calculation_ids) : []),
  history: dbSample.history ? dbSample.history.map((h: any) => ({
    date: h.created_at,
    status: h.status,
    user: h.user_id || 'Desconocido',
    comment: h.comment
  })) : []
});

export const mapDBToRDProject = (dbProject: any): RDProject => {
  let sections = dbProject.sections;
  if (typeof sections === 'string') {
    try {
      sections = JSON.parse(sections);
    } catch (e) {
      sections = [];
    }
  }
  if (!Array.isArray(sections)) {
    sections = [];
  }
  return {
    id: dbProject.id,
    templateId: dbProject.template_id,
    name: dbProject.name,
    description: dbProject.description,
    status: dbProject.status,
    priority: dbProject.priority,
    responsible: dbProject.responsible_id,
    startDate: dbProject.start_date,
    endDate: dbProject.end_date,
    sections: sections.map((s: any) => ({
      id: s.id || `section-${Date.now()}-${Math.random()}`,
      title: s.title || '',
      fields: Array.isArray(s.fields) ? s.fields.map((f: any) => ({
        id: f.id || `field-${Date.now()}-${Math.random()}`,
        label: f.label || '',
        type: f.type || 'text',
        required: !!f.required,
        options: Array.isArray(f.options) ? f.options : [],
        value: f.value !== undefined ? f.value : ''
      })) : []
    })),
    attachments: Array.isArray(dbProject.attachments) ? dbProject.attachments : (typeof dbProject.attachments === 'string' ? (JSON.parse(dbProject.attachments) || []) : []),
    updates: Array.isArray(dbProject.updates) ? dbProject.updates : (typeof dbProject.updates === 'string' ? (JSON.parse(dbProject.updates) || []) : []),
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at
  };
};

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

export const mapCategoryToDB = (cat: Partial<Category>) => {
  const dbRow: any = {
    name: cat.name ? cat.name.toUpperCase() : cat.name,
    line_id: cat.productLineId
  };
  if (cat.hiyariVisitChecklist !== undefined) dbRow.hiyari_visit_checklist = cat.hiyariVisitChecklist;
  if (cat.hiyariLabChecklist !== undefined) dbRow.hiyari_lab_checklist = cat.hiyariLabChecklist;
  return dbRow;
};

export const mapDBToCategory = (dbCat: any): Category => ({
  id: dbCat.id,
  name: (dbCat.name || '').toUpperCase(),
  productLineId: dbCat.line_id,
  hiyariVisitChecklist: dbCat.hiyari_visit_checklist,
  hiyariLabChecklist: dbCat.hiyari_lab_checklist
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

export const mapGMROITemplateToDB = (temp: Partial<PriceGMROITemplate>) => {
  const dbTemp: any = {};
  if (temp.id !== undefined) dbTemp.id = temp.id;
  if (temp.name !== undefined) dbTemp.name = temp.name;
  if (temp.sapCode !== undefined) dbTemp.sap_code = temp.sapCode;
  if (temp.lineId !== undefined) dbTemp.line_id = temp.lineId;
  if (temp.categoryId !== undefined) dbTemp.category_id = temp.categoryId;
  if (temp.pvpLista !== undefined) dbTemp.pvp_lista = temp.pvpLista;
  if (temp.pvpPromocion !== undefined) dbTemp.pvp_promocion = temp.pvpPromocion;
  if (temp.margenDistribuidor !== undefined) dbTemp.margen_distribuidor = temp.margenDistribuidor;
  if (temp.acuerdoComercial !== undefined) dbTemp.acuerdo_comercial = temp.acuerdoComercial;
  if (temp.fobUnitario !== undefined) dbTemp.fob_unitario = temp.fobUnitario;
  if (temp.tipoCambio !== undefined) dbTemp.tipo_cambio = temp.tipoCambio;
  if (temp.costoInstalacion !== undefined) dbTemp.costo_instalacion = temp.costoInstalacion;
  if (temp.costoFleteContenedor !== undefined) dbTemp.costo_flete_contenedor = temp.costoFleteContenedor;
  if (temp.unidadesContenedor !== undefined) dbTemp.unidades_contenedor = temp.unidadesContenedor;
  if (temp.ingresarCostoDirecto !== undefined) dbTemp.ingresar_costo_directo = temp.ingresarCostoDirecto ? 1 : 0;
  if (temp.gastoEstimadoConsolidado !== undefined) dbTemp.gasto_estimado_consolidado = temp.gastoEstimadoConsolidado;
  if (temp.gastoUnitarioAplicado !== undefined) dbTemp.gasto_unitario_aplicado = temp.gastoUnitarioAplicado;
  if (temp.forecastDemanda !== undefined) dbTemp.forecast_demanda = temp.forecastDemanda;
  if (temp.llegadaStock !== undefined) dbTemp.llegada_stock = temp.llegadaStock;
  return dbTemp;
};

export const mapDBToGMROITemplate = (dbTemp: any): PriceGMROITemplate => ({
  id: dbTemp.id,
  name: dbTemp.name,
  sapCode: dbTemp.sap_code,
  lineId: dbTemp.line_id,
  categoryId: dbTemp.category_id,
  pvpLista: Number(dbTemp.pvp_lista || 0),
  pvpPromocion: Number(dbTemp.pvp_promocion || 0),
  margenDistribuidor: Number(dbTemp.margen_distribuidor || 0),
  acuerdoComercial: Number(dbTemp.acuerdo_comercial || 0),
  fobUnitario: Number(dbTemp.fob_unitario || 0),
  tipoCambio: Number(dbTemp.tipo_cambio || 0),
  costoInstalacion: Number(dbTemp.costo_instalacion || 0),
  costoFleteContenedor: Number(dbTemp.costo_flete_contenedor || 0),
  unidadesContenedor: Number(dbTemp.unidades_contenedor || 0),
  ingresarCostoDirecto: dbTemp.ingresar_costo_directo === true || dbTemp.ingresar_costo_directo === 1 || dbTemp.ingresar_costo_directo === '1',
  gastoEstimadoConsolidado: Number(dbTemp.gasto_estimado_consolidado || 0),
  gastoUnitarioAplicado: Number(dbTemp.gasto_unitario_aplicado || 0),
  forecastDemanda: Array.isArray(dbTemp.forecast_demanda) ? dbTemp.forecast_demanda : (typeof dbTemp.forecast_demanda === 'string' ? JSON.parse(dbTemp.forecast_demanda) : Array(12).fill(0)),
  llegadaStock: Array.isArray(dbTemp.llegada_stock) ? dbTemp.llegada_stock : (typeof dbTemp.llegada_stock === 'string' ? JSON.parse(dbTemp.llegada_stock) : Array(12).fill(0)),
  createdAt: dbTemp.created_at,
  updatedAt: dbTemp.updated_at
});

export const mapThresholdToDB = (thresh: Partial<CategoryGMROIThreshold>) => {
  const dbThresh: any = {};
  if (thresh.id !== undefined) dbThresh.id = thresh.id;
  if (thresh.categoryId !== undefined) dbThresh.category_id = thresh.categoryId;
  if (thresh.minMedio !== undefined) dbThresh.min_medio = thresh.minMedio;
  if (thresh.minAlto !== undefined) dbThresh.min_alto = thresh.minAlto;
  return dbThresh;
};

export const mapDBToThreshold = (dbThresh: any): CategoryGMROIThreshold => ({
  id: dbThresh.id,
  categoryId: dbThresh.category_id,
  minMedio: Number(dbThresh.min_medio || 0.8),
  minAlto: Number(dbThresh.min_alto || 1.2)
});

export const mapReminderToDB = (reminder: Partial<SolyReminder>) => {
  const dbRem: any = {};
  if (reminder.id !== undefined) dbRem.id = reminder.id;
  if (reminder.senderName !== undefined) dbRem.sender_name = reminder.senderName;
  if (reminder.senderEmail !== undefined) dbRem.sender_email = reminder.senderEmail;
  if (reminder.receiverName !== undefined) dbRem.receiver_name = reminder.receiverName;
  if (reminder.receiverEmail !== undefined) dbRem.receiver_email = reminder.receiverEmail;
  if (reminder.message !== undefined) dbRem.message = reminder.message;
  if (reminder.status !== undefined) dbRem.status = reminder.status;
  if (reminder.createdAt !== undefined) dbRem.created_at = reminder.createdAt;
  if (reminder.updatedAt !== undefined) dbRem.updated_at = reminder.updatedAt;
  return dbRem;
};

export const mapDBToReminder = (dbRem: any): SolyReminder => ({
  id: dbRem.id,
  senderName: dbRem.sender_name,
  senderEmail: dbRem.sender_email,
  receiverName: dbRem.receiver_name,
  receiverEmail: dbRem.receiver_email,
  message: dbRem.message,
  status: dbRem.status,
  createdAt: dbRem.created_at,
  updatedAt: dbRem.updated_at
});

export const mapHiyariHattoReportToDB = (report: Partial<HiyariHattoReport>) => {
  const dbRow: any = {};
  if (report.id !== undefined) dbRow.id = report.id;
  if (report.ticketNumber !== undefined) dbRow.ticket_number = report.ticketNumber;
  if (report.productId !== undefined) dbRow.product_id = report.productId;
  if (report.sapCode !== undefined) dbRow.sap_code = report.sapCode;
  if (report.productName !== undefined) dbRow.product_name = report.productName;
  if (report.brandName !== undefined) dbRow.brand_name = report.brandName;
  if (report.lineName !== undefined) dbRow.line_name = report.lineName;
  if (report.categoryName !== undefined) dbRow.category_name = report.categoryName;
  if (report.serialNumber !== undefined) dbRow.serial_number = report.serialNumber;
  if (report.incidentDate !== undefined) dbRow.incident_date = report.incidentDate || null;
  if (report.reportDate !== undefined) dbRow.report_date = report.reportDate || null;
  if (report.customerName !== undefined) dbRow.customer_name = report.customerName;
  if (report.customerDni !== undefined) dbRow.customer_dni = report.customerDni;
  if (report.customerAddress !== undefined) dbRow.customer_address = report.customerAddress;
  if (report.affectedPerson !== undefined) dbRow.affected_person = report.affectedPerson;
  if (report.affectedPeople !== undefined) dbRow.affected_people = JSON.stringify(report.affectedPeople);
  if (report.incidentDescription !== undefined) dbRow.incident_description = report.incidentDescription;
  if (report.hasProductDamage !== undefined) dbRow.has_product_damage = report.hasProductDamage ? 1 : 0;
  if (report.hasHomeDamage !== undefined) dbRow.has_home_damage = report.hasHomeDamage ? 1 : 0;
  if (report.hasClientDamage !== undefined) dbRow.has_client_damage = report.hasClientDamage ? 1 : 0;
  if (report.status !== undefined) dbRow.status = report.status;
  if (report.flashReportBy !== undefined) dbRow.flash_report_by = report.flashReportBy;
  if (report.flashReportDate !== undefined) dbRow.flash_report_date = report.flashReportDate || null;
  if (report.visitTechnicalReport !== undefined) dbRow.visit_technical_report = report.visitTechnicalReport;
  if (report.visitDate !== undefined) dbRow.visit_date = report.visitDate || null;
  if (report.receivedDate !== undefined) dbRow.received_date = report.receivedDate || null;
  if (report.qualityReportAntecedents !== undefined) dbRow.quality_report_antecedents = report.qualityReportAntecedents;
  if (report.qualityReportTests !== undefined) dbRow.quality_report_tests = report.qualityReportTests;
  if (report.qualityReportConclusion !== undefined) dbRow.quality_report_conclusion = report.qualityReportConclusion;
  if (report.conclusionDetails !== undefined) dbRow.conclusion_details = report.conclusionDetails;
  
  if (report.fiveWhys !== undefined) dbRow.five_whys = JSON.stringify(report.fiveWhys);
  if (report.ishikawa !== undefined) dbRow.ishikawa = JSON.stringify(report.ishikawa);
  if (report.hiyariQ3 !== undefined) dbRow.hiyari_q3 = report.hiyariQ3;
  if (report.hiyariQ4 !== undefined) dbRow.hiyari_q4 = report.hiyariQ4;
  if (report.actionPlan !== undefined) dbRow.action_plan = JSON.stringify(report.actionPlan);
  if (report.flashAttachments !== undefined) dbRow.flash_attachments = JSON.stringify(report.flashAttachments);
  if (report.visitAttachments !== undefined) dbRow.visit_attachments = JSON.stringify(report.visitAttachments);
  if (report.qualityAttachments !== undefined) dbRow.quality_attachments = JSON.stringify(report.qualityAttachments);
  if (report.rootCauseAttachments !== undefined) dbRow.root_cause_attachments = JSON.stringify(report.rootCauseAttachments);
  if (report.supplierCommunication !== undefined) dbRow.supplier_communication = report.supplierCommunication ? 1 : 0;
  if (report.supplierName !== undefined) dbRow.supplier_name = report.supplierName;
  if (report.supplierId !== undefined) dbRow.supplier_id_hh = report.supplierId;
  if (report.visitNotPerformed !== undefined) dbRow.visit_not_performed = report.visitNotPerformed ? 1 : 0;
  if (report.visitNotPerformedReason !== undefined) dbRow.visit_not_performed_reason = report.visitNotPerformedReason;
  if (report.region !== undefined) dbRow.region = report.region;
  if (report.district !== undefined) dbRow.district = report.district;
  
  if (report.createdAt !== undefined) dbRow.created_at = report.createdAt;
  if (report.updatedAt !== undefined) dbRow.updated_at = report.updatedAt;
  return dbRow;
};

export const mapDBToHiyariHattoReport = (dbRow: any): HiyariHattoReport => ({
  id: dbRow.id,
  ticketNumber: dbRow.ticket_number,
  productId: dbRow.product_id,
  sapCode: dbRow.sap_code,
  productName: dbRow.product_name,
  brandName: dbRow.brand_name,
  lineName: dbRow.line_name,
  categoryName: dbRow.category_name,
  serialNumber: dbRow.serial_number,
  incidentDate: dbRow.incident_date,
  reportDate: dbRow.report_date,
  customerName: dbRow.customer_name,
  customerDni: dbRow.customer_dni,
  customerAddress: dbRow.customer_address,
  affectedPerson: dbRow.affected_person,
  affectedPeople: typeof dbRow.affected_people === 'string' ? JSON.parse(dbRow.affected_people) : dbRow.affected_people || [],
  incidentDescription: dbRow.incident_description,
  hasProductDamage: dbRow.has_product_damage === 1 || dbRow.has_product_damage === true || dbRow.has_product_damage === '1',
  hasHomeDamage: dbRow.has_home_damage === 1 || dbRow.has_home_damage === true || dbRow.has_home_damage === '1',
  hasClientDamage: dbRow.has_client_damage === 1 || dbRow.has_client_damage === true || dbRow.has_client_damage === '1',
  status: dbRow.status,
  flashReportBy: dbRow.flash_report_by,
  flashReportDate: dbRow.flash_report_date,
  visitTechnicalReport: dbRow.visit_technical_report,
  visitDate: dbRow.visit_date,
  receivedDate: dbRow.received_date,
  qualityReportAntecedents: dbRow.quality_report_antecedents,
  qualityReportTests: dbRow.quality_report_tests,
  qualityReportConclusion: dbRow.quality_report_conclusion,
  conclusionDetails: dbRow.conclusion_details,
  fiveWhys: typeof dbRow.five_whys === 'string' ? JSON.parse(dbRow.five_whys) : dbRow.five_whys,
  ishikawa: typeof dbRow.ishikawa === 'string' ? JSON.parse(dbRow.ishikawa) : dbRow.ishikawa,
  hiyariQ3: dbRow.hiyari_q3,
  hiyariQ4: dbRow.hiyari_q4,
  actionPlan: typeof dbRow.action_plan === 'string' ? JSON.parse(dbRow.action_plan) : dbRow.action_plan || [],
  flashAttachments: typeof dbRow.flash_attachments === 'string' ? JSON.parse(dbRow.flash_attachments) : dbRow.flash_attachments || [],
  visitAttachments: typeof dbRow.visit_attachments === 'string' ? JSON.parse(dbRow.visit_attachments) : dbRow.visit_attachments || [],
  qualityAttachments: typeof dbRow.quality_attachments === 'string' ? JSON.parse(dbRow.quality_attachments) : dbRow.quality_attachments || [],
  rootCauseAttachments: typeof dbRow.root_cause_attachments === 'string' ? JSON.parse(dbRow.root_cause_attachments) : dbRow.root_cause_attachments || [],
  supplierCommunication: dbRow.supplier_communication === 1 || dbRow.supplier_communication === true || dbRow.supplier_communication === '1',
  supplierName: dbRow.supplier_name || '',
  supplierId: dbRow.supplier_id_hh || '',
  visitNotPerformed: dbRow.visit_not_performed !== undefined && dbRow.visit_not_performed !== null
    ? (dbRow.visit_not_performed === 1 || dbRow.visit_not_performed === true || dbRow.visit_not_performed === '1')
    : undefined,
  visitNotPerformedReason: dbRow.visit_not_performed_reason !== undefined && dbRow.visit_not_performed_reason !== null
    ? dbRow.visit_not_performed_reason
    : undefined,
  region: dbRow.region || '',
  district: dbRow.district || '',
  createdAt: dbRow.created_at,
  updatedAt: dbRow.updated_at
});
