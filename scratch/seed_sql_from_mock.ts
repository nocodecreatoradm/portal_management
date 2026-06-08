import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { 
  allUsers, 
  initialSuppliers, 
  initialSamples, 
  initialData, 
  initialProductManagement, 
  initialRDInventory, 
  initialProjects, 
  initialEnergyEfficiency, 
  initialCalendarTasks, 
  initialRDProjectTemplates, 
  initialRDProjects,
  initialApprovers
} from '../src/data/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

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

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function insertRow(pool: sql.ConnectionPool, table: string, data: Record<string, any>) {
  const keys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null);
  if (keys.length === 0) return;
  const columns = keys.map(k => `[${k}]`).join(', ');
  const placeholders = keys.map((_, i) => `@param_${i}`).join(', ');
  const query = `INSERT INTO ID_PORTAL.${table} (${columns}) VALUES (${placeholders})`;

  const request = pool.request();
  keys.forEach((key, i) => {
    let val = data[key];
    if (val instanceof Date) {
      request.input(`param_${i}`, sql.DateTime2, val);
    } else {
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      request.input(`param_${i}`, val);
    }
  });

  await request.query(query);
}

// Fixed UUIDs to preserve foreign key references
const fixedRoleIds: Record<string, string> = {
  'admin': '550e8400-e29b-41d4-a716-446655440000',
  'Gerente de Marketing': '550e8400-e29b-41d4-a716-446655440001',
  'Jefe de Marketing 1': '550e8400-e29b-41d4-a716-446655440002',
  'Jefe de Marketing 2': '550e8400-e29b-41d4-a716-446655440003',
  'Coordinador de I+D': '550e8400-e29b-41d4-a716-446655440004',
  'Gerente de Innovación y Calidad': '550e8400-e29b-41d4-a716-446655440005',
  'Jefe de Planeamiento': '550e8400-e29b-41d4-a716-446655440006',
  'Diseñadora Gráfica': '550e8400-e29b-41d4-a716-446655440007',
  'Proveedor': '550e8400-e29b-41d4-a716-446655440008',
  'Técnico de I+D': '550e8400-e29b-41d4-a716-446655440009',
};

const fixedUserIds: Record<string, string> = {
  'Carlos H.': '660e8400-e29b-41d4-a716-446655440001',
  'carlos.h@example.com': '660e8400-e29b-41d4-a716-446655440001',
  'carlos.hoyosf@pucp.pe': '660e8400-e29b-41d4-a716-446655440001',
  'Cristhian S.': '660e8400-e29b-41d4-a716-446655440002',
  'cristhian.s@example.com': '660e8400-e29b-41d4-a716-446655440002',
  'Monica M.': '660e8400-e29b-41d4-a716-446655440003',
  'monica.m@example.com': '660e8400-e29b-41d4-a716-446655440003',
  'Sandra S.': '660e8400-e29b-41d4-a716-446655440004',
  'sandra.s@example.com': '660e8400-e29b-41d4-a716-446655440004',
  'Ana P.': '660e8400-e29b-41d4-a716-446655440005',
  'ana.p@example.com': '660e8400-e29b-41d4-a716-446655440005',
  'Luis G.': '660e8400-e29b-41d4-a716-446655440006',
  'luis.g@example.com': '660e8400-e29b-41d4-a716-446655440006',
  'Diseñadora Gráfica': '660e8400-e29b-41d4-a716-446655440007',
  'designer@example.com': '660e8400-e29b-41d4-a716-446655440007',
  'Técnico de I+D': '660e8400-e29b-41d4-a716-446655440008',
  'tecnico@example.com': '660e8400-e29b-41d4-a716-446655440008',
  'Jonathan Soriano': '660e8400-e29b-41d4-a716-446655440009',
  'Fernando Lopez': '660e8400-e29b-41d4-a716-446655440010',
  'Anthony Soto': '660e8400-e29b-41d4-a716-446655440011',
};

