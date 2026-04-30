import { supabase } from './supabase';
import { 
  SampleRecord, 
  ProductRecord, 
  Supplier, 
  RDInventoryItem, 
  Project, 
  InnovationProposal, 
  CalendarTask,
  ModuleId,
  EnergyEfficiencyRecord,
  NTPRegulation,
  AuditLog
} from '../types';
import {
  mapInventoryToDB,
  mapDBToInventory,
  mapEEToDB,
  mapDBToEE,
  mapProjectToDB,
  mapDBToProject,
  mapTaskToDB,
  mapDBToTask,
  mapProposalToDB, 
  mapDBToProposal, 
  mapNTPToDB,
  mapDBToNTP,
  mapLogToDB, 
  mapDBToLog, 
  mapProductToDB, 
  mapDBToProduct,
  mapSupplierToDB,
  mapDBToSupplier,
  mapTemplateToDB,
  mapDBToTemplate,
  mapSampleToDB,
  mapDBToSample,
  mapDBToPMRecord
} from './mappings';


export const SupabaseService = {
  // MASTER DATA

  async getBrands() {
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getProductLines() {
    const { data, error } = await supabase.from('product_lines').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },

  // SAMPLES (MUESTRAS)
  async getSamples() {
    const { data, error } = await supabase
      .from('samples')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToSample);
  },

  async createSample(sample: Partial<SampleRecord>) {
    const dbSample = mapSampleToDB(sample);
    const { data, error } = await supabase
      .from('samples')
      .insert(dbSample)
      .select()
      .single();
    if (error) throw error;
    return mapDBToSample(data);
  },

  async updateSample(id: string, updates: Partial<SampleRecord>) {
    const dbUpdates = mapSampleToDB(updates);
    const { data, error } = await supabase
      .from('samples')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToSample(data);
  },

  async deleteSample(id: string) {
    const { error } = await supabase
      .from('samples')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // PRODUCTS
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToProduct);
  },

  async createProduct(product: Omit<ProductRecord, 'id' | 'createdAt'>) {
    const dbProduct = mapProductToDB(product);
    const { data, error } = await supabase
      .from('products')
      .insert([dbProduct])
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async updateProduct(id: string, updates: Partial<ProductRecord>) {
    const dbUpdates = mapProductToDB(updates);
    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async updateProductBySAP(codigoSAP: string, updates: Partial<ProductRecord>) {
    const dbUpdates = mapProductToDB(updates);
    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('sap_code', codigoSAP)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // PRODUCT MANAGEMENT
  async getPMRecords() {
    const { data, error } = await supabase
      .from('product_management')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToPMRecord);
  },

  async createProductManagementRecord(record: Partial<ProductManagementRecord>) {
    const dbRecord = mapProductToDB(record);
    const { data, error } = await supabase
      .from('product_management')
      .insert([dbRecord])
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToPMRecord(data);
  },

  async updateProductManagementRecord(id: string, updates: Partial<ProductManagementRecord>) {
    const dbUpdates = mapProductToDB(updates);
    const { data, error } = await supabase
      .from('product_management')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToPMRecord(data);
  },

  async deleteProductManagementRecord(id: string) {
    const { error } = await supabase
      .from('product_management')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // INVENTORY
  async getInventory() {
    const { data, error } = await supabase
      .from('rd_inventory')
      .select('*')
      .order('description');
    if (error) throw error;
    return data.map(mapDBToInventory);
  },

  async createInventoryItem(item: Partial<RDInventoryItem>) {
    const dbItem = mapInventoryToDB(item);
    const { data, error } = await supabase
      .from('rd_inventory')
      .insert(dbItem)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToInventory(data);
  },

  async updateInventoryItem(id: string, updates: Partial<RDInventoryItem>) {
    const dbUpdates = mapInventoryToDB(updates);
    const { data, error } = await supabase
      .from('rd_inventory')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToInventory(data);
  },

  async deleteInventoryItem(id: string) {
    const { error } = await supabase
      .from('rd_inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // PROJECTS (Roadmap)
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        activities:project_activities(*)
      `)
      .order('project_number');
    if (error) throw error;
    return data.map(mapDBToProject);
  },

  async createProject(project: Partial<Project>) {
    const dbProject = mapProjectToDB(project);
    const { data, error } = await supabase
      .from('projects')
      .insert(dbProject)
      .select()
      .single();
    if (error) throw error;
    return mapDBToProject(data);
  },

  async updateProject(id: string, updates: Partial<Project>) {
    const dbUpdates = mapProjectToDB(updates);
    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToProject(data);
  },

  async deleteProject(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // PROJECT ACTIVITIES
  async createProjectActivity(projectId: string, activity: Partial<ProjectActivity>) {
    const dbActivity = { ...mapActivityToDB(activity), project_id: projectId };
    const { data, error } = await supabase
      .from('project_activities')
      .insert(dbActivity)
      .select()
      .single();
    if (error) throw error;
    return mapDBToActivity(data);
  },

  async updateProjectActivity(id: string, updates: Partial<ProjectActivity>) {
    const dbUpdates = mapActivityToDB(updates);
    const { data, error } = await supabase
      .from('project_activities')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToActivity(data);
  },

  async deleteProjectActivity(id: string) {
    const { error } = await supabase
      .from('project_activities')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // ENERGY EFFICIENCY
  async getEnergyEfficiencyRecords() {
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToEE);
  },

  async createEERecord(record: Partial<EnergyEfficiencyRecord>) {
    const dbRecord = mapEEToDB(record);
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .insert(dbRecord)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToEE(data);
  },

  async updateEERecord(id: string, updates: Partial<EnergyEfficiencyRecord>) {
    const dbUpdates = mapEEToDB(updates);
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToEE(data);
  },

  async deleteEERecord(id: string) {
    const { error } = await supabase
      .from('energy_efficiency_records')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // INNOVATION PROPOSALS
  async getInnovationProposals() {
    const { data, error } = await supabase
      .from('innovation_proposals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToProposal);
  },

  async createInnovationProposal(proposal: Partial<InnovationProposal>) {
    const dbProposal = mapProposalToDB(proposal);
    const { data, error } = await supabase
      .from('innovation_proposals')
      .insert(dbProposal)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToProposal(data);
  },

  async updateInnovationProposal(id: string, updates: Partial<InnovationProposal>) {
    const dbUpdates = mapProposalToDB(updates);
    const { data, error } = await supabase
      .from('innovation_proposals')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDBToProposal(data);
  },

  async deleteInnovationProposal(id: string) {
    const { error } = await supabase
      .from('innovation_proposals')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // CALENDAR TASKS
  async getCalendarTasks() {
    const { data, error } = await supabase
      .from('calendar_tasks')
      .select('*')
      .order('deadline', { ascending: true });
    if (error) throw error;
    return data.map(mapDBToTask);
  },

  async createCalendarTask(task: Partial<CalendarTask>) {
    const dbTask = mapTaskToDB(task);
    const { data, error } = await supabase
      .from('calendar_tasks')
      .insert(dbTask)
      .select()
      .single();
    if (error) throw error;
    return mapDBToTask(data);
  },

  async updateCalendarTask(id: string, updates: Partial<CalendarTask>) {
    const dbUpdates = mapTaskToDB(updates);
    const { data, error } = await supabase
      .from('calendar_tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToTask(data);
  },

  async deleteCalendarTask(id: string) {
    const { error } = await supabase
      .from('calendar_tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // NTP REGULATIONS
  async getNTPRegulations() {
    const { data, error } = await supabase
      .from('ntp_regulations')
      .select('*')
      .order('code');
    if (error) throw error;
    return data.map(mapDBToNTP);
  },

  async createNTPRegulation(reg: Partial<NTPRegulation>) {
    const dbReg = mapNTPToDB(reg);
    const { data, error } = await supabase
      .from('ntp_regulations')
      .insert(dbReg)
      .select()
      .single();
    if (error) throw error;
    return mapDBToNTP(data);
  },

  async updateNTPRegulation(id: string, updates: Partial<NTPRegulation>) {
    const dbUpdates = mapNTPToDB(updates);
    const { data, error } = await supabase
      .from('ntp_regulations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToNTP(data);
  },

  async deleteNTPRegulation(id: string) {
    const { error } = await supabase
      .from('ntp_regulations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // SUPPLIERS
  async getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('legal_name');
    if (error) throw error;
    return data.map(mapDBToSupplier);
  },

  async createSupplier(supplier: Partial<Supplier>) {
    const dbSupplier = mapSupplierToDB(supplier);
    const { data, error } = await supabase
      .from('suppliers')
      .insert([dbSupplier])
      .select()
      .single();
    if (error) throw error;
    return mapDBToSupplier(data);
  },

  async updateSupplier(id: string, updates: Partial<Supplier>) {
    const dbUpdates = mapSupplierToDB(updates);
    const { data, error } = await supabase
      .from('suppliers')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToSupplier(data);
  },

  async deleteSupplier(id: string) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // RD PROJECT TEMPLATES
  async getRDProjectTemplates() {
    const { data, error } = await supabase
      .from('rd_project_templates')
      .select('*')
      .order('name');
    if (error) throw error;
    return data.map(mapDBToTemplate);
  },

  async createRDProjectTemplate(template: Partial<RDProjectTemplate>) {
    const dbTemplate = mapTemplateToDB(template);
    const { data, error } = await supabase
      .from('rd_project_templates')
      .insert([dbTemplate])
      .select()
      .single();
    if (error) throw error;
    return mapDBToTemplate(data);
  },

  async updateRDProjectTemplate(id: string, updates: Partial<RDProjectTemplate>) {
    const dbUpdates = mapTemplateToDB(updates);
    const { data, error } = await supabase
      .from('rd_project_templates')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToTemplate(data);
  },

  async deleteRDProjectTemplate(id: string) {
    const { error } = await supabase
      .from('rd_project_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // AUDIT LOGS
  async getAuditLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToLog);
  },

  async createAuditLog(log: Partial<AuditLog>) {
    const dbLog = mapLogToDB(log);
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(dbLog)
      .select()
      .single();
    if (error) throw error;
    return mapDBToLog(data);
  },

  // STORAGE HELPERS
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
      
    return { name: file.name, url: publicUrl, type: file.type };
  },

  // USER MANAGEMENT
  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return data;
  },

  async updateProfileRole(id: string, role: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfileStatus(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(id: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // APPROVER CONFIGURATION
  async getApprovers() {
    const { data, error } = await supabase
      .from('approver_configs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return {
      'I+D': 'Orlando Nuñez',
      'MKT': 'Raquel Veliz',
      'PLAN': 'Carlos Andrés Hoyos',
      'PROV': 'Jonathan Soriano'
    };

    return {
      'I+D': data.id_approver,
      'MKT': data.mkt_approver,
      'PLAN': data.plan_approver,
      'PROV': data.prov_approver
    };
  },

  async updateApprover(id: string, updates: any) {
    const { data, error } = await supabase
      .from('approver_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createApprover(approver: any) {
    const { data, error } = await supabase
      .from('approver_configs')
      .insert([approver])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteApprover(id: string) {
    const { error } = await supabase
      .from('approver_configs')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

