import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";
import { runFullAzureMigration } from "./src/lib/azureMigrationHelper.ts";
import sql from "mssql";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();

// In-memory log buffer for troubleshooting in production
export const debugLogs: string[] = [];
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  debugLogs.push(`${new Date().toISOString()} [LOG] ${msg}`);
  if (debugLogs.length > 2000) debugLogs.shift();
  originalLog.apply(console, args);
};

console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  debugLogs.push(`${new Date().toISOString()} [ERROR] ${msg}`);
  if (debugLogs.length > 2000) debugLogs.shift();
  originalError.apply(console, args);
};

process.on("uncaughtException", (err) => {
  console.error("SERVER UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("SERVER UNHANDLED REJECTION:", reason);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sanitizeEnvVal = (val: string | undefined): string => {
  if (!val) return "";
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean;
};

// SQL Server Connection Pool
let pool: sql.ConnectionPool | null = null;

async function getDBPool() {
  if (pool) return pool;
  const dbConfig: sql.config = {
    user: sanitizeEnvVal(process.env.DB_USER) || 'soledbserveradmin',
    password: sanitizeEnvVal(process.env.DB_PASSWORD) || '',
    server: sanitizeEnvVal(process.env.DB_SERVER) || 'soledbserver.database.windows.net',
    database: sanitizeEnvVal(process.env.DB_NAME) || 'soledb-puntoventa',
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
  pool = await sql.connect(dbConfig);
  pool.on('error', (err: any) => {
    console.error('MSSQL Pool error:', err);
  });
  return pool;
}

// Local JWT settings
const JWT_SECRET = process.env.JWT_SECRET || 'portal-jwt-secret-key-12345';

// Helper functions for UUID and JSON parsing
const newid = () => crypto.randomUUID();

function tryParseJSON(val: any) {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    }
  }
  return val;
}

function parseRowJSON(row: any) {
  if (!row) return row;
  const parsed: any = {};
  for (const key of Object.keys(row)) {
    parsed[key] = tryParseJSON(row[key]);
  }
  return parsed;
}

// Field mappings between Frontend (English) and SQL Server (Spanish/Internal)
const EE_COLUMN_MAP: Record<string, string> = {
  mt_code: 'codigo_mt',
  description: 'descripcion',
  letter: 'letra',
  ee_percentage: 'porcentaje_ee',
  emission_date: 'fecha_emision',
  vigilance_date: 'fecha_vigilancia',
  product_type: 'tipo_producto',
  line_id: 'line_id',
  category_id: 'category_id',
  certificate_file: 'certificado_file',
  certificate_history: 'certificado_history',
  label_file: 'etiqueta_file',
  label_history: 'etiqueta_history',
  test_report_file: 'test_report_file',
  test_report_history: 'test_report_history',
};

const CATEGORIES_COLUMN_MAP: Record<string, string> = {
  line_id: 'product_line_id',
};

// Create reverse maps for DB-to-Client conversion
const REVERSE_EE_MAP: Record<string, string> = {};
for (const [eng, esp] of Object.entries(EE_COLUMN_MAP)) {
  REVERSE_EE_MAP[esp] = eng;
}

const REVERSE_CAT_MAP: Record<string, string> = {};
for (const [eng, esp] of Object.entries(CATEGORIES_COLUMN_MAP)) {
  REVERSE_CAT_MAP[esp] = eng;
}

function mapRowFromDb(table: string, row: any): any {
  if (!row) return row;
  const mappedRow: any = {};
  for (const key of Object.keys(row)) {
    let clientKey = key;
    if (table === 'energy_efficiency_records' && REVERSE_EE_MAP[key]) {
      clientKey = REVERSE_EE_MAP[key];
    } else if (table === 'categories' && REVERSE_CAT_MAP[key]) {
      clientKey = REVERSE_CAT_MAP[key];
    }
    mappedRow[clientKey] = row[key];
  }
  return mappedRow;
}

async function fetchJoinedRow(table: string, id: any, dbPool: any) {
  const request = dbPool.request();
  request.input('id', id);
  let query = '';
  if (table === 'samples') {
    query = `
      SELECT s.*, 
             b.name as brand_name, 
             sup.legal_name as supplier_legal_name, 
             sup.commercial_alias as supplier_commercial_alias, 
             sup.erp_code as supplier_erp_code, 
             sup.email as supplier_email,
             l.name as line_name, 
             c.name as category_name
      FROM ID_PORTAL.samples s
      LEFT JOIN ID_PORTAL.brands b ON s.brand_id = b.id
      LEFT JOIN ID_PORTAL.suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN ID_PORTAL.product_lines l ON s.line_id = l.id
      LEFT JOIN ID_PORTAL.categories c ON s.category_id = c.id
      WHERE s.id = @id
    `;
  } else if (table === 'products') {
    query = `
      SELECT p.*, 
             b.name as brand_name, 
             sup.legal_name as supplier_legal_name, 
             sup.commercial_alias as supplier_commercial_alias, 
             sup.erp_code as supplier_erp_code, 
             sup.email as supplier_email,
             l.name as line_name, 
             c.name as category_name,
             s.correlative_id as sample_correlative_id,
             s.category_id as sample_category_id,
             sc.name as sample_category_name
      FROM ID_PORTAL.products p
      LEFT JOIN ID_PORTAL.brands b ON p.brand_id = b.id
      LEFT JOIN ID_PORTAL.suppliers sup ON p.supplier_id = sup.id
      LEFT JOIN ID_PORTAL.product_lines l ON p.line_id = l.id
      LEFT JOIN ID_PORTAL.categories c ON p.category_id = c.id
      LEFT JOIN ID_PORTAL.samples s ON p.sample_id = s.id
      LEFT JOIN ID_PORTAL.categories sc ON s.category_id = sc.id
      WHERE p.id = @id
    `;
  } else if (table === 'product_management') {
    query = `
      SELECT pm.*, 
             b.name as brand_name, 
             sup.legal_name as supplier_legal_name, 
             sup.commercial_alias as supplier_commercial_alias, 
             sup.erp_code as supplier_erp_code, 
             sup.email as supplier_email,
             ksup.legal_name as kit_supplier_legal_name,
             ksup.commercial_alias as kit_supplier_commercial_alias,
             l.name as line_name, 
             c.name as category_name
      FROM ID_PORTAL.product_management pm
      LEFT JOIN ID_PORTAL.brands b ON pm.brand_id = b.id
      LEFT JOIN ID_PORTAL.suppliers sup ON pm.supplier_id = sup.id
      LEFT JOIN ID_PORTAL.suppliers ksup ON pm.kit_supplier_id = ksup.id
      LEFT JOIN ID_PORTAL.product_lines l ON pm.line_id = l.id
      LEFT JOIN ID_PORTAL.categories c ON pm.category_id = c.id
      WHERE pm.id = @id
    `;
  } else if (table === 'energy_efficiency_records') {
    query = `
      SELECT 
             ee.id, 
             ee.codigo_mt AS mt_code, 
             ee.descripcion AS description, 
             ee.letra AS letter, 
             ee.porcentaje_ee AS ee_percentage, 
             ee.ocp, 
             ee.supplier_id, 
             ee.line_id,
             ee.category_id,
             ee.fecha_emision AS emission_date, 
             ee.fecha_vigilancia AS vigilance_date, 
             ee.tipo_producto AS product_type, 
             ee.sample_id, 
             ee.certificado_file AS certificate_file, 
             ee.certificado_history AS certificate_history, 
             ee.etiqueta_file AS label_file, 
             ee.etiqueta_history AS label_history, 
             ee.test_report_file AS test_report_file, 
             ee.test_report_history AS test_report_history, 
             ee.gallery, 
             ee.created_at, 
             ee.updated_at,
             sup.legal_name AS supplier_legal_name,
             l.name AS line_name,
             c.name AS category_name
      FROM ID_PORTAL.energy_efficiency_records ee
      LEFT JOIN ID_PORTAL.suppliers sup ON ee.supplier_id = sup.id
      LEFT JOIN ID_PORTAL.product_lines l ON ee.line_id = l.id
      LEFT JOIN ID_PORTAL.categories c ON ee.category_id = c.id
      WHERE ee.id = @id
    `;
  } else {
    query = `SELECT * FROM ID_PORTAL.[${table}] WHERE id = @id`;
  }

  const res = await request.query(query);
  let row = res.recordset[0];
  if (!row) return null;

  row = parseRowJSON(row);

  if (table === 'samples') {
    row.brand = row.brand_name ? { name: row.brand_name } : null;
    row.supplier = row.supplier_legal_name ? {
      legal_name: row.supplier_legal_name,
      commercial_alias: row.supplier_commercial_alias,
      erp_code: row.supplier_erp_code,
      email: row.supplier_email
    } : null;
    row.line = row.line_name ? { name: row.line_name } : null;
    row.category = row.category_name ? { name: row.category_name } : null;
  } else if (table === 'products') {
    row.brand = row.brand_name ? { name: row.brand_name } : null;
    row.supplier = row.supplier_legal_name ? {
      legal_name: row.supplier_legal_name,
      commercial_alias: row.supplier_commercial_alias,
      erp_code: row.supplier_erp_code,
      email: row.supplier_email
    } : null;
    row.line = row.line_name ? { name: row.line_name } : null;
    row.category = row.category_name ? { name: row.category_name } : null;
    row.sample = row.sample_correlative_id ? {
      correlative_id: row.sample_correlative_id,
      category_id: row.sample_category_id,
      category: row.sample_category_name ? { name: row.sample_category_name } : null
    } : null;
  } else if (table === 'product_management') {
    row.brand = row.brand_name ? { name: row.brand_name } : null;
    row.supplier = row.supplier_legal_name ? {
      legal_name: row.supplier_legal_name,
      commercial_alias: row.supplier_commercial_alias,
      erp_code: row.supplier_erp_code,
      email: row.supplier_email
    } : null;
    row.line = row.line_name ? { name: row.line_name } : null;
    row.category = row.category_name ? { name: row.category_name } : null;
  } else if (table === 'energy_efficiency_records') {
    row.supplier = row.supplier_legal_name ? { legal_name: row.supplier_legal_name } : null;
    row.line = row.line_name ? { name: row.line_name } : null;
    row.category = row.category_name ? { name: row.category_name } : null;
  }

  return mapRowFromDb(table, row);
}


// Middleware to verify local JWT Bearer token
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token is missing or invalid" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("Auth validation error:", err);
    return res.status(401).json({ error: "Unauthorized access token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a secure JSON payload limit (10MB) to prevent thread block DoS attacks
  app.use(express.json({ limit: '10mb' }));

  app.get("/api/debug-logs", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(debugLogs.join('\n'));
  });

  // In-memory token cache for Microsoft Graph
  let cachedToken: string | null = null;
  let tokenExpiresAt: number = 0; // Timestamp in milliseconds

  // Helper to get Microsoft Graph Access Token with caching
  async function getAzureAccessToken() {
    const now = Date.now();
    // Reuse cached token if it expires in more than 5 minutes
    if (cachedToken && (tokenExpiresAt - now) > 5 * 60 * 1000) {
      return cachedToken;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId!);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret!);
    params.append('grant_type', 'client_credentials');

    const response = await fetch(url, {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
    }

    cachedToken = data.access_token;
    const expiresIn = data.expires_in || 3600; // in seconds
    tokenExpiresAt = Date.now() + (expiresIn * 1000);

    return cachedToken;
  }

  function parseAzureConnectionString(connStr: string) {
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

  // API Routes with Supabase Auth protection

  // Endpoint to generate temporary Azure SAS Upload URLs (Protected)
  app.post("/api/azure-sas-upload", requireAuth, async (req, res) => {
    const { fileName, fileType } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_STORAGE_CONTAINER;

      if (!connectionString || !containerName) {
        return res.status(500).json({ error: "Azure Storage is not configured on the server" });
      }

      const { accountName, accountKey } = parseAzureConnectionString(connectionString);
      if (!accountName || !accountKey) {
        return res.status(500).json({ error: "Invalid Azure Storage connection string" });
      }

      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      
      const blobName = fileName;
      
      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + 15); // 15 mins expiry
      
      const sasToken = generateBlobSASQueryParameters({
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        startsOn: new Date(new Date().valueOf() - 5 * 60 * 1000), // clock skew buffer
        expiresOn,
      }, credential).toString();

      const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
      const publicUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`;

      res.json({ sasUrl, publicUrl });
    } catch (error: any) {
      console.error("Error generating Azure SAS URL:", error);
      res.status(500).json({ error: error.message || "Failed to generate SAS URL" });
    }
  });

  // Migration: Add Lineal de Productos columns to product_management
  app.post("/api/migrate/lineal-productos", requireAuth, async (req, res) => {
    try {
      const migrations = [
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'commercial_name')
          ALTER TABLE ID_PORTAL.product_management ADD commercial_name NVARCHAR(500)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'detailed_description')
          ALTER TABLE ID_PORTAL.product_management ADD detailed_description NVARCHAR(MAX)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'segment')
          ALTER TABLE ID_PORTAL.product_management ADD segment NVARCHAR(50)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'product_status')
          ALTER TABLE ID_PORTAL.product_management ADD product_status NVARCHAR(50) DEFAULT 'vigente'`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'habilitado')
          ALTER TABLE ID_PORTAL.product_management ADD habilitado BIT DEFAULT 0`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'incluye_kit')
          ALTER TABLE ID_PORTAL.product_management ADD incluye_kit BIT DEFAULT 0`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'habilitacion_costo')
          ALTER TABLE ID_PORTAL.product_management ADD habilitacion_costo DECIMAL(10,2)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'pvp')
          ALTER TABLE ID_PORTAL.product_management ADD pvp DECIMAL(10,2)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'pvp_descuento')
          ALTER TABLE ID_PORTAL.product_management ADD pvp_descuento DECIMAL(10,2)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_current_year')
          ALTER TABLE ID_PORTAL.product_management ADD sales_current_year INT`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_previous_year')
          ALTER TABLE ID_PORTAL.product_management ADD sales_previous_year INT`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'current_year')
          ALTER TABLE ID_PORTAL.product_management ADD current_year INT`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'previous_year')
          ALTER TABLE ID_PORTAL.product_management ADD previous_year INT`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'catalog_comments')
          ALTER TABLE ID_PORTAL.product_management ADD catalog_comments NVARCHAR(MAX)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'categoria')
          ALTER TABLE ID_PORTAL.product_management ADD categoria NVARCHAR(255)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'replaces_product_id')
          ALTER TABLE ID_PORTAL.product_management ADD replaces_product_id UNIQUEIDENTIFIER NULL`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_history')
          ALTER TABLE ID_PORTAL.product_management ADD sales_history NVARCHAR(MAX)`,
        `IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'kit_supplier_id')
          ALTER TABLE ID_PORTAL.product_management ADD kit_supplier_id UNIQUEIDENTIFIER NULL`,
      ];

      const results: string[] = [];
      for (const sql of migrations) {
        await dbPool.request().query(sql);
        const colName = sql.match(/name = '([^']+)'/)?.[1] || '?';
        results.push(`✅ ${colName}`);
      }

      res.json({ success: true, applied: results });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to migrate existing files from Supabase to Azure via Server-Sent Events (Protected)
  app.get("/api/azure-migrate", requireAuth, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
    const containerName = process.env.AZURE_STORAGE_CONTAINER || "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
    
    const sendLog = (message: string) => {
      res.write(`data: ${JSON.stringify({ message })}\n\n`);
    };

    try {
      await runFullAzureMigration(connectionString, containerName, supabaseUrl, supabaseKey, sendLog);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      sendLog(`❌ Fatal Migration Error: ${err.message || err}`);
      res.write(`data: ${JSON.stringify({ error: err.message || err })}\n\n`);
      res.end();
    }
  });

  // ============================================================
  // CARRIER TRACKING PROXY ENDPOINTS
  // ============================================================

  // DHL Tracking — uses Shipment Tracking - Unified API
  // Docs: https://developer.dhl.com/api-reference/shipment-tracking
  app.get("/api/track/dhl", requireAuth, async (req: any, res) => {
    const trackingNumber = (req.query.trackingNumber as string || '').trim();
    if (!trackingNumber) {
      return res.status(400).json({ error: "trackingNumber is required" });
    }

    const apiKey = process.env.DHL_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "DHL API key not configured on server" });
    }

    try {
      const url = `https://api.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}&language=es`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "DHL-API-Key": apiKey,
          "Accept": "application/json",
        },
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error(`DHL API error ${response.status}:`, data);
        return res.status(response.status).json({ error: data?.title || "Error from DHL API", details: data });
      }

      // Normalise response to our internal format
      const shipments = data.shipments || [];
      if (shipments.length === 0) {
        return res.status(404).json({ error: "No DHL shipment found for this tracking number" });
      }

      const s = shipments[0];
      const events: any[] = s.events || [];
      const latestEvent = events[0] || {};
      const estimatedDelivery: string =
        s.estimatedTimeOfDelivery?.split("T")[0] ||
        s.estimatedDeliveryTimeFrame?.estimatedFrom?.split("T")[0] ||
        "";

      // Map DHL status codes to Spanish labels
      const statusMap: Record<string, string> = {
        "pre-transit": "Información registrada",
        "transit": "En tránsito internacional",
        "delivered": "Entregado",
        "failure": "Intento de entrega fallido",
        "unknown": "Estado desconocido",
      };

      const rawStatus = (s.status?.status || "unknown").toLowerCase();
      const statusLabel = statusMap[rawStatus] || latestEvent.description || rawStatus;

      // Progress percentage based on status
      const progressMap: Record<string, number> = {
        "pre-transit": 10,
        "transit": 55,
        "delivered": 100,
        "failure": 80,
        "unknown": 5,
      };
      const progress = progressMap[rawStatus] ?? 10;

      const origin = s.origin?.address?.addressLocality || s.origin?.address?.countryCode || "";
      const destination = s.destination?.address?.addressLocality || s.destination?.address?.countryCode || "";

      const history = events.map((e: any) => ({
        date: (e.timestamp || "").replace("T", " ").substring(0, 16),
        status: e.description || "",
        location: e.location?.address?.addressLocality || e.location?.address?.countryCode || "",
      }));

      return res.json({
        carrier: "DHL",
        trackingStatus: statusLabel,
        progress,
        estimatedDelivery,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        trackingHistory: history,
        raw: data,
      });
    } catch (err: any) {
      console.error("DHL tracking fetch error:", err);
      return res.status(500).json({ error: "Internal server error while contacting DHL API" });
    }
  });

  // FedEx Tracking — scraping del endpoint interno de fedex.com (sin cuenta, sin OAuth)
  app.get("/api/track/fedex", requireAuth, async (req: any, res) => {
    const trackingNumber = (req.query.trackingNumber as string || '').trim();
    if (!trackingNumber) {
      return res.status(400).json({ error: "trackingNumber is required" });
    }

    try {
      console.log(`[FedEx] Tracking público: ${trackingNumber}`);

      const formData = new URLSearchParams();
      formData.append("data", JSON.stringify({
        TrackPackagesRequest: {
          appType: "WTRK",
          appDeviceType: "DESKTOP",
          supportHTML: true,
          supportCurrentLocation: true,
          uniqueKey: "",
          processingParameters: {},
          trackingInfoList: [{
            trackNumberInfo: {
              trackingNumber,
              trackingQualifier: "",
              trackingCarrier: ""
            }
          }]
        }
      }));
      formData.append("action", "trackpackages");
      formData.append("locale", "en_US");
      formData.append("version", "99");
      formData.append("format", "json");

      const response = await fetch("https://www.fedex.com/trackingCal/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
          "Origin": "https://www.fedex.com",
          "Referer": `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
        },
        body: formData,
      });

      const rawText = await response.text();
      console.log(`[FedEx] trackingCal status: ${response.status}, body: ${rawText.substring(0, 600)}`);

      let data: any;
      try { data = JSON.parse(rawText); } catch {
        return res.status(502).json({ error: "FedEx no devolvió JSON válido", raw: rawText.substring(0, 300) });
      }

      // Extraer el paquete del response
      const pkg = data?.TrackPackagesResponse?.packageList?.[0];
      if (!pkg) {
        return res.status(404).json({ error: "No se encontró el envío en FedEx", raw: JSON.stringify(data).substring(0, 300) });
      }

      // Estado y progreso
      const keyStatus = pkg.keyStatus || pkg.displayStatus || "Desconocido";
      const statusProgressMap: Record<string, number> = {
        "Delivered":           100,
        "Out for Delivery":     80,
        "In Transit":           55,
        "At Destination":       70,
        "Customs Cleared":      65,
        "In Customs":           60,
        "Picked Up":            25,
        "Label Created":        10,
        "Shipment Information": 10,
      };
      const progress = statusProgressMap[keyStatus] ?? 30;

      // Historial de eventos
      const events: any[] = pkg.scanEventList || [];
      const history = events.map((e: any) => ({
        date: e.date && e.time ? `${e.date} ${e.time}`.substring(0, 16) : e.date || "",
        status: e.status || e.scanDetails || "",
        location: [e.scanLocation, e.city, e.state, e.countryCode].filter(Boolean).join(", "),
      }));

      // Origen y destino
      const origin = pkg.originCity || pkg.shipperCity || "";
      const destination = pkg.destCity || pkg.recipientCity || "";
      const estimatedDelivery = pkg.displayDeliveryDt || pkg.deliveredDt || "";

      return res.json({
        carrier: "FedEx",
        trackingStatus: keyStatus,
        progress,
        estimatedDelivery,
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        trackingHistory: history,
      });

    } catch (err: any) {
      console.error("[FedEx] Error en tracking público:", err?.message || err);
      return res.status(500).json({ error: "Error consultando FedEx", detail: err?.message });
    }
  });
// Helper to wrap base64 strings to 76 chars per line (RFC 2045)
function splitBase64(str: string): string {
  const result: string[] = [];
  for (let i = 0; i < str.length; i += 76) {
    result.push(str.substring(i, i + 76));
  }
  return result.join('\r\n');
}

// Helper to construct a standard raw MIME message (RFC 2822)
function buildMimeMessage(options: {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  sapCode?: string;
  isArtwork?: boolean;
  attachments?: { name: string; content: string }[];
}) {
  const boundary = `----=_Part_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const lines: string[] = [];

  // Headers
  lines.push(`From: ${options.from}`);
  lines.push(`To: ${options.to.join(', ')}`);
  if (options.cc && options.cc.length > 0) {
    lines.push(`Cc: ${options.cc.join(', ')}`);
  }

  // RFC 2047 encoding for Subject to support UTF-8 accents/chars (e.g. ñ, á, é)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(options.subject, 'utf8').toString('base64')}?=`;
  lines.push(`Subject: ${encodedSubject}`);

  // Threading headers
  if (options.isArtwork && options.sapCode) {
    const baseId = `artwork_${options.sapCode.replace(/[^a-zA-Z0-9]/g, '')}`;
    const messageId = `<${baseId}_${Date.now()}@portal.sole.com.pe>`;
    
    // Deterministic references list. Linking all potential stages in the thread.
    const references = [
      `<${baseId}_REG@portal.sole.com.pe>`,
      `<${baseId}_ASG@portal.sole.com.pe>`,
      `<${baseId}_INI@portal.sole.com.pe>`,
      `<${baseId}_ID@portal.sole.com.pe>`,
      `<${baseId}_MKT@portal.sole.com.pe>`,
      `<${baseId}_PROV@portal.sole.com.pe>`,
      `<${baseId}_PLAN@portal.sole.com.pe>`,
      `<${baseId}_OBS1@portal.sole.com.pe>`,
      `<${baseId}_OBS2@portal.sole.com.pe>`,
      `<${baseId}_OBS3@portal.sole.com.pe>`,
      `<${baseId}_REQ1@portal.sole.com.pe>`,
      `<${baseId}_REQ2@portal.sole.com.pe>`,
      `<${baseId}_REQ3@portal.sole.com.pe>`
    ];

    let currentId = messageId;
    let parentId = `<${baseId}_REG@portal.sole.com.pe>`;
    
    const subLower = options.subject.toLowerCase();
    if (subLower.includes('nuevo registro') || subLower.includes('creado')) {
      currentId = `<${baseId}_REG@portal.sole.com.pe>`;
    } else if (subLower.includes('asignaci')) {
      currentId = `<${baseId}_ASG@portal.sole.com.pe>`;
      parentId = `<${baseId}_REG@portal.sole.com.pe>`;
    } else if (subLower.includes('nueva versi') || subLower.includes('lista para')) {
      currentId = `<${baseId}_INI@portal.sole.com.pe>`;
      parentId = `<${baseId}_ASG@portal.sole.com.pe>`;
    } else if (subLower.includes('listo para revisi') || subLower.includes('marketing')) {
      currentId = `<${baseId}_ID@portal.sole.com.pe>`;
      parentId = `<${baseId}_INI@portal.sole.com.pe>`;
    } else if (subLower.includes('pending provider') || subLower.includes('artwork review')) {
      currentId = `<${baseId}_MKT@portal.sole.com.pe>`;
      parentId = `<${baseId}_ID@portal.sole.com.pe>`;
    } else if (subLower.includes('supplier approved') || subLower.includes('planeamiento')) {
      currentId = `<${baseId}_PROV@portal.sole.com.pe>`;
      parentId = `<${baseId}_MKT@portal.sole.com.pe>`;
    } else if (subLower.includes('aprobaci') && subLower.includes('final')) {
      currentId = `<${baseId}_PLAN@portal.sole.com.pe>`;
      parentId = `<${baseId}_PROV@portal.sole.com.pe>`;
    } else if (subLower.includes('observaci')) {
      currentId = `<${baseId}_OBS_${Date.now()}@portal.sole.com.pe>`;
      parentId = `<${baseId}_INI@portal.sole.com.pe>`;
    } else if (subLower.includes('solicitud')) {
      currentId = `<${baseId}_REQ_${Date.now()}@portal.sole.com.pe>`;
      parentId = `<${baseId}_INI@portal.sole.com.pe>`;
    }

    lines.push(`Message-ID: ${currentId}`);
    lines.push(`In-Reply-To: ${parentId}`);
    lines.push(`References: ${references.join(' ')}`);
  } else {
    lines.push(`Message-ID: <${Date.now()}@portal.sole.com.pe>`);
  }

  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push(``); // End of headers

  // Body Part (HTML)
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/html; charset=utf-8`);
  lines.push(`Content-Transfer-Encoding: base64`);
  lines.push(``);
  const bodyBase64 = splitBase64(Buffer.from(options.body, 'utf8').toString('base64'));
  lines.push(bodyBase64);
  lines.push(``);

  // Attachments
  if (options.attachments && options.attachments.length > 0) {
    for (const attach of options.attachments) {
      lines.push(`--${boundary}`);
      const encodedName = `=?UTF-8?B?${Buffer.from(attach.name, 'utf8').toString('base64')}?=`;
      lines.push(`Content-Type: application/octet-stream; name="${encodedName}"`);
      lines.push(`Content-Disposition: attachment; filename="${encodedName}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push(``);
      lines.push(splitBase64(attach.content));
      lines.push(``);
    }
  }

  lines.push(`--${boundary}--`);

  return lines.join('\r\n');
}

  // Endpoint to send email notifications via MS Graph API (Protected)
  app.post("/api/send-email", requireAuth, async (req, res) => {
    const { to, subject, body, attachments, sapCode, isArtwork } = req.body;
    const userEmail = process.env.AZURE_MAIL_USER;

    try {
      const accessToken = await getAzureAccessToken();

      const recipientsData = await (async () => {
        try {
          const poolInstance = await getDBPool();
          const adminsRes = await poolInstance.request().query(`
            SELECT email FROM ID_PORTAL.profiles 
            WHERE role = 'admin' AND is_active = 1
          `);
          
          const adminEmails = (adminsRes.recordset || []).map((a: any) => a.email).filter(Boolean);
          console.log(`[EMAIL] Found ${adminEmails.length} active admins: ${adminEmails.join(', ')}`);

          // Normalize 'to' to a flat array of strings
          let requestedTo: string[] = [];
          if (Array.isArray(to)) {
            requestedTo = to.filter(e => typeof e === 'string' && e.length > 0);
          } else if (typeof to === 'string' && to.length > 0) {
            requestedTo = [to];
          }

          let finalTo: string[] = [];
          let finalCc: string[] = [];

          if (requestedTo.length > 0) {
            finalTo = requestedTo;
            finalCc = adminEmails.filter(email => !finalTo.includes(email));
          } else {
            finalTo = adminEmails;
            finalCc = [];
          }

          console.log(`[EMAIL] Sending to: ${finalTo.join(', ')} | CC admins: ${finalCc.join(', ')}`);

          return {
            toRecipients: finalTo.map(email => ({ emailAddress: { address: email } })),
            ccRecipients: finalCc.map(email => ({ emailAddress: { address: email } }))
          };
        } catch (err) {
          console.error("Error fetching admins for CC:", err);
          const fallbackTo = Array.isArray(to) ? to : [to];
          return {
            toRecipients: (fallbackTo || []).map((email: any) => ({ emailAddress: { address: email } })),
            ccRecipients: []
          };
        }
      })();

      let emailSent = false;
      let normalizedSubject = subject;

      // Threading logic for artwork tracking module using raw MIME
      if (isArtwork && sapCode) {
        try {
          console.log(`[EMAIL THREAD] Sending MIME threaded email for SAP code: ${sapCode}`);
          
          let description = "";
          try {
            const poolInstance = await getDBPool();
            const productRes = await poolInstance.request()
              .input('sapCode', sapCode)
              .query('SELECT descripcionSAP FROM ID_PORTAL.products WHERE codigoSAP = @sapCode');
            if (productRes.recordset && productRes.recordset.length > 0) {
              description = productRes.recordset[0].descripcionSAP || "";
            }
          } catch (dbErr) {
            console.error("[EMAIL THREAD] Error fetching product description:", dbErr);
          }

          // Build a single, standardized base subject for this SAP code thread
          const cleanDesc = description ? ` - ${description}` : "";
          const baseSubject = `Seguimiento de Arte - ${sapCode}${cleanDesc}`;

          // Check if this is the first email (like NEW REGISTRO). If not, prepend "Re: "
          const isFirst = subject.toLowerCase().includes('nuevo registro') || subject.toLowerCase().includes('creado');
          normalizedSubject = isFirst ? baseSubject : `Re: ${baseSubject}`;
          
          const finalTo = recipientsData.toRecipients.map(r => r.emailAddress.address);
          const finalCc = recipientsData.ccRecipients.map(r => r.emailAddress.address);

          const mimeMessage = buildMimeMessage({
            from: userEmail!,
            to: finalTo,
            cc: finalCc,
            subject: normalizedSubject,
            body: body,
            sapCode: sapCode,
            isArtwork: true,
            attachments: attachments
          });

          const base64Mime = Buffer.from(mimeMessage, 'utf8').toString('base64');
          const url = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;

          const mimeResponse = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "text/plain",
            },
            body: base64Mime,
          });

          if (mimeResponse.ok) {
            console.log(`[EMAIL THREAD] MIME threaded email sent successfully!`);
            emailSent = true;
          } else {
            const errBody = await mimeResponse.text();
            console.error(`[EMAIL THREAD] Failed to send MIME email: Status ${mimeResponse.status}, Error:`, errBody);
          }
        } catch (threadError) {
          console.error(`[EMAIL THREAD] Unexpected error in MIME threading flow:`, threadError);
        }
      }

      // Fallback or Standard: If not sent via threading, send standalone new email
      if (!emailSent) {
        console.log(`[EMAIL] Sending standalone new email (fallback or standard flow)...`);
        const url = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;
        const emailPayload = {
          message: {
            subject: normalizedSubject,
            body: {
              contentType: "HTML",
              content: body,
            },
            toRecipients: recipientsData.toRecipients,
            ccRecipients: recipientsData.ccRecipients,
            attachments: (attachments || []).map((file: any) => ({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: file.name,
              contentBytes: file.content,
            })),
          },
          saveToSentItems: "true",
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errorData = await response.json() as any;
          console.error("Graph API Error:", errorData);
          throw new Error(errorData.error?.message || "Failed to send email");
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  // Local JWT Auth: Signup / Register
  const signupHandler = async (req: express.Request, res: express.Response) => {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password, and fullName are required" });
    }

    try {
      const dbPool = await getDBPool();
      
      // Check if user already exists
      const checkUser = await dbPool.request()
        .input('email', email)
        .query('SELECT id FROM ID_PORTAL.profiles WHERE email = @email');
        
      if (checkUser.recordset.length > 0) {
        return res.status(400).json({ error: "El correo ya está registrado" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Get role ID dynamically by name
      let roleId: string | null = null;
      let roleName = 'Coordinador de I+D';

      let roleQuery = await dbPool.request()
        .input('roleName', roleName)
        .query('SELECT id FROM ID_PORTAL.roles WHERE name = @roleName');

      if (roleQuery.recordset.length > 0) {
        roleId = roleQuery.recordset[0].id;
      } else {
        // Try 'admin'
        roleQuery = await dbPool.request()
          .input('roleName', 'admin')
          .query('SELECT id, name FROM ID_PORTAL.roles WHERE name = @roleName');
        if (roleQuery.recordset.length > 0) {
          roleId = roleQuery.recordset[0].id;
          roleName = roleQuery.recordset[0].name;
        } else {
          // Just get the first role
          roleQuery = await dbPool.request()
            .query('SELECT TOP 1 id, name FROM ID_PORTAL.roles');
          if (roleQuery.recordset.length > 0) {
            roleId = roleQuery.recordset[0].id;
            roleName = roleQuery.recordset[0].name;
          }
        }
      }

      const insertRes = await dbPool.request()
        .input('email', email)
        .input('fullName', fullName)
        .input('passwordHash', passwordHash)
        .input('roleId', roleId)
        .input('roleName', roleName)
        .query(`
          INSERT INTO ID_PORTAL.profiles (email, full_name, role, role_id, password_hash, is_active)
          OUTPUT INSERTED.*
          VALUES (@email, @fullName, @roleName, @roleId, @passwordHash, 1)
        `);

      const userProfile = parseRowJSON(insertRes.recordset[0]);
      delete userProfile.password_hash;
      
      const token = jwt.sign({ id: userProfile.id, email: userProfile.email, role: userProfile.role }, JWT_SECRET, { expiresIn: '7d' });
      const session = { access_token: token, user: userProfile };
      
      res.json({ token, user: userProfile, session });
    } catch (err: any) {
      console.error("Signup error:", err);
      res.status(500).json({ error: err.message || "Failed to register user" });
    }
  };

  app.post("/api/auth/signup", signupHandler);
  app.post("/api/auth/register", signupHandler);

  // Temporary debugging route to inspect 3120SOLTEGE120C and its audit logs
  app.get("/api/temp-debug-product", async (req, res) => {
    try {
      const dbPool = await getDBPool();
      const productRes = await dbPool.request()
        .query("SELECT id, sap_code, correlative_id, tracking_type, explode_files FROM ID_PORTAL.products WHERE sap_code LIKE '%3120SOLTEGE120%'");
      
      const logsRes = await dbPool.request()
        .input('pid', '64AE2DE4-1DA8-40B7-A290-6C947C3A214D')
        .query(`
          SELECT id, user_email, action, entity_type, entity_id, entity_name, previous_data, new_data, created_at 
          FROM ID_PORTAL.audit_logs 
          WHERE entity_id = @pid
             OR previous_data LIKE '%' + @pid + '%'
             OR new_data LIKE '%' + @pid + '%'
          ORDER BY created_at DESC
        `);
      
      res.json({
        products: productRes.recordset,
        logs: logsRes.recordset
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Local JWT Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const dbPool = await getDBPool();
      const result = await dbPool.request()
        .input('email', email)
        .query('SELECT * FROM ID_PORTAL.profiles WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.status(400).json({ error: "Credenciales inválidas" });
      }

      const user = result.recordset[0];
      if (!user.is_active) {
        return res.status(400).json({ error: "El usuario está inactivo" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "Credenciales inválidas" });
      }

      const userProfile = parseRowJSON(user);
      delete userProfile.password_hash;

      const token = jwt.sign({ id: userProfile.id, email: userProfile.email, role: userProfile.role }, JWT_SECRET, { expiresIn: '7d' });
      const session = { access_token: token, user: userProfile };

      res.json({ token, user: userProfile, session });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: err.message || "Failed to log in" });
    }
  });

  // Local JWT Auth: Update password
  app.post("/api/auth/update-password", requireAuth, async (req: any, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    try {
      const dbPool = await getDBPool();
      const passwordHash = await bcrypt.hash(password, 10);
      
      await dbPool.request()
        .input('id', req.user.id)
        .input('passwordHash', passwordHash)
        .query('UPDATE ID_PORTAL.profiles SET password_hash = @passwordHash WHERE id = @id');

      res.json({ success: true });
    } catch (err: any) {
      console.error("Update password error:", err);
      res.status(500).json({ error: err.message || "Failed to update password" });
    }
  });

  // Local JWT Auth: Reset password request
  app.post("/api/auth/reset-password-request", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es requerido" });
    }

    try {
      const dbPool = await getDBPool();
      const result = await dbPool.request()
        .input('email', email)
        .query('SELECT * FROM ID_PORTAL.profiles WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.status(400).json({ error: "No existe un usuario registrado con este correo" });
      }

      const user = result.recordset[0];
      if (!user.is_active) {
        return res.status(400).json({ error: "El usuario se encuentra inactivo" });
      }

      // Generate a temporary recovery token valid for 1 hour
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, isRecovery: true },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const origin = req.headers.origin || 'https://no-code-creation-portal-management.jppsfv.easypanel.host';
      const recoveryUrl = `${origin}/?recovery=true&token=${token}&email=${encodeURIComponent(email)}`;

      console.log(`[PASSWORD RECOVERY] Generated recovery URL for ${email}: ${recoveryUrl}`);

      const userEmail = process.env.AZURE_MAIL_USER;
      if (!userEmail) {
        console.warn("[PASSWORD RECOVERY] AZURE_MAIL_USER is not defined in environment. Simulating successful send.");
        return res.json({ success: true, message: "Instrucciones de recuperación simuladas (ver log del servidor)." });
      }

      const accessToken = await getAzureAccessToken();
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;

      const emailPayload = {
        message: {
          subject: "Restablecer Contraseña - Portal de I+D",
          body: {
            contentType: "HTML",
            content: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                <div style="text-align: center; margin-bottom: 25px;">
                  <h2 style="color: #2563eb; margin-bottom: 5px; font-weight: 8px;">Portal de I+D Sole</h2>
                  <p style="color: #64748b; font-size: 14px; margin-top: 0; font-weight: 500;">Recuperación de Contraseña</p>
                </div>
                <p style="font-size: 16px; color: #1e293b; line-height: 1.6; font-weight: bold;">Hola, ${user.full_name}:</p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                  Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta vinculada en el Portal de I+D de Sole.
                </p>
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${recoveryUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                    Restablecer Contraseña
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.6; border-left: 3px solid #cbd5e1; padding-left: 12px; margin: 25px 0;">
                  <strong>Nota importante:</strong> Este enlace de recuperación es de un solo uso y expirará en un plazo de 1 hora. Si tú no has realizado esta solicitud, puedes ignorar este correo tranquilamente.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                  Este es un correo automático generado por el sistema. Por favor no respondas a este remitente.
                </p>
              </div>
            `,
          },
          toRecipients: [{ emailAddress: { address: email } }],
        },
        saveToSentItems: "false",
      };

      const graphResponse = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!graphResponse.ok) {
        const errorData = await graphResponse.json() as any;
        console.error("[PASSWORD RECOVERY] Microsoft Graph API error:", errorData);
        throw new Error(errorData.error?.message || "Failed to send email");
      }

      res.json({ success: true, message: "Enlace de recuperación enviado por correo electrónico." });
    } catch (error: any) {
      console.error("[PASSWORD RECOVERY] Fatal recovery error:", error);
      res.status(500).json({ error: "Error interno al enviar el correo de recuperación" });
    }
  });



  // Database REST Query Gateway
  app.post("/api/db/query", requireAuth, async (req: any, res) => {
    const {
      table,
      method,
      select,
      filters,
      orderCol,
      orderAscending,
      limit,
      payload,
      isSingle,
      isMaybeSingle,
      isUpsert
    } = req.body;

    try {
      const dbPool = await getDBPool();

      // --- 1. SELECT (GET) ---
      if (method === 'GET') {
        const request = dbPool.request();
        let query = '';
        
        const filterPrefix = (table === 'samples') ? 's.' :
                             (table === 'products') ? 'p.' :
                             (table === 'product_management') ? 'pm.' :
                             (table === 'energy_efficiency_records') ? 'ee.' : '';

        const whereClauses: string[] = [];
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any, idx: number) => {
            const paramName = `filter_${idx}`;
            
            let fieldName = filter.field;
            if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[fieldName]) {
              fieldName = EE_COLUMN_MAP[fieldName];
            } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[fieldName]) {
              fieldName = CATEGORIES_COLUMN_MAP[fieldName];
            }

            if (filter.op === 'eq') {
              if (filter.value === null) {
                whereClauses.push(`${filterPrefix}[${fieldName}] IS NULL`);
              } else {
                whereClauses.push(`${filterPrefix}[${fieldName}] = @${paramName}`);
                request.input(paramName, filter.value);
              }
            } else if (filter.op === 'neq') {
              if (filter.value === null) {
                whereClauses.push(`${filterPrefix}[${fieldName}] IS NOT NULL`);
              } else {
                whereClauses.push(`${filterPrefix}[${fieldName}] != @${paramName}`);
                request.input(paramName, filter.value);
              }
            } else if (filter.op === 'in') {
              if (Array.isArray(filter.value) && filter.value.length > 0) {
                const paramNames = filter.value.map((_, vIdx) => `@filter_${idx}_${vIdx}`);
                filter.value.forEach((val: any, vIdx: number) => {
                  request.input(`filter_${idx}_${vIdx}`, val);
                });
                whereClauses.push(`${filterPrefix}[${fieldName}] IN (${paramNames.join(', ')})`);
              } else {
                whereClauses.push(`1=0`);
              }
            }
          });
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const topString = limit ? `TOP ${limit}` : '';

        let orderColumnName = orderCol;
        if (orderCol) {
          if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[orderCol]) {
            orderColumnName = EE_COLUMN_MAP[orderCol];
          } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[orderCol]) {
            orderColumnName = CATEGORIES_COLUMN_MAP[orderCol];
          }
        }
        const orderString = orderColumnName ? `ORDER BY ${filterPrefix}[${orderColumnName}] ${orderAscending ? 'ASC' : 'DESC'}` : '';

        if (table === 'samples') {
          query = `
            SELECT ${topString} s.*, 
                   b.name as brand_name, 
                   sup.legal_name as supplier_legal_name, 
                   sup.commercial_alias as supplier_commercial_alias, 
                   sup.erp_code as supplier_erp_code, 
                   sup.email as supplier_email,
                   l.name as line_name, 
                   c.name as category_name
            FROM ID_PORTAL.samples s
            LEFT JOIN ID_PORTAL.brands b ON s.brand_id = b.id
            LEFT JOIN ID_PORTAL.suppliers sup ON s.supplier_id = sup.id
            LEFT JOIN ID_PORTAL.product_lines l ON s.line_id = l.id
            LEFT JOIN ID_PORTAL.categories c ON s.category_id = c.id
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'products') {
          query = `
            SELECT ${topString} p.*, 
                   b.name as brand_name, 
                   sup.legal_name as supplier_legal_name, 
                   sup.commercial_alias as supplier_commercial_alias, 
                   sup.erp_code as supplier_erp_code, 
                   sup.email as supplier_email,
                   l.name as line_name, 
                   c.name as category_name,
                   s.correlative_id as sample_correlative_id,
                   s.category_id as sample_category_id,
                   sc.name as sample_category_name
            FROM ID_PORTAL.products p
            LEFT JOIN ID_PORTAL.brands b ON p.brand_id = b.id
            LEFT JOIN ID_PORTAL.suppliers sup ON p.supplier_id = sup.id
            LEFT JOIN ID_PORTAL.product_lines l ON p.line_id = l.id
            LEFT JOIN ID_PORTAL.categories c ON p.category_id = c.id
            LEFT JOIN ID_PORTAL.samples s ON p.sample_id = s.id
            LEFT JOIN ID_PORTAL.categories sc ON s.category_id = sc.id
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'product_management') {
          query = `
            SELECT ${topString} pm.*, 
                   b.name as brand_name, 
                   sup.legal_name as supplier_legal_name, 
                   sup.commercial_alias as supplier_commercial_alias, 
                   sup.erp_code as supplier_erp_code, 
                   sup.email as supplier_email,
                   ksup.legal_name as kit_supplier_legal_name,
                   ksup.commercial_alias as kit_supplier_commercial_alias,
                   l.name as line_name, 
                   c.name as category_name
            FROM ID_PORTAL.product_management pm
            LEFT JOIN ID_PORTAL.brands b ON pm.brand_id = b.id
            LEFT JOIN ID_PORTAL.suppliers sup ON pm.supplier_id = sup.id
            LEFT JOIN ID_PORTAL.suppliers ksup ON pm.kit_supplier_id = ksup.id
            LEFT JOIN ID_PORTAL.product_lines l ON pm.line_id = l.id
            LEFT JOIN ID_PORTAL.categories c ON pm.category_id = c.id
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'energy_efficiency_records') {
          query = `
            SELECT ${topString} 
                   ee.id, 
                   ee.codigo_mt AS mt_code, 
                   ee.descripcion AS description, 
                   ee.letra AS letter, 
                   ee.porcentaje_ee AS ee_percentage, 
                   ee.ocp, 
                   ee.supplier_id, 
                   ee.line_id,
                   ee.category_id,
                   ee.fecha_emision AS emission_date, 
                   ee.fecha_vigilancia AS vigilance_date, 
                   ee.tipo_producto AS product_type, 
                   ee.sample_id, 
                   ee.certificado_file AS certificate_file, 
                   ee.certificado_history AS certificate_history, 
                   ee.etiqueta_file AS label_file, 
                   ee.etiqueta_history AS label_history, 
                   ee.test_report_file AS test_report_file, 
                   ee.test_report_history AS test_report_history, 
                   ee.gallery, 
                   ee.created_at, 
                   ee.updated_at,
                   sup.legal_name AS supplier_legal_name,
                   l.name AS line_name,
                   c.name AS category_name
            FROM ID_PORTAL.energy_efficiency_records ee
            LEFT JOIN ID_PORTAL.suppliers sup ON ee.supplier_id = sup.id
            LEFT JOIN ID_PORTAL.product_lines l ON ee.line_id = l.id
            LEFT JOIN ID_PORTAL.categories c ON ee.category_id = c.id
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'categories') {
          query = `
            SELECT ${topString} 
                   id, 
                   name, 
                   product_line_id AS line_id, 
                   created_at, 
                   updated_at
            FROM ID_PORTAL.categories
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'roles') {
          const rolesRes = await dbPool.request().query('SELECT * FROM ID_PORTAL.roles ORDER BY [level] DESC');
          const permsRes = await dbPool.request().query(`
            SELECT rp.role_id, p.id, p.name, p.description, p.module
            FROM ID_PORTAL.role_permissions rp
            JOIN ID_PORTAL.permissions p ON rp.permission_id = p.id
          `);
          const roles = rolesRes.recordset.map(parseRowJSON);
          const perms = permsRes.recordset.map(parseRowJSON);
          roles.forEach(role => {
            role.permissions = perms
              .filter(p => p.role_id === role.id)
              .map(p => ({ permissions: { id: p.id, name: p.name, description: p.description, module: p.module } }));
          });
          
          if (isSingle) {
            return res.json(roles[0] || null);
          }
          return res.json(roles);
        } else {
          query = `
            SELECT ${topString} * FROM ID_PORTAL.[${table}]
            ${whereString}
            ${orderString}
          `;
        }

        const dbRes = await request.query(query);

        let rows = dbRes.recordset.map(parseRowJSON);

        // Map joins structures back to Supabase client format
        if (table === 'samples') {
          rows = rows.map(row => {
            row.brand = row.brand_name ? { name: row.brand_name } : null;
            row.supplier = row.supplier_legal_name ? {
              legal_name: row.supplier_legal_name,
              commercial_alias: row.supplier_commercial_alias,
              erp_code: row.supplier_erp_code,
              email: row.supplier_email
            } : null;
            row.line = row.line_name ? { name: row.line_name } : null;
            row.category = row.category_name ? { name: row.category_name } : null;
            return row;
          });
        } else if (table === 'products') {
          rows = rows.map(row => {
            row.brand = row.brand_name ? { name: row.brand_name } : null;
            row.supplier = row.supplier_legal_name ? {
              legal_name: row.supplier_legal_name,
              commercial_alias: row.supplier_commercial_alias,
              erp_code: row.supplier_erp_code,
              email: row.supplier_email
            } : null;
            row.line = row.line_name ? { name: row.line_name } : null;
            row.category = row.category_name ? { name: row.category_name } : null;
            row.sample = row.sample_correlative_id ? {
              correlative_id: row.sample_correlative_id,
              category_id: row.sample_category_id,
              category: row.sample_category_name ? { name: row.sample_category_name } : null
            } : null;
            return row;
          });
        } else if (table === 'product_management') {
          rows = rows.map(row => {
            row.brand = row.brand_name ? { name: row.brand_name } : null;
            row.supplier = row.supplier_legal_name ? {
              legal_name: row.supplier_legal_name,
              commercial_alias: row.supplier_commercial_alias,
              erp_code: row.supplier_erp_code,
              email: row.supplier_email
            } : null;
            row.line = row.line_name ? { name: row.line_name } : null;
            row.category = row.category_name ? { name: row.category_name } : null;
            return row;
          });
        } else if (table === 'energy_efficiency_records') {
          rows = rows.map(row => {
            row.supplier = row.supplier_legal_name ? { legal_name: row.supplier_legal_name } : null;
            row.line = row.line_name ? { name: row.line_name } : null;
            row.category = row.category_name ? { name: row.category_name } : null;
            return row;
          });
        }

        if (isSingle || isMaybeSingle) {
          return res.json(rows[0] || null);
        }
        return res.json(rows);
      }

      // --- 2. INSERT / UPSERT (POST) ---
      if (method === 'POST') {
        const isArray = Array.isArray(payload);
        const rows = isArray ? payload : [payload];
        const resultRows = [];

        // Map payload fields to DB columns
        const mappedRows = rows.map(row => {
          const mappedRow: any = {};
          for (const key of Object.keys(row)) {
            let dbKey = key;
            if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[key]) {
              dbKey = EE_COLUMN_MAP[key];
            } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[key]) {
              dbKey = CATEGORIES_COLUMN_MAP[key];
            }
            mappedRow[dbKey] = row[key];
          }
          return mappedRow;
        });

        for (const row of mappedRows) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          // If upsert is requested
          if (isUpsert) {
            let checkQuery = '';
            const checkRequest = dbPool.request();
            
            if (table === 'canton_fair_settings' && row.year !== undefined) {
              checkQuery = `SELECT 1 FROM ID_PORTAL.[${table}] WHERE [year] = @check_year`;
              checkRequest.input('check_year', row.year);
            } else if (table === 'category_gmroi_thresholds' && row.category_id !== undefined) {
              checkQuery = `SELECT 1 FROM ID_PORTAL.[${table}] WHERE [category_id] = @check_cat_id`;
              checkRequest.input('check_cat_id', row.category_id);
            } else if (row.id !== undefined && row.id !== null) {
              checkQuery = `SELECT 1 FROM ID_PORTAL.[${table}] WHERE [id] = @check_id`;
              checkRequest.input('check_id', row.id);
            }

            if (checkQuery) {
              const existsRes = await checkRequest.query(checkQuery);
              if (existsRes.recordset && existsRes.recordset.length > 0) {
                // Perform UPDATE
                const updateRequest = dbPool.request();
                const setClauses = keys.map((k, i) => {
                  let val = row[k];
                  const paramName = `update_${i}`;
                  if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(val))) {
                    updateRequest.input(paramName, sql.DateTime2, new Date(val));
                  } else if (typeof val === 'object' && val !== null) {
                    updateRequest.input(paramName, sql.NVarChar(sql.MAX), JSON.stringify(val));
                  } else {
                    updateRequest.input(paramName, val);
                  }
                  return `[${k}] = @${paramName}`;
                }).join(', ');

                let updateQuery = '';
                if (table === 'canton_fair_settings') {
                  updateQuery = `
                    UPDATE ID_PORTAL.[${table}]
                    SET ${setClauses}
                    OUTPUT INSERTED.*
                    WHERE [year] = @check_year
                  `;
                  updateRequest.input('check_year', row.year);
                } else if (table === 'category_gmroi_thresholds') {
                  updateQuery = `
                    UPDATE ID_PORTAL.[${table}]
                    SET ${setClauses}
                    OUTPUT INSERTED.*
                    WHERE [category_id] = @check_cat_id
                  `;
                  updateRequest.input('check_cat_id', row.category_id);
                } else {
                  updateQuery = `
                    UPDATE ID_PORTAL.[${table}]
                    SET ${setClauses}
                    OUTPUT INSERTED.*
                    WHERE [id] = @check_id
                  `;
                  updateRequest.input('check_id', row.id);
                }

                const updateRes = await updateRequest.query(updateQuery);
                if (updateRes.recordset && updateRes.recordset[0]) {
                  let returnedRow = parseRowJSON(updateRes.recordset[0]);
                  if (returnedRow.id) {
                    const joined = await fetchJoinedRow(table, returnedRow.id, dbPool);
                    if (joined) returnedRow = joined;
                    else returnedRow = mapRowFromDb(table, returnedRow);
                  } else {
                    returnedRow = mapRowFromDb(table, returnedRow);
                  }
                  resultRows.push(returnedRow);
                  continue;
                }
              }
            }
          }

          // Fallback to INSERT
          const rowRequest = dbPool.request();
          const columns = keys.map(k => `[${k}]`).join(', ');
          const valuesPlaceholders = keys.map((k, i) => {
            let val = row[k];
            const paramName = `param_${i}`;
            if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(val))) {
              rowRequest.input(paramName, sql.DateTime2, new Date(val));
            } else if (typeof val === 'object' && val !== null) {
              rowRequest.input(paramName, sql.NVarChar(sql.MAX), JSON.stringify(val));
            } else {
              rowRequest.input(paramName, val);
            }
            return `@${paramName}`;
          }).join(', ');

          const query = `INSERT INTO ID_PORTAL.[${table}] (${columns}) OUTPUT INSERTED.* VALUES (${valuesPlaceholders})`;
          const result = await rowRequest.query(query);
          if (result.recordset && result.recordset[0]) {
            let returnedRow = parseRowJSON(result.recordset[0]);
            if (returnedRow.id) {
              const joined = await fetchJoinedRow(table, returnedRow.id, dbPool);
              if (joined) returnedRow = joined;
              else returnedRow = mapRowFromDb(table, returnedRow);
            } else {
              returnedRow = mapRowFromDb(table, returnedRow);
            }
            resultRows.push(returnedRow);
          }
        }
        
        return res.json(isArray ? resultRows : resultRows[0]);
      }


      // --- 3. UPDATE (PUT) ---
      if (method === 'PUT') {
        const keys = Object.keys(payload);
        if (keys.length === 0) {
          return res.status(400).json({ error: "No fields to update" });
        }

        // Map payload fields to DB columns
        const dbPayload: any = {};
        for (const key of Object.keys(payload)) {
          let dbKey = key;
          if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[key]) {
            dbKey = EE_COLUMN_MAP[key];
          } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[key]) {
            dbKey = CATEGORIES_COLUMN_MAP[key];
          }
          dbPayload[dbKey] = payload[key];
        }

        const dbKeys = Object.keys(dbPayload);
        const request = dbPool.request();
        const setClauses = dbKeys.map((k, i) => {
          let val = dbPayload[k];
          const paramName = `update_${i}`;
          if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:\d{2}|Z)?)?$/.test(val))) {
            request.input(paramName, sql.DateTime2, new Date(val));
          } else if (typeof val === 'object' && val !== null) {
            request.input(paramName, sql.NVarChar(sql.MAX), JSON.stringify(val));
          } else {
            request.input(paramName, val);
          }
          return `[${k}] = @${paramName}`;
        }).join(', ');

        const whereClauses: string[] = [];
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any, idx: number) => {
            const paramName = `filter_${idx}`;
            if (filter.op === 'eq') {
              let fieldName = filter.field;
              if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[fieldName]) {
                fieldName = EE_COLUMN_MAP[fieldName];
              } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[fieldName]) {
                fieldName = CATEGORIES_COLUMN_MAP[fieldName];
              }
              whereClauses.push(`[${fieldName}] = @${paramName}`);
              request.input(paramName, filter.value);
            }
          });
        }

        if (whereClauses.length === 0) {
          return res.status(400).json({ error: "Cannot update without filters" });
        }

        const query = `
          UPDATE ID_PORTAL.[${table}] 
          SET ${setClauses} 
          OUTPUT INSERTED.* 
          WHERE ${whereClauses.join(' AND ')}
        `;
        const result = await request.query(query);
        let rows = result.recordset.map(parseRowJSON);
        const joinedRows = [];
        for (const r of rows) {
          if (r.id) {
            const joined = await fetchJoinedRow(table, r.id, dbPool);
            if (joined) joinedRows.push(joined);
            else joinedRows.push(mapRowFromDb(table, r));
          } else {
            joinedRows.push(mapRowFromDb(table, r));
          }
        }
        rows = joinedRows;
        
        return res.json(isSingle || isMaybeSingle ? (rows[0] || null) : rows);
      }


      // --- 4. DELETE ---
      if (method === 'DELETE') {
        const request = dbPool.request();
        const whereClauses: string[] = [];
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any, idx: number) => {
            const paramName = `filter_${idx}`;
            if (filter.op === 'eq') {
              let fieldName = filter.field;
              if (table === 'energy_efficiency_records' && EE_COLUMN_MAP[fieldName]) {
                fieldName = EE_COLUMN_MAP[fieldName];
              } else if (table === 'categories' && CATEGORIES_COLUMN_MAP[fieldName]) {
                fieldName = CATEGORIES_COLUMN_MAP[fieldName];
              }
              whereClauses.push(`[${fieldName}] = @${paramName}`);
              request.input(paramName, filter.value);
            }
          });
        }

        if (whereClauses.length === 0) {
          return res.status(400).json({ error: "Cannot delete without filters" });
        }

        const query = `DELETE FROM ID_PORTAL.[${table}] WHERE ${whereClauses.join(' AND ')}`;
        await request.query(query);
        return res.json({ success: true });
      }


      res.status(400).json({ error: `Method ${method} not implemented` });
    } catch (err: any) {
      console.error("DB Query error:", err);
      res.status(500).json({ error: err.message || "Database query failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // RUN SCHEMA MIGRATIONS
    console.log("Running startup schema migrations...");
    try {
      const dbPool = await getDBPool();
      await dbPool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.energy_efficiency_records') AND name = 'line_id')
        BEGIN
            ALTER TABLE ID_PORTAL.energy_efficiency_records ADD line_id uniqueidentifier REFERENCES ID_PORTAL.product_lines(id);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.energy_efficiency_records') AND name = 'category_id')
        BEGIN
            ALTER TABLE ID_PORTAL.energy_efficiency_records ADD category_id uniqueidentifier REFERENCES ID_PORTAL.categories(id);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.profiles') AND name = 'avatar_url')
        BEGIN
            ALTER TABLE ID_PORTAL.profiles ADD avatar_url nvarchar(max);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.profiles') AND name = 'scopes')
        BEGIN
            ALTER TABLE ID_PORTAL.profiles ADD scopes nvarchar(max) DEFAULT '[]';
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.innovation_proposals') AND name = 'updates')
        BEGIN
            ALTER TABLE ID_PORTAL.innovation_proposals ADD updates nvarchar(max);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.rd_custom_projects') AND name = 'updates')
        BEGIN
            ALTER TABLE ID_PORTAL.rd_custom_projects ADD updates nvarchar(max);
        END

        DECLARE @ConstraintName NVARCHAR(255);
        SELECT TOP 1 @ConstraintName = dc.name
        FROM sys.key_constraints dc
        WHERE dc.parent_object_id = OBJECT_ID('ID_PORTAL.products')
          AND dc.type = 'UQ'
          AND EXISTS (
              SELECT 1 FROM sys.index_columns ic 
              JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
              WHERE ic.object_id = dc.parent_object_id AND ic.index_id = dc.unique_index_id
                AND c.name = 'sap_code'
          );

        IF @ConstraintName IS NOT NULL
        BEGIN
            DECLARE @DropSql NVARCHAR(MAX) = 'ALTER TABLE ID_PORTAL.products DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
            EXEC sp_executesql @DropSql;
        END

        DECLARE @IndexName NVARCHAR(255);
        SELECT TOP 1 @IndexName = name
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('ID_PORTAL.products')
          AND is_unique = 1
          AND is_primary_key = 0
          AND EXISTS (
              SELECT 1 FROM sys.index_columns ic
              JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
              WHERE ic.object_id = sys.indexes.object_id AND ic.index_id = sys.indexes.index_id
                AND c.name = 'sap_code'
          );

        IF @IndexName IS NOT NULL
        BEGIN
            DECLARE @DropIndexSql NVARCHAR(MAX) = 'DROP INDEX ' + QUOTENAME(@IndexName) + ' ON ID_PORTAL.products';
            EXEC sp_executesql @DropIndexSql;
        END

        IF NOT EXISTS (
            SELECT 1 FROM sys.key_constraints 
            WHERE parent_object_id = OBJECT_ID('ID_PORTAL.products') AND name = 'UQ_products_sap_code_tracking_type'
        )
        BEGIN
            ALTER TABLE ID_PORTAL.products ADD CONSTRAINT UQ_products_sap_code_tracking_type UNIQUE (sap_code, tracking_type);
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.products') AND name = 'comments')
        BEGIN
            ALTER TABLE ID_PORTAL.products ADD comments nvarchar(max);
        END


        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('ID_PORTAL.quality_claims') AND type in (N'U'))
        BEGIN
            CREATE TABLE ID_PORTAL.quality_claims (
                id uniqueidentifier PRIMARY KEY DEFAULT newid(),
                product_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.products(id) ON DELETE CASCADE,
                sap_code nvarchar(100) NOT NULL,
                tracking_type nvarchar(100) NOT NULL,
                responsible_name nvarchar(255) NOT NULL,
                responsible_email nvarchar(255),
                defect_type nvarchar(100) NOT NULL,
                document_category nvarchar(255) NOT NULL,
                comments nvarchar(max),
                claim_start_date datetime2 NOT NULL DEFAULT GETDATE(),
                claim_end_date datetime2,
                status nvarchar(100) NOT NULL DEFAULT 'open',
                attachments nvarchar(max),
                resolution_comments nvarchar(max),
                resolved_by nvarchar(255),
                created_at datetime2 DEFAULT GETDATE(),
                updated_at datetime2 DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('ID_PORTAL.price_gmroi_templates') AND type in (N'U'))
        BEGIN
            CREATE TABLE ID_PORTAL.price_gmroi_templates (
                id uniqueidentifier PRIMARY KEY DEFAULT newid(),
                name nvarchar(255) NOT NULL,
                sap_code nvarchar(100) NOT NULL,
                line_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.product_lines(id),
                category_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.categories(id),
                pvp_lista decimal(18, 4) NOT NULL DEFAULT 0,
                pvp_promocion decimal(18, 4) NOT NULL DEFAULT 0,
                margen_distribuidor decimal(18, 4) NOT NULL DEFAULT 0,
                acuerdo_comercial decimal(18, 4) NOT NULL DEFAULT 0,
                fob_unitario decimal(18, 4) NOT NULL DEFAULT 0,
                tipo_cambio decimal(18, 4) NOT NULL DEFAULT 0,
                costo_instalacion decimal(18, 4) NOT NULL DEFAULT 0,
                costo_flete_contenedor decimal(18, 4) NOT NULL DEFAULT 0,
                unidades_contenedor int NOT NULL DEFAULT 0,
                ingresar_costo_directo bit NOT NULL DEFAULT 1,
                gasto_estimado_consolidado decimal(18, 4) NOT NULL DEFAULT 0,
                gasto_unitario_aplicado decimal(18, 4) NOT NULL DEFAULT 0,
                forecast_demanda nvarchar(max) NOT NULL DEFAULT '[]',
                llegada_stock nvarchar(max) NOT NULL DEFAULT '[]',
                created_at datetime2 DEFAULT GETDATE(),
                updated_at datetime2 DEFAULT GETDATE()
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('ID_PORTAL.category_gmroi_thresholds') AND type in (N'U'))
        BEGIN
            CREATE TABLE ID_PORTAL.category_gmroi_thresholds (
                id uniqueidentifier PRIMARY KEY DEFAULT newid(),
                category_id uniqueidentifier NOT NULL REFERENCES ID_PORTAL.categories(id) ON DELETE CASCADE,
                min_medio decimal(18, 4) NOT NULL DEFAULT 0.8,
                min_alto decimal(18, 4) NOT NULL DEFAULT 1.2,
                created_at datetime2 DEFAULT GETDATE(),
                updated_at datetime2 DEFAULT GETDATE(),
                CONSTRAINT UQ_category_gmroi_thresholds UNIQUE (category_id)
            );
        END

        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('ID_PORTAL.soly_reminders') AND type in (N'U'))
        BEGIN
            CREATE TABLE ID_PORTAL.soly_reminders (
                id uniqueidentifier PRIMARY KEY DEFAULT newid(),
                sender_name nvarchar(255) NOT NULL,
                sender_email nvarchar(255),
                receiver_name nvarchar(255) NOT NULL,
                receiver_email nvarchar(255),
                message nvarchar(max) NOT NULL,
                status nvarchar(100) NOT NULL DEFAULT 'pending',
                created_at datetime2 DEFAULT GETDATE(),
                updated_at datetime2 DEFAULT GETDATE()
            );
        END
      `);

      // ─── LINEAL DE PRODUCTOS COLUMN MIGRATION ─────────────────────────────────
      // Idempotently adds new columns needed for the Lineal de Productos feature
      try {
        const migPool = await getDBPool();
        const linealMigrationSQL = `
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'segment')
            ALTER TABLE ID_PORTAL.product_management ADD segment nvarchar(50) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'commercial_name')
            ALTER TABLE ID_PORTAL.product_management ADD commercial_name nvarchar(255) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'detailed_description')
            ALTER TABLE ID_PORTAL.product_management ADD detailed_description nvarchar(max) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'product_status')
            ALTER TABLE ID_PORTAL.product_management ADD product_status nvarchar(50) NULL DEFAULT 'vigente';
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'habilitado')
            ALTER TABLE ID_PORTAL.product_management ADD habilitado bit NULL DEFAULT 0;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'incluye_kit')
            ALTER TABLE ID_PORTAL.product_management ADD incluye_kit bit NULL DEFAULT 0;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'habilitacion_costo')
            ALTER TABLE ID_PORTAL.product_management ADD habilitacion_costo decimal(18,4) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'pvp')
            ALTER TABLE ID_PORTAL.product_management ADD pvp decimal(18,4) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'pvp_descuento')
            ALTER TABLE ID_PORTAL.product_management ADD pvp_descuento decimal(18,4) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_current_year')
            ALTER TABLE ID_PORTAL.product_management ADD sales_current_year int NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_previous_year')
            ALTER TABLE ID_PORTAL.product_management ADD sales_previous_year int NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'current_year')
            ALTER TABLE ID_PORTAL.product_management ADD current_year int NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'previous_year')
            ALTER TABLE ID_PORTAL.product_management ADD previous_year int NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'catalog_comments')
            ALTER TABLE ID_PORTAL.product_management ADD catalog_comments nvarchar(max) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'categoria')
            ALTER TABLE ID_PORTAL.product_management ADD categoria nvarchar(255) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'replaces_product_id')
            ALTER TABLE ID_PORTAL.product_management ADD replaces_product_id uniqueidentifier NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'sales_history')
            ALTER TABLE ID_PORTAL.product_management ADD sales_history nvarchar(max) NULL;
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'kit_supplier_id')
            ALTER TABLE ID_PORTAL.product_management ADD kit_supplier_id uniqueidentifier NULL;
        `;
        await migPool.request().query(linealMigrationSQL);
        console.log('✅ Lineal de Productos column migration completed successfully');
      } catch (linealMigErr) {
        console.error('❌ Error in Lineal de Productos column migration:', linealMigErr);
      }
      // ─── END LINEAL DE PRODUCTOS MIGRATION ───────────────────────────────────

      // ─── PERMISSIONS SEED MIGRATION ───────────────────────────────────────────

      // Inserts all system permissions if they don't exist, then assigns them
      // to every existing role. Admin-only permissions (users:view, master_data:view)
      // are only assigned to roles with level >= 90 or named 'admin'/'Administrador'.
      // This runs idempotently on every server start.
      try {
        const dbPool2 = await getDBPool();

        // 1. Define all permissions the system uses
        const allPermissions: { name: string; description: string; module: string; adminOnly: boolean }[] = [
          // Gestión Operativa
          { name: 'calendar:view',           description: 'Ver Calendario',                 module: 'Gestión Operativa',      adminOnly: false },
          { name: 'work_plan:view',           description: 'Ver Plan de Trabajo',            module: 'Gestión Operativa',      adminOnly: false },
          { name: 'artwork:view',             description: 'Ver Seguimiento de Artes',       module: 'Gestión Operativa',      adminOnly: false },
          { name: 'artwork:edit',             description: 'Editar / Crear Artes',           module: 'Gestión Operativa',      adminOnly: false },
          { name: 'technical_sheets:view',    description: 'Ver Fichas Técnicas y Comerciales', module: 'Gestión Operativa',  adminOnly: false },
          { name: 'technical_sheets:edit',    description: 'Editar Fichas Técnicas y Comerciales', module: 'Gestión Operativa', adminOnly: false },
          { name: 'quality_claims:view',      description: 'Ver Reclamos de Calidad',        module: 'Gestión Operativa',      adminOnly: false },
          { name: 'quality_claims:edit',      description: 'Registrar / Resolver Reclamos',  module: 'Gestión Operativa',      adminOnly: false },
          // Archivo Histórico
          { name: 'approved_artworks:view',   description: 'Ver Artes Aprobadas',            module: 'Archivo Histórico',      adminOnly: false },
          { name: 'approved_technical:view',  description: 'Ver Fichas Técnicas Aprobadas',  module: 'Archivo Histórico',      adminOnly: false },
          { name: 'approved_commercial:view', description: 'Ver Fichas Comerciales Aprobadas', module: 'Archivo Histórico',   adminOnly: false },
          // Desarrollo I+D
          { name: 'projects:view',            description: 'Ver Proyectos I+D',              module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'projects:edit',            description: 'Crear / Editar Proyectos I+D',   module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'projects:progress',        description: 'Registrar Avances en Proyectos', module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'proposals:view',           description: 'Ver Propuestas de Innovación',   module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'proposals:edit',           description: 'Crear / Editar Propuestas',      module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'inventory:view',           description: 'Ver Inventario I+D',             module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'inventory:edit',           description: 'Editar Inventario I+D',          module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'suppliers:view',           description: 'Ver Maestro de Proveedores',     module: 'Desarrollo I+D',          adminOnly: false },
          { name: 'suppliers:edit',           description: 'Editar Proveedores',             module: 'Desarrollo I+D',          adminOnly: false },
          // Ingeniería & Productos
          { name: 'samples:view',             description: 'Ver Muestras',                   module: 'Ingeniería & Productos',  adminOnly: false },
          { name: 'samples:edit',             description: 'Registrar / Editar Muestras',    module: 'Ingeniería & Productos',  adminOnly: false },
          { name: 'catalog:view',             description: 'Ver Catálogo de Productos',      module: 'Ingeniería & Productos',  adminOnly: false },
          { name: 'catalog:edit',             description: 'Editar Catálogo de Productos',   module: 'Ingeniería & Productos',  adminOnly: false },
          { name: 'efficiency:view',          description: 'Ver Eficiencia Energética',      module: 'Ingeniería & Productos',  adminOnly: false },
          { name: 'calculations:view',        description: 'Ver Panel de Cálculos',          module: 'Ingeniería & Productos',  adminOnly: false },
          // Recursos & Guías
          { name: 'brandbook:view',           description: 'Ver Brandbook',                  module: 'Recursos & Guías',        adminOnly: false },
          { name: 'regulations:view',         description: 'Ver Normas NTP',                 module: 'Recursos & Guías',        adminOnly: false },
          { name: 'price_gmroi_simulator:view', description: 'Ver Simulador de Precios y GMROI', module: 'Recursos & Guías',      adminOnly: false },
          { name: 'fairs:view',               description: 'Ver Ferias Internacionales',     module: 'Recursos & Guías',        adminOnly: false },
          { name: 'apps:view',                description: 'Ver Aplicaciones',               module: 'Recursos & Guías',        adminOnly: false },
          { name: 'records:view',             description: 'Ver Registros Base',             module: 'Recursos & Guías',        adminOnly: false },
          // Configuración (admin only)
          { name: 'users:view',               description: 'Gestionar Usuarios y Permisos',  module: 'Configuración',           adminOnly: true  },
          { name: 'master_data:view',         description: 'Ver Maestro de Datos',           module: 'Configuración',           adminOnly: true  },
        ];

        // 2. Upsert permissions (insert if not exists)
        for (const perm of allPermissions) {
          await dbPool2.request()
            .input('pname', sql.NVarChar, perm.name)
            .input('pdesc', sql.NVarChar, perm.description)
            .input('pmod',  sql.NVarChar, perm.module)
            .query(
              'IF NOT EXISTS (SELECT 1 FROM ID_PORTAL.permissions WHERE name = @pname) ' +
              'INSERT INTO ID_PORTAL.permissions (name, description, module) VALUES (@pname, @pdesc, @pmod);'
            );
        }

        // 3. Get all roles and all permissions
        const rolesRes = await dbPool2.request().query('SELECT id, name, display_name, [level] FROM ID_PORTAL.roles');
        const permsRes = await dbPool2.request().query('SELECT id, name FROM ID_PORTAL.permissions');
        const roles: any[] = rolesRes.recordset;
        const permsMap: Record<string, number> = {};
        for (const p of permsRes.recordset) permsMap[p.name] = p.id;

        // 4. For each role, ensure all applicable permissions are assigned
        for (const role of roles) {
          const isAdmin = role.name === 'admin' || role.display_name === 'Administrador' || (role.level || 0) >= 90;
          for (const perm of allPermissions) {
            if (perm.adminOnly && !isAdmin) continue; // skip admin-only for non-admins
            const permId = permsMap[perm.name];
            if (!permId) continue;
            await dbPool2.request()
              .input('rid', sql.UniqueIdentifier, role.id)
              .input('pid', sql.Int, permId)
              .query(
                'IF NOT EXISTS (SELECT 1 FROM ID_PORTAL.role_permissions WHERE role_id = @rid AND permission_id = @pid) ' +
                'INSERT INTO ID_PORTAL.role_permissions (role_id, permission_id) VALUES (@rid, @pid);'
              );
          }
        }
        console.log("Permissions seed migration completed successfully");
      } catch (permErr) {
        console.error("Error running permissions seed migration:", permErr);
      }
      // ─── END PERMISSIONS SEED MIGRATION ──────────────────────────────────────
      console.log("Startup migrations completed successfully");
    } catch (migErr) {
      console.error("Error running startup database migrations:", migErr);
    }
  });
}

startServer();
