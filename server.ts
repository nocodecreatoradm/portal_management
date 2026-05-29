import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";
import { runFullAzureMigration } from "./src/lib/azureMigrationHelper.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to verify Supabase JWT Bearer token
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token is missing or invalid" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Unauthorized access token" });
    }
    req.user = data.user;
    next();
  } catch (err: any) {
    console.error("Auth validation error:", err);
    return res.status(401).json({ error: "Authentication check failed" });
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
          const { data: admins, error: adminError } = await supabase
            .from('profiles')
            .select('email')
            .eq('role', 'admin')
            .eq('is_active', true);
          
          if (adminError) {
            console.error("[EMAIL] Error fetching admins from Supabase:", adminError);
          }

          const adminEmails = (admins || []).map(a => a.email).filter(Boolean);
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
