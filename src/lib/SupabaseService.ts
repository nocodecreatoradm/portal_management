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
  AuditLog,
  Brand,
  BrandDocument,
  ProductManagementRecord,
  ProjectActivity,
  RDProjectTemplate,
  RDProject,
  ProductLine,
  Category,
  InspectionTemplate
} from '../types';
import {
  mapInventoryToDB,
  mapDBToInventory,
  mapEEToDB,
  mapDBToEE,
  mapProjectToDB,
  mapDBToProject,
  mapActivityToDB,
  mapDBToActivity,
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
  mapDBToPMRecord,
  mapPMRecordToDB,
  mapSupplierToDB,
  mapDBToSupplier,
  mapTemplateToDB,
  mapDBToTemplate,
  mapSampleToDB,
  mapDBToSample,
  mapDBToRDProject,
  mapRDProjectToDB,
  mapDBToBrand,
  mapBrandDocumentToDB,
  mapDBToBrandDocument,
  mapProductLineToDB,
  mapDBToProductLine,
  mapCategoryToDB,
  mapDBToCategory,
  mapInspectionTemplateToDB,
  mapDBToInspectionTemplate
} from './mappings';


const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Profile cache with automatic invalidation
let cachedProfiles: { id: string; full_name: string; department?: string }[] | null = null;
let profilesCacheTimestamp = 0;
const PROFILES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedProfiles = async () => {
  const now = Date.now();
  if (cachedProfiles && (now - profilesCacheTimestamp) < PROFILES_CACHE_TTL) {
    return cachedProfiles;
  }
  const { data, error } = await supabase.from('profiles').select('id, full_name, department');
  if (!error && data) {
    cachedProfiles = data;
    profilesCacheTimestamp = now;
  }
  return cachedProfiles || [];
};

// Force refresh profiles cache (call after user changes)
const invalidateProfilesCache = () => {
  cachedProfiles = null;
  profilesCacheTimestamp = 0;
};

