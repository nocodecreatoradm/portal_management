/**
 * Migration Script: Base64 to Supabase Storage (v2 - fixed timeouts)
 * 
 * Fixes from v1:
 * - Fetches canton_fair_suppliers ONE ROW AT A TIME to avoid 67MB timeout
 * - Better error serialization for logging
 * - Handles text columns (brands.image) correctly
 * - Adds chunked processing for large base64 strings
 */

import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite env variables
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
// @ts-ignore - Vite env variables  
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'rd-files';

/**
 * Serialize error for logging
 */
function errorMsg(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  if (err.statusCode) return `HTTP ${err.statusCode}: ${err.error || 'Unknown'}`;
  try {
    const s = JSON.stringify(err);
    return s === '{}' ? String(err) : s;
  } catch {
    return String(err);
  }
}

/**
 * Convert a base64 data URL to a Blob
 */
function base64ToBlob(base64DataUrl: string): { blob: Blob; extension: string; mimeType: string } {
  const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  
  // Use chunked decoding for large base64 strings to avoid memory issues
  const chunkSize = 512 * 1024; // 512KB chunks
  const byteArrays: Uint8Array[] = [];
  
  for (let offset = 0; offset < base64Data.length; offset += chunkSize) {
    const chunk = base64Data.slice(offset, offset + chunkSize);
    const byteCharacters = atob(chunk);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    byteArrays.push(byteNumbers);
  }
  
  const blob = new Blob(byteArrays, { type: mimeType });
  
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg', 'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
  };
  
  return { blob, extension: extMap[mimeType] || 'bin', mimeType };
}

/**
 * Upload a blob to Supabase Storage with retry
 */