const fixedBrandIds: Record<string, string> = {
  'SOLE': '770e8400-e29b-41d4-a716-446655440001',
  'S-Collection': '770e8400-e29b-41d4-a716-446655440002',
};

const fixedSupplierIds: Record<string, string> = {
  'AMERICAN': '880e8400-e29b-41d4-a716-446655440001',
  'AMERICAN WATER HEATER COMPANY': '880e8400-e29b-41d4-a716-446655440001',
  'ARCELIK': '880e8400-e29b-41d4-a716-446655440002',
  'ARCELIK A.S': '880e8400-e29b-41d4-a716-446655440002',
  'ARCELOR': '880e8400-e29b-41d4-a716-446655440003',
  'ARCELORMITTAL INTERNATIONAL': '880e8400-e29b-41d4-a716-446655440003',
  'ARDA': '880e8400-e29b-41d4-a716-446655440004',
  'ARDA (ZHEJIANG) ELECTRIC CO., LTD.': '880e8400-e29b-41d4-a716-446655440004',
  'ASTELAV': '880e8400-e29b-41d4-a716-446655440005',
  'ASTELAV S.R.L.': '880e8400-e29b-41d4-a716-446655440005',
  'MIDEA': '880e8400-e29b-41d4-a716-446655440006',
  'MIDEA GROUP CO., LTD.': '880e8400-e29b-41d4-a716-446655440006',
  'VANWARD': '880e8400-e29b-41d4-a716-446655440007',
  'NINGBO ETDZ HUIXING TRADE CO., LTD.': '880e8400-e29b-41d4-a716-446655440007',
  'GUANGDONG VANWARD NEW ELECTRIC CO., LTD.': '880e8400-e29b-41d4-a716-446655440007',
  'WATER TECH SOLUTIONS': '880e8400-e29b-41d4-a716-446655440008',
};

const fixedLineIds: Record<string, string> = {
  'AGUA CALIENTE': '990e8400-e29b-41d4-a716-446655440001',
  'LÍNEA BLANCA': '990e8400-e29b-41d4-a716-446655440002',
  'CLIMATIZACIÓN': '990e8400-e29b-41d4-a716-446655440003',
  'PURIFICACIÓN': '990e8400-e29b-41d4-a716-446655440004',
  'PEQUEÑOS ELECTRO': '990e8400-e29b-41d4-a716-446655440005',
};

const fixedCategoryIds: Record<string, string> = {
  'Calentador a Gas': 'aa0e8400-e29b-41d4-a716-446655440001',
  'Encimera': 'aa0e8400-e29b-41d4-a716-446655440002',
  'Deshumedecedor': 'aa0e8400-e29b-41d4-a716-446655440003',
  'Campanas': 'aa0e8400-e29b-41d4-a716-446655440004',
  'Termas Eléctricas': 'aa0e8400-e29b-41d4-a716-446655440005',
  'Purificación': 'aa0e8400-e29b-41d4-a716-446655440006',
  'Microondas': 'aa0e8400-e29b-41d4-a716-446655440007',
  'Licuadoras': 'aa0e8400-e29b-41d4-a716-446655440008',
  'Ventilación': 'aa0e8400-e29b-41d4-a716-446655440009',
};

const fixedSampleIds: Record<string, string> = {
  'S1': 'bb0e8400-e29b-41d4-a716-446655440001',
  'S2': 'bb0e8400-e29b-41d4-a716-446655440002',
  'S3': 'bb0e8400-e29b-41d4-a716-446655440003',
  'S4': 'bb0e8400-e29b-41d4-a716-446655440004',
  'S5': 'bb0e8400-e29b-41d4-a716-446655440005',
  'S6': 'bb0e8400-e29b-41d4-a716-446655440006',
  'S7': 'bb0e8400-e29b-41d4-a716-446655440007',
  'S8': 'bb0e8400-e29b-41d4-a716-446655440008',
  'S9': 'bb0e8400-e29b-41d4-a716-446655440009',
  'S10': 'bb0e8400-e29b-41d4-a716-446655440010',
};

