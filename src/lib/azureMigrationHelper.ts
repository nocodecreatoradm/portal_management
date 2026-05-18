import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { createClient } from "@supabase/supabase-js";

function parseConnectionString(connStr: string) {
  const parts = connStr.split(';');
  let accountName = '';
  let accountKey = '';
  for (const part of parts) {
    if (part.startsWith('AccountName=')) {
      accountName = part.split('=')[1];
    } else if (part.startsWith('AccountKey=')) {
      accountKey = part.substring('AccountKey='.length);
    }
  }
  return { accountName, accountKey };
}

interface MigrationTarget {
  table: string;
  idColumn: string;
  columns: { name: string; type: 'text' | 'jsonb' }[];
}

const TARGETS: MigrationTarget[] = [
  {
    table: 'rd_inventory',
    idColumn: 'id',
    columns: [
      { name: 'certificate', type: 'text' },
      { name: 'certificates', type: 'jsonb' }
    ]
  },
  {
    table: 'inventory_certificates',
    idColumn: 'id',
    columns: [
      { name: 'file_url', type: 'text' }
    ]
  },
  {
    table: 'product_documents',
    idColumn: 'id',
    columns: [
      { name: 'file_url', type: 'text' }
    ]
  },
  {
    table: 'ntp_regulations',
    idColumn: 'id',
    columns: [
      { name: 'file_info', type: 'jsonb' }
    ]
  },
  {
    table: 'canton_fair_suppliers',
    idColumn: 'id',
    columns: [
      { name: 'catalogues', type: 'jsonb' },
      { name: 'images', type: 'jsonb' },
      { name: 'logo', type: 'jsonb' },
      { name: 'wechat_qr', type: 'jsonb' },
      { name: 'agreements', type: 'jsonb' },
      { name: 'quotations', type: 'jsonb' }
    ]
  },
  {
    table: 'canton_fair_products',
    idColumn: 'id',
    columns: [
      { name: 'images', type: 'jsonb' }
    ]
  },
  {
    table: 'brand_documents',
    idColumn: 'id',
    columns: [
      { name: 'versions', type: 'jsonb' }
    ]
  },
  {
    table: 'brandbook_settings',
    idColumn: 'id',
    columns: [
      { name: 'hero_image', type: 'text' }
    ]
  },
  {
    table: 'brands',
    idColumn: 'id',
    columns: [
      { name: 'image', type: 'text' }
    ]
  },
  {
    table: 'energy_efficiency_records',
    idColumn: 'id',
    columns: [
      { name: 'certificate_file', type: 'jsonb' },
      { name: 'certificate_history', type: 'jsonb' },
      { name: 'label_file', type: 'jsonb' },
      { name: 'label_history', type: 'jsonb' },
      { name: 'gallery', type: 'jsonb' },
      { name: 'test_report_file', type: 'jsonb' },
      { name: 'test_report_history', type: 'jsonb' }
    ]
  },
  {
    table: 'product_management',
    idColumn: 'id',
    columns: [
      { name: 'explode_files', type: 'jsonb' },
      { name: 'additional_provider_documents', type: 'jsonb' },
      { name: 'gallery', type: 'jsonb' },
      { name: 'approved_documents', type: 'jsonb' }
    ]
  },
  {
    table: 'products',
    idColumn: 'id',
    columns: [
      { name: 'explode_files', type: 'jsonb' },
      { name: 'additional_provider_documents', type: 'jsonb' }
    ]
  },
  {
    table: 'samples',
    idColumn: 'id',
    columns: [
      { name: 'report_file', type: 'jsonb' },
      { name: 'reception_photo', type: 'jsonb' },
      { name: 'procedure_file', type: 'jsonb' }
    ]
  },
  {
    table: 'inspection_templates',
    idColumn: 'id',
    columns: [
      { name: 'procedure_file', type: 'jsonb' }
    ]
  },
  {
    table: 'requerimientos',
    idColumn: 'id',
    columns: [
      { name: 'evidencia_url', type: 'text' }
    ]
  }
];

