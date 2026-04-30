import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("records.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS calculation_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    record_data TEXT NOT NULL,
    user_email TEXT NOT NULL,
    project_name TEXT,
    sample_id TEXT,
    description TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS canton_fair_suppliers (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    factory_location TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    website TEXT,
    innovation_rating INTEGER NOT NULL,
    price_rating INTEGER NOT NULL,
    manufacturing_rating INTEGER NOT NULL DEFAULT 0,
    catalogues TEXT, -- JSON array of FileInfo
    featured_products TEXT, -- JSON array of objects
    fob_prices TEXT,
    comments TEXT,
    images TEXT, -- JSON array of {file: FileInfo, comment: string}
    logo TEXT, -- JSON FileInfo
    phone TEXT,
    email TEXT,
    wechat_qr TEXT, -- JSON FileInfo
    factory_visited INTEGER DEFAULT 0,
    visit_date TEXT,
    visit_time TEXT,
    location_label TEXT,
    lat REAL,
    lng REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS canton_fair_settings (
    year INTEGER PRIMARY KEY,
    banner_image TEXT, -- JSON FileInfo
    attendees TEXT -- JSON array of strings
  );
`);

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN manufacturing_rating INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN logo TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN phone TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN email TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN wechat_qr TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN factory_visited INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN visit_date TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN visit_time TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN location_label TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN lat REAL");
} catch (e) {}

try {
  db.exec("ALTER TABLE canton_fair_suppliers ADD COLUMN lng REAL");
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/records", (req, res) => {
    const { moduleId, actionType, data, userEmail, projectName, sampleId, description } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO calculation_records (module_id, action_type, record_data, user_email, project_name, sample_id, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(moduleId, actionType, JSON.stringify(data), userEmail, projectName || null, sampleId || null, description || null);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save record" });
    }
  });

  app.get("/api/records", (req, res) => {
    const { moduleId } = req.query;
    try {
      let stmt;
      if (moduleId) {
        stmt = db.prepare("SELECT * FROM calculation_records WHERE module_id = ? ORDER BY timestamp DESC");
        res.json(stmt.all(moduleId));
      } else {
        stmt = db.prepare("SELECT * FROM calculation_records ORDER BY timestamp DESC");
        res.json(stmt.all());
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch records" });
    }
  });

  app.get("/api/canton-fair", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM canton_fair_suppliers ORDER BY created_at DESC");
      const suppliers = stmt.all().map((s: any) => ({
        ...s,
        catalogues: JSON.parse(s.catalogues || '[]'),
        featuredProducts: JSON.parse(s.featured_products || '[]'),
        images: JSON.parse(s.images || '[]'),
        factoryLocation: s.factory_location,
        contactName: s.contact_name,
        innovationRating: s.innovation_rating,
        priceRating: s.price_rating,
        manufacturingRating: s.manufacturing_rating,
        logo: s.logo ? JSON.parse(s.logo) : null,
        phone: s.phone,
        email: s.email,
        wechatQr: s.wechat_qr ? JSON.parse(s.wechat_qr) : null,
        factoryVisited: s.factory_visited === 1,
        visitDate: s.visit_date,
        visitTime: s.visit_time,
        locationLabel: s.location_label,
        lat: s.lat,
        lng: s.lng,
        createdAt: s.created_at
      }));
      res.json(suppliers);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/canton-fair/settings/:year", (req, res) => {
    try {
      const { year } = req.params;
      const row = db.prepare("SELECT * FROM canton_fair_settings WHERE year = ?").get(year);
      if (row) {
        res.json({
          year: parseInt(year),
          bannerImage: row.banner_image ? JSON.parse(row.banner_image) : null,
          attendees: JSON.parse(row.attendees || "[]")
        });
      } else {
        res.json({ year: parseInt(year), attendees: [] });
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/canton-fair/settings", (req, res) => {
    try {
      const settings = req.body;
      const stmt = db.prepare(`
        INSERT INTO canton_fair_settings (year, banner_image, attendees)
        VALUES (?, ?, ?)
        ON CONFLICT(year) DO UPDATE SET
          banner_image = excluded.banner_image,
          attendees = excluded.attendees
      `);
      stmt.run(
        settings.year,
        settings.bannerImage ? JSON.stringify(settings.bannerImage) : null,
        JSON.stringify(settings.attendees || [])
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/canton-fair", (req, res) => {
    const supplier = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO canton_fair_suppliers (
          id, year, name, factory_location, contact_name, website, 
          innovation_rating, price_rating, manufacturing_rating, catalogues, featured_products, 
          fob_prices, comments, images, logo, phone, email, wechat_qr,
          factory_visited, visit_date, visit_time, location_label, lat, lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        supplier.id,
        supplier.year,
        supplier.name,
        supplier.factoryLocation,
        supplier.contactName,
        supplier.website || null,
        supplier.innovationRating,
        supplier.priceRating,
        supplier.manufacturingRating || 0,
        JSON.stringify(supplier.catalogues || []),
        JSON.stringify(supplier.featuredProducts || []),
        supplier.fobPrices || null,
        supplier.comments || null,
        JSON.stringify(supplier.images || []),
        supplier.logo ? JSON.stringify(supplier.logo) : null,
        supplier.phone || null,
        supplier.email || null,
        supplier.wechatQr ? JSON.stringify(supplier.wechatQr) : null,
        supplier.factoryVisited ? 1 : 0,
        supplier.visitDate || null,
        supplier.visitTime || null,
        supplier.locationLabel || null,
        supplier.lat || null,
        supplier.lng || null
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save supplier" });
    }
  });

  app.put("/api/canton-fair/:id", (req, res) => {
    const { id } = req.params;
    const supplier = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE canton_fair_suppliers SET 
          year = ?, name = ?, factory_location = ?, contact_name = ?, 
          website = ?, innovation_rating = ?, price_rating = ?, 
          manufacturing_rating = ?, catalogues = ?, featured_products = ?, 
          fob_prices = ?, comments = ?, images = ?, logo = ?, 
          phone = ?, email = ?, wechat_qr = ?,
          factory_visited = ?, visit_date = ?, visit_time = ?, 
          location_label = ?, lat = ?, lng = ?
        WHERE id = ?
      `);
      
      stmt.run(
        supplier.year,
        supplier.name,
        supplier.factoryLocation,
        supplier.contactName,
        supplier.website || null,
        supplier.innovationRating,
        supplier.priceRating,
        supplier.manufacturingRating || 0,
        JSON.stringify(supplier.catalogues || []),
        JSON.stringify(supplier.featuredProducts || []),
        supplier.fobPrices || null,
        supplier.comments || null,
        JSON.stringify(supplier.images || []),
        supplier.logo ? JSON.stringify(supplier.logo) : null,
        supplier.phone || null,
        supplier.email || null,
        supplier.wechatQr ? JSON.stringify(supplier.wechatQr) : null,
        supplier.factoryVisited ? 1 : 0,
        supplier.visitDate || null,
        supplier.visitTime || null,
        supplier.locationLabel || null,
        supplier.lat || null,
        supplier.lng || null,
        id
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/api/canton-fair/:id", (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare("DELETE FROM canton_fair_suppliers WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
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
