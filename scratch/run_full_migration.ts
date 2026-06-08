import { createClient } from '@supabase/supabase-js';
import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const dbConfig: sql.config = {
  user: process.env.DB_USER || 'soledbserveradmin',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'soledbserver.database.windows.net',
  database: process.env.DB_NAME || 'soledb-puntoventa',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const mapRoleIntToUUID = (id: number | string) => '00000000-0000-0000-0000-' + String(id).padStart(12, '0');

const isValidUUID = (val: any): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};



// Table order for deletion (reverse dependency order to avoid foreign key conflicts)
const TABLES_TO_CLEAN = [
  'audit_logs',
  'rd_custom_projects',
  'rd_project_templates',
  'approver_configs',
  'brand_documents',
  'brandbook_settings',
  'ntp_regulations',
  'calendar_tasks',
  'innovation_proposals',
  'energy_efficiency_records',
  'project_activities',
  'projects',
  'rd_inventory',
  'product_management',
  'products',
  'samples',
  'inspection_templates',
  'categories',
  'product_lines',
  'suppliers',
  'brands',
  'role_permissions',
  'profiles',
  'permissions',
  'roles',
  'canton_fair_products',
  'canton_fair_suppliers',
  'canton_fair_settings',
  'calculation_records'
];

async function ensureSupportTables(pool: sql.ConnectionPool) {
  console.log('\n⚙️ Checking and creating support tables if missing in SQL Server...');
  
  // CANTON_FAIR_SUPPLIERS
  await pool.request().query(`
    IF OBJECT_ID('ID_PORTAL.canton_fair_suppliers', 'U') IS NULL
    BEGIN
        CREATE TABLE ID_PORTAL.canton_fair_suppliers (
            id uniqueidentifier PRIMARY KEY DEFAULT newid(),
            [year] int NOT NULL,
            name nvarchar(255) NOT NULL,
            factory_location nvarchar(max),
            contact_name nvarchar(255),
            website nvarchar(255),
            innovation_rating int,
            price_rating int,
            manufacturing_rating int,
            catalogues nvarchar(max),
            fob_prices nvarchar(max),
            comments nvarchar(max),
            images nvarchar(max),
            logo nvarchar(max),
            agreements nvarchar(max),
            quotations nvarchar(max),
            phone nvarchar(100),
            email nvarchar(255),
            wechat_qr nvarchar(max),
            factory_visited bit DEFAULT 0,
            visit_date datetime2,
            visit_time nvarchar(50),
            location_label nvarchar(255),
            latitude decimal(18, 10),
            longitude decimal(18, 10),
            created_at datetime2 DEFAULT GETDATE(),
            updated_at datetime2 DEFAULT GETDATE()
        );
        PRINT 'Created table ID_PORTAL.canton_fair_suppliers';
    END
  `);

  // CANTON_FAIR_PRODUCTS
  await pool.request().query(`
    IF OBJECT_ID('ID_PORTAL.canton_fair_products', 'U') IS NULL
    BEGIN
        CREATE TABLE ID_PORTAL.canton_fair_products (
            id uniqueidentifier PRIMARY KEY DEFAULT newid(),
            category nvarchar(100) NOT NULL,
            name nvarchar(255) NOT NULL,
            fob_price nvarchar(100),
            target_brand nvarchar(100),
            comments nvarchar(max),
            images nvarchar(max),
            supplier_id uniqueidentifier REFERENCES ID_PORTAL.canton_fair_suppliers(id) ON DELETE CASCADE,
            created_at datetime2 DEFAULT GETDATE(),
            updated_at datetime2 DEFAULT GETDATE()
        );
        PRINT 'Created table ID_PORTAL.canton_fair_products';
    END
  `);

  // CANTON_FAIR_SETTINGS
  await pool.request().query(`
    IF OBJECT_ID('ID_PORTAL.canton_fair_settings', 'U') IS NULL
    BEGIN
        CREATE TABLE ID_PORTAL.canton_fair_settings (
            [year] int PRIMARY KEY,
            banner_image nvarchar(max),
            attendees nvarchar(max),
            created_at datetime2 DEFAULT GETDATE(),
            updated_at datetime2 DEFAULT GETDATE()
        );
        PRINT 'Created table ID_PORTAL.canton_fair_settings';
    END
  `);

  // CALCULATION_RECORDS
  await pool.request().query(`
    IF OBJECT_ID('ID_PORTAL.calculation_records', 'U') IS NULL
    BEGIN
        CREATE TABLE ID_PORTAL.calculation_records (
            id int IDENTITY(1,1) PRIMARY KEY,
            module_id nvarchar(100) NOT NULL,
            action_type nvarchar(100) NOT NULL,
            record_data nvarchar(max) NOT NULL,
            user_id nvarchar(255) NOT NULL,
            project_name nvarchar(255),
            sample_id nvarchar(255),
            [description] nvarchar(max),
            created_at datetime2 DEFAULT GETDATE()
        );
        PRINT 'Created table ID_PORTAL.calculation_records';
    END
  `);
  
  console.log('✅ Support tables verified.');
}

