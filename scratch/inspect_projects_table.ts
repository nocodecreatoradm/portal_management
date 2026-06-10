import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const sanitizeEnvVal = (val: string | undefined): string => {
  if (!val) return "";
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1);
  }
  return clean;
};

async function run() {
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

  try {
    console.log('Connecting to SQL Server...');
    const pool = await sql.connect(dbConfig);
    console.log('Connected! Fetching projects columns...');
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'ID_PORTAL' AND TABLE_NAME = 'projects'
    `);
    console.log('Columns in ID_PORTAL.projects:');
    console.table(result.recordset);

    const testProject = await pool.request().query(`
      SELECT TOP 5 * FROM ID_PORTAL.projects
    `);
    console.log('Sample data in ID_PORTAL.projects:');
    console.log(testProject.recordset);

    await pool.close();
  } catch (err) {
    console.error('Error running script:', err);
  }
}

run();