export async function runFullAzureMigration(
  connectionString: string,
  containerName: string,
  supabaseUrl: string,
  supabaseKey: string,
  logCallback: (msg: string) => void
): Promise<{ success: boolean; migratedCount: number; errorsCount: number }> {
  logCallback("🚀 Starting Supabase → Azure Blob Storage migration...");
  logCallback("==================================================");

  const { accountName, accountKey } = parseConnectionString(connectionString);
  if (!accountName || !accountKey) {
    throw new Error("Invalid Azure connection string");
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );

  const supabase = createClient(supabaseUrl, supabaseKey);
  let totalMigrated = 0;
  let totalErrors = 0;

  for (const target of TARGETS) {
    logCallback(`\n📦 Scanning table: "${target.table}"...`);

    try {
      // Build a select query for ID and all targeted columns
      const selectFields = [target.idColumn, ...target.columns.map(c => c.name)].join(',');
      const { data: rows, error: fetchErr } = await supabase
        .from(target.table)
        .select(selectFields);

      if (fetchErr) {
        logCallback(`❌ Error fetching from "${target.table}": ${fetchErr.message}`);
        totalErrors++;
        continue;
      }

      if (!rows || rows.length === 0) {
        logCallback(`⏭ Table "${target.table}" is empty or has no records.`);
        continue;
      }

      logCallback(`🔍 Found ${rows.length} records in "${target.table}". Processing...`);

      for (const row of rows) {
        const id = row[target.idColumn];
        const updates: Record<string, any> = {};
        let rowChanged = false;

        for (const col of target.columns) {
          const val = row[col.name];
          if (!val) continue;

          // Convert to string to perform universal regex search
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          
          // Regex to match Supabase storage URLs
          const regex = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/([a-zA-Z0-9-_]+)\/([^\s"'}?,;)]+)/gi;
          
          let match;
          const matches: { fullUrl: string; bucket: string; path: string }[] = [];
          
          regex.lastIndex = 0;
          while ((match = regex.exec(strVal)) !== null) {
            const fullUrl = match[0];
            const bucket = match[1];
            const filePath = match[2];
            if (!matches.some(m => m.fullUrl === fullUrl)) {
              matches.push({ fullUrl, bucket, path: filePath });
            }
          }

          if (matches.length === 0) continue;

          logCallback(`  👉 Record [${id}] - Column "${col.name}" has ${matches.length} Supabase files:`);
          let currentStrVal = strVal;

          for (const item of matches) {
            try {
              logCallback(`    📥 Downloading: ${item.fullUrl}`);
              const response = await fetch(item.fullUrl);
              if (!response.ok) {
                throw new Error(`Failed to download from Supabase. Status: ${response.status}`);
              }
              
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const azurePath = item.path;

              logCallback(`    📤 Uploading to Azure: ${azurePath} (${(buffer.length/1024).toFixed(1)} KB)`);
              const containerClient = blobServiceClient.getContainerClient(containerName);
              const blockBlobClient = containerClient.getBlockBlobClient(azurePath);

              await blockBlobClient.uploadData(buffer, {
                blobHTTPHeaders: {
                  blobContentType: response.headers.get("content-type") || undefined
                }
              });

              const azureUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${azurePath}`;
              logCallback(`    ✅ Successfully uploaded. Azure URL: ${azureUrl}`);

              // Replace all occurrences of this Supabase URL with Azure URL
              currentStrVal = currentStrVal.replaceAll(item.fullUrl, azureUrl);
              totalMigrated++;
              rowChanged = true;
            } catch (err: any) {
              logCallback(`    ❌ Failed to migrate ${item.fullUrl}: ${err.message || err}`);
              totalErrors++;
            }
          }

          if (rowChanged) {
            if (col.type === 'jsonb') {
              updates[col.name] = JSON.parse(currentStrVal);
            } else {
              updates[col.name] = currentStrVal;
            }
          }
        }

        if (rowChanged) {
          logCallback(`  💾 Saving updates to table "${target.table}" for record [${id}]...`);
          const { error: updateErr } = await supabase
            .from(target.table)
            .update(updates)
            .eq(target.idColumn, id);

          if (updateErr) {
            logCallback(`  ❌ Failed to save updates for record [${id}]: ${updateErr.message}`);
            totalErrors++;
          } else {
            logCallback(`  ✅ Record [${id}] successfully updated!`);
          }
        }
      }
    } catch (err: any) {
      logCallback(`❌ Unexpected error processing table "${target.table}": ${err.message || err}`);
      totalErrors++;
    }
  }

  logCallback("\n==================================================");
  logCallback(`🎉 Migration completed!`);
  logCallback(`🚀 Total files migrated successfully: ${totalMigrated}`);
  logCallback(`⚠️ Total errors encountered: ${totalErrors}`);

  return {
    success: totalErrors === 0,
    migratedCount: totalMigrated,
    errorsCount: totalErrors
  };
}
