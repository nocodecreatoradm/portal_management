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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQL Server Connection Pool
let pool: sql.ConnectionPool | null = null;

async function getDBPool() {
  if (pool) return pool;
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
  pool = await sql.connect(dbConfig);
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

  // Endpoint to send email notifications via MS Graph API (Protected)
  app.post("/api/send-email", requireAuth, async (req, res) => {
    const { to, subject, body, attachments } = req.body;
    const userEmail = process.env.AZURE_MAIL_USER;

    try {
      const accessToken = await getAzureAccessToken();
      const url = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;

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

      const emailPayload = {
        message: {
          subject: subject,
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
      const defaultRoleId = '550e8400-e29b-41d4-a716-446655440004'; // Coordinador de I+D role ID

      const insertRes = await dbPool.request()
        .input('email', email)
        .input('fullName', fullName)
        .input('passwordHash', passwordHash)
        .input('roleId', defaultRoleId)
        .query(`
          INSERT INTO ID_PORTAL.profiles (email, full_name, role, role_id, password_hash, is_active)
          OUTPUT INSERTED.*
          VALUES (@email, @fullName, 'Coordinador de I+D', @roleId, @passwordHash, 1)
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

  // Local JWT Auth: Reset password request (Mocked)
  app.post("/api/auth/reset-password-request", async (req, res) => {
    res.json({ success: true, message: "Instrucciones de recuperación enviadas" });
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
            if (filter.op === 'eq') {
              if (filter.value === null) {
                whereClauses.push(`${filterPrefix}[${filter.field}] IS NULL`);
              } else {
                whereClauses.push(`${filterPrefix}[${filter.field}] = @${paramName}`);
                request.input(paramName, filter.value);
              }
            } else if (filter.op === 'neq') {
              if (filter.value === null) {
                whereClauses.push(`${filterPrefix}[${filter.field}] IS NOT NULL`);
              } else {
                whereClauses.push(`${filterPrefix}[${filter.field}] != @${paramName}`);
                request.input(paramName, filter.value);
              }
            } else if (filter.op === 'in') {
              if (Array.isArray(filter.value) && filter.value.length > 0) {
                const paramNames = filter.value.map((_, vIdx) => `@filter_${idx}_${vIdx}`);
                filter.value.forEach((val: any, vIdx: number) => {
                  request.input(`filter_${idx}_${vIdx}`, val);
                });
                whereClauses.push(`${filterPrefix}[${filter.field}] IN (${paramNames.join(', ')})`);
              } else {
                whereClauses.push(`1=0`);
              }
            }
          });
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const topString = limit ? `TOP ${limit}` : '';
        const orderString = orderCol ? `ORDER BY ${filterPrefix}[${orderCol}] ${orderAscending ? 'ASC' : 'DESC'}` : '';

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
                   l.name as line_name, 
                   c.name as category_name
            FROM ID_PORTAL.product_management pm
            LEFT JOIN ID_PORTAL.brands b ON pm.brand_id = b.id
            LEFT JOIN ID_PORTAL.suppliers sup ON pm.supplier_id = sup.id
            LEFT JOIN ID_PORTAL.product_lines l ON pm.line_id = l.id
            LEFT JOIN ID_PORTAL.categories c ON pm.category_id = c.id
            ${whereString}
            ${orderString}
          `;
        } else if (table === 'energy_efficiency_records') {
          query = `
            SELECT ${topString} ee.*, 
                   sup.legal_name as supplier_legal_name
            FROM ID_PORTAL.energy_efficiency_records ee
            LEFT JOIN ID_PORTAL.suppliers sup ON ee.supplier_id = sup.id
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

        for (const row of rows) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          // If upsert is requested
          if (isUpsert) {
            let checkQuery = '';
            const checkRequest = dbPool.request();
            
            if (table === 'canton_fair_settings' && row.year !== undefined) {
              checkQuery = `SELECT 1 FROM ID_PORTAL.[${table}] WHERE [year] = @check_year`;
              checkRequest.input('check_year', row.year);
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
                  if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val))) {
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
                  resultRows.push(parseRowJSON(updateRes.recordset[0]));
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
            if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val))) {
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
            resultRows.push(parseRowJSON(result.recordset[0]));
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

        const request = dbPool.request();
        const setClauses = keys.map((k, i) => {
          let val = payload[k];
          const paramName = `update_${i}`;
          if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val))) {
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
              whereClauses.push(`[${filter.field}] = @${paramName}`);
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
        const rows = result.recordset.map(parseRowJSON);
        
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
              whereClauses.push(`[${filter.field}] = @${paramName}`);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