async function insertRow(pool: sql.ConnectionPool, table: string, data: Record<string, any>) {
  const keys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null);
  if (keys.length === 0) return;
  const columns = keys.map(k => `[${k}]`).join(', ');
  const placeholders = keys.map((_, i) => `@param_${i}`).join(', ');
  
  let query = `INSERT INTO ID_PORTAL.${table} (${columns}) VALUES (${placeholders})`;
  
  // Wrap with IDENTITY_INSERT if table has an IDENTITY column and we are providing 'id'
  const useIdentityInsert = (table === 'permissions' || table === 'calculation_records') && data.id !== undefined && data.id !== null;
  if (useIdentityInsert) {
    query = `SET IDENTITY_INSERT ID_PORTAL.${table} ON; ${query}; SET IDENTITY_INSERT ID_PORTAL.${table} OFF;`;
  }

  const request = pool.request();
  keys.forEach((key, i) => {
    let val = data[key];
    
    if (val instanceof Date) {
      request.input(`param_${i}`, sql.DateTime2, val);
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      request.input(`param_${i}`, sql.DateTime2, new Date(val));
    } else if (typeof val === 'object') {
      request.input(`param_${i}`, sql.NVarChar(sql.MAX), JSON.stringify(val));
    } else {
      request.input(`param_${i}`, val);
    }
  });

  await request.query(query);
}

async function migrateTable(
  pool: sql.ConnectionPool,
  supabaseTable: string,
  sqlTable: string,
  mapper?: (row: any) => Record<string, any>
) {
  console.log(`\n📦 Migrating table: ${supabaseTable} -> ${sqlTable}...`);
  try {
    const { data: rows, error } = await supabase.from(supabaseTable).select('*');
    if (error) {
      console.warn(`⚠️ Could not fetch from Supabase table '${supabaseTable}':`, error.message);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log(`⏭ Supabase table '${supabaseTable}' is empty.`);
      return;
    }

    console.log(`🔍 Fetched ${rows.length} rows from Supabase. Importing...`);
    let count = 0;
    for (const row of rows) {
      try {
        const mappedRow = mapper ? mapper(row) : row;
        
        if (!mapper) {
          if (mappedRow.created_at !== undefined) delete mappedRow.created_at;
          if (mappedRow.updated_at !== undefined) delete mappedRow.updated_at;
        }

        await insertRow(pool, sqlTable, mappedRow);
        count++;
      } catch (insertErr: any) {
        console.error(`❌ Failed to insert row ID ${row.id || 'N/A'}:`, insertErr.message);
      }
    }
    console.log(`✅ Successfully migrated ${count}/${rows.length} rows.`);
  } catch (err: any) {
    console.error(`❌ Error migrating table '${supabaseTable}':`, err.message);
  }
}

