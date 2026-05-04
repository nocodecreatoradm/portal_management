/**
 * Migration Script: Base64 to Supabase Storage
 * 
 * This script migrates base64-encoded files from database columns
 * to Supabase Storage (bucket: rd-files), then updates the DB
 * records with the public URLs.
 * 
 * Run from browser console while logged into the app, or as a standalone script.
 * 
 * Tables affected:
 * - canton_fair_suppliers (catalogues, images, logo, wechat_qr) - 67 MB → ~50 KB
 * - brands (image) - 3.3 MB → ~50 KB
 * - brandbook_settings (hero_image) - 400 KB → ~1 KB
 * - products (explode_files) - 760 KB → ~1 KB
 */

import { createClient } from '@supabase/supabase-js';

// @ts-ignore - Vite env variables
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
// @ts-ignore - Vite env variables  
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'rd-files';

/**
 * Convert a base64 data URL to a Blob
 */
function base64ToBlob(base64DataUrl: string): { blob: Blob; extension: string; mimeType: string } {
  const matches = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Determine file extension from mime type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
  };
  
  const extension = extMap[mimeType] || 'bin';
  return { blob, extension, mimeType };
}

/**
 * Upload a blob to Supabase Storage and return the public URL
 */
async function uploadToStorage(path: string, blob: Blob): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${path}: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Check if a string is a base64 data URL
 */
function isBase64DataUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:') && value.includes(';base64,');
}

/**
 * Migrate canton_fair_suppliers table
 */
async function migrateCantonFairSuppliers(): Promise<void> {
  console.log('📦 Migrating canton_fair_suppliers...');
  
  const { data: suppliers, error } = await supabase
    .from('canton_fair_suppliers')
    .select('id, name, catalogues, images, logo, wechat_qr');

  if (error || !suppliers) {
    console.error('Failed to fetch canton_fair_suppliers:', error);
    return;
  }

  for (const supplier of suppliers) {
    const updates: Record<string, any> = {};
    let hasChanges = false;

    // Migrate catalogues (JSONB array with base64 files)
    if (supplier.catalogues && Array.isArray(supplier.catalogues)) {
      const migratedCatalogues = [];
      for (let i = 0; i < supplier.catalogues.length; i++) {
        const cat = supplier.catalogues[i];
        if (cat && typeof cat === 'object' && cat.url && isBase64DataUrl(cat.url)) {
          try {
            const { blob, extension } = base64ToBlob(cat.url);
            const path = `migration/canton-fair/${supplier.id}/catalogues/${i}_${cat.name || 'file'}.${extension}`;
            const publicUrl = await uploadToStorage(path, blob);
            migratedCatalogues.push({ ...cat, url: publicUrl });
            console.log(`  ✅ Catalogue ${i} migrated for "${supplier.name}"`);
            hasChanges = true;
          } catch (err) {
            console.error(`  ❌ Failed to migrate catalogue ${i}:`, err);
            migratedCatalogues.push(cat); // Keep original on failure
          }
        } else if (cat && typeof cat === 'string' && isBase64DataUrl(cat)) {
          try {
            const { blob, extension } = base64ToBlob(cat);
            const path = `migration/canton-fair/${supplier.id}/catalogues/${i}.${extension}`;
            const publicUrl = await uploadToStorage(path, blob);
            migratedCatalogues.push(publicUrl);
            hasChanges = true;
          } catch (err) {
            migratedCatalogues.push(cat);
          }
        } else {
          migratedCatalogues.push(cat);
        }
      }
      if (hasChanges) updates.catalogues = migratedCatalogues;
    }

    // Migrate images (JSONB array/string with base64)
    if (supplier.images) {
      const migratedImages = await migrateJsonbField(supplier.images, `migration/canton-fair/${supplier.id}/images`);
      if (migratedImages.changed) {
        updates.images = migratedImages.value;
        hasChanges = true;
      }
    }

    // Migrate logo
    if (supplier.logo) {
      const migratedLogo = await migrateJsonbField(supplier.logo, `migration/canton-fair/${supplier.id}/logo`);
      if (migratedLogo.changed) {
        updates.logo = migratedLogo.value;
        hasChanges = true;
      }
    }

    // Migrate wechat_qr
    if (supplier.wechat_qr) {
      const migratedQr = await migrateJsonbField(supplier.wechat_qr, `migration/canton-fair/${supplier.id}/wechat_qr`);
      if (migratedQr.changed) {
        updates.wechat_qr = migratedQr.value;
        hasChanges = true;
      }
    }

    // Update the row
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('canton_fair_suppliers')
        .update(updates)
        .eq('id', supplier.id);

      if (updateError) {
        console.error(`  ❌ Failed to update supplier "${supplier.name}":`, updateError);
      } else {
        console.log(`  ✅ Updated supplier "${supplier.name}" successfully`);
      }
    } else {
      console.log(`  ⏭ No base64 data found in "${supplier.name}"`);
    }
  }
}

/**
 * Migrate brands table
 */
