const sql = require('mssql');
require('dotenv').config();

const sanitizeEnvVal = (val) => {
  if (!val) return "";
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean;
};

const dbConfig = {
  user: sanitizeEnvVal(process.env.DB_USER) || 'soledbserveradmin',
  password: sanitizeEnvVal(process.env.DB_PASSWORD) || '',
  server: sanitizeEnvVal(process.env.DB_SERVER) || 'soledbserver.database.windows.net',
  database: sanitizeEnvVal(process.env.DB_NAME) || 'soledb-puntoventa',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function migrate() {
  try {
    console.log('Connecting to database...');
    const pool = await sql.connect(dbConfig);
    console.log('Database connected. Running updates column check...');
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ID_PORTAL.innovation_proposals') AND name = 'updates')
      BEGIN
          ALTER TABLE ID_PORTAL.innovation_proposals ADD updates nvarchar(max);
          PRINT 'Added updates column to ID_PORTAL.innovation_proposals';
      END
      ELSE
      BEGIN
          PRINT 'updates column already exists';
      END
    `);
    
    console.log('Migration finished successfully!');
    await sql.close();
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
