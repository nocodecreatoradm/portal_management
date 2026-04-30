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
  mapDBToLog
} from './mappings';


export const SupabaseService = {
  // MASTER DATA
  async getSuppliers() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('legal_name');
    if (error) throw error;
    return data;
  },

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

  // SAMPLES (MUESTRAS)
  async getSamples() {
    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        category:categories(name),
        technician:profiles!samples_technician_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createSample(sample: Partial<SampleRecord>) {
    const { data, error } = await supabase
      .from('samples')
      .insert(sample)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSample(id: string, updates: Partial<SampleRecord>) {
    const { data, error } = await supabase
      .from('samples')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // PRODUCTS
  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        documents:product_documents(*)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: Partial<ProductRecord>) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // INVENTORY
  async getInventory() {
    const { data, error } = await supabase
      .from('rd_inventory')
      .select(`
        *,
        responsible:profiles!responsible_id(full_name),
        certificates:inventory_certificates(*)
      `)
      .order('description');
    if (error) throw error;
    return data.map(mapDBToInventory);
  },

  async createInventoryItem(item: Partial<RDInventoryItem>) {
    const dbItem = mapInventoryToDB(item);
    const { data, error } = await supabase
      .from('rd_inventory')
      .insert(dbItem)
      .select()
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
      .select()
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
        responsible:profiles!responsible_id(full_name),
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

  // ENERGY EFFICIENCY
  async getEnergyEfficiencyRecords() {
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .select(`
        *,
        supplier:suppliers(legal_name),
        sample:samples(sap_description)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToEE);
  },

  async createEERecord(record: Partial<EnergyEfficiencyRecord>) {
    const dbRecord = mapEEToDB(record);
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .insert(dbRecord)
      .select()
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
      .select()
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
      .select(`
        *,
        author:profiles!author_id(full_name),
        comments:innovation_comments(*, user:profiles!user_id(full_name))
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToProposal);
  },

  async createInnovationProposal(proposal: Partial<InnovationProposal>) {
    const dbProposal = mapProposalToDB(proposal);
    const { data, error } = await supabase
      .from('innovation_proposals')
      .insert(dbProposal)
      .select()
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
      .select()
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
      .select(`
        *,
        requester:profiles!requester_id(full_name),
        assignee:profiles!assignee_id(full_name)
      `)
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
  }
};