async function seed() {
  console.log('🌱 Starting Database Seeding from Local mockData.ts...');
  const pool = await sql.connect(dbConfig);
  console.log('Connected to SQL Server.');

  // Clean tables
  await pool.request().query(`
    DELETE FROM ID_PORTAL.role_permissions;
    DELETE FROM ID_PORTAL.permissions;
    DELETE FROM ID_PORTAL.calendar_tasks;
    DELETE FROM ID_PORTAL.innovation_proposals;
    DELETE FROM ID_PORTAL.energy_efficiency_records;
    DELETE FROM ID_PORTAL.project_activities;
    DELETE FROM ID_PORTAL.projects;
    DELETE FROM ID_PORTAL.rd_inventory;
    DELETE FROM ID_PORTAL.product_management;
    DELETE FROM ID_PORTAL.products;
    DELETE FROM ID_PORTAL.samples;
    DELETE FROM ID_PORTAL.inspection_templates;
    DELETE FROM ID_PORTAL.categories;
    DELETE FROM ID_PORTAL.product_lines;
    DELETE FROM ID_PORTAL.suppliers;
    DELETE FROM ID_PORTAL.brand_documents;
    DELETE FROM ID_PORTAL.brands;
    DELETE FROM ID_PORTAL.profiles;
    DELETE FROM ID_PORTAL.roles;
    DELETE FROM ID_PORTAL.ntp_regulations;
    DELETE FROM ID_PORTAL.brandbook_settings;
    DELETE FROM ID_PORTAL.approver_configs;
    DELETE FROM ID_PORTAL.rd_custom_projects;
    DELETE FROM ID_PORTAL.rd_project_templates;
    DELETE FROM ID_PORTAL.audit_logs;
  `);
  console.log('Cleared existing tables in ID_PORTAL schema.');

  // 1. Roles
  console.log('Inserting Roles...');
  for (const roleName of Object.keys(fixedRoleIds)) {
    await insertRow(pool, 'roles', {
      id: fixedRoleIds[roleName],
      name: roleName,
      display_name: roleName === 'admin' ? 'Administrador' : roleName,
      description: `Rol de ${roleName}`,
      level: roleName === 'admin' ? 99 : 1
    });
  }

  // 2. Permissions
  console.log('Inserting Permissions...');
  const defaultPermissions = [
    { name: 'calendar:view', description: 'Ver calendario', module: 'calendar' },
    { name: 'calendar:create', description: 'Crear tareas', module: 'calendar' },
    { name: 'calendar:edit', description: 'Editar tareas', module: 'calendar' },
    { name: 'calendar:delete', description: 'Eliminar tareas', module: 'calendar' },
    { name: 'samples:view', description: 'Ver muestras', module: 'samples' },
    { name: 'samples:create', description: 'Crear muestras', module: 'samples' },
    { name: 'samples:edit', description: 'Editar muestras', module: 'samples' },
    { name: 'samples:inspect', description: 'Inspeccionar muestras', module: 'samples' },
    { name: 'samples:approve', description: 'Aprobar muestras', module: 'samples' },
    { name: 'catalog:view', description: 'Ver catálogo', module: 'product_management' },
    { name: 'catalog:edit', description: 'Editar catálogo', module: 'product_management' },
    { name: 'catalog:delete', description: 'Eliminar catálogo', module: 'product_management' },
  ];
  for (const p of defaultPermissions) {
    await insertRow(pool, 'permissions', p);
  }

  // 3. Profiles (Users)
  console.log('Inserting Profiles...');
  const passwordHash = await bcrypt.hash('123456', 10);
  
  // Custom mock users
  const profilesToSeed = [
    { name: 'Carlos Hoyos', email: 'carlos.hoyosf@pucp.pe', role: 'Coordinador de I+D', department: 'I+D' },
    { name: 'Jonathan Soriano', email: 'jonathan@example.com', role: 'Técnico de I+D', department: 'I+D' },
    { name: 'Fernando Lopez', email: 'fernando@example.com', role: 'Técnico de I+D', department: 'I+D' },
    { name: 'Anthony Soto', email: 'anthony@example.com', role: 'Técnico de I+D', department: 'I+D' },
    { name: 'Andrea Valdivia', email: 'andrea@example.com', role: 'Diseñadora Gráfica', department: 'Marketing' },
    { name: 'Monica M.', email: 'monica.m@example.com', role: 'Jefe de Marketing 1', department: 'Marketing' },
    { name: 'Sandra S.', email: 'sandra.s@example.com', role: 'Jefe de Planeamiento', department: 'Planeamiento' },
    { name: 'Luis G.', email: 'luis.g@example.com', role: 'Proveedor', department: 'Proveedores' },
    { name: 'Administrador', email: 'admin@sole.com.pe', role: 'admin', department: 'Sistemas' },
  ];

  for (const p of profilesToSeed) {
    const userId = fixedUserIds[p.name] || fixedUserIds[p.email] || newid();
    const roleId = fixedRoleIds[p.role] || fixedRoleIds['admin'];
    
    await insertRow(pool, 'profiles', {
      id: userId,
      email: p.email,
      full_name: p.name,
      department: p.department,
      role: p.role,
      role_id: roleId,
      password_hash: passwordHash,
      is_active: true
    });
  }

  // Helper function to return unique identifier since JS has no native newid
  function newid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 4. Brands
  console.log('Inserting Brands...');
  await insertRow(pool, 'brands', { id: fixedBrandIds['SOLE'], name: 'SOLE', description: 'Marca principal de termas y cocinas' });
  await insertRow(pool, 'brands', { id: fixedBrandIds['S-Collection'], name: 'S-Collection', description: 'Gama premium de electrodomésticos' });

  // 5. Suppliers
  console.log('Inserting Suppliers...');
  const suppliersToSeed = [...initialSuppliers];
  if (!suppliersToSeed.some(s => s.commercialAlias === 'WATER TECH SOLUTIONS')) {
    suppliersToSeed.push({
      id: '8',
      legalName: 'WATER TECH SOLUTIONS INC.',
      commercialAlias: 'WATER TECH SOLUTIONS',
      erpCode: '2000009999',
      country: 'USA',
      logoUrl: '',
      evaluation: {
        innovation: 4,
        responseTime: 4,
        quality: 4,
        failureIndex: 1,
        price: 3,
        lastUpdated: new Date().toISOString()
      },
      quotations: []
    } as any);
  }

  for (const s of suppliersToSeed) {
    const id = fixedSupplierIds[s.commercialAlias] || fixedSupplierIds[s.legalName] || newid();
    await insertRow(pool, 'suppliers', {
      id: id,
      legal_name: s.legalName,
      commercial_alias: s.commercialAlias,
      erp_code: s.erpCode,
      country: s.country,
      logo_url: s.logoUrl,
      evaluation: s.evaluation,
      quotations: s.quotations
    });
  }

  // 6. Product Lines
  console.log('Inserting Product Lines...');
  for (const name of Object.keys(fixedLineIds)) {
    await insertRow(pool, 'product_lines', {
      id: fixedLineIds[name],
      name: name
    });
  }

  // 7. Categories
  console.log('Inserting Categories...');
  for (const catName of Object.keys(fixedCategoryIds)) {
    let lineName = 'LÍNEA BLANCA';
    if (catName === 'Calentador a Gas' || catName === 'Termas Eléctricas') lineName = 'AGUA CALIENTE';
    else if (catName === 'Deshumedecedor' || catName === 'Ventilación') lineName = 'CLIMATIZACIÓN';
    else if (catName === 'Purificación') lineName = 'PURIFICACIÓN';
    
    await insertRow(pool, 'categories', {
      id: fixedCategoryIds[catName],
      name: catName,
      product_line_id: fixedLineIds[lineName]
    });
  }

  // 8. Samples
  console.log('Inserting Samples...');
  for (const s of initialSamples) {
    const sampleId = fixedSampleIds[s.id] || newid();
    const brandId = fixedBrandIds[s.marca] || fixedBrandIds['SOLE'];
    const supplierId = fixedSupplierIds[s.proveedor] || fixedSupplierIds['VANWARD'];
    const lineId = fixedLineIds[s.linea] || fixedLineIds['AGUA CALIENTE'];
    const categoryId = fixedCategoryIds[s.categoria || ''] || fixedCategoryIds['Calentador a Gas'];
    const techId = fixedUserIds[s.technician || ''] || fixedUserIds['Jonathan Soriano'];

    await insertRow(pool, 'samples', {
      id: sampleId,
      correlative_id: s.correlativeId,
      version: s.version || 1,
      codigo_sap: s.codigoSAP || null,
      descripcion_sap: s.descripcionSAP,
      brand_id: brandId,
      supplier_id: supplierId,
      line_id: lineId,
      category_id: categoryId,
      sample_type: s.tipoSuestra || 'Evaluación',
      inspection_date: s.inspectionDate ? new Date(s.inspectionDate) : null,
      inspection_status: s.inspectionStatus,
      report_date: s.reportDate ? new Date(s.reportDate) : null,
      report_file: s.reportFile,
      initial_technical_datasheet: s.initialTechnicalDatasheet || null,
      technician: techId,
      planned_start_date: s.plannedStartDate ? new Date(s.plannedStartDate) : null,
      inspection_progress: s.inspectionProgress || 'pending',
      inspection_completed_date: s.inspectionCompletedDate ? new Date(s.inspectionCompletedDate) : null,
      inspection_timer: s.inspectionTimer || null,
      inspection_form: s.inspectionForm || null,
      workflow: s.workflow || null,
      info_requests: s.infoRequests || [],
      provider_documents: s.providerDocuments || [],
      reception_photo: s.receptionPhoto || null,
      received_by: s.receivedBy || null,
      warehouse_entry_date: s.warehouseEntryDate ? new Date(s.warehouseEntryDate) : null,
      calculation_ids: s.calculationIds || [],
      history: s.history || []
    });
  }

  // 9. Products
  console.log('Inserting Products...');
  for (const p of initialData) {
    const brandId = fixedBrandIds[p.marca] || fixedBrandIds['SOLE'];
    const supplierId = fixedSupplierIds[p.proveedor] || fixedSupplierIds['VANWARD'];
    const lineId = fixedLineIds[p.linea] || fixedLineIds['LÍNEA BLANCA'];
    const sampleId = p.sampleId ? (fixedSampleIds[p.sampleId] || null) : null;
    const categoryId = fixedCategoryIds[p.categoria || ''] || fixedCategoryIds['Campanas'];

    await insertRow(pool, 'products', {
      id: newid(),
      correlative_id: p.correlativeId || null,
      sap_code: p.codigoSAP,
      ean_code: p.codigoEAN || null,
      sap_description: p.descripcionSAP,
      brand_id: brandId,
      supplier_id: supplierId,
      line_id: lineId,
      sample_id: sampleId,
      category_id: categoryId,
      commercial_status: p.commercialStatus || 'No a la venta',
      quality_inspection_date: p.qualityInspectionDate ? new Date(p.qualityInspectionDate) : null,
      fob_price: 0,
      fob_price_history: [],
      explode_files: p.artworks || [],
      additional_provider_documents: [],
      gallery: p.gallery || [],
      artwork_assignment: p.artworkAssignment || null,
      technical_assignment: p.technicalAssignment || null,
      commercial_assignment: p.commercialAssignment || null,
      tracking_type: p.trackingType || 'artwork',
      linked_group_id: p.linkedGroupId || null
    });
  }

  // 10. Product Management
  console.log('Inserting Product Management Records...');
  for (const pm of initialProductManagement) {
    const brandId = fixedBrandIds[pm.marca] || fixedBrandIds['SOLE'];
    const supplierId = fixedSupplierIds[pm.proveedor] || fixedSupplierIds['AMERICAN'];
    const lineId = fixedLineIds[pm.linea] || fixedLineIds['AGUA CALIENTE'];
    const sampleId = pm.sampleId ? (fixedSampleIds[pm.sampleId] || null) : null;
    const categoryId = fixedCategoryIds['Calentador a Gas'];

    await insertRow(pool, 'product_management', {
      id: newid(),
      correlative_id: pm.correlativeId || null,
      sap_code: pm.codigoSAP,
      sap_description: pm.descripcionSAP,
      ean_code: pm.eanCode || pm.codigoEAN || null,
      brand_id: brandId,
      supplier_id: supplierId,
      line_id: lineId,
      sample_id: sampleId ? sampleId.toString() : null,
      category_id: categoryId,
      fob_price: pm.fobPrice || 0,
      fob_price_history: pm.fobPriceHistory || [],
      explode_files: pm.explodeFiles || [],
      additional_provider_documents: pm.additionalProviderDocuments || [],
      gallery: pm.gallery || [],
      approved_documents: pm.approvedDocuments || [],
      artwork_assignment: pm.artworkAssignment || null,
      technical_assignment: pm.technicalAssignment || null,
      commercial_assignment: pm.commercialAssignment || null
    });
  }

  // 11. R&D Inventory
  console.log('Inserting R&D Inventory...');
  for (const inv of initialRDInventory) {
    await insertRow(pool, 'rd_inventory', {
      id: newid(),
      serial_number: inv.serialNumber,
      description: inv.description,
      responsible: inv.responsible,
      acquisition_date: inv.acquisitionDate ? new Date(inv.acquisitionDate) : null,
      startup_date: inv.startupDate ? new Date(inv.startupDate) : null,
      calibration_status: inv.calibrationStatus,
      category: inv.category,
      equipment_type: inv.equipmentType,
      source_type: inv.sourceType,
      brand: inv.brand,
      model: inv.model,
      equipment_range: inv.equipmentRange,
      supplier_or_equipment: inv.supplierOrEquipment || null,
      calibration_registry: inv.calibrationRegistry || null,
      revision_registry: inv.revisionRegistry || null,
      certificate: inv.certificate || null,
      certificate_history: inv.certificateHistory || [],
      revision_status: inv.revisionStatus || null,
      assignment_registry: inv.assignmentRegistry || null,
      last_calibration_date: inv.lastCalibrationDate ? new Date(inv.lastCalibrationDate) : null,
      next_calibration_date: inv.nextCalibrationDate ? new Date(inv.nextCalibrationDate) : null,
      photos: inv.photos || [],
      manual: inv.manual || null
    });
  }

  // 12. Projects (Roadmap)
  console.log('Inserting Projects...');
  for (const p of initialProjects) {
    const projId = newid();
    const respId = fixedUserIds[p.responsible] || fixedUserIds['Carlos H.'];

    await insertRow(pool, 'projects', {
      id: projId,
      project_number: p.number,
      name: p.name,
      responsible: respId,
      progress: p.progress,
      status: p.status
    });

    // Activities
    if (p.activities) {
      for (const act of p.activities) {
        await insertRow(pool, 'project_activities', {
          id: newid(),
          project_id: projId,
          activity_number: act.number,
          name: act.name,
          comments: act.comments || null,
          indicator: act.indicator || null,
          progress: act.progress,
          responsible: act.responsible || [],
          classification: act.classification || 'Plan inicial',
          planned_start_date: act.plannedStartDate ? new Date(act.plannedStartDate) : null,
          planned_end_date: act.plannedEndDate ? new Date(act.plannedEndDate) : null,
          actual_start_date: act.actualStartDate ? new Date(act.actualStartDate) : null,
          actual_end_date: act.actualEndDate ? new Date(act.actualEndDate) : null,
          status: act.status
        });
      }
    }
  }

  // 13. Energy Efficiency Records
  console.log('Inserting Energy Efficiency Records...');
  for (const ee of initialEnergyEfficiency) {
    const supplierId = fixedSupplierIds[ee.proveedor] || fixedSupplierIds['VANWARD'];
    const sampleId = ee.sampleId ? (fixedSampleIds[ee.sampleId] || null) : null;

    await insertRow(pool, 'energy_efficiency_records', {
      id: newid(),
      codigo_mt: ee.codigoMT,
      descripcion: ee.descripcion,
      letra: ee.letra,
      porcentaje_ee: ee.porcentajeEE,
      ocp: ee.ocp,
      supplier_id: supplierId,
      fecha_emision: ee.fechaEmision ? new Date(ee.fechaEmision) : null,
      fecha_vigilancia: ee.fechaVigilancia ? new Date(ee.fechaVigilancia) : null,
      tipo_producto: ee.tipoProducto,
      sample_id: sampleId,
      certificado_file: ee.certificadoFile || null,
      certificado_history: ee.certificadoHistory || [],
      etiqueta_file: ee.etiquetaFile || null,
      etiqueta_history: ee.etiquetaHistory || [],
      test_report_file: ee.testReportFile || null,
      test_report_history: ee.testReportHistory || []
    });
  }

  // 14. Calendar Tasks
  console.log('Inserting Calendar Tasks...');
  for (const t of initialCalendarTasks) {
    const reqId = fixedUserIds[t.requester || ''] || fixedUserIds['Carlos H.'];
    const assId = t.assignee ? (fixedUserIds[t.assignee] || null) : null;

    await insertRow(pool, 'calendar_tasks', {
      id: newid(),
      title: t.title,
      description: t.description || null,
      deadline: t.deadline ? new Date(t.deadline) : null,
      start_date: t.startDate ? new Date(t.startDate) : null,
      end_date: t.endDate ? new Date(t.endDate) : null,
      type: t.type,
      requester: reqId,
      assignee: assId,
      status: t.status || 'pending',
      delivery_status: t.deliveryStatus || 'pending',
      change_log: t.changeLog || []
    });
  }

  // 15. RD Project Templates
  console.log('Inserting RD Project Templates...');
  for (const temp of initialRDProjectTemplates) {
    await insertRow(pool, 'rd_project_templates', {
      id: newid(),
      name: temp.name,
      description: temp.description,
      icon: temp.icon,
      is_custom: temp.isCustom || false,
      sections: temp.sections
    });
  }

  // 16. RD Custom Projects
  console.log('Inserting RD Custom Projects...');
  // Retrieve the templates we just inserted to map their IDs
  const templatesRes = await pool.request().query('SELECT id, name FROM ID_PORTAL.rd_project_templates');
  const dbTemplates = templatesRes.recordset;

  for (const cp of initialRDProjects) {
    const matchedTemplate = dbTemplates.find(t => t.name.toLowerCase().includes(cp.templateId === 'water-quality' ? 'calidad' : 'dimensionamiento'));
    const templateId = matchedTemplate ? matchedTemplate.id : cp.templateId;
    const respId = fixedUserIds[cp.responsible] || fixedUserIds['Carlos H.'];

    await insertRow(pool, 'rd_custom_projects', {
      id: newid(),
      template_id: isUUID(templateId) ? templateId : null,
      name: cp.name,
      description: cp.description,
      status: cp.status,
      priority: cp.priority,
      responsible_id: respId,
      start_date: cp.startDate ? new Date(cp.startDate) : null,
      end_date: cp.endDate ? new Date(cp.endDate) : null,
      sections: cp.sections,
      attachments: cp.attachments || []
    });
  }

  // 17. Approver Configs
  console.log('Inserting Approver Configs...');
  await insertRow(pool, 'approver_configs', {
    id: newid(),
    id_approver: initialApprovers['I+D'] || 'Carlos H.',
    mkt_approver: initialApprovers['MKT'] || 'Monica M.',
    plan_approver: initialApprovers['PLAN'] || 'Sandra S.',
    prov_approver: initialApprovers['PROV'] || 'Luis G.',
    is_active: true
  });

  // 18. Brandbook Settings
  console.log('Inserting Brandbook Settings...');
  await insertRow(pool, 'brandbook_settings', {
    id: newid(),
    hero_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=2000'
  });

  console.log('🎉 Seeding successfully completed!');
  await pool.close();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
});
