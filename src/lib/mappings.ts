import { RDInventoryItem, EnergyEfficiencyRecord, ProductManagementRecord, Project, ProjectActivity, CalendarTask, InnovationProposal } from '../types';

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

export const mapEEToDB = (record: Partial<EnergyEfficiencyRecord>) => ({
  mt_code: record.codigoMT,
  description: record.descripcion,
  letra: record.letra,
  ee_percentage: record.porcentajeEE,
  ocp: record.ocp,
  supplier_id: record.proveedor, // Assuming 'proveedor' is an ID
  emission_date: record.fechaEmision,
  vigilance_date: record.fechaVigilancia,
  product_type: record.tipoProducto,
  sample_id: record.sampleId,
  certificado_file: record.certificadoFile,
  certificado_history: record.certificadoHistory,
  etiqueta_file: record.etiquetaFile,
  etiqueta_history: record.etiquetaHistory,
  gallery: record.gallery
});

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

export const mapProjectToDB = (project: Partial<Project>) => ({
  project_number: project.number,
  name: project.name,
  responsible_id: project.responsible,
  progress: project.progress,
  status: project.status
});

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

export const mapTaskToDB = (task: Partial<CalendarTask>) => ({
  title: task.title,
  description: task.description,
  start_date: task.startDate,
  end_date: task.endDate,
  deadline: task.deadline,
  task_type: task.type,
  requester_id: task.requester,
  assignee_id: task.assignee,
  status: task.status,
  delivery_status: task.deliveryStatus,
  change_log: task.changeLog
});

export const mapDBToTask = (dbTask: any): CalendarTask => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description,
  startDate: dbTask.start_date,
  endDate: dbTask.end_date,
  deadline: dbTask.deadline,
  type: dbTask.task_type,
  requester: dbTask.requester_id,
  assignee: dbTask.assignee_id,
  status: dbTask.status,
  deliveryStatus: dbTask.delivery_status,
  createdAt: dbTask.created_at,
  changeLog: dbTask.change_log
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
  comments: dbProposal.comments || []
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