async function uploadToStorage(path: string, blob: Blob): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { cacheControl: '3600', upsert: true });

    if (error) {
      if (attempt < 3) {
        console.warn(`  ⚠️ Upload attempt ${attempt}/3 failed: ${errorMsg(error)}`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(`Upload failed after 3 attempts: ${errorMsg(error)}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return publicUrl;
  }
  throw new Error('Upload failed');
}

function isBase64DataUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:') && value.includes(';base64,');
}

// ============================================================
// CANTON FAIR SUPPLIERS - Process one at a time to avoid timeout
// ============================================================
async function migrateCantonFairSuppliers(): Promise<void> {
  console.log('📦 Migrating canton_fair_suppliers...');
  
  // First, get just the IDs and names (lightweight)
  const { data: supplierIds, error: listError } = await supabase
    .from('canton_fair_suppliers')
    .select('id, name')
    .order('name');

  if (listError || !supplierIds) {
    console.error('Failed to list canton_fair_suppliers: ' + errorMsg(listError));
    return;
  }

  console.log(`  Found ${supplierIds.length} suppliers to process`);

  for (const { id, name } of supplierIds) {
    console.log(`  Processing "${name}"...`);
    
    // Fetch ONE supplier at a time with all its binary data
    const { data: supplier, error: fetchErr } = await supabase
      .from('canton_fair_suppliers')
      .select('id, catalogues, images, logo, wechat_qr')
      .eq('id', id)
      .single();

    if (fetchErr || !supplier) {
      console.error(`  ❌ Failed to fetch "${name}": ${errorMsg(fetchErr)}`);
      continue;
    }

    const updates: Record<string, any> = {};
    let hasChanges = false;

    // Migrate catalogues
    if (supplier.catalogues && Array.isArray(supplier.catalogues) && supplier.catalogues.length > 0) {
      const migrated = [];
      for (let i = 0; i < supplier.catalogues.length; i++) {
        const cat = supplier.catalogues[i];
        const url = typeof cat === 'object' ? cat?.url : (typeof cat === 'string' ? cat : null);
        if (url && isBase64DataUrl(url)) {
          try {
            const { blob, extension } = base64ToBlob(url);
            const fileName = (typeof cat === 'object' && cat.name) || `catalogue_${i}`;
            const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `migration/canton-fair/${id}/catalogues/${safeName}.${extension}`;
            const publicUrl = await uploadToStorage(path, blob);
            const newItem = typeof cat === 'object' ? { ...cat, url: publicUrl } : publicUrl;
            migrated.push(newItem);
            hasChanges = true;
            console.log(`    ✅ Catalogue "${fileName}" migrated (${(blob.size/1024).toFixed(0)} KB)`);
          } catch (err) {
            console.error(`    ❌ Catalogue ${i} failed: ${errorMsg(err)}`);
            migrated.push(cat);
          }
        } else {
          migrated.push(cat);
        }
      }
      if (hasChanges) updates.catalogues = migrated;
    }

    // Migrate images
    if (supplier.images) {
      const result = await migrateJsonbField(supplier.images, `migration/canton-fair/${id}/images`);
      if (result.changed) { updates.images = result.value; hasChanges = true; }
    }

    // Migrate logo
    if (supplier.logo) {
      const result = await migrateJsonbField(supplier.logo, `migration/canton-fair/${id}/logo`);
      if (result.changed) { updates.logo = result.value; hasChanges = true; }
    }

    // Migrate wechat_qr
    if (supplier.wechat_qr) {
      const result = await migrateJsonbField(supplier.wechat_qr, `migration/canton-fair/${id}/wechat_qr`);
      if (result.changed) { updates.wechat_qr = result.value; hasChanges = true; }
    }

    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('canton_fair_suppliers')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error(`  ❌ Failed to update "${name}": ${errorMsg(updateError)}`);
      } else {
        console.log(`  ✅ "${name}" updated successfully`);
      }
    } else {
      console.log(`  ⏭ No base64 data in "${name}"`);
    }
    
    // Small delay between suppliers to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
}

// ============================================================
// BRANDS - Fetch one at a time (image is a large text column)
// ============================================================
async function migrateBrands(): Promise<void> {
  console.log('📦 Migrating brands...');
  
  // Get IDs first (lightweight)
  const { data: brandIds, error: listError } = await supabase
    .from('brands')
    .select('id, name');

  if (listError || !brandIds) {
    console.error('Failed to list brands: ' + errorMsg(listError));
    return;
  }

  for (const { id, name } of brandIds) {
    // Fetch one brand at a time
    const { data: brand, error: fetchErr } = await supabase
      .from('brands')
      .select('id, name, image')
      .eq('id', id)
      .single();

    if (fetchErr || !brand) {
      console.error(`  ❌ Failed to fetch brand "${name}": ${errorMsg(fetchErr)}`);
      continue;
    }

    if (brand.image && isBase64DataUrl(brand.image)) {
      try {
        const sizeKB = (brand.image.length / 1024).toFixed(0);
        console.log(`  Processing brand "${name}" (${sizeKB} KB)...`);
        
        const { blob, extension } = base64ToBlob(brand.image);
        const path = `migration/brands/${id}/logo.${extension}`;
        const publicUrl = await uploadToStorage(path, blob);

        const { error: updateError } = await supabase
          .from('brands')
          .update({ image: publicUrl })
          .eq('id', id);

        if (updateError) {
          console.error(`  ❌ Failed to update brand "${name}": ${errorMsg(updateError)}`);
        } else {
          console.log(`  ✅ Brand "${name}" migrated (${sizeKB} KB → URL)`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to migrate brand "${name}": ${errorMsg(err)}`);
      }
    } else {
      console.log(`  ⏭ Brand "${name}" has no base64 image`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
}

// ============================================================
// BRANDBOOK SETTINGS
// ============================================================
async function migrateBrandbookSettings(): Promise<void> {
  console.log('📦 Migrating brandbook_settings...');
  
  const { data: settings, error } = await supabase
    .from('brandbook_settings')
    .select('id, hero_image');

  if (error || !settings) {
    console.error('Failed to fetch brandbook_settings: ' + errorMsg(error));
    return;
  }

  for (const setting of settings) {
    if (setting.hero_image && isBase64DataUrl(setting.hero_image)) {
      try {
        const sizeKB = (setting.hero_image.length / 1024).toFixed(0);
        console.log(`  Processing hero image (${sizeKB} KB)...`);
        
        const { blob, extension } = base64ToBlob(setting.hero_image);
        const path = `migration/brandbook/${setting.id}/hero.${extension}`;
        const publicUrl = await uploadToStorage(path, blob);

        const { error: updateError } = await supabase
          .from('brandbook_settings')
          .update({ hero_image: publicUrl })
          .eq('id', setting.id);

        if (updateError) {
          console.error(`  ❌ Failed to update brandbook: ${errorMsg(updateError)}`);
        } else {
          console.log(`  ✅ Brandbook hero image migrated (${sizeKB} KB → URL)`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to migrate brandbook hero: ${errorMsg(err)}`);
      }
    } else {
      console.log(`  ⏭ No base64 hero image found`);
    }
  }
}

// ============================================================
// PRODUCTS (explode_files) - Fetch one at a time
// ============================================================
async function migrateProducts(): Promise<void> {
  console.log('📦 Migrating products explode_files...');
  
  const { data: productIds, error: listError } = await supabase
    .from('products')
    .select('id, sap_code');

  if (listError || !productIds) {
    console.error('Failed to list products: ' + errorMsg(listError));
    return;
  }

  for (const { id, sap_code } of productIds) {
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, sap_code, explode_files')
      .eq('id', id)
      .single();

    if (fetchErr || !product) {
      console.error(`  ❌ Failed to fetch product ${sap_code || id}: ${errorMsg(fetchErr)}`);
      continue;
    }

    if (!product.explode_files || !Array.isArray(product.explode_files) || product.explode_files.length === 0) {
      console.log(`  ⏭ Product ${sap_code || id}: no explode_files`);
      continue;
    }

    const migratedFiles = [];
    let hasChanges = false;

    for (let i = 0; i < product.explode_files.length; i++) {
      const group = product.explode_files[i];
      if (group && group.files && Array.isArray(group.files)) {
        const migratedGroupFiles = [];
        for (let j = 0; j < group.files.length; j++) {
          const file = group.files[j];
          if (file && file.url && isBase64DataUrl(file.url)) {
            try {
              const { blob, extension } = base64ToBlob(file.url);
              const safeName = (file.name || `file_${j}`).replace(/[^a-zA-Z0-9._-]/g, '_');
              const path = `migration/products/${id}/explode/${i}_${safeName}.${extension}`;
              const publicUrl = await uploadToStorage(path, blob);
              migratedGroupFiles.push({ ...file, url: publicUrl });
              hasChanges = true;
              console.log(`  ✅ Product ${sap_code}: "${file.name}" migrated (${(blob.size/1024).toFixed(0)} KB)`);
            } catch (err) {
              console.error(`  ❌ Product ${sap_code} file failed: ${errorMsg(err)}`);
              migratedGroupFiles.push(file);
            }
          } else {
            migratedGroupFiles.push(file);
          }
        }
        migratedFiles.push({ ...group, files: migratedGroupFiles });
      } else {
        migratedFiles.push(group);
      }
    }

    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ explode_files: migratedFiles })
        .eq('id', id);

      if (updateError) {
        console.error(`  ❌ Failed to update product ${sap_code}: ${errorMsg(updateError)}`);
      } else {
        console.log(`  ✅ Product ${sap_code} updated`);
      }
    }
  }
}

// ============================================================
// GENERIC JSONB FIELD MIGRATOR
// ============================================================
async function migrateJsonbField(
  value: any,
  basePath: string
): Promise<{ value: any; changed: boolean }> {
  if (!value) return { value, changed: false };

  if (typeof value === 'string' && isBase64DataUrl(value)) {
    try {
      const { blob, extension } = base64ToBlob(value);
      const path = `${basePath}/file.${extension}`;
      const publicUrl = await uploadToStorage(path, blob);
      console.log(`    ✅ Field migrated (${(blob.size/1024).toFixed(0)} KB)`);
      return { value: publicUrl, changed: true };
    } catch (err) {
      console.error(`    ❌ Field migration failed: ${errorMsg(err)}`);
      return { value, changed: false };
    }
  }

  if (Array.isArray(value)) {
    let changed = false;
    const newArr = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === 'string' && isBase64DataUrl(item)) {
        try {
          const { blob, extension } = base64ToBlob(item);
          const path = `${basePath}/${i}.${extension}`;
          const publicUrl = await uploadToStorage(path, blob);
          newArr.push(publicUrl);
          changed = true;
          console.log(`    ✅ Array item ${i} migrated (${(blob.size/1024).toFixed(0)} KB)`);
        } catch (err) {
          console.error(`    ❌ Array item ${i} failed: ${errorMsg(err)}`);
          newArr.push(item);
        }
      } else if (item && typeof item === 'object' && item.url && isBase64DataUrl(item.url)) {
        try {
          const { blob, extension } = base64ToBlob(item.url);
          const safeName = (item.name || `file_${i}`).replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${basePath}/${safeName}.${extension}`;
          const publicUrl = await uploadToStorage(path, blob);
          newArr.push({ ...item, url: publicUrl });
          changed = true;
          console.log(`    ✅ "${item.name || i}" migrated (${(blob.size/1024).toFixed(0)} KB)`);
        } catch (err) {
          console.error(`    ❌ "${item.name || i}" failed: ${errorMsg(err)}`);
          newArr.push(item);
        }
      } else {
        newArr.push(item);
      }
    }
    return { value: newArr, changed };
  }

  if (typeof value === 'object' && value.url && isBase64DataUrl(value.url)) {
    try {
      const { blob, extension } = base64ToBlob(value.url);
      const path = `${basePath}/file.${extension}`;
      const publicUrl = await uploadToStorage(path, blob);
      console.log(`    ✅ Object field migrated (${(blob.size/1024).toFixed(0)} KB)`);
      return { value: { ...value, url: publicUrl }, changed: true };
    } catch (err) {
      console.error(`    ❌ Object field failed: ${errorMsg(err)}`);
      return { value, changed: false };
    }
  }

  return { value, changed: false };
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export async function runBase64Migration(): Promise<void> {
  console.log('🚀 Starting Base64 → Storage Migration...');
  console.log('================================================');
  
  const startTime = Date.now();

  try {
    await migrateCantonFairSuppliers();
  } catch (err) {
    console.error('Canton Fair migration failed: ' + errorMsg(err));
  }

  try {
    await migrateBrands();
  } catch (err) {
    console.error('Brands migration failed: ' + errorMsg(err));
  }

  try {
    await migrateBrandbookSettings();
  } catch (err) {
    console.error('Brandbook migration failed: ' + errorMsg(err));
  }

  try {
    await migrateProducts();
  } catch (err) {
    console.error('Products migration failed: ' + errorMsg(err));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================');
  console.log(`✅ Migration completed in ${elapsed}s`);
  console.log('💡 Run VACUUM ANALYZE on affected tables to reclaim space');
}

if (typeof window !== 'undefined') {
  (window as any).runBase64Migration = runBase64Migration;
}
