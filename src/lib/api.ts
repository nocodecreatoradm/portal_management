import { supabase } from './supabase';
import { toast } from 'sonner';
import { CalculationRecord } from '../types';

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

export const fetchCalculationRecords = async (moduleId?: string): Promise<CalculationRecord[]> => {
  try {
    let query = supabase.from('calculation_records').select('*');
    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map(record => ({
      id: record.id,
      module_id: record.module_id,
      action_type: record.action_type,
      record_data: typeof record.record_data === 'string' ? record.record_data : JSON.stringify(record.record_data),
      user_email: record.user_id, // In this app, user_id field in calculation_records table stores the email
      project_name: record.project_name,
      sample_id: record.sample_id,
      description: record.description,
      timestamp: record.created_at
    })) as CalculationRecord[];
  } catch (error) {
    console.error('Error fetching records:', error);
    return [];
  }
};

export const deleteCalculationRecord = async (id: string) => {
  try {
    const { error } = await supabase.from('calculation_records').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting record:', error);
    toast.error('Error al eliminar el registro');
    return false;
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
    // Select only lightweight columns first; heavy binary data (catalogues, images, logo, wechat_qr)
    // will be loaded on-demand when viewing a specific supplier detail
    let query = supabase.from('canton_fair_suppliers').select(
      'id, year, name, factory_location, contact_name, website, ' +
      'innovation_rating, price_rating, manufacturing_rating, ' +
      'fob_prices, comments, phone, email, ' +
      'factory_visited, visit_date, visit_time, location_label, latitude, longitude, created_at, ' +
      'catalogues, images, logo, wechat_qr'
    );
    if (year) {
      query = query.eq('year', year);
    }
    const { data: suppliersData, error: suppliersError } = await query.order('name');
    if (suppliersError) throw suppliersError;

    const { data: productsData, error: productsError } = await supabase
      .from('canton_fair_products')
      .select('*');
    if (productsError) throw productsError;
    
    // Map snake_case to camelCase and link products
    return (suppliersData || []).map(s => ({
      id: s.id,
      year: s.year,
      name: s.name,
      factoryLocation: s.factory_location,
      contactName: s.contact_name,
      website: s.website,
      innovationRating: s.innovation_rating,
      priceRating: s.price_rating,
      manufacturingRating: s.manufacturing_rating,
      catalogues: s.catalogues,
      fobPrices: s.fob_prices,
      comments: s.comments,
      images: s.images,
      logo: s.logo,
      phone: s.phone,
      email: s.email,
      wechatQr: s.wechat_qr,
      factoryVisited: s.factory_visited,
      visitDate: s.visit_date,
      visitTime: s.visit_time,
      locationLabel: s.location_label,
      lat: s.latitude ? parseFloat(s.latitude) : undefined,
      lng: s.longitude ? parseFloat(s.longitude) : undefined,
      createdAt: s.created_at,
      featuredProducts: (productsData || [])
        .filter(p => p.supplier_id === s.id)
        .map(p => ({
          id: p.id,
          category: p.category,
          name: p.name,
          fobPrice: p.fob_price,
          targetBrand: p.target_brand,
          comments: p.comments,
          images: p.images
        }))
    }));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

export const saveCantonFairSupplier = async (supplier: any) => {
  try {
    const { featuredProducts, ...supplierData } = supplier;
    
    // Map camelCase to snake_case for the database
    const dbData: any = {
      year: supplierData.year,
      name: supplierData.name,
      factory_location: supplierData.factoryLocation,
      contact_name: supplierData.contactName,
      website: supplierData.website,
      innovation_rating: supplierData.innovationRating,
      price_rating: supplierData.priceRating,
      manufacturing_rating: supplierData.manufacturingRating,
      catalogues: supplierData.catalogues,
      fob_prices: supplierData.fobPrices,
      comments: supplierData.comments,
      images: supplierData.images,
      logo: supplierData.logo,
      phone: supplierData.phone,
      email: supplierData.email,
      wechat_qr: supplierData.wechatQr,
      factory_visited: supplierData.factoryVisited,
      visit_date: supplierData.visitDate || null,
      visit_time: supplierData.visitTime || null,
      location_label: supplierData.locationLabel,
      latitude: supplierData.lat,
      longitude: supplierData.lng
    };

    // Remove undefined fields and ID if it's not a UUID
    Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);
    if (supplierData.id && (typeof supplierData.id !== 'string' || supplierData.id.length < 20)) delete dbData.id;

    const { data, error } = await supabase
      .from('canton_fair_suppliers')
      .insert(dbData)
      .select()
      .single();
    
    if (error) throw error;

    if (featuredProducts && featuredProducts.length > 0) {
      const productsToInsert = featuredProducts.map((p: any) => ({
        supplier_id: data.id,
        category: p.category,
        name: p.name,
        fob_price: p.fobPrice,
        target_brand: p.targetBrand,
        comments: p.comments,
        images: p.images
      }));
      await supabase.from('canton_fair_products').insert(productsToInsert);
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
    const { featuredProducts, ...supplierData } = supplier;
    
    // Map camelCase to snake_case for the database
    const dbData: any = {
      year: supplierData.year,
      name: supplierData.name,
      factory_location: supplierData.factoryLocation,
      contact_name: supplierData.contactName,
      website: supplierData.website,
      innovation_rating: supplierData.innovationRating,
      price_rating: supplierData.priceRating,
      manufacturing_rating: supplierData.manufacturingRating,
      catalogues: supplierData.catalogues,
      fob_prices: supplierData.fobPrices,
      comments: supplierData.comments,
      images: supplierData.images,
      logo: supplierData.logo,
      phone: supplierData.phone,
      email: supplierData.email,
      wechat_qr: supplierData.wechatQr,
      factory_visited: supplierData.factoryVisited,
      visit_date: supplierData.visitDate || null,
      visit_time: supplierData.visitTime || null,
      location_label: supplierData.locationLabel,
      latitude: supplierData.lat,
      longitude: supplierData.lng
    };

    // Remove undefined fields
    Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);

    const { error } = await supabase
      .from('canton_fair_suppliers')
      .update(dbData)
      .eq('id', id);
    
    if (error) throw error;

    if (featuredProducts) {
      // First delete existing products
      await supabase.from('canton_fair_products').delete().eq('supplier_id', id);
      
      if (featuredProducts.length > 0) {
        const productsToInsert = featuredProducts.map((p: any) => ({
          supplier_id: id,
          category: p.category,
          name: p.name,
          fob_price: p.fobPrice,
          target_brand: p.targetBrand,
          comments: p.comments,
          images: p.images
        }));
        await supabase.from('canton_fair_products').insert(productsToInsert);
      }
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
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) return { success: true };

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
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return { year, attendees: [] };

    return {
      year: data.year,
      bannerImage: data.banner_image,
      attendees: data.attendees
    };
  } catch (error) {
    console.error('Error fetching settings:', error);
    return { year, attendees: [] };
  }
};

export const saveCantonFairSettings = async (settings: any) => {
  try {
    const dbSettings = {
      year: settings.year,
      banner_image: settings.bannerImage,
      attendees: settings.attendees
    };

    const { data, error } = await supabase
      .from('canton_fair_settings')
      .upsert(dbSettings, { onConflict: 'year' })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false };
  }
};