export const SupabaseService = {
  // MASTER DATA
  async getDepartments() {
    const profiles = await getCachedProfiles();
    const departments = Array.from(new Set(profiles.map(p => p.department).filter(Boolean))) as string[];
    return departments.sort();
  },

  async getBrands() {
    const { data, error } = await supabase.from('brands').select().order('name');
    if (error) throw error;
    return data;
  },

  async createBrand(brand: { name: string }) {
    const { data, error } = await supabase.from('brands').insert([brand]).select().single();
    if (error) throw error;
    return mapDBToBrand(data);
  },

  async updateBrand(id: string, updates: Partial<Brand>) {
    const dbUpdates = mapBrandToDB(updates);
    const { data, error } = await supabase.from('brands').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapDBToBrand(data);
  },

  async deleteBrand(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getProductLines() {
    const { data, error } = await supabase.from('product_lines').select().order('name');
    if (error) throw error;
    return data;
  },

  async createProductLine(line: { name: string }) {
    const { data, error } = await supabase.from('product_lines').insert([line]).select().single();
    if (error) throw error;
    return mapDBToProductLine(data);
  },

  async updateProductLine(id: string, updates: Partial<ProductLine>) {
    const dbUpdates = mapProductLineToDB(updates);
    const { data, error } = await supabase.from('product_lines').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapDBToProductLine(data);
  },

  async deleteProductLine(id: string) {
    const { error } = await supabase.from('product_lines').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getCategories() {
    const { data, error } = await supabase.from('categories').select().order('name');
    if (error) throw error;
    return data.map(mapDBToCategory);
  },

  async createCategory(category: Partial<Category>) {
    const dbCategory = mapCategoryToDB(category);
    const { data, error } = await supabase.from('categories').insert([dbCategory]).select().single();
    if (error) throw error;
    return mapDBToCategory(data);
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    const dbUpdates = mapCategoryToDB(updates);
    const { data, error } = await supabase.from('categories').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapDBToCategory(data);
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // INSPECTION TEMPLATES
  async getInspectionTemplates() {
    const { data, error } = await supabase.from('inspection_templates').select().order('name');
    if (error) throw error;
    return data.map(mapDBToInspectionTemplate);
  },

  async createInspectionTemplate(template: Partial<InspectionTemplate>) {
    const dbTemplate = mapInspectionTemplateToDB(template);
    const { data, error } = await supabase.from('inspection_templates').insert(dbTemplate).select().single();
    if (error) throw error;
    return mapDBToInspectionTemplate(data);
  },

  async updateInspectionTemplate(id: string, updates: Partial<InspectionTemplate>) {
    const dbUpdates = mapInspectionTemplateToDB(updates);
    const { data, error } = await supabase.from('inspection_templates').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapDBToInspectionTemplate(data);
  },

  async deleteInspectionTemplate(id: string) {
    const { error } = await supabase.from('inspection_templates').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getInspectionTemplateByCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('inspection_templates')
      .select()
      .eq('category_id', categoryId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDBToInspectionTemplate(data) : null;
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
        category:categories(name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    const profiles = await getCachedProfiles();
    return data.map(mapDBToSample).map(sample => {
      const u = profiles.find(x => x.id === sample.technician);
      if (u) sample.technician = u.full_name;
      return sample;
    });
  },

  async createSample(sample: Partial<SampleRecord>) {
    const profiles = await getCachedProfiles();
    if (sample.technician) {
      const u = profiles.find(x => x.full_name === sample.technician);
      if (u) sample.technician = u.id;
    }
    const dbSample = mapSampleToDB(sample);
    const { data, error } = await supabase
      .from('samples')
      .insert(dbSample)
      .select(`
        *,
        supplier:suppliers(legal_name, erp_code),
        brand:brands(name),
        line:product_lines(name)
      `)
      .single();
    if (error) throw error;
    
    const s = mapDBToSample(data);
    const u = profiles.find(x => x.id === s.technician);
    if (u) s.technician = u.full_name;
    return s;
  },

  async updateSample(id: string, updates: Partial<SampleRecord>) {
    if (!isUUID(id)) return null;
    const profiles = await getCachedProfiles();
    if (updates.technician) {
      const u = profiles.find(x => x.full_name === updates.technician);
      if (u) updates.technician = u.id;
    }
    const dbUpdates = mapSampleToDB(updates);
    const { data, error } = await supabase
      .from('samples')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(legal_name, erp_code),
        brand:brands(name),
        line:product_lines(name)
      `)
      .single();
    if (error) throw error;
    
    const s = mapDBToSample(data);
    const u = profiles.find(x => x.id === s.technician);
    if (u) s.technician = u.full_name;
    return s;
  },

  async deleteSample(id: string) {
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from('samples')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // PRODUCTS
  async getProducts(trackingType?: 'artwork' | 'technical' | 'commercial') {
    let query = supabase
      .from('products')
      .select(`
        id, correlative_id, sap_code, ean_code, sap_description, brand_id, supplier_id, line_id, sample_id, 
        commercial_status, quality_inspection_date, fob_price, fob_price_history, explode_files, 
        additional_provider_documents, created_at, updated_at, 
        artwork_assignment, technical_assignment, commercial_assignment, tracking_type, linked_group_id,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        sample:samples(correlative_id)
      `);
    
    if (trackingType) {
      query = query.eq('tracking_type', trackingType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToProduct);
  },

  async createProduct(product: Omit<ProductRecord, 'id' | 'createdAt'>) {
    const dbProduct = mapProductToDB(product);
    const initialDocs: any[] = [];
    if (product.artworks) initialDocs.push(...product.artworks);
    if (product.technicalSheets) initialDocs.push(...product.technicalSheets);
    if (product.commercialSheets) initialDocs.push(...product.commercialSheets);
    if (initialDocs.length > 0) {
      dbProduct.explode_files = initialDocs;
    }
    const { data, error } = await supabase
      .from('products')
      .insert([dbProduct])
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        sample:samples(correlative_id)
      `)
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async updateProduct(id: string, updates: Partial<ProductRecord & any>) {
    if (!isUUID(id)) return null;
    const dbUpdates = mapProductToDB(updates);

    if (updates.artworks !== undefined || updates.technicalSheets !== undefined || updates.commercialSheets !== undefined) {
      const { data: existing } = await supabase.from('products').select('explode_files').eq('id', id).single();
      const existingDocs = existing?.explode_files || [];
      let mergedDocs = [...existingDocs];

      if (updates.artworks !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category === 'Technical Sheet' || d.category === 'Commercial Sheet');
        mergedDocs = [...mergedDocs, ...updates.artworks.map((a: any) => ({ ...a, category: a.category || 'Artwork' }))];
      }
      if (updates.technicalSheets !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category !== 'Technical Sheet');
        mergedDocs = [...mergedDocs, ...updates.technicalSheets.map((t: any) => ({ ...t, category: 'Technical Sheet' }))];
      }
      if (updates.commercialSheets !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category !== 'Commercial Sheet');
        mergedDocs = [...mergedDocs, ...updates.commercialSheets.map((c: any) => ({ ...c, category: 'Commercial Sheet' }))];
      }
      dbUpdates.explode_files = mergedDocs;
    }

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        sample:samples(correlative_id)
      `)
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async updateProductBySAP(codigoSAP: string, updates: Partial<ProductRecord & any>) {
    const dbUpdates = mapProductToDB(updates);
    
    if (updates.artworks !== undefined || updates.technicalSheets !== undefined || updates.commercialSheets !== undefined) {
      const { data: existing } = await supabase.from('products').select('explode_files').eq('sap_code', codigoSAP).single();
      const existingDocs = existing?.explode_files || [];
      let mergedDocs = [...existingDocs];

      if (updates.artworks !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category === 'Technical Sheet' || d.category === 'Commercial Sheet');
        mergedDocs = [...mergedDocs, ...updates.artworks.map((a: any) => ({ ...a, category: a.category || 'Artwork' }))];
      }
      if (updates.technicalSheets !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category !== 'Technical Sheet');
        mergedDocs = [...mergedDocs, ...updates.technicalSheets.map((t: any) => ({ ...t, category: 'Technical Sheet' }))];
      }
      if (updates.commercialSheets !== undefined) {
        mergedDocs = mergedDocs.filter((d: any) => d.category !== 'Commercial Sheet');
        mergedDocs = [...mergedDocs, ...updates.commercialSheets.map((c: any) => ({ ...c, category: 'Commercial Sheet' }))];
      }
      dbUpdates.explode_files = mergedDocs;
    }

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('sap_code', codigoSAP)
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name),
        sample:samples(correlative_id)
      `)
      .single();
    if (error) throw error;
    return mapDBToProduct(data);
  },

  async deleteProduct(id: string) {
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteLinkedProducts(linkedGroupId: string) {
    if (!isUUID(linkedGroupId)) return true;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('linked_group_id', linkedGroupId);
    if (error) throw error;
    return true;
  },

  // PRODUCT MANAGEMENT
  async getPMRecords() {
    const { data, error } = await supabase
      .from('product_management')
      .select(`
        id, correlative_id, sap_code, ean_code, sap_description, brand_id, supplier_id, line_id, sample_id, 
        fob_price, fob_price_history, explode_files, additional_provider_documents, gallery, 
        approved_documents, created_at, updated_at,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapDBToPMRecord);
  },

  async createProductManagementRecord(record: Partial<ProductManagementRecord>) {
    const dbRecord = mapPMRecordToDB(record);
    const { data, error } = await supabase
      .from('product_management')
      .insert([dbRecord])
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name)
      `)
      .single();
    if (error) throw error;
    return mapDBToPMRecord(data);
  },

  async updateProductManagementRecord(id: string, updates: Partial<ProductManagementRecord>) {
    if (!isUUID(id)) return null;
    const dbUpdates = mapPMRecordToDB(updates);
    const { data, error } = await supabase
      .from('product_management')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        brand:brands(name),
        supplier:suppliers(legal_name),
        line:product_lines(name)
      `)
      .single();
    if (error) throw error;
    return mapDBToPMRecord(data);
  },

  async deleteProductManagementRecord(id: string) {
    if (!isUUID(id)) return true;
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
      .select()
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
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
    
    const profiles = await getCachedProfiles();
    return data.map(mapDBToProject).map(proj => {
      const u = profiles.find(x => x.id === proj.responsible);
      if (u) proj.responsible = u.full_name;
      return proj;
    });
  },

  async createProject(project: Partial<Project>) {
    const profiles = await getCachedProfiles();
    if (project.responsible) {
      const u = profiles.find(x => x.full_name === project.responsible);
      if (u) project.responsible = u.id;
    }
    const dbProject = mapProjectToDB(project);
    const { data, error } = await supabase
      .from('projects')
      .insert(dbProject)
      .select()
      .single();
    if (error) throw error;
    
    const p = mapDBToProject(data);
    const u = profiles.find(x => x.id === p.responsible);
    if (u) p.responsible = u.full_name;
    return p;
  },

  async updateProject(id: string, updates: Partial<Project>) {
    if (!isUUID(id)) return null;
    const profiles = await getCachedProfiles();
    if (updates.responsible) {
      const u = profiles.find(x => x.full_name === updates.responsible);
      if (u) updates.responsible = u.id;
    }
    const dbUpdates = mapProjectToDB(updates);
    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    const p = mapDBToProject(data);
    const u = profiles.find(x => x.id === p.responsible);
    if (u) p.responsible = u.full_name;
    return p;
  },

  async deleteProject(id: string) {
    if (!isUUID(id)) return true;
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
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
      .select(`
        *,
        supplier:suppliers!energy_efficiency_records_supplier_id_fkey(legal_name)
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
      .select(`
        *,
        supplier:suppliers!energy_efficiency_records_supplier_id_fkey(legal_name)
      `)
      .single();
    if (error) throw error;
    return mapDBToEE(data);
  },

  async updateEERecord(id: string, updates: Partial<EnergyEfficiencyRecord>) {
    if (!isUUID(id)) return null;
    const dbUpdates = mapEEToDB(updates);
    const { data, error } = await supabase
      .from('energy_efficiency_records')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers!energy_efficiency_records_supplier_id_fkey(legal_name)
      `)
      .single();
    if (error) throw error;
    return mapDBToEE(data);
  },

  async deleteEERecord(id: string) {
    if (!isUUID(id)) return true;
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
      .select()
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
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
      .select()
      .order('deadline', { ascending: true });
    if (error) throw error;
    
    const profiles = await getCachedProfiles();
    return data.map(mapDBToTask).map(task => {
      const req = profiles.find(x => x.id === task.requester);
      if (req) task.requester = req.full_name;
      const ass = profiles.find(x => x.id === task.assignee);
      if (ass) task.assignee = ass.full_name;
      return task;
    });
  },

  async createCalendarTask(task: Partial<CalendarTask>) {
    const profiles = await getCachedProfiles();
    if (task.requester) {
      const req = profiles.find(x => x.full_name === task.requester);
      if (req) task.requester = req.id;
    }
    if (task.assignee) {
      const ass = profiles.find(x => x.full_name === task.assignee);
      if (ass) task.assignee = ass.id;
    }
    const dbTask = mapTaskToDB(task);
    const { data, error } = await supabase
      .from('calendar_tasks')
      .insert(dbTask)
      .select()
      .single();
    if (error) throw error;
    
    const t = mapDBToTask(data);
    const req = profiles.find(x => x.id === t.requester);
    if (req) t.requester = req.full_name;
    const ass = profiles.find(x => x.id === t.assignee);
    if (ass) t.assignee = ass.full_name;
    return t;
  },

  async updateCalendarTask(id: string, updates: Partial<CalendarTask>) {
    if (!isUUID(id)) return null;
    const profiles = await getCachedProfiles();
    if (updates.requester) {
      const req = profiles.find(x => x.full_name === updates.requester);
      if (req) updates.requester = req.id;
    }
    if (updates.assignee) {
      const ass = profiles.find(x => x.full_name === updates.assignee);
      if (ass) updates.assignee = ass.id;
    }
    const dbUpdates = mapTaskToDB(updates);
    const { data, error } = await supabase
      .from('calendar_tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    const t = mapDBToTask(data);
    const req = profiles.find(x => x.id === t.requester);
    if (req) t.requester = req.full_name;
    const ass = profiles.find(x => x.id === t.assignee);
    if (ass) t.assignee = ass.full_name;
    return t;
  },

  async deleteCalendarTask(id: string) {
    if (!isUUID(id)) return true;
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
      .select()
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
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
      .select()
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
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
      .select()
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
    if (!isUUID(id)) return null;
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
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from('rd_project_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // RD PROJECTS (Custom)
  async getRDProjects() {
    const { data, error } = await supabase
      .from('rd_custom_projects')
      .select()
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    const profiles = await getCachedProfiles();
    return data.map(mapDBToRDProject).map(proj => {
      const u = profiles.find(x => x.id === proj.responsible);
      if (u) proj.responsible = u.full_name;
      return proj;
    });
  },

  async createRDProject(project: Partial<RDProject>) {
    const profiles = await getCachedProfiles();
    if (project.responsible) {
      const u = profiles.find(x => x.full_name === project.responsible);
      if (u) project.responsible = u.id;
    }
    const dbProject = mapRDProjectToDB(project);
    const { data, error } = await supabase
      .from('rd_custom_projects')
      .insert([dbProject])
      .select()
      .single();
    if (error) throw error;
    
    const p = mapDBToRDProject(data);
    const u = profiles.find(x => x.id === p.responsible);
    if (u) p.responsible = u.full_name;
    return p;
  },

  async updateRDProject(id: string, updates: Partial<RDProject>) {
    if (!isUUID(id)) return null;
    const profiles = await getCachedProfiles();
    if (updates.responsible) {
      const u = profiles.find(x => x.full_name === updates.responsible);
      if (u) updates.responsible = u.id;
    }
    const dbUpdates = mapRDProjectToDB(updates);
    const { data, error } = await supabase
      .from('rd_custom_projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    const p = mapDBToRDProject(data);
    const u = profiles.find(x => x.id === p.responsible);
    if (u) p.responsible = u.full_name;
    return p;
  },

  async deleteRDProject(id: string) {
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from('rd_custom_projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  // AUDIT LOGS
  async getAuditLogs() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select()
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
  // Max file size: 50 MB
  MAX_FILE_SIZE: 25 * 1024 * 1024,

  async uploadFile(bucket: string, path: string, file: File) {
    // Sanitize path to avoid "Invalid key" errors with special characters or spaces
    const sanitizedPath = path
      .split('/')
      .map(part => 
        part
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9._-]/gi, '_')
      )
      .join('/');

    // Validate file size before uploading
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`El archivo "${file.name}" excede el tamaño máximo permitido (${this.MAX_FILE_SIZE / (1024 * 1024)} MB). Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    }

    // Compress images before uploading if they are larger than 500KB
    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/') && file.size > 500 * 1024) {
      try {
        fileToUpload = await this._compressImage(file, 0.8, 1920);
      } catch (compressErr) {
        console.warn('Image compression failed, uploading original:', compressErr);
        fileToUpload = file;
      }
    }

    // Retry upload up to 3 times
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(sanitizedPath, fileToUpload, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          lastError = error;
          console.warn(`Upload attempt ${attempt}/3 failed:`, error.message);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000 * attempt)); // Backoff: 1s, 2s
            continue;
          }
          throw new Error(`Error al subir archivo "${file.name}" después de 3 intentos: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return { name: file.name, url: publicUrl, type: file.type };
      } catch (err: any) {
        lastError = err;
        if (attempt < 3) {
          console.warn(`Upload attempt ${attempt}/3 threw error:`, err.message);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
      }
    }

    // All retries failed — throw clear error instead of falling back to base64
    throw new Error(`No se pudo subir el archivo "${file.name}". Verifique su conexión a internet e intente nuevamente. Detalle: ${lastError?.message || 'Error desconocido'}`);
  },

  // Compress images client-side before uploading
  async _compressImage(file: File, quality: number = 0.8, maxDimension: number = 1920): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  },

  // USER MANAGEMENT
  invalidateProfilesCache() {
    invalidateProfilesCache();
  },

  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, department, scopes, avatar_url')
      .order('full_name');
    if (error) throw error;
    // Refresh the cached profiles whenever full profiles are fetched
    invalidateProfilesCache();
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
    if (error) {
      console.error('Detailed Supabase Update Error:', error);
      throw error;
    }
    invalidateProfilesCache();
    return data;
  },

  // APPROVER CONFIGURATION
  async getApprovers() {
    const { data, error } = await supabase
      .from('approver_configs')
      .select()
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return {
      'I+D': 'I+D',
      'MKT': 'MKT',
      'PROV': 'PROV',
      'PLAN': 'PLAN'
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
  },

  // BRANDBOOK
  async getBrandbookSettings() {
    const { data, error } = await supabase
      .from('brandbook_settings')
      .select()
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || { hero_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000' };
  },

  async updateBrandbookSettings(heroImage: string) {
    const current = await this.getBrandbookSettings();
    const payload: any = { hero_image: heroImage };
    if (current && 'id' in current && current.id) {
      payload.id = current.id;
    }
    const { data, error } = await supabase
      .from('brandbook_settings')
      .upsert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getBrandbookBrands() {
    const { data, error } = await supabase
      .from('brands')
      .select()
      .order('name');
    if (error) throw error;
    return data.map(mapDBToBrand);
  },

  async getBrandbookDocuments(brandId?: string) {
    let query = supabase.from('brand_documents').select().order('name');
    if (brandId) {
      query = query.eq('brand_id', brandId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapDBToBrandDocument);
  },

  async createBrandbookDocument(doc: Partial<BrandDocument>) {
    const dbDoc = mapBrandDocumentToDB(doc);
    const { data, error } = await supabase
      .from('brand_documents')
      .insert(dbDoc)
      .select()
      .single();
    if (error) throw error;
    return mapDBToBrandDocument(data);
  },

  async updateBrandbookDocument(id: string, updates: Partial<BrandDocument>) {
    const dbDoc = mapBrandDocumentToDB(updates);
    const { data, error } = await supabase
      .from('brand_documents')
      .update(dbDoc)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDBToBrandDocument(data);
  },

  async deleteBrandbookDocument(id: string) {
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from('brand_documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