async function migrateBrands(): Promise<void> {
  console.log('📦 Migrating brands...');
  
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, image');

  if (error || !brands) {
    console.error('Failed to fetch brands:', error);
    return;
  }

  for (const brand of brands) {
    if (brand.image && isBase64DataUrl(brand.image)) {
      try {
        const { blob, extension } = base64ToBlob(brand.image);
        const path = `migration/brands/${brand.id}/logo.${extension}`;
        const publicUrl = await uploadToStorage(path, blob);

        const { error: updateError } = await supabase
          .from('brands')
          .update({ image: publicUrl })
          .eq('id', brand.id);

        if (updateError) {
          console.error(`  ❌ Failed to update brand "${brand.name}":`, updateError);
        } else {
          console.log(`  ✅ Brand "${brand.name}" image migrated (${(brand.image.length / 1024).toFixed(0)} KB → URL)`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to migrate brand "${brand.name}":`, err);
      }
    }
  }
}

/**
 * Migrate brandbook_settings table
 */
async function migrateBrandbookSettings(): Promise<void> {
  console.log('📦 Migrating brandbook_settings...');
  
  const { data: settings, error } = await supabase
    .from('brandbook_settings')
    .select('id, hero_image');

  if (error || !settings) {
    console.error('Failed to fetch brandbook_settings:', error);
    return;
  }

  for (const setting of settings) {
    if (setting.hero_image && isBase64DataUrl(setting.hero_image)) {
      try {
        const { blob, extension } = base64ToBlob(setting.hero_image);
        const path = `migration/brandbook/${setting.id}/hero.${extension}`;
        const publicUrl = await uploadToStorage(path, blob);

        const { error: updateError } = await supabase
          .from('brandbook_settings')
          .update({ hero_image: publicUrl })
          .eq('id', setting.id);

        if (updateError) {
          console.error(`  ❌ Failed to update brandbook_settings:`, updateError);
        } else {
          console.log(`  ✅ Brandbook hero image migrated`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to migrate brandbook hero:`, err);
      }
    }
  }
}

/**
 * Migrate products table (explode_files)
 */
async function migrateProducts(): Promise<void> {
  console.log('📦 Migrating products explode_files...');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, sap_code, explode_files');

  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return;
  }

  for (const product of products) {
    if (!product.explode_files || !Array.isArray(product.explode_files) || product.explode_files.length === 0) {
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
              const path = `migration/products/${product.id}/explode/${i}_${safeName}.${extension}`;
              const publicUrl = await uploadToStorage(path, blob);
              migratedGroupFiles.push({ ...file, url: publicUrl });
              hasChanges = true;
              console.log(`  ✅ Product ${product.sap_code || product.id}: file "${file.name}" migrated`);
            } catch (err) {
              console.error(`  ❌ Failed to migrate file:`, err);
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
        .eq('id', product.id);

      if (updateError) {
        console.error(`  ❌ Failed to update product:`, updateError);
      }
    }
  }
}

/**
 * Generic helper to migrate a JSONB field that may contain base64 strings
 */
async function migrateJsonbField(
  value: any,
  basePath: string
): Promise<{ value: any; changed: boolean }> {
  if (!value) return { value, changed: false };

  // If it's a string (base64 directly)
  if (typeof value === 'string' && isBase64DataUrl(value)) {
    try {
      const { blob, extension } = base64ToBlob(value);
      const path = `${basePath}/file.${extension}`;
      const publicUrl = await uploadToStorage(path, blob);
      return { value: publicUrl, changed: true };
    } catch {
      return { value, changed: false };
    }
  }

  // If it's an array
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
        } catch {
          newArr.push(item);
        }
      } else if (item && typeof item === 'object') {
        // Object with url field
        if (item.url && isBase64DataUrl(item.url)) {
          try {
            const { blob, extension } = base64ToBlob(item.url);
            const safeName = (item.name || `file_${i}`).replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${basePath}/${safeName}.${extension}`;
            const publicUrl = await uploadToStorage(path, blob);
            newArr.push({ ...item, url: publicUrl });
            changed = true;
          } catch {
            newArr.push(item);
          }
        } else {
          newArr.push(item);
        }
      } else {
        newArr.push(item);
      }
    }
    return { value: newArr, changed };
  }

  // If it's an object with url property
  if (typeof value === 'object' && value.url && isBase64DataUrl(value.url)) {
    try {
      const { blob, extension } = base64ToBlob(value.url);
      const path = `${basePath}/file.${extension}`;
      const publicUrl = await uploadToStorage(path, blob);
      return { value: { ...value, url: publicUrl }, changed: true };
    } catch {
      return { value, changed: false };
    }
  }

  return { value, changed: false };
}

/**
 * Run the full migration
 */
export async function runBase64Migration(): Promise<void> {
  console.log('🚀 Starting Base64 → Storage Migration...');
  console.log('================================================');
  
  const startTime = Date.now();

  await migrateCantonFairSuppliers();
  await migrateBrands();
  await migrateBrandbookSettings();
  await migrateProducts();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('================================================');
  console.log(`✅ Migration completed in ${elapsed}s`);
  console.log('💡 Run VACUUM ANALYZE on affected tables to reclaim space');
}

// Make available globally for console usage
if (typeof window !== 'undefined') {
  (window as any).runBase64Migration = runBase64Migration;
}
