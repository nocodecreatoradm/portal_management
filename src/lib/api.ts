import { supabase } from './supabase';
import { toast } from 'sonner';

export const saveCalculationRecord = async (
  moduleId: string, 
  actionType: string, 
  data: any, 
  userId: string,
  projectName?: string,
  sampleId?: string,
  description?: string
) => {
  try {
    const { data: result, error } = await supabase
      .from('calculation_records')
      .insert({
        module_id: moduleId,
        action_type: actionType,
        record_data: data,
        user_id: userId,
        project_name: projectName,
        sample_id: sampleId,
        description: description
      })
      .select()
      .single();

    if (error) throw error;
    console.log(`Record saved to database with ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error('Error saving record:', error);
    toast.error('Error al guardar registro en la base de datos');
  }
};

export const fetchCalculationRecords = async (moduleId?: string) => {
  try {
    let query = supabase.from('calculation_records').select('*');
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching records:', error);
    return [];
  }
};

export const generateModuleCorrelative = async (moduleId: string, projectName: string) => {
  try {
    const records = await fetchCalculationRecords(moduleId);
    const count = records.length + 1;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefixMap: Record<string, string> = {
      'water_demand': 'WD',
      'gas_heater_experimental': 'GH',
      'absorption_calculation': 'AB',
      'temperature_loss': 'TL',
      'cr_ni_coating_analysis': 'CN',
      'canton_fair': 'CF'
    };
    const prefix = prefixMap[moduleId] || 'CALC';
    const projectSlug = projectName.substring(0, 10).toUpperCase().replace(/\s+/g, '-');
    return `${prefix}-${date}-${projectSlug}-${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating correlative:', error);
    return `CALC-${Date.now()}`;
  }
};

export const fetchCantonFairSuppliers = async (year?: number) => {
  try {
    let query = supabase.from('canton_fair_suppliers').select('*, featured_products:canton_fair_products(*)');
    if (year) {
      query = query.eq('year', year);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

export const saveCantonFairSupplier = async (supplier: any) => {
  try {
    const { products, ...supplierData } = supplier;
    const { data, error } = await supabase
      .from('canton_fair_suppliers')
      .insert(supplierData)
      .select()
      .single();
    
    if (error) throw error;

    if (products && products.length > 0) {
      const productsWithId = products.map((p: any) => ({ ...p, supplier_id: data.id }));
      await supabase.from('canton_fair_products').insert(productsWithId);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error saving supplier:', error);
    toast.error('Error al guardar proveedor');
    return { success: false };
  }
};

export const updateCantonFairSupplier = async (id: string, supplier: any) => {
  try {
    const { products, ...supplierData } = supplier;
    const { error } = await supabase
      .from('canton_fair_suppliers')
      .update(supplierData)
      .eq('id', id);
    
    if (error) throw error;

    // Simplistic product update: delete and re-insert
    if (products) {
      await supabase.from('canton_fair_products').delete().eq('supplier_id', id);
      const productsWithId = products.map((p: any) => ({ ...p, supplier_id: id }));
      await supabase.from('canton_fair_products').insert(productsWithId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating supplier:', error);
    toast.error('Error al actualizar proveedor');
    return { success: false };
  }
};

export const deleteCantonFairSupplier = async (id: string) => {
  try {
    const { error } = await supabase.from('canton_fair_suppliers').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    toast.error('Error al eliminar proveedor');
    return { success: false };
  }
};

export const fetchCantonFairSettings = async (year: number) => {
  try {
    const { data, error } = await supabase
      .from('canton_fair_settings')
      .select('*')
      .eq('year', year)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data || { year, attendees: [] };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { year, attendees: [] };
  }
};

export const saveCantonFairSettings = async (settings: any) => {
  try {
    const { data, error } = await supabase
      .from('canton_fair_settings')
      .upsert(settings, { onConflict: 'year' })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false };
  }
};
