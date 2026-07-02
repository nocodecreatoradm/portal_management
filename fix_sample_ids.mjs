/**
 * fix_sample_ids.mjs
 * 
 * Script de migración para corregir IDs correlativos duplicados en ID_PORTAL.samples
 * Reasigna M-001, M-002, ... de forma secuencial por fecha de creación.
 * 
 * Uso:
 *   node fix_sample_ids.mjs --dry-run    (solo muestra los cambios, no aplica)
 *   node fix_sample_ids.mjs              (aplica los cambios)
 */

import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const isDryRun = process.argv.includes('--dry-run');

const sanitize = (val) => {
  if (!val) return '';
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean;
};

const dbConfig = {
  user: sanitize(process.env.DB_USER) || 'soledbserveradmin',
  password: sanitize(process.env.DB_PASSWORD) || '',
  server: sanitize(process.env.DB_SERVER) || 'soledbserver.database.windows.net',
  database: sanitize(process.env.DB_NAME) || 'soledb-puntoventa',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function main() {
  console.log('🔌 Conectando a la base de datos...');
  const pool = await sql.connect(dbConfig);
  console.log('✅ Conexión exitosa\n');

  // 1. Leer todos los registros ordenados por fecha de creación
  const result = await pool.request().query(`
    SELECT id, correlative_id, created_at
    FROM ID_PORTAL.samples
    ORDER BY created_at ASC
  `);

  const records = result.recordset;
  console.log(`📋 Total de muestras encontradas: ${records.length}\n`);

  if (records.length === 0) {
    console.log('No hay registros que procesar.');
    await pool.close();
    return;
  }

  // 2. Detectar duplicados actuales
  const idCounts = {};
  for (const r of records) {
    const cid = r.correlative_id || '(vacío)';
    idCounts[cid] = (idCounts[cid] || 0) + 1;
  }
  const duplicates = Object.entries(idCounts).filter(([, count]) => count > 1);
  
  if (duplicates.length > 0) {
    console.log('⚠️  IDs duplicados detectados:');
    for (const [id, count] of duplicates) {
      console.log(`   ${id}: aparece ${count} veces`);
    }
    console.log('');
  } else {
    console.log('ℹ️  No se detectaron IDs duplicados en el orden actual.\n');
  }

  // 3. Generar nuevos IDs secuenciales
  const updates = [];
  for (let i = 0; i < records.length; i++) {
    const newId = `M-${(i + 1).toString().padStart(3, '0')}`;
    const oldId = records[i].correlative_id || '(vacío)';
    updates.push({
      dbId: records[i].id,
      oldCorrelativeId: oldId,
      newCorrelativeId: newId,
      createdAt: records[i].created_at,
    });
  }

  // 4. Mostrar plan de cambios
  console.log('📝 Plan de cambios (ordenado por created_at):');
  console.log('─'.repeat(60));
  let hasChanges = false;
  for (const u of updates) {
    if (u.oldCorrelativeId !== u.newCorrelativeId) {
      console.log(`  ${u.oldCorrelativeId.padEnd(10)} → ${u.newCorrelativeId}   (creado: ${u.createdAt?.toISOString?.() || u.createdAt})`);
      hasChanges = true;
    }
  }
  if (!hasChanges) {
    console.log('  ✅ Todos los IDs ya son correlativos. No se requieren cambios.');
    await pool.close();
    return;
  }
  console.log('─'.repeat(60));
  console.log(`\nTotal de registros a actualizar: ${updates.filter(u => u.oldCorrelativeId !== u.newCorrelativeId).length}`);

  if (isDryRun) {
    console.log('\n🔍 Modo DRY-RUN: No se aplicaron cambios. Ejecuta sin --dry-run para aplicar.');
    await pool.close();
    return;
  }

  // 5. Aplicar los cambios
  console.log('\n🚀 Aplicando cambios...');
  let successCount = 0;
  let errorCount = 0;

  for (const u of updates) {
    if (u.oldCorrelativeId === u.newCorrelativeId) continue;
    try {
      const req = pool.request();
      req.input('newId', sql.NVarChar, u.newCorrelativeId);
      req.input('dbId', sql.UniqueIdentifier, u.dbId);
      await req.query(`
        UPDATE ID_PORTAL.samples
        SET correlative_id = @newId
        WHERE id = @dbId
      `);
      console.log(`  ✅ ${u.oldCorrelativeId} → ${u.newCorrelativeId}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Error actualizando ${u.dbId}: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n✅ Completado: ${successCount} actualizados, ${errorCount} errores.`);
  await pool.close();
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
