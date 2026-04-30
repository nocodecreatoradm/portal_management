import { supabase } from './supabase';
import { 
  SampleRecord, 
  ProductRecord, 
  Supplier, 
  RDInventoryItem, 
  Project, 
  InnovationProposal, 
  CalendarTask,
  ModuleId
} from '../types';

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

  // INVENTORY
  async getInventory() {
    const { data, error } = await supabase
      .from('rd_inventory')
      .select(`
        *,
        responsible:profiles(full_name),
        certificates:inventory_certificates(*)
      `)
      .order('description');
    if (error) throw error;
    return data;
  },

  // PROJECTS
  async getProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        responsible:profiles(full_name),
        activities:project_activities(*)
      `)
      .order('project_number');
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