async function runMigration() {
  console.log('==================================================');
  console.log('🚀 STARTING FULL CLEAN AND LIVE MIGRATION FROM SUPABASE');
  console.log('==================================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`SQL Server: ${dbConfig.server} | Database: ${dbConfig.database}\n`);

  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await sql.connect(dbConfig);
    console.log('🔌 Connected to MS SQL Server.');

    // --- PHASE 1: ENSURE SUPPORT TABLES ---
    await ensureSupportTables(pool);

    // --- PHASE 2: CLEAN SQL SERVER TABLES ---
    console.log('\n🧹 Clearing existing records in SQL Server...');
    for (const table of TABLES_TO_CLEAN) {
      try {
        const query = `DELETE FROM ID_PORTAL.[${table}]`;
        await pool.request().query(query);
        console.log(`  🗑️ Cleared ID_PORTAL.[${table}]`);
      } catch (err: any) {
        console.warn(`  ⚠️ Could not clear table ID_PORTAL.[${table}]: ${err.message}`);
      }
    }
    console.log('✨ SQL Server tables cleared successfully.');

    // --- PHASE 3: GENERATE DEFAULT PASSWORD HASH ---
    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    console.log(`🔑 Generated default password hash for migrated users: ${defaultPasswordHash}`);

    // --- PHASE 4: LIVE MIGRATION ---

    // Fetch roles from Supabase first to build role name to UUID mapping
    console.log('\n🔍 Fetching roles from Supabase to prepare UUID mapping...');
    const { data: supabaseRoles, error: rolesFetchError } = await supabase.from('roles').select('*');
    if (rolesFetchError) {
      throw new Error(`Failed to fetch roles from Supabase: ${rolesFetchError.message}`);
    }
    const roleNameToUUID: Record<string, string> = {};
    if (supabaseRoles) {
      for (const r of supabaseRoles) {
        roleNameToUUID[r.name] = mapRoleIntToUUID(r.id);
      }
    }
    console.log(`Mapped ${Object.keys(roleNameToUUID).length} roles to UUIDs.`);

    // 1. Roles
    await migrateTable(pool, 'roles', 'roles', (row) => ({
      id: mapRoleIntToUUID(row.id),
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      level: row.level,
    }));

    // 2. Permissions
    await migrateTable(pool, 'permissions', 'permissions', (row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      module: row.module,
    }));

    // 3. Profiles (Users)
    await migrateTable(pool, 'profiles', 'profiles', (row) => {
      const mappedRoleId = row.role ? roleNameToUUID[row.role] : null;
      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        department: row.department,
        role: row.role,
        role_id: mappedRoleId,
        password_hash: row.password_hash || defaultPasswordHash,
        is_active: row.is_active !== undefined ? row.is_active : true,
      };
    });

    // 4. Role Permissions
    await migrateTable(pool, 'role_permissions', 'role_permissions', (row) => ({
      role_id: mapRoleIntToUUID(row.role_id),
      permission_id: row.permission_id,
    }));

    // 5. Brands
    await migrateTable(pool, 'brands', 'brands');

    // 6. Suppliers
    await migrateTable(pool, 'suppliers', 'suppliers', (row) => ({
      id: row.id,
      legal_name: row.legal_name,
      commercial_alias: row.commercial_alias,
      erp_code: row.erp_code,
      country: row.country,
      logo_url: row.logo_url,
      contacts: row.contacts,
      website: row.website,
      wechat: row.wechat,
      email: row.email,
      evaluation: row.evaluation,
      quotations: row.quotations,
    }));

    // 7. Product Lines
    await migrateTable(pool, 'product_lines', 'product_lines');

    // 8. Categories
    await migrateTable(pool, 'categories', 'categories', (row) => ({
      id: row.id,
      name: row.name,
      product_line_id: row.line_id,
    }));

    // 9. Inspection Templates
    await migrateTable(pool, 'inspection_templates', 'inspection_templates', (row) => ({
      id: row.id,
      category_id: row.category_id,
      name: row.name,
      form_structure: row.form_structure,
      workflow_structure: row.workflow_structure,
      procedure_file: row.procedure_file,
    }));

    // 10. Samples
    await migrateTable(pool, 'samples', 'samples', (row) => ({
      id: row.id,
      correlative_id: row.correlative_id,
      version: row.version,
      codigo_sap: row.sap_code,
      descripcion_sap: row.sap_description,
      brand_id: isValidUUID(row.brand_id) ? row.brand_id : null,
      supplier_id: isValidUUID(row.supplier_id) ? row.supplier_id : null,
      line_id: isValidUUID(row.line_id) ? row.line_id : null,
      category_id: isValidUUID(row.category_id) ? row.category_id : null,
      sample_type: row.sample_type,
      inspection_date: row.inspection_date,
      inspection_status: row.inspection_status,
      report_date: row.report_date,
      report_file: row.report_file,
      initial_technical_datasheet: row.initial_technical_datasheet,
      technician: isValidUUID(row.technician_id) ? row.technician_id : null,
      planned_start_date: row.planned_start_date,
      inspection_progress: row.inspection_progress,
      inspection_completed_date: row.inspection_completed_date,
      inspection_timer: row.inspection_timer,
      inspection_form: row.inspection_form,
      workflow: row.workflow,
      info_requests: row.info_requests,
      provider_documents: row.provider_documents,
      gallery: row.gallery,
      reception_photo: row.reception_photo,
      received_by: row.received_by,
      warehouse_entry_date: row.warehouse_entry_date,
      calculation_ids: row.calculation_ids,
      history: row.history,
    }));

    // 11. Products
    await migrateTable(pool, 'products', 'products', (row) => ({
      id: row.id,
      correlative_id: row.correlative_id,
      sap_code: row.sap_code,
      ean_code: row.ean_code,
      sap_description: row.sap_description,
      brand_id: row.brand_id,
      supplier_id: row.supplier_id,
      line_id: row.line_id,
      sample_id: row.sample_id,
      category_id: row.category_id,
      commercial_status: row.commercial_status,
      quality_inspection_date: row.quality_inspection_date,
      fob_price: row.fob_price,
      fob_price_history: row.fob_price_history,
      explode_files: row.explode_files,
      additional_provider_documents: row.additional_provider_documents,
      gallery: row.gallery,
      artwork_assignment: row.artwork_assignment,
      technical_assignment: row.technical_assignment,
      commercial_assignment: row.commercial_assignment,
      tracking_type: row.tracking_type,
      linked_group_id: row.linked_group_id,
    }));

    // 12. Product Management
    await migrateTable(pool, 'product_management', 'product_management', (row) => ({
      id: row.id,
      correlative_id: row.correlative_id,
      sap_code: row.sap_code,
      sap_description: row.sap_description,
      ean_code: row.ean_code,
      brand_id: row.brand_id,
      supplier_id: row.supplier_id,
      line_id: row.line_id,
      sample_id: row.sample_id,
      category_id: row.category_id,
      fob_price: row.fob_price,
      fob_price_history: row.fob_price_history,
      explode_files: row.explode_files,
      additional_provider_documents: row.additional_provider_documents,
      gallery: row.gallery,
      approved_documents: row.approved_documents,
      artwork_assignment: row.artwork_assignment,
      technical_assignment: row.technical_assignment,
      commercial_assignment: row.commercial_assignment,
    }));

    // 13. R&D Inventory
    await migrateTable(pool, 'rd_inventory', 'rd_inventory', (row) => ({
      id: row.id,
      serial_number: row.serial_number,
      description: row.description,
      responsible: row.responsible_id,
      acquisition_date: row.acquisition_date,
      startup_date: row.startup_date,
      calibration_status: row.calibration_status,
      category: row.category,
      equipment_type: row.equipment_type,
      source_type: row.source_type,
      brand: row.brand,
      model: row.model,
      equipment_range: row.equipment_range,
      supplier_or_equipment: row.supplier_or_equipment,
      calibration_registry: row.calibration_registry,
      revision_registry: row.revision_registry,
      certificate: row.certificate,
      certificate_history: row.certificates,
      revision_status: row.revision_status,
      assignment_registry: row.assignment_registry,
      last_calibration_date: row.last_calibration_date,
      next_calibration_date: row.next_calibration_date,
      photos: row.photos,
      manual: row.manual_file,
    }));

    // 14. Projects
    await migrateTable(pool, 'projects', 'projects', (row) => ({
      id: row.id,
      project_number: row.project_number,
      name: row.name,
      responsible: isValidUUID(row.responsible_id) ? row.responsible_id : null,
      progress: row.progress,
      status: row.status,
    }));

    // 15. Project Activities
    await migrateTable(pool, 'project_activities', 'project_activities', (row) => ({
      id: row.id,
      project_id: row.project_id,
      activity_number: row.activity_number,
      name: row.name,
      comments: row.comments,
      indicator: row.indicator,
      progress: row.progress,
      responsible: row.responsibles,
      classification: row.classification,
      planned_start_date: row.planned_start_date,
      planned_end_date: row.planned_end_date,
      actual_start_date: row.actual_start_date,
      actual_end_date: row.actual_end_date,
      status: row.status,
      daily_progress: row.daily_progress,
    }));

    // 16. Energy Efficiency Records
    await migrateTable(pool, 'energy_efficiency_records', 'energy_efficiency_records', (row) => ({
      id: row.id,
      codigo_mt: row.mt_code,
      descripcion: row.description,
      letra: row.letter,
      porcentaje_ee: row.ee_percentage,
      ocp: row.ocp,
      supplier_id: row.supplier_id,
      fecha_emision: row.emission_date,
      fecha_vigilancia: row.vigilance_date,
      tipo_producto: row.product_type,
      sample_id: row.sample_id,
      certificado_file: row.certificate_file,
      certificado_history: row.certificate_history,
      etiqueta_file: row.label_file,
      etiqueta_history: row.label_history,
      test_report_file: row.test_report_file,
      test_report_history: row.test_report_history,
      gallery: row.gallery,
    }));

    // 17. Innovation Proposals
    await migrateTable(pool, 'innovation_proposals', 'innovation_proposals', (row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      author: row.author_id,
      date: row.created_at,
      status: row.status,
      priority: row.priority,
      images: row.images,
      sketches: row.sketches,
      blueprints: row.blueprints,
      tags: row.tags,
      comments: row.comments,
    }));

    // 18. Calendar Tasks
    await migrateTable(pool, 'calendar_tasks', 'calendar_tasks', (row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      deadline: row.deadline,
      start_date: row.start_date,
      end_date: row.end_date,
      type: row.task_type,
      requester: isValidUUID(row.requester_id) ? row.requester_id : null,
      assignee: isValidUUID(row.assignee_id) ? row.assignee_id : null,
      status: row.status,
      delivery_status: row.delivery_status,
      change_log: row.change_log,
    }));

    // 19. NTP Regulations
    await migrateTable(pool, 'ntp_regulations', 'ntp_regulations', (row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      category: row.category,
      upload_date: row.upload_date,
      file: row.file_info,
      description: row.description,
    }));

    // 20. Brandbook Settings
    await migrateTable(pool, 'brandbook_settings', 'brandbook_settings', (row) => ({
      id: row.id,
      hero_image: row.hero_image,
    }));

    // 21. Brand Documents (Custom migration to handle foreign keys and self-reference)
    console.log(`\n📦 Migrating table: brand_documents -> brand_documents (with FK sanitization)...`);
    try {
      const { data: rows, error } = await supabase.from('brand_documents').select('*');
      if (error) {
        console.warn(`⚠️ Could not fetch from Supabase table 'brand_documents':`, error.message);
      } else if (!rows || rows.length === 0) {
        console.log(`⏭ Supabase table 'brand_documents' is empty.`);
      } else {
        console.log(`🔍 Fetched ${rows.length} rows from Supabase. Querying valid brand IDs...`);
        const brandIdsRes = await pool.request().query('SELECT id FROM ID_PORTAL.brands');
        const validBrandIds = new Set(brandIdsRes.recordset.map(r => r.id.toLowerCase()));
        
        console.log(`Importing brand documents with parent_id deferred...`);
        const deferredParents: { id: string; parent_id: string }[] = [];
        let count = 0;
        
        for (const row of rows) {
          try {
            const mappedRow = {
              id: row.id,
              brand_id: (row.brand_id && validBrandIds.has(row.brand_id.toLowerCase())) ? row.brand_id : null,
              parent_id: null, // Defer parent_id insertion
              name: row.name,
              type: row.type,
              modified: row.modified_at,
              modified_by: row.modified_by,
              versions: row.versions,
            };
            
            await insertRow(pool, 'brand_documents', mappedRow);
            if (row.parent_id) {
              deferredParents.push({ id: row.id, parent_id: row.parent_id });
            }
            count++;
          } catch (insertErr: any) {
            console.error(`❌ Failed to insert brand document row ID ${row.id}:`, insertErr.message);
          }
        }
        
        console.log(`✅ Staged ${count}/${rows.length} brand documents. Resolving deferred parent_id self-references...`);
        let resolvedCount = 0;
        for (const item of deferredParents) {
          try {
            await pool.request()
              .input('id', item.id)
              .input('parent_id', item.parent_id)
              .query('UPDATE ID_PORTAL.brand_documents SET parent_id = @parent_id WHERE id = @id');
            resolvedCount++;
          } catch (updateErr: any) {
            console.warn(`  ⚠️ Could not link document ${item.id} to parent ${item.parent_id}: ${updateErr.message}`);
          }
        }
        console.log(`✅ Successfully resolved ${resolvedCount}/${deferredParents.length} parent links.`);
      }
    } catch (err: any) {
      console.error(`❌ Error migrating table 'brand_documents':`, err.message);
    }

    // 22. Approver Configs
    await migrateTable(pool, 'approver_configs', 'approver_configs', (row) => ({
      id: row.id,
      id_approver: row.id_approver,
      mkt_approver: row.mkt_approver,
      plan_approver: row.plan_approver,
      prov_approver: row.prov_approver,
      is_active: row.is_active !== undefined ? row.is_active : true,
    }));

    // 23. RD Project Templates
    await migrateTable(pool, 'rd_project_templates', 'rd_project_templates');

    // 24. RD Custom Projects
    await migrateTable(pool, 'rd_custom_projects', 'rd_custom_projects', (row) => ({
      id: row.id,
      template_id: isValidUUID(row.template_id) ? row.template_id : null,
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      responsible_id: isValidUUID(row.responsible_id) ? row.responsible_id : null,
      start_date: row.start_date,
      end_date: row.end_date,
      sections: row.sections,
      attachments: row.attachments,
    }));

    // 25. Audit Logs
    await migrateTable(pool, 'audit_logs', 'audit_logs');

    // 26. Canton Fair Suppliers
    await migrateTable(pool, 'canton_fair_suppliers', 'canton_fair_suppliers', (row) => ({
      id: row.id,
      year: row.year,
      name: row.name,
      factory_location: row.factory_location,
      contact_name: row.contact_name,
      website: row.website,
      innovation_rating: row.innovation_rating,
      price_rating: row.price_rating,
      manufacturing_rating: row.manufacturing_rating,
      catalogues: row.catalogues,
      fob_prices: row.fob_prices,
      comments: row.comments,
      images: row.images,
      logo: row.logo,
      agreements: row.agreements,
      quotations: row.quotations,
      phone: row.phone,
      email: row.email,
      wechat_qr: row.wechat_qr,
      factory_visited: row.factory_visited !== undefined ? row.factory_visited : false,
      visit_date: row.visit_date,
      visit_time: row.visit_time,
      location_label: row.location_label,
      latitude: row.latitude,
      longitude: row.longitude,
    }));

    // 27. Canton Fair Products
    await migrateTable(pool, 'canton_fair_products', 'canton_fair_products', (row) => ({
      id: row.id,
      category: row.category,
      name: row.name,
      fob_price: row.fob_price,
      target_brand: row.target_brand,
      comments: row.comments,
      images: row.images,
      supplier_id: row.supplier_id,
    }));

    // 28. Canton Fair Settings
    await migrateTable(pool, 'canton_fair_settings', 'canton_fair_settings', (row) => ({
      year: row.year,
      banner_image: row.banner_image,
      attendees: row.attendees,
    }));

    // 29. Calculation Records
    await migrateTable(pool, 'calculation_records', 'calculation_records', (row) => ({
      id: row.id,
      module_id: row.module_id,
      action_type: row.action_type,
      record_data: row.record_data,
      user_id: row.user_id,
      project_name: row.project_name,
      sample_id: row.sample_id,
      description: row.description,
      created_at: row.created_at,
    }));

    console.log('\n==================================================');
    console.log('🎉 ALL LIVE MIGRATIONS FROM SUPABASE TO SQL SERVER COMPLETED!');
    console.log('==================================================');

  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Database connection closed.');
    }
  }
}

runMigration();
