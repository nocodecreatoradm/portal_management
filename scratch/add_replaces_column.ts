import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

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

async function run() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('Connected to MSSQL');
    const query = `
      IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.product_management') AND name = 'replaces_product_id')
      BEGIN
        ALTER TABLE ID_PORTAL.product_management ADD replaces_product_id UNIQUEIDENTIFIER NULL;
        PRINT 'Added replaces_product_id column to product_management';
      END
      ELSE
      BEGIN
        PRINT 'Column replaces_product_id already exists';
      END
    `;
    const result = await pool.request().query(query);
    console.log('Migration completed successfully:', result);
    await pool.close();
  } catch (err) {
    console.error('Error running migration query:', err);
  }
}

run();
